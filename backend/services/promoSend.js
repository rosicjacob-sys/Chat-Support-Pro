// backend/services/promoSend.js
// The actual "send one promo email to one recipient via Resend" logic,
// extracted out of the /send route so the campaign scheduler/worker can call
// the exact same code path instead of re-implementing from-address
// resolution and merge-field handling a second time.

const crypto = require('crypto');
const db = require('../database');
const { EMAIL_RE, cleanDomain, applyMerge } = require('./promoUtils');

const FALLBACK_FROM_EMAIL = 'support@pepscustomercare.com';
const FALLBACK_FROM_NAME  = 'Customer Support';

function unsubToken(email) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'promo-fallback-secret')
    .update(String(email).toLowerCase().trim())
    .digest('hex')
    .slice(0, 32);
}

function buildUnsubscribeUrl(email) {
  const base = (process.env.APP_URL || '').replace(/\/+$/, '');
  const e    = encodeURIComponent(String(email).toLowerCase().trim());
  return `${base}/api/promo/unsubscribe?e=${e}&t=${unsubToken(email)}`;
}

// Fetches the store's own from-address so emails come from the recognised
// store domain — same pattern as emailService.js which hits inbox reliably.
async function getStoreEmailConfig(storeDomain) {
  if (!storeDomain) return null;
  try {
    const { rows } = await db.pool.query(
      `SELECT email_from_address, email_from_name, brand_name
       FROM stores
       WHERE shop_domain = $1
       LIMIT 1`,
      [storeDomain]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('[Promo] getStoreEmailConfig error:', err.message);
    return null;
  }
}

// Sends one promo email to one recipient via Resend. Caller is responsible
// for cap/unsubscribe checks (they differ slightly between the /send route
// and the campaign worker) — this only resolves the from-address, merges
// fields, and makes the API call.
//
//   recipient: { email, name, storeName, storeDomain, storeUrl, movedBanner, movedBannerText }
//   templates: { subjectTemplate, htmlTemplate, textTemplate, fromEmail, fromName }
//   storeConfigCache: optional Map to reuse across recipients from the same store
async function sendPromoEmailToRecipient(recipient, templates, storeConfigCache = new Map()) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'Email service not configured (missing RESEND_API_KEY)' };

  const email = String(recipient.email || '').trim();
  if (!EMAIL_RE.test(email)) return { ok: false, error: `Invalid email: ${email || '(blank)'}` };

  const domain = cleanDomain(recipient.storeDomain || recipient.storeUrl || '');

  // ── Resolve FROM address: prefer store's own domain ──────────────────────
  let resolvedFrom = `${templates.fromName || FALLBACK_FROM_NAME} <${templates.fromEmail || FALLBACK_FROM_EMAIL}>`;
  if (domain) {
    if (!storeConfigCache.has(domain)) {
      storeConfigCache.set(domain, await getStoreEmailConfig(domain));
    }
    const storeConfig = storeConfigCache.get(domain);
    if (storeConfig) {
      const storeFromAddress = storeConfig.email_from_address || FALLBACK_FROM_EMAIL;
      const storeFromName    = storeConfig.email_from_name    || storeConfig.brand_name || recipient.storeName || FALLBACK_FROM_NAME;
      resolvedFrom = `${storeFromName} <${storeFromAddress}>`;
    }
  }

  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const fields = {
    customer_email:    email,
    customer_name:     recipient.name || email,
    store_name:        recipient.storeName || domain || 'our store',
    store_url:         recipient.storeUrl || (domain ? `https://${domain}` : ''),
    store_domain:      domain,
    moved_banner:      recipient.movedBanner || '',
    moved_banner_text: recipient.movedBannerText || '',
    unsubscribe_url:   unsubscribeUrl,
  };

  const msg = {
    from:    resolvedFrom,
    to:      [email],
    subject: applyMerge(templates.subjectTemplate, fields),
    html:    applyMerge(templates.htmlTemplate,    fields),
    // ── Deliverability headers ────────────────────────────────────────────
    headers: {
      'List-Unsubscribe':      `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Entity-Ref-ID':       `promo-${Date.now()}-${Buffer.from(email).toString('base64').slice(0, 12)}`,
    },
  };
  if (templates.textTemplate) msg.text = applyMerge(templates.textTemplate, fields);

  // /emails/batch is flagged more aggressively by spam filters — individual
  // sends via /emails match the pattern that reliably hits inbox.
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(msg),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body?.message || `Resend error ${resp.status} for ${email}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `${err.message || 'Request failed'} (${email})` };
  }
}

module.exports = {
  FALLBACK_FROM_EMAIL,
  FALLBACK_FROM_NAME,
  unsubToken,
  buildUnsubscribeUrl,
  getStoreEmailConfig,
  sendPromoEmailToRecipient,
};
