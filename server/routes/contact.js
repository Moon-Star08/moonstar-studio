const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendContactThankYou, sendLeadNotification } = require('../lib/email');

const router = express.Router();

const PROJECT_TYPES = new Set([
  'Web Design',
  'UI/UX',
  'Development',
  'Full Website',
  'Photography',
  'Poster Design',
  'Content Marketing',
  'Video Editing',
  'Event Photography',
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please try again later.' },
});

function validateContactInput(body) {
  const errors = [];
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const projectType = (body.project_type || '').trim();
  const message = (body.message || '').trim();

  if (!name || name.length > 120) errors.push('Name is required (max 120 characters)');
  if (!email || email.length > 180 || !EMAIL_RE.test(email)) errors.push('A valid email is required');
  if (phone.length > 40) errors.push('Phone number is too long');
  if (!PROJECT_TYPES.has(projectType)) errors.push('Please select a project type');
  if (!message || message.length > 4000) errors.push('Message is required (max 4000 characters)');

  return { errors, data: { name, email, phone, project_type: projectType, message } };
}

router.post('/contact', contactLimiter, (req, res) => {
  // Honeypot: real users never see or fill the hidden "website" field, so any
  // value means a bot. Pretend it succeeded, but drop it — no save, no emails.
  if (req.body && typeof req.body.website === 'string' && req.body.website.trim() !== '') {
    return res.status(201).json({ success: true });
  }

  const { errors, data } = validateContactInput(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  db.prepare(
    'INSERT INTO messages (name, email, phone, project_type, message) VALUES (?, ?, ?, ?, ?)'
  ).run(data.name, data.email, data.phone, data.project_type, data.message);

  // Email me the lead details (non-blocking — never fails the visitor's request).
  sendLeadNotification({
    name: data.name, email: data.email, phone: data.phone,
    projectType: data.project_type, message: data.message,
  }).catch(function (err) {
    console.error('Lead notification failed:', err && err.message);
  });

  // Auto-reply "thanks for reaching out" to the visitor via Resend (also
  // non-blocking — a mail hiccup must never break the form submission).
  // NOTE: with the Resend sandbox sender this only delivers to your own Resend
  // account email; it reaches real visitors once your domain is verified.
  sendContactThankYou({ to: data.email, name: data.name, projectType: data.project_type }).catch(function (err) {
    console.error('Thank-you email failed:', err && err.message);
  });

  res.status(201).json({ success: true });
});

router.get('/admin/messages', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json(rows);
});

router.delete('/admin/messages/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Message not found' });
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
