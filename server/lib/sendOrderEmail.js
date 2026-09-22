/* Transactional email sending via Resend.
   Reads the HTML template once, swaps {{name}}, and sends it.

   The API key is read ONLY from process.env.RESEND_API_KEY — never hard-coded.
   Add it locally in .env and on Render under Settings → Environment. */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// The template file. Replace server/emails/order-email.html with your real
// email-template.html (keep this filename + the {{name}} placeholder).
const TEMPLATE_PATH = path.join(__dirname, '..', 'emails', 'order-email.html');

// Read the template once at startup and cache it (it doesn't change at runtime).
let templateCache = null;
function getTemplate() {
  if (templateCache == null) templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return templateCache;
}

// Sandbox/test sender. Resend lets you send from onboarding@resend.dev with no
// setup, but ONLY to the email address that owns the Resend account.
// To send from orders@moonstarstudio.com to anyone, first verify the domain in
// Resend (Domains → Add Domain) by adding the DNS records it gives you, then
// change FROM_ADDRESS below to 'MoonStar <orders@moonstarstudio.com>'.
const FROM_ADDRESS = 'MoonStar <onboarding@resend.dev>';

/**
 * Send the order confirmation email.
 * @param {{ to: string, name?: string }} opts
 * @returns {Promise<object>} the Resend API response (has an `id` on success)
 */
async function sendOrderEmail({ to, name }) {
  if (!to) throw new Error('sendOrderEmail: "to" is required');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');

  // Create the client lazily so the app can still boot without the key set.
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Fill the template. Simple global text replace of {{name}} — the template
  // HTML itself is left untouched otherwise.
  const html = getTemplate().replace(/\{\{\s*name\s*\}\}/g, name || 'there');

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: to,
    subject: 'Your order is in',
    html: html,
  });

  if (error) throw new Error(error.message || 'Resend failed to send');
  return data;
}

module.exports = { sendOrderEmail };
