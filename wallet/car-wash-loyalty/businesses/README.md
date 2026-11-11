# Car washes

Each folder here is one car wash. The server, the website builder and the dashboard
builder all read from these folders, so adding a car wash means adding a folder.
Folders that start with `_` are ignored (handy for drafts).

```
businesses/<slug>/
  business.json   name, colours, prices, hours, loyalty rule
  logo.png        wide logo, transparent background (Wallet card)
  logo-web.png    same logo, 600 px wide (website, dashboard)
  mark.png        512x512 square icon (Wallet icon, notifications)
```

## Add a car wash

What to get from the owner:

- Logo (a file is best; a clear photo or screenshot works)
- Name in English and Arabic
- Car types and prices, plus any extras and their prices
- Opening hours and closed days
- Location (Google Maps link), phone and WhatsApp
- Loyalty rule: free wash after how many (4 to 12)

Steps:

1. Make the folder and logo files:
   ```bash
   python3 scripts/prepare-logo.py ~/Downloads/logo.jpg wave-car-wash
   ```
   It removes a plain background, trims, and writes the three PNGs.
   - Dark logo on a dark card? Add `--whiten`.
   - Logo is a filled badge? Add `--keep-bg`.
   - Want only part of it (e.g. the letters) as the square icon? `--mark-crop X,Y,W,H`.
2. Copy `rp-car-wash/business.json` into the new folder and edit it (fields below).
3. Build the website and dashboard:
   ```bash
   node scripts/build-site.js wave-car-wash
   ```
   Output: `out/sites/<publishPath>/index.html` and `.../admin/index.html`.
4. Give the car wash a staff PIN: in `config.json` under `staffPins`, or as the
   environment variable `STAFF_PIN_WAVE_CAR_WASH` (slug in capitals, dashes as underscores).
5. Check the Wallet card: `node scripts/sample-pass.js 4 Test wave-car-wash`.
6. Restart the server. The car wash is live at `/<slug>/` (sign-up) and `/<slug>/staff`,
   and on its own domain if it is listed in `domains`.

## business.json

| Field | Example | Notes |
|---|---|---|
| `slug` | `"wave-car-wash"` | Lowercase, digits, dashes. Used in links. Not `wallet`, `health`, `api`, `pass`, `staff`. |
| `publishPath` | `"car-wash-loyalty"` | Optional. Folder name for the built website; defaults to the slug. |
| `domains` | `["wavecarwash.com.om"]` | Optional. The server picks this car wash when a request comes on one of these hosts (`www.` included). |
| `name` | `{ "en": "...", "ar": "..." }` | |
| `city` | `{ "en": "Muscat", "ar": "مسقط" }` | |
| `idPrefix` | `"WV"` | 1 to 4 capitals, unique per car wash. Starts every member ID and booking ref. |
| `phone`, `whatsapp` | `"+96891234567"` | |
| `address` | `{ "en": "...", "ar": "..." }` | Shown on the back of the Wallet card. |
| `mapsUrl` | Google Maps link | |
| `location` | `{ "latitude": 23.6, "longitude": 58.4 }` | Optional. Lets the card appear on the lock screen near the shop. |
| `colors` | `accent`, `label`, `card`, `page`, `panel` | `#RRGGBB`. `accent` is the brand colour; `label` a lighter tint of it; `card` the Wallet card background; `page` and `panel` the website background. Optional `onAccent` for text on accent buttons (worked out automatically otherwise). |
| `currency` | `{ "en": "OMR", "ar": "ر.ع" }` | |
| `services` | `[{ "id", "icon", "price", "en": [name, description], "ar": [...] }]` | 1 to 4 car types. `icon` is `sedan`, `suv` or `van`. |
| `extras` | same shape, no `icon` | 0 or more add-ons. |
| `hours` | `{ "slots": ["08:00", ...], "closedDays": [5] }` | Booking times. Days are 0 = Sunday ... 5 = Friday, 6 = Saturday. |
| `program` | `{ "stampsForReward": 10, "termsEn", "termsAr" }` | 4 to 12. With 10, the card reads "Wash 9 times, your 10th is free". |
