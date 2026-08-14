const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// Google OAuth for VISITOR accounts only. This never sets req.session.isAdmin —
// admin access is granted solely by the password check in account.js/auth.js.
// Everything here is inert unless GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.

function cfg() {
  return { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
}

function callbackUrl(req) {
  var base = process.env.OAUTH_CALLBACK_BASE;
  if (base) return base.replace(/\/$/, '') + '/api/account/google/callback';
  return req.protocol + '://' + req.get('host') + '/api/account/google/callback';
}

router.get('/google', (req, res) => {
  const c = cfg();
  if (!c.id || !c.secret) return res.status(404).send('Google sign-in is not configured.');
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: c.id,
    redirect_uri: callbackUrl(req),
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
});

router.get('/google/callback', async (req, res) => {
  const c = cfg();
  if (!c.id || !c.secret) return res.status(404).send('Google sign-in is not configured.');
  const { code, state } = req.query;
  if (!code || !state || state !== req.session.oauthState) {
    return res.redirect('/?login=error');
  }
  delete req.session.oauthState;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: c.id,
        client_secret: c.secret,
        redirect_uri: callbackUrl(req),
        grant_type: 'authorization_code',
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) return res.redirect('/?login=error');

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    const info = await infoRes.json();
    const email = (info.email || '').trim().toLowerCase();
    if (!email || !info.email_verified) return res.redirect('/?login=error');

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      db.prepare(
        'INSERT INTO users (email, name, provider, provider_id, avatar_url) VALUES (?, ?, ?, ?, ?)'
      ).run(email, (info.name || '').slice(0, 120), 'google', info.sub || '', info.picture || '');
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } else {
      db.prepare(
        "UPDATE users SET name = COALESCE(NULLIF(?, ''), name), avatar_url = ?, provider = 'google', provider_id = ? WHERE id = ?"
      ).run((info.name || '').slice(0, 120), info.picture || '', info.sub || '', user.id);
    }

    req.session.regenerate((err) => {
      if (err) return res.redirect('/?login=error');
      req.session.userId = user.id;
      res.redirect('/?login=success');
    });
  } catch (e) {
    res.redirect('/?login=error');
  }
});

module.exports = router;
