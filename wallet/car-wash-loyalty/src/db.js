// SQLite storage (built into Node 22): members, device registrations, stamp log.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
process.removeAllListeners('warning'); // hide the "SQLite is experimental" notice
const { DatabaseSync } = require('node:sqlite');

function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS members (
      serial TEXT PRIMARY KEY,
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

  const q = {
    insert: db.prepare(`INSERT INTO members (serial, member_id, auth_token, name, phone, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`),
    bySerial: db.prepare('SELECT * FROM members WHERE serial = ?'),
    byMemberId: db.prepare('SELECT * FROM members WHERE member_id = ?'),
    byPhone: db.prepare('SELECT * FROM members WHERE phone = ? ORDER BY created_at DESC LIMIT 1'),
    setStamps: db.prepare('UPDATE members SET stamps = ?, rewards_redeemed = ?, last_stamp_at = ?, updated_at = ? WHERE serial = ?'),
    list: db.prepare('SELECT * FROM members ORDER BY updated_at DESC LIMIT ?'),
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

  function newMemberId() {
    for (;;) {
      const id = 'RP-' + String(crypto.randomInt(0, 100000)).padStart(5, '0');
      if (!q.byMemberId.get(id)) return id;
    }
  }

  return {
    createMember(name, phone) {
      const serial = crypto.randomUUID();
      const memberId = newMemberId();
      q.insert.run(serial, memberId, crypto.randomBytes(24).toString('hex'), name, phone || null, new Date().toISOString(), now());
      return q.bySerial.get(serial);
    },
    get: (serial) => q.bySerial.get(serial),
    getByMemberId: (id) => q.byMemberId.get(String(id).trim().toUpperCase()),
    getByPhone: (phone) => q.byPhone.get(phone),
    list: (limit = 50) => q.list.all(limit),
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
