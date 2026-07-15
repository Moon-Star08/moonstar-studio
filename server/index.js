require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const { requireAuth } = require('./middleware/auth');
const { uploadDir } = require('./middleware/upload');
const authRoutes = require('./routes/auth');
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
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const THIRTY_MIN_MS = 30 * 60 * 1000;
app.use(
  session({
    name: 'portfolio.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // sliding expiration: inactivity logs the admin out
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      maxAge: THIRTY_MIN_MS,
    },
  })
);

// API routes
app.use('/api/admin', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', contactRoutes);
app.use('/api', settingsRoutes);

// Protect admin HTML pages (everything except the login page itself).
// These must be registered BEFORE express.static so auth is checked
// before any file is served from public/admin.
app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));
app.get('/admin/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'dashboard.html'));
});
app.get('/admin/project-form.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'project-form.html'));
});
app.get('/admin/settings.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'settings.html'));
});

// Uploaded images live on the persistent disk (data/uploads), not in the
// public/ folder, so they survive redeploys alongside the database.
app.use('/uploads', express.static(uploadDir));

// Static assets (css/js/public html, including admin/login.html)
app.use(express.static(path.join(__dirname, '..', 'public')));

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
