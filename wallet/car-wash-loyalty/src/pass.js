// Builds a signed .pkpass for one member.
const crypto = require('node:crypto');
const forge = require('node-forge');
const { zip } = require('./zip');
const art = require('./art');
const { ruleText, toArabicDigits } = require('./business');

const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}


// .strings files: "key" = "value"; (UTF-8 is accepted by Wallet)
function stringsFile(map) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return Buffer.from(Object.entries(map).map(([k, v]) => `"${esc(k)}" = "${esc(v)}";`).join('\n') + '\n', 'utf8');
}

function progressText(biz, stamps) {
  const total = biz.program.stampsForReward; // e.g. 10 (the 10th is free)
  const paid = total - 1;
  const left = Math.max(0, paid - stamps);
  const rule = ruleText(total);
  return {
    en: {
      rule: rule.en,
      progress: left === 0 ? 'Your free wash is ready!' : left === 1 ? '1 more wash until your free one' : `${left} more washes until your free one`,
    },
    ar: {
      rule: rule.ar,
      progress: left === 0 ? 'غسلتك المجانية جاهزة!' : left === 1 ? 'باقي غسلة واحدة على الغسلة المجانية' : `باقي ${left} غسلات على الغسلة المجانية`,
    },
  };
}

function passJson(cfg, member, biz) {
  const b = biz;
  const total = b.program.stampsForReward;
  const stamps = Math.min(member.stamps, total - 1);
  const pj = {
    formatVersion: 1,
    passTypeIdentifier: cfg.apple.passTypeIdentifier,
    teamIdentifier: cfg.apple.teamIdentifier,
    serialNumber: member.serial,
    authenticationToken: member.auth_token,
    webServiceURL: `${cfg.server.publicUrl.replace(/\/$/, '')}/wallet`,
    organizationName: b.name.en,
    description: 'loyalty_description',
    backgroundColor: hexToRgb(b.colors.card),
    foregroundColor: hexToRgb(b.colors.foreground),
    labelColor: hexToRgb(b.colors.label),
    sharingProhibited: true,
    storeCard: {
      headerFields: [
        { key: 'stamps', label: 'stamps_label', value: `${stamps}/${total}`, changeMessage: 'stamps_change' },
      ],
      secondaryFields: [
        { key: 'progress', label: 'rule', value: 'progress' },
      ],
      auxiliaryFields: [
        { key: 'customer', label: 'customer_label', value: member.name },
        { key: 'member', label: 'member_label', value: member.member_id, textAlignment: 'PKTextAlignmentRight' },
      ],
      backFields: [
        { key: 'how', label: 'how_label', value: 'how_value' },
        { key: 'free', label: 'free_label', value: String(member.rewards_redeemed) },
        ...(member.last_stamp_at
          ? [{ key: 'last', label: 'last_label', value: new Date(member.last_stamp_at).toISOString(), dateStyle: 'PKDateStyleMedium', timeStyle: 'PKDateStyleShort' }]
          : []),
        ...(b.phone ? [{ key: 'phone', label: 'phone_label', value: b.phone }] : []),
        ...(b.whatsapp ? [{ key: 'wa', label: 'WhatsApp', value: `https://wa.me/${b.whatsapp.replace(/\D/g, '')}` }] : []),
        ...(b.address.en ? [{ key: 'address', label: 'address_label', value: 'address_value' }] : []),
        ...(b.mapsUrl ? [{ key: 'map', label: 'map_label', value: b.mapsUrl }] : []),
        { key: 'terms', label: 'terms_label', value: 'terms_value' },
        { key: 'rights', label: 'rights_label', value: 'rights_value' },
      ],
    },
    barcodes: [
      { format: 'PKBarcodeFormatQR', message: member.member_id, messageEncoding: 'iso-8859-1', altText: 'barcode_alt' },
    ],
  };
  if (b.location && typeof b.location.latitude === 'number') {
    pj.locations = [{ latitude: b.location.latitude, longitude: b.location.longitude, relevantText: 'nearby' }];
  }
  return { pj, stamps, total };
}

function localisations(cfg, member, stamps, biz) {
  const b = biz;
  const t = progressText(b, stamps);
  const paid = b.program.stampsForReward - 1;
  return {
    'en.lproj/pass.strings': stringsFile({
      loyalty_description: `${b.name.en} loyalty card`,
      business_name: b.name.en,
      stamps_label: 'STAMPS',
      stamps_change: 'You now have %@ stamps',
      rule: t.en.rule,
      progress: t.en.progress,
      customer_label: 'CUSTOMER',
      member_label: 'MEMBER ID',
      barcode_alt: 'Show this code at the counter',
      how_label: 'How it works',
      how_value: `Show this card each time you wash. You get one stamp per wash. After ${paid} stamps your next wash is free. The card updates by itself.`,
      free_label: 'Free washes used',
      last_label: 'Last stamp',
      phone_label: 'Phone',
      address_label: 'Address',
      address_value: b.address.en || '',
      map_label: 'Location',
      terms_label: 'Terms',
      terms_value: b.program.termsEn || '',
      nearby: `You're near ${b.name.en}. Show your card for a stamp.`,
      rights_label: 'Card design',
      rights_value: `© ${new Date().getFullYear()} ${cfg.credit.en}. All rights reserved.`,
    }),
    'ar.lproj/pass.strings': stringsFile({
      loyalty_description: `بطاقة ولاء ${b.name.ar}`,
      business_name: b.name.ar,
      stamps_label: 'الأختام',
      stamps_change: 'لديك الآن %@ أختام',
      rule: t.ar.rule,
      progress: t.ar.progress,
      customer_label: 'العميل',
      member_label: 'رقم العضوية',
      barcode_alt: 'اعرض هذا الرمز عند الكاونتر',
      how_label: 'طريقة الاستخدام',
      how_value: `اعرض البطاقة في كل غسلة واحصل على ختم. بعد ${toArabicDigits(paid)} أختام تكون غسلتك التالية مجاناً. البطاقة تتحدث تلقائياً.`,
      free_label: 'الغسلات المجانية المستخدمة',
      last_label: 'آخر ختم',
      phone_label: 'الهاتف',
      address_label: 'العنوان',
      address_value: b.address.ar || b.address.en || '',
      map_label: 'الموقع',
      terms_label: 'الشروط',
      terms_value: b.program.termsAr || b.program.termsEn || '',
      nearby: `أنت قريب من ${b.name.ar}. اعرض بطاقتك للحصول على ختم.`,
      rights_label: 'تصميم البطاقة',
      rights_value: `© ${new Date().getFullYear()} ${cfg.credit.ar}. جميع الحقوق محفوظة.`,
    }),
  };
}

// PKCS#7 detached signature of manifest.json, signed by the Pass Type ID cert,
// with Apple's WWDR intermediate included.
function sign(manifest, creds) {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString('binary'));
  p7.addCertificate(creds.cert);
  if (creds.wwdr) p7.addCertificate(creds.wwdr);
  p7.addSigner({
    key: creds.key,
    certificate: creds.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}

function buildPass(cfg, creds, member, biz) {
  const { pj, stamps, total } = passJson(cfg, member, biz);
  const files = {
    'pass.json': Buffer.from(JSON.stringify(pj, null, 2)),
    ...art.baseImages(biz),
    ...art.stripImages(biz.colors.card, stamps, total, biz.colors.accent),
    ...localisations(cfg, member, stamps, biz),
  };
  const manifest = Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, sha1(v)]))));
  files['manifest.json'] = manifest;
  files['signature'] = sign(manifest, creds);
  return zip(files);
}

module.exports = { buildPass, passJson, localisations };
