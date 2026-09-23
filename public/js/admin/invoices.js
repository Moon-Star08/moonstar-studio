(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var alertBox = $('inv-alert');
  var form = $('invoice-form');
  var sendBtn = $('send-btn');
  var tbody = $('history-tbody');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function showAlert(kind, msg) {
    alertBox.innerHTML = '<div class="alert alert--' + kind + '">' + esc(msg) + '</div>';
    if (kind === 'success') setTimeout(function () { alertBox.innerHTML = ''; }, 6000);
  }
  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(s.indexOf('T') > 0 || s.indexOf(' ') > 0 ? s.replace(' ', 'T') + 'Z' : s);
    if (isNaN(d)) return s;
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // default the date to today
  (function () {
    var t = new Date();
    $('invoice_date').value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  })();

  function renderHistory(rows) {
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:rgba(22,21,19,.5)">No invoices sent yet.</td></tr>'; return; }
    tbody.innerHTML = rows.map(function (r) {
      var files = (r.files || []).map(esc).join(', ') || '—';
      var ok = r.status === 'sent';
      var badge = '<span style="font-family:var(--mono);font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:999px;'
        + (ok ? 'background:rgba(29,158,117,.15);color:#0f6e56;' : 'background:rgba(217,51,63,.15);color:#a32d2d;') + '">'
        + (ok ? 'SENT' : 'FAILED') + '</span>';
      return '<tr>'
        + '<td>' + esc(fmtDate(r.created_at)) + '</td>'
        + '<td>' + esc(r.title || '—') + '</td>'
        + '<td>' + esc(r.client_name || '—') + (r.company ? '<br><span style="color:rgba(22,21,19,.5);font-size:12px">' + esc(r.company) + '</span>' : '') + '</td>'
        + '<td>' + esc(r.client_email) + '</td>'
        + '<td style="font-size:12px">' + files + '</td>'
        + '<td>' + badge + (r.error ? '<br><span style="color:#a32d2d;font-size:11px">' + esc(r.error) + '</span>' : '') + '</td>'
        + '<td><button class="btn btn--sm" data-del="' + r.id + '" type="button">Delete</button></td>'
        + '</tr>';
    }).join('');
  }

  function loadHistory() {
    fetch('/api/admin/invoice-history', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (rows) { renderHistory(Array.isArray(rows) ? rows : []); })
      .catch(function () { tbody.innerHTML = '<tr><td colspan="7">Could not load history.</td></tr>'; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alertBox.innerHTML = '';
    var email = $('client_email').value.trim();
    var files = $('files').files;
    if (!email) { showAlert('error', 'Enter the client email.'); return; }
    if (!files.length) { showAlert('error', 'Attach at least one file.'); return; }

    var fd = new FormData();
    fd.append('title', $('title').value.trim());
    fd.append('client_name', $('client_name').value.trim());
    fd.append('company', $('company').value.trim());
    fd.append('client_email', email);
    fd.append('invoice_date', $('invoice_date').value);
    fd.append('message', $('message').value);
    for (var i = 0; i < files.length; i++) fd.append('files', files[i]);

    sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
    fetch('/api/admin/send-invoice', { method: 'POST', credentials: 'same-origin', body: fd })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        sendBtn.disabled = false; sendBtn.textContent = 'Send invoice';
        if (!res.ok) { showAlert('error', res.d.error || 'Could not send the invoice.'); loadHistory(); return; }
        showAlert('success', 'Invoice sent to ' + email + ' ✓');
        form.reset();
        (function () { var t = new Date(); $('invoice_date').value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); })();
        loadHistory();
      })
      .catch(function () { sendBtn.disabled = false; sendBtn.textContent = 'Send invoice'; showAlert('error', 'Something went wrong. Please try again.'); });
  });

  tbody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!confirm('Delete this history entry?')) return;
    fetch('/api/admin/invoice-history/' + btn.dataset.del, { method: 'DELETE', credentials: 'same-origin' })
      .then(function () { loadHistory(); });
  });

  $('clear-history-btn').addEventListener('click', function () {
    if (!confirm('Clear the entire send history? This cannot be undone.')) return;
    fetch('/api/admin/invoice-history', { method: 'DELETE', credentials: 'same-origin' })
      .then(function () { loadHistory(); });
  });

  $('logout-btn').addEventListener('click', function () {
    $('logout-btn').disabled = true;
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () { window.location.href = '/admin/login'; });
  });

  loadHistory();
})();
