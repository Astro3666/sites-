// Loyalty card server for one or many car washes:
//  - customer sign-up page that hands out the Wallet pass
//  - staff page to scan a card and add stamps / redeem the free wash
//  - Apple Wallet web service, so passes on phones update by themselves
//
// Each car wash lives at /<slug>/ (e.g. /rp-car-wash/ and /rp-car-wash/staff), or at the root of
// its own domain when that domain is listed in its business.json "domains" and points here.
// The Wallet web service (/wallet/v1/...) is shared by all of them.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadConfig, loadCredentials, ROOT } = require('./config');
const { openDb } = require('./db');
const { buildPass } = require('./pass');
const { loadBusinesses, ruleText } = require('./business');
const { createPusher } = require('./apns');

const cfg = loadConfig();
const creds = loadCredentials(cfg);
const { list: BUSINESSES, bySlug } = loadBusinesses();
if (!BUSINESSES.length) throw new Error('No businesses found in businesses/');
const byHost = new Map();
for (const b of BUSINESSES) for (const d of b.domains) { byHost.set(d.toLowerCase(), b); byHost.set('www.' + d.toLowerCase(), b); }
const db = openDb(path.resolve(ROOT, cfg.server.database || 'data/loyalty.db'), BUSINESSES[0].slug);
const pusher = createPusher(cfg, creds, db);
const PTID = cfg.apple.passTypeIdentifier;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('s:' + creds.keyPem).digest('hex');

// Staff PIN per car wash: env STAFF_PIN_<SLUG> (e.g. STAFF_PIN_RP_CAR_WASH), else config.json
// "staffPins": {"rp-car-wash": "..."}. A car wash with no PIN set has staff login switched off.
function staffPin(biz) {
  const env = process.env['STAFF_PIN_' + biz.slug.toUpperCase().replace(/-/g, '_')];
  const pin = env || (cfg.staffPins || {})[biz.slug] || (BUSINESSES.length === 1 && cfg.server.staffPin) || '';
  return pin && pin !== 'change-me' ? String(pin) : '';
}
for (const b of BUSINESSES) if (!staffPin(b)) console.warn(`Warning: no staff PIN for ${b.slug}; its staff page is locked.`);

// ---------- helpers ----------
function send(res, status, body, headers = {}) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function passAuthOk(req, member) {
  const h = req.headers.authorization || '';
  return member && h.startsWith('ApplePass ') && safeEqual(h.slice(10), member.auth_token);
}

// Staff session cookie, signed for one business only.
const cookieName = (biz) => 'staff_' + biz.slug.replace(/-/g, '_');
function staffToken(biz) {
  const exp = Date.now() + 12 * 3600 * 1000;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(biz.slug + ':' + exp + ':' + staffPin(biz)).digest('hex');
  return `${exp}.${sig}`;
}
function isStaff(req, biz) {
  const m = new RegExp('(?:^|;\\s*)' + cookieName(biz) + '=([^;]+)').exec(req.headers.cookie || '');
  if (!m || !staffPin(biz)) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, crypto.createHmac('sha256', SESSION_SECRET).update(biz.slug + ':' + exp + ':' + staffPin(biz)).digest('hex'));
}

const loginAttempts = new Map(); // ip|slug -> {n, until}
function tooManyAttempts(ip) {
  const a = loginAttempts.get(ip);
  return a && a.n >= 5 && a.until > Date.now();
}
function failedAttempt(ip) {
  const a = loginAttempts.get(ip) || { n: 0, until: 0 };
  a.n += 1; a.until = Date.now() + 10 * 60 * 1000;
  loginAttempts.set(ip, a);
}

function publicMember(m, biz) {
  const TOTAL = biz.program.stampsForReward;
  return {
    memberId: m.member_id, name: m.name, phone: m.phone, stamps: m.stamps, total: TOTAL,
    freeReady: m.stamps >= TOTAL - 1, rewardsRedeemed: m.rewards_redeemed, lastStampAt: m.last_stamp_at,
    devices: db.tokensFor(m.serial).length,
  };
}

