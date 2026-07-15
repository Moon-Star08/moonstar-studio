(function () {
  'use strict';

  var form = document.getElementById('login-form');
  var alertBox = document.getElementById('form-alert');
  var btn = document.getElementById('login-btn');

  function showError(msg) {
    alertBox.innerHTML = '<div class="alert alert--error">' + msg + '</div>';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertBox.innerHTML = '';
    btn.disabled = true;
    btn.textContent = 'Logging in…';

    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;

    try {
      var res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password }),
      });

      if (res.ok) {
        window.location.href = '/admin/dashboard.html';
        return;
      }

      // Generic message regardless of whether it was the username or password.
      showError('Incorrect username or password.');
    } catch (err) {
      showError('Something went wrong. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });
})();
