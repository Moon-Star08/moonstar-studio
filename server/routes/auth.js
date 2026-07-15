const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function logAttempt(req, usernameTried, success) {
  db.prepare(
    'INSERT INTO login_attempts (username_tried, success, ip, user_agent) VALUES (?, ?, ?, ?)'
  ).run(usernameTried || '', success ? 1 : 0, req.ip || '', (req.get('user-agent') || '').slice(0, 300));
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

let cachedHash = null;
let cachedPassword = null;

function getPasswordHash() {
  const plain = process.env.ADMIN_PASSWORD || '';
  if (cachedPassword !== plain) {
    cachedPassword = plain;
    cachedHash = bcrypt.hashSync(plain, 12);
  }
  return cachedHash;
}

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    logAttempt(req, username, false);
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const usernameMatches = username === expectedUsername;

  const passwordMatches = await bcrypt.compare(password, getPasswordHash());

  if (!usernameMatches || !passwordMatches) {
    logAttempt(req, username, false);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  logAttempt(req, username, true);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Login failed, please try again' });
    req.session.isAdmin = true;
    req.session.username = expectedUsername;
    res.json({ success: true });
  });
});

router.get('/login-attempts', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT 200')
    .all();
  res.json(rows.map((r) => ({ ...r, success: !!r.success })));
});

router.delete('/login-attempts', requireAuth, (req, res) => {
  db.prepare('DELETE FROM login_attempts').run();
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('portfolio.sid');
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.json({ authenticated: false });
});

// Attached so routes/account.js can reuse the exact same admin-credential
// check for the unified login box, instead of maintaining a second copy
// that could drift out of sync.
router.logAttempt = logAttempt;
router.getPasswordHash = getPasswordHash;

module.exports = router;
