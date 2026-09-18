/* Workout tracker API — fully separate from the site's admin auth and from
   the `users` table. Friends sign up here with an invite code; each account
   has one profile, one generated plan, and its own progress. */

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { generatePlan } = require('../lib/workoutPlan');
const ORIGINAL_PLAN = require('../lib/originalPlan.json');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_CODE = process.env.WORKOUT_INVITE_CODE || 'MOONSTAR-FIT';
// The one account allowed to load Moon's original 100-day Excel plan.
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'fengkong22@gmail.com').trim().toLowerCase();
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many accounts created from this network. Please try again later.' },
});

function requireWorkoutUser(req, res, next) {
  if (req.session && req.session.workoutUserId) return next();
  return res.status(401).json({ error: 'Not signed in' });
}

function publicUser(row) {
  return row ? { id: row.id, name: row.name, email: row.email, isOwner: row.email.toLowerCase() === OWNER_EMAIL } : null;
}

function upsertPlan(userId, profile, plan) {
  const existing = db.prepare('SELECT user_id FROM workout_data WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare("UPDATE workout_data SET profile = ?, plan = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(JSON.stringify(profile), JSON.stringify(plan), userId);
  } else {
    db.prepare('INSERT INTO workout_data (user_id, profile, plan, progress) VALUES (?, ?, ?, ?)')
      .run(userId, JSON.stringify(profile), JSON.stringify(plan), '{}');
  }
}

function loadData(userId) {
  const row = db.prepare('SELECT profile, plan, progress FROM workout_data WHERE user_id = ?').get(userId);
  if (!row) return { profile: null, plan: null, progress: {} };
  return {
    profile: row.profile ? JSON.parse(row.profile) : null,
    plan: row.plan ? JSON.parse(row.plan) : null,
    progress: row.progress ? JSON.parse(row.progress) : {},
  };
}

// ── auth ─────────────────────────────────────────────────────────────────
router.post('/signup', signupLimiter, async (req, res) => {
  const { email, name, password, invite } = req.body || {};
  if (typeof invite !== 'string' || invite.trim() !== INVITE_CODE) {
    return res.status(403).json({ error: 'Invalid invite code' });
  }
  const cleanEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
  const cleanName = (typeof name === 'string' ? name : '').trim().slice(0, 120);
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || cleanEmail.length > 180) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const existing = db.prepare('SELECT id FROM workout_users WHERE email = ?').get(cleanEmail);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db.prepare('INSERT INTO workout_users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(cleanEmail, cleanName, passwordHash);
  const user = db.prepare('SELECT * FROM workout_users WHERE id = ?').get(result.lastInsertRowid);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Signup failed, please try again' });
    req.session.workoutUserId = user.id;
    res.status(201).json({ success: true, user: publicUser(user), profile: null, plan: null, progress: {} });
  });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
  if (!cleanEmail || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = db.prepare('SELECT * FROM workout_users WHERE email = ?').get(cleanEmail);
  const hash = user ? user.password_hash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return res.status(401).json({ error: 'Wrong email or password' });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Login failed, please try again' });
    req.session.workoutUserId = user.id;
    const data = loadData(user.id);
    res.json({ success: true, user: publicUser(user), profile: data.profile, plan: data.plan, progress: data.progress });
  });
});

router.post('/logout', (req, res) => {
  if (req.session) delete req.session.workoutUserId;
  res.json({ success: true });
});

// ── data ─────────────────────────────────────────────────────────────────
router.get('/me', requireWorkoutUser, (req, res) => {
  const user = db.prepare('SELECT * FROM workout_users WHERE id = ?').get(req.session.workoutUserId);
  if (!user) { delete req.session.workoutUserId; return res.status(401).json({ error: 'Not signed in' }); }
  const data = loadData(user.id);
  res.json({ user: publicUser(user), profile: data.profile, plan: data.plan, progress: data.progress });
});

// Save questionnaire -> generate plan -> store. Progress is reset only if
// there was no plan before (a returning user re-doing the questionnaire keeps
// their day/exercise ticks).
router.post('/profile', requireWorkoutUser, (req, res) => {
  const profile = req.body && req.body.profile;
  if (!profile || typeof profile !== 'object') return res.status(400).json({ error: 'Missing profile' });
  let plan;
  try { plan = generatePlan(profile); }
  catch (e) { return res.status(400).json({ error: 'Could not build a plan from those answers' }); }

  const existing = db.prepare('SELECT user_id FROM workout_data WHERE user_id = ?').get(req.session.workoutUserId);
  const profileJson = JSON.stringify(profile);
  const planJson = JSON.stringify(plan);
  if (existing) {
    db.prepare('UPDATE workout_data SET profile = ?, plan = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
      .run(profileJson, planJson, req.session.workoutUserId);
  } else {
    db.prepare('INSERT INTO workout_data (user_id, profile, plan, progress) VALUES (?, ?, ?, ?)')
      .run(req.session.workoutUserId, profileJson, planJson, '{}');
  }
  res.json({ success: true, profile, plan });
});

// Owner-only: load Moon's original 100-day Excel plan into his account.
router.post('/restore-original', requireWorkoutUser, (req, res) => {
  const user = db.prepare('SELECT * FROM workout_users WHERE id = ?').get(req.session.workoutUserId);
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'Not available for this account' });
  }
  const profile = { original: true, name: user.name || 'Moon' };
  upsertPlan(user.id, profile, ORIGINAL_PLAN);
  res.json({ success: true, profile, plan: ORIGINAL_PLAN });
});

router.post('/progress', requireWorkoutUser, (req, res) => {
  const progress = req.body && req.body.progress;
  if (!progress || typeof progress !== 'object') return res.status(400).json({ error: 'Missing progress' });
  const json = JSON.stringify(progress).slice(0, 200000); // guard size
  const existing = db.prepare('SELECT user_id FROM workout_data WHERE user_id = ?').get(req.session.workoutUserId);
  if (existing) {
    db.prepare('UPDATE workout_data SET progress = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
      .run(json, req.session.workoutUserId);
  } else {
    db.prepare('INSERT INTO workout_data (user_id, profile, plan, progress) VALUES (?, ?, ?, ?)')
      .run(req.session.workoutUserId, '', '', json);
  }
  res.json({ success: true });
});

module.exports = router;
