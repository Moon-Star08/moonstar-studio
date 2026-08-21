/* Legal pages — FAQ-style accordion for the Privacy / Terms sections.
   Progressive enhancement: without this script the rows stay open and fully
   readable (the collapse styling only applies once we add the .js class). */
(function () {
  'use strict';

  var wraps = [].slice.call(document.querySelectorAll('.legal-faq'));
  if (!wraps.length) return;

  wraps.forEach(function (wrap) {
    wrap.classList.add('js'); // enables the collapsed (height:0) styling
    var items = [].slice.call(wrap.querySelectorAll('.faq'));

    items.forEach(function (item) {
      var btn = item.querySelector('button');
      var body = item.querySelector('.body');
      var inner = item.querySelector('.body__in');
      if (!btn || !body || !inner) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');

        // close any other open row (one at a time)
        items.forEach(function (o) {
          if (o === item || !o.classList.contains('open')) return;
          o.classList.remove('open');
          o.querySelector('.body').style.height = '0px';
          o.querySelector('button').setAttribute('aria-expanded', 'false');
        });

        if (isOpen) {
          item.classList.remove('open');
          body.style.height = '0px';
          btn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('open');
          body.style.height = inner.offsetHeight + 'px';
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // keep an open row correctly sized when the viewport reflows
    addEventListener('resize', function () {
      wrap.querySelectorAll('.faq.open').forEach(function (o) {
        o.querySelector('.body').style.height = o.querySelector('.body__in').offsetHeight + 'px';
      });
    });
  });
})();
