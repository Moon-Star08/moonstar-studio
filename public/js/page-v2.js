/* Shared v2 chrome for the inner pages (About, Websites, Freelance, Contact).
   Handles: land-at-top, smooth scroll, custom cursor, veil + hero entrance,
   scroll reveals, and the footer wordmark. Page-specific behavior (project
   loading, contact form) lives in its own file and runs alongside this. */
(function () {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(pointer: coarse)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  // ---------- smooth scroll ----------
  var lenis = null;
  if (!reduce) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  addEventListener('pageshow', function () {
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
  });

  // ---------- custom cursor ----------
  if (!touch && !reduce) {
    var cur = $('#v2Cursor');
    if (cur) {
      var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
      addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
      gsap.ticker.add(function () {
        cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
        cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      });
      var hit = 'a,button,.v2-card,.v2-proj,.v2-pill,.v2-filters button,input,select,textarea';
      document.addEventListener('pointerover', function (e) { if (e.target.closest(hit)) cur.classList.add('is-link'); });
      document.addEventListener('pointerout', function (e) { if (e.target.closest(hit)) cur.classList.remove('is-link'); });
    }
  } else {
    var curEl = $('#v2Cursor');
    if (curEl) curEl.style.display = 'none';
  }

  // ---------- hero title: build chars (wrap spaces in .ch so they keep size) ----------
  $$('#v2HeroTitle [data-chars]').forEach(function (row) {
    row.innerHTML = row.getAttribute('data-chars').split('').map(function (c) {
      return c === ' ' ? '<span class="ch">&nbsp;</span>' : '<span class="ch">' + c + '</span>';
    }).join('');
  });

  // ---------- hero: cursor proximity drives per-glyph weight ----------
  var heroChs = $$('#v2HeroTitle .ch');
  if (!reduce && heroChs.length) {
    var hx = -9999, hy = -9999, heroOn = false;
    var heroEl = $('#v2Hero');
    if (heroEl) {
      heroEl.addEventListener('pointermove', function (e) { hx = e.clientX; hy = e.clientY; heroOn = true; });
      heroEl.addEventListener('pointerleave', function () { heroOn = false; });
      var heroStates = heroChs.map(function (ch) {
        var base = ch.closest('.row.thin') ? 100 : 900;
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
  }

  // ---------- veil intro + hero entrance ----------
  var veil = $('#v2Veil');
  if (reduce) {
    if (veil) veil.remove();
  } else {
    var tl = gsap.timeline({ delay: 0.2 });
    if (veil) tl.to(veil, { yPercent: -100, duration: 0.9, ease: 'power3.inOut' }).set(veil, { display: 'none' });
    tl.to('.v2-reg-v', { scaleY: 1, duration: 1.0, ease: 'expo.out' }, '-=0.45')
      .to('.v2-reg-h', { scaleX: 1, duration: 1.0, ease: 'expo.out' }, '<')
      .to('.v2-reg-cross', { opacity: 0.5, duration: 0.6 }, '<0.3')
      .to('#v2HeroTitle .row > span', { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, '-=0.7');
    if ($('#v2HeroSub')) tl.to('#v2HeroSub', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.5');
    if ($('#v2HeroActions')) tl.to('#v2HeroActions', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.6');
  }

  // ---------- generic scroll reveals ----------
  window.v2Reveal = function (scope) {
    if (reduce) return;
    var els = [].slice.call((scope || document).querySelectorAll('.reveal:not([data-revealed])'));
    if (!els.length) return;
    els.forEach(function (el) { el.setAttribute('data-revealed', '1'); });
    // pre-hide, then animate to visible (no snap/flash on fast scroll)
    gsap.set(els, { autoAlpha: 0, y: 30 });
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      onEnter: function (batch) {
        gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.08, overwrite: true });
      }
    });
  };
  window.v2Reveal(document);

  // ---------- footer wordmark: weight follows cursor X ----------
  function initFooterMark(brand) {
    var mark = $('#v2FootMark');
    if (!mark) return;
    mark.innerHTML = brand.toUpperCase().split('').map(function (c) {
      return c === ' ' ? '&nbsp;' : '<span class="fch">' + c + '</span>';
    }).join('');
    var fchs = $$('#v2FootMark .fch');
    if (!reduce && fchs.length) {
      var states = fchs.map(function (ch, i) { return { ch: ch, w: 900, pos: fchs.length > 1 ? i / (fchs.length - 1) : 0 }; });
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

    var src = content.home && content.home.hero_image;
    // optional hero photo bed (id v2HeroBed / v2HeroImg). A page may hardcode the
    // <img src> for a page-specific photo; otherwise fall back to the uploaded
    // home hero image.
    var bed = $('#v2HeroBed'), bedImg = $('#v2HeroImg');
    if (bed && bedImg) {
      var hasStatic = bedImg.getAttribute('src');
      if (hasStatic || src) {
        if (!hasStatic) bedImg.src = src;
        bedImg.hidden = false;
        if (reduce) bed.style.opacity = 1;
        else gsap.to(bed, { opacity: 1, duration: 1.4, ease: 'power2.out', delay: 0.7 });
      } else { bed.style.display = 'none'; }
    }
    // optional "who I am" photo (id v2WhoImg)
    var who = $('#v2WhoImg');
    if (who) {
      if (src) { who.src = src; who.hidden = false; }
      else if (who.closest('.whoami-media')) who.closest('.whoami-media').style.display = 'none';
    }

    if (!reduce) ScrollTrigger.refresh();
  }
  if (window.__siteContent) {
    onSiteContent(window.__siteContent);
  } else {
    document.addEventListener('sitecontent:ready', function (e) { onSiteContent(e.detail || {}); }, { once: true });
  }

  addEventListener('load', function () { if (!reduce) ScrollTrigger.refresh(); });
})();
