/*
 * ABA PayWay client for the MoonStar subscription system.
 *
 * Implements ABA's documented signing and flows (https://developer.payway.com.kh):
 *   - Subscription sign-up  : Purchase API, token_flag=CITR_FIX (recurring token)
 *   - Monthly charge        : Payment API, token_flag=MITR_FIX  (needs COF approval)
 *   - Check Transaction / callback verification
 *
 * Security:
 *   - The API key lives ONLY in env (ABA_API_KEY). Never in client code or logs.
 *   - Amounts always come from our DB, never the browser.
 *   - pwt (PayWay token) is never logged or returned to the browser.
 */
'use strict';

const crypto = require('crypto');

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const BASE_URLS = {
  sandbox: 'https://checkout-sandbox.payway.com.kh/',
  production: 'https://checkout.payway.com.kh/',
};

const PURCHASE_PATH = 'api/payment-gateway/v1/payments/purchase';
const PAYMENT_CREDENTIAL_PATH = 'api/payment-gateway/v3/purchase/payment-credential';
const CHECK_TXN_PATH = 'api/payment-gateway/v1/payments/check-transaction-2';

const TOKEN_FLAG_REGISTER = 'CITR_FIX'; // first-time sign-up (creates the token)
const TOKEN_FLAG_CHARGE = 'MITR_FIX';   // recurring charge with the stored token

// Exact Purchase hash order per ABA docs (developer.payway.com.kh, 01-purchase).
// Note: token_flag/frequency and ctid/view_type/payment_gate are NOT hashed.
const PURCHASE_HASH_FIELDS = [
  'req_time', 'merchant_id', 'tran_id', 'amount', 'items', 'shipping',
  'firstname', 'lastname', 'email', 'phone', 'type', 'payment_option',
  'return_url', 'cancel_url', 'continue_success_url', 'return_deeplink',
  'currency', 'custom_fields', 'return_params', 'payout', 'lifetime',
  'additional_params', 'google_pay_token', 'skip_success_page',
];

// Order for the recurring Payment (payment-credential) hash.
const PAYMENT_HASH_FIELDS = [
  'request_time', 'merchant_id', 'tran_id', 'amount', 'currency', 'items',
  'ctid', 'pwt', 'first_name', 'last_name', 'email', 'phone', 'purchase_type',
  'callback_url', 'custom_fields', 'return_params', 'payout', 'token_flag', 'shipping_fee',
];

// -- config ----------------------------------------------------------------
function config() {
  const environment = (process.env.ABA_ENVIRONMENT || 'sandbox').toLowerCase();
  const baseUrl = (process.env.ABA_API_URL || BASE_URLS[environment] || BASE_URLS.sandbox).replace(/\/+$/, '') + '/';
  return {
    environment,
    baseUrl,
    merchantId: process.env.ABA_MERCHANT_ID || '',
    apiKey: process.env.ABA_API_KEY || '',
    hmacKey: process.env.ABA_HMAC_KEY || process.env.ABA_API_KEY || '',
    base64ReturnUrl: String(process.env.ABA_BASE64_RETURN_URL || 'true') === 'true',
  };
}
function isConfigured() { const c = config(); return !!(c.merchantId && c.apiKey); }

