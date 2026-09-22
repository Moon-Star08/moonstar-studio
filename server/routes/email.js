/* Test route to trigger a transactional email.
   POST /api/send-email  body: { "to": "you@example.com", "name": "Moon" }

   NOTE: this is intentionally simple so you can trigger a test send. Before
   exposing it publicly you may want to protect it (e.g. requireAuth) or remove
   it once real sends are wired into your actual order flow. */

const express = require('express');
const { sendContactThankYou } = require('../lib/email');

const router = express.Router();

router.post('/send-email', async (req, res) => {
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
