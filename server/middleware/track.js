const crypto = require('crypto');
const db = require('../db');

const VISITOR_COOKIE = 'msv_id';
const SKIP_PREFIXES = ['/api/', '/css/', '/js/', '/uploads/', '/admin/'];
const SKIP_EXACT = new Set(['/favicon.svg', '/favicon.ico']);

function shouldTrack(req) {
  if (req.method !== 'GET') return false;
  const p = req.path;
  if (SKIP_EXACT.has(p)) return false;
  return !SKIP_PREFIXES.some((prefix) => p.startsWith(prefix));
}

// Logs one row per page load. The visitor cookie is a random id with no
// personal data in it, used only to roughly de-duplicate visitors in the
// admin's own analytics — not shared with any third party.
function trackPageView(req, res, next) {
  if (!shouldTrack(req)) return next();

  let visitorId = req.cookies && req.cookies[VISITOR_COOKIE];
  if (!visitorId) {
    visitorId = crypto.randomBytes(16).toString('hex');
    res.cookie(VISITOR_COOKIE, visitorId, {
      maxAge: 400 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  const userId = (req.session && req.session.userId) || null;

  try {
    db.prepare('INSERT INTO page_views (path, visitor_id, user_id) VALUES (?, ?, ?)').run(
      req.path,
      visitorId,
      userId
    );
  } catch (err) {
    // Analytics should never break page loads.
  }

  next();
}

module.exports = { trackPageView };
