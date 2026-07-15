(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var alertBox = document.getElementById('contact-form-alert');
  var submitBtn = document.getElementById('contact-submit');

  function showAlert(type, msg) {
    alertBox.innerHTML = '<div class="alert alert--' + type + '">' + msg + '</div>';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertBox.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    var payload = {
      name: document.getElementById('cf-name').value.trim(),
      email: document.getElementById('cf-email').value.trim(),
      phone: document.getElementById('cf-phone').value.trim(),
      project_type: document.getElementById('cf-project-type').value,
      message: document.getElementById('cf-message').value.trim(),
    };

    try {
      var res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        showAlert('error', data.error || 'Something went wrong. Please try again.');
        return;
      }

      var successMsg = (window.__siteContent && window.__siteContent.contact && window.__siteContent.contact.form_success_message) ||
        "Thank you so much! Your message has been sent — I'll get back to you soon.";
      showAlert('success', successMsg);
      form.reset();
    } catch (err) {
      showAlert('error', 'Something went wrong. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
})();