// -- helpers ---------------------------------------------------------------
function requestTime() {
  // ABA expects yyyyMMddHHmmss (UTC).
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}
function b64(str) { return Buffer.from(String(str), 'utf8').toString('base64'); }
function b64Json(obj) { return b64(JSON.stringify(obj)); }
function randomAlnum(n) { let s = ''; for (let i = 0; i < n; i++) s += ALNUM[crypto.randomInt(ALNUM.length)]; return s; }
function generateCtid() { return 'MS' + randomAlnum(20); }               // 22 chars, letters+digits
function generateTranId() {
  const t = new Date();
  const stamp = t.getUTCFullYear().toString().slice(2)
    + String(t.getUTCMonth() + 1).padStart(2, '0') + String(t.getUTCDate()).padStart(2, '0')
    + String(t.getUTCHours()).padStart(2, '0') + String(t.getUTCMinutes()).padStart(2, '0') + String(t.getUTCSeconds()).padStart(2, '0');
  return (stamp + randomAlnum(8)).slice(0, 20);
}
function formatAmount(amount, currency) {
  const n = Number(amount);
  if (String(currency).toUpperCase() === 'KHR') return String(Math.max(100, Math.round(n)));
  return n.toFixed(2);
}
function splitName(fullName) {
  const clean = String(fullName || '').replace(/[^A-Za-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return ['Customer', ''];
  const parts = clean.split(' ');
  const first = parts.shift().slice(0, 20);
  const last = parts.join(' ').slice(0, 20);
  return [first, last];
}
function sign(values, key) {
  const data = values.map((v) => (v == null ? '' : String(v))).join('');
  return crypto.createHmac('sha512', key).update(data, 'utf8').digest('base64');
}

// PHP-style json_encode (escapes forward slashes) so nested callback objects
// hash the same way ABA signed them. CONFIRM IN SANDBOX for exact unicode.
function phpJsonEncode(obj) { return JSON.stringify(obj).replace(/\//g, '\\/'); }

// -- 1. Subscription sign-up (CITR_FIX) form -------------------------------
function buildSubscriptionCheckout(opts) {
  const c = config();
  if (!c.merchantId) throw new Error('ABA_MERCHANT_ID is not configured.');
  const [firstname, lastname] = splitName(opts.fullName);
  const items = opts.items ? b64Json(opts.items) : '';
  const returnUrl = opts.returnUrl ? (c.base64ReturnUrl ? b64(opts.returnUrl) : opts.returnUrl) : '';

  const fields = {
    req_time: requestTime(),
    merchant_id: c.merchantId,
    tran_id: opts.tranId,
    amount: formatAmount(opts.amount, opts.currency),
    items,
    shipping: '',
    firstname,
    lastname,
    email: (opts.email || '').slice(0, 50),
    phone: (opts.phone || '').slice(0, 20),
    type: 'purchase',
    payment_option: opts.paymentOption || 'cards',
    return_url: returnUrl,
    cancel_url: opts.cancelUrl || '',
    continue_success_url: opts.continueSuccessUrl || '',
    return_deeplink: '',
    currency: opts.currency,
    custom_fields: opts.customFields ? b64Json(opts.customFields) : '',
    return_params: opts.returnParams || '',
    payout: '',
    lifetime: opts.lifetime ? String(opts.lifetime) : '',
    additional_params: '',
    google_pay_token: '',
    skip_success_page: '',
  };
  fields.hash = sign(PURCHASE_HASH_FIELDS.map((k) => fields[k]), c.apiKey);
  // Recurring token sign-up (CITR_FIX) can be enabled once ABA approves
  // Credential-on-File for the account — it uses ABA's Schedule Payment hash
  // and would otherwise fail with error 30 (COF not enabled).
  if (opts.recurring) { fields.token_flag = TOKEN_FLAG_REGISTER; fields.frequency = opts.frequency || '1M'; }
  fields.ctid = opts.ctid; // sent but not part of the hash
  // Drop empty optional fields (they were signed as "").
  const form = {};
  Object.keys(fields).forEach((k) => { if (fields[k] !== '') form[k] = fields[k]; });
  return { actionUrl: c.baseUrl + PURCHASE_PATH, fields: form };
}

// -- 2. Verify an incoming callback signature ------------------------------
// Header: X-PayWay-HMAC-SHA512. Sort keys, concat values (nested objects are
// php-json-encoded), HMAC-SHA512, base64.
function verifyCallbackSignature(payload, headerValue) {
  const c = config();
  if (!headerValue) return false;
  const keys = Object.keys(payload).filter((k) => k.toLowerCase() !== 'hash').sort();
  const data = keys.map((k) => {
    const v = payload[k];
    if (v && typeof v === 'object') return phpJsonEncode(v);
    return v == null ? '' : String(v);
  }).join('');
  const expected = crypto.createHmac('sha512', c.hmacKey).update(data, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(headerValue)));
  } catch (e) { return false; }
}

// -- 3. Recurring charge with the stored token (MITR_FIX) -------------------
// Used later, once ABA approves Credential-on-File for the account.
async function chargeToken(opts) {
  const c = config();
  const [first_name, last_name] = splitName(opts.fullName);
  const body = {
    request_time: requestTime(),
    merchant_id: c.merchantId,
    tran_id: opts.tranId,
    amount: formatAmount(opts.amount, opts.currency),
    currency: opts.currency,
    items: opts.items ? b64Json(opts.items) : '',
    ctid: opts.ctid,
    pwt: opts.pwt,
    first_name,
    last_name,
    email: (opts.email || '').slice(0, 50),
    phone: (opts.phone || '').slice(0, 20),
    purchase_type: 'purchase',
    callback_url: opts.callbackUrl ? b64(opts.callbackUrl) : '',
    custom_fields: opts.customFields ? b64Json(opts.customFields) : '',
    return_params: opts.returnParams || '',
    payout: '',
    token_flag: TOKEN_FLAG_CHARGE,
    shipping_fee: '',
  };
  body.hash = sign(PAYMENT_HASH_FIELDS.map((k) => body[k]), c.apiKey);
  const res = await fetch(c.baseUrl + PAYMENT_CREDENTIAL_PATH, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const code = (data && data.status && data.status.code) || '';
  return { ok: code === '00', code, message: (data.status && data.status.message) || '', data };
}

// -- 4. Check a transaction (<= 7 days old) --------------------------------
async function checkTransaction(tranId) {
  const c = config();
  const req_time = requestTime();
  const body = {
    req_time, merchant_id: c.merchantId, tran_id: tranId,
    hash: sign([req_time, c.merchantId, tranId], c.apiKey),
  };
  const res = await fetch(c.baseUrl + CHECK_TXN_PATH, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return data;
}

module.exports = {
  config, isConfigured,
  buildSubscriptionCheckout, verifyCallbackSignature, chargeToken, checkTransaction,
  generateCtid, generateTranId, formatAmount, splitName, sign, requestTime,
  TOKEN_FLAG_REGISTER, TOKEN_FLAG_CHARGE,
};
