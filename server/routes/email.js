/* Test route to trigger a transactional email.
   POST /api/send-email  body: { "to": "you@example.com", "name": "Moon" }

   NOTE: this is intentionally simple so you can trigger a test send. Before
   exposing it publicly you may want to protect it (e.g. requireAuth) or remove
   it once real sends are wired into your actual order flow. */

const express = require('express');
const { sendContactThankYou } = require('../lib/email');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Admin-only test trigger — protected so no one can burn your Resend quota.
// (The real auto-reply fires from the contact form, not this route.)
router.post('/send-email', requireAuth, async (req, res) => {
  const { to, name, projectType } = req.body || {};
  if (!to) return res.status(400).json({ error: '"to" (recipient email) is required' });
  try {
    const result = await sendContactThankYou({ to, name, projectType });
    res.json({ success: true, id: result && result.id });
  } catch (err) {
    // Surface the real reason (missing key, unverified domain, etc.) for testing.
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
