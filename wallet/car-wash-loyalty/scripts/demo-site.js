// Builds a static demo website of the loyalty card (no server needed), for showing
// the business. Output: out/demo/index.html. It is then run through the shared
// preview build (badge, © footer, domain lock) before publishing.
const fs = require('node:fs');
const path = require('node:path');
const art = require('../src/art');
const { ROOT } = require('../src/config');

const BG = '#1D3FD1', TOTAL = 10;
const strips = { en: [], ar: [] };
for (let s = 0; s < TOTAL; s++) {
  strips.en.push(art.stripSvg(1, BG, s, TOTAL, false).replace(/width="375" height="123"/, 'width="100%"'));
  strips.ar.push(art.stripSvg(1, BG, s, TOTAL, true).replace(/width="375" height="123"/, 'width="100%"'));
}
const icon = art.iconSvg(64, BG).replace(/<rect width="64" height="64" fill="[^"]+"\/>/, '');

const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Car Wash Loyalty Card · Apple Wallet</title>
<meta name="description" content="A stamp card in Apple Wallet that updates itself: wash 9 times, your 10th is free.">
<meta name="theme-color" content="${BG}">
<style>
:root{--blue:${BG};--ink:#0F172A;--muted:#64748B;--soft:#EEF2FF;--nav-h:64px}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif;color:var(--ink);background:#fff}
html[lang=ar] body{font-family:-apple-system,"SF Arabic","Segoe UI",Tahoma,sans-serif}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
nav{position:sticky;top:0;z-index:20;height:var(--nav-h);background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid #E2E8F0}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:100%}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:19px}
.brand .mk{width:38px;height:38px;border-radius:10px;background:var(--blue);display:grid;place-items:center}
.brand .mk svg{width:34px;height:34px}
.brand small{display:block;font-weight:500;font-size:13px;color:var(--muted)}
.lang{border:1px solid #CBD5E1;background:#fff;border-radius:999px;padding:7px 14px;font:inherit;font-weight:600;cursor:pointer}
.hero{background:var(--blue);color:#fff;overflow:hidden}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding-top:64px;padding-bottom:72px}
h1{font-size:clamp(32px,5vw,54px);line-height:1.08;margin:0 0 16px;letter-spacing:-.02em}
html[lang=ar] h1{letter-spacing:0;line-height:1.3}
.lead{font-size:19px;opacity:.9;margin:0 0 28px;max-width:34em}
form{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:20px;max-width:460px}
label{display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.9;margin:0 0 6px}
html[lang=ar] label{letter-spacing:0;font-size:13px}
input{width:100%;font:inherit;font-size:17px;padding:13px 14px;border:0;border-radius:12px;margin-bottom:14px;color:var(--ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;font:inherit;font-weight:600;font-size:17px;padding:14px;border:0;border-radius:12px;background:#000;color:#fff;cursor:pointer}
.btn svg{width:22px;height:22px}
.note{font-size:13px;opacity:.8;margin-top:10px;min-height:1.3em}
.stage{display:flex;flex-direction:column;align-items:center;gap:16px}
.phone{width:min(360px,100%);background:#0b0b0d;border-radius:44px;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.pass{background:var(--blue);border-radius:16px;padding:12px 0 18px;color:#fff;transition:transform .3s}
.pass.pop{transform:scale(1.02)}
.pt{display:flex;align-items:center;gap:8px;padding:0 14px 10px}
.pt svg{width:36px;height:36px;flex:none}
.pt .lt{font-weight:600;font-size:17px;flex:1}
.hf{text-align:end}
.lab{font-size:10px;font-weight:600;letter-spacing:.06em;color:#DCE3FF;text-transform:uppercase}
html[lang=ar] .lab{letter-spacing:0;font-size:11px}
.val{font-size:22px;font-weight:500}
.strip{line-height:0}
.sec{padding:12px 14px 0}.v2{font-size:15px;margin-top:2px}
.aux{display:flex;justify-content:space-between;padding:12px 14px 0}.aux .e{text-align:end}
.qr{text-align:center;margin-top:16px}.qr .b{display:inline-block;background:#fff;padding:8px;border-radius:10px;line-height:0}
.qr .alt{font-size:12px;margin-top:7px;opacity:.9}
.toast{position:absolute;inset-inline:14px;top:14px;background:rgba(245,245,247,.97);color:#111;border-radius:16px;padding:10px 12px;font-size:13px;display:flex;gap:10px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.3);opacity:0;transform:translateY(-12px);transition:.35s;pointer-events:none}
.toast.on{opacity:1;transform:none}
.toast .ic{width:30px;height:30px;border-radius:7px;background:var(--blue);flex:none;display:grid;place-items:center}
.toast .ic svg{width:26px;height:26px}
.phone{position:relative}
.demo{display:flex;gap:10px}
.demo button{font:inherit;font-weight:600;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
.demo button.w{background:#fff;color:var(--blue);border-color:#fff}
section.how{padding:72px 0}
h2{font-size:clamp(26px,3.4vw,36px);margin:0 0 28px;letter-spacing:-.01em}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.step{background:var(--soft);border-radius:20px;padding:24px}
.step b{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--blue);color:#fff;margin-bottom:14px}
.step h3{margin:0 0 6px;font-size:19px}
.step p{margin:0;color:#334155}
.perks{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:40px}
.perk{border:1px solid #E2E8F0;border-radius:16px;padding:18px}
.perk h4{margin:0 0 4px;font-size:16px}.perk p{margin:0;color:var(--muted);font-size:14px}
footer{background:var(--ink);color:#CBD5E1;padding:28px 0;font-size:14px}
footer .wrap{display:block}
@media (max-width:860px){.hero .wrap{grid-template-columns:1fr;padding-top:40px}.steps,.perks{grid-template-columns:1fr 1fr}}
@media (max-width:560px){.steps,.perks{grid-template-columns:1fr}.brand small{display:none}}
</style>
</head>
<body>
<nav><div class="wrap">
  <div class="brand"><span class="mk">${icon}</span><span><span data-t="name"></span><small data-t="name2"></small></span></div>
  <button class="lang" id="lang">العربية</button>
</div></nav>

<header class="hero"><div class="wrap">
  <div>
    <h1 data-t="h1"></h1>
    <p class="lead" data-t="lead"></p>
    <form id="f">
      <label for="n" data-t="nameL"></label><input id="n" maxlength="20" autocomplete="off">
      <label for="p" data-t="phoneL"></label><input id="p" type="tel" inputmode="tel" placeholder="+968">
      <button class="btn" type="submit"><svg viewBox="0 0 24 24" fill="#fff"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#fff" stroke-width="2"/><rect x="3" y="9" width="18" height="3"/></svg><span data-t="add"></span></button>
      <div class="note" id="note"></div>
    </form>
  </div>
  <div class="stage">
    <div class="phone">
      <div class="toast" id="toast"><span class="ic">${icon}</span><span><b data-t="name"></b><br><span id="toastT"></span></span></div>
      <div class="pass" id="pass">
        <div class="pt">${icon}<div class="lt" data-t="name"></div><div class="hf"><div class="lab" data-t="stamps"></div><div class="val" id="count"></div></div></div>
        <div class="strip" id="strip"></div>
        <div class="sec"><div class="lab" data-t="rule"></div><div class="v2" id="prog"></div></div>
        <div class="aux"><div><div class="lab" data-t="cust"></div><div class="v2" id="cname"></div></div><div class="e"><div class="lab" data-t="mid"></div><div class="v2">CW-04821</div></div></div>
        <div class="qr"><div class="b"><canvas id="qr" width="120" height="120"></canvas></div><div class="alt" data-t="alt"></div></div>
      </div>
    </div>
    <div class="demo"><button class="w" id="stamp" data-t="try"></button><button id="reset" data-t="reset"></button></div>
  </div>
</div></header>

<section class="how"><div class="wrap">
  <h2 data-t="howH"></h2>
  <div class="steps">
    <div class="step"><b>1</b><h3 data-t="s1h"></h3><p data-t="s1p"></p></div>
    <div class="step"><b>2</b><h3 data-t="s2h"></h3><p data-t="s2p"></p></div>
    <div class="step"><b>3</b><h3 data-t="s3h"></h3><p data-t="s3p"></p></div>
  </div>
  <div class="perks">
    <div class="perk"><h4 data-t="k1h"></h4><p data-t="k1p"></p></div>
    <div class="perk"><h4 data-t="k2h"></h4><p data-t="k2p"></p></div>
    <div class="perk"><h4 data-t="k3h"></h4><p data-t="k3p"></p></div>
    <div class="perk"><h4 data-t="k4h"></h4><p data-t="k4p"></p></div>
  </div>
</div></section>

<footer><div class="wrap"><span data-t="foot"></span></div></footer>

<script>
const STRIPS = ${JSON.stringify(strips)};
const T = {
  en: { name: 'Car Wash', name2: 'مغسلة سيارات', h1: 'Wash 9 times, your 10th is free', lead: 'Your stamp card lives in Apple Wallet and updates itself every time you wash. No app, no paper card to lose.',
    nameL: 'Your name', phoneL: 'Phone', add: 'Add to Apple Wallet', stamps: 'Stamps', rule: 'Wash 9 times, your 10th is free', cust: 'Customer', mid: 'Member ID',
    alt: 'Show this code at the counter', try: '+1 stamp (try it)', reset: 'Reset', howH: 'How it works',
    s1h: 'Add the card', s1p: 'Type your name and phone, tap Add to Apple Wallet. Done in 10 seconds.',
    s2h: 'Show it at the counter', s2p: 'Staff scan the QR code and add a stamp from their phone.',
    s3h: 'It updates by itself', s3p: 'The new stamp appears on your card in seconds, with a lock screen notification.',
    k1h: 'Arabic & English', k1p: 'Follows your iPhone language.', k2h: 'Always up to date', k2p: 'Live updates, no re-download.',
    k3h: 'Free wash reminder', k3p: 'Tells you when your free wash is ready.', k4h: 'Nearby alert', k4p: 'Shows on the lock screen near the shop.',
    foot: 'Loyalty card and website design © ' + new Date().getFullYear() + ' Mazen. All rights reserved.', demoNote: 'Demo preview: the real card downloads once the service is live.',
    left: (n) => n === 0 ? 'Your free wash is ready!' : n === 1 ? '1 more wash until your free one' : n + ' more washes until your free one',
    toast: (s) => 'You now have ' + s + '/10 stamps', free: 'Your free wash is ready!', lang: 'العربية', you: 'SALIM' },
  ar: { name: 'مغسلة سيارات', name2: 'Car Wash', h1: 'اغسل ٩ مرات، والغسلة العاشرة مجاناً', lead: 'بطاقة الأختام في Apple Wallet وتتحدث تلقائياً مع كل غسلة. بدون تطبيق وبدون بطاقة ورقية تضيع.',
    nameL: 'الاسم', phoneL: 'الهاتف', add: 'أضف إلى Apple Wallet', stamps: 'الأختام', rule: 'اغسل ٩ مرات، والغسلة العاشرة مجاناً', cust: 'العميل', mid: 'رقم العضوية',
    alt: 'اعرض هذا الرمز عند الكاونتر', try: '+١ ختم (جرّب)', reset: 'إعادة', howH: 'طريقة العمل',
    s1h: 'أضف البطاقة', s1p: 'اكتب اسمك ورقمك واضغط أضف إلى Apple Wallet. خلال ١٠ ثوانٍ.',
    s2h: 'اعرضها عند الكاونتر', s2p: 'الموظف يمسح الرمز ويضيف ختماً من هاتفه.',
    s3h: 'تتحدث تلقائياً', s3p: 'يظهر الختم الجديد على بطاقتك خلال ثوانٍ مع إشعار على شاشة القفل.',
    k1h: 'عربي وإنجليزي', k1p: 'حسب لغة الآيفون.', k2h: 'محدثة دائماً', k2p: 'تحديث مباشر بدون تحميل جديد.',
    k3h: 'تذكير بالغسلة المجانية', k3p: 'تخبرك عندما تكون غسلتك المجانية جاهزة.', k4h: 'تنبيه قريب', k4p: 'تظهر على شاشة القفل قرب المحل.',
    foot: 'تصميم بطاقة الولاء والموقع © ' + new Date().getFullYear() + ' مازن. جميع الحقوق محفوظة.', demoNote: 'معاينة تجريبية: البطاقة الحقيقية تُحمّل عند تشغيل الخدمة.',
    left: (n) => n === 0 ? 'غسلتك المجانية جاهزة!' : n === 1 ? 'باقي غسلة واحدة على الغسلة المجانية' : 'باقي ' + n + ' غسلات على الغسلة المجانية',
    toast: (s) => 'لديك الآن ' + s + '/10 أختام', free: 'غسلتك المجانية جاهزة!', lang: 'English', you: 'سالم' },
};
let lang = 'en', stamps = 4, name = '';
const $ = (id) => document.getElementById(id);
function render() {
  const t = T[lang];
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  $('lang').textContent = t.lang;
  $('count').textContent = stamps + '/10';
  $('strip').innerHTML = STRIPS[lang][stamps];
  $('prog').textContent = t.left(9 - stamps);
  $('cname').textContent = name || t.you;
}
function toast(text) {
  $('toastT').textContent = text; $('toast').classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => $('toast').classList.remove('on'), 2600);
  $('pass').classList.add('pop'); setTimeout(() => $('pass').classList.remove('pop'), 300);
  window.dispatchEvent(new CustomEvent('stamp', { detail: stamps }));
}
$('lang').onclick = () => {
  lang = lang === 'en' ? 'ar' : 'en';
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  render();
};
$('stamp').onclick = () => {
  if (stamps >= 9) { toast(T[lang].free); return; }
  stamps++; render(); toast(stamps >= 9 ? T[lang].free : T[lang].toast(stamps));
};
$('reset').onclick = () => { stamps = 0; render(); };
$('n').addEventListener('input', (e) => { name = e.target.value.trim().toUpperCase(); render(); });
$('f').addEventListener('submit', (e) => { e.preventDefault(); $('note').textContent = T[lang].demoNote; });
render();
</script>
<script type="module">
// Decorative QR pattern that re-shuffles on every stamp, like a fresh pass.
const c = document.getElementById('qr'), x = c.getContext('2d'), N = 21, s = c.width / N;
function draw(seed) {
  let r = seed * 7919 + 17;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111';
  const inF = (i, j) => (i < 8 && j < 8) || (i > 12 && j < 8) || (i < 8 && j > 12);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!inF(i, j) && rnd() > .55) x.fillRect(i * s, j * s, s, s);
  for (const [a, b] of [[0, 0], [14, 0], [0, 14]]) {
    x.fillRect(a * s, b * s, 7 * s, 7 * s); x.fillStyle = '#fff'; x.fillRect((a + 1) * s, (b + 1) * s, 5 * s, 5 * s);
    x.fillStyle = '#111'; x.fillRect((a + 2) * s, (b + 2) * s, 3 * s, 3 * s);
  }
}
draw(4);
addEventListener('stamp', (e) => draw(e.detail));
</script>
</body>
</html>
`;
const dir = path.join(ROOT, 'out', 'demo');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Wrote', path.join(dir, 'index.html'));
