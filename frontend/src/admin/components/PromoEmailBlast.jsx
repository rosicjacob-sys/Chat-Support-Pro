import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../services/api';

const FROM_EMAIL = 'support@pepscustomercare.com';
const FROM_NAME  = 'Customer Support';

// ── Email copy ────────────────────────────────────────────────────────────────
const DEFAULT_SUBJECT = "Prices Just Dropped Up To {{price_cut_percent}}%. Plus {{discount_percent}}% More With {{discount_code}}";

const DEFAULT_BODY =
`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prices Just Dropped Up To {{price_cut_percent}}%. Plus {{discount_percent}}% More With {{discount_code}}</title>
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; border-radius: 0 !important; }
    .pad-lg { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-pad { padding: 28px 20px 24px 20px !important; }
    .hero-title { font-size: 26px !important; line-height: 1.2 !important; }
    .hero-sub { font-size: 15px !important; }
    .code-text { font-size: 20px !important; letter-spacing: 1px !important; }
    .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 16px 0 !important; text-align: center !important; }
    .cta-cell { padding-left: 20px !important; padding-right: 20px !important; }
    .stack-pad { padding: 14px 16px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<div style="display:none; max-height:0; overflow:hidden; opacity:0;">
  Prices just dropped up to {{price_cut_percent}}% storewide. Stack an extra {{discount_percent}}% with {{discount_code}}, plus free express tracked shipping and freebies. {{expiry_sentence}}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" class="container" style="max-width:600px; width:100%; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td class="hero-pad" style="background-color:#0b3d2c; padding:36px 32px 30px 32px; text-align:center;">
      <h1 class="hero-title" style="margin:0; color:#ffffff; font-size:32px; line-height:1.2; font-weight:800;">Prices Just Dropped Up To {{price_cut_percent}}%</h1>
      <p class="hero-sub" style="margin:14px 0 0 0; color:#c7e8d8; font-size:16px; line-height:1.5;">Stack an extra <strong>{{discount_percent}}% off</strong> with code <strong>{{discount_code}}</strong> · {{expiry_header}}</p>
    </td>
  </tr>

  <!-- Moved-store banner (only present for recipients whose store has a movedToDomain) -->
  {{moved_banner}}

  <!-- What's new -->
  <tr>
    <td class="pad-lg" style="padding:32px 32px 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f7f4; border-left:4px solid #0b3d2c; border-radius:6px;">
        <tr>
          <td class="stack-pad" style="padding:18px 20px;">
            <p style="margin:0 0 6px 0; color:#0b3d2c; font-size:15px; font-weight:700;">⚡ New team. New speed. New prices.</p>
            <p style="margin:0; color:#3d4f47; font-size:15px; line-height:1.6;">
              We rebuilt how orders move: faster processing, tighter inventory, and a bigger team behind every shipment.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- COA announcement -->
  <tr>
    <td class="pad-lg" style="padding:28px 32px 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b3d2c; border-radius:8px;">
        <tr>
          <td class="stack-pad" style="padding:20px 22px;">
            <p style="margin:0 0 6px 0; color:#7fd4ae; font-size:13px; font-weight:700; letter-spacing:1px; text-transform:uppercase;">🧪 Fresh Restock</p>
            <p style="margin:0 0 8px 0; color:#ffffff; font-size:17px; font-weight:700; line-height:1.4;">New batch is in, and the new COAs are live</p>
            <p style="margin:0; color:#c7e8d8; font-size:14px; line-height:1.6;">
              Every restocked item ships with its own third-party Certificate of Analysis. Fresh batch, fresh testing, fully verified before it leaves the warehouse.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body copy -->
  <tr>
    <td class="pad-lg" style="padding:28px 32px 0 32px;">
      <p style="margin:0 0 16px 0; color:#2d3a34; font-size:16px; line-height:1.65;">
        We went all in: <strong>every price on the site just dropped, up to {{price_cut_percent}}% off</strong>. Storewide.
      </p>
      <p style="margin:0 0 24px 0; color:#2d3a34; font-size:16px; line-height:1.65;">
        And we're stacking even more on top of that:
      </p>
    </td>
  </tr>

  <!-- Offers -->
  <tr>
    <td class="pad-lg" style="padding:0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbf0; border:1px solid #f0d9a8; border-radius:8px;">
              <tr>
                <td class="stack-pad" style="padding:18px 20px; text-align:center;">
                  <p style="margin:0 0 4px 0; color:#8a6100; font-size:13px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">Extra discount code</p>
                  <p style="margin:0 0 10px 0; color:#1a1a1a; font-size:22px; font-weight:800;">{{discount_percent}}% OFF</p>
                  <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 10px auto;">
                    <tr>
                      <td style="background-color:#ffffff; border:2px dashed #d9a83a; border-radius:6px; padding:12px 26px;">
                        <span class="code-text" style="color:#1a1a1a; font-size:24px; font-weight:800; letter-spacing:2px; font-family:'Courier New',Courier,monospace;">{{discount_code}}</span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0; color:#5c5245; font-size:14px; line-height:1.5;">Enter <strong>{{discount_code}}</strong> at checkout. <strong>{{expiry_sentence}}</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8f9; border-radius:8px;">
              <tr>
                <td class="stack-pad" style="padding:16px 20px;">
                  <p style="margin:0 0 4px 0; color:#0b3d2c; font-size:16px; font-weight:700;">🚀 Free Express Tracked Shipping</p>
                  <p style="margin:0; color:#4a5551; font-size:14px; line-height:1.5;">Auto-applied.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8f9; border-radius:8px;">
              <tr>
                <td class="stack-pad" style="padding:16px 20px;">
                  <p style="margin:0 0 4px 0; color:#0b3d2c; font-size:16px; font-weight:700;">🎁 Freebies + Extra Savings</p>
                  <p style="margin:0; color:#4a5551; font-size:14px; line-height:1.5;">Added straight to your order automatically.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td align="center" class="cta-cell" style="padding:30px 32px 8px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="background-color:#0b3d2c; border-radius:6px;">
            <a href="{{store_url}}" class="cta-btn" style="display:inline-block; padding:16px 44px; color:#ffffff; font-size:17px; font-weight:800; text-decoration:none;">Shop Now →</a>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0 0; color:#7a8681; font-size:14px;">{{expiry_sentence}} Don't wait.</p>
    </td>
  </tr>

  <!-- Urgency line -->
  <tr>
    <td class="pad-lg" align="center" style="padding:20px 32px 0 32px;">
      <p style="margin:0; color:#0b3d2c; font-size:16px; font-weight:700; line-height:1.5; text-align:center;">
        What are you waiting for? Order now before the code expires and while supplies last.
      </p>
    </td>
  </tr>

  <!-- Closing -->
  <tr>
    <td class="pad-lg" style="padding:24px 32px 32px 32px;">
      <p style="margin:0; color:#2d3a34; font-size:16px; line-height:1.65;">
        Let's go,<br>
        <strong>The {{store_name}} Team</strong>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="pad-lg" style="background-color:#f7f8f9; padding:22px 32px; text-align:center; border-top:1px solid #e6e9e8;">
      <p style="margin:0; color:#9aa4a0; font-size:12px; line-height:1.6;">
        You're receiving this because you checked out, contacted us, or tried to check out with us before.<br>
        <a href="{{unsubscribe_url}}" style="color:#9aa4a0; text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const applyMerge = (text, fields) =>
  String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in fields ? fields[k] : m));

const cleanDomain = (d) =>
  String(d || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

const normalizeStore = (s) => {
  const domain = cleanDomain(
    s.domain || s.storeDomain || s.store_domain ||
    s.shopDomain || s.shop_domain || s.storeIdentifier || s.store_identifier || ''
  );
  const movedToDomain = cleanDomain(
    s.movedToDomain || s.moved_to_domain || s.newDomain || s.new_domain ||
    s.migratedDomain || s.migrated_domain || ''
  );
  return {
    id:     s.id ?? s.storeId ?? s.store_id ?? s.shopId ?? s.shop_id ?? domain,
    name:   s.name || s.storeName || s.store_name || s.shopName || s.shop_name || domain || 'Unnamed store',
    domain,
    movedToDomain,
  };
};

const normalizeRecipient = (r) => {
  const email       = (r.email || r.customerEmail || r.customer_email || '').trim().toLowerCase();
  const name        = (r.name  || r.customerName  || r.customer_name  || '').trim();
  const storeId     = r.storeId    ?? r.store_id    ?? r.shopId    ?? r.shop_id    ?? null;
  const storeName   = r.storeName  || r.store_name  || r.shopName  || r.shop_name  || '';
  const storeDomain = cleanDomain(
    r.storeDomain || r.store_domain || r.shopDomain || r.shop_domain || r.storeUrl || r.store_url || ''
  );
  const storeUrl    = (r.storeUrl || r.store_url || (storeDomain ? `https://${storeDomain}` : '')).replace(/\/+$/, '');
  // Only present when this recipient's store has migrated to a new domain —
  // drives the "we've moved" banner. Absent/empty = no banner for this recipient.
  const movedToDomain = cleanDomain(
    r.movedToDomain || r.moved_to_domain || r.newDomain || r.new_domain ||
    r.migratedDomain || r.migrated_domain || ''
  );
  const lastOrderAt = r.lastOrderAt || r.last_order_at || r.lastSeenAt || r.last_seen_at || r.createdAt || r.created_at || null;
  const orderCount  = r.orderCount ?? r.order_count ?? null;
  const source      = r.source || 'db';
  return { email, name, storeId, storeName, storeDomain, storeUrl, movedToDomain, lastOrderAt, orderCount, source };
};

