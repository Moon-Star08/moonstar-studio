const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const defaultContent = require('./defaultContent');

// DATA_DIR lets us point the database at a Render persistent disk so that
// accounts, plans and progress survive redeploys. Falls back to a local
// ./data folder for development.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'portfolio.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('project', 'website')),
    tech_tags TEXT NOT NULL DEFAULT '[]',
    live_url TEXT NOT NULL DEFAULT '',
    github_url TEXT NOT NULL DEFAULT '',
    image_path TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: older databases created before the "published" column existed
// won't have it — add it so existing rows default to visible.
const projectColumns = db.prepare("PRAGMA table_info(projects)").all();
if (!projectColumns.some((c) => c.name === 'published')) {
  db.exec('ALTER TABLE projects ADD COLUMN published INTEGER NOT NULL DEFAULT 1');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    project_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username_tried TEXT NOT NULL,
    success INTEGER NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Visitor accounts. Fully separate from admin auth — matching the admin
// username here never grants anything by itself. Admin access is only
// ever granted in routes/account.js by verifying the actual admin
// password against ADMIN_PASSWORD, never through this table.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'local',
    provider_id TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    visitor_id TEXT NOT NULL DEFAULT '',
    user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Workout tracker ─────────────────────────────────────────────────────
// Completely separate from the site's admin auth AND from the `users` table
// above. Friends who use the workout tracker live only here; a workout
// account grants nothing on the rest of the site, and vice versa.
db.exec(`
  CREATE TABLE IF NOT EXISTS workout_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// One row per workout user: their questionnaire answers (profile), the
// generated plan, and their progress — all stored as JSON blobs.
db.exec(`
  CREATE TABLE IF NOT EXISTS workout_data (
    user_id INTEGER PRIMARY KEY REFERENCES workout_users(id) ON DELETE CASCADE,
    profile TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT '',
    progress TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Log of invoice emails sent from the admin "Send Invoice" page (record only —
// the attached files themselves are not stored).
db.exec(`
  CREATE TABLE IF NOT EXISTS invoice_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    client_name TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    client_email TEXT NOT NULL DEFAULT '',
    invoice_date TEXT NOT NULL DEFAULT '',
    files TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'sent',
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Subscriptions (ABA PayWay care-plan billing) ─────────────────────────
// Prices/plans are defined in server/lib/subPlans.js; only per-customer state
// lives here. Card numbers/CVV are never stored — only the ABA token (pwt),
// which is never returned to the browser or logged.
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    plan_slug TEXT NOT NULL,
    plan_name TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    frequency TEXT NOT NULL DEFAULT '1M',
    status TEXT NOT NULL DEFAULT 'pending',
    ctid TEXT NOT NULL UNIQUE,
    pwt TEXT NOT NULL DEFAULT '',
    token_status INTEGER,
    payment_method_masked TEXT NOT NULL DEFAULT '',
    first_tran_id TEXT NOT NULL DEFAULT '',
    last_tran_id TEXT NOT NULL DEFAULT '',
    next_billing_date TEXT,
    started_at TEXT,
    cancelled_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS subscription_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    tran_id TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL DEFAULT 'registration',
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'initiated',
    apv TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Magic-link tokens for the customer subscription portal. A customer enters
// their email, we email them a one-time link; the token is a SHA-256 hash of
// the random value in the link (so the raw token is never stored). Short-lived
// and single-use.
db.exec(`
  CREATE TABLE IF NOT EXISTS sub_login_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const settingsRow = db.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!settingsRow) {
  db.prepare('INSERT INTO settings (id, content) VALUES (1, ?)').run(JSON.stringify(defaultContent));
}

module.exports = db;
