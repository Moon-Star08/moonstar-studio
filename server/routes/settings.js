const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');
const defaultContent = require('../defaultContent');

const router = express.Router();

const MAX_FIELD_LENGTH = 5000;

function getStoredContent() {
  const row = db.prepare('SELECT content FROM settings WHERE id = 1').get();
  let stored = {};
  try {
    stored = row ? JSON.parse(row.content) : {};
  } catch (err) {
    stored = {};
  }
  return stored;
}

// Deep-merge stored content over defaults so any field missing from an
// older save (or a future field added to defaultContent) still resolves.
function mergeWithDefaults(stored) {
  const merged = {};
  for (const section of Object.keys(defaultContent)) {
    merged[section] = Object.assign({}, defaultContent[section], stored[section] || {});
  }
  return merged;
}

// Sanitize incoming content: only known string fields are kept, each
// trimmed and length-capped. Unknown sections/keys are dropped. Fields not
// present in the submitted body (e.g. hero_image, managed by its own
// upload endpoint) fall back to the currently stored value, not the
// default — otherwise saving the text form would wipe them out.
function sanitizeContent(body, currentStored) {
  const clean = {};
  for (const section of Object.keys(defaultContent)) {
    clean[section] = {};
    const incomingSection = (body && typeof body[section] === 'object' && body[section]) || {};
    const storedSection = (currentStored && currentStored[section]) || {};
    for (const key of Object.keys(defaultContent[section])) {
      const raw = incomingSection[key];
      if (typeof raw === 'string') {
        clean[section][key] = raw.trim().slice(0, MAX_FIELD_LENGTH);
      } else if (typeof storedSection[key] === 'string') {
        clean[section][key] = storedSection[key];
      } else {
        clean[section][key] = String(defaultContent[section][key]);
      }
    }
  }
  return clean;
}

function deleteUploadedFile(imagePath) {
  if (!imagePath) return;
  const filename = path.basename(imagePath);
  fs.unlink(path.join(uploadDir, filename), () => {});
}

router.get('/settings', (req, res) => {
  res.json(mergeWithDefaults(getStoredContent()));
});

router.get('/admin/settings', requireAuth, (req, res) => {
  res.json(mergeWithDefaults(getStoredContent()));
});

router.put('/admin/settings', requireAuth, (req, res) => {
  const clean = sanitizeContent(req.body || {}, getStoredContent());
  db.prepare('UPDATE settings SET content = ?, updated_at = datetime(\'now\') WHERE id = 1').run(
    JSON.stringify(clean)
  );
  res.json(mergeWithDefaults(clean));
});

router.post('/admin/settings/reset', requireAuth, (req, res) => {
  const stored = getStoredContent();
  deleteUploadedFile((stored.home || {}).hero_image);
  db.prepare('UPDATE settings SET content = ?, updated_at = datetime(\'now\') WHERE id = 1').run(
    JSON.stringify(defaultContent)
  );
  res.json(defaultContent);
});

router.post('/admin/settings/hero-image', requireAuth, (req, res) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const stored = mergeWithDefaults(getStoredContent());
    deleteUploadedFile(stored.home.hero_image);
    stored.home.hero_image = `/uploads/${req.file.filename}`;

    db.prepare('UPDATE settings SET content = ?, updated_at = datetime(\'now\') WHERE id = 1').run(
      JSON.stringify(stored)
    );
    res.json(stored);
  });
});

router.delete('/admin/settings/hero-image', requireAuth, (req, res) => {
  const stored = mergeWithDefaults(getStoredContent());
  deleteUploadedFile(stored.home.hero_image);
  stored.home.hero_image = '';

  db.prepare('UPDATE settings SET content = ?, updated_at = datetime(\'now\') WHERE id = 1').run(
    JSON.stringify(stored)
  );
  res.json(stored);
});

module.exports = router;
