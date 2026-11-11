// Builds each car wash's customer website (book, pay, add the loyalty card, 3D card) and its
// management dashboard preview (sample data) from its businesses/<slug>/ folder. Static, no server needed.
// Usage: node scripts/build-site.js [slug ...]   (no slug = every car wash)
// Output: out/sites/<publishPath>/index.html and out/sites/<publishPath>/admin/index.html. It is then run through the shared preview build
// (badge, © footer, domain lock) before publishing.
const fs = require('node:fs');
const path = require('node:path');
const art = require('../src/art');
const { ROOT } = require('../src/config');
const { loadBusinesses, ruleText } = require('../src/business');

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (h) => { const c = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
// Text on the accent colour: black or white, whichever reads better.
const onColor = (h) => ((lum(h) + 0.05) / 0.05 >= 1.05 / (lum(h) + 0.05) ? '#000' : '#fff');

// What the page's scripts need to know about the car wash.
function publicBiz(B) {
  const rule = ruleText(B.program.stampsForReward);
  return {
    slug: B.slug, idPrefix: B.idPrefix, name: B.name, city: B.city, currency: B.currency,
    total: B.program.stampsForReward, rule, phone: B.phone, whatsapp: B.whatsapp, mapsUrl: B.mapsUrl,
    services: B.services.map((x) => ({ icon: x.icon || 'sedan', price: x.price, en: x.en, ar: x.ar || x.en })),
    extras: B.extras.map((x) => ({ price: x.price, en: x.en, ar: x.ar || x.en })),
    hours: B.hours,
    colors: { ...B.colors, accentRgb: hexRgb(B.colors.accent).join(','), onAccent: B.colors.onAccent || onColor(B.colors.accent) },
    logoAspect: B.logoSize.w / B.logoSize.h,
  };
}

function build(B) {
const P = publicBiz(B);
const BG = B.colors.card, ACC = B.colors.accent, TOTAL = B.program.stampsForReward;
const LOGO = B.dataUri('logo-web.png');
const MARK = B.dataUri('mark.png');
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const NAME = esc(B.name.en), CITY = esc(B.city.en);
const minPrice = Math.min(...B.services.map((x) => x.price));
const strips = { en: [], ar: [] };
for (let s = 0; s < TOTAL; s++) {
  strips.en.push(art.stripSvg(1, BG, s, TOTAL, false, ACC).replace(/width="375" height="123"/, 'width="100%"'));
  strips.ar.push(art.stripSvg(1, BG, s, TOTAL, true, ACC).replace(/width="375" height="123"/, 'width="100%"'));
}
const icon = '<img src="' + MARK + '" alt="" width="30" height="30">';

const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${NAME} · Book, pay and earn a free wash · ${CITY}</title>
<meta name="description" content="${NAME}, ${CITY}. Book your wash online, pay by card or Apple Pay, and collect stamps on your Apple Wallet card: your ${P.rule.ordinalEn} wash is free.">
<meta name="theme-color" content="${B.colors.page}">
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<style>
:root{--blue:${ACC};--acc-rgb:${P.colors.accentRgb};--on-acc:${P.colors.onAccent};--label:${B.colors.label};--ink:#F4F4F5;--muted:#A1A1AA;--soft:rgba(var(--acc-rgb),.10);--bg:${B.colors.page};--panel:${B.colors.panel};--line:#27272A;--field:#0D0D0F;--nav-h:64px;color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif;color:var(--ink);background:var(--bg)}
html[lang=ar] body{font-family:-apple-system,"SF Arabic","Segoe UI",Tahoma,sans-serif}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
nav{position:sticky;top:0;z-index:20;height:var(--nav-h);background:rgba(10,10,11,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:100%}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:19px}
.brand img{height:36px;width:auto;display:block}
.brand small{display:block;font-weight:500;font-size:13px;color:var(--muted)}
.lang{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:7px 14px;font:inherit;font-weight:600;cursor:pointer}
.hero{background:var(--bg);color:#fff;overflow:hidden;position:relative;border-bottom:1px solid var(--line)}
.hero::before{content:'';position:absolute;inset:-20% auto auto -10%;width:60%;height:120%;background:radial-gradient(closest-side,rgba(var(--acc-rgb),.16),transparent);pointer-events:none}
.hero .wrap{position:relative}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding-top:64px;padding-bottom:72px}
h1 em{font-style:normal;color:var(--blue)}
h1{font-size:clamp(32px,5vw,54px);line-height:1.08;margin:0 0 16px;letter-spacing:-.02em}
html[lang=ar] h1{letter-spacing:0;line-height:1.3}
.lead{font-size:19px;opacity:.9;margin:0 0 28px;max-width:34em}
form{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:20px;max-width:460px}
label{display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.9;margin:0 0 6px}
html[lang=ar] label{letter-spacing:0;font-size:13px}
input{width:100%;font:inherit;font-size:17px;padding:13px 14px;border:1px solid var(--line);border-radius:12px;margin-bottom:14px;color:#fff;background:var(--field)}
input:focus{outline:2px solid var(--blue);outline-offset:1px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;font:inherit;font-weight:600;font-size:17px;padding:14px;border:0;border-radius:12px;background:#000;color:#fff;cursor:pointer;border:1px solid #3F3F46}
.btn svg{width:22px;height:22px}
.note{font-size:13px;opacity:.8;margin-top:10px;min-height:1.3em}
.stage{display:flex;flex-direction:column;align-items:center;gap:16px}
.phone{width:min(360px,100%);background:#0b0b0d;border-radius:44px;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.pass{background:${BG};border-radius:16px;padding:12px 0 18px;color:#fff;transition:transform .3s}
.pass.pop{transform:scale(1.02)}
.pt{display:flex;align-items:center;gap:8px;padding:0 14px 10px}
.pt svg{width:36px;height:36px;flex:none}
.pt .lt{font-weight:600;font-size:17px;flex:1}
.hf{text-align:end}
.lab{font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--label);text-transform:uppercase}
html[lang=ar] .lab{letter-spacing:0;font-size:11px}
.val{font-size:22px;font-weight:500}
.strip{line-height:0}
.sec{padding:12px 14px 0}.v2{font-size:15px;margin-top:2px}
.aux{display:flex;justify-content:space-between;padding:12px 14px 0}.aux .e{text-align:end}
.qr{text-align:center;margin-top:16px}.qr .b{display:inline-block;background:#fff;padding:8px;border-radius:10px;line-height:0}
.qr .alt{font-size:12px;margin-top:7px;opacity:.9}
.toast{position:absolute;inset-inline:14px;top:14px;background:rgba(245,245,247,.97);color:#111;border-radius:16px;padding:10px 12px;font-size:13px;display:flex;gap:10px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.3);opacity:0;transform:translateY(-12px);transition:.35s;pointer-events:none}
.toast.on{opacity:1;transform:none}
.toast .ic{width:30px;height:30px;border-radius:7px;background:#000;overflow:hidden;flex:none;display:grid;place-items:center}
.toast .ic img{width:30px;height:30px}
.phone{position:relative}
.dev{position:relative;width:min(420px,100%);display:flex;justify-content:center}
#scene{display:none;width:100%;height:600px;touch-action:pan-y}
html.gl-on #scene{display:block}
html.gl-on .phone{display:none}
html.gl-on .toast{inset-inline:auto;width:300px;top:6px}
@media (max-width:860px){#scene{height:440px}}
.mcta{display:none}
@media (max-width:860px){
  .hero .wrap>div:first-child{display:contents}
  .hero .hcta,.hero::before{display:none}
  .hero h1{order:1}.hero .lead{order:2;margin-bottom:14px;font-size:17px}.hero .price{order:3;margin-bottom:0}.hero .stage{order:4;gap:10px}.hero form{order:5;max-width:none}
  .hero .wrap{gap:0;padding-top:28px;padding-bottom:40px}
  .hero h1{margin-bottom:12px}.hero .stage{margin:4px 0 18px}
  .mcta{display:flex;position:fixed;z-index:30;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));
    align-items:center;justify-content:space-between;gap:12px;background:#18181B;border:1px solid var(--line);color:#fff;border-radius:16px;padding:10px 10px 10px 16px;
    box-shadow:0 10px 30px rgba(0,0,0,.6);text-decoration:none;transition:transform .3s,opacity .3s}
  .mcta.off{transform:translateY(140%);opacity:0;pointer-events:none}
  .mcta small{display:block;opacity:.7;font-size:12px}
  .mcta b{background:var(--blue);color:var(--on-acc);border-radius:11px;padding:10px 16px;font-size:15px;white-space:nowrap}
  footer{padding-bottom:96px}
  .days{scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}.days .opt{scroll-snap-align:start}
  section.book,section.how{padding:48px 0}
  nav{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--bg)}
}
.demo{display:flex;gap:10px}
.demo button{font:inherit;font-weight:600;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
.demo button.w{background:var(--blue);color:var(--on-acc);border-color:var(--blue)}
section.how{padding:72px 0}
h2{font-size:clamp(26px,3.4vw,36px);margin:0 0 28px;letter-spacing:-.01em}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.step{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px}
.step b{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--blue);color:var(--on-acc);margin-bottom:14px}
.step h3{margin:0 0 6px;font-size:19px}
.step p{margin:0;color:#D4D4D8}
.perks{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:40px}
.perk{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:18px}
.perk h4{margin:0 0 4px;font-size:16px}.perk p{margin:0;color:var(--muted);font-size:14px}
footer{background:#000;color:#A1A1AA;padding:28px 0;font-size:14px;border-top:1px solid var(--line)}
footer a{color:var(--label)}
footer .wrap{display:block}
@media (max-width:860px){.hero .wrap{grid-template-columns:1fr;padding-top:40px}.steps,.perks{grid-template-columns:1fr 1fr}}
.navr{display:flex;gap:10px;align-items:center}
.navb{background:var(--blue);color:var(--on-acc);border-radius:999px;padding:8px 16px;font-weight:600;text-decoration:none;font-size:15px}
section.book{padding:72px 0;background:#0D0D0F}
.bk{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr);gap:24px;align-items:start}
.bk>*{min-width:0}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:22px}
.panel h3{margin:0 0 14px;font-size:17px;display:flex;gap:10px;align-items:center}
.panel h3 i{font-style:normal;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--blue);color:var(--on-acc);font-weight:700;font-size:13px}
.panel+.panel{margin-top:16px}
.svc{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.svc .opt{display:flex;gap:14px;align-items:center;padding:16px}
.svc .opt svg{width:64px;height:40px;flex:none;color:var(--blue)}
.svc .opt em{font-size:20px;margin-top:2px}
.sub{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:20px 0 10px}
html[lang=ar] .sub{letter-spacing:0}
.xtra{display:grid;gap:10px}
.xtra .opt{display:flex;gap:12px;align-items:center}
.xtra .box{width:24px;height:24px;border-radius:7px;border:2px solid #52525B;flex:none;display:grid;place-items:center}
.xtra .opt[aria-pressed=true] .box{background:var(--blue);border-color:var(--blue)}
.xtra .opt .box svg{opacity:0}.xtra .opt[aria-pressed=true] .box svg{opacity:1}
.xtra .opt div{flex:1}
.xtra .opt em{margin:0;white-space:nowrap}
.sum dd.x{font-weight:500}
.price{display:inline-flex;gap:8px;flex-wrap:wrap;margin:0 0 22px}
.hcta{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 22px}
.hcta a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:700;border-radius:12px;padding:13px 20px}
.hcta .p{background:var(--blue);color:var(--on-acc)}.hcta .s{border:1px solid var(--line);color:#fff;background:var(--panel)}
form h3{margin:0 0 4px;font-size:18px}form .fs{margin:0 0 14px;color:var(--muted);font-size:14px}
.okw{display:flex;gap:10px;flex-direction:column;margin-top:10px}
.price span{background:rgba(var(--acc-rgb),.12);border:1px solid rgba(var(--acc-rgb),.4);border-radius:999px;padding:6px 12px;font-size:14px;font-weight:600}
.opt{border:1.5px solid var(--line);border-radius:14px;padding:14px;cursor:pointer;background:var(--field);text-align:start;font:inherit;color:inherit}
.opt b{display:block;font-size:15px}.opt span{display:block;color:var(--muted);font-size:13px}.opt em{display:block;font-style:normal;font-weight:700;color:var(--blue);margin-top:6px}
.opt[aria-pressed=true]{border-color:var(--blue);background:var(--soft);box-shadow:0 0 0 3px rgba(var(--acc-rgb),.18)}
.opt[disabled]{opacity:.4;cursor:not-allowed;text-decoration:line-through}
.days{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.days .opt{flex:none;width:72px;text-align:center;padding:10px 6px}
.days .opt b{font-size:20px}
.times{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.times .opt{text-align:center;padding:10px 4px;font-weight:600}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fields label{color:var(--muted);opacity:1}
.fields input{margin:0}
.full{grid-column:1/-1}
.pay{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.cardf{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px}
.cardf input{margin:0;font-variant-numeric:tabular-nums}
.apay{width:100%;margin-top:10px;background:#fff;color:#000;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:600;cursor:pointer}
.sum{position:sticky;top:84px}
.sum dl{display:grid;grid-template-columns:1fr auto;gap:8px 12px;margin:0 0 14px}
.sum dt{color:var(--muted)}.sum dd{margin:0;font-weight:600;text-align:end}
.sum .tot{border-top:1px solid var(--line);padding-top:12px;font-size:19px}
.sum .btn{background:var(--blue);color:var(--on-acc);border-color:var(--blue)}
.sum .btn svg{fill:currentColor}
.sum #again{color:#fff;border-color:var(--line)}
.sum .perk2{background:var(--soft);border-radius:12px;padding:10px 12px;font-size:14px;margin-top:12px;color:var(--label)}
.berr{color:#F87171;font-size:14px;min-height:1.3em;margin-top:8px}
.ok{display:none;text-align:center;padding:18px 6px}
.ok .tick{width:64px;height:64px;border-radius:50%;background:#16A34A;display:grid;place-items:center;margin:0 auto 12px}
.ok h3{justify-content:center}
.ref{font-family:ui-monospace,Menlo,monospace;background:var(--soft);padding:4px 10px;border-radius:8px}
.small{font-size:13px;color:var(--muted)}
@media (max-width:860px){.bk{grid-template-columns:minmax(0,1fr)}.sum{position:static}.svc{grid-template-columns:1fr 1fr}.times{grid-template-columns:repeat(3,1fr)}}
@media (max-width:560px){.svc{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.svc .opt{flex-direction:column;align-items:flex-start;gap:8px;padding:14px}.svc .opt em{font-size:18px}.xtra .opt em{font-size:14px}.fields,.cardf{grid-template-columns:1fr}.navb{display:none}}
@media (max-width:560px){.steps,.perks{grid-template-columns:1fr}.brand small{display:none}}
</style>
</head>
<body>
<nav><div class="wrap">
  <a class="brand" href="#" aria-label="${NAME}"><img src="${LOGO}" alt="${NAME}"></a>
  <div class="navr"><a class="navb" href="#book" data-t="bookNav"></a><button class="lang" id="lang">العربية</button></div>
</div></nav>

<header class="hero"><div class="wrap">
  <div>
    <h1 data-t="h1"></h1>
    <p class="lead" data-t="lead"></p>
    <div class="price" id="price"></div>
    <div class="hcta"><a class="p" href="#book" data-t="bookNav"></a><a class="s" href="#f" data-t="getCard"></a></div>
    <form id="f">
      <h3 data-t="fH"></h3><p class="fs" data-t="fS"></p>
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
        <div class="pt"><img src="${LOGO}" alt="" style="max-width:150px;max-height:40px;width:auto;height:auto"><div class="lt"></div><div class="hf"><div class="lab" data-t="stamps"></div><div class="val" id="count"></div></div></div>
        <div class="strip" id="strip"></div>
        <div class="sec"><div class="lab" data-t="rule"></div><div class="v2" id="prog"></div></div>
        <div class="aux"><div><div class="lab" data-t="cust"></div><div class="v2" id="cname"></div></div><div class="e"><div class="lab" data-t="mid"></div><div class="v2">${B.idPrefix}-04821</div></div></div>
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
      <div class="panel"><h3><i>1</i><span data-t="b1"></span></h3><div class="svc" id="svc"></div><div class="sub" data-t="xH"></div><div class="xtra" id="xtra"></div></div>
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
        <dl id="sDl"><dt data-t="sService"></dt><dd id="sS">–</dd><dt data-t="sWhen"></dt><dd id="sW">–</dd><dt data-t="sPay"></dt><dd id="sP">–</dd>
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
        <div class="okw"><button class="btn" id="okWallet" type="button"><svg viewBox="0 0 24 24" fill="#fff"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#fff" stroke-width="2"/><rect x="3" y="9" width="18" height="3"/></svg><span data-t="add"></span></button>
        <button class="btn" id="again" type="button" data-t="okAgain" style="background:var(--panel)"></button></div>
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

<footer><div class="wrap"><span data-t="foot"></span> · <a href="admin/" data-t="staff"></a></div></footer>
<a class="mcta" id="mcta" href="#book"><span><span data-t="bookNav"></span><small data-t="from"></small></span><b data-t="bookGo"></b></a>

<script>
window.BIZ = ${JSON.stringify(P).replace(/</g, "\\u003c")};
const BIZ = window.BIZ, TOTAL = BIZ.total;
const STRIPS = ${JSON.stringify(strips)};
const T = {
  en: { bookNav: 'Book a wash', bookH: 'Book your wash and pay online', b1: 'Choose your car', from: 'From ' + ${JSON.stringify(minPrice.toFixed(3))} + ' ' + BIZ.currency.en + ' · pay online', bookGo: 'Book now', xH: 'Extras', b2: 'Pick a day and time', b3: 'Your details', b4: 'Payment',
    carL: 'Car (model and plate)', carP: 'e.g. Toyota Camry · 12345 A', payCard: 'Pay online', payCardS: 'Card or Apple Pay', payShop: 'Pay at the shop', payShopS: 'Cash or card on arrival',
    cardN: 'Card number', cardE: 'Expiry', cardC: 'CVV', secure: 'Payments are processed securely by the payment provider. Card details never touch this website.',
    sumH: 'Your booking', sService: 'Car wash', sWhen: 'When', sPay: 'Payment', sTotal: 'Total', stampPerk: 'Every booked wash adds a stamp to your Wallet card automatically.',
    okH: 'Booking confirmed', okRef: 'Reference', okAgain: 'Book another wash', demoPay: 'Demo preview: no real payment was taken.',
    payNow: (p) => 'Pay ' + p + ' and book', bookShop: 'Confirm booking', omr: (n) => n.toFixed(3) + ' ' + BIZ.currency.en, min: 'min',
    errSvc: 'Choose your car type.', errTime: 'Pick a day and time.', errName: 'Enter your name and phone.', errCard: 'Check the card details.',
    okText: (s, w) => s + ', ' + w + '. We will send a WhatsApp reminder.', paidCard: 'Paid online', payLater: 'At the shop', full: 'Full',
    svcs: BIZ.services.map((x) => [x.en[0], x.en[1] || '', x.price, x.icon]),
    extras: BIZ.extras.map((x) => [x.en[0], x.en[1] || '', x.price]),
    week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], today: 'Today',
    name: BIZ.name.en, name2: BIZ.name.ar, h1: 'Book your wash. Pay online. Your ' + BIZ.rule.ordinalEn + ' is free.', lead: BIZ.name.en + ', ' + BIZ.city.en + '. Pick a time, pay by card or Apple Pay, and every wash adds a stamp to your Apple Wallet card.',
    getCard: 'Get loyalty card', fH: 'Free loyalty card', fS: BIZ.rule.en + '. Lives in Apple Wallet and updates itself.', staff: 'Management login',
    nameL: 'Your name', phoneL: 'Phone', add: 'Add to Apple Wallet', stamps: 'Stamps', rule: BIZ.rule.en, cust: 'Customer', mid: 'Member ID',
    alt: 'Show this code at the counter', try: '+1 stamp (try it)', reset: 'Reset', howH: 'How it works',
    s1h: 'Add the card', s1p: 'Type your name and phone, tap Add to Apple Wallet. Done in 10 seconds.',
    s2h: 'Show it at the counter', s2p: 'Staff scan the QR code and add a stamp from their phone.',
    s3h: 'It updates by itself', s3p: 'The new stamp appears on your card in seconds, with a lock screen notification.',
    k1h: 'Arabic & English', k1p: 'Follows your iPhone language.', k2h: 'Always up to date', k2p: 'Live updates, no re-download.',
    k3h: 'Free wash reminder', k3p: 'Tells you when your free wash is ready.', k4h: 'Nearby alert', k4p: 'Shows on the lock screen near the shop.',
    foot: BIZ.name.en + ', ' + BIZ.city.en + '. Loyalty card and website design © ' + new Date().getFullYear() + ' Mazen. All rights reserved.', demoNote: 'Demo preview: the real card downloads once the service is live.',
    left: (n) => n === 0 ? 'Your free wash is ready!' : n === 1 ? '1 more wash until your free one' : n + ' more washes until your free one',
    toast: (s) => 'You now have ' + s + '/' + TOTAL + ' stamps', free: 'Your free wash is ready!', lang: 'العربية', you: 'SALIM' },
  ar: { bookNav: 'احجز غسلة', bookH: 'احجز غسلتك وادفع أونلاين', b1: 'اختر نوع سيارتك', from: 'من ' + ${JSON.stringify(minPrice.toFixed(3))} + ' ' + BIZ.currency.ar + ' · ادفع أونلاين', bookGo: 'احجز الآن', xH: 'إضافات', b2: 'اختر اليوم والوقت', b3: 'بياناتك', b4: 'الدفع',
    carL: 'السيارة (النوع والرقم)', carP: 'مثال: تويوتا كامري · 12345 أ', payCard: 'ادفع أونلاين', payCardS: 'بطاقة أو Apple Pay', payShop: 'ادفع في المحل', payShopS: 'نقداً أو بالبطاقة عند الوصول',
    cardN: 'رقم البطاقة', cardE: 'الانتهاء', cardC: 'الرمز', secure: 'تتم معالجة الدفع بأمان عبر مزود الدفع. بيانات البطاقة لا تمر عبر هذا الموقع.',
    sumH: 'حجزك', sService: 'غسيل السيارة', sWhen: 'الموعد', sPay: 'الدفع', sTotal: 'المجموع', stampPerk: 'كل غسلة محجوزة تضيف ختماً لبطاقتك في Wallet تلقائياً.',
    okH: 'تم تأكيد الحجز', okRef: 'رقم الحجز', okAgain: 'احجز غسلة أخرى', demoPay: 'معاينة تجريبية: لم يتم خصم أي مبلغ.',
    payNow: (p) => 'ادفع ' + p + ' واحجز', bookShop: 'تأكيد الحجز', omr: (n) => n.toFixed(3) + ' ' + BIZ.currency.ar, min: 'دقيقة',
    errSvc: 'اختر نوع سيارتك.', errTime: 'اختر اليوم والوقت.', errName: 'اكتب اسمك ورقم هاتفك.', errCard: 'تحقق من بيانات البطاقة.',
    okText: (s, w) => s + '، ' + w + '. سنرسل لك تذكيراً على واتساب.', paidCard: 'مدفوع أونلاين', payLater: 'في المحل', full: 'محجوز',
    svcs: BIZ.services.map((x) => [x.ar[0], x.ar[1] || '', x.price, x.icon]),
    extras: BIZ.extras.map((x) => [x.ar[0], x.ar[1] || '', x.price]),
    week: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], today: 'اليوم',
    name: BIZ.name.ar, name2: BIZ.name.en, h1: 'احجز غسلتك. ادفع أونلاين. و' + BIZ.rule.ordinalAr + ' مجاناً.', lead: BIZ.name.ar + '، ' + BIZ.city.ar + '. اختر الوقت، وادفع بالبطاقة أو Apple Pay، وكل غسلة تضيف ختماً إلى بطاقتك في Apple Wallet.',
    getCard: 'احصل على بطاقة الولاء', fH: 'بطاقة ولاء مجانية', fS: BIZ.rule.ar + '. تُحفظ في Apple Wallet وتتحدث تلقائياً.', staff: 'دخول الإدارة',
    nameL: 'الاسم', phoneL: 'الهاتف', add: 'أضف إلى Apple Wallet', stamps: 'الأختام', rule: BIZ.rule.ar, cust: 'العميل', mid: 'رقم العضوية',
    alt: 'اعرض هذا الرمز عند الكاونتر', try: '+١ ختم (جرّب)', reset: 'إعادة', howH: 'طريقة العمل',
    s1h: 'أضف البطاقة', s1p: 'اكتب اسمك ورقمك واضغط أضف إلى Apple Wallet. خلال ١٠ ثوانٍ.',
    s2h: 'اعرضها عند الكاونتر', s2p: 'الموظف يمسح الرمز ويضيف ختماً من هاتفه.',
    s3h: 'تتحدث تلقائياً', s3p: 'يظهر الختم الجديد على بطاقتك خلال ثوانٍ مع إشعار على شاشة القفل.',
    k1h: 'عربي وإنجليزي', k1p: 'حسب لغة الآيفون.', k2h: 'محدثة دائماً', k2p: 'تحديث مباشر بدون تحميل جديد.',
    k3h: 'تذكير بالغسلة المجانية', k3p: 'تخبرك عندما تكون غسلتك المجانية جاهزة.', k4h: 'تنبيه قريب', k4p: 'تظهر على شاشة القفل قرب المحل.',
    foot: BIZ.name.ar + '، ' + BIZ.city.ar + '. تصميم بطاقة الولاء والموقع © ' + new Date().getFullYear() + ' مازن. جميع الحقوق محفوظة.', demoNote: 'معاينة تجريبية: البطاقة الحقيقية تُحمّل عند تشغيل الخدمة.',
    left: (n) => n === 0 ? 'غسلتك المجانية جاهزة!' : n === 1 ? 'باقي غسلة واحدة على الغسلة المجانية' : 'باقي ' + n + ' غسلات على الغسلة المجانية',
    toast: (s) => 'لديك الآن ' + s + '/' + TOTAL + ' أختام', free: 'غسلتك المجانية جاهزة!', lang: 'English', you: 'سالم' },
};
let lang = 'en', stamps = Math.min(4, TOTAL - 2), name = '';
const $ = (id) => document.getElementById(id);
var render = function () {
  const t = T[lang];
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  $('lang').textContent = t.lang;
  $('count').textContent = stamps + '/' + TOTAL;
  $('price').innerHTML = t.svcs.map((v) => '<span>' + v[0] + ' ' + t.omr(v[2]) + '</span>').join('');
  $('strip').innerHTML = STRIPS[lang][stamps];
  $('prog').textContent = t.left(TOTAL - 1 - stamps);
  $('cname').textContent = name || t.you;
  window.dispatchEvent(new CustomEvent('cardstate', { detail: { lang, stamps, name: name || t.you,
    L: { name: t.name, stamps: t.stamps, rule: t.rule, prog: t.left(TOTAL - 1 - stamps), cust: t.cust, mid: t.mid, alt: t.alt } } }));
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
  if (stamps >= TOTAL - 1) { toast(T[lang].free); return; }
  stamps++; render(); toast(stamps >= TOTAL - 1 ? T[lang].free : T[lang].toast(stamps));
};
window.cardReset = () => { stamps = 0; render(); };
$('stamp').onclick = () => { window.__userAt = Date.now(); window.cardStamp(); };
$('reset').onclick = () => { window.__userAt = Date.now(); window.cardReset(); };
$('n').addEventListener('input', (e) => { name = e.target.value.trim().toUpperCase(); render(); });
$('f').addEventListener('submit', (e) => { e.preventDefault(); $('note').textContent = T[lang].demoNote; });
// ---------- booking & payment (demo) ----------
const bk = { svc: -1, day: 0, time: '', pay: 'card', x: BIZ.extras.map(() => false) };
const CARS = {
  sedan: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 27v-5l6-2 8-8h22l10 8 9 2v5"/><path d="M4 27h6m12 0h20m12 0h6"/><circle cx="16" cy="28" r="5"/><circle cx="48" cy="28" r="5"/><path d="M20 19l5-5h12l7 5z"/></svg>',
  suv: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 28V17l5-1 6-8h34l6 8 6 2v10"/><path d="M3 28h7m12 0h20m12 0h7"/><circle cx="16" cy="29" r="5.5"/><circle cx="48" cy="29" r="5.5"/><path d="M17 16l4-5h10v5zM35 11h11l4 5H35z"/></svg>',
  van: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 29V10q0-3 3-3h36l10 9 8 3v10"/><path d="M3 29h7m12 0h20m12 0h6"/><circle cx="16" cy="30" r="5"/><circle cx="48" cy="30" r="5"/><path d="M8 12h10v7H8zM22 12h10v7H22zM36 12h6l6 7H36z"/></svg>',
};
const TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const total = (t) => (bk.svc < 0 ? 0 : t.svcs[bk.svc][2] + t.extras.reduce((a, e, i) => a + (bk.x[i] ? e[2] : 0), 0));
const SLOTS = BIZ.hours.slots;
const closed = (d) => (BIZ.hours.closedDays || []).includes(dayDate(d).getDay());
const fullSlot = (d, t) => closed(d) || ((d * 7 + SLOTS.indexOf(t) * 3) % 5) === 0; // pretend some slots are taken
const dayDate = (i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; };
function renderBooking() {
  const t = T[lang];
  document.querySelectorAll('[data-tp]').forEach((el) => { el.placeholder = t[el.dataset.tp]; });
  $('svc').innerHTML = t.svcs.map((v, i) => '<button class="opt" type="button" data-svc="' + i + '" aria-pressed="' + (bk.svc === i) + '">' + (CARS[v[3]] || CARS.sedan) + '<div><b>' + v[0] + '</b><span>' + v[1] + '</span><em>' + t.omr(v[2]) + '</em></div></button>').join('');
  $('xtra').innerHTML = t.extras.map((v, i) => '<button class="opt" type="button" data-x="' + i + '" aria-pressed="' + bk.x[i] + '"><span class="box">' + TICK + '</span><div><b>' + v[0] + '</b><span>' + v[1] + '</span></div><em>+' + t.omr(v[2]) + '</em></button>').join('');
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
  $('sS').textContent = v ? v[0] + ' · ' + t.omr(v[2]) : '–';
  document.querySelectorAll('#sDl .xl').forEach((n) => n.remove());
  const after = $('sS');
  t.extras.slice().reverse().forEach((e, ri) => { const i = t.extras.length - 1 - ri; if (!bk.x[i]) return;
    const dt = document.createElement('dt'); dt.className = 'xl'; dt.textContent = '+ ' + e[0];
    const dd = document.createElement('dd'); dd.className = 'xl x'; dd.textContent = t.omr(e[2]);
    after.after(dt, dd); });
  $('sW').textContent = bk.time ? \`\${bk.day === 0 ? t.today : t.week[d.getDay()]} \${d.getDate()}/\${d.getMonth() + 1} · \${bk.time}\` : '–';
  $('sP').textContent = bk.pay === 'card' ? t.payCard : t.payShop;
  $('sT').textContent = v ? t.omr(total(t)) : '–';
  $('confirm').textContent = bk.pay === 'card' && v ? t.payNow(t.omr(total(t))) : t.bookShop;
  $('apay').textContent = ' Pay' + (v ? ' ' + t.omr(total(t)) : '');
}
document.querySelector('.book').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.svc) bk.svc = +b.dataset.svc;
  else if (b.dataset.x) bk.x[+b.dataset.x] = !bk.x[+b.dataset.x];
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
  const ref = BIZ.idPrefix + '-B' + String(Math.floor(Math.random() * 90000) + 10000);
  $('okRef').textContent = ref;
  const what = [t.svcs[bk.svc][0]].concat(t.extras.filter((e, i) => bk.x[i]).map((e) => e[0])).join(' + ');
  $('okT').textContent = t.okText(what, $('sW').textContent) + ' ' + (bk.pay === 'card' ? t.paidCard : t.payLater) + ' · ' + $('sT').textContent;
  $('sumBody').style.display = 'none'; $('ok').style.display = 'block';
  window.__userAt = Date.now(); window.cardStamp && window.cardStamp();
  try { // hand the booking to the management demo on this device
    const L = JSON.parse(localStorage.getItem('bookings:' + BIZ.slug) || '[]');
    L.unshift({ ref: ref, name: $('bn').value.trim(), svc: bk.svc, x: bk.x.slice(), day: bk.day, time: bk.time, pay: bk.pay, total: total(t), at: Date.now() });
    localStorage.setItem('bookings:' + BIZ.slug, JSON.stringify(L.slice(0, 20)));
  } catch (e) {}
  if (innerWidth < 860) $('sum').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('confirm').onclick = () => book(false);
$('okWallet').onclick = () => {
  $('n').value = $('bn').value.trim(); name = $('n').value.toUpperCase(); render();
  $('note').textContent = T[lang].demoNote;
  document.querySelector('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
$('apay').onclick = () => book(true);
$('again').onclick = () => { bk.svc = -1; bk.time = ''; bk.x = BIZ.extras.map(() => false); $('ok').style.display = 'none'; $('sumBody').style.display = ''; renderBooking(); };
const mcta = $('mcta');
const seen = new Set();
const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))); mcta.classList.toggle('off', seen.size > 0); });
io.observe(document.getElementById('book')); io.observe(document.getElementById('f'));
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
const dir = path.join(ROOT, 'out', 'sites', B.publishPath);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Wrote', path.join(dir, 'index.html'));
}

// Chart colours (validated for colour-blind separation on the dark panel). Orange brands lead with
// orange; every other brand uses the default order.
function chartColors(accent) {
  const [r, g, b] = hexRgb(accent).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0;
  if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return h >= 8 && h <= 40 ? ['#F55200', '#3987e5', '#199e70', '#c98500'] : ['#3987e5', '#d95926', '#199e70', '#c98500'];
}

function buildAdmin(B) {
  const P = publicBiz(B), c = chartColors(B.colors.accent);
  const vars = `--acc:${B.colors.accent};--acc-rgb:${P.colors.accentRgb};--on-acc:${P.colors.onAccent};--label:${B.colors.label};` +
    `--bg:${B.colors.page};--panel:${B.colors.panel};--s1:${c[0]};--s2:${c[1]};--s3:${c[2]};--s4:${c[3]}`;
  const esc = (x) => String(x).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const html = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf8')
    .split('__LOGO__').join(B.dataUri('logo-web.png'))
    .split('__NAME__').join(esc(B.name.en))
    .split('__CSSVARS__').join(vars)
    .split('__BIZ__').join(JSON.stringify(P).replace(/</g, '\\u003c'));
  const dir = path.join(ROOT, 'out', 'sites', B.publishPath, 'admin');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log('Wrote', path.join(dir, 'index.html'));
}

const all = loadBusinesses();
const wanted = process.argv.slice(2);
for (const slug of wanted) if (!all.bySlug.has(slug)) throw new Error('No business ' + slug);
for (const B of all.list.filter((b) => !wanted.length || wanted.includes(b.slug))) { build(B); buildAdmin(B); }
