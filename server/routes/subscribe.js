/* Care-plan subscriptions via ABA PayWay.
 *
 *  GET  /api/plans                     public plan list (no secrets)
 *  POST /api/subscribe                 {plan_id,name,email,phone} -> checkout_url
 *  GET  /subscribe/checkout/:id        renders the signed ABA sign-up form
 *  POST /api/payway/callback           payment callback (verified, idempotent)
 *  POST /api/payway/token-callback     stores the recurring token (pwt)
 *  GET  /subscribe/return              friendly landing page after ABA
 *
 * Rules: amount always from the plan (never the browser); nothing is marked
 * paid unless a callback signature verifies; pwt is never sent to the browser
 * or logged.
 */
'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const payway = require('../lib/payway');
const { publicPlans, getPlan } = require('../lib/subPlans');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'\-]*$/;
const PHONE_RE = /^\+?[0-9][0-9 \-]{5,19}$/;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function baseUrl(req) {
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}
function addMonthISO(fromISO, months) {
  const d = new Date(fromISO + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // clamp to end of shorter month
  return d.toISOString().slice(0, 10);
}

const subscribeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } });

// ── public plans ──────────────────────────────────────────────────────────
router.get('/api/plans', (req, res) => res.json(publicPlans()));

// ── create a subscription ──────────────────────────────────────────────────
router.post('/api/subscribe', subscribeLimiter, (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').trim();
  const plan = getPlan(String(b.plan_id || '').trim());

  if (!name || !NAME_RE.test(name)) return res.status(400).json({ error: 'Please enter your name (letters only).' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ error: 'A valid phone number is required.' });
  if (!plan) return res.status(400).json({ error: 'That plan is not available.' });

  const id = crypto.randomUUID();
  const ctid = payway.generateCtid();
  const tranId = payway.generateTranId();

  db.prepare(`INSERT INTO subscriptions (id, plan_slug, plan_name, name, email, phone, amount, currency, frequency, status, ctid, first_tran_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
    .run(id, plan.slug, plan.name, name, email, phone, plan.price, plan.currency, plan.frequency, ctid, tranId);
  db.prepare(`INSERT INTO subscription_payments (subscription_id, tran_id, kind, amount, currency, status, note)
              VALUES (?, ?, 'registration', ?, ?, 'initiated', 'Subscription sign-up')`)
    .run(id, tranId, plan.price, plan.currency);

  res.status(201).json({ success: true, subscription_id: id, checkout_url: `${baseUrl(req)}/subscribe/checkout/${id}` });
});

// ── checkout page: signed ABA sign-up form that auto-submits ───────────────
router.get('/subscribe/checkout/:id', (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).send('Subscription not found.');
  if (!payway.isConfigured()) {
    return res.status(503).send('<p style="font-family:Arial;padding:40px">Payment is not configured yet. Please contact us to complete your subscription.</p>');
  }

  let form;
  try {
    form = payway.buildSubscriptionCheckout({
      tranId: sub.first_tran_id,
      ctid: sub.ctid,
      amount: sub.amount,
      currency: sub.currency,
      frequency: sub.frequency,
      fullName: sub.name,
      email: sub.email,
      phone: sub.phone,
      paymentOption: process.env.ABA_PAYMENT_OPTION || 'cards',
      returnUrl: `${baseUrl(req)}/api/payway/callback`,
      continueSuccessUrl: `${baseUrl(req)}/subscribe/return?id=${sub.id}`,
      cancelUrl: `${baseUrl(req)}/subscribe/return?id=${sub.id}&cancel=1`,
      returnParams: sub.id,
      items: [{ name: sub.plan_name, quantity: 1, price: String(sub.amount) }],
    });
  } catch (e) {
    console.error('payway checkout build failed:', e.message);
    return res.status(500).send('Could not start checkout. Please try again.');
  }

  const inputs = Object.entries(form.fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('\n      ');

  res.send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow"><title>Redirecting to secure payment…</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f1ea;color:#161513;font-family:Arial,Helvetica,sans-serif}
.card{text-align:center;padding:40px 28px}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#d9333f}
h1{font-size:20px;margin:16px 0 6px}p{color:#555;font-size:14px}.amt{margin:14px 0 22px;font-size:15px}
.spin{width:34px;height:34px;border:3px solid rgba(22,21,19,.15);border-top-color:#d9333f;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 18px}
@keyframes s{to{transform:rotate(360deg)}}button{font:inherit;padding:12px 24px;border:1px solid #161513;background:#161513;color:#f4f1ea;border-radius:999px;cursor:pointer}</style>
</head><body>
<div class="card">
  <div class="spin"></div>
  <div><span class="dot"></span> MOONSTAR STUDIO</div>
  <h1>Taking you to secure payment…</h1>
  <p>Redirecting to ABA PayWay to set up your subscription.</p>
  <div class="amt">${esc(sub.plan_name)} — $${esc(sub.amount)} ${esc(sub.currency)}/month</div>
  <form id="payway-form" method="post" action="${esc(form.actionUrl)}">
      ${inputs}
      <noscript><button type="submit">Continue to payment</button></noscript>
  </form>
</div>
<script src="/js/payway-autosubmit.js"></script>
</body></html>`);
});

