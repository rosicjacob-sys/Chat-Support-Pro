// routes/promo-routes.js
// Mount in server.js:
//   const promoRoutes = require('./routes/promo-routes');
//   app.use('/api/promo', promoRoutes);
//
// Endpoints:
//   GET  /api/promo/recipients?storeIds=all   (admin) → purchasers to email
//   GET  /api/promo/recipients?storeIds=1,2,3 (admin)
//   POST /api/promo/send                      (admin) → fires blast via Resend
//   POST /api/promo/record-sent               (admin) → records sent emails to DB
//   GET  /api/promo/sent                      (admin) → list all sent emails
//   GET  /api/promo/settings                  (admin) → daily cap status
//   PUT  /api/promo/settings                  (admin) → change daily cap
//   POST /api/promo/uploads/parse             (admin) → parse CSV/XLSX audience
//   POST /api/promo/domain-updates/apply      (admin) → apply stores.shop_domain renames
//   POST /api/promo/campaigns                 (admin) → create a scheduled campaign
//   GET  /api/promo/campaigns                 (admin) → list campaigns
//   GET  /api/promo/campaigns/:id             (admin) → campaign detail + status breakdown
//   POST /api/promo/campaigns/:id/pause       (admin)
//   POST /api/promo/campaigns/:id/resume      (admin)
//   POST /api/promo/campaigns/:id/cancel      (admin)
//   GET  /api/promo/unsubscribe?e=..&t=..     (public) → one-click opt-out

const express = require('express');
const crypto  = require('crypto');
const multer  = require('multer');
const XLSX    = require('xlsx');
const router  = express.Router();
const db      = require('../database');
const { authenticateToken } = require('../auth');

const { EMAIL_RE, cleanDomain, applyMerge } = require('../services/promoUtils');
const promoDb = require('../services/promoDb');
const { unsubToken, sendPromoEmailToRecipient } = require('../services/promoSend');
const promoScheduler = require('../services/promoScheduler');

const RECIPIENTS_CAP = 50000;
const SEND_DELAY_MS  = 200; // delay between individual sends — avoids rate limits
const UPLOAD_ROW_CAP = 20000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const { ensurePromoTables, reserveSendSlot, getCapStatus, isUnsubscribed, recordSentEmails } = promoDb;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Upload parsing helpers ────────────────────────────────────────────────────

const HEADER_ALIASES = {
  name:       ['customer', 'customer name', 'name'],
  email:      ['email', 'customer email', 'e-mail'],
  sourceDomain: ['source store', 'original store', 'old domain', 'old store', 'source domain'],
  newDomain:  ['new source store', 'new domain', 'new store', 'moved to domain', 'new source store domain'],
};

function normalizeHeaderKey(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Builds a lookup from each raw column header in the sheet to our internal
// field name (name/email/sourceDomain/newDomain), tolerant of the exact
// wording the merchant's spreadsheet happens to use.
function mapHeaders(rawHeaders) {
  const map = {};
  for (const raw of rawHeaders) {
    const key = normalizeHeaderKey(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(key)) { map[raw] = field; break; }
    }
  }
  return map;
}

function parseRecipientSheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length === 0) return { parsed: [], invalid: [] };

  const headerMap = mapHeaders(Object.keys(rows[0]));
  const parsed  = [];
  const invalid = [];

  rows.forEach((row, idx) => {
    const fields = {};
    for (const [raw, field] of Object.entries(headerMap)) fields[field] = row[raw];

    const email = String(fields.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      invalid.push({ row: idx + 2, reason: `Invalid or missing email: "${fields.email || ''}"` });
      return;
    }

    const sourceDomain = cleanDomain(fields.sourceDomain || '');
    if (!sourceDomain) {
      invalid.push({ row: idx + 2, reason: 'Missing Source Store' });
      return;
    }

    parsed.push({
      row:         idx + 2,
      name:        String(fields.name || '').trim(),
      email,
      sourceDomain,
      newDomain:   cleanDomain(fields.newDomain || ''),
    });
  });

  return { parsed, invalid };
}

