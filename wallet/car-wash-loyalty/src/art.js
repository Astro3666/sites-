// Pass artwork (icon, logo, stamp strip) rendered to PNG.
// Brand: RP Car Wash — black card, orange (#FF5500) stamps, white text.
// The logo and icon come from the brand files in assets/; the stamp strip is drawn here.
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const ASSETS = path.join(__dirname, '..', 'assets');
const WHITE = '#FFFFFF';
const ORANGE = '#FF5500';

// Car glyph centred on (0,0), about 24 units wide.
function car(color, opacity = 1) {
  return `<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-7.5 -4.5 L-5.5 -10 Q-5 -11.2 -3.6 -11.2 L3.6 -11.2 Q5 -11.2 5.5 -10 L7.5 -4.5"/>
    <rect x="-11" y="-4.5" width="22" height="8.5" rx="3"/>
    <path d="M-7.5 4 V7.5 M7.5 4 V7.5"/>
  </g>`;
}

function sparkle(cx, cy, r, color) {
  const k = r * 0.28;
  return `<path fill="${color}" d="M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z"/>`;
}

const dataUri = (file) => 'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS, file)).toString('base64');

// Square app/Wallet icon: the orange "RP" letters on black.
function iconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <image href="${dataUri('rp-mark.png')}" width="512" height="512"/></svg>`;
}

// Wallet logo slot is at most 160x50 pt; the wide "RP CAR WASH" logo fits at 160x30.
function logoSvg(scale) {
  const w = 160 * scale, h = Math.round(160 * scale * 444 / 2340);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 2340 444">
    <image href="${dataUri('logo-wide.png')}" width="2340" height="444"/></svg>`;
}

// Strip: 375x123 pt. Two rows of five stamp circles on a subtle panel.
function stripSvg(scale, bg, stamps, total = 10, rtl = false, accent = ORANGE) {
  const W = 375, H = 123;
  const cols = 5, rows = Math.ceil(total / cols);
  const r = 22, gapX = 70, gapY = 52;
  const x0 = (W - gapX * (cols - 1)) / 2, y0 = (H - gapY * (rows - 1)) / 2;
  let circles = '';
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    let col = i % cols;
    if (rtl) col = cols - 1 - col;
    const cx = x0 + col * gapX, cy = y0 + row * gapY;
    if (i < stamps) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}"/>
        <g transform="translate(${cx} ${cy + 1.5}) scale(0.95)">${car(WHITE)}</g>`;
    } else if (i === total - 1 && stamps >= total - 1) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2.4"/>
        ${sparkle(cx, cy, 11, accent)}`;
    } else {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="${WHITE}" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="5 4.2"/>
        <g transform="translate(${cx} ${cy + 1.5}) scale(0.8)">${car(WHITE, 0.4)}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect x="16" y="6" width="${W - 32}" height="${H - 12}" rx="16" fill="${WHITE}" fill-opacity="0.06" stroke="${accent}" stroke-opacity="0.35"/>
    ${circles}
  </svg>`;
}

function png(svg) {
  return Buffer.from(new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng());
}

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

// Static images shared by every pass.
function baseImages() {
  return cached('base', () => ({
    'icon.png': png(iconSvg(29)),
    'icon@2x.png': png(iconSvg(58)),
    'icon@3x.png': png(iconSvg(87)),
    'logo.png': png(logoSvg(1)),
    'logo@2x.png': png(logoSvg(2)),
    'logo@3x.png': png(logoSvg(3)),
  }));
}

// Strip images for a stamp count, in LTR (default) and RTL (Arabic) order.
function stripImages(bg, stamps, total, accent = ORANGE) {
  return cached(`strip:${bg}:${accent}:${stamps}:${total}`, () => {
    const out = {};
    for (const [suffix, scale] of [['', 1], ['@2x', 2], ['@3x', 3]]) {
      out[`strip${suffix}.png`] = png(stripSvg(scale, bg, stamps, total, false, accent));
      out[`ar.lproj/strip${suffix}.png`] = png(stripSvg(scale, bg, stamps, total, true, accent));
    }
    return out;
  });
}

module.exports = { baseImages, stripImages, iconSvg, stripSvg, dataUri, ORANGE };
