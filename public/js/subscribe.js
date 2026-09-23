(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var slug = new URLSearchParams(location.search).get('plan') || '';

  fetch('/api/plans', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (plans) {
      var plan = plans.filter(function (p) { return p.slug === slug; })[0] || plans[0];
      if (!plan) { $('p-name').textContent = 'Plan not found'; return; }
      slug = plan.slug;
      $('p-name').textContent = plan.name;
      $('p-price').textContent = '$' + plan.price + ' ' + plan.currency + ' / month';
      $('p-feats').innerHTML = (plan.features || []).slice(0, 6).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    })
    .catch(function () { $('p-name').textContent = 'Could not load plan'; });

  $('sub-form').addEventListener('submit', function (e) {
    e.preventDefault();
    $('s-err').textContent = '';
    var btn = $('s-btn');
    var payload = {
      plan_id: slug,
      name: $('s-name').value.trim(),
      email: $('s-email').value.trim(),
      phone: $('s-phone').value.trim(),
    };
    if (!payload.name || !payload.email || !payload.phone) { $('s-err').textContent = 'Please fill in all fields.'; return; }
    btn.disabled = true; btn.textContent = 'Starting…';
    fetch('/api/subscribe', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.checkout_url) { btn.disabled = false; btn.textContent = 'Continue to secure payment'; $('s-err').textContent = res.d.error || 'Could not start checkout.'; return; }
        window.location.href = res.d.checkout_url; // -> ABA PayWay
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Continue to secure payment'; $('s-err').textContent = 'Something went wrong. Please try again.'; });
  });
})();
