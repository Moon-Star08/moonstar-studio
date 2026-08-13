(function () {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  // Always land at the top — including back/forward restores from the bfcache
  // (which don't re-run this script) and the Lenis smooth-scroll position.
  addEventListener('pageshow', function () {
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
  });

  gsap.registerPlugin(ScrollTrigger);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(pointer: coarse)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  // ---------- smooth scroll ----------
  if (!reduce) {
    var lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // ---------- custom cursor ----------
  if (!touch && !reduce) {
    var cur = $('#svcCursor');
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
    gsap.ticker.add(function () {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    });
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest('a,button,.v2-tier-row,.pkg,.v2-svcband-row')) cur.classList.add('is-link');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest('a,button,.v2-tier-row,.pkg,.v2-svcband-row')) cur.classList.remove('is-link');
    });
  } else {
    var curEl = $('#svcCursor');
    if (curEl) curEl.style.display = 'none';
  }

  // ---------- hero title: build chars ----------
  $$('#svcHeroTitle [data-chars]').forEach(function (row) {
    row.innerHTML = row.getAttribute('data-chars').split('').map(function (c) {
      // Wrap spaces in a .ch too — the hero font-size lives on .ch, so a bare
      // &nbsp; would inherit the default 16px and collapse the gap ("WHATI").
      return c === ' ' ? '<span class="ch">&nbsp;</span>' : '<span class="ch">' + c + '</span>';
    }).join('');
  });

  // ---------- hero: cursor proximity drives per-glyph weight ----------
  var heroChs = $$('#svcHeroTitle .ch');
  if (!reduce && heroChs.length) {
    var hx = -9999, hy = -9999, heroOn = false;
    var heroEl = $('#svcHero');
    heroEl.addEventListener('pointermove', function (e) { hx = e.clientX; hy = e.clientY; heroOn = true; });
    heroEl.addEventListener('pointerleave', function () { heroOn = false; });
    var heroStates = heroChs.map(function (ch) {
      var isThin = !!ch.closest('.row.thin');
      var base = isThin ? 100 : 900;
      return { ch: ch, w: base, base: base };
    });
    gsap.ticker.add(function () {
      for (var i = 0; i < heroStates.length; i++) {
        var s = heroStates[i];
        var target = s.base;
        if (heroOn) {
          var r = s.ch.getBoundingClientRect();
          var d = Math.hypot(hx - (r.left + r.width / 2), hy - (r.top + r.height / 2));
          var f = Math.max(0, 1 - d / 340);
          target = s.base === 900 ? 900 - 800 * f : 100 + 800 * f;
        }
        s.w += (target - s.w) * 0.16;
        s.ch.style.fontVariationSettings = "'wght' " + s.w.toFixed(0) + ", 'wdth' 100";
      }
    });
  }

  // ---------- veil intro + hero entrance ----------
  var veil = $('#svcVeil');
  if (reduce) {
    if (veil) veil.remove();
  } else {
    var tl = gsap.timeline({ delay: 0.25 });
    tl.to(veil, { yPercent: -100, duration: 0.9, ease: 'power3.inOut' })
      .set(veil, { display: 'none' })
      .to('.v2-reg-v', { scaleY: 1, duration: 1.0, ease: 'expo.out' }, '-=0.45')
      .to('.v2-reg-h', { scaleX: 1, duration: 1.0, ease: 'expo.out' }, '<')
      .to('.v2-reg-cross', { opacity: 0.5, duration: 0.6 }, '<0.3')
      .to('#svcHeroTitle .row > span', { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, '-=0.7')
      .to('#svcHeroSub', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.5')
      .to('#svcHeroActions', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.6');
  }

  // ---------- generic scroll reveals ----------
  if (!reduce) {
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      onEnter: function (els) {
        gsap.from(els, { y: 30, autoAlpha: 0, duration: 0.7, ease: 'expo.out', stagger: 0.08, overwrite: true });
      }
    });
  }

  // ---------- footer wordmark: weight follows cursor X (content-dependent) ----------
  function initFooterMark(brand) {
    var mark = $('#svcFootMark');
    if (!mark) return;
    mark.innerHTML = brand.toUpperCase().split('').map(function (c) {
      return c === ' ' ? '&nbsp;' : '<span class="fch">' + c + '</span>';
    }).join('');
    var fchs = $$('#svcFootMark .fch');
    if (!reduce && fchs.length) {
      var states = fchs.map(function (ch, i) {
        return { ch: ch, w: 900, pos: fchs.length > 1 ? i / (fchs.length - 1) : 0 };
      });
      var t = 0.5;
      addEventListener('pointermove', function (e) { t = e.clientX / innerWidth; });
      gsap.ticker.add(function () {
        for (var i = 0; i < states.length; i++) {
          var s = states[i];
          var d = Math.abs(s.pos - t);
          var target = 900 - Math.min(d * 2.2, 1) * 750;
          s.w += (target - s.w) * 0.16;
          s.ch.style.fontVariationSettings = "'wght' " + s.w.toFixed(0);
        }
      });
    }
  }

  function onSiteContent(content) {
    content = content || {};
    var brand = (content.site && content.site.brand_name) || 'MoonStar Studio';
    initFooterMark(brand);
    if (!reduce) ScrollTrigger.refresh();
  }

  // Same race guard as the homepage: run immediately if the content already
  // landed, otherwise wait for the one-shot event.
  if (window.__siteContent) {
    onSiteContent(window.__siteContent);
  } else {
    document.addEventListener('sitecontent:ready', function (e) { onSiteContent(e.detail || {}); }, { once: true });
  }

  addEventListener('load', function () { if (!reduce) ScrollTrigger.refresh(); });
})();
