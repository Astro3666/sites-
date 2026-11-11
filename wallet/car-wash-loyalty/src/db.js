// SQLite storage (built into Node 22): members, device registrations, stamp log.
// One database serves every car wash; each member row belongs to one business (its slug).
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
process.removeAllListeners('warning'); // hide the "SQLite is experimental" notice
const { DatabaseSync } = require('node:sqlite');

function openDb(file, defaultBusiness = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS members (
      serial TEXT PRIMARY KEY,
      business TEXT NOT NULL DEFAULT '',
      member_id TEXT UNIQUE NOT NULL,
      auth_token TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      stamps INTEGER NOT NULL DEFAULT 0,
      rewards_redeemed INTEGER NOT NULL DEFAULT 0,
      last_stamp_at TEXT,
      created_at TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registrations (
      device_id TEXT NOT NULL,
      push_token TEXT NOT NULL,
      serial TEXT NOT NULL,
      PRIMARY KEY (device_id, serial)
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial TEXT NOT NULL,
      kind TEXT NOT NULL,
      at TEXT NOT NULL
    );
  `);

  // Databases made before multi-business support have no business column: add it and give the
  // existing cards to the first business.
  const cols = db.prepare('PRAGMA table_info(members)').all().map((c) => c.name);
  if (!cols.includes('business')) {
    db.exec("ALTER TABLE members ADD COLUMN business TEXT NOT NULL DEFAULT ''");
    db.prepare("UPDATE members SET business = ? WHERE business = ''").run(defaultBusiness);
  }
  db.exec('CREATE INDEX IF NOT EXISTS members_business ON members (business, updated_at)');

  const q = {
    insert: db.prepare(`INSERT INTO members (serial, business, member_id, auth_token, name, phone, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    bySerial: db.prepare('SELECT * FROM members WHERE serial = ?'),
    byMemberId: db.prepare('SELECT * FROM members WHERE member_id = ?'),
    byMemberIdIn: db.prepare('SELECT * FROM members WHERE business = ? AND member_id = ?'),
    byPhone: db.prepare('SELECT * FROM members WHERE business = ? AND phone = ? ORDER BY created_at DESC LIMIT 1'),
    setStamps: db.prepare('UPDATE members SET stamps = ?, rewards_redeemed = ?, last_stamp_at = ?, updated_at = ? WHERE serial = ?'),
    list: db.prepare('SELECT * FROM members WHERE business = ? ORDER BY updated_at DESC LIMIT ?'),
    register: db.prepare('INSERT OR REPLACE INTO registrations (device_id, push_token, serial) VALUES (?, ?, ?)'),
    isRegistered: db.prepare('SELECT 1 FROM registrations WHERE device_id = ? AND serial = ?'),
    unregister: db.prepare('DELETE FROM registrations WHERE device_id = ? AND serial = ?'),
    tokensFor: db.prepare('SELECT DISTINCT push_token FROM registrations WHERE serial = ?'),
    dropToken: db.prepare('DELETE FROM registrations WHERE push_token = ?'),
    updatedFor: db.prepare(`SELECT m.serial, m.updated_at FROM members m JOIN registrations r ON r.serial = m.serial
                            WHERE r.device_id = ? AND m.updated_at > ?`),
    log: db.prepare('INSERT INTO events (serial, kind, at) VALUES (?, ?, ?)'),
  };

  const now = () => Date.now();

  function newMemberId(prefix) {
    for (;;) {
      const id = prefix + '-' + String(crypto.randomInt(0, 100000)).padStart(5, '0');
      if (!q.byMemberId.get(id)) return id;
    }
  }

  return {
    createMember(business, prefix, name, phone) {
      const serial = crypto.randomUUID();
      const memberId = newMemberId(prefix);
      q.insert.run(serial, business, memberId, crypto.randomBytes(24).toString('hex'), name, phone || null, new Date().toISOString(), now());
      return q.bySerial.get(serial);
    },
    get: (serial) => q.bySerial.get(serial),
    // Look-ups by member ID or phone are always inside one business, so one car wash's staff
    // can never stamp another car wash's card.
    getByMemberId: (business, id) => q.byMemberIdIn.get(business, String(id).trim().toUpperCase()),
    getByPhone: (business, phone) => q.byPhone.get(business, phone),
    list: (business, limit = 50) => q.list.all(business, limit),
    // Adds a stamp; when the card is full the staff redeems instead.
    change(serial, kind, total) {
      const m = q.bySerial.get(serial);
      if (!m) return null;
      let { stamps, rewards_redeemed } = m;
      const max = total - 1;
      if (kind === 'stamp') {
        if (stamps >= max) return { member: m, error: 'Card is full. Redeem the free wash first.' };
        stamps += 1;
      } else if (kind === 'undo') {
        if (stamps <= 0) return { member: m, error: 'No stamps to remove.' };
        stamps -= 1;
      } else if (kind === 'redeem') {
        if (stamps < max) return { member: m, error: `Needs ${max} stamps before a free wash.` };
        stamps = 0;
        rewards_redeemed += 1;
      }
      // updated_at must strictly increase so Wallet sees the change.
      const ts = Math.max(now(), m.updated_at + 1);
      q.setStamps.run(stamps, rewards_redeemed, kind === 'stamp' ? new Date().toISOString() : m.last_stamp_at, ts, serial);
      q.log.run(serial, kind, new Date().toISOString());
      return { member: q.bySerial.get(serial) };
    },
    register(deviceId, pushToken, serial) {
      const existed = !!q.isRegistered.get(deviceId, serial);
      q.register.run(deviceId, pushToken, serial);
      return existed;
    },
    unregister: (deviceId, serial) => q.unregister.run(deviceId, serial),
    tokensFor: (serial) => q.tokensFor.all(serial).map((r) => r.push_token),
    dropToken: (token) => q.dropToken.run(token),
    updatedSince: (deviceId, since) => q.updatedFor.all(deviceId, since),
  };
}

module.exports = { openDb };
