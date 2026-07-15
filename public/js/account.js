(function () {
  'use strict';

  var FAB_DISMISS_KEY = 'msv_fab_dismissed';
  var COOKIE_CONSENT_KEY = 'msv_cookie_consent';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // ---- Inject the FAB, login panel, and cookie banner once per page ----
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div id="login-fab-wrap" class="login-fab-wrap" hidden>' +
      '<button id="login-fab" class="login-fab" type="button">Login</button>' +
      '<button id="login-fab-close" class="login-fab-close" type="button" aria-label="Dismiss">&times;</button>' +
    '</div>' +
    '<div id="login-overlay" class="login-overlay" hidden>' +
      '<div class="login-panel" role="dialog" aria-modal="true" aria-labelledby="login-panel-title">' +
        '<button class="login-panel__close" id="login-panel-close" type="button" aria-label="Close">&times;</button>' +
        '<h2 id="login-panel-title" class="login-panel__title">Log in</h2>' +
        '<div id="login-panel-alert"></div>' +
        '<form id="login-form">' +
          '<div class="field">' +
            '<label for="lp-identifier">Email</label>' +
            '<input type="text" id="lp-identifier" name="identifier" autocomplete="username" required>' +
          '</div>' +
          '<div class="field">' +
            '<label for="lp-password">Password</label>' +
            '<input type="password" id="lp-password" name="password" autocomplete="current-password" required>' +
          '</div>' +
          '<button class="btn btn--primary btn--block" type="submit">Log in</button>' +
        '</form>' +
        '<form id="signup-form" hidden>' +
          '<div class="field">' +
            '<label for="sp-name">Name</label>' +
            '<input type="text" id="sp-name" name="name" autocomplete="name">' +
          '</div>' +
          '<div class="field">' +
            '<label for="sp-email">Email</label>' +
            '<input type="email" id="sp-email" name="email" autocomplete="email" required>' +
          '</div>' +
          '<div class="field">' +
            '<label for="sp-password">Password</label>' +
            '<input type="password" id="sp-password" name="password" autocomplete="new-password" minlength="8" required>' +
            '<span class="hint">At least 8 characters.</span>' +
          '</div>' +
          '<button class="btn btn--primary btn--block" type="submit">Sign up</button>' +
        '</form>' +
        '<div class="login-panel__oauth" id="oauth-buttons" hidden>' +
          '<div class="login-panel__divider">or</div>' +
          '<button class="btn btn--block" id="google-login-btn" type="button" hidden>Continue with Google</button>' +
          '<button class="btn btn--block" id="facebook-login-btn" type="button" hidden>Continue with Facebook</button>' +
        '</div>' +
        '<p class="login-panel__toggle">' +
          '<span id="toggle-to-signup">Don\'t have an account? <button type="button" id="show-signup-btn">Sign up</button></span>' +
          '<span id="toggle-to-login" hidden>Already have an account? <button type="button" id="show-login-btn">Log in</button></span>' +
        '</p>' +
      '</div>' +
    '</div>' +
    '<div id="cookie-banner" class="cookie-banner" hidden>' +
      '<p>This site uses a small first-party cookie to keep you signed in and count visits. Nothing is shared with third parties.</p>' +
      '<button class="btn btn--primary btn--sm" id="cookie-accept-btn" type="button">Accept</button>' +
    '</div>'
  );

  var fabWrap = document.getElementById('login-fab-wrap');
  var fab = document.getElementById('login-fab');
  var fabClose = document.getElementById('login-fab-close');
  var overlay = document.getElementById('login-overlay');
  var panelClose = document.getElementById('login-panel-close');
  var panelAlert = document.getElementById('login-panel-alert');
  var loginForm = document.getElementById('login-form');
  var signupForm = document.getElementById('signup-form');
  var showSignupBtn = document.getElementById('show-signup-btn');
  var showLoginBtn = document.getElementById('show-login-btn');
  var toggleToSignup = document.getElementById('toggle-to-signup');
  var toggleToLogin = document.getElementById('toggle-to-login');
  var oauthButtons = document.getElementById('oauth-buttons');
  var googleBtn = document.getElementById('google-login-btn');
  var facebookBtn = document.getElementById('facebook-login-btn');
  var cookieBanner = document.getElementById('cookie-banner');
  var cookieAcceptBtn = document.getElementById('cookie-accept-btn');

  function openPanel() {
    overlay.hidden = false;
  }

  function closePanel() {
    overlay.hidden = true;
    panelAlert.innerHTML = '';
  }

  function showPanelAlert(type, msg) {
    panelAlert.innerHTML = '<div class="alert alert--' + type + '">' + escapeHtml(msg) + '</div>';
  }

  fab.addEventListener('click', openPanel);
  panelClose.addEventListener('click', closePanel);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closePanel();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closePanel();
  });

  fabClose.addEventListener('click', function (e) {
    e.stopPropagation();
    fabWrap.hidden = true;
    try { localStorage.setItem(FAB_DISMISS_KEY, '1'); } catch (err) { /* ignore */ }
  });

  showSignupBtn.addEventListener('click', function () {
    loginForm.hidden = true;
    signupForm.hidden = false;
    toggleToSignup.hidden = true;
    toggleToLogin.hidden = false;
    panelAlert.innerHTML = '';
  });

  showLoginBtn.addEventListener('click', function () {
    signupForm.hidden = true;
    loginForm.hidden = false;
    toggleToLogin.hidden = true;
    toggleToSignup.hidden = false;
    panelAlert.innerHTML = '';
  });

  function maybeShowCookieBanner() {
    var accepted = false;
    try { accepted = localStorage.getItem(COOKIE_CONSENT_KEY) === '1'; } catch (err) { /* ignore */ }
    if (!accepted) cookieBanner.hidden = false;
  }

  cookieAcceptBtn.addEventListener('click', function () {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, '1'); } catch (err) { /* ignore */ }
    cookieBanner.hidden = true;
  });

  function renderProfileWidget(me) {
    var list = document.querySelector('.site-nav__links');
    if (!list) return;

    var existing = document.getElementById('profile-widget-li');
    if (existing) existing.remove();

    var html = '<li class="profile-widget-li" id="profile-widget-li"><div class="profile-widget" id="profile-widget">';

    if (me.authenticated) {
      var initial = (me.name || me.email || '?').trim().charAt(0).toUpperCase() || '?';
      html += '<button class="profile-widget__trigger is-avatar" id="profile-trigger" type="button" aria-label="Account menu">' + escapeHtml(initial) + '</button>';
      html += '<div class="profile-widget__menu" id="profile-menu" hidden>';
      html += '<div class="profile-widget__info"><strong>' + escapeHtml(me.name || (me.role === 'admin' ? 'Admin' : 'Account')) + '</strong>' + (me.email ? '<span>' + escapeHtml(me.email) + '</span>' : '') + '</div>';
      if (me.role === 'admin') {
        html += '<a class="profile-widget__link" href="/admin/dashboard.html">Admin Dashboard</a>';
      }
      html += '<button class="profile-widget__link" id="profile-logout-btn" type="button">Log out</button>';
      html += '</div>';
    } else {
      html += '<button class="profile-widget__trigger" id="profile-trigger" type="button" aria-label="Log in">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>' +
        '</button>';
    }
    html += '</div></li>';

    list.insertAdjacentHTML('beforeend', html);

    var trigger = document.getElementById('profile-trigger');
    var menu = document.getElementById('profile-menu');

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (me.authenticated) {
        menu.hidden = !menu.hidden;
      } else {
        openPanel();
      }
    });

    var logoutBtn = document.getElementById('profile-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function () {
        try {
          await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' });
        } finally {
          window.location.reload();
        }
      });
    }

    if (menu) {
      document.addEventListener('click', function (e) {
        if (!menu.hidden && !e.target.closest('.profile-widget')) menu.hidden = true;
      });
    }
  }

  function updateFabVisibility(me) {
    var dismissed = false;
    try { dismissed = localStorage.getItem(FAB_DISMISS_KEY) === '1'; } catch (err) { /* ignore */ }
    fabWrap.hidden = !!me.authenticated || dismissed;
  }

  async function refreshAccountState() {
    try {
      var res = await fetch('/api/account/me', { credentials: 'same-origin' });
      var me = await res.json();
      renderProfileWidget(me);
      updateFabVisibility(me);
      return me;
    } catch (err) {
      renderProfileWidget({ authenticated: false });
      return { authenticated: false };
    }
  }

  async function loadOAuthProviders() {
    try {
      var res = await fetch('/api/account/oauth-providers');
      var data = await res.json();
      if (data.google || data.facebook) {
        oauthButtons.hidden = false;
        googleBtn.hidden = !data.google;
        facebookBtn.hidden = !data.facebook;
      }
    } catch (err) { /* OAuth just stays hidden */ }
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    panelAlert.innerHTML = '';
    var identifier = document.getElementById('lp-identifier').value.trim();
    var password = document.getElementById('lp-password').value;
    var btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      var res = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ identifier: identifier, password: password }),
      });
      var data = await res.json();
      if (!res.ok) {
        showPanelAlert('error', data.error || 'Invalid email/username or password.');
        return;
      }
      closePanel();
      loginForm.reset();
      await refreshAccountState();
      maybeShowCookieBanner();
    } catch (err) {
      showPanelAlert('error', 'Something went wrong. Please try again.');
    } finally {
      btn.disabled = false;
    }
  });

  signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    panelAlert.innerHTML = '';
    var name = document.getElementById('sp-name').value.trim();
    var email = document.getElementById('sp-email').value.trim();
    var password = document.getElementById('sp-password').value;
    var btn = signupForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      var res = await fetch('/api/account/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: name, email: email, password: password }),
      });
      var data = await res.json();
      if (!res.ok) {
        showPanelAlert('error', data.error || 'Could not create that account.');
        return;
      }
      closePanel();
      signupForm.reset();
      await refreshAccountState();
      maybeShowCookieBanner();
    } catch (err) {
      showPanelAlert('error', 'Something went wrong. Please try again.');
    } finally {
      btn.disabled = false;
    }
  });

  refreshAccountState();
  loadOAuthProviders();
})();
