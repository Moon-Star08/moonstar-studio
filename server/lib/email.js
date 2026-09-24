/* Transactional email via Resend.
   The API key is read ONLY from process.env.RESEND_API_KEY — never hard-coded.
   Add it locally in .env and on Render under Settings → Environment. */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const EMAILS_DIR = path.join(__dirname, '..', 'emails');

// Verified domain sender (moonstarstudio.site is verified in Resend), so this
// delivers to any visitor, straight to their inbox.
const FROM_ADDRESS = 'MoonStar Studio <contact@moonstarstudio.site>';
// Where replies go (so a visitor hitting "reply" reaches a real inbox you
// check, since contact@moonstarstudio.site is send-only unless you add mail
// hosting/forwarding for it). Override with CONTACT_NOTIFY_TO on Render.
const REPLY_TO = process.env.CONTACT_NOTIFY_TO || process.env.SMTP_USER || 'moonstarstudio.co@gmail.com';
// Your own inbox that receives the "new lead" notification.
const NOTIFY_TO = process.env.CONTACT_NOTIFY_TO || 'moonstarstudio.co@gmail.com';

// Cache templates in memory (they don't change at runtime).
const cache = {};
function loadTemplate(file) {
  if (cache[file] == null) cache[file] = fs.readFileSync(path.join(EMAILS_DIR, file), 'utf8');
  return cache[file];
}

// Escape values coming from user input before putting them in the HTML.
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Replace every {{key}} in the template with the matching data value.
// Values are HTML-escaped, EXCEPT keys ending in "_html" which the caller has
// already sanitized (used for the message body where we keep line breaks).
function render(file, data) {
  const values = Object.assign({ year: new Date().getFullYear() }, data || {});
  return loadTemplate(file).replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
    if (!(key in values)) return '';
    return /_html$/.test(key) ? String(values[key]) : esc(values[key]);
  });
}

async function sendEmail({ to, subject, templateFile, data, replyTo, bcc, attachments }) {
  if (!to) throw new Error('sendEmail: "to" is required');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const payload = {
    from: FROM_ADDRESS,
    to: to,
    subject: subject,
    html: render(templateFile, data),
    reply_to: replyTo || REPLY_TO,
  };
  if (bcc) payload.bcc = bcc;
  if (attachments && attachments.length) payload.attachments = attachments;
  const { data: result, error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || 'Resend failed to send');
  return result;
}

// Auto-reply sent to someone who submits the website contact form.
function sendContactThankYou({ to, name, projectType }) {
  return sendEmail({
    to: to,
    subject: 'Thanks for reaching out — MoonStar Studio',
    templateFile: 'contact-thankyou.html',
    data: { name: name || 'there', project_type: projectType || 'your project' },
  });
}

// Notify YOU when a visitor submits the contact form — with their details and
// a reply-to set to their address, so hitting "reply" emails the lead directly.
function sendLeadNotification({ name, email, phone, projectType, message }) {
  const messageHtml = esc(message || '').replace(/\r?\n/g, '<br>');
  const date = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Phnom_Penh' });
  return sendEmail({
    to: NOTIFY_TO,
    subject: 'New enquiry — ' + (projectType || 'General') + ' from ' + (name || 'someone'),
    templateFile: 'contact-notification.html',
    replyTo: email || undefined,
    data: {
      name: name || '—', email: email || '—', phone: phone || '—',
      project_type: projectType || '—', message_html: messageHtml || '—', date: date,
    },
  });
}

// Send an invoice to a client with file attachment(s). BCC + custom message
// are optional. Used by the admin "Send Invoice" page.
function sendInvoiceEmail({ to, clientName, title, message, attachments, bcc }) {
  const defaultMsg = 'Please find your invoice below. Let me know if you have any questions — thank you for your business!';
  const messageHtml = esc(message && message.trim() ? message : defaultMsg).replace(/\r?\n/g, '<br>');

  // Image attachments are embedded inline in the body (via CID) so they show
  // right under the info. Non-image files (PDF, Word) can't render inside an
  // email body anywhere, so they ride as normal attachments and are listed.
  const atts = attachments || [];
  const resendAtts = [];
  let chips = '';
  let inlineImgs = '';
  atts.forEach(function (a, i) {
    if (/^image\//.test(a.mimetype || '')) {
      const cid = 'inv-img-' + i;
      resendAtts.push({ filename: a.filename, content: a.content, content_id: cid });
      inlineImgs += '<img src="cid:' + cid + '" alt="' + esc(a.filename) + '" style="display:block; width:100%; max-width:536px; margin:16px auto 0; border:1px solid rgba(22,21,19,.12); border-radius:8px;">';
    } else {
      resendAtts.push({ filename: a.filename, content: a.content });
      chips += '<p style="margin:8px 0 0; font-size:15px; font-weight:bold; color:#161513;">📎 ' + esc(a.filename) + '</p>';
    }
  });
  let box = '<div style="margin:22px 0 0; background:#ffffff; border-left:3px solid #d9333f; border-radius:0 8px 8px 0; padding:14px 18px;">'
    + '<p style="margin:0; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#888888;">Attached — ' + esc(title || 'Invoice') + '</p>'
    + chips
    + (chips ? '<p style="margin:6px 0 0; font-size:13px; color:#888888;">Download from the attachment(s) at the bottom of this email.</p>' : '')
    + '</div>';
  const attachmentsHtml = box + inlineImgs;

  return sendEmail({
    to: to,
    subject: 'Your invoice from MoonStar Studio' + (title ? ' — ' + title : ''),
    templateFile: 'invoice-email.html',
    bcc: bcc,
    attachments: resendAtts,
    data: { name: clientName || 'there', title: title || 'Invoice', message_html: messageHtml, attachments_html: attachmentsHtml },
  });
}

// Sent to a customer once their care-plan subscription is verified active
// (fired from the ABA PayWay payment callback).
function sendSubscriptionEmail({ to, name, planName, amount, nextBilling }) {
  return sendEmail({
    to: to,
    subject: 'You\'re subscribed — ' + (planName || 'MoonStar Studio Care') + ' is active',
    templateFile: 'subscribe-thankyou.html',
    data: {
      name: name || 'there',
      plan: planName || 'Care plan',
      amount: amount != null ? amount : '',
      next_billing: nextBilling || '—',
    },
  });
}

// Sent to a customer when their subscription is cancelled (from the customer
// portal or the admin panel).
function sendCancellationEmail({ to, name, planName }) {
  return sendEmail({
    to: to,
    subject: 'Your ' + (planName || 'MoonStar Studio') + ' subscription is cancelled',
    templateFile: 'subscribe-cancelled.html',
    data: { name: name || 'there', plan: planName || 'Care plan' },
  });
}

// Magic-link sign-in for the customer subscription portal.
function sendPortalLoginEmail({ to, link }) {
  return sendEmail({
    to: to,
    subject: 'Your MoonStar Studio sign-in link',
    templateFile: 'portal-login.html',
    data: { link_html: link },
  });
}

// Kept from the earlier setup (order confirmation) — uses order-email.html.
function sendOrderEmail({ to, name }) {
  return sendEmail({
    to: to,
    subject: 'Your order is in',
    templateFile: 'order-email.html',
    data: { name: name || 'there' },
  });
}

module.exports = { sendEmail, sendContactThankYou, sendLeadNotification, sendInvoiceEmail, sendSubscriptionEmail, sendCancellationEmail, sendPortalLoginEmail, sendOrderEmail };
