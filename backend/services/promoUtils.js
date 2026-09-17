// backend/services/promoUtils.js
// Small pure helpers shared between the promo routes, the send helper, and
// the campaign scheduler/worker — kept dependency-free so any of them can
// require this without pulling in Express, BullMQ, etc.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function cleanDomain(d) {
  return String(d || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
}

function applyMerge(template, fields) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in fields ? fields[k] : m));
}

module.exports = { EMAIL_RE, cleanDomain, applyMerge };
