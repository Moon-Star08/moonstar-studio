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
// Where replies go (so a visitor hitting "reply" reaches you):
const REPLY_TO = process.env.CONTACT_NOTIFY_TO || process.env.SMTP_USER || undefined;

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

// Replace every {{key}} in the template with the (escaped) matching data value.
function render(file, data) {
  const values = Object.assign({ year: new Date().getFullYear() }, data || {});
  return loadTemplate(file).replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
    return key in values ? esc(values[key]) : '';
  });
}

async function sendEmail({ to, subject, templateFile, data }) {
  if (!to) throw new Error('sendEmail: "to" is required');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: result, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: to,
    subject: subject,
    html: render(templateFile, data),
    reply_to: REPLY_TO,
  });
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

// Kept from the earlier setup (order confirmation) — uses order-email.html.
function sendOrderEmail({ to, name }) {
  return sendEmail({
    to: to,
    subject: 'Your order is in',
    templateFile: 'order-email.html',
    data: { name: name || 'there' },
  });
}

module.exports = { sendEmail, sendContactThankYou, sendOrderEmail };