// 54-duplicate-email case: keep the row that documents an actual store move
// over one that doesn't; if more than one row for the same email documents a
// (different) move, we can't guess which is right — flag it instead.
function dedupeUploadRows(rows) {
  const byEmail = new Map();
  for (const r of rows) {
    if (!byEmail.has(r.email)) byEmail.set(r.email, []);
    byEmail.get(r.email).push(r);
  }

  const kept = [];
  const flagged = [];
  for (const [email, group] of byEmail) {
    if (group.length === 1) { kept.push(group[0]); continue; }
    const withMove = group.filter((r) => r.newDomain);
    if (withMove.length === 1) {
      kept.push(withMove[0]);
    } else if (withMove.length === 0) {
      kept.push(group[0]);
    } else {
      flagged.push({ email, rows: withMove.map((r) => ({ row: r.row, sourceDomain: r.sourceDomain, newDomain: r.newDomain })) });
    }
  }
  return { kept, flagged };
}

// ── GET /recipients ───────────────────────────────────────────────────────────
// Returns purchasers excluding:
//   - blacklisted conversations
//   - archived conversations
//   - global unsubscribes
//   - already emailed from this specific store

router.get('/recipients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const raw   = (req.query.storeIds || 'all').toString();
    const isAll = raw === 'all' || raw === '';
    const ids   = isAll ? [] : raw.split(',').map((s) => parseInt(s, 10)).filter(Number.isFinite);
    if (!isAll && ids.length === 0)
      return res.status(400).json({ error: 'Provide storeIds=all or a comma list of store IDs' });

    const params      = [];
    let   storeFilter = '';
    if (!isAll) {
      params.push(ids);
      storeFilter = `AND c.shop_id = ANY($${params.length})`;
    }

    const { rows } = await db.pool.query(
      `SELECT
         c.customer_email        AS email,
         MAX(c.customer_name)    AS name,
         s2.id                   AS store_id,
         s2.brand_name           AS store_name,
         s2.shop_domain          AS store_domain,
         MAX(c.updated_at)       AS last_seen_at
       FROM conversations c
       JOIN stores s2 ON s2.id = c.shop_id
       WHERE c.customer_email IS NOT NULL
         AND c.customer_email <> ''
         -- Exclude blacklisted and archived
         AND c.status NOT IN ('blacklisted', 'archived')
         -- Exclude global unsubscribes
         AND NOT EXISTS (
           SELECT 1 FROM promo_unsubscribes u
           WHERE LOWER(u.email) = LOWER(c.customer_email)
         )
         -- Exclude already emailed from this specific store
         AND NOT EXISTS (
           SELECT 1 FROM promo_sent_emails ps
           WHERE LOWER(ps.email) = LOWER(c.customer_email)
             AND (
               ps.store_domain = ''
               OR ps.store_domain = s2.shop_domain
             )
         )
         ${storeFilter}
       GROUP BY c.customer_email, s2.id, s2.brand_name, s2.shop_domain
       ORDER BY last_seen_at DESC
       LIMIT $${params.length + 1}`,
      [...params, RECIPIENTS_CAP]
    );

    const recipients = rows.map((r) => {
      const domain = cleanDomain(r.store_domain);
      return {
        email:       r.email,
        name:        r.name      || '',
        storeId:     r.store_id,
        storeName:   r.store_name,
        storeDomain: domain,
        storeUrl:    domain ? `https://${domain}` : '',
        lastOrderAt: r.last_seen_at,
      };
    });

    return res.json(recipients);
  } catch (err) {
    console.error('[Promo/recipients] Error:', err.message);
    return res.status(500).json({ error: 'Failed to load recipients' });
  }
});

// ── POST /send ────────────────────────────────────────────────────────────────
// Deliverability improvements vs the old batch version:
//   1. Sends one email at a time (not /emails/batch) — same pattern as
//      emailService.js which reliably hits inbox
//   2. Uses the store's own email_from_address per recipient — the FROM
//      domain matches what the customer recognises
//   3. Adds List-Unsubscribe + List-Unsubscribe-Post headers — Gmail/Outlook
//      treat these as legitimate bulk mail, not spam
//   4. Adds X-Entity-Ref-ID per email — deduplication hint for mail servers
//   5. 200ms delay between sends — avoids triggering provider rate limits
//   6. Server-side daily cap + unsubscribe re-check (see promoDb/promoSend)

