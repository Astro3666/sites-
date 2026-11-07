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
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
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
.dev{position:relative;width:min(420px,100%);display:flex;justify-content:center}
#scene{display:none;width:100%;height:600px;touch-action:pan-y;cursor:grab}
html.gl-on #scene{display:block}
html.gl-on .phone{display:none}
html.gl-on .toast{inset-inline:auto;width:300px;top:6px}
@media (max-width:860px){#scene{height:520px}}
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
.navr{display:flex;gap:10px;align-items:center}
.navb{background:var(--blue);color:#fff;border-radius:999px;padding:8px 16px;font-weight:600;text-decoration:none;font-size:15px}
section.book{padding:72px 0;background:#F8FAFC;border-top:1px solid #E2E8F0}
.bk{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr);gap:24px;align-items:start}
.bk>*{min-width:0}
.panel{background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:22px}
.panel h3{margin:0 0 14px;font-size:17px;display:flex;gap:10px;align-items:center}
.panel h3 i{font-style:normal;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--blue);color:#fff;font-size:13px}
.panel+.panel{margin-top:16px}
.svc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.opt{border:1.5px solid #E2E8F0;border-radius:14px;padding:14px;cursor:pointer;background:#fff;text-align:start;font:inherit;color:inherit}
.opt b{display:block;font-size:15px}.opt span{display:block;color:var(--muted);font-size:13px}.opt em{display:block;font-style:normal;font-weight:700;color:var(--blue);margin-top:6px}
.opt[aria-pressed=true]{border-color:var(--blue);background:var(--soft);box-shadow:0 0 0 3px rgba(29,63,209,.12)}
.opt[disabled]{opacity:.4;cursor:not-allowed;text-decoration:line-through}
.days{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.days .opt{flex:none;width:72px;text-align:center;padding:10px 6px}
.days .opt b{font-size:20px}
.times{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.times .opt{text-align:center;padding:10px 4px;font-weight:600}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fields label{color:var(--muted);opacity:1}
.fields input{border:1px solid #CBD5E1;margin:0}
.full{grid-column:1/-1}
.pay{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.cardf{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px}
.cardf input{border:1px solid #CBD5E1;margin:0;font-variant-numeric:tabular-nums}
.apay{width:100%;margin-top:10px;background:#000;color:#fff;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:600;cursor:pointer}
.sum{position:sticky;top:84px}
.sum dl{display:grid;grid-template-columns:1fr auto;gap:8px 12px;margin:0 0 14px}
.sum dt{color:var(--muted)}.sum dd{margin:0;font-weight:600;text-align:end}
.sum .tot{border-top:1px solid #E2E8F0;padding-top:12px;font-size:19px}
.sum .btn{background:var(--blue)}
.sum .perk2{background:var(--soft);border-radius:12px;padding:10px 12px;font-size:14px;margin-top:12px;color:#1E3A8A}
.berr{color:#B91C1C;font-size:14px;min-height:1.3em;margin-top:8px}
.ok{display:none;text-align:center;padding:18px 6px}
.ok .tick{width:64px;height:64px;border-radius:50%;background:#16A34A;display:grid;place-items:center;margin:0 auto 12px}
.ok h3{justify-content:center}
.ref{font-family:ui-monospace,Menlo,monospace;background:var(--soft);padding:4px 10px;border-radius:8px}
.small{font-size:13px;color:var(--muted)}
@media (max-width:860px){.bk{grid-template-columns:minmax(0,1fr)}.sum{position:static}.svc{grid-template-columns:1fr}.times{grid-template-columns:repeat(3,1fr)}}
@media (max-width:560px){.fields,.cardf{grid-template-columns:1fr}.navb{display:none}}
@media (max-width:560px){.steps,.perks{grid-template-columns:1fr}.brand small{display:none}}
</style>
</head>
<body>
<nav><div class="wrap">
  <div class="brand"><span class="mk">${icon}</span><span><span data-t="name"></span><small data-t="name2"></small></span></div>
  <div class="navr"><a class="navb" href="#book" data-t="bookNav"></a><button class="lang" id="lang">العربية</button></div>
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
    <div class="dev">
    <div class="toast" id="toast"><span class="ic">${icon}</span><span><b data-t="name"></b><br><span id="toastT"></span></span></div>
    <canvas id="scene" aria-label="3D loyalty card"></canvas>
    <div class="phone">
      <div class="pass" id="pass">
        <div class="pt">${icon}<div class="lt" data-t="name"></div><div class="hf"><div class="lab" data-t="stamps"></div><div class="val" id="count"></div></div></div>
        <div class="strip" id="strip"></div>
        <div class="sec"><div class="lab" data-t="rule"></div><div class="v2" id="prog"></div></div>
        <div class="aux"><div><div class="lab" data-t="cust"></div><div class="v2" id="cname"></div></div><div class="e"><div class="lab" data-t="mid"></div><div class="v2">CW-04821</div></div></div>
        <div class="qr"><div class="b"><canvas id="qr" width="120" height="120"></canvas></div><div class="alt" data-t="alt"></div></div>
      </div>
    </div>
    </div>
    <div class="demo"><button class="w" id="stamp" data-t="try"></button><button id="reset" data-t="reset"></button></div>
  </div>
</div></header>

<section class="book" id="book"><div class="wrap">
  <h2 data-t="bookH"></h2>
  <div class="bk">
    <div>
      <div class="panel"><h3><i>1</i><span data-t="b1"></span></h3><div class="svc" id="svc"></div></div>
      <div class="panel"><h3><i>2</i><span data-t="b2"></span></h3><div class="days" id="days"></div><div class="times" id="times"></div></div>
      <div class="panel"><h3><i>3</i><span data-t="b3"></span></h3>
        <div class="fields">
          <div><label for="bn" data-t="nameL"></label><input id="bn" autocomplete="name"></div>
          <div><label for="bp" data-t="phoneL"></label><input id="bp" type="tel" inputmode="tel" placeholder="+968"></div>
          <div class="full"><label for="bc" data-t="carL"></label><input id="bc" data-tp="carP"></div>
        </div>
      </div>
      <div class="panel"><h3><i>4</i><span data-t="b4"></span></h3>
        <div class="pay"><button class="opt" type="button" data-pay="card" aria-pressed="true"><b data-t="payCard"></b><span data-t="payCardS"></span></button>
          <button class="opt" type="button" data-pay="shop" aria-pressed="false"><b data-t="payShop"></b><span data-t="payShopS"></span></button></div>
        <div id="cardBox">
          <div class="cardf">
            <div><label for="cn" data-t="cardN"></label><input id="cn" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="19"></div>
            <div><label for="ce" data-t="cardE"></label><input id="ce" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"></div>
            <div><label for="cv" data-t="cardC"></label><input id="cv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"></div>
          </div>
          <button class="apay" type="button" id="apay"> Pay</button>
          <p class="small" data-t="secure"></p>
        </div>
      </div>
    </div>
    <aside class="panel sum" id="sum">
      <div id="sumBody">
        <h3 data-t="sumH"></h3>
        <dl><dt data-t="sService"></dt><dd id="sS">–</dd><dt data-t="sWhen"></dt><dd id="sW">–</dd><dt data-t="sPay"></dt><dd id="sP">–</dd>
          <dt class="tot" data-t="sTotal"></dt><dd class="tot" id="sT">–</dd></dl>
        <button class="btn" id="confirm" type="button"></button>
        <div class="berr" id="berr" role="alert"></div>
        <div class="perk2" data-t="stampPerk"></div>
      </div>
      <div class="ok" id="ok">
        <div class="tick"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h3 data-t="okH"></h3>
        <p id="okT"></p>
        <p><span data-t="okRef"></span> <span class="ref" id="okRef"></span></p>
        <p class="small" data-t="demoPay"></p>
        <button class="btn" id="again" type="button" data-t="okAgain"></button>
      </div>
    </aside>
  </div>
</div></section>

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
  en: { bookNav: 'Book a wash', bookH: 'Book your wash and pay online', b1: 'Choose a service', b2: 'Pick a day and time', b3: 'Your details', b4: 'Payment',
    carL: 'Car (model and plate)', carP: 'e.g. Toyota Camry · 12345 A', payCard: 'Pay online', payCardS: 'Card or Apple Pay', payShop: 'Pay at the shop', payShopS: 'Cash or card on arrival',
    cardN: 'Card number', cardE: 'Expiry', cardC: 'CVV', secure: 'Payments are processed securely by the payment provider. Card details never touch this website.',
    sumH: 'Your booking', sService: 'Service', sWhen: 'When', sPay: 'Payment', sTotal: 'Total', stampPerk: 'Every booked wash adds a stamp to your Wallet card automatically.',
    okH: 'Booking confirmed', okRef: 'Reference', okAgain: 'Book another wash', demoPay: 'Demo preview: no real payment was taken.',
    payNow: (p) => 'Pay ' + p + ' and book', bookShop: 'Confirm booking', omr: (n) => n.toFixed(3) + ' OMR', min: 'min',
    errSvc: 'Choose a service.', errTime: 'Pick a day and time.', errName: 'Enter your name and phone.', errCard: 'Check the card details.',
    okText: (s, w) => s + ', ' + w + '. We will send a WhatsApp reminder.', paidCard: 'Paid online', payLater: 'At the shop', full: 'Full',
    svcs: [['Exterior wash', 'Foam, hand wash, dry', 3, 25], ['Full wash', 'Exterior + interior vacuum', 5, 45], ['Polish & wax', 'Machine polish, wax, tyre shine', 12, 90]],
    week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], today: 'Today',
    name: 'Car Wash', name2: 'مغسلة سيارات', h1: 'Wash 9 times, your 10th is free', lead: 'Your stamp card lives in Apple Wallet and updates itself every time you wash. No app, no paper card to lose.',
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
  ar: { bookNav: 'احجز غسلة', bookH: 'احجز غسلتك وادفع أونلاين', b1: 'اختر الخدمة', b2: 'اختر اليوم والوقت', b3: 'بياناتك', b4: 'الدفع',
    carL: 'السيارة (النوع والرقم)', carP: 'مثال: تويوتا كامري · 12345 أ', payCard: 'ادفع أونلاين', payCardS: 'بطاقة أو Apple Pay', payShop: 'ادفع في المحل', payShopS: 'نقداً أو بالبطاقة عند الوصول',
    cardN: 'رقم البطاقة', cardE: 'الانتهاء', cardC: 'الرمز', secure: 'تتم معالجة الدفع بأمان عبر مزود الدفع. بيانات البطاقة لا تمر عبر هذا الموقع.',
    sumH: 'حجزك', sService: 'الخدمة', sWhen: 'الموعد', sPay: 'الدفع', sTotal: 'المجموع', stampPerk: 'كل غسلة محجوزة تضيف ختماً لبطاقتك في Wallet تلقائياً.',
    okH: 'تم تأكيد الحجز', okRef: 'رقم الحجز', okAgain: 'احجز غسلة أخرى', demoPay: 'معاينة تجريبية: لم يتم خصم أي مبلغ.',
    payNow: (p) => 'ادفع ' + p + ' واحجز', bookShop: 'تأكيد الحجز', omr: (n) => n.toFixed(3) + ' ر.ع', min: 'دقيقة',
    errSvc: 'اختر الخدمة.', errTime: 'اختر اليوم والوقت.', errName: 'اكتب اسمك ورقم هاتفك.', errCard: 'تحقق من بيانات البطاقة.',
    okText: (s, w) => s + '، ' + w + '. سنرسل لك تذكيراً على واتساب.', paidCard: 'مدفوع أونلاين', payLater: 'في المحل', full: 'محجوز',
    svcs: [['غسيل خارجي', 'رغوة، غسيل يدوي، تنشيف', 3, 25], ['غسيل كامل', 'خارجي + تنظيف داخلي بالمكنسة', 5, 45], ['تلميع وشمع', 'تلميع بالماكينة، شمع، تلميع الإطارات', 12, 90]],
    week: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], today: 'اليوم',
    name: 'مغسلة سيارات', name2: 'Car Wash', h1: 'اغسل ٩ مرات، والغسلة العاشرة مجاناً', lead: 'بطاقة الأختام في Apple Wallet وتتحدث تلقائياً مع كل غسلة. بدون تطبيق وبدون بطاقة ورقية تضيع.',
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
var render = function () {
  const t = T[lang];
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  $('lang').textContent = t.lang;
  $('count').textContent = stamps + '/10';
  $('strip').innerHTML = STRIPS[lang][stamps];
  $('prog').textContent = t.left(9 - stamps);
  $('cname').textContent = name || t.you;
  window.dispatchEvent(new CustomEvent('cardstate', { detail: { lang, stamps, name: name || t.you,
    L: { name: t.name, stamps: t.stamps, rule: t.rule, prog: t.left(9 - stamps), cust: t.cust, mid: t.mid, alt: t.alt } } }));
}
window.cardState = () => render();
// Decorative QR pattern (Wallet draws the real code from the member ID).
window.drawQR = (c, seed, size) => {
  const x = c.getContext('2d'), N = 21, s = size / N;
  let r = seed * 7919 + 17;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#111';
  const inF = (i, j) => (i < 8 && j < 8) || (i > 12 && j < 8) || (i < 8 && j > 12);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!inF(i, j) && rnd() > .55) x.fillRect(i * s, j * s, s, s);
  for (const [a, b] of [[0, 0], [14, 0], [0, 14]]) {
    x.fillRect(a * s, b * s, 7 * s, 7 * s); x.fillStyle = '#fff'; x.fillRect((a + 1) * s, (b + 1) * s, 5 * s, 5 * s);
    x.fillStyle = '#111'; x.fillRect((a + 2) * s, (b + 2) * s, 3 * s, 3 * s);
  }
};
window.drawQR(document.getElementById('qr'), 4, 120);
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
window.cardStamp = () => {
  if (stamps >= 9) { toast(T[lang].free); return; }
  stamps++; render(); toast(stamps >= 9 ? T[lang].free : T[lang].toast(stamps));
};
window.cardReset = () => { stamps = 0; render(); };
$('stamp').onclick = () => { window.__userAt = Date.now(); window.cardStamp(); };
$('reset').onclick = () => { window.__userAt = Date.now(); window.cardReset(); };
$('n').addEventListener('input', (e) => { name = e.target.value.trim().toUpperCase(); render(); });
$('f').addEventListener('submit', (e) => { e.preventDefault(); $('note').textContent = T[lang].demoNote; });
// ---------- booking & payment (demo) ----------
const bk = { svc: -1, day: 0, time: '', pay: 'card' };
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const fullSlot = (d, t) => ((d * 7 + SLOTS.indexOf(t) * 3) % 5) === 0; // pretend some slots are taken
const dayDate = (i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; };
function renderBooking() {
  const t = T[lang];
  document.querySelectorAll('[data-tp]').forEach((el) => { el.placeholder = t[el.dataset.tp]; });
  $('svc').innerHTML = t.svcs.map((v, i) => \`<button class="opt" type="button" data-svc="\${i}" aria-pressed="\${bk.svc === i}"><b>\${v[0]}</b><span>\${v[1]} · \${v[3]} \${t.min}</span><em>\${t.omr(v[2])}</em></button>\`).join('');
  $('days').innerHTML = Array.from({ length: 10 }, (_, i) => { const d = dayDate(i);
    return \`<button class="opt" type="button" data-day="\${i}" aria-pressed="\${bk.day === i}"><span>\${i === 0 ? t.today : t.week[d.getDay()]}</span><b>\${d.getDate()}</b></button>\`; }).join('');
  const nowH = new Date().getHours();
  $('times').innerHTML = SLOTS.map((s) => { const off = fullSlot(bk.day, s) || (bk.day === 0 && parseInt(s) <= nowH);
    if (off && bk.time === s) bk.time = '';
    return \`<button class="opt" type="button" data-time="\${s}" aria-pressed="\${bk.time === s}" \${off ? 'disabled' : ''}>\${s}</button>\`; }).join('');
  document.querySelectorAll('[data-pay]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pay === bk.pay)));
  $('cardBox').style.display = bk.pay === 'card' ? '' : 'none';
  const v = t.svcs[bk.svc];
  const d = dayDate(bk.day);
  $('sS').textContent = v ? v[0] : '–';
  $('sW').textContent = bk.time ? \`\${bk.day === 0 ? t.today : t.week[d.getDay()]} \${d.getDate()}/\${d.getMonth() + 1} · \${bk.time}\` : '–';
  $('sP').textContent = bk.pay === 'card' ? t.payCard : t.payShop;
  $('sT').textContent = v ? t.omr(v[2]) : '–';
  $('confirm').textContent = bk.pay === 'card' && v ? t.payNow(t.omr(v[2])) : t.bookShop;
  $('apay').textContent = ' Pay' + (v ? ' ' + t.omr(v[2]) : '');
}
document.querySelector('.book').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.svc) bk.svc = +b.dataset.svc;
  else if (b.dataset.day) { bk.day = +b.dataset.day; }
  else if (b.dataset.time) bk.time = b.dataset.time;
  else if (b.dataset.pay) bk.pay = b.dataset.pay;
  else return;
  $('berr').textContent = ''; renderBooking();
});
$('cn').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\\D/g, '').slice(0, 16).replace(/(\\d{4})(?=\\d)/g, '$1 '); });
$('ce').addEventListener('input', (e) => { const v = e.target.value.replace(/\\D/g, '').slice(0, 4); e.target.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; });
$('cv').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\\D/g, '').slice(0, 4); });
function luhn(n) { let s = 0; [...n].reverse().forEach((c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; }); return n.length >= 13 && s % 10 === 0; }
function book(viaApplePay) {
  const t = T[lang]; const err = (m) => { $('berr').textContent = m; };
  if (bk.svc < 0) return err(t.errSvc);
  if (!bk.time) return err(t.errTime);
  if (!$('bn').value.trim() || $('bp').value.replace(/\\D/g, '').length < 8) return err(t.errName);
  if (bk.pay === 'card' && !viaApplePay) {
    const [mm, yy] = $('ce').value.split('/').map(Number);
    if (!luhn($('cn').value.replace(/\\s/g, '')) || !(mm >= 1 && mm <= 12 && yy >= 0) || $('cv').value.length < 3) return err(t.errCard);
  }
  const ref = 'CW-B' + String(Math.floor(Math.random() * 90000) + 10000);
  $('okRef').textContent = ref;
  $('okT').textContent = t.okText($('sS').textContent, $('sW').textContent) + ' ' + (bk.pay === 'card' ? t.paidCard : t.payLater) + ' · ' + $('sT').textContent;
  $('sumBody').style.display = 'none'; $('ok').style.display = 'block';
  window.__userAt = Date.now(); window.cardStamp && window.cardStamp();
  if (innerWidth < 860) $('sum').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('confirm').onclick = () => book(false);
$('apay').onclick = () => book(true);
$('again').onclick = () => { bk.svc = -1; bk.time = ''; $('ok').style.display = 'none'; $('sumBody').style.display = ''; renderBooking(); };
const _render = render;
render = function () { _render(); renderBooking(); };

render();
</script>
<script type="module">
${fs.readFileSync(path.join(__dirname, "demo-scene.mjs"), "utf8")}
</script>
</body>
</html>
`;
const dir = path.join(ROOT, 'out', 'demo');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Wrote', path.join(dir, 'index.html'));
