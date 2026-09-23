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
  const defaultMsg = 'Please find your invoice attached below. Let me know if you have any questions — thank you for your business!';
  const messageHtml = esc(message && message.trim() ? message : defaultMsg).replace(/\r?\n/g, '<br>');
  return sendEmail({
    to: to,
    subject: 'Your invoice from MoonStar Studio' + (title ? ' — ' + title : ''),
    templateFile: 'invoice-email.html',
    bcc: bcc,
    attachments: attachments,
    data: { name: clientName || 'there', title: title || 'Invoice', message_html: messageHtml },
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

module.exports = { sendEmail, sendContactThankYou, sendLeadNotification, sendInvoiceEmail, sendOrderEmail };
