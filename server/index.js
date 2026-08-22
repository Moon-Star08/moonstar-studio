require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { requireAuth } = require('./middleware/auth');
const { uploadDir } = require('./middleware/upload');
const { trackPageView } = require('./middleware/track');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const oauthRoutes = require('./routes/oauth');
const analyticsRoutes = require('./routes/analytics');
const projectRoutes = require('./routes/projects');
const contactRoutes = require('./routes/contact');
const settingsRoutes = require('./routes/settings');

const REQUIRED_ENV = ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'SESSION_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values before starting the server.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://lh3.googleusercontent.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const THIRTY_MIN_MS = 30 * 60 * 1000;
app.use(
  session({
    name: 'portfolio.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // sliding expiration: inactivity logs the admin/visitor out
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: THIRTY_MIN_MS,
    },
  })
);

app.use(trackPageView);

// API routes
app.use('/api/admin', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/account', oauthRoutes);
app.use('/api', projectRoutes);
app.use('/api', contactRoutes);
app.use('/api', settingsRoutes);
app.use('/api', analyticsRoutes);

// Clean URLs: every public page is linked internally without ".html".
// Anyone landing on the old *.html path (bookmarks, external links,
// search results) gets redirected to the canonical clean URL.
const CLEAN_URL_REDIRECTS = {
  '/index.html': '/',
  '/work.html': '/websites',
  '/about.html': '/about',
  '/services.html': '/services',
  '/websites.html': '/websites',
  '/freelance.html': '/freelance',
  '/contact.html': '/contact',
};
for (const [from, to] of Object.entries(CLEAN_URL_REDIRECTS)) {
  app.get(from, (req, res) => res.redirect(301, to));
}

// Admin pages — clean URLs (no ".html"), all auth-protected except login.
// Registered BEFORE express.static so the clean paths can't bypass the auth
// check. Old ".html" paths 301-redirect to the clean URL, preserving any query
// string (so /admin/project-form.html?id=5 still lands on the edit form).
const ADMIN_DIR = path.join(__dirname, '..', 'public', 'admin');
app.get('/admin', (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/login', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'login.html')));
['dashboard', 'project-form', 'settings'].forEach((name) => {
  app.get('/admin/' + name, requireAuth, (req, res) => res.sendFile(path.join(ADMIN_DIR, name + '.html')));
});
app.get(/^\/admin\/([a-z-]+)\.html$/, (req, res) => {
  const q = req.originalUrl.indexOf('?');
  const suffix = q >= 0 ? req.originalUrl.slice(q) : '';
  res.redirect(301, '/admin/' + req.params[0] + suffix);
});

// Uploaded images live on the persistent disk (data/uploads), not in the
// public/ folder, so they survive redeploys alongside the database.
app.use('/uploads', express.static(uploadDir));

// Static assets (css/js/public html, including admin/login.html).
// extensions: ['html'] lets a request for "/about" resolve to
// "about.html" on disk, which is what makes the clean URLs above work.
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
  res.status(500).send('Something went wrong');
});

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
