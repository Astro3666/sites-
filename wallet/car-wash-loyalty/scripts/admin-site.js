// Builds the management dashboard preview (sample data) to out/admin/index.html.
// Usage: node scripts/admin-site.js
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'logo-wide-600.png')).toString('base64');
const html = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf8').split('__LOGO__').join(logo);
const dir = path.join(ROOT, 'out', 'admin');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Wrote ' + path.join(dir, 'index.html'));
