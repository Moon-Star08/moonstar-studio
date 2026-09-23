(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tbody = $('sub-tbody'), alertBox = $('sub-alert');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function badge(status) {
    var map = { active: ['#0f6e56', 'rgba(29,158,117,.15)'], pending: ['#854f0b', 'rgba(239,159,39,.18)'], payment_failed: ['#a32d2d', 'rgba(217,51,63,.15)'], past_due: ['#a32d2d', 'rgba(217,51,63,.15)'], cancelled: ['#5f5e5a', 'rgba(22,21,19,.1)'] };
    var c = map[status] || map.cancelled;
    return '<span style="font-family:var(--mono);font-size:11px;letter-spacing:.05em;padding:3px 9px;border-radius:999px;color:' + c[0] + ';background:' + c[1] + '">' + esc(status.replace('_', ' ')) + '</span>';
  }
  function fmtDate(s) { if (!s) return '—'; var d = new Date((s.indexOf(' ') > 0 ? s.replace(' ', 'T') + 'Z' : s)); return isNaN(d) ? esc(s) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

  function render(rows) {
    var active = rows.filter(function (r) { return r.status === 'active'; });
    $('s-active').textContent = active.length;
    $('s-pending').textContent = rows.filter(function (r) { return r.status === 'pending'; }).length;
    $('s-total').textContent = rows.length;
    $('s-mrr').textContent = '$' + active.reduce(function (t, r) { return t + Number(r.amount || 0); }, 0);

    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:rgba(22,21,19,.5)">No subscriptions yet.</td></tr>'; return; }
    tbody.innerHTML = rows.map(function (r) {
      var cancellable = r.status === 'active' || r.status === 'pending' || r.status === 'payment_failed';
      return '<tr>'
        + '<td>' + esc(r.name) + '<br><span style="color:rgba(22,21,19,.5);font-size:12px">' + esc(r.email) + '</span></td>'
        + '<td>' + esc(r.plan_name) + '</td>'
        + '<td>$' + esc(r.amount) + ' ' + esc(r.currency) + '/mo</td>'
        + '<td>' + badge(r.status) + '</td>'
        + '<td style="font-family:var(--mono);font-size:12px">' + (esc(r.payment_method_masked) || '—') + '</td>'
        + '<td>' + fmtDate(r.next_billing_date) + '</td>'
        + '<td>' + (cancellable ? '<button class="btn btn--sm" data-cancel="' + esc(r.id) + '" type="button">Cancel</button>' : '') + '</td>'
        + '</tr>';
    }).join('');
  }

  function load() {
    fetch('/api/admin/subscriptions', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (rows) { render(Array.isArray(rows) ? rows : []); })
      .catch(function () { tbody.innerHTML = '<tr><td colspan="7">Could not load.</td></tr>'; });
  }

  tbody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    if (!confirm('Cancel this subscription? This stops future billing.')) return;
    fetch('/api/admin/subscriptions/' + btn.dataset.cancel + '/cancel', { method: 'POST', credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function () { alertBox.innerHTML = '<div class="alert alert--success">Subscription cancelled.</div>'; setTimeout(function () { alertBox.innerHTML = ''; }, 5000); load(); });
  });

  $('logout-btn').addEventListener('click', function () {
    $('logout-btn').disabled = true;
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () { window.location.href = '/admin/login'; });
  });

  load();
})();
