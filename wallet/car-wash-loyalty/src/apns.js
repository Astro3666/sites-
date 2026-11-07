// Tells iPhones that a pass changed. Wallet then fetches the new pass from us.
// Pass pushes use the Pass Type ID certificate as the TLS client cert, topic = passTypeIdentifier.
const http2 = require('node:http2');

function createPusher(cfg, creds, db) {
  const host = cfg.apple.apnsHost || 'https://api.push.apple.com';
  let session = null;

  function connect() {
    if (session && !session.closed && !session.destroyed) return session;
    session = http2.connect(host, { cert: creds.certPem, key: creds.keyPem });
    session.on('error', (e) => console.error('APNs connection error:', e.message));
    session.on('goaway', () => session.close());
    session.setTimeout(10 * 60 * 1000, () => session.close());
    return session;
  }

  function pushOne(token) {
    return new Promise((resolve) => {
      let s;
      try { s = connect(); } catch (e) { return resolve({ token, status: 0, error: e.message }); }
      const req = s.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        'apns-topic': cfg.apple.passTypeIdentifier,
        'apns-push-type': 'background',
        'apns-priority': '5',
        'content-type': 'application/json',
      });
      let status = 0, body = '';
      req.setEncoding('utf8');
      req.on('response', (h) => { status = h[':status']; });
      req.on('data', (d) => { body += d; });
      req.on('end', () => resolve({ token, status, body }));
      req.on('error', (e) => resolve({ token, status: 0, error: e.message }));
      req.setTimeout(15000, () => { req.close(); resolve({ token, status: 0, error: 'timeout' }); });
      req.end('{}');
    });
  }

  async function notify(serial) {
    const tokens = db.tokensFor(serial);
    const results = await Promise.all(tokens.map(pushOne));
    for (const r of results) {
      // 410 = device no longer has the pass; 400 BadDeviceToken = stale token.
      if (r.status === 410 || (r.status === 400 && /BadDeviceToken/.test(r.body))) db.dropToken(r.token);
      if (r.status !== 200) console.warn(`APNs push for ${serial} -> ${r.status} ${r.body || r.error || ''}`);
    }
    return results;
  }

  return { notify };
}

module.exports = { createPusher };
