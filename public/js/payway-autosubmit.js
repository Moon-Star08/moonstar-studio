/* Auto-submits the ABA PayWay sign-up form. External file so it complies with
   the site's Content-Security-Policy (no inline scripts). */
(function () {
  var form = document.getElementById('payway-form');
  if (form) { try { form.submit(); } catch (e) { /* noscript button is the fallback */ } }
})();
