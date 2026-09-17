// backend/services/promoScheduler.js
// Backend-driven scheduling for promo campaigns: "send batch_size every
// interval_hours, starting at a given clock time in a given timezone."
// Built on the same BullMQ/Redis setup queue-manager.js already uses for
// webhooks, so scheduled fires survive a closed browser tab or a server
// restart — the delayed job lives in Redis, not in a setInterval/setTimeout
// in this process's memory.

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { fromZonedTime } = require('date-fns-tz');
const db = require('../database');
const promoDb = require('./promoDb');
const { sendPromoEmailToRecipient } = require('./promoSend');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

const QUEUE_NAME = 'promo-campaigns';
const SEND_DELAY_MS = 200; // same inter-send pause as the browser-driven /send loop

const queue = new Queue(QUEUE_NAME, { connection });

// Interprets a "YYYY-MM-DDTHH:mm" wall-clock string as a time in `timezone`
// and returns the equivalent UTC Date — independent of the server's own
// system timezone (built via Date.UTC so the digits aren't reinterpreted).
function localToUtc(dateTimeLocalStr, timezone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(dateTimeLocalStr || ''));
  if (!m) throw new Error('Invalid start time — expected YYYY-MM-DDTHH:mm');
  const [, y, mo, d, h, mi, s] = m;
  const naiveUtc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)));
  return fromZonedTime(naiveUtc, timezone || 'UTC');
}

async function removeCampaignJob(campaignId) {
  const jobs = await queue.getJobs(['delayed', 'waiting']);
  await Promise.all(
    jobs.filter((job) => job.data?.campaignId === campaignId).map((job) => job.remove().catch(() => {}))
  );
}

// Enqueues the delayed job that fires this campaign's next batch, replacing
// any job already scheduled for it.
async function scheduleCampaignFire(campaignId, fireAtUtc) {
  await removeCampaignJob(campaignId);
  const delay = Math.max(0, new Date(fireAtUtc).getTime() - Date.now());
  await queue.add('fire', { campaignId }, {
    jobId: `campaign-fire-${campaignId}-${new Date(fireAtUtc).getTime()}`,
    delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  });
}

// ── Worker: fires the next batch for one campaign ───────────────────────────

async function fireCampaignBatch(campaignId) {
  await promoDb.ensurePromoTables();

  const { rows: campaignRows } = await db.pool.query(`SELECT * FROM promo_campaigns WHERE id = $1`, [campaignId]);
  const campaign = campaignRows[0];
  if (!campaign) return;
  // Paused/cancelled/completed campaigns simply drop this fire — pause/cancel
  // also removes the pending job, but a job already in flight when the
  // status changed still needs this guard.
  if (campaign.status !== 'scheduled' && campaign.status !== 'running') return;

  if (campaign.status === 'scheduled') {
    await db.pool.query(`UPDATE promo_campaigns SET status = 'running', updated_at = NOW() WHERE id = $1`, [campaignId]);
  }

  const { rows: batch } = await db.pool.query(
    `SELECT * FROM promo_campaign_recipients WHERE campaign_id = $1 AND status = 'pending' ORDER BY id LIMIT $2`,
    [campaignId, campaign.batch_size]
  );

  if (batch.length === 0) {
    await db.pool.query(
      `UPDATE promo_campaigns SET status = 'completed', next_fire_at = NULL, updated_at = NOW() WHERE id = $1`,
      [campaignId]
    );
    return;
  }

  const unsubscribed = await promoDb.isUnsubscribed(batch.map((r) => r.email));
  const templates = {
    subjectTemplate: campaign.subject_template,
    htmlTemplate:    campaign.html_template,
    textTemplate:    campaign.text_template,
    fromEmail:       campaign.from_email,
    fromName:        campaign.from_name,
  };
  const storeConfigCache = new Map();

  let sentThisRound = 0, failedThisRound = 0, skippedThisRound = 0;
  const justSent = [];

  for (const r of batch) {
    if (unsubscribed.has(r.email.toLowerCase())) {
      skippedThisRound++;
      await db.pool.query(
        `UPDATE promo_campaign_recipients SET status = 'skipped', error = 'unsubscribed' WHERE id = $1`,
        [r.id]
      );
      continue;
    }

    const hasSlot = await promoDb.reserveSendSlot();
    if (!hasSlot) break; // cap exhausted for today — leave the rest of the batch 'pending' for the next fire

    const result = await sendPromoEmailToRecipient({
      email: r.email, name: r.name, storeName: r.store_name, storeDomain: r.store_domain,
      storeUrl: r.store_url, movedBanner: r.moved_banner, movedBannerText: r.moved_banner_text,
    }, templates, storeConfigCache);

    if (result.ok) {
      sentThisRound++;
      justSent.push({ email: r.email, storeDomain: r.store_domain, storeName: r.store_name });
      await db.pool.query(`UPDATE promo_campaign_recipients SET status = 'sent', sent_at = NOW() WHERE id = $1`, [r.id]);
    } else {
      failedThisRound++;
      await db.pool.query(`UPDATE promo_campaign_recipients SET status = 'failed', error = $2 WHERE id = $1`, [r.id, result.error]);
    }

    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
  }

  if (justSent.length > 0) await promoDb.recordSentEmails(justSent);

  await db.pool.query(
    `UPDATE promo_campaigns
     SET sent_count = sent_count + $2, failed_count = failed_count + $3, skipped_count = skipped_count + $4, updated_at = NOW()
     WHERE id = $1`,
    [campaignId, sentThisRound, failedThisRound, skippedThisRound]
  );

  const { rows: remainingRows } = await db.pool.query(
    `SELECT COUNT(*)::int AS n FROM promo_campaign_recipients WHERE campaign_id = $1 AND status = 'pending'`,
    [campaignId]
  );
  const remaining = remainingRows[0]?.n ?? 0;

  if (remaining === 0) {
    await db.pool.query(
      `UPDATE promo_campaigns SET status = 'completed', next_fire_at = NULL, updated_at = NOW() WHERE id = $1`,
      [campaignId]
    );
    return;
  }

  // Re-check status: an admin may have paused/cancelled this campaign while
  // the batch above was mid-send. Without this, the code below would
  // schedule another fire and effectively un-pause/un-cancel it.
  const { rows: freshRows } = await db.pool.query(`SELECT status FROM promo_campaigns WHERE id = $1`, [campaignId]);
  if (freshRows[0]?.status !== 'running') return;

  // More pending recipients (either the batch filled up, or the cap ran out
  // mid-batch) — schedule the next fire interval_hours from now. Adding
  // hours to a UTC instant needs no timezone math; the timezone only matters
  // for the campaign's initial start time.
  const nextFireAt = new Date(Date.now() + Number(campaign.interval_hours) * 3600 * 1000);
  await db.pool.query(`UPDATE promo_campaigns SET next_fire_at = $2, updated_at = NOW() WHERE id = $1`, [campaignId, nextFireAt]);
  await scheduleCampaignFire(campaignId, nextFireAt);
}

new Worker(QUEUE_NAME, async (job) => {
  await fireCampaignBatch(job.data.campaignId);
}, { connection, concurrency: 2 });

console.log('✅ Promo campaign scheduler initialized');

module.exports = {
  localToUtc,
  scheduleCampaignFire,
  removeCampaignJob,
};
