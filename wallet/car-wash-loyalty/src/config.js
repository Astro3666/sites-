// Loads config.json and the signing certificates.
const fs = require('node:fs');
const path = require('node:path');
const forge = require('node-forge');

const ROOT = path.join(__dirname, '..');

function loadConfig() {
  const file = process.env.CONFIG || path.join(ROOT, 'config.json');
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Environment overrides for secrets, so they never need to live in the file.
  if (process.env.PUBLIC_URL) cfg.server.publicUrl = process.env.PUBLIC_URL;
  if (process.env.STAFF_PIN) cfg.server.staffPin = process.env.STAFF_PIN;
  if (process.env.PORT) cfg.server.port = Number(process.env.PORT);
  if (process.env.P12_PASSWORD) cfg.apple.p12Password = process.env.P12_PASSWORD;
  return cfg;
}

const resolve = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));

function readCert(file) {
  const raw = fs.readFileSync(resolve(file));
  const text = raw.toString('binary');
  if (text.includes('-----BEGIN')) return forge.pki.certificateFromPem(raw.toString('utf8'));
  return forge.pki.certificateFromAsn1(forge.asn1.fromDer(text)); // .cer (DER)
}

// Supports either a .p12 exported from Keychain, or a PEM cert + key pair.
function loadCredentials(cfg) {
  const a = cfg.apple;
  let cert, key;
  if (a.p12) {
    const p12 = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(fs.readFileSync(resolve(a.p12)).toString('binary')),
      a.p12Password || ''
    );
    const bag = (type) => Object.values(p12.getBags({ bagType: type }))[0] || [];
    cert = bag(forge.pki.oids.certBag)[0]?.cert;
    key = (bag(forge.pki.oids.pkcs8ShroudedKeyBag)[0] || bag(forge.pki.oids.keyBag)[0])?.key;
  } else {
    cert = readCert(a.certPem);
    key = forge.pki.privateKeyFromPem(fs.readFileSync(resolve(a.keyPem), 'utf8'));
  }
  if (!cert || !key) throw new Error('Could not read the pass certificate or its private key.');
  const wwdr = a.wwdr ? readCert(a.wwdr) : null;
  if (!wwdr) console.warn('Warning: no Apple WWDR certificate configured; iPhones will reject the pass.');

  // PEM copies for the APNs TLS connection.
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(key);
  return { cert, key, wwdr, certPem, keyPem };
}

module.exports = { loadConfig, loadCredentials, ROOT };
