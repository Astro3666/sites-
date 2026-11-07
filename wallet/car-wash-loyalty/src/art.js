// Pass artwork (icon, logo, stamp strip) drawn as SVG and rendered to PNG.
// No text is baked into images, so Wallet renders all words itself (and in Arabic).
const { Resvg } = require('@resvg/resvg-js');

const WHITE = '#FFFFFF';

// Car glyph centred on (0,0), about 24 units wide.
function car(color, opacity = 1) {
  return `<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-7.5 -4.5 L-5.5 -10 Q-5 -11.2 -3.6 -11.2 L3.6 -11.2 Q5 -11.2 5.5 -10 L7.5 -4.5"/>
    <rect x="-11" y="-4.5" width="22" height="8.5" rx="3"/>
    <path d="M-7.5 4 V7.5 M7.5 4 V7.5"/>
  </g>`;
}

// Solid car (used inside the droplet logo).
function carSolid(color) {
  return `<g fill="${color}">
    <path d="M-8 -3 L-6 -9 Q-5.4 -10.6 -3.6 -10.6 L3.6 -10.6 Q5.4 -10.6 6 -9 L8 -3 Z"/>
    <rect x="-11" y="-4" width="22" height="9" rx="3"/>
    <rect x="-9.5" y="4" width="4" height="4.5" rx="1.2"/>
    <rect x="5.5" y="4" width="4" height="4.5" rx="1.2"/>
  </g>
  <g fill="${WHITE === color ? '#1D3FD1' : WHITE}">
    <path d="M-4.6 -4.2 L-3.6 -7.8 L3.6 -7.8 L4.6 -4.2 Z" opacity="0.95"/>
    <circle cx="-6.5" cy="0.4" r="1.6"/><circle cx="6.5" cy="0.4" r="1.6"/>
  </g>`;
}

function sparkle(cx, cy, r, color) {
  const k = r * 0.28;
  return `<path fill="${color}" d="M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z"/>`;
}

// Droplet with car + two sparkles, in a 64x64 box.
function dropletMark(fg, carColor) {
  return `<path fill="${fg}" d="M28 6 C28 6 10 26 10 40 A18 18 0 0 0 46 40 C46 26 28 6 28 6 Z"/>
    <g transform="translate(28 41) scale(0.78)">${carSolid(carColor)}</g>
    ${sparkle(51, 12, 6, fg)}${sparkle(57, 24, 3.2, fg)}`;
}

function iconSvg(size, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="${bg}"/>
    <g transform="translate(4 2)">${dropletMark(WHITE, bg)}</g>
  </svg>`;
}

// Logo sits top-left of the pass next to logoText; max 160x50 pt. We use a square mark.
function logoSvg(scale, bg) {
  const s = 50 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 64 64">
    <g transform="translate(2 0)">${dropletMark(WHITE, bg)}</g>
  </svg>`;
}

// Strip: 375x123 pt. Two rows of five stamp circles on a lighter rounded panel.
function stripSvg(scale, bg, stamps, total = 10, rtl = false) {
  const W = 375, H = 123;
  const cols = 5, rows = Math.ceil(total / cols);
  const r = 22, gapX = 70, gapY = 52;
  const gridW = gapX * (cols - 1), gridH = gapY * (rows - 1);
  const x0 = (W - gridW) / 2, y0 = (H - gridH) / 2;
  let circles = '';
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    let col = i % cols;
    if (rtl) col = cols - 1 - col;
    const cx = x0 + col * gapX, cy = y0 + row * gapY;
    const filled = i < stamps;
    const isReward = i === total - 1;
    if (filled) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}"/>
        <g transform="translate(${cx} ${cy + 1.5}) scale(0.95)">${car(bg)}</g>`;
    } else if (isReward && stamps >= total - 1) {
      // Free wash is ready: glowing ring with a sparkle.
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}" fill-opacity="0.18" stroke="${WHITE}" stroke-width="2.4"/>
        ${sparkle(cx, cy, 11, WHITE)}`;
    } else {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="${WHITE}" stroke-opacity="0.6" stroke-width="2" stroke-dasharray="5 4.2"/>
        <g transform="translate(${cx} ${cy + 1.5}) scale(0.8)">${car(WHITE, 0.6)}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect x="16" y="6" width="${W - 32}" height="${H - 12}" rx="16" fill="${WHITE}" fill-opacity="0.12"/>
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
function baseImages(bg) {
  return cached(`base:${bg}`, () => ({
    'icon.png': png(iconSvg(29, bg)),
    'icon@2x.png': png(iconSvg(58, bg)),
    'icon@3x.png': png(iconSvg(87, bg)),
    'logo.png': png(logoSvg(1, bg)),
    'logo@2x.png': png(logoSvg(2, bg)),
    'logo@3x.png': png(logoSvg(3, bg)),
  }));
}

// Strip images for a stamp count, in LTR (default) and RTL (Arabic) order.
function stripImages(bg, stamps, total) {
  return cached(`strip:${bg}:${stamps}:${total}`, () => {
    const out = {};
    for (const [suffix, scale] of [['', 1], ['@2x', 2], ['@3x', 3]]) {
      out[`strip${suffix}.png`] = png(stripSvg(scale, bg, stamps, total, false));
      out[`ar.lproj/strip${suffix}.png`] = png(stripSvg(scale, bg, stamps, total, true));
    }
    return out;
  });
}

module.exports = { baseImages, stripImages, iconSvg, stripSvg };
