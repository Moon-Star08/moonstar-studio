const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const authRouter = require('./auth');

const router = express.Router();

const { logAttempt, getPasswordHash } = authRouter;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network. Please try again later.' },
});

// Precomputed once so a login attempt against a non-existent email still
// takes roughly the same time as a real one (avoids leaking which emails
// are registered via response timing), without re-hashing on every miss.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, avatar_url: row.avatar_url };
}

// The unified box: one field can be either the admin username or a
// visitor's email. Admin access is ONLY ever granted here by checking the
// real ADMIN_PASSWORD via bcrypt — the users table is never consulted for
// admin rights, and no OAuth provider can produce this outcome.
router.post('/login', loginLimiter, async (req, res) => {
  const { identifier, password } = req.body || {};

  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
    logAttempt(req, identifier, false);
    return res.status(400).json({ error: 'Invalid email/username or password' });
  }

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';

  if (identifier === expectedUsername) {
    const passwordMatches = await bcrypt.compare(password, getPasswordHash());
    if (!passwordMatches) {
      logAttempt(req, identifier, false);
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }
    logAttempt(req, identifier, true);
    return req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Login failed, please try again' });
      req.session.isAdmin = true;
      req.session.username = expectedUsername;
      res.json({ success: true, role: 'admin' });
    });
  }

  const email = identifier.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const hash = user && user.password_hash ? user.password_hash : DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) {
    logAttempt(req, identifier, false);
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }

  return req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Login failed, please try again' });
    req.session.userId = user.id;
    res.json({ success: true, role: 'visitor', user: publicUser(user) });
  });
});

router.post('/signup', signupLimiter, async (req, res) => {
  const { email, name, password } = req.body || {};

  const cleanEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
  const cleanName = (typeof name === 'string' ? name : '').trim().slice(0, 120);

  if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || cleanEmail.length > 180) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db
    .prepare('INSERT INTO users (email, name, password_hash, provider) VALUES (?, ?, ?, ?)')
    .run(cleanEmail, cleanName, passwordHash, 'local');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Signup failed, please try again' });
    req.session.userId = user.id;
    res.status(201).json({ success: true, role: 'visitor', user: publicUser(user) });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('portfolio.sid');
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, role: 'admin', name: req.session.username, email: '', avatar_url: '' });
  }
  if (req.session && req.session.userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (user) {
      return res.json({ authenticated: true, role: 'visitor', ...publicUser(user) });
    }
  }
  res.json({ authenticated: false, role: null });
});

// Frontend uses this to decide whether to show the Google/Facebook
// buttons at all — they stay hidden until real OAuth app credentials are
// configured as environment variables.
router.get('/oauth-providers', (req, res) => {
  res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
  });
});

module.exports = router;
