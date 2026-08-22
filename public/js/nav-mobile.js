/* Mobile nav — builds a burger button + full-screen drawer from the existing
   .v2-nav links, so every page gets a working phone menu with no markup changes. */
(function () {
  'use strict';

  var nav = document.querySelector('.v2-nav');
  if (!nav) return;
  var links = nav.querySelector('.links');
  if (!links || nav.querySelector('.v2-burger')) return;

  // burger (fixed, lives above the drawer so it stays clickable to close)
  var burger = document.createElement('button');
  burger.className = 'v2-burger';
  burger.type = 'button';
  burger.setAttribute('aria-label', 'Menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span><span></span><span></span>';

  // drawer with cloned links
  var drawer = document.createElement('nav');
  drawer.className = 'v2-drawer';
  drawer.setAttribute('aria-label', 'Mobile navigation');
  [].slice.call(links.querySelectorAll('a')).forEach(function (a) {
    var c = a.cloneNode(true);
    c.classList.remove('buy');
    drawer.appendChild(c);
  });

  document.body.appendChild(drawer);
  document.body.appendChild(burger);

  function setOpen(open) {
    burger.classList.toggle('open', open);
    drawer.classList.toggle('open', open);
    document.body.classList.toggle('v2-drawer-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  burger.addEventListener('click', function () {
    setOpen(!drawer.classList.contains('open'));
  });
  // close after tapping a link, or when Escape is pressed
  drawer.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setOpen(false);
  });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
