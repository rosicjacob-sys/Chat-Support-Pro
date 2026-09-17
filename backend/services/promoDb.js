// backend/services/promoDb.js
// Table bootstrap + the server-side daily cap + unsubscribe lookups + the
// promo_sent_emails ledger. Shared by the promo routes (browser-driven
// "send now") and the campaign scheduler/worker (backend-driven scheduled
// sends), so both paths enforce the exact same cap and dedupe rules.

const db = require('../database');
const { cleanDomain } = require('./promoUtils');

const DEFAULT_DAILY_CAP = 100;

let _promoTablesReady = null;

async function ensurePromoTables() {
  if (!_promoTablesReady) {
    _promoTablesReady = (async () => {
      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS promo_unsubscribes (
          id              SERIAL PRIMARY KEY,
          email           TEXT NOT NULL UNIQUE,
          unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS promo_sent_emails (
          id            SERIAL PRIMARY KEY,
          email         TEXT        NOT NULL,
          store_domain  TEXT        NOT NULL DEFAULT '',
          store_name    TEXT,
          discount_code TEXT,
          sent_at       TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Drop old global unique if upgrading from earlier version
      await db.pool.query(`
        ALTER TABLE promo_sent_emails
          DROP CONSTRAINT IF EXISTS promo_sent_emails_email_key
      `).catch(() => {});

      // Composite unique: one send per (email, store_domain)
      await db.pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS promo_sent_emails_email_store_uidx
          ON promo_sent_emails (LOWER(email), store_domain)
      `);

      // Single-row table holding the server-side daily send cap. sent_today /
      // sent_date back an atomic reserve-a-slot check in reserveSendSlot() so
      // concurrent admins/campaigns can't both slip past the cap.
      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS promo_settings (
          id         SMALLINT PRIMARY KEY DEFAULT 1,
          daily_cap  INTEGER NOT NULL DEFAULT ${DEFAULT_DAILY_CAP},
          sent_today INTEGER NOT NULL DEFAULT 0,
          sent_date  DATE,
          CONSTRAINT promo_settings_singleton CHECK (id = 1)
        )
      `);
      await db.pool.query(`
        INSERT INTO promo_settings (id, daily_cap) VALUES (1, ${DEFAULT_DAILY_CAP})
        ON CONFLICT (id) DO NOTHING
      `);

      // Scheduled campaigns — "send batch_size every interval_hours, starting
      // at next_fire_at (UTC)". Worked off by the BullMQ worker in
      // promoScheduler.js, one delayed job per fire.
      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS promo_campaigns (
          id                SERIAL PRIMARY KEY,
          name              TEXT NOT NULL,
          status            TEXT NOT NULL DEFAULT 'scheduled',
          from_email        TEXT,
          from_name         TEXT,
          subject_template  TEXT NOT NULL,
          html_template     TEXT NOT NULL,
          text_template     TEXT,
          batch_size        INTEGER NOT NULL,
          interval_hours    NUMERIC NOT NULL,
          timezone          TEXT NOT NULL DEFAULT 'UTC',
          next_fire_at      TIMESTAMPTZ,
          total_recipients  INTEGER NOT NULL DEFAULT 0,
          sent_count        INTEGER NOT NULL DEFAULT 0,
          failed_count      INTEGER NOT NULL DEFAULT 0,
          skipped_count     INTEGER NOT NULL DEFAULT 0,
          created_by        TEXT,
          created_at        TIMESTAMPTZ DEFAULT NOW(),
          updated_at        TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS promo_campaign_recipients (
          id                SERIAL PRIMARY KEY,
          campaign_id       INTEGER NOT NULL REFERENCES promo_campaigns(id) ON DELETE CASCADE,
          email             TEXT NOT NULL,
          name              TEXT,
          store_id          INTEGER,
          store_name        TEXT,
          store_domain      TEXT,
          store_url         TEXT,
          moved_banner      TEXT,
          moved_banner_text TEXT,
          status            TEXT NOT NULL DEFAULT 'pending',
          error             TEXT,
          sent_at           TIMESTAMPTZ
        )
      `);
      await db.pool.query(`
        CREATE INDEX IF NOT EXISTS promo_campaign_recipients_campaign_status_idx
          ON promo_campaign_recipients (campaign_id, status)
      `);
    })().catch((err) => {
      _promoTablesReady = null;
      throw err;
    });
  }
  return _promoTablesReady;
}

// Atomically reserves one send against today's cap. Returns true if the send
// may proceed, false if today's cap is already used up. Resets the counter
// itself the first time it's called on a new day.
async function reserveSendSlot() {
  const { rows } = await db.pool.query(`
    UPDATE promo_settings
    SET sent_today = CASE WHEN sent_date = CURRENT_DATE THEN sent_today + 1 ELSE 1 END,
        sent_date  = CURRENT_DATE
    WHERE id = 1
      AND (sent_date IS DISTINCT FROM CURRENT_DATE OR sent_today < daily_cap)
    RETURNING sent_today, daily_cap
  `);
  return rows.length > 0;
}

async function getCapStatus() {
  const { rows } = await db.pool.query(`
    SELECT daily_cap AS "dailyCap",
           CASE WHEN sent_date = CURRENT_DATE THEN sent_today ELSE 0 END AS "sentToday"
    FROM promo_settings WHERE id = 1
  `);
  const row = rows[0] || { dailyCap: DEFAULT_DAILY_CAP, sentToday: 0 };
  return { dailyCap: row.dailyCap, sentToday: row.sentToday, remainingToday: Math.max(0, row.dailyCap - row.sentToday) };
}

async function isUnsubscribed(emails) {
  if (emails.length === 0) return new Set();
  const { rows } = await db.pool.query(
    `SELECT LOWER(email) AS email FROM promo_unsubscribes WHERE LOWER(email) = ANY($1)`,
    [emails.map((e) => e.toLowerCase())]
  );
  return new Set(rows.map((r) => r.email));
}

async function recordSentEmails(records) {
  if (!Array.isArray(records) || records.length === 0) return { recorded: 0 };

  const values = records
    .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
    .join(',');

  const params = records.flatMap((e) => [
    String(e.email || '').toLowerCase().trim(),
    cleanDomain(e.storeDomain || ''),
    e.storeName     || '',
    e.discountCode  || '',
  ]);

  await db.pool.query(
    `INSERT INTO promo_sent_emails (email, store_domain, store_name, discount_code)
     VALUES ${values}
     ON CONFLICT (LOWER(email), store_domain) DO NOTHING`,
    params
  );

  return { recorded: records.length };
}

module.exports = {
  DEFAULT_DAILY_CAP,
  ensurePromoTables,
  reserveSendSlot,
  getCapStatus,
  isUnsubscribed,
  recordSentEmails,
};
