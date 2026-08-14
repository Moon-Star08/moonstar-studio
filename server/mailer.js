// Loaded lazily/safely: if the dependency isn't installed yet (e.g. before
// `npm install` on a fresh checkout), email is skipped rather than crashing.
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }

// Config comes entirely from environment variables so no secrets live in the
// repo. If SMTP isn't configured, sending is skipped silently (messages still
// save to the admin inbox). For Gmail set:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_SECURE=true
//   SMTP_USER=you@gmail.com   SMTP_PASS=<16-char app password>
//   CONTACT_NOTIFY_TO=where-to-receive@example.com   (defaults to SMTP_USER)
let transporter = null;
let resolved = false;

function getTransporter() {
  if (resolved) return transporter;
  resolved = true;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!nodemailer || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) return (transporter = null);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
  });
}

async function sendContactNotification(data) {
  const t = getTransporter();
  const to = process.env.CONTACT_NOTIFY_TO || process.env.SMTP_USER;
  if (!t || !to) return { skipped: true };

  const from = process.env.CONTACT_NOTIFY_FROM || ('MoonStar Studio <' + process.env.SMTP_USER + '>');
  const lines = [
    'Name: ' + data.name,
    'Email: ' + data.email,
    'Phone: ' + (data.phone || '-'),
    'Project type: ' + data.project_type,
    '',
    'Message:',
    data.message,
  ].join('\n');

  await t.sendMail({
    from: from,
    to: to,
    replyTo: data.email,
    subject: 'New project inquiry — ' + data.name + ' (' + data.project_type + ')',
    text: 'New contact message\n\n' + lines + '\n',
    html:
      '<h2 style="margin:0 0 12px">New project inquiry</h2>' +
      '<p style="margin:0 0 12px"><b>Name:</b> ' + esc(data.name) + '<br>' +
      '<b>Email:</b> <a href="mailto:' + esc(data.email) + '">' + esc(data.email) + '</a><br>' +
      '<b>Phone:</b> ' + (esc(data.phone) || '-') + '<br>' +
      '<b>Project type:</b> ' + esc(data.project_type) + '</p>' +
      '<p style="margin:0"><b>Message:</b><br>' + esc(data.message).replace(/\n/g, '<br>') + '</p>',
  });
  return { sent: true };
}

module.exports = { sendContactNotification };
