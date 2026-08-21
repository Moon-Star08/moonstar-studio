(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var alertBox = document.getElementById('contact-form-alert');
  var submitBtn = document.getElementById('contact-submit');

  // Prefill when arriving from a package/care-plan button (?plan= or ?build=).
  // These are the Subscribe / Get started CTAs on the Services page.
  (function prefillFromQuery() {
    var params = new URLSearchParams(location.search);
    var plan = params.get('plan');
    var build = params.get('build');
    var PLANS = {
      'essential-care': 'Essential Care ($50/mo)',
      'business-care': 'Business Care ($85/mo)',
      'premium-care': 'Premium Care ($120/mo)',
    };
    var BUILDS = {
      'launchpad': 'LaunchPad ($299)',
      'growthsite': 'GrowthSite ($499)',
      'empiresite': 'EmpireSite ($949)',
    };
    var msgEl = document.getElementById('cf-message');
    var typeEl = document.getElementById('cf-project-type');
    var pre = '';
    if (plan && PLANS[plan]) {
      pre = "Hi! I'd like to subscribe to the " + PLANS[plan] + " care plan. ";
    } else if (build && BUILDS[build]) {
      pre = "Hi! I'd like to start a " + BUILDS[build] + " website build. ";
      if (typeEl) typeEl.value = 'Full Website';
    }
    if (pre && msgEl && !msgEl.value) msgEl.value = pre;
  })();

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
