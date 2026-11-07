// Renders a Wallet-style mockup of the pass (English + Arabic) to out/preview.html
// using the real pass data and strip images. Usage: node scripts/preview.js [stamps]
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, ROOT } = require('../src/config');
const { passJson, localisations } = require('../src/pass');
const art = require('../src/art');

const cfg = loadConfig();
const stamps = Number(process.argv[2] ?? 4);
const member = { serial: 's', member_id: 'CW-04821', auth_token: 't', rewards_redeemed: 0, stamps, updated_at: 0 };
const { pj, total } = passJson(cfg, { ...member, name: 'SALIM' });
const bg = cfg.business.colors.background;
const strips = art.stripImages(bg, Math.min(stamps, total - 1), total);
const logo = art.baseImages(bg)['logo@3x.png'];
const b64 = (b) => 'data:image/png;base64,' + b.toString('base64');

function parseStrings(buf) {
  const out = {};
  for (const m of buf.toString('utf8').matchAll(/^"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";$/gm)) out[m[1]] = m[2].replace(/\\"/g, '"');
  return out;
}
function card(lang, name) {
  const L = parseStrings(localisations(cfg, { ...member, name }, Math.min(stamps, total - 1))[`${lang}.lproj/pass.strings`]);
  const t = (k) => L[k] ?? k;
  const sc = pj.storeCard, rtl = lang === 'ar';
  const strip = rtl ? strips['ar.lproj/strip@3x.png'] : strips['strip@3x.png'];
  return `<div class="pass" dir="${rtl ? 'rtl' : 'ltr'}">
    <div class="top"><img class="logo" src="${b64(logo)}"><div class="lt">${t(pj.logoText)}</div>
      <div class="hf"><div class="lab">${t(sc.headerFields[0].label)}</div><div class="val">${sc.headerFields[0].value}</div></div></div>
    <img class="strip" src="${b64(strip)}">
    <div class="sec"><div class="lab">${t(sc.secondaryFields[0].label)}</div><div class="v2">${t(sc.secondaryFields[0].value)}</div></div>
    <div class="aux"><div><div class="lab">${t('customer_label')}</div><div class="v2">${name}</div></div>
      <div class="end"><div class="lab">${t('member_label')}</div><div class="v2">${member.member_id}</div></div></div>
    <div class="qr"><div class="qrbox"><svg viewBox="0 0 21 21" width="140" height="140">${qr()}</svg></div><div class="alt">${t('barcode_alt')}</div></div>
  </div>`;
}
function qr() { // decorative placeholder pattern (Wallet draws the real QR)
  let s = '', seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    if (!inF && rnd() > 0.55) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return s + finder(0, 0) + finder(14, 0) + finder(0, 14);
}
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0b0b0d;display:flex;gap:40px;justify-content:center;padding:40px;font-family:-apple-system,Inter,"Noto Sans Arabic",sans-serif}
.pass{width:340px;background:${bg};color:#fff;border-radius:14px;padding:12px 0 18px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
.top{display:flex;align-items:center;gap:8px;padding:0 14px 10px}.logo{width:38px;height:38px}.lt{font-weight:600;font-size:18px;flex:1}
.hf{text-align:end}.lab{font-size:10px;letter-spacing:.06em;color:#DCE3FF;font-weight:600;text-transform:uppercase}.val{font-size:22px;font-weight:500}
.strip{width:100%;display:block}.sec{padding:12px 14px 0}.v2{font-size:16px;margin-top:2px}
.aux{display:flex;justify-content:space-between;padding:12px 14px 0}.end{text-align:end}
.qr{text-align:center;margin-top:18px}.qrbox{display:inline-block;background:#fff;padding:10px;border-radius:10px;line-height:0}.alt{font-size:12px;margin-top:8px;opacity:.9}
</style>${card('en', 'SALIM')}${card('ar', 'سالم')}`;
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out', 'preview.html'), html);
console.log('Wrote out/preview.html');
