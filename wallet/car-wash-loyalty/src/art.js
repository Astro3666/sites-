// Pass artwork (icon, logo, stamp strip) rendered to PNG.
// The logo and icon come from each business folder (businesses/<slug>/); the stamp strip is drawn here
// in the business's accent colour.
const { Resvg } = require('@resvg/resvg-js');

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

// Square Wallet icon from the business's mark.png.
function iconSvg(size, biz) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <image href="${biz.dataUri('mark.png')}" width="512" height="512"/></svg>`;
}

// Wallet's logo slot is at most 160x50 pt; fit the business logo inside it.
function logoBox(biz) {
  const { w, h } = biz.logoSize;
  const k = Math.min(160 / w, 50 / h);
  return { w: Math.round(w * k), h: Math.round(h * k) };
}
function logoSvg(scale, biz) {
  const box = logoBox(biz), { w, h } = biz.logoSize;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.w * scale}" height="${box.h * scale}" viewBox="0 0 ${w} ${h}">
    <image href="${biz.dataUri('logo.png')}" width="${w}" height="${h}"/></svg>`;
}

// Stamp grid: two rows, as many columns as needed (4 to 12 stamps).
function stampLayout(total) {
  const W = 375, H = 123, rows = total <= 5 ? 1 : 2, cols = Math.ceil(total / rows);
  const gapX = Math.min(70, 300 / Math.max(1, cols - 1)), gapY = 52;
  const r = Math.min(22, gapX / 2 - 4);
  const x0 = (W - gapX * (cols - 1)) / 2, y0 = (H - gapY * (rows - 1)) / 2;
  return { cols, rows, gapX, gapY, r, x0, y0 };
}

// Strip: 375x123 pt. Two rows of five stamp circles on a subtle panel.
function stripSvg(scale, bg, stamps, total = 10, rtl = false, accent = ORANGE) {
  const W = 375, H = 123;
  const { cols, r, gapX, gapY, x0, y0 } = stampLayout(total);
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

// Static images shared by every pass of one business.
function baseImages(biz) {
  return cached('base:' + biz.slug, () => ({
    'icon.png': png(iconSvg(29, biz)),
    'icon@2x.png': png(iconSvg(58, biz)),
    'icon@3x.png': png(iconSvg(87, biz)),
    'logo.png': png(logoSvg(1, biz)),
    'logo@2x.png': png(logoSvg(2, biz)),
    'logo@3x.png': png(logoSvg(3, biz)),
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

module.exports = { baseImages, stripImages, iconSvg, logoSvg, logoBox, stripSvg, stampLayout, ORANGE };
