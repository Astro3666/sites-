# Car wash loyalty cards (Apple Wallet), booking sites and management dashboards

A stamp card that lives in Apple Wallet and updates itself, plus a booking website and a
management dashboard, for any number of car washes from one server.
Each car wash has its own logo, colours, prices, hours and loyalty rule in
`businesses/<slug>/` (see [businesses/README.md](businesses/README.md) to add one).
The first one is RP Car Wash in Muscat: black card, orange `#FF5500`, 10 stamps,
"Wash 9 times, your 10th is free", English and Arabic.

![preview](docs/preview.png)

## How it works

Each car wash lives under its own path, `/<slug>/`, or on its own domain (`domains` in
its `business.json`). All car washes share one Apple Pass Type ID and one Wallet web service.

1. **Customer** opens the sign-up page (`/<slug>/`), types name + phone, taps *Add to Apple Wallet*.
   Put this link in a QR code poster at the counter, the Instagram bio, or WhatsApp.
2. **Staff** opens `/<slug>/staff` on any phone, logs in with that car wash's PIN, scans the card's QR
   (or types the member ID) and taps **+1 stamp**. At 9 stamps the button changes to
   **Give free wash**, which resets the card. Staff of one car wash cannot see or stamp
   another car wash's cards.
3. The server pushes a silent notification to Apple. The customer's iPhone downloads the
   new pass within seconds, the stamp appears, and the lock screen shows
   "You now have 5/10 stamps". No app needed.

The pass shows in Arabic on phones set to Arabic (labels, text, and right-to-left stamp order).

## What's in here

| Path | What it does |
|---|---|
| `businesses/<slug>/` | One folder per car wash: `business.json` and logo files ([how to add one](businesses/README.md)) |
| `src/business.js` | Loads and checks the car wash folders |
| `src/server.js` | HTTP server: sign-up and staff pages per car wash, and the shared Apple Wallet web service (`/wallet/v1/...`) |
| `src/pass.js` | Builds `pass.json`, EN/AR strings, manifest, PKCS#7 signature, `.pkpass` zip |
| `src/art.js` | Draws icon, logo and stamp strip (4 to 12 stamps, LTR + RTL) as PNG |
| `src/apns.js` | Push to Apple (HTTP/2, pass certificate as client cert) |
| `src/db.js` | SQLite (built into Node 22): members (per car wash), devices, stamp log |
| `public/join.html`, `public/staff.html` | Customer and staff pages (filled in per car wash) |
| `scripts/prepare-logo.py` | Turns a logo file or photo into the three logo images |
| `scripts/build-site.js` | Builds each car wash's website (book, pay, add loyalty card, 3D card) and dashboard to `out/sites/<publishPath>/` |
| `scripts/admin.html` | Dashboard template (revenue, washes, busiest hours, loyalty, today's queue) with sample data |
| `scripts/sample-pass.js` | Build one sample pass without the server: `node scripts/sample-pass.js [stamps] [name] [slug]` |
| `scripts/preview.js` | Render a mockup of the pass to `out/preview.html`: `node scripts/preview.js [stamps] [slug]` |

## Setup

Needs Node 22+.

```bash
npm install
cp config.example.json config.json   # fill in Apple IDs, URL, a staff PIN per car wash
```

### 1. Apple certificate (needs an Apple Developer account, $99/yr)

1. developer.apple.com → Certificates, IDs & Profiles → Identifiers → **+** → **Pass Type IDs**
   → e.g. `pass.om.mazen.loyalty`. One ID covers every car wash.
2. Open it → **Create Certificate** → upload a CSR (Keychain Access → Certificate Assistant →
   Request a Certificate from a CA → saved to disk) → download `pass.cer`.
3. Double-click `pass.cer`, then in Keychain export it with its key as `pass.p12`.
4. Download Apple's WWDR G4 intermediate: https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
5. Put both in `certs/` and set in `config.json`:
   `passTypeIdentifier`, `teamIdentifier` (10 chars, top-right of the developer site),
   `p12`, `p12Password`, `wwdr`.

No Mac? Make the CSR with OpenSSL instead and use PEM files:

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout certs/pass.key -out pass.csr -subj "/CN=RP Car Wash Pass"
# upload pass.csr, download pass.cer, then in config.json:
#   "certPem": "certs/pass.cer", "keyPem": "certs/pass.key"   (instead of p12)
```

### 2. Host it

Wallet only talks to **HTTPS** with a valid certificate. Any small Node host works
(Render, Railway, Fly.io, a VPS behind Caddy). Keep `data/` on a persistent disk.

```bash
PUBLIC_URL=https://loyalty.yourdomain.com STAFF_PIN_RP_CAR_WASH=xxxx NODE_ENV=production node src/server.js
```

Each car wash needs a staff PIN: `STAFF_PIN_<SLUG>` (slug in capitals, dashes as underscores)
or `staffPins` in `config.json`. A car wash without a PIN has staff login turned off.

`PUBLIC_URL` is baked into every pass, so pick the final domain before giving out cards.
Changing the Pass Type ID or URL later means customers must re-add the card.

### Try it locally without Apple

```bash
./scripts/make-test-certs.sh
# point apple.certPem / keyPem / wwdr at certs/test/*.pem in config.json
node scripts/sample-pass.js 4      # out/<slug>-sample.pkpass (iPhone will refuse the test signature)
node scripts/preview.js 4          # out/preview.html
node src/server.js
```

## Notes

- One card per phone number per car wash. Joining again with the same number re-downloads the same card.
- Staff login is locked for 10 minutes after 5 wrong PINs.
- Stamp count, member list and the event log are in `data/loyalty.db` (back it up).
  An older single-car-wash database is upgraded on start: its members are given to the first car wash.
