(function () {
  'use strict';

  var tbody = document.getElementById('projects-tbody');
  var alertBox = document.getElementById('dashboard-alert');
  var logoutBtn = document.getElementById('logout-btn');
  var messagesTbody = document.getElementById('messages-tbody');
  var messagesAlert = document.getElementById('messages-alert');
  var securityTbody = document.getElementById('security-tbody');
  var securityAlert = document.getElementById('security-alert');
  var clearLogBtn = document.getElementById('clear-log-btn');
  var usersTbody = document.getElementById('users-tbody');
  var usersAlert = document.getElementById('users-alert');

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function showAlert(type, msg) {
    alertBox.innerHTML = '<div class="alert alert--' + type + '">' + escapeHtml(msg) + '</div>';
  }

  function rowHtml(p) {
    var thumb = p.image_path
      ? '<img class="admin-table__thumb" src="' + escapeHtml(p.image_path) + '" alt="">'
      : '<div class="admin-table__thumb" style="display:flex;align-items:center;justify-content:center;font-size:0.5rem;">N/A</div>';

    var updated = p.updated_at ? p.updated_at.slice(0, 16).replace('T', ' ') : '';

    return (
      '<tr data-id="' + p.id + '">' +
        '<td>' + thumb + '</td>' +
        '<td class="title-cell">' + escapeHtml(p.title) + '</td>' +
        '<td><span class="badge-category">' + escapeHtml(p.category) + '</span></td>' +
        '<td>' + (p.featured ? '<span class="badge-featured">FEATURED</span>' : '—') + '</td>' +
        '<td>' + escapeHtml(updated) + '</td>' +
        '<td>' +
          '<div class="row-actions">' +
            '<a class="btn btn--sm" href="/admin/project-form.html?id=' + p.id + '">Edit</a>' +
            '<button class="btn btn--sm delete-btn" type="button" data-id="' + p.id + '" data-title="' + escapeHtml(p.title) + '">Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  }

  async function loadProjects() {
    tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
    try {
      var res = await fetch('/api/admin/projects', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var projects = await res.json();
      if (!projects.length) {
        tbody.innerHTML = '<tr><td colspan="6">No projects yet. Add your first one above.</td></tr>';
        return;
      }
      tbody.innerHTML = projects.map(rowHtml).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6">Failed to load projects.</td></tr>';
    }
  }

  tbody.addEventListener('click', async function (e) {
    var btn = e.target.closest('.delete-btn');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    var title = btn.getAttribute('data-title');
    if (!window.confirm('Delete "' + title + '"? This cannot be undone.')) return;

    btn.disabled = true;
    try {
      var res = await fetch('/api/admin/projects/' + id, { method: 'DELETE', credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      if (!res.ok) throw new Error('Delete failed');
      showAlert('success', 'Project "' + title + '" deleted.');
      loadProjects();
    } catch (err) {
      showAlert('error', 'Could not delete that project. Try again.');
      btn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async function () {
    logoutBtn.disabled = true;
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      window.location.href = '/admin/login.html';
    }
  });

  function showMessagesAlert(type, msg) {
    messagesAlert.innerHTML = '<div class="alert alert--' + type + '">' + escapeHtml(msg) + '</div>';
  }

  function messageRowHtml(m) {
    var received = m.created_at ? m.created_at.slice(0, 16).replace('T', ' ') : '';
    var contact = escapeHtml(m.email) + (m.phone ? '<br>' + escapeHtml(m.phone) : '');
    return (
      '<tr data-id="' + m.id + '">' +
        '<td>' + escapeHtml(received) + '</td>' +
        '<td class="title-cell">' + escapeHtml(m.name) + '</td>' +
        '<td>' + contact + '</td>' +
        '<td><span class="badge-category">' + escapeHtml(m.project_type) + '</span></td>' +
        '<td class="title-cell">' + escapeHtml(m.message) + '</td>' +
        '<td><button class="btn btn--sm message-delete-btn" type="button" data-id="' + m.id + '">Delete</button></td>' +
      '</tr>'
    );
  }

  async function loadMessages() {
    if (!messagesTbody) return;
    messagesTbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
    try {
      var res = await fetch('/api/admin/messages', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var messages = await res.json();
      if (!messages.length) {
        messagesTbody.innerHTML = '<tr><td colspan="6">No messages yet.</td></tr>';
        return;
      }
      messagesTbody.innerHTML = messages.map(messageRowHtml).join('');
    } catch (err) {
      messagesTbody.innerHTML = '<tr><td colspan="6">Failed to load messages.</td></tr>';
    }
  }

  if (messagesTbody) {
    messagesTbody.addEventListener('click', async function (e) {
      var btn = e.target.closest('.message-delete-btn');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      if (!window.confirm('Delete this message? This cannot be undone.')) return;

      btn.disabled = true;
      try {
        var res = await fetch('/api/admin/messages/' + id, { method: 'DELETE', credentials: 'same-origin' });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        if (!res.ok) throw new Error('Delete failed');
        showMessagesAlert('success', 'Message deleted.');
        loadMessages();
      } catch (err) {
        showMessagesAlert('error', 'Could not delete that message. Try again.');
        btn.disabled = false;
      }
    });
  }

  function showSecurityAlert(type, msg) {
    securityAlert.innerHTML = '<div class="alert alert--' + type + '">' + escapeHtml(msg) + '</div>';
  }

  function securityRowHtml(row) {
    var when = row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '';
    var result = row.success
      ? '<span class="badge-success">SUCCESS</span>'
      : '<span class="badge-fail">FAILED</span>';
    return (
      '<tr>' +
        '<td>' + escapeHtml(when) + '</td>' +
        '<td>' + escapeHtml(row.username_tried) + '</td>' +
        '<td>' + result + '</td>' +
        '<td>' + escapeHtml(row.ip) + '</td>' +
        '<td class="title-cell">' + escapeHtml(row.user_agent) + '</td>' +
      '</tr>'
    );
  }

  async function loadSecurityLog() {
    if (!securityTbody) return;
    securityTbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    try {
      var res = await fetch('/api/admin/login-attempts', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var rows = await res.json();
      if (!rows.length) {
        securityTbody.innerHTML = '<tr><td colspan="5">No login attempts recorded yet.</td></tr>';
        return;
      }
      securityTbody.innerHTML = rows.map(securityRowHtml).join('');
    } catch (err) {
      securityTbody.innerHTML = '<tr><td colspan="5">Failed to load the security log.</td></tr>';
    }
  }

  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', async function () {
      if (!window.confirm('Clear the entire security log? This cannot be undone.')) return;
      clearLogBtn.disabled = true;
      try {
        var res = await fetch('/api/admin/login-attempts', { method: 'DELETE', credentials: 'same-origin' });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        if (!res.ok) throw new Error('Clear failed');
        showSecurityAlert('success', 'Security log cleared.');
        loadSecurityLog();
      } catch (err) {
        showSecurityAlert('error', 'Could not clear the log. Try again.');
      } finally {
        clearLogBtn.disabled = false;
      }
    });
  }

  async function loadAnalytics() {
    try {
      var res = await fetch('/api/admin/analytics', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var data = await res.json();
      document.getElementById('stat-total-views').textContent = data.total_views;
      document.getElementById('stat-unique-visitors').textContent = data.unique_visitors;
      document.getElementById('stat-views-today').textContent = data.views_today;
      document.getElementById('stat-views-7d').textContent = data.views_7d;
      document.getElementById('stat-registered-users').textContent = data.registered_users;
    } catch (err) {
      // Stats are non-critical; leave the placeholders in place.
    }
  }

  function showUsersAlert(type, msg) {
    usersAlert.innerHTML = '<div class="alert alert--' + type + '">' + escapeHtml(msg) + '</div>';
  }

  function userRowHtml(u) {
    var joined = u.created_at ? u.created_at.slice(0, 16).replace('T', ' ') : '';
    var method = u.provider === 'local' ? 'Email' : escapeHtml(u.provider);
    return (
      '<tr data-id="' + u.id + '">' +
        '<td>' + escapeHtml(joined) + '</td>' +
        '<td class="title-cell">' + escapeHtml(u.name || '—') + '</td>' +
        '<td>' + escapeHtml(u.email) + '</td>' +
        '<td>' + method + '</td>' +
        '<td><button class="btn btn--sm user-delete-btn" type="button" data-id="' + u.id + '" data-email="' + escapeHtml(u.email) + '">Delete</button></td>' +
      '</tr>'
    );
  }

  async function loadUsers() {
    if (!usersTbody) return;
    usersTbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    try {
      var res = await fetch('/api/admin/users', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var rows = await res.json();
      if (!rows.length) {
        usersTbody.innerHTML = '<tr><td colspan="5">No visitor accounts yet.</td></tr>';
        return;
      }
      usersTbody.innerHTML = rows.map(userRowHtml).join('');
    } catch (err) {
      usersTbody.innerHTML = '<tr><td colspan="5">Failed to load users.</td></tr>';
    }
  }

  if (usersTbody) {
    usersTbody.addEventListener('click', async function (e) {
      var btn = e.target.closest('.user-delete-btn');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var email = btn.getAttribute('data-email');
      if (!window.confirm('Delete the account for "' + email + '"? This cannot be undone.')) return;

      btn.disabled = true;
      try {
        var res = await fetch('/api/admin/users/' + id, { method: 'DELETE', credentials: 'same-origin' });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        if (!res.ok) throw new Error('Delete failed');
        showUsersAlert('success', 'Account deleted.');
        loadUsers();
      } catch (err) {
        showUsersAlert('error', 'Could not delete that account. Try again.');
        btn.disabled = false;
      }
    });
  }

  loadProjects();
  loadMessages();
  loadSecurityLog();
  loadAnalytics();
  loadUsers();
})();
