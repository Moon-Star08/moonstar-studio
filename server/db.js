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

const settingsRow = db.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!settingsRow) {
  db.prepare('INSERT INTO settings (id, content) VALUES (1, ?)').run(JSON.stringify(defaultContent));
}

module.exports = db;
