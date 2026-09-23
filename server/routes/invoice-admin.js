/* Admin "Send Invoice" — email invoices to clients with file attachments,
   BCC yourself, and keep a clearable send-history log. Admin-only. */

const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendInvoiceEmail } = require('../lib/email');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCC_TO = process.env.CONTACT_NOTIFY_TO || 'moonstarstudio.co@gmail.com';

// Keep attachments in memory so we can email them without saving to disk
// (history is record-only). Up to 10 files, 15 MB each.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 10 } });

router.post('/send-invoice', requireAuth, upload.array('files', 10), async (req, res) => {
  const b = req.body || {};
  const title = (b.title || '').trim().slice(0, 200);
  const clientName = (b.client_name || '').trim().slice(0, 120);
  const company = (b.company || '').trim().slice(0, 160);
  const email = (b.client_email || '').trim().toLowerCase();
  const invoiceDate = (b.invoice_date || '').trim().slice(0, 40);
  const message = (b.message || '').trim().slice(0, 4000);
  const files = req.files || [];

  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid client email is required' });
  if (!files.length) return res.status(400).json({ error: 'Attach at least one file to send' });

  const attachments = files.map((f) => ({ filename: f.originalname, content: f.buffer.toString('base64') }));
  const fileNames = files.map((f) => f.originalname);

  let status = 'sent', errMsg = '';
  try {
    await sendInvoiceEmail({ to: email, clientName: clientName, title: title, message: message, attachments: attachments, bcc: BCC_TO });
  } catch (e) {
    status = 'failed';
    errMsg = (e && e.message) || 'Send failed';
  }

  db.prepare(
    'INSERT INTO invoice_sends (title, client_name, company, client_email, invoice_date, files, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title, clientName, company, email, invoiceDate, JSON.stringify(fileNames), status, errMsg);

  if (status === 'failed') return res.status(502).json({ error: 'Could not send: ' + errMsg });
  res.json({ success: true });
});

router.get('/invoice-history', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM invoice_sends ORDER BY id DESC LIMIT 500').all();
  res.json(rows.map((r) => ({ ...r, files: (function () { try { return JSON.parse(r.files); } catch (e) { return []; } })() })));
});

router.delete('/invoice-history/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM invoice_sends WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/invoice-history', requireAuth, (req, res) => {
  db.prepare('DELETE FROM invoice_sends').run();
  res.json({ success: true });
});

module.exports = router;
