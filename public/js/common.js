(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector('.site-nav__toggle');
  var links = document.querySelector('.site-nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Scroll reveal ----
  var revealObserver = null;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
  }

  // Observe .reveal elements within root (document by default). Call this
  // again after injecting new markup (e.g. project cards loaded via fetch).
  window.observeReveal = function (root) {
    var scope = root || document;
    var els = scope.querySelectorAll('.reveal:not(.is-visible)');
    els.forEach(function (el) {
      if (revealObserver) {
        revealObserver.observe(el);
      } else {
        el.classList.add('is-visible');
      }
    });
  };

  window.observeReveal(document);

  // ---- Count-up stats ----
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reducedMotion) {
      el.textContent = target;
      return;
    }
    var duration = 900;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(progress * target);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }
    requestAnimationFrame(step);
  }

  var statEls = document.querySelectorAll('.stat__value[data-count]');
  if (statEls.length) {
    if (!('IntersectionObserver' in window)) {
      statEls.forEach(animateCount);
    } else {
      var statObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              statObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      statEls.forEach(function (el) { statObserver.observe(el); });
    }
  }

  // ---- Skill bar fill ----
  var skillBars = document.querySelectorAll('.skill__bar-fill[data-pct]');
  if (skillBars.length) {
    var fillBar = function (el) {
      var pct = el.getAttribute('data-pct');
      el.style.width = pct + '%';
    };
    if (!('IntersectionObserver' in window)) {
      skillBars.forEach(fillBar);
    } else {
      var skillObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              fillBar(entry.target);
              skillObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      skillBars.forEach(function (el) { skillObserver.observe(el); });
    }
  }
})();
