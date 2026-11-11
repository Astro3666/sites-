// Car washes served by this setup. Each one is a folder in businesses/<slug>/ with:
//   business.json  name, colours, prices, hours, loyalty rule (see businesses/README.md)
//   logo.png       wide logo on a transparent background (used on the Wallet card)
//   logo-web.png   the same logo about 600 px wide (used on the website)
//   mark.png       square icon, 512x512 (Wallet icon, notifications)
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIR = process.env.BUSINESSES_DIR || path.join(ROOT, 'businesses');

// Width and height straight from the PNG header.
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(12) !== 0x49484452) throw new Error(`${file} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const DEFAULTS = {
  city: { en: 'Muscat', ar: 'مسقط' },
  currency: { en: 'OMR', ar: 'ر.ع' },
  phone: '', whatsapp: '', mapsUrl: '', location: null,
  address: { en: '', ar: '' },
  domains: [],
  hours: { slots: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'], closedDays: [] },
  extras: [],
};
const COLORS = { accent: '#FF5500', label: '#FF7A33', card: '#111113', page: '#0A0A0B', panel: '#141416', foreground: '#FFFFFF' };

function check(b, file) {
  const need = (cond, msg) => { if (!cond) throw new Error(`${file}: ${msg}`); };
  need(/^[a-z0-9][a-z0-9-]{1,40}$/.test(b.slug || ''), 'slug must be lowercase letters, digits and dashes');
  need(!['wallet', 'health', 'api', 'pass', 'staff'].includes(b.slug), 'slug is a reserved word');
  need(b.name && b.name.en, 'name.en is required');
  need(/^[A-Z]{1,4}$/.test(b.idPrefix || ''), 'idPrefix must be 1 to 4 capital letters, e.g. "RP"');
  need(Array.isArray(b.services) && b.services.length >= 1 && b.services.length <= 4, 'services needs 1 to 4 car types');
  for (const s of [...b.services, ...b.extras]) need(typeof s.price === 'number' && s.en && s.en[0], 'each service and extra needs en name and a numeric price');
  const n = b.program && b.program.stampsForReward;
  need(Number.isInteger(n) && n >= 4 && n <= 12, 'program.stampsForReward must be 4 to 12');
  for (const c of Object.values(b.colors)) need(/^#[0-9A-Fa-f]{6}$/.test(c), 'colours must be #RRGGBB');
}

function loadOne(dir) {
  const file = path.join(dir, 'business.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const b = { ...DEFAULTS, ...raw };
  b.name = { ar: raw.name.en, ...raw.name };
  b.colors = { ...COLORS, ...(raw.colors || {}) };
  b.hours = { ...DEFAULTS.hours, ...(raw.hours || {}) };
  b.publishPath = raw.publishPath || b.slug;
  b.dir = dir;
  b.file = (name) => path.join(dir, name);
  for (const f of ['logo.png', 'logo-web.png', 'mark.png']) {
    if (!fs.existsSync(b.file(f))) throw new Error(`${dir}: missing ${f} (run scripts/prepare-logo.py)`);
  }
  b.logoSize = pngSize(b.file('logo.png'));
  b.dataUri = (name) => 'data:image/png;base64,' + fs.readFileSync(b.file(name)).toString('base64');
  check(b, file);
  return b;
}

function loadBusinesses(dir = DIR) {
  const list = fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(dir, d.name, 'business.json')))
    .map((d) => loadOne(path.join(dir, d.name)));
  const bySlug = new Map(list.map((b) => [b.slug, b]));
  if (bySlug.size !== list.length) throw new Error('Two businesses share a slug');
  const prefixes = new Set(list.map((b) => b.idPrefix));
  if (prefixes.size !== list.length) throw new Error('Two businesses share an idPrefix; member IDs must not clash');
  return { list, bySlug };
}

function loadBusiness(slug, dir = DIR) {
  const b = loadBusinesses(dir).bySlug.get(slug);
  if (!b) throw new Error(`No business "${slug}" in ${dir}`);
  return b;
}

// Text for the loyalty rule, e.g. "Wash 9 times, your 10th is free".
const AR_ORD = { 4: 'الرابعة', 5: 'الخامسة', 6: 'السادسة', 7: 'السابعة', 8: 'الثامنة', 9: 'التاسعة', 10: 'العاشرة', 11: 'الحادية عشرة', 12: 'الثانية عشرة' };
const toArabicDigits = (s) => String(s).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
function ordinalEn(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function ruleText(total) {
  const paid = total - 1;
  return {
    en: `Wash ${paid} times, your ${ordinalEn(total)} is free`,
    ar: `اغسل ${toArabicDigits(paid)} مرات، والغسلة ${AR_ORD[total] || toArabicDigits(total)} مجاناً`,
    ordinalEn: ordinalEn(total), ordinalAr: AR_ORD[total] || toArabicDigits(total),
  };
}

module.exports = { loadBusinesses, loadBusiness, ruleText, ordinalEn, toArabicDigits, DIR };