// ── payment callback (idempotent) ──────────────────────────────────────────
router.post('/api/payway/callback', (req, res) => {
  const payload = req.body || {};
  const sig = req.get('x-payway-hmac-sha512');
  if (!payway.verifyCallbackSignature(payload, sig)) {
    console.warn('payway callback: bad signature tran_id=%s', payload.tran_id);
    return res.status(400).json({ error: 'invalid signature' });
  }
  const tranId = payload.tran_id;
  const pay = db.prepare('SELECT * FROM subscription_payments WHERE tran_id = ?').get(tranId);
  if (!pay) return res.status(404).json({ error: 'unknown transaction' });
  if (pay.status === 'successful') return res.json({ success: true }); // idempotent

  const ok = String(payload.status) === '0';
  db.prepare('UPDATE subscription_payments SET status = ?, apv = ?, note = ? WHERE tran_id = ?')
    .run(ok ? 'successful' : 'failed', String(payload.apv || ''), ok ? 'Payment approved' : 'Payment declined', tranId);

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(pay.subscription_id);
  if (sub && ok) {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`UPDATE subscriptions SET status = 'active', started_at = COALESCE(started_at, datetime('now')),
                next_billing_date = ?, last_tran_id = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(addMonthISO(today, 1), tranId, sub.id);
  } else if (sub) {
    db.prepare("UPDATE subscriptions SET status = 'payment_failed', updated_at = datetime('now') WHERE id = ?").run(sub.id);
  }
  res.json({ success: true });
});

// ── token callback: store the recurring credential (pwt) ───────────────────
router.post('/api/payway/token-callback', (req, res) => {
  const payload = req.body || {};
  const sig = req.get('x-payway-hmac-sha512');
  if (!payway.verifyCallbackSignature(payload, sig)) return res.status(400).json({ error: 'invalid signature' });
  const cred = payload.payment_credential || {};
  if (!cred.ctid) return res.status(400).json({ error: 'missing ctid' });
  const sub = db.prepare('SELECT * FROM subscriptions WHERE ctid = ?').get(cred.ctid);
  if (!sub) return res.status(404).json({ error: 'unknown ctid' });
  db.prepare(`UPDATE subscriptions SET pwt = ?, token_status = ?, payment_method_masked = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(String(cred.pwt || ''), cred.status != null ? Number(cred.status) : null, String(cred.source_of_fund || ''), sub.id);
  res.json({ success: true });
});

// ── return landing page ────────────────────────────────────────────────────
router.get('/subscribe/return', (req, res) => {
  const sub = db.prepare('SELECT status, plan_name FROM subscriptions WHERE id = ?').get(req.query.id || '');
  const cancelled = req.query.cancel === '1';
  const active = sub && sub.status === 'active';
  const title = cancelled ? 'Payment cancelled' : active ? 'You’re subscribed! 🎉' : 'Thanks — almost there';
  const msg = cancelled
    ? 'No worries — your card was not charged. You can subscribe again anytime.'
    : active
      ? `Your ${esc(sub ? sub.plan_name : 'care')} plan is active. A receipt is on its way to your email.`
      : 'We’re confirming your payment with the bank. You’ll get an email once it’s active.';
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f1ea;color:#161513;font-family:Arial,Helvetica,sans-serif;text-align:center}
.card{max-width:440px;padding:44px 28px}h1{font-size:22px;margin:0 0 10px}p{color:#555;line-height:1.6}a{display:inline-block;margin-top:22px;padding:12px 26px;background:#161513;color:#f4f1ea;border-radius:999px;text-decoration:none}</style></head>
<body><div class="card"><h1>${esc(title)}</h1><p>${msg}</p><a href="/">Back to MoonStar Studio</a></div></body></html>`);
});

// ── admin: PayWay config check (never reveals the key itself) ───────────────
router.get('/api/admin/payway-status', requireAuth, (req, res) => {
  const c = payway.config();
  res.json({
    configured: payway.isConfigured(),
    environment: c.environment,
    base_url: c.baseUrl,
    merchant_id: c.merchantId,
    api_key_length: (c.apiKey || '').length,
    api_key_has_whitespace: /\s/.test(c.apiKey || ''),
    hmac_key_length: (c.hmacKey || '').length,
    base64_return_url: c.base64ReturnUrl,
    public_base_url: process.env.PUBLIC_BASE_URL || '(not set)',
  });
});

// ── admin ───────────────────────────────────────────────────────────────────
router.get('/api/admin/subscriptions', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT id, plan_name, name, email, phone, amount, currency, status, token_status,
    payment_method_masked, next_billing_date, started_at, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 500`).all();
  res.json(rows);
});
router.post('/api/admin/subscriptions/:id/cancel', requireAuth, (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(sub.id);
  // NOTE: once ABA COF is live, also call payway.removeToken(ctid, pwt) here.
  res.json({ success: true });
});

module.exports = router;