router.post('/send', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const {
      fromEmail, fromName, subjectTemplate, htmlTemplate,
      textTemplate, recipients, test,
    } = req.body || {};

    if (!subjectTemplate || !htmlTemplate || !Array.isArray(recipients) || recipients.length === 0)
      return res.status(400).json({ error: 'subjectTemplate, htmlTemplate, and a non-empty recipients array are required' });

    let sent   = 0;
    let failed = 0;
    const errors = [];

    // Cache store configs so we don't re-query for every email from the same store
    const storeConfigCache = new Map();
    const templates = { subjectTemplate, htmlTemplate, textTemplate, fromEmail, fromName };

    // Defense in depth: /recipients already excludes unsubscribes for the DB
    // audience, but /send doesn't know where its recipients came from (e.g.
    // an uploaded list bypasses that query entirely), so re-check here too.
    const unsubscribed = await isUnsubscribed(recipients.map((r) => String(r.email || '')));

    for (const r of recipients) {
      const email = String(r.email || '').trim();
      if (!EMAIL_RE.test(email)) {
        failed++;
        errors.push(`Invalid email: ${email || '(blank)'}`);
        continue;
      }

      if (unsubscribed.has(email.toLowerCase())) {
        failed++;
        errors.push(`Skipped (unsubscribed): ${email}`);
        continue;
      }

      if (!test) {
        const hasSlot = await reserveSendSlot();
        if (!hasSlot) {
          failed++;
          errors.push(`Skipped (daily cap reached): ${email}`);
          continue;
        }
      }

      const result = await sendPromoEmailToRecipient(r, templates, storeConfigCache);
      if (result.ok) sent++;
      else { failed++; errors.push(result.error); }

      // Small delay between sends — avoids triggering Resend rate limits
      // and looks less like a mass blast to receiving mail servers
      if (!test) await sleep(SEND_DELAY_MS);
    }

    console.log(`[Promo/send] ${test ? 'TEST ' : ''}by ${req.user.email}: ${sent} sent, ${failed} failed`);
    return res.json({ sent, failed, errors: errors.slice(0, 50) });
  } catch (err) {
    console.error('[Promo/send] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /record-sent ─────────────────────────────────────────────────────────

router.post('/record-sent', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const { emails, discountCode } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ error: 'emails array is required' });

    const { recorded } = await recordSentEmails(emails.map((e) => ({ ...e, discountCode })));
    console.log(`[Promo/record-sent] ${recorded} records by ${req.user.email}`);
    return res.json({ recorded });
  } catch (err) {
    console.error('[Promo/record-sent] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /sent ─────────────────────────────────────────────────────────────────

router.get('/sent', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const { rows } = await db.pool.query(
      `SELECT email, store_domain, store_name, discount_code, sent_at
       FROM promo_sent_emails
       ORDER BY sent_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Promo/sent] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET/PUT /settings ─────────────────────────────────────────────────────────

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();
    return res.json(await getCapStatus());
  } catch (err) {
    console.error('[Promo/settings] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const dailyCap = Number(req.body?.dailyCap);
    if (!Number.isFinite(dailyCap) || dailyCap < 1)
      return res.status(400).json({ error: 'dailyCap must be a number of 1 or more' });

    await db.pool.query(`UPDATE promo_settings SET daily_cap = $1 WHERE id = 1`, [Math.floor(dailyCap)]);
    console.log(`[Promo/settings] Daily cap set to ${dailyCap} by ${req.user.email}`);
    return res.json(await getCapStatus());
  } catch (err) {
    console.error('[Promo/settings] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /uploads/parse ───────────────────────────────────────────────────────
// Parses an uploaded CSV/XLSX of Customer, Email, Source Store, New Source
// Store into the same recipient shape /recipients returns, so the frontend
// can feed it straight into the existing send flow. Applies the same
// exclusion rules (unsubscribed, blacklisted, already-sent-for-that-domain)
// as the DB-driven audience, plus dedupes emails that appear under more than
// one source store.

router.post('/uploads/parse', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });

    let parsed, invalid;
    try {
      ({ parsed, invalid } = parseRecipientSheet(req.file.buffer));
    } catch (err) {
      return res.status(400).json({ error: `Could not read file: ${err.message}` });
    }

    const totalRows = parsed.length + invalid.length;
    const truncated = parsed.length > UPLOAD_ROW_CAP;
    if (truncated) parsed = parsed.slice(0, UPLOAD_ROW_CAP);

    const { kept, flagged } = dedupeUploadRows(parsed);

    const emails = kept.map((r) => r.email);
    const [unsubSet, blacklistRows, storeRows, sentRows] = await Promise.all([
      isUnsubscribed(emails),
      emails.length
        ? db.pool.query(
            `SELECT DISTINCT LOWER(customer_email) AS email FROM conversations
             WHERE status = 'blacklisted' AND LOWER(customer_email) = ANY($1)`,
            [emails.map((e) => e.toLowerCase())]
          )
        : { rows: [] },
      db.pool.query(`SELECT id, shop_domain, brand_name FROM stores`),
      emails.length
        ? db.pool.query(`SELECT LOWER(email) AS email, store_domain FROM promo_sent_emails`)
        : { rows: [] },
    ]);

    const blacklisted  = new Set(blacklistRows.rows.map((r) => r.email));
    const storeByDomain = new Map(storeRows.rows.map((s) => [cleanDomain(s.shop_domain), s]));
    const sentPairs      = new Set(sentRows.rows.map((r) => `${r.email}::${r.store_domain}`));

    const recipients = [];
    for (const r of kept) {
      if (unsubSet.has(r.email) || blacklisted.has(r.email)) continue;

      const sendDomain = r.newDomain || r.sourceDomain;
      if (sentPairs.has(`${r.email}::${sendDomain}`)) continue;

      const matchedStore = storeByDomain.get(r.sourceDomain) || storeByDomain.get(r.newDomain);
      recipients.push({
        email:         r.email,
        name:          r.name,
        storeId:       matchedStore?.id ?? null,
        storeName:     matchedStore?.brand_name || r.sourceDomain,
        storeDomain:   r.sourceDomain,
        storeUrl:      `https://${r.sourceDomain}`,
        movedToDomain: r.newDomain || '',
        source:        'upload',
      });
    }

    // Distinct (source → new) domain pairs, for the separate domain-rename
    // review screen — computed from every deduped row with a move, regardless
    // of whether that row ended up excluded from the send list above.
    const pairMap = new Map();
    for (const r of kept) {
      if (!r.newDomain) continue;
      const key = `${r.sourceDomain}::${r.newDomain}`;
      if (!pairMap.has(key)) {
        const matchedStore = storeByDomain.get(r.sourceDomain);
        pairMap.set(key, {
          sourceDomain:    r.sourceDomain,
          newDomain:       r.newDomain,
          matchedStoreId:   matchedStore?.id ?? null,
          matchedStoreName: matchedStore?.brand_name ?? null,
          customerCount:   0,
        });
      }
      pairMap.get(key).customerCount++;
    }

    console.log(`[Promo/uploads/parse] by ${req.user.email}: ${totalRows} rows → ${recipients.length} eligible recipients`);

    return res.json({
      totalRows,
      validCount:  recipients.length,
      recipients,
      invalidRows: invalid.slice(0, 100),
      invalidCount: invalid.length,
      flaggedDuplicates: flagged,
      domainPairs: [...pairMap.values()],
      truncated,
    });
  } catch (err) {
    console.error('[Promo/uploads/parse] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /domain-updates/apply ────────────────────────────────────────────────
// Deliberately separate from sending the campaign: updating stores.shop_domain
// affects the live storefront widget + OAuth, not just this email, so it's
// its own explicit, reviewed action rather than something an upload does on
// its own.

router.post('/domain-updates/apply', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const pairs = Array.isArray(req.body?.pairs) ? req.body.pairs : [];
    if (pairs.length === 0) return res.status(400).json({ error: 'pairs array is required' });

    let updated = 0;
    const errors = [];

    for (const p of pairs) {
      const sourceDomain = cleanDomain(p.sourceDomain);
      const newDomain    = cleanDomain(p.newDomain);
      if (!sourceDomain || !newDomain) {
        errors.push({ sourceDomain: p.sourceDomain, newDomain: p.newDomain, error: 'Missing domain' });
        continue;
      }
      try {
        const { rowCount } = await db.pool.query(
          `UPDATE stores SET shop_domain = $1, updated_at = NOW() WHERE shop_domain = $2`,
          [newDomain, sourceDomain]
        );
        if (rowCount === 0) {
          errors.push({ sourceDomain, newDomain, error: 'No store found with that domain' });
        } else {
          updated++;
        }
      } catch (err) {
        errors.push({ sourceDomain, newDomain, error: err.message });
      }
    }

    console.log(`[Promo/domain-updates] by ${req.user.email}: ${updated} updated, ${errors.length} failed`);
    return res.json({ updated, errors });
  } catch (err) {
    console.error('[Promo/domain-updates/apply] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns (scheduled sends) ────────────────────────────────────────────────
// "Send batch_size every interval_hours, starting at startAt in timezone."
// Backed by promoScheduler.js (BullMQ) so a fire happens on its own from the
// backend — no browser tab needs to stay open between fires.

function serializeCampaign(row) {
  return {
    id:              row.id,
    name:            row.name,
    status:          row.status,
    batchSize:       row.batch_size,
    intervalHours:   Number(row.interval_hours),
    timezone:        row.timezone,
    nextFireAt:      row.next_fire_at,
    totalRecipients: row.total_recipients,
    sentCount:       row.sent_count,
    failedCount:     row.failed_count,
    skippedCount:    row.skipped_count,
    createdBy:       row.created_by,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

router.post('/campaigns', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const {
      name, recipients, subjectTemplate, htmlTemplate, textTemplate,
      fromEmail, fromName, batchSize, intervalHours, startAt, timezone,
    } = req.body || {};

    if (!subjectTemplate || !htmlTemplate || !Array.isArray(recipients) || recipients.length === 0)
      return res.status(400).json({ error: 'subjectTemplate, htmlTemplate, and a non-empty recipients array are required' });

    const batch    = Number(batchSize);
    const interval = Number(intervalHours);
    if (!Number.isFinite(batch) || batch < 1) return res.status(400).json({ error: 'batchSize must be 1 or more' });
    if (!Number.isFinite(interval) || interval <= 0) return res.status(400).json({ error: 'intervalHours must be greater than 0' });

    let nextFireAt;
    try {
      nextFireAt = promoScheduler.localToUtc(startAt, timezone || 'UTC');
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    // A start time already in the past just means "start right away" rather
    // than an error — the admin picking "now" in the UI shouldn't fail here.
    if (nextFireAt.getTime() < Date.now()) nextFireAt = new Date();

    await client.query('BEGIN');

    const { rows: campaignRows } = await client.query(
      `INSERT INTO promo_campaigns
         (name, status, from_email, from_name, subject_template, html_template, text_template,
          batch_size, interval_hours, timezone, next_fire_at, total_recipients, created_by)
       VALUES ($1, 'scheduled', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name || 'Promo campaign', fromEmail || null, fromName || null,
        subjectTemplate, htmlTemplate, textTemplate || null,
        Math.floor(batch), interval, timezone || 'UTC', nextFireAt, recipients.length, req.user.email,
      ]
    );
    const campaign = campaignRows[0];

    const values = recipients
      .map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`)
      .join(',');
    const params = recipients.flatMap((r) => [
      campaign.id,
      String(r.email || '').trim().toLowerCase(),
      r.name || '',
      r.storeId ?? null,
      r.storeName || '',
      r.storeDomain || '',
      r.storeUrl || '',
      r.movedBanner || '',
      r.movedBannerText || '',
    ]);
    await client.query(
      `INSERT INTO promo_campaign_recipients
         (campaign_id, email, name, store_id, store_name, store_domain, store_url, moved_banner, moved_banner_text)
       VALUES ${values}`,
      params
    );

    await client.query('COMMIT');

    await promoScheduler.scheduleCampaignFire(campaign.id, nextFireAt);

    console.log(`[Promo/campaigns] Created #${campaign.id} "${campaign.name}" by ${req.user.email}: ${recipients.length} recipients, next fire ${nextFireAt.toISOString()}`);
    return res.json(serializeCampaign(campaign));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[Promo/campaigns] Create error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();
    const { rows } = await db.pool.query(`SELECT * FROM promo_campaigns ORDER BY created_at DESC LIMIT 100`);
    return res.json(rows.map(serializeCampaign));
  } catch (err) {
    console.error('[Promo/campaigns] List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const { rows } = await db.pool.query(`SELECT * FROM promo_campaigns WHERE id = $1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

    const { rows: statusRows } = await db.pool.query(
      `SELECT status, COUNT(*)::int AS n FROM promo_campaign_recipients WHERE campaign_id = $1 GROUP BY status`,
      [req.params.id]
    );
    const statusBreakdown = { pending: 0, sent: 0, failed: 0, skipped: 0 };
    for (const r of statusRows) statusBreakdown[r.status] = r.n;

    return res.json({ ...serializeCampaign(rows[0]), statusBreakdown });
  } catch (err) {
    console.error('[Promo/campaigns] Detail error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

async function setCampaignStatus(req, res, { from, to, reschedule }) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await ensurePromoTables();

    const { rows } = await db.pool.query(
      `UPDATE promo_campaigns SET status = $2, updated_at = NOW() WHERE id = $1 AND status = ANY($3) RETURNING *`,
      [req.params.id, to, from]
    );
    if (rows.length === 0) return res.status(409).json({ error: `Campaign is not in a state that can be moved to "${to}"` });

    if (reschedule) {
      const nextFireAt = new Date();
      await db.pool.query(`UPDATE promo_campaigns SET next_fire_at = $2 WHERE id = $1`, [req.params.id, nextFireAt]);
      await promoScheduler.scheduleCampaignFire(rows[0].id, nextFireAt);
    } else {
      await promoScheduler.removeCampaignJob(rows[0].id);
    }

    return res.json(serializeCampaign(rows[0]));
  } catch (err) {
    console.error('[Promo/campaigns] Status change error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

router.post('/campaigns/:id/pause', authenticateToken, (req, res) =>
  setCampaignStatus(req, res, { from: ['scheduled', 'running'], to: 'paused', reschedule: false }));

router.post('/campaigns/:id/resume', authenticateToken, (req, res) =>
  setCampaignStatus(req, res, { from: ['paused'], to: 'scheduled', reschedule: true }));

router.post('/campaigns/:id/cancel', authenticateToken, (req, res) =>
  setCampaignStatus(req, res, { from: ['scheduled', 'running', 'paused'], to: 'cancelled', reschedule: false }));

// ── GET /unsubscribe ──────────────────────────────────────────────────────────

router.get('/unsubscribe', async (req, res) => {
  const page = (title, msg, ok = true) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
<div style="max-width:440px;margin:80px auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;text-align:center;">
<div style="font-size:40px;margin-bottom:12px;">${ok ? '✅' : '⚠️'}</div>
<h1 style="margin:0 0 8px;font-size:20px;color:#111827;">${title}</h1>
<p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">${msg}</p>
</div></body></html>`;

  try {
    await ensurePromoTables();
    const email = String(req.query.e || '').toLowerCase().trim();
    const token = String(req.query.t || '');

    if (!email || !token)
      return res.status(400).send(page('Invalid link', 'This unsubscribe link is missing information.', false));

    const expected = unsubToken(email);
    const ok =
      token.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!ok)
      return res.status(400).send(page('Invalid link', 'This unsubscribe link could not be verified.', false));

    await db.pool.query(
      `INSERT INTO promo_unsubscribes (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email]
    );
    return res.send(page('You have been unsubscribed', `${email} will no longer receive promotional emails from us.`));
  } catch (err) {
    console.error('[Promo/unsubscribe] Error:', err.message);
    return res.status(500).send(page('Something went wrong', 'Please try again later.', false));
  }
});

module.exports = router;
