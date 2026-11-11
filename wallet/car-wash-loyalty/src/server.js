// Loyalty card server:
//  - customer sign-up page that hands out the Wallet pass
//  - staff page to scan a card and add stamps / redeem the free wash
//  - Apple Wallet web service, so passes on phones update by themselves
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadConfig, loadCredentials, ROOT } = require('./config');
const { openDb } = require('./db');
const { buildPass } = require('./pass');
const art = require('./art');
const { createPusher } = require('./apns');

const cfg = loadConfig();
const creds = loadCredentials(cfg);
const db = openDb(path.resolve(ROOT, cfg.server.database || 'data/loyalty.db'));
const pusher = createPusher(cfg, creds, db);
const TOTAL = cfg.program.stampsForReward;
const PTID = cfg.apple.passTypeIdentifier;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('s:' + cfg.server.staffPin + creds.keyPem).digest('hex');

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

function staffToken() {
  const exp = Date.now() + 12 * 3600 * 1000;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(String(exp)).digest('hex');
  return `${exp}.${sig}`;
}
function isStaff(req) {
  const m = /(?:^|;\s*)staff=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, crypto.createHmac('sha256', SESSION_SECRET).update(exp).digest('hex'));
}

const loginAttempts = new Map(); // ip -> {n, until}
function tooManyAttempts(ip) {
  const a = loginAttempts.get(ip);
  return a && a.n >= 5 && a.until > Date.now();
}
function failedAttempt(ip) {
  const a = loginAttempts.get(ip) || { n: 0, until: 0 };
  a.n += 1; a.until = Date.now() + 10 * 60 * 1000;
  loginAttempts.set(ip, a);
}

function publicMember(m) {
  return {
    memberId: m.member_id, name: m.name, phone: m.phone, stamps: m.stamps, total: TOTAL,
    freeReady: m.stamps >= TOTAL - 1, rewardsRedeemed: m.rewards_redeemed, lastStampAt: m.last_stamp_at,
    devices: db.tokensFor(m.serial).length,
  };
}

function sendPass(res, member) {
  const buf = buildPass(cfg, creds, member);
  send(res, 200, buf, {
    'Content-Type': 'application/vnd.apple.pkpass',
    'Content-Disposition': `attachment; filename="${cfg.business.slug || 'loyalty'}.pkpass"`,
    'Last-Modified': new Date(member.updated_at).toUTCString(),
  });
}

const pages = {};
function page(name) {
  if (!pages[name] || process.env.NODE_ENV !== 'production') {
    const b = cfg.business;
    pages[name] = fs.readFileSync(path.join(ROOT, 'public', name), 'utf8')
      .replaceAll('{{NAME_EN}}', b.nameEn).replaceAll('{{NAME_AR}}', b.nameAr)
      .replaceAll('{{BG}}', b.colors.background).replaceAll('{{ACCENT}}', b.colors.accent || art.ORANGE).replaceAll('{{LOGO}}', art.dataUri('logo-wide-600.png')).replaceAll('{{TOTAL}}', String(TOTAL))
      .replaceAll('{{PAID}}', String(TOTAL - 1))
      .replaceAll('{{YEAR}}', String(new Date().getFullYear()))
      .replaceAll('{{CREDIT_EN}}', cfg.credit.en).replaceAll('{{CREDIT_AR}}', cfg.credit.ar);
  }
  return pages[name];
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

  // ----- customer -----
  if (p === '/' && req.method === 'GET') return send(res, 200, page('join.html'), { 'Content-Type': 'text/html; charset=utf-8' });
  if (p === '/api/join' && req.method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
    if (!name) return send(res, 400, { error: 'Please enter your name.' });
    if (phone.replace(/\D/g, '').length < 8) return send(res, 400, { error: 'Please enter a valid phone number.' });
    const member = db.getByPhone(phone) || db.createMember(name, phone);
    return send(res, 200, { passUrl: `/pass/${member.serial}?t=${member.auth_token}`, memberId: member.member_id });
  }
  if ((m = /^\/pass\/([^/]+)$/.exec(p)) && req.method === 'GET') {
    const member = db.get(decodeURIComponent(m[1]));
    if (!member || !safeEqual(url.searchParams.get('t') || '', member.auth_token)) return send(res, 404, 'Not found');
    return sendPass(res, member);
  }

  // ----- staff -----
  if (p === '/staff' && req.method === 'GET') return send(res, 200, page('staff.html'), { 'Content-Type': 'text/html; charset=utf-8' });
  if (p === '/api/staff/login' && req.method === 'POST') {
    if (tooManyAttempts(ip)) return send(res, 429, { error: 'Too many tries. Wait 10 minutes.' });
    const body = await readBody(req);
    if (!safeEqual(String(body.pin || ''), String(cfg.server.staffPin))) { failedAttempt(ip); return send(res, 401, { error: 'Wrong PIN.' }); }
    loginAttempts.delete(ip);
    const secure = cfg.server.publicUrl.startsWith('https') ? '; Secure' : '';
    return send(res, 200, { ok: true }, { 'Set-Cookie': `staff=${staffToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}` });
  }
  if (p.startsWith('/api/staff/')) {
    if (!isStaff(req)) return send(res, 401, { error: 'Please log in.' });
    if (p === '/api/staff/me') return send(res, 200, { ok: true });
    if (p === '/api/staff/members' && req.method === 'GET') return send(res, 200, db.list(100).map(publicMember));
    if (p === '/api/staff/member' && req.method === 'GET') {
      const member = db.getByMemberId(url.searchParams.get('id') || '');
      return member ? send(res, 200, publicMember(member)) : send(res, 404, { error: 'No card with that member ID.' });
    }
    if ((m = /^\/api\/staff\/member\/([^/]+)\/(stamp|undo|redeem)$/.exec(p)) && req.method === 'POST') {
      const member = db.getByMemberId(decodeURIComponent(m[1]));
      if (!member) return send(res, 404, { error: 'No card with that member ID.' });
      const r = db.change(member.serial, m[2], TOTAL);
      if (r.error) return send(res, 409, { error: r.error, member: publicMember(r.member) });
      const pushes = await pusher.notify(member.serial);
      return send(res, 200, { member: publicMember(r.member), pushed: pushes.filter((x) => x.status === 200).length });
    }
  }

  if (p === '/health') return send(res, 200, { ok: true });
  return send(res, 404, 'Not found');
}

const server = http.createServer((req, res) => {
  route(req, res).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Server error' }); });
});
server.listen(cfg.server.port || 3000, () => {
  console.log(`Loyalty server on :${cfg.server.port || 3000}  (public URL ${cfg.server.publicUrl})`);
});
