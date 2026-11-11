// Builds a sample pass to out/sample.pkpass without running the server.
// Usage: node scripts/sample-pass.js [stamps] [name]
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, loadCredentials, ROOT } = require('../src/config');
const { buildPass } = require('../src/pass');

const cfg = loadConfig();
const creds = loadCredentials(cfg);
const member = {
  serial: 'sample-0001', member_id: 'RP-04821', auth_token: 'x'.repeat(32), name: process.argv[3] || 'SALIM',
  stamps: Number(process.argv[2] ?? 4), rewards_redeemed: 0, last_stamp_at: new Date().toISOString(), updated_at: Date.now(),
};
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const file = path.join(ROOT, 'out', 'sample.pkpass');
fs.writeFileSync(file, buildPass(cfg, creds, member));
console.log('Wrote', file);
