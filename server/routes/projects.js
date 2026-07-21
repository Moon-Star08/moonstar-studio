const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');

const router = express.Router();

const CATEGORIES = new Set(['project', 'website']);
const URL_RE = /^https?:\/\/[^\s]+$/i;

function serializeProject(row) {
  return {
    ...row,
    tech_tags: JSON.parse(row.tech_tags || '[]'),
    featured: !!row.featured,
  };
}

function parseTechTags(raw) {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

function validateProjectInput(body) {
  const errors = [];
  const title = (body.title || '').trim();
  const shortDescription = (body.short_description || '').trim();
  const longDescription = (body.long_description || '').trim();
  const category = (body.category || '').trim();
  const liveUrl = (body.live_url || '').trim();
  const githubUrl = (body.github_url || '').trim();

  if (!title || title.length > 120) errors.push('Title is required (max 120 characters)');
  if (!shortDescription || shortDescription.length > 240) {
    errors.push('Short description is required (max 240 characters)');
  }
  if (longDescription.length > 5000) errors.push('Long description is too long (max 5000 characters)');
  if (!CATEGORIES.has(category)) errors.push('Category must be "project" or "website"');
  if (liveUrl && !URL_RE.test(liveUrl)) errors.push('Live URL must be a valid http(s) URL');
  if (githubUrl && !URL_RE.test(githubUrl)) errors.push('GitHub URL must be a valid http(s) URL');

  const techTags = parseTechTags(body.tech_tags);
  const featured = body.featured === 'true' || body.featured === true || body.featured === 'on' || body.featured === '1';

  const published = body.published === undefined
    ? true
    : (body.published === 'true' || body.published === true || body.published === 'on' || body.published === '1');

  return {
    errors,
    data: {
      title,
      short_description: shortDescription,
      long_description: longDescription,
      category,
      live_url: liveUrl,
      github_url: githubUrl,
      tech_tags: JSON.stringify(techTags),
      featured: featured ? 1 : 0,
      published: published ? 1 : 0,
    },
  };
}

function deleteImageFile(imagePath) {
  if (!imagePath) return;
  const filename = path.basename(imagePath);
  const fullPath = path.join(uploadDir, filename);
  fs.unlink(fullPath, () => {});
}

// ---------- Public routes ----------

router.get('/projects', (req, res) => {
  const { category, tag, featured } = req.query;
  let query = 'SELECT * FROM projects WHERE published = 1';
  const params = [];

  if (category && CATEGORIES.has(category)) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (featured === '1' || featured === 'true') {
    query += ' AND featured = 1';
  }
  query += ' ORDER BY created_at DESC';

  let rows = db.prepare(query).all(...params);
  let projects = rows.map(serializeProject);

  if (tag) {
    const tagLower = tag.toLowerCase();
    projects = projects.filter((p) => p.tech_tags.some((t) => t.toLowerCase() === tagLower));
  }

  res.json(projects);
});

router.get('/projects/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row || !row.published) return res.status(404).json({ error: 'Project not found' });
  res.json(serializeProject(row));
});

// ---------- Admin routes ----------

router.get('/admin/projects', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows.map(serializeProject));
});

router.get('/admin/projects/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(serializeProject(row));
});

router.post('/admin/projects', requireAuth, (req, res) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    const { errors, data } = validateProjectInput(req.body);
    if (errors.length) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(400).json({ error: errors.join('; ') });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

    const result = db
      .prepare(
        `INSERT INTO projects
          (title, short_description, long_description, category, tech_tags, live_url, github_url, image_path, featured, published, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        data.title,
        data.short_description,
        data.long_description,
        data.category,
        data.tech_tags,
        data.live_url,
        data.github_url,
        imagePath,
        data.featured,
        data.published
      );

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(serializeProject(row));
  });
});

router.put('/admin/projects/:id', requireAuth, (req, res) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(404).json({ error: 'Project not found' });
    }

    const { errors, data } = validateProjectInput(req.body);
    if (errors.length) {
      if (req.file) deleteImageFile(req.file.filename);
      return res.status(400).json({ error: errors.join('; ') });
    }

    let imagePath = existing.image_path;
    if (req.file) {
      deleteImageFile(existing.image_path);
      imagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.remove_image === 'true' || req.body.remove_image === '1') {
      deleteImageFile(existing.image_path);
      imagePath = '';
    }

    db.prepare(
      `UPDATE projects SET
        title = ?,
        short_description = ?,
        long_description = ?,
        category = ?,
        tech_tags = ?,
        live_url = ?,
        github_url = ?,
        image_path = ?,
        featured = ?,
        published = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.title,
      data.short_description,
      data.long_description,
      data.category,
      data.tech_tags,
      data.live_url,
      data.github_url,
      imagePath,
      data.featured,
      data.published,
      req.params.id
    );

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(serializeProject(row));
  });
});

router.patch('/admin/projects/:id/publish', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const published = req.body && req.body.published ? 1 : 0;
  db.prepare("UPDATE projects SET published = ?, updated_at = datetime('now') WHERE id = ?").run(published, req.params.id);

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(serializeProject(row));
});

router.delete('/admin/projects/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  deleteImageFile(existing.image_path);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
