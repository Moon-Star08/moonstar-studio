/* Customer subscription portal (magic-link sign-in).
   Two views: request a sign-in link, or (when signed in) see plans + cancel. */
(function () {
  'use strict';

  var viewLogin = document.getElementById('view-login');
  var viewAccount = document.getElementById('view-account');
  var viewLoading = document.getElementById('view-loading');

  function show(el) {
    [viewLogin, viewAccount, viewLoading].forEach(function (v) { v.classList.add('hidden'); });
    el.classList.remove('hidden');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso.length <= 10 ? iso + 'T00:00:00Z' : iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  function badgeFor(status) {
    if (status === 'active') return { cls: 'active', label: 'Active' };
    if (status === 'pending') return { cls: 'pending', label: 'Pending payment' };
    if (status === 'cancelled') return { cls: 'cancelled', label: 'Cancelled' };
    if (status === 'payment_failed') return { cls: 'other', label: 'Payment failed' };
    return { cls: 'other', label: status || 'Unknown' };
  }

  function renderPlans(data) {
    document.getElementById('acc-email').textContent = data.email || '';
    var wrap = document.getElementById('plans');
    var subs = data.subscriptions || [];
    if (!subs.length) {
      wrap.innerHTML = '<p class="acc-empty">No subscriptions found for this email yet. If you just subscribed, give it a minute and reload.</p>'
        + '<a class="acc-btn" href="/services" style="display:block;text-align:center;text-decoration:none;margin-top:16px;">View care plans</a>';
      return;
    }
    wrap.innerHTML = subs.map(function (s) {
      var b = badgeFor(s.status);
      var stateCls = s.status === 'cancelled' ? 'is-cancelled' : (s.status === 'active' ? '' : 'is-inactive');
      var meta = '';
      if (s.status === 'active') {
        meta = 'Started ' + fmtDate(s.started_at) + ' · Next billing ' + fmtDate(s.next_billing_date);
      } else if (s.status === 'cancelled') {
        meta = 'This plan has been cancelled. You won\'t be billed again.';
      } else if (s.status === 'pending') {
        meta = 'We\'re waiting on your payment to activate this plan.';
      } else {
        meta = 'Created ' + fmtDate(s.created_at);
      }
      var canCancel = s.status === 'active' || s.status === 'pending';
      var cancelBtn = canCancel
        ? '<button class="cancel-btn" data-id="' + esc(s.id) + '">Cancel plan</button>'
        : '';
      return '<div class="plan-card ' + stateCls + '">'
        + '<div class="plan-top">'
        + '<div><h2 class="plan-name">' + esc(s.plan_name) + '</h2>'
        + '<div class="plan-price">$' + esc(s.amount) + ' ' + esc(s.currency) + ' / month</div></div>'
        + '<span class="badge ' + b.cls + '">' + esc(b.label) + '</span>'
        + '</div>'
        + '<p class="plan-meta">' + meta + '</p>'
        + cancelBtn
        + '</div>';
    }).join('');

    Array.prototype.forEach.call(wrap.querySelectorAll('.cancel-btn'), function (btn) {
      btn.addEventListener('click', function () { cancelPlan(btn.getAttribute('data-id'), btn); });
    });
  }

  function cancelPlan(id, btn) {
    if (!window.confirm('Cancel this plan? You can subscribe again anytime.')) return;
    btn.disabled = true;
    btn.textContent = 'Cancelling…';
    fetch('/api/portal/cancel/' + encodeURIComponent(id), { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        var msg = document.getElementById('a-msg');
        if (res.ok && res.j.success) { msg.className = 'acc-msg ok'; msg.textContent = 'Your plan has been cancelled.'; loadAccount(); }
        else { msg.className = 'acc-msg err'; msg.textContent = (res.j && res.j.error) || 'Could not cancel. Please try again.'; btn.disabled = false; btn.textContent = 'Cancel plan'; }
      })
      .catch(function () {
        var msg = document.getElementById('a-msg'); msg.className = 'acc-msg err'; msg.textContent = 'Network error. Please try again.';
        btn.disabled = false; btn.textContent = 'Cancel plan';
      });
  }

  function loadAccount() {
    return fetch('/api/portal/me', { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (r.status === 401) { show(viewLogin); return null; }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        renderPlans(data);
        show(viewAccount);
      })
      .catch(function () { show(viewLogin); });
  }

  // login form
  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('l-email').value.trim();
    var btn = document.getElementById('l-btn');
    var msg = document.getElementById('l-msg');
    btn.disabled = true; btn.textContent = 'Sending…'; msg.textContent = '';
    fetch('/api/portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.success) {
          msg.className = 'acc-msg ok';
          msg.textContent = 'If that email has a subscription, a sign-in link is on its way. Check your inbox.';
        } else {
          msg.className = 'acc-msg err';
          msg.textContent = (res.j && res.j.error) || 'Something went wrong. Please try again.';
        }
      })
      .catch(function () { msg.className = 'acc-msg err'; msg.textContent = 'Network error. Please try again.'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Send me a sign-in link'; });
  });

  // logout
  document.getElementById('logout-btn').addEventListener('click', function () {
    fetch('/api/portal/logout', { method: 'POST' }).then(function () { show(viewLogin); });
  });

  // On load: if ?error=1 from an expired/invalid link, show it. Otherwise try
  // to load the account (signed in via the magic link) or fall back to login.
  var params = new URLSearchParams(window.location.search);
  if (params.get('error')) {
    show(viewLogin);
    var m = document.getElementById('l-msg');
    m.className = 'acc-msg err';
    m.textContent = 'That sign-in link was invalid or has expired. Enter your email to get a new one.';
  } else {
    show(viewLoading);
    loadAccount();
  }
}());