// A store "has moved" only if it declares a movedToDomain that differs from
// its current storeDomain — this is what decides whether the banner shows.
const hasMoved = (r) => {
  const moved = cleanDomain(r?.movedToDomain || '');
  if (!moved) return false;
  const current = cleanDomain(r?.storeDomain || cleanDomain(r?.storeUrl) || '');
  return moved !== current;
};

// The URL Shop Now / the rest of the email should actually point to for this
// recipient: the new domain if they moved, otherwise their normal store URL.
const resolveStoreUrl = (r, fallbackDomain) => {
  if (hasMoved(r)) return `https://${cleanDomain(r.movedToDomain)}`;
  if (r?.storeUrl) return r.storeUrl.replace(/\/+$/, '');
  const domain = cleanDomain(r?.storeDomain) || cleanDomain(fallbackDomain);
  return domain ? `https://${domain}` : '';
};

// The domain that should drive from-address resolution and the
// promo_sent_emails dedupe key: the NEW domain for anyone who has moved
// (that's the identity they're being sent under going forward), otherwise
// their normal purchase-store domain. Kept separate from storeDomain itself
// so hasMoved()/the banner comparison above still sees the real before/after.
const resolveSendDomain = (r) =>
  hasMoved(r) ? cleanDomain(r.movedToDomain) : (cleanDomain(r?.storeDomain) || cleanDomain(r?.storeUrl));

// Builds the "we've moved" banner as a ready HTML block, or '' if the store
// hasn't moved — merged into {{moved_banner}} per recipient.
const buildMovedBannerHtml = (r) => {
  if (!hasMoved(r)) return '';
  const url = `https://${cleanDomain(r.movedToDomain)}`;
  return `<tr>
    <td class="pad-lg" style="padding:32px 32px 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f7f4; border-left:4px solid #0b3d2c; border-radius:6px;">
        <tr>
          <td class="stack-pad" style="padding:18px 20px;">
            <p style="margin:0 0 6px 0; color:#0b3d2c; font-size:15px; font-weight:700;">📍 We've moved</p>
            <p style="margin:0; color:#3d4f47; font-size:15px; line-height:1.6;">
              You can now find us at <a href="${url}" style="color:#0b3d2c; font-weight:700; text-decoration:underline;">${cleanDomain(r.movedToDomain)}</a>. Please update your bookmarks.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
};

// Plain-text counterpart of the same conditional banner, for textTemplate.
const buildMovedBannerText = (r) => {
  if (!hasMoved(r)) return '';
  const url = `https://${cleanDomain(r.movedToDomain)}`;
  return `We've moved!\nYou can now find us at ${url}. Please update your bookmarks.\n`;
};

// One row per email — most recent purchase store wins
const dedupeByEmail = (rows) => {
  const map = new Map();
  for (const r of rows) {
    if (!r.email) continue;
    const existing = map.get(r.email);
    if (!existing) { map.set(r.email, r); continue; }
    const a = r.lastOrderAt ? new Date(r.lastOrderAt).getTime() : 0;
    const b = existing.lastOrderAt ? new Date(existing.lastOrderAt).getTime() : 0;
    if (a >= b) map.set(r.email, r);
  }
  return [...map.values()];
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
};

const fmtLongDate = (d) => {
  if (!d) return '';
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return ''; }
};

const fmtShortDate = (d) => {
  if (!d) return '';
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch { return ''; }
};

const fmtWeekdayDate = (d) => {
  if (!d) return '';
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
};