function sendPass(res, member) {
  const biz = bySlug.get(member.business);
  if (!biz) return send(res, 410, 'This card is no longer active.');
  const buf = buildPass(cfg, creds, member, biz);
  send(res, 200, buf, {
    'Content-Type': 'application/vnd.apple.pkpass',
    'Content-Disposition': `attachment; filename="${biz.slug}.pkpass"`,
    'Last-Modified': new Date(member.updated_at).toUTCString(),
  });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pages = {};
function page(name, biz, base) {
  const key = name + '|' + biz.slug + '|' + base;
  if (!pages[key] || process.env.NODE_ENV !== 'production') {
    const b = biz, TOTAL = b.program.stampsForReward, rule = ruleText(TOTAL);
    pages[key] = fs.readFileSync(path.join(ROOT, 'public', name), 'utf8')
      .replaceAll('{{NAME_EN}}', esc(b.name.en)).replaceAll('{{NAME_AR}}', esc(b.name.ar))
      .replaceAll('{{BG}}', b.colors.card).replaceAll('{{ACCENT}}', b.colors.accent).replaceAll('{{LOGO}}', b.dataUri('logo-web.png'))
      .replaceAll('{{RULE_EN}}', esc(rule.en)).replaceAll('{{RULE_AR}}', esc(rule.ar)).replaceAll('{{TOTAL}}', String(TOTAL))
      .replaceAll('{{PAID}}', String(TOTAL - 1)).replaceAll('{{BASE}}', base).replaceAll('{{PREFIX}}', esc(biz.idPrefix)).replaceAll('{{COLS}}', String(TOTAL <= 5 ? TOTAL : Math.ceil(TOTAL / 2)))
      .replaceAll('{{YEAR}}', String(new Date().getFullYear()))
      .replaceAll('{{CREDIT_EN}}', esc(cfg.credit.en)).replaceAll('{{CREDIT_AR}}', esc(cfg.credit.ar));
  }
  return pages[key];
}

// Which car wash a request is for: its own domain, or the /<slug> path prefix.
function whichBusiness(req, p) {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (byHost.has(host)) return { biz: byHost.get(host), base: '', rest: p };
  const m = /^\/([a-z0-9-]+)(\/.*)?$/.exec(p);
  if (m && bySlug.has(m[1])) return { biz: bySlug.get(m[1]), base: '/' + m[1], rest: m[2] || '' };
  if (BUSINESSES.length === 1) return { biz: BUSINESSES[0], base: '', rest: p };
  return null;
}

// ---------- routes ----------
async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  // ----- Apple Wallet web service -----
  let m;
  if ((m = /^\/wallet\/v1\/devices\/([^/]+)\/registrations\/([^/]+)\/([^/]+)$/.exec(p))) {
    const [, deviceId, ptid, serial] = m.map(decodeURIComponent);
    const member = ptid === PTID && db.get(serial);
    if (!passAuthOk(req, member)) return send(res, 401);
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body.pushToken) return send(res, 400);
      const existed = db.register(deviceId, body.pushToken, serial);
      return send(res, existed ? 200 : 201);
    }
    if (req.method === 'DELETE') { db.unregister(deviceId, serial); return send(res, 200); }
    return send(res, 405);
  }
  if ((m = /^\/wallet\/v1\/devices\/([^/]+)\/registrations\/([^/]+)$/.exec(p)) && req.method === 'GET') {
    const [, deviceId, ptid] = m.map(decodeURIComponent);
    if (ptid !== PTID) return send(res, 404);
    const since = Number(url.searchParams.get('passesUpdatedSince')) || 0;
    const rows = db.updatedSince(deviceId, since);
    if (!rows.length) return send(res, 204);
    return send(res, 200, {
      serialNumbers: rows.map((r) => r.serial),
      lastUpdated: String(Math.max(...rows.map((r) => r.updated_at))),
    });
  }
  if ((m = /^\/wallet\/v1\/passes\/([^/]+)\/([^/]+)$/.exec(p)) && req.method === 'GET') {
    const [, ptid, serial] = m.map(decodeURIComponent);
    const member = ptid === PTID && db.get(serial);
    if (!passAuthOk(req, member)) return send(res, 401);
    // Always send the current pass (cheap to build; avoids 1-second Last-Modified edge cases).
    return sendPass(res, member);
  }
  if (p === '/wallet/v1/log' && req.method === 'POST') {
    const body = await readBody(req);
    for (const line of body.logs || []) console.log('[wallet]', line);
    return send(res, 200);
  }

  if (p === '/health') return send(res, 200, { ok: true, businesses: BUSINESSES.length });

  // ----- per car wash -----
  const w = whichBusiness(req, p);
  if (!w) {
    if (p === '/') return send(res, 200, BUSINESSES.map((b) => `<p><a href="/${b.slug}/">${esc(b.name.en)}</a></p>`).join(''), { 'Content-Type': 'text/html; charset=utf-8' });
    return send(res, 404, 'Not found');
  }
  const { biz, base } = w;
  const r = w.rest;
  const html = { 'Content-Type': 'text/html; charset=utf-8' };
  if (r === '' && req.method === 'GET') return send(res, 301, '', { Location: base + '/' });

  // customer
  if (r === '/' && req.method === 'GET') return send(res, 200, page('join.html', biz, base), html);
  if (r === '/api/join' && req.method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
    if (!name) return send(res, 400, { error: 'Please enter your name.' });
    if (phone.replace(/\D/g, '').length < 8) return send(res, 400, { error: 'Please enter a valid phone number.' });
    const member = db.getByPhone(biz.slug, phone) || db.createMember(biz.slug, biz.idPrefix, name, phone);
    return send(res, 200, { passUrl: `${base}/pass/${member.serial}?t=${member.auth_token}`, memberId: member.member_id });
  }
  if ((m = /^\/pass\/([^/]+)$/.exec(r)) && req.method === 'GET') {
    const member = db.get(decodeURIComponent(m[1]));
    if (!member || member.business !== biz.slug || !safeEqual(url.searchParams.get('t') || '', member.auth_token)) return send(res, 404, 'Not found');
    return sendPass(res, member);
  }

  // staff
  if (r === '/staff' && req.method === 'GET') return send(res, 200, page('staff.html', biz, base), html);
  if (r === '/api/staff/login' && req.method === 'POST') {
    const key = ip + '|' + biz.slug;
    if (tooManyAttempts(key)) return send(res, 429, { error: 'Too many tries. Wait 10 minutes.' });
    if (!staffPin(biz)) return send(res, 403, { error: 'Staff login is not set up yet.' });
    const body = await readBody(req);
    if (!safeEqual(String(body.pin || ''), staffPin(biz))) { failedAttempt(key); return send(res, 401, { error: 'Wrong PIN.' }); }
    loginAttempts.delete(key);
    const secure = cfg.server.publicUrl.startsWith('https') ? '; Secure' : '';
    return send(res, 200, { ok: true }, { 'Set-Cookie': `${cookieName(biz)}=${staffToken(biz)}; HttpOnly; SameSite=Strict; Path=${base || '/'}; Max-Age=43200${secure}` });
  }
  if (r.startsWith('/api/staff/')) {
    if (!isStaff(req, biz)) return send(res, 401, { error: 'Please log in.' });
    const pub = (x) => publicMember(x, biz);
    if (r === '/api/staff/me') return send(res, 200, { ok: true });
    if (r === '/api/staff/members' && req.method === 'GET') return send(res, 200, db.list(biz.slug, 100).map(pub));
    if (r === '/api/staff/member' && req.method === 'GET') {
      const member = db.getByMemberId(biz.slug, url.searchParams.get('id') || '');
      return member ? send(res, 200, pub(member)) : send(res, 404, { error: 'No card with that member ID.' });
    }
    if ((m = /^\/api\/staff\/member\/([^/]+)\/(stamp|undo|redeem)$/.exec(r)) && req.method === 'POST') {
      const member = db.getByMemberId(biz.slug, decodeURIComponent(m[1]));
      if (!member) return send(res, 404, { error: 'No card with that member ID.' });
      const out = db.change(member.serial, m[2], biz.program.stampsForReward);
      if (out.error) return send(res, 409, { error: out.error, member: pub(out.member) });
      const pushes = await pusher.notify(member.serial);
      return send(res, 200, { member: pub(out.member), pushed: pushes.filter((x) => x.status === 200).length });
    }
  }

  return send(res, 404, 'Not found');
}

const server = http.createServer((req, res) => {
  route(req, res).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Server error' }); });
});
server.listen(cfg.server.port || 3000, () => {
  console.log(`Loyalty server on :${cfg.server.port || 3000}  (public URL ${cfg.server.publicUrl})`);
  for (const b of BUSINESSES) console.log(`  ${b.name.en}: ${cfg.server.publicUrl}/${b.slug}/  staff: /${b.slug}/staff`);
});
