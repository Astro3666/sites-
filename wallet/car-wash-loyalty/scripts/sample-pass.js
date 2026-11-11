// Builds a sample pass to out/sample.pkpass without running the server.
// Usage: node scripts/sample-pass.js [stamps] [name] [business-slug]
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, loadCredentials, ROOT } = require('../src/config');
const { buildPass } = require('../src/pass');
const { loadBusinesses } = require('../src/business');

const cfg = loadConfig();
const creds = loadCredentials(cfg);
const all = loadBusinesses();
const biz = process.argv[4] ? all.bySlug.get(process.argv[4]) : all.list[0];
if (!biz) throw new Error('No business ' + process.argv[4]);
const member = {
  serial: 'sample-0001', business: biz.slug, member_id: biz.idPrefix + '-04821', auth_token: 'x'.repeat(32), name: process.argv[3] || 'SALIM',
  stamps: Number(process.argv[2] ?? 4), rewards_redeemed: 0, last_stamp_at: new Date().toISOString(), updated_at: Date.now(),
};
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const file = path.join(ROOT, 'out', biz.slug + '-sample.pkpass');
fs.writeFileSync(file, buildPass(cfg, creds, member, biz));
console.log('Wrote', file);
