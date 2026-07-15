(function () {
  'use strict';

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return (o || {})[k]; }, obj);
  }

  function apply(content) {
    window.__siteContent = content;

    document.querySelectorAll('[data-sc]').forEach(function (el) {
      var val = get(content, el.getAttribute('data-sc'));
      if (val == null) return;
      el.textContent = val;
    });

    document.querySelectorAll('[data-sc-href]').forEach(function (el) {
      var val = get(content, el.getAttribute('data-sc-href'));
      if (val == null) return;
      el.setAttribute('href', val);
    });

    document.querySelectorAll('[data-sc-mailto]').forEach(function (el) {
      var val = get(content, el.getAttribute('data-sc-mailto'));
      if (val == null) return;
      el.setAttribute('href', 'mailto:' + val);
    });

    document.querySelectorAll('[data-sc-tel]').forEach(function (el) {
      var val = get(content, el.getAttribute('data-sc-tel'));
      if (val == null) return;
      el.setAttribute('href', 'tel:' + String(val).replace(/[^+\d]/g, ''));
    });

    document.querySelectorAll('[data-sc-count]').forEach(function (el) {
      var val = get(content, el.getAttribute('data-sc-count'));
      if (val == null) return;
      el.setAttribute('data-count', val);
    });

    document.querySelectorAll('[data-sc-list]').forEach(function (el) {
      var val = get(content, el.getAttribute('data-sc-list'));
      if (val == null) return;
      var items = String(val).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      el.innerHTML = '';
      items.forEach(function (text) {
        var li = document.createElement('li');
        li.textContent = text;
        el.appendChild(li);
      });
    });

    document.dispatchEvent(new CustomEvent('sitecontent:ready', { detail: content }));
  }

  fetch('/api/settings')
    .then(function (res) { return res.json(); })
    .then(apply)
    .catch(function () {
      document.dispatchEvent(new CustomEvent('sitecontent:ready', { detail: {} }));
    });
})();
