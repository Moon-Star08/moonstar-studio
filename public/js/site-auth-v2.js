/* Site auth widget for the v2 pages: a bottom-right login/profile button, a
   login/signup panel (with Google), and a red cookie-consent bar. Reuses the
   existing /api/account/* endpoints. Admin access is never granted here — the
   owner logs in with the admin password and then sees "Go to dashboard". */
(function () {
  'use strict';

  var COOKIE_KEY = 'msv_cookie_consent';
  var FAB_DISMISS = 'msv_fab_dismissed';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------- styles ----------
  var css =
    '.sa-cookie[hidden],.sa-overlay[hidden],.sa-fab[hidden]{display:none!important}' +
    '.sa-cookie{position:fixed;left:0;right:0;bottom:0;z-index:120;background:var(--red,#d9333f);color:#fff;' +
    'font-family:var(--mono,ui-monospace,monospace);font-size:11px;letter-spacing:.06em;padding:14px 3.2vw;' +
    'display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}' +
    '.sa-cookie p{margin:0;max-width:82ch;line-height:1.5}' +
    '.sa-cookie button{background:#fff;color:#161513;border:0;padding:9px 18px;font-family:inherit;font-size:10px;' +
    'letter-spacing:.14em;text-transform:uppercase;cursor:pointer}' +
    '.sa-fab{position:fixed;right:24px;bottom:24px;z-index:110;transition:bottom .3s}' +
    'body.sa-cookie-open .sa-fab{bottom:90px}' +
    '.sa-login{display:inline-flex;align-items:center;gap:10px;background:var(--ink,#161513);color:var(--bone,#f4f1ea);' +
    'border:0;padding:13px 20px;border-radius:999px;font-family:var(--mono,ui-monospace,monospace);font-size:11px;' +
    'letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 14px 40px rgba(0,0,0,.24)}' +
    '.sa-login:hover{background:var(--red,#d9333f)}' +
    '.sa-avatar{width:48px;height:48px;border-radius:50%;background:var(--ink,#161513);color:var(--bone,#f4f1ea);border:0;' +
    'cursor:pointer;font-weight:800;font-size:17px;display:grid;place-items:center;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.24)}' +
    '.sa-avatar img{width:100%;height:100%;object-fit:cover}' +
    '.sa-menu{position:absolute;right:0;bottom:60px;background:var(--bone,#f4f1ea);border:1px solid rgba(22,21,19,.14);' +
    'border-radius:14px;min-width:230px;padding:10px;box-shadow:0 22px 60px rgba(0,0,0,.28)}' +
    '.sa-menu__info{padding:10px 12px;border-bottom:1px solid rgba(22,21,19,.12);margin-bottom:6px}' +
    '.sa-menu__info strong{display:block;font-size:14px;color:#161513}' +
    '.sa-menu__info span{font-size:12px;color:rgba(22,21,19,.55);word-break:break-all}' +
    '.sa-menu a,.sa-menu button{display:block;width:100%;text-align:left;background:none;border:0;padding:10px 12px;' +
    'font:inherit;font-size:13px;color:#161513;cursor:pointer;border-radius:8px;text-decoration:none}' +
    '.sa-menu a:hover,.sa-menu button:hover{background:rgba(22,21,19,.06)}' +
    '.sa-overlay{position:fixed;inset:0;z-index:130;background:rgba(12,11,10,.55);display:flex;align-items:center;' +
    'justify-content:center;padding:20px}' +
    '.sa-panel{background:var(--bone,#f4f1ea);color:#161513;width:min(420px,100%);border-radius:18px;padding:34px;' +
    'position:relative;font-family:var(--arch,Archivo,sans-serif)}' +
    '.sa-panel__close{position:absolute;right:16px;top:12px;background:none;border:0;font-size:24px;cursor:pointer;color:#161513;line-height:1}' +
    '.sa-panel h2{font-weight:900;font-size:26px;letter-spacing:-.02em;margin:0 0 4px}' +
    '.sa-sub{font-size:13px;color:rgba(22,21,19,.6);margin:0 0 20px}' +
    '.sa-field{display:flex;flex-direction:column;margin-bottom:16px}' +
    '.sa-field label{font-family:var(--mono,ui-monospace,monospace);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(22,21,19,.55);margin-bottom:8px}' +
    '.sa-field input{border:0;border-bottom:1px solid rgba(22,21,19,.16);background:transparent;padding:10px 2px;font:inherit;font-size:15px;outline:none;color:#161513}' +
    '.sa-field input:focus{border-color:var(--red,#d9333f)}' +
    '.sa-btn{width:100%;background:var(--ink,#161513);color:var(--bone,#f4f1ea);border:0;padding:14px;' +
    'font-family:var(--mono,ui-monospace,monospace);font-size:11px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}' +
    '.sa-btn:hover{background:var(--red,#d9333f)}.sa-btn[disabled]{opacity:.5;cursor:default}' +
    '.sa-divider{text-align:center;font-family:var(--mono,ui-monospace,monospace);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(22,21,19,.4);margin:18px 0}' +
    '.sa-oauth-btn{width:100%;background:var(--bone,#f4f1ea);color:#161513;border:1px solid rgba(22,21,19,.2);padding:13px;' +
    'font-family:var(--mono,ui-monospace,monospace);font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px}' +
    '.sa-oauth-btn:hover{border-color:#161513}' +
    '.sa-toggle{text-align:center;font-size:13px;margin-top:18px;color:rgba(22,21,19,.6)}' +
    '.sa-toggle button{background:none;border:0;color:var(--red,#d9333f);cursor:pointer;font:inherit;text-decoration:underline}' +
    '.sa-alert{padding:12px 14px;border-radius:10px;font-size:13px;margin-bottom:14px}' +
    '.sa-alert--error{background:rgba(217,51,63,.1);border:1px solid var(--red,#d9333f)}' +
    '.sa-alert--success{background:rgba(22,21,19,.05);border:1px solid rgba(22,21,19,.15)}' +
    '@media(max-width:520px){.sa-fab{right:14px}.sa-cookie{font-size:10px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- markup ----------
  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<div class="sa-cookie" id="saCookie" hidden><p>This site uses a small first-party cookie to keep you signed in and count visits. Nothing is shared with third parties.</p><button id="saCookieOk" type="button">Accept</button></div>' +
    '<div class="sa-fab" id="saFab" hidden></div>' +
    '<div class="sa-overlay" id="saOverlay" hidden><div class="sa-panel" role="dialog" aria-modal="true">' +
      '<button class="sa-panel__close" id="saClose" aria-label="Close">&times;</button>' +
      '<h2 id="saTitle">Log in</h2><p class="sa-sub" id="saSub">Sign in to your MoonStar account.</p>' +
      '<div id="saAlert"></div>' +
      '<form id="saLoginForm">' +
        '<div class="sa-field"><label for="saLoginId">Email</label><input id="saLoginId" type="text" autocomplete="username" required></div>' +
        '<div class="sa-field"><label for="saLoginPw">Password</label><input id="saLoginPw" type="password" autocomplete="current-password" required></div>' +
        '<button class="sa-btn" type="submit">Log in</button></form>' +
      '<form id="saSignupForm" hidden>' +
        '<div class="sa-field"><label for="saSuName">Name</label><input id="saSuName" type="text" autocomplete="name"></div>' +
        '<div class="sa-field"><label for="saSuEmail">Email</label><input id="saSuEmail" type="email" autocomplete="email" required></div>' +
        '<div class="sa-field"><label for="saSuPw">Password (min 8)</label><input id="saSuPw" type="password" autocomplete="new-password" minlength="8" required></div>' +
        '<button class="sa-btn" type="submit">Create account</button></form>' +
      '<div id="saOauth" hidden><div class="sa-divider">or</div>' +
        '<button class="sa-oauth-btn" id="saGoogle" type="button" hidden>Continue with Google</button>' +
        '<button class="sa-oauth-btn" id="saFacebook" type="button" hidden>Continue with Facebook</button></div>' +
      '<p class="sa-toggle"><span id="saToSignup">New here? <button type="button" id="saShowSignup">Create an account</button></span>' +
        '<span id="saToLogin" hidden>Have an account? <button type="button" id="saShowLogin">Log in</button></span></p>' +
    '</div></div>';
  document.body.appendChild(wrap);

  var $ = function (id) { return document.getElementById(id); };
  var cookie = $('saCookie'), fab = $('saFab'), overlay = $('saOverlay');
  var loginForm = $('saLoginForm'), signupForm = $('saSignupForm'), alertBox = $('saAlert');

  // ---------- cookie banner ----------
  if (ls(COOKIE_KEY) !== '1') { cookie.hidden = false; document.body.classList.add('sa-cookie-open'); }
  $('saCookieOk').addEventListener('click', function () {
    lset(COOKIE_KEY, '1'); cookie.hidden = true; document.body.classList.remove('sa-cookie-open');
  });

  // ---------- panel ----------
  function openPanel() { overlay.hidden = false; }
  function closePanel() { overlay.hidden = true; alertBox.innerHTML = ''; }
  function alertMsg(t, m) { alertBox.innerHTML = '<div class="sa-alert sa-alert--' + t + '">' + esc(m) + '</div>'; }
  $('saClose').addEventListener('click', closePanel);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closePanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closePanel(); });
  $('saShowSignup').addEventListener('click', function () {
    loginForm.hidden = true; signupForm.hidden = false; $('saToSignup').hidden = true; $('saToLogin').hidden = false;
    $('saTitle').textContent = 'Create account'; $('saSub').textContent = 'Join with your email or Google.'; alertBox.innerHTML = '';
  });
  $('saShowLogin').addEventListener('click', function () {
    signupForm.hidden = true; loginForm.hidden = false; $('saToLogin').hidden = true; $('saToSignup').hidden = false;
    $('saTitle').textContent = 'Log in'; $('saSub').textContent = 'Sign in to your MoonStar account.'; alertBox.innerHTML = '';
  });
  $('saGoogle').addEventListener('click', function () { window.location.href = '/api/account/google'; });
  $('saFacebook').addEventListener('click', function () { window.location.href = '/api/account/facebook'; });

  // ---------- render the fab (login pill / avatar+menu) ----------
  function renderFab(me) {
    var dismissed = ls(FAB_DISMISS) === '1';
    if (!me.authenticated && dismissed) { fab.hidden = true; return; }
    fab.hidden = false;

    if (!me.authenticated) {
      fab.innerHTML = '<button class="sa-login" id="saLoginBtn" type="button">Log in</button>';
      $('saLoginBtn').addEventListener('click', openPanel);
      return;
    }
    var label = (me.name || me.email || 'A').trim().charAt(0).toUpperCase() || 'A';
    var avatar = me.avatar_url
      ? '<img src="' + esc(me.avatar_url) + '" alt="">'
      : esc(label);
    fab.innerHTML =
      '<button class="sa-avatar" id="saAvatar" aria-label="Account">' + avatar + '</button>' +
      '<div class="sa-menu" id="saMenu" hidden>' +
        '<div class="sa-menu__info"><strong>' + esc(me.name || (me.role === 'admin' ? 'Admin' : 'Account')) + '</strong>' +
        (me.email ? '<span>' + esc(me.email) + '</span>' : '') + '</div>' +
        (me.role === 'admin' ? '<a href="/admin/dashboard.html">Go to dashboard &rarr;</a>' : '') +
        '<button id="saLogout" type="button">Log out</button>' +
      '</div>';
    var menu = $('saMenu');
    $('saAvatar').addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.sa-fab')) menu.hidden = true; });
    $('saLogout').addEventListener('click', async function () {
      try { await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' }); } finally { location.reload(); }
    });
  }

  async function refresh() {
    try {
      var me = await fetch('/api/account/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
      renderFab(me); return me;
    } catch (e) { renderFab({ authenticated: false }); return { authenticated: false }; }
  }

  async function loadProviders() {
    try {
      var p = await fetch('/api/account/oauth-providers').then(function (r) { return r.json(); });
      if (p.google || p.facebook) { $('saOauth').hidden = false; $('saGoogle').hidden = !p.google; $('saFacebook').hidden = !p.facebook; }
    } catch (e) {}
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault(); alertBox.innerHTML = '';
    var btn = loginForm.querySelector('.sa-btn'); btn.disabled = true;
    try {
      var r = await fetch('/api/account/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ identifier: $('saLoginId').value.trim(), password: $('saLoginPw').value }),
      });
      var d = await r.json();
      if (!r.ok) { alertMsg('error', d.error || 'Invalid login.'); return; }
      closePanel(); loginForm.reset(); await refresh();
    } catch (e2) { alertMsg('error', 'Something went wrong. Please try again.'); }
    finally { btn.disabled = false; }
  });

  signupForm.addEventListener('submit', async function (e) {
    e.preventDefault(); alertBox.innerHTML = '';
    var btn = signupForm.querySelector('.sa-btn'); btn.disabled = true;
    try {
      var r = await fetch('/api/account/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ name: $('saSuName').value.trim(), email: $('saSuEmail').value.trim(), password: $('saSuPw').value }),
      });
      var d = await r.json();
      if (!r.ok) { alertMsg('error', d.error || 'Could not create that account.'); return; }
      closePanel(); signupForm.reset(); await refresh();
    } catch (e2) { alertMsg('error', 'Something went wrong. Please try again.'); }
    finally { btn.disabled = false; }
  });

  // clean up ?login=success/error after a Google redirect
  if (/[?&]login=/.test(location.search)) {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }

  refresh();
  loadProviders();
})();