const addDaysToToday = (days) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PromoEmailBlast({ onBack }) {
  // Stores
  const [stores,         setStores]         = useState([]);
  const [storesLoading,  setStoresLoading]  = useState(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState(new Set());
  const [audience,       setAudience]       = useState('all'); // 'all' | 'specific' | 'upload'

  // Recipients — auto-fetched on mount; re-fetched when store filter changes
  const [recipients,        setRecipients]        = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [excludedEmails,    setExcludedEmails]    = useState(new Set());
  const [search,            setSearch]            = useState('');

  // Upload audience
  const [uploadInvalidRows, setUploadInvalidRows] = useState([]);
  const [uploadFlagged,     setUploadFlagged]     = useState([]);
  const [domainPairs,       setDomainPairs]       = useState([]);
  const [checkedPairs,      setCheckedPairs]      = useState(new Set());
  const [applyingDomains,   setApplyingDomains]   = useState(false);
  const [domainApplyResult, setDomainApplyResult] = useState(null);
  const fileInputRef = useRef(null);

  // Daily cap — server-side setting, authoritative regardless of who's sending
  const [dailyCap,       setDailyCap]       = useState(100);
  const [sentToday,      setSentToday]      = useState(0);
  const [capLoading,     setCapLoading]     = useState(true);
  const [capEditValue,   setCapEditValue]   = useState('');
  const [capSaving,      setCapSaving]      = useState(false);

  // Discount
  const [discountCode,     setDiscountCode]     = useState('PEPS15');
  const [discountPercent,  setDiscountPercent]  = useState(15);
  const [priceCutPercent,  setPriceCutPercent]  = useState(30);
  const [validDays,        setValidDays]        = useState(2);
  const [validUntil,       setValidUntil]       = useState(() => addDaysToToday(2));

  // Copy
  const [subject,   setSubject]   = useState(DEFAULT_SUBJECT);
  const [body,      setBody]      = useState(DEFAULT_BODY);
  const [newDomain, setNewDomain] = useState('lexarajax.store');

  // UI
  const [tab,         setTab]         = useState('recipients');
  const [previewIdx,  setPreviewIdx]  = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error,       setError]       = useState(null);

  // Test send
  const [testEmail,   setTestEmail]   = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testMsg,     setTestMsg]     = useState(null);

  // Blast send
  const [sending,  setSending]  = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, sent: 0, failed: 0 });
  const [results,  setResults]  = useState(null);
  const cancelRef = useRef(false);

  // Delivery: send immediately, or hand off to the backend campaign scheduler
  const [deliveryMode,   setDeliveryMode]   = useState('now'); // 'now' | 'schedule'
  const [campaignName,   setCampaignName]   = useState('');
  const [batchSize,      setBatchSize]      = useState(100);
  const [intervalHours,  setIntervalHours]  = useState(2);
  const [startAt,        setStartAt]        = useState(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [timezone,       setTimezone]       = useState('America/New_York');
  const [scheduling,     setScheduling]     = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);

  // Campaigns list (backend-driven scheduled sends)
  const [campaigns,        setCampaigns]        = useState([]);
  const [campaignsLoading, setCampaignsLoading]  = useState(false);
  const [campaignActionId, setCampaignActionId]  = useState(null);

  const refreshCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      setCampaigns(await api.getPromoCampaigns() || []);
    } catch (err) {
      console.error('[Promo] Failed to load campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  const refreshCapStatus = useCallback(async () => {
    setCapLoading(true);
    try {
      const status = await api.getPromoSettings();
      setDailyCap(status?.dailyCap ?? 100);
      setSentToday(status?.sentToday ?? 0);
    } catch (err) {
      console.error('[Promo] Failed to load cap settings:', err);
    } finally {
      setCapLoading(false);
    }
  }, []);

  useEffect(() => { refreshCapStatus(); }, [refreshCapStatus]);
  useEffect(() => { refreshCampaigns(); }, [refreshCampaigns]);

  // Load stores on mount
  useEffect(() => {
    (async () => {
      try {
        setStoresLoading(true);
        const list = (await api.getStores()) || [];
        setStores(list.map(normalizeStore));
      } catch (err) {
        console.error('[Promo] Failed to load stores:', err);
      } finally {
        setStoresLoading(false);
      }
    })();
  }, []);

  // Auto-load recipients on mount (all stores)
  useEffect(() => {
    fetchRecipients('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch recipients — the DB excludes anyone already recorded in
  //    promo_sent_emails for their purchase store, plus anyone unsubscribed /
  //    blacklisted / archived. Clearing a store's rows makes its purchasers
  //    eligible again on the next reload.
  const fetchRecipients = useCallback(async (storeIds) => {
    setError(null);
    setRecipientsLoading(true);
    setResults(null);
    try {
      const raw  = (await api.getPromoRecipients({ storeIds })) || [];
      const rows = dedupeByEmail(raw.map(normalizeRecipient).filter((r) => r.email));
      rows.sort((a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0));
      setRecipients(rows);
      setExcludedEmails(new Set());
    } catch (err) {
      console.error('[Promo] Failed to load recipients:', err);
      setError(err?.message || 'Failed to load recipients.');
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  // Manual reload — respects current store filter
  const loadRecipients = useCallback(() => {
    if (audience === 'specific' && selectedStoreIds.size === 0) {
      setError('Select at least one store, or choose "All stores".');
      return;
    }
    const storeIds = audience === 'specific' ? [...selectedStoreIds] : 'all';
    fetchRecipients(storeIds);
  }, [audience, selectedStoreIds, fetchRecipients]);

  const toggleStore = (id) => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setAudienceMode = (mode) => {
    setAudience(mode);
    setError(null);
    setResults(null);
    if (mode === 'all') fetchRecipients('all');
    else if (mode === 'specific') {
      if (selectedStoreIds.size > 0) fetchRecipients([...selectedStoreIds]);
      else setRecipients([]);
    } else {
      // 'upload' — clear whatever DB audience was loaded; wait for a file
      setRecipients([]);
      setExcludedEmails(new Set());
      setUploadInvalidRows([]);
      setUploadFlagged([]);
      setDomainPairs([]);
      setCheckedPairs(new Set());
      setDomainApplyResult(null);
    }
  };

  // ── Upload recipients (CSV/XLSX) ────────────────────────────────────────────
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResults(null);
    setDomainApplyResult(null);
    setRecipientsLoading(true);
    try {
      const res = await api.uploadPromoRecipients(file);
      const rows = (res?.recipients || []).map(normalizeRecipient).filter((r) => r.email);
      setRecipients(rows);
      setExcludedEmails(new Set());
      setUploadInvalidRows(res?.invalidRows || []);
      setUploadFlagged(res?.flaggedDuplicates || []);
      setDomainPairs(res?.domainPairs || []);
      setCheckedPairs(new Set((res?.domainPairs || []).filter((p) => p.matchedStoreId && !p.conflictStoreId).map((p) => p.sourceDomain)));
    } catch (err) {
      console.error('[Promo] Upload failed:', err);
      setError(err?.message || 'Failed to parse the uploaded file.');
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePairChecked = (sourceDomain) =>
    setCheckedPairs((prev) => {
      const next = new Set(prev);
      next.has(sourceDomain) ? next.delete(sourceDomain) : next.add(sourceDomain);
      return next;
    });

  const applyDomainUpdates = async () => {
    const pairs = domainPairs.filter((p) => checkedPairs.has(p.sourceDomain));
    if (pairs.length === 0) return;
    setApplyingDomains(true);
    setDomainApplyResult(null);
    try {
      const res = await api.applyPromoDomainUpdates({
        pairs: pairs.map((p) => ({ sourceDomain: p.sourceDomain, newDomain: p.newDomain })),
      });
      setDomainApplyResult(res);
    } catch (err) {
      setDomainApplyResult({ error: err?.message || 'Failed to apply domain updates.' });
    } finally {
      setApplyingDomains(false);
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.email.includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.storeName.toLowerCase().includes(q) ||
        r.storeDomain.includes(q)
    );
  }, [recipients, search]);

  // selected = checked (not manually excluded)
  // DB already removed anyone already sent for their store, so no extra filter needed
  const selected = useMemo(
    () => recipients.filter((r) => !excludedEmails.has(r.email)),
    [recipients, excludedEmails]
  );

  // How many can go out today
  const remainingToday = Math.max(0, dailyCap - sentToday);

  // Batch capped at today's remaining quota
  const batchToSend = useMemo(
    () => selected.slice(0, remainingToday),
    [selected, remainingToday]
  );

  const toggleRecipient = (email) =>
    setExcludedEmails((prev) => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });

  const selectAllFiltered = () =>
    setExcludedEmails((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => next.delete(r.email));
      return next;
    });

  const deselectAllFiltered = () =>
    setExcludedEmails((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => next.add(r.email));
      return next;
    });

  // ── Daily cap editing ────────────────────────────────────────────────────────
  const startEditingCap = () => setCapEditValue(String(dailyCap));
  const cancelEditingCap = () => setCapEditValue('');
  const saveCap = async () => {
    const n = Number(capEditValue);
    if (!Number.isFinite(n) || n < 1) { setError('Enter a valid daily cap (1 or more).'); return; }
    setCapSaving(true);
    try {
      const res = await api.updatePromoSettings({ dailyCap: n });
      setDailyCap(res?.dailyCap ?? n);
      setCapEditValue('');
    } catch (err) {
      setError(err?.message || 'Failed to update daily cap.');
    } finally {
      setCapSaving(false);
    }
  };

  // ── Template builders ──────────────────────────────────────────────────────
  const expiryFields = useMemo(() => {
    if (validUntil) {
      const longDate = fmtLongDate(validUntil);
      const shortDate = fmtShortDate(validUntil);
      const weekdayDate = fmtWeekdayDate(validUntil);
      return {
        valid_until: longDate,
        valid_until_short: shortDate,
        valid_until_with_weekday: weekdayDate,
        expiry_subject: `Ends ${shortDate}`,
        expiry_header: `Ends ${weekdayDate} at 11:00 PM ET`,
        expiry_sentence: `Expires ${weekdayDate} at 11:00 PM ET.`,
      };
    }

    const days = Math.max(1, Number(validDays) || 1);
    return {
      valid_until: '',
      valid_until_short: '',
      valid_until_with_weekday: '',
      expiry_subject: `${days} day${days === 1 ? '' : 's'} only`,
      expiry_header: `Valid for ${days} day${days === 1 ? '' : 's'} only`,
      expiry_sentence: `Valid for ${days} day${days === 1 ? '' : 's'} only.`,
    };
  }, [validUntil, validDays]);

  const bakeGlobals = useCallback(
    (s) => applyMerge(s, {
      discount_code:      discountCode,
      discount_percent:   String(discountPercent),
      price_cut_percent:  String(priceCutPercent),
      valid_days:         String(validDays),
      ...expiryFields,
      new_domain:       cleanDomain(newDomain) || 'lexarajax.store',
      new_url:          `https://${cleanDomain(newDomain) || 'lexarajax.store'}`,
    }),
    [discountCode, discountPercent, priceCutPercent, validDays, expiryFields, newDomain]
  );

  const subjectTemplate = useMemo(() => bakeGlobals(subject), [bakeGlobals, subject]);

  const htmlTemplate = useMemo(
    () => bakeGlobals(body),
    [body, bakeGlobals]
  );

  const textTemplate = useMemo(() => {
    return [
      `LIMITED TIME: ${discountPercent}% OFF`,
      expiryFields.expiry_header,
      '',
      '{{moved_banner_text}}',
      'Miss us?',
      '',
      "We've been re-working our approach to serve you better, starting with the basics. We've lowered our prices across the board. Not just for this week, but going forward. You'll see the new pricing the moment you land on the site.",
      '',
      "And on top of those new lower prices, here's everything else you can claim right now:",
      '',
      `${discountPercent}% OFF - Use code ${discountCode}`,
      expiryFields.expiry_sentence,
      '',
      '+ Free Express Tracked Shipping',
      'Applied automatically to your order. No code needed.',
      '',
      '+ 10% off with Interac e-Transfer',
      'Choose e-Transfer at checkout for an extra 10% off your order.',
      '',
      '+ Free items on your order',
      'Added automatically. No extra step required.',
      '',
      'Shop now: {{store_url}}',
      '',
      'Thanks for shopping with us,',
      'The {{store_name}} Team',
      '',
      'You are receiving this because you checked out, contacted us, or tried to check out with us before.',
      'Unsubscribe: {{unsubscribe_url}}',
    ].join('\n');
  }, [discountCode, discountPercent, expiryFields]);

  // ── Preview ────────────────────────────────────────────────────────────────
  const sampleRecipient = selected[previewIdx] || selected[0] || {
    email:       'customer@example.com',
    name:        'Customer',
    storeName:   stores[0]?.name   || 'Your Store',
    storeDomain: stores[0]?.domain || 'yourstore.ca',
    storeUrl:    stores[0]?.domain ? `https://${stores[0].domain}` : 'https://yourstore.ca',
    movedToDomain: stores[0]?.movedToDomain || '',
  };

  const previewFields = {
    customer_email:  sampleRecipient.email,
    customer_name:   sampleRecipient.name || sampleRecipient.email,
    store_name:      sampleRecipient.storeName  || cleanDomain(sampleRecipient.storeDomain),
    store_url:       resolveStoreUrl(sampleRecipient, newDomain),
    store_domain:    cleanDomain(sampleRecipient.storeDomain) || cleanDomain(sampleRecipient.storeUrl),
    moved_banner:      buildMovedBannerHtml(sampleRecipient),
    moved_banner_text: buildMovedBannerText(sampleRecipient),
    unsubscribe_url: '#',
  };

  const previewHtml    = useMemo(() => applyMerge(htmlTemplate, previewFields), [htmlTemplate, previewFields]);
  const previewSubject = applyMerge(subjectTemplate, previewFields);

  // storeUrl/movedBanner are computed per recipient here (moved-aware), then
  // merged into {{store_url}} / {{moved_banner}} / {{moved_banner_text}} —
  // whichever recipients don't have a movedToDomain simply get an empty
  // banner, so the "we've moved" block disappears for them automatically.
  // storeDomain sent to the backend is the SEND identity (new domain once
  // moved) — see resolveSendDomain() — so from-address resolution and the
  // promo_sent_emails dedupe key track the domain the recipient is actually
  // being emailed under, not the stale one they used to buy from.
  const toPayloadRecipient = (r) => ({
    email:            r.email,
    name:             r.name || '',
    storeId:          r.storeId,
    storeName:        r.storeName  || cleanDomain(r.storeDomain),
    storeUrl:         resolveStoreUrl(r, newDomain),
    storeDomain:      resolveSendDomain(r) || cleanDomain(newDomain),
    movedToDomain:    r.movedToDomain || '',
    movedBanner:      buildMovedBannerHtml(r),
    movedBannerText:  buildMovedBannerText(r),
  });

  const basePayload = () => ({
    fromEmail: FROM_EMAIL,
    fromName:  FROM_NAME,
    subjectTemplate,
    htmlTemplate,
    textTemplate,
    discountCode,
    discountPercent,
    priceCutPercent,
    validDays,
    validUntil,
  });

  // ── Test send — works immediately (stores load on mount) ───────────────────
  const sendTest = async () => {
    const addr = testEmail.trim();
    if (!addr || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      setTestMsg({ ok: false, text: 'Enter a valid email address.' });
      return;
    }

    let ref;
    if (selected.length > 0) {
      const r = selected[0];
      ref = { email: addr, name: addr, storeId: r.storeId, storeName: r.storeName, storeDomain: r.storeDomain, storeUrl: r.storeUrl, movedToDomain: r.movedToDomain };
    } else if (stores.length > 0) {
      const s      = stores[0];
      const domain = cleanDomain(s.domain);
      ref = { email: addr, name: addr, storeId: s.id, storeName: s.name, storeDomain: domain, storeUrl: domain ? `https://${domain}` : '', movedToDomain: s.movedToDomain };
    } else {
      setTestMsg({ ok: false, text: 'No stores available yet. Wait a moment and retry.' });
      return;
    }

    setTestSending(true);
    setTestMsg(null);
    try {
      await api.sendPromoBlast({ ...basePayload(), test: true, recipients: [toPayloadRecipient(ref)] });
      setTestMsg({ ok: true, text: `Test sent — rendered as ${ref.storeName || ref.storeDomain}` });
    } catch (err) {
      setTestMsg({ ok: false, text: err?.message || 'Test send failed.' });
    } finally {
      setTestSending(false);
    }
  };

  // ── Blast send — daily cap, DB records sends per (email, store_domain) ──────
  const startSend = async () => {
    setConfirmOpen(false);
    if (!batchToSend.length) return;

    cancelRef.current = false;
    setSending(true);
    setResults(null);

    const total = batchToSend.length;
    let sent = 0, failed = 0;
    const errors    = [];
    const justSent  = []; // collect for DB record-sent call
    setProgress({ done: 0, total, sent: 0, failed: 0 });

    const payload = basePayload();

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) break;
      const r = batchToSend[i];
      try {
        const res = await api.sendPromoBlast({
          ...payload,
          recipients: [toPayloadRecipient(r)],
        });
        if ((res?.sent ?? 0) > 0 || (res?.failed ?? 1) === 0) {
          sent++;
          justSent.push({ email: r.email, storeDomain: resolveSendDomain(r) || cleanDomain(newDomain), storeName: r.storeName });
        } else {
          failed++;
          if (res?.errors?.length) errors.push(...res.errors);
        }
      } catch (err) {
        failed++;
        errors.push({ error: err?.message || 'Request failed', email: r.email });
      }
      setProgress({ done: i + 1, total, sent, failed });
    }

    // Record successful sends to DB, keyed by (email, store_domain), so they are
    // excluded from future loads until the store's rows are cleared.
    if (justSent.length > 0) {
      try {
        await api.recordPromoSent({ emails: justSent, discountCode });
      } catch (err) {
        console.error('[Promo] Failed to record sent emails to DB:', err);
      }
    }

    setSending(false);
    setResults({
      total, sent, failed,
      errors,
      cancelled: cancelRef.current,
    });

    // Cap counter lives server-side now — refresh it so the sidebar reflects
    // what actually went out (accounts for anything /send itself skipped).
    refreshCapStatus();

    // Auto-refresh recipients so sent emails disappear from the list
    if (sent > 0 && audience !== 'upload') {
      const storeIds = audience === 'specific' ? [...selectedStoreIds] : 'all';
      fetchRecipients(storeIds);
    }
  };

  const cancelSend = () => { cancelRef.current = true; };

  // ── Schedule a campaign — backend takes it from here ────────────────────────
  const startSchedule = async () => {
    setConfirmOpen(false);
    if (selected.length === 0) return;

    setScheduling(true);
    setScheduleResult(null);
    try {
      const payload = {
        ...basePayload(),
        name:          campaignName.trim() || `Promo ${new Date().toLocaleDateString()}`,
        recipients:    selected.map(toPayloadRecipient),
        batchSize,
        intervalHours,
        startAt,
        timezone,
      };
      const campaign = await api.createPromoCampaign(payload);
      setScheduleResult({ ok: true, campaign });
      setTab('campaigns');
      refreshCampaigns();
    } catch (err) {
      setScheduleResult({ ok: false, error: err?.message || 'Failed to schedule campaign.' });
    } finally {
      setScheduling(false);
    }
  };

  const runCampaignAction = async (id, action) => {
    setCampaignActionId(id);
    try {
      if (action === 'pause')  await api.pausePromoCampaign(id);
      if (action === 'resume') await api.resumePromoCampaign(id);
      if (action === 'cancel') await api.cancelPromoCampaign(id);
      await refreshCampaigns();
    } catch (err) {
      setError(err?.message || `Failed to ${action} campaign.`);
    } finally {
      setCampaignActionId(null);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => !excludedEmails.has(r.email));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="peb-root">
      <style>{PEB_STYLES}</style>

      {/* Header */}
      <div className="peb-header">
        <div className="peb-header-left">
          <button className="peb-back" onClick={onBack} type="button">← Back</button>
          <h2>📣 Promo Email Blast</h2>
        </div>
        <div className="peb-from">
          <span className="peb-from-label">Sending from</span>
          <span className="peb-from-email">{FROM_NAME} &lt;{FROM_EMAIL}&gt;</span>
        </div>
      </div>

      {error && (
        <div className="peb-alert peb-alert--error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} type="button">×</button>
        </div>
      )}

      <div className="peb-body">
        {/* ── Left panel ── */}
        <aside className="peb-panel">
          <div className="peb-section">
            <h3>1. Audience</h3>
            <label className="peb-radio">
              <input type="radio" checked={audience === 'all'} onChange={() => setAudienceMode('all')} />
              <span>All stores</span>
            </label>
            <label className="peb-radio">
              <input type="radio" checked={audience === 'specific'} onChange={() => setAudienceMode('specific')} />
              <span>Specific stores</span>
            </label>
            <label className="peb-radio">
              <input type="radio" checked={audience === 'upload'} onChange={() => setAudienceMode('upload')} />
              <span>Upload recipients</span>
            </label>

            {audience === 'specific' && (
              <div className="peb-store-list">
                {storesLoading ? (
                  <div className="peb-muted">Loading stores…</div>
                ) : stores.length === 0 ? (
                  <div className="peb-muted">No stores found.</div>
                ) : (
                  stores.map((s) => (
                    <label key={s.id} className="peb-check">
                      <input
                        type="checkbox"
                        checked={selectedStoreIds.has(s.id)}
                        onChange={() => toggleStore(s.id)}
                      />
                      <span className="peb-check-name">{s.name}</span>
                      <span className="peb-check-domain">{s.domain}</span>
                    </label>
                  ))
                )}
              </div>
            )}

            {audience === 'upload' && (
              <div className="peb-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelected}
                  className="peb-file-input"
                />
                <div className="peb-muted peb-mt8">
                  Columns: Customer, Email, Source Store, New Source Store (leave New Source Store
                  blank for anyone whose store hasn't moved).
                </div>
                {(uploadInvalidRows.length > 0 || uploadFlagged.length > 0) && (
                  <div className="peb-warn peb-mt8">
                    {uploadInvalidRows.length > 0 && <div>{uploadInvalidRows.length} row(s) skipped (bad/missing email or store).</div>}
                    {uploadFlagged.length > 0 && <div>{uploadFlagged.length} email(s) list two different store moves — skipped, needs manual review.</div>}
                  </div>
                )}
              </div>
            )}

            {audience !== 'upload' && (
              <button
                className="peb-btn peb-btn--primary peb-block"
                onClick={loadRecipients}
                disabled={recipientsLoading}
                type="button"
              >
                {recipientsLoading ? 'Loading…' : '🔄 Reload purchasers'}
              </button>
            )}

            {recipients.length > 0 && (
              <div className="peb-muted peb-mt8">
                {selected.length} of {recipients.length} selected
                {audience !== 'upload' && ' (already-sent customers excluded by DB)'}
              </div>
            )}

            {audience !== 'upload' && (
              <div className="peb-muted peb-mt8">
                Purchasers who already received a promo for their store are excluded automatically.
                To re-send to a whole store, clear its rows in <code>promo_sent_emails</code>, then
                hit "Reload purchasers". Unsubscribes are always honoured.
              </div>
            )}
          </div>

          {/* Domain updates — only relevant for uploaded lists carrying a
              Source Store → New Source Store mapping. Deliberately a separate
              confirmation from sending the campaign: updating stores.shop_domain
              affects the live storefront widget and OAuth, not just this email. */}
          {audience === 'upload' && domainPairs.length > 0 && (
            <div className="peb-section">
              <h3>Domain updates found</h3>
              <div className="peb-muted peb-mb8">
                {domainPairs.length} store(s) in this file moved domains. Applying updates their
                shop_domain in the database — independent of sending the campaign below.
              </div>
              <div className="peb-domain-list">
                {domainPairs.map((p) => (
                  <label key={p.sourceDomain} className="peb-check">
                    <input
                      type="checkbox"
                      checked={checkedPairs.has(p.sourceDomain)}
                      onChange={() => togglePairChecked(p.sourceDomain)}
                    />
                    <span className="peb-check-name">
                      {p.sourceDomain} → {p.newDomain}
                      {!p.matchedStoreId && <span className="peb-warn"> (no matching store on file)</span>}
                      {p.conflictStoreId && (
                        <span className="peb-warn"> ({p.newDomain} already belongs to "{p.conflictStoreName}" — resolve before applying)</span>
                      )}
                    </span>
                    <span className="peb-check-domain">{p.customerCount} customer{p.customerCount === 1 ? '' : 's'}</span>
                  </label>
                ))}
              </div>
              <button
                className="peb-btn peb-btn--ghost peb-block peb-mt8"
                onClick={applyDomainUpdates}
                disabled={applyingDomains || checkedPairs.size === 0}
                type="button"
              >
                {applyingDomains ? 'Applying…' : `Apply ${checkedPairs.size} domain update${checkedPairs.size === 1 ? '' : 's'}`}
              </button>
              {domainApplyResult && (
                <>
                  <div className={`peb-muted peb-mt8 ${domainApplyResult.error ? 'peb-warn' : ''}`}>
                    {domainApplyResult.error
                      ? domainApplyResult.error
                      : `${domainApplyResult.updated || 0} updated, ${(domainApplyResult.errors || []).length} failed.`}
                  </div>
                  {domainApplyResult.errors?.length > 0 && (
                    <div className="peb-errors">
                      {domainApplyResult.errors.slice(0, 10).map((e, i) => (
                        <div key={i}>{e.sourceDomain} → {e.newDomain}: {e.error}</div>
                      ))}
                      {domainApplyResult.errors.length > 10 && <div>…and {domainApplyResult.errors.length - 10} more</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Daily cap */}
          <div className="peb-section">
            <h3>Daily Cap</h3>
            {capLoading ? (
              <div className="peb-muted">Loading…</div>
            ) : (
              <>
                <div className="peb-cap-bar">
                  <div
                    className="peb-cap-fill"
                    style={{ width: `${Math.min(100, (sentToday / Math.max(1, dailyCap)) * 100)}%` }}
                  />
                </div>
                <div className="peb-muted peb-mt8">
                  {sentToday} / {dailyCap} sent today · <strong>{remainingToday}</strong> remaining
                </div>
                {batchToSend.length < selected.length && selected.length > 0 && (
                  <div className="peb-warn peb-mt8">
                    Only {batchToSend.length} of {selected.length} will send today (cap). Rest deferred.
                  </div>
                )}
                {capEditValue === '' ? (
                  <button className="peb-btn peb-btn--ghost peb-btn--sm peb-mt8" onClick={startEditingCap} type="button">
                    ✏️ Change cap
                  </button>
                ) : (
                  <div className="peb-row2 peb-mt8">
                    <input
                      className="peb-cap-input"
                      type="number"
                      min="1"
                      value={capEditValue}
                      onChange={(e) => setCapEditValue(e.target.value)}
                    />
                    <div className="peb-cap-actions">
                      <button className="peb-btn peb-btn--primary peb-btn--sm" onClick={saveCap} disabled={capSaving} type="button">
                        {capSaving ? '…' : 'Save'}
                      </button>
                      <button className="peb-btn peb-btn--ghost peb-btn--sm" onClick={cancelEditingCap} type="button">Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Discount */}
          <div className="peb-section">
            <h3>2. Discount</h3>
            <label className="peb-field">
              <span>Code</span>
              <input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                type="text"
              />
            </label>
            <label className="peb-field">
              <span>Storewide price cut %</span>
              <input
                value={priceCutPercent}
                onChange={(e) => setPriceCutPercent(Number(e.target.value) || 0)}
                type="number" min="1" max="100"
              />
            </label>
            <div className="peb-muted" style={{ marginBottom: 10 }}>
              The general everyday price drop ({'{{price_cut_percent}}'}), separate from the code below.
            </div>
            <div className="peb-row2">
              <label className="peb-field">
                <span>Code % Off</span>
                <input
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                  type="number" min="1" max="100"
                />
              </label>
              <label className="peb-field">
                <span>Valid (days)</span>
                <input
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value) || 0)}
                  type="number" min="1"
                />
              </label>
            </div>
            <label className="peb-field">
              <span>Valid until</span>
              <input
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                type="date"
              />
            </label>
            <div className="peb-muted">
              Leave blank to use "{validDays} days only" wording instead of a fixed date.
            </div>
          </div>

          {/* Website / destination link */}
          <div className="peb-section">
            <h3>3. Fallback Shop Link</h3>
            <label className="peb-field">
              <span>Fallback domain</span>
              <input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                type="text"
                placeholder="lexarajax.store"
              />
            </label>
            <div className="peb-muted">
              Used only if a recipient has no store URL on file. Shop Now normally links to each
              recipient's own store, and switches automatically to their new domain if that store
              has moved (see the recipient/store data's <code>movedToDomain</code> field).
            </div>
          </div>

          {/* Delivery: now vs scheduled */}
          <div className="peb-section">
            <h3>4. Delivery</h3>
            <label className="peb-radio">
              <input type="radio" checked={deliveryMode === 'now'} onChange={() => setDeliveryMode('now')} />
              <span>Send now</span>
            </label>
            <label className="peb-radio">
              <input type="radio" checked={deliveryMode === 'schedule'} onChange={() => setDeliveryMode('schedule')} />
              <span>Schedule</span>
            </label>

            {deliveryMode === 'schedule' && (
              <div className="peb-mt8">
                <label className="peb-field">
                  <span>Campaign name</span>
                  <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} type="text" placeholder="Promo campaign" />
                </label>
                <div className="peb-row2">
                  <label className="peb-field">
                    <span>Batch size</span>
                    <input value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value) || 1)} type="number" min="1" />
                  </label>
                  <label className="peb-field">
                    <span>Every (hours)</span>
                    <input value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value) || 1)} type="number" min="1" step="0.5" />
                  </label>
                </div>
                <label className="peb-field">
                  <span>Start</span>
                  <input value={startAt} onChange={(e) => setStartAt(e.target.value)} type="datetime-local" />
                </label>
                <label className="peb-field">
                  <span>Timezone</span>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="America/New_York">Eastern (EST/EDT)</option>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Manila">Philippines (PH)</option>
                  </select>
                </label>
                <div className="peb-muted">
                  Sends {batchSize} recipients every {intervalHours} hour{Number(intervalHours) === 1 ? '' : 's'},
                  starting at the time above, until the list is done. Runs on the server — this
                  page doesn't need to stay open. Still subject to the daily cap.
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Right: tabs ── */}
        <main className="peb-main">
          <div className="peb-tabs">
            <button className={`peb-tab ${tab === 'recipients' ? 'is-active' : ''}`} onClick={() => setTab('recipients')} type="button">
              Recipients ({selected.length})
            </button>
            <button className={`peb-tab ${tab === 'compose' ? 'is-active' : ''}`} onClick={() => setTab('compose')} type="button">
              Compose
            </button>
            <button className={`peb-tab ${tab === 'preview' ? 'is-active' : ''}`} onClick={() => setTab('preview')} type="button">
              Preview
            </button>
            <button className={`peb-tab ${tab === 'campaigns' ? 'is-active' : ''}`} onClick={() => { setTab('campaigns'); refreshCampaigns(); }} type="button">
              Campaigns {campaigns.length > 0 ? `(${campaigns.length})` : ''}
            </button>
          </div>

          {/* Recipients tab */}
          {tab === 'recipients' && (
            <div className="peb-tabpane">
              {recipientsLoading ? (
                <div className="peb-empty"><p>Loading purchasers…</p></div>
              ) : recipients.length === 0 ? (
                <div className="peb-empty">
                  <p>No recipients yet.</p>
                  <p className="peb-muted">
                    {audience === 'upload'
                      ? 'Upload a CSV/XLSX file with Customer, Email, Source Store, New Source Store columns.'
                      : 'Everyone eligible has already received a promo for their store, or no purchasers exist for this store selection. To re-send, clear the store\'s rows in promo_sent_emails.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="peb-toolbar">
                    <input
                      className="peb-search"
                      placeholder="Search email, name, or store…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="peb-btn peb-btn--ghost" onClick={selectAllFiltered} type="button">Select all</button>
                    <button className="peb-btn peb-btn--ghost" onClick={deselectAllFiltered} type="button">Clear</button>
                  </div>
                  <div className="peb-table-wrap">
                    <table className="peb-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={() => allFilteredSelected ? deselectAllFiltered() : selectAllFiltered()}
                            />
                          </th>
                          <th>Customer</th>
                          <th>Purchase store</th>
                          <th>Orders</th>
                          <th>Last order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.email} className={excludedEmails.has(r.email) ? 'is-excluded' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!excludedEmails.has(r.email)}
                                onChange={() => toggleRecipient(r.email)}
                              />
                            </td>
                            <td>
                              <div className="peb-cust-email">{r.email}</div>
                              {r.name && <div className="peb-cust-name">{r.name}</div>}
                            </td>
                            <td>
                              <div className="peb-cust-name">
                                {r.storeName || '—'}
                                {hasMoved(r) && <span className="peb-moved-badge">moved</span>}
                              </div>
                              <div className="peb-cust-email">
                                {r.storeDomain}{hasMoved(r) ? ` → ${cleanDomain(r.movedToDomain)}` : ''}
                              </div>
                            </td>
                            <td>{r.orderCount ?? '—'}</td>
                            <td>{fmtDate(r.lastOrderAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="peb-muted peb-mt8">
                    Showing {filtered.length} of {recipients.length}.
                    {audience !== 'upload' && ' Customers who already received a promo for their purchase store are excluded automatically by the database.'}
                    {' '}Duplicate emails merged to one.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Compose tab */}
          {tab === 'compose' && (
            <div className="peb-tabpane peb-compose">
              <label className="peb-field">
                <span>Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} type="text" />
              </label>
              <label className="peb-field">
                <span>Email HTML</span>
                <textarea className="peb-html-editor" value={body} onChange={(e) => setBody(e.target.value)} rows={30} spellCheck="false" />
              </label>
              <div className="peb-placeholders">
                <strong>HTML placeholders:</strong>{' '}
                <code>{'{{customer_email}}'}</code> <code>{'{{customer_name}}'}</code>{' '}
                <code>{'{{store_name}}'}</code> <code>{'{{store_url}}'}</code>{' '}
                <code>{'{{store_domain}}'}</code> <code>{'{{moved_banner}}'}</code>{' '}
                <code>{'{{price_cut_percent}}'}</code> <code>{'{{discount_code}}'}</code>{' '}
                <code>{'{{discount_percent}}'}</code> <code>{'{{valid_days}}'}</code>{' '}
                <code>{'{{valid_until}}'}</code> <code>{'{{valid_until_short}}'}</code>{' '}
                <code>{'{{valid_until_with_weekday}}'}</code> <code>{'{{expiry_subject}}'}</code>{' '}
                <code>{'{{expiry_header}}'}</code> <code>{'{{expiry_sentence}}'}</code>{' '}
                <code>{'{{unsubscribe_url}}'}</code>
                <div className="peb-mt8">
                  Store and unsubscribe placeholders are filled separately for every recipient.{' '}
                  <code>{'{{store_url}}'}</code> points at each recipient's own store, and switches
                  automatically to their new domain if that store has a <code>movedToDomain</code> on
                  file. <code>{'{{moved_banner}}'}</code> renders a "we've moved" block only for those
                  recipients, and everyone else gets nothing there, no banner. The Fallback Shop Link field
                  in the left sidebar is only used when a recipient has no store URL on file at all.{' '}
                  Discount code, percentage, and expiration placeholders use the values from the Discount panel on the left.
                </div>
              </div>
            </div>
          )}

          {/* Preview tab */}
          {tab === 'preview' && (
            <div className="peb-tabpane">
              <div className="peb-toolbar">
                {selected.length > 0 ? (
                  <label className="peb-field peb-field--inline">
                    <span>Preview as</span>
                    <select value={previewIdx} onChange={(e) => setPreviewIdx(Number(e.target.value))}>
                      {selected.slice(0, 100).map((r, i) => (
                        <option key={r.email} value={i}>
                          {r.email} — {r.storeName || r.storeDomain}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="peb-muted">Using sample data.</span>
                )}
              </div>
              <div className="peb-subjline"><strong>Subject:</strong> {previewSubject}</div>
              <iframe className="peb-iframe" title="Email preview" srcDoc={previewHtml} />
            </div>
          )}

          {/* Campaigns tab */}
          {tab === 'campaigns' && (
            <div className="peb-tabpane">
              {campaignsLoading ? (
                <div className="peb-empty"><p>Loading campaigns…</p></div>
              ) : campaigns.length === 0 ? (
                <div className="peb-empty">
                  <p>No campaigns yet.</p>
                  <p className="peb-muted">Switch Delivery to "Schedule" on the left to create one.</p>
                </div>
              ) : (
                <div className="peb-campaign-list">
                  {campaigns.map((c) => {
                    const progressPct = c.totalRecipients
                      ? Math.round(((c.sentCount + c.failedCount + c.skippedCount) / c.totalRecipients) * 100)
                      : 0;
                    return (
                      <div key={c.id} className="peb-campaign-card">
                        <div className="peb-campaign-head">
                          <div>
                            <strong>{c.name}</strong>
                            <span className={`peb-campaign-status peb-campaign-status--${c.status}`}>{c.status}</span>
                          </div>
                          <div className="peb-campaign-actions">
                            {(c.status === 'scheduled' || c.status === 'running') && (
                              <button className="peb-btn peb-btn--ghost peb-btn--sm" disabled={campaignActionId === c.id} onClick={() => runCampaignAction(c.id, 'pause')} type="button">Pause</button>
                            )}
                            {c.status === 'paused' && (
                              <button className="peb-btn peb-btn--ghost peb-btn--sm" disabled={campaignActionId === c.id} onClick={() => runCampaignAction(c.id, 'resume')} type="button">Resume</button>
                            )}
                            {['scheduled', 'running', 'paused'].includes(c.status) && (
                              <button className="peb-btn peb-btn--ghost peb-btn--sm" disabled={campaignActionId === c.id} onClick={() => runCampaignAction(c.id, 'cancel')} type="button">Cancel</button>
                            )}
                          </div>
                        </div>
                        <div className="peb-progress">
                          <div className="peb-progress-bar" style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="peb-muted peb-mt8">
                          {c.sentCount} sent · {c.failedCount} failed · {c.skippedCount} skipped · {c.totalRecipients} total
                          {' · '}{c.batchSize} every {c.intervalHours}h ({c.timezone})
                          {c.nextFireAt && c.status !== 'completed' && c.status !== 'cancelled' && (
                            <> · next fire {new Date(c.nextFireAt).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <div className="peb-footer">
        <div className="peb-test">
          <input
            className="peb-search"
            placeholder="Send a test to me@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            type="email"
          />
          <button
            className="peb-btn peb-btn--ghost"
            onClick={sendTest}
            disabled={testSending || !testEmail || stores.length === 0}
            type="button"
          >
            {testSending ? 'Sending…' : '✉️ Send test'}
          </button>
          {testMsg && (
            <span className={`peb-test-msg ${testMsg.ok ? 'ok' : 'err'}`}>{testMsg.text}</span>
          )}
          {!testMsg && stores.length > 0 && (
            <span className="peb-test-hint">
              {selected.length > 0
                ? <>Renders as: <strong>{selected[0].storeName || selected[0].storeDomain}</strong> (purchase store)</>
                : <>Renders as: <strong>{stores[0].name || stores[0].domain}</strong> (first store)</>}
            </span>
          )}
        </div>
        {deliveryMode === 'schedule' ? (
          <button
            className="peb-btn peb-btn--send"
            onClick={() => setConfirmOpen(true)}
            disabled={scheduling || selected.length === 0}
            type="button"
          >
            📅 Schedule {selected.length} recipient{selected.length === 1 ? '' : 's'}
          </button>
        ) : (
          <button
            className="peb-btn peb-btn--send"
            onClick={() => setConfirmOpen(true)}
            disabled={sending || batchToSend.length === 0}
            type="button"
          >
            🚀 Send to {batchToSend.length} recipient{batchToSend.length === 1 ? '' : 's'}
            {batchToSend.length < selected.length
              ? ` (${selected.length - batchToSend.length} deferred)`
              : ''}
          </button>
        )}
      </div>

      {/* Confirm modal */}
      {confirmOpen && deliveryMode === 'schedule' && (
        <div className="peb-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="peb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm schedule</h3>
            <p>
              Scheduling <strong>{selected.length}</strong> recipient{selected.length === 1 ? '' : 's'}, sending{' '}
              <strong>{batchSize}</strong> every <strong>{intervalHours}h</strong>, starting{' '}
              <strong>{startAt.replace('T', ' ')}</strong> ({timezone}).
            </p>
            <p className="peb-muted">Subject: {previewSubject}</p>
            <p className="peb-warn">
              Runs on the server from here — still subject to the daily cap, and to unsubscribes
              recorded at send time.
            </p>
            <div className="peb-modal-actions">
              <button className="peb-btn peb-btn--ghost" onClick={() => setConfirmOpen(false)} type="button">Cancel</button>
              <button className="peb-btn peb-btn--send" onClick={startSchedule} type="button">Schedule</button>
            </div>
          </div>
        </div>
      )}
      {confirmOpen && deliveryMode === 'now' && (
        <div className="peb-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="peb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm blast</h3>
            <p>
              Sending to <strong>{batchToSend.length}</strong> recipient{batchToSend.length === 1 ? '' : 's'}{' '}
              from <strong>{FROM_EMAIL}</strong>.
            </p>
            {selected.length > batchToSend.length && (
              <p className="peb-muted">
                ⏳ {selected.length - batchToSend.length} more deferred — they'll go in tomorrow's batch (daily cap).
              </p>
            )}
            <p className="peb-muted">Subject: {previewSubject}</p>
            {validUntil && (
              <p className="peb-muted">Discount valid until: <strong>{fmtLongDate(validUntil)}</strong></p>
            )}
            <p className="peb-warn">
              Customers who already received a promo for their store are excluded by the database. This cannot be undone.
            </p>
            <div className="peb-modal-actions">
              <button className="peb-btn peb-btn--ghost" onClick={() => setConfirmOpen(false)} type="button">Cancel</button>
              <button className="peb-btn peb-btn--send" onClick={startSend} type="button">Send now</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule result overlay */}
      {scheduleResult && (
        <div className="peb-overlay" onClick={() => setScheduleResult(null)}>
          <div className="peb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{scheduleResult.ok ? 'Campaign scheduled' : 'Could not schedule'}</h3>
            {scheduleResult.ok ? (
              <p>
                "{scheduleResult.campaign.name}" will send {scheduleResult.campaign.batchSize} every{' '}
                {scheduleResult.campaign.intervalHours}h, first fire{' '}
                {new Date(scheduleResult.campaign.nextFireAt).toLocaleString()}. See the Campaigns tab for progress.
              </p>
            ) : (
              <p className="peb-warn">{scheduleResult.error}</p>
            )}
            <div className="peb-modal-actions">
              <button className="peb-btn peb-btn--primary" onClick={() => setScheduleResult(null)} type="button">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sending / results overlay */}
      {(sending || results) && (
        <div className="peb-overlay">
          <div className="peb-modal">
            {sending ? (
              <>
                <h3>Sending…</h3>
                <div className="peb-progress">
                  <div
                    className="peb-progress-bar"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="peb-muted">
                  {progress.done} / {progress.total} processed · {progress.sent} sent · {progress.failed} failed
                </p>
                <div className="peb-modal-actions">
                  <button className="peb-btn peb-btn--ghost" onClick={cancelSend} type="button">Stop</button>
                </div>
              </>
            ) : (
              <>
                <h3>{results.cancelled ? 'Stopped' : 'Done'}</h3>
                <p>
                  ✅ <strong>{results.sent}</strong> sent · ❌ <strong>{results.failed}</strong> failed (of {results.total})
                </p>
                <p className="peb-muted">📅 {Math.max(0, dailyCap - sentToday)} sends remaining today.</p>
                {results.errors?.length > 0 && (
                  <div className="peb-errors">
                    {results.errors.slice(0, 8).map((e, i) => (
                      <div key={i}>{e.error || e}{e.email ? ` (${e.email})` : ''}</div>
                    ))}
                    {results.errors.length > 8 && <div>…and {results.errors.length - 8} more</div>}
                  </div>
                )}
                <div className="peb-modal-actions">
                  <button className="peb-btn peb-btn--primary" onClick={() => setResults(null)} type="button">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PEB_STYLES = `
.peb-root{display:flex;flex-direction:column;height:100%;background:#f9fafb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
.peb-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#fff;border-bottom:1px solid #e5e7eb;}
.peb-header-left{display:flex;align-items:center;gap:14px;}
.peb-header h2{margin:0;font-size:18px;}
.peb-back{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;}
.peb-from{text-align:right;font-size:12px;}
.peb-from-label{display:block;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-size:10px;}
.peb-from-email{font-weight:600;color:#4f46e5;}
.peb-alert{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;font-size:14px;}
.peb-alert--error{background:#fef2f2;color:#b91c1c;border-bottom:1px solid #fecaca;}
.peb-alert button{background:none;border:none;font-size:18px;cursor:pointer;color:inherit;}
.peb-body{flex:1;display:flex;min-height:0;}
.peb-panel{width:300px;flex-shrink:0;background:#fff;border-right:1px solid #e5e7eb;overflow-y:auto;padding:16px;}
.peb-section{margin-bottom:24px;}
.peb-section h3{margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;}
.peb-radio{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:14px;cursor:pointer;}
.peb-store-list{max-height:220px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin:8px 0;}
.peb-domain-list{max-height:260px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin:8px 0;}
.peb-upload{margin-top:8px;}
.peb-file-input{width:100%;font-size:13px;}
.peb-check{display:flex;align-items:center;gap:8px;padding:5px 4px;font-size:13px;cursor:pointer;}
.peb-check-name{flex:1;}
.peb-check-domain{color:#9ca3af;font-size:11px;}
.peb-moved-badge{margin-left:6px;background:#eef2ff;color:#4f46e5;font-size:10px;font-weight:700;text-transform:uppercase;padding:1px 6px;border-radius:4px;}
.peb-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;font-size:13px;color:#374151;}
.peb-field--inline{flex-direction:row;align-items:center;gap:8px;margin:0;}
.peb-field input,.peb-field select,.peb-field textarea{border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:14px;font-family:inherit;width:100%;box-sizing:border-box;}
.peb-field textarea{resize:vertical;line-height:1.5;}
.peb-html-editor{font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace!important;font-size:12px!important;line-height:1.5!important;tab-size:2;}
.peb-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.peb-cap-input{border:1px solid #d1d5db;border-radius:8px;padding:6px 10px;font-size:13px;width:100%;box-sizing:border-box;}
.peb-cap-actions{display:flex;gap:6px;}
.peb-btn{border:none;border-radius:8px;padding:9px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
.peb-btn:disabled{opacity:.5;cursor:not-allowed;}
.peb-btn--primary{background:#4f46e5;color:#fff;}
.peb-btn--ghost{background:#fff;border:1px solid #d1d5db;color:#374151;}
.peb-btn--send{background:#16a34a;color:#fff;}
.peb-btn--sm{padding:5px 10px;font-size:12px;}
.peb-block{width:100%;margin-top:8px;}
.peb-muted{color:#9ca3af;font-size:12px;}
.peb-muted code{background:#eef2ff;color:#4f46e5;padding:1px 5px;border-radius:4px;font-size:11px;}
.peb-warn{color:#b45309;font-size:12px;}
.peb-mt8{margin-top:8px;}
.peb-mb8{margin-bottom:8px;}
.peb-cap-bar{height:8px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin-top:4px;}
.peb-cap-fill{height:100%;background:#4f46e5;transition:width .3s;}
.peb-main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;}
.peb-tabs{display:flex;gap:4px;padding:12px 16px 0;background:#fff;border-bottom:1px solid #e5e7eb;}
.peb-tab{border:none;background:none;padding:10px 16px;font-size:14px;font-weight:600;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;}
.peb-tab.is-active{color:#4f46e5;border-bottom-color:#4f46e5;}
.peb-tabpane{flex:1;overflow-y:auto;padding:16px;min-height:0;}
.peb-empty{text-align:center;padding:48px 16px;}
.peb-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;}
.peb-search{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:14px;font-family:inherit;}
.peb-table-wrap{border:1px solid #e5e7eb;border-radius:10px;overflow:auto;background:#fff;}
.peb-table{width:100%;border-collapse:collapse;font-size:13px;}
.peb-table th{text-align:left;padding:10px 12px;background:#f9fafb;color:#6b7280;font-weight:600;position:sticky;top:0;border-bottom:1px solid #e5e7eb;}
.peb-table td{padding:8px 12px;border-bottom:1px solid #f3f4f6;}
.peb-table tr.is-excluded{opacity:.4;}
.peb-cust-email{font-weight:500;}
.peb-cust-name{color:#9ca3af;font-size:12px;}
.peb-compose{max-width:760px;}
.peb-placeholders{font-size:12px;color:#6b7280;margin-top:8px;line-height:2;}
.peb-placeholders code{background:#eef2ff;color:#4f46e5;padding:2px 6px;border-radius:5px;font-size:11px;}
.peb-subjline{padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;font-size:14px;}
.peb-iframe{width:100%;height:560px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;}
.peb-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;background:#fff;border-top:1px solid #e5e7eb;}
.peb-test{display:flex;align-items:center;gap:8px;flex:1;}
.peb-test-msg{font-size:12px;white-space:nowrap;}
.peb-test-msg.ok{color:#16a34a;}
.peb-test-msg.err{color:#b91c1c;}
.peb-test-hint{font-size:12px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.peb-test-hint strong{color:#374151;}
.peb-overlay{position:fixed;inset:0;background:rgba(17,24,39,.5);display:flex;align-items:center;justify-content:center;z-index:1000;}
.peb-modal{background:#fff;border-radius:14px;padding:24px;width:min(480px,90vw);}
.peb-modal h3{margin:0 0 12px;}
.peb-modal p{margin:0 0 10px;font-size:14px;line-height:1.5;}
.peb-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;}
.peb-progress{height:10px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin:12px 0;}
.peb-progress-bar{height:100%;background:#4f46e5;transition:width .2s;}
.peb-errors{max-height:140px;overflow-y:auto;background:#fef2f2;border-radius:8px;padding:10px;font-size:12px;color:#b91c1c;margin:8px 0;}
.peb-campaign-list{display:flex;flex-direction:column;gap:12px;}
.peb-campaign-card{border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;background:#fff;}
.peb-campaign-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}
.peb-campaign-status{margin-left:8px;font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:#f3f4f6;color:#6b7280;}
.peb-campaign-status--running{background:#eef2ff;color:#4f46e5;}
.peb-campaign-status--scheduled{background:#fffbeb;color:#b45309;}
.peb-campaign-status--completed{background:#f0fdf4;color:#16a34a;}
.peb-campaign-status--paused{background:#f3f4f6;color:#6b7280;}
.peb-campaign-status--cancelled{background:#fef2f2;color:#b91c1c;}
.peb-campaign-actions{display:flex;gap:6px;flex-shrink:0;}
@media(max-width:860px){.peb-body{flex-direction:column;}.peb-panel{width:auto;border-right:none;border-bottom:1px solid #e5e7eb;}}
`;
