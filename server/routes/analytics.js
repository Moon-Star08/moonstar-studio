const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/analytics', requireAuth, (req, res) => {
  const totalViews = db.prepare('SELECT COUNT(*) AS c FROM page_views').get().c;
  const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT visitor_id) AS c FROM page_views').get().c;
  const viewsToday = db
    .prepare("SELECT COUNT(*) AS c FROM page_views WHERE created_at >= datetime('now', '-1 day')")
    .get().c;
  const views7d = db
    .prepare("SELECT COUNT(*) AS c FROM page_views WHERE created_at >= datetime('now', '-7 days')")
    .get().c;
  const topPages = db
    .prepare('SELECT path, COUNT(*) AS count FROM page_views GROUP BY path ORDER BY count DESC LIMIT 10')
    .all();
  const registeredUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;

  res.json({
    total_views: totalViews,
    unique_visitors: uniqueVisitors,
    views_today: viewsToday,
    views_7d: views7d,
    top_pages: topPages,
    registered_users: registeredUsers,
  });
});

router.get('/admin/users', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT id, email, name, provider, created_at FROM users ORDER BY created_at DESC LIMIT 200')
    .all();
  res.json(rows);
});

router.delete('/admin/users/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
