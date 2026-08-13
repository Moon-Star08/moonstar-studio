(function () {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(pointer: coarse)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  // ---------- substrate (smooth scroll) ----------
  if (!reduce) {
    var lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // ---------- cursor ----------
  if (!touch && !reduce) {
    var cur = $('#v2Cursor');
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
    gsap.ticker.add(function () {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    });
    document.addEventListener('pointerover', function (e) {
      var el = e.target.closest('a,button,.v2-frame,.v2-tier-row,.v2-glyph,input,[contenteditable]');
      if (el) cur.classList.add('is-link');
    });
    document.addEventListener('pointerout', function (e) {
      var el = e.target.closest('a,button,.v2-frame,.v2-tier-row,.v2-glyph,input,[contenteditable]');
      if (el) cur.classList.remove('is-link');
    });
  } else {
    var curEl = $('#v2Cursor');
    if (curEl) curEl.style.display = 'none';
  }

  // ---------- hero title: build chars from the fixed wordmark ----------
  $$('#v2HeroTitle [data-chars]').forEach(function (row) {
    row.innerHTML = row.getAttribute('data-chars').split('').map(function (c) {
      return c === ' ' ? '&nbsp;' : '<span class="ch">' + c + '</span>';
    }).join('');
  });

  // ---------- hero: cursor proximity drives per-glyph weight (bold thins, thin bolds) ----------
  var heroChs = $$('#v2HeroTitle .ch');
  if (!reduce && heroChs.length) {
    var hx = -9999, hy = -9999, heroOn = false;
    var heroEl = $('#v2Hero');
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

  // ---------- veil intro ----------
  var veil = $('#v2Veil');
  var introTl = null;
  if (reduce) {
    veil.remove();
  } else {
    introTl = gsap.timeline({ delay: 0.25 });
    introTl.to(veil, { yPercent: -100, duration: 0.9, ease: 'power3.inOut' })
      .set(veil, { display: 'none' })
      .to('.v2-reg-v', { scaleY: 1, duration: 1.0, ease: 'expo.out' }, '-=0.45')
      .to('.v2-reg-h', { scaleX: 1, duration: 1.0, ease: 'expo.out' }, '<')
      .to('.v2-reg-cross', { opacity: 0.5, duration: 0.6 }, '<0.3')
      .to('#v2HeroTitle .row > span', { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, '-=0.7')
      .to('#v2HeroSub', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.5')
      .to('#v2HeroActions', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.6')
      .to('#v2HeroBed', { opacity: 1, duration: 1.4, ease: 'power2.out' }, '-=0.9');
  }

  // ---------- portal: zoom through the letter O, palette flips on the stroke ----------
  (function initPortal() {
    var stage = $('#v2PortalStage'), oWrap = $('#v2OWrap'), line = $('#v2PortalLine');
    if (!stage) return;
    var oGlyph = stage.querySelector('.v2-o-glyph');
    var shards = $$('#v2-portal .v2-shard');
    var eyebrow = stage.querySelector('.v2-portal-eyebrow');
    var FLIP = 0.69;

    if (reduce) {
      stage.classList.add('inked');
      stage.style.backgroundColor = '#161513';
      oWrap.style.display = 'none';
      line.style.opacity = 1;
      return;
    }

    var prox = { p: 0 };
    gsap.to(prox, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: '#v2-portal', start: 'top bottom', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      onUpdate: function () {
        var p = prox.p;
        var travel = Math.min(Math.max((p - 0.15) / 0.597, 0), 1);
        if (p < FLIP + 0.03) {
          var fs = 64 * Math.pow(46, travel);
          var dx = 36 * gsap.parseEase('power2.inOut')(Math.min(Math.max((travel - 0.1) / 0.7, 0), 1));
          oGlyph.style.fontSize = fs.toFixed(2) + 'vmin';
          oWrap.style.transform = 'translate3d(' + dx.toFixed(2) + '%,0,0)';
        }
        eyebrow.style.opacity = 1 - Math.min(Math.max((p - 0.42) / 0.16, 0), 1);
        stage.classList.toggle('inked', p >= FLIP);

        var ip = Math.min(Math.max((p - 0.40) / 0.60, 0), 1);
        var lk = Math.min(Math.max((p - 0.66) / 0.10, 0), 1);
        line.style.opacity = lk;
        line.style.transform = 'translate(-50%,-50%) translateY(' + ((1 - lk) * 22) + 'px)';
        shards.forEach(function (sh, i) {
          var depth = sh.classList.contains('s-near') ? 190 : sh.classList.contains('s-mid') ? 130 : 85;
          var drift = (i % 2 ? 1 : -1) * ip * 7;
          sh.style.transform = 'translate3d(' + drift.toFixed(2) + 'vw,' + (-ip * depth).toFixed(2) + 'vh,0)';
        });

        stage.style.backgroundColor = gsap.utils.interpolate('#f4f1ea', '#161513')(
          Math.min(Math.max((p - 0.613) / 0.077, 0), 1));
        var fadeOut = Math.min(Math.max((p - (FLIP - 0.025)) / 0.05, 0), 1);
        oWrap.style.opacity = 1 - fadeOut;
      }
    });
  })();

  // ---------- once real content has loaded, wire up text-dependent bits ----------
  function onSiteContent(content) {
    content = content || {};

    // hero image bed
    var heroImg = $('#v2HeroImg');
    var heroBed = $('#v2HeroBed');
    var src = content.home && content.home.hero_image;
    if (heroImg) {
      if (src) { heroImg.src = src; heroImg.hidden = false; }
      else if (heroBed) { heroBed.style.display = 'none'; }
    }

    // ribbon marquee text, built from the three service titles
    var svcTitles = [
      content.home && content.home.service_1_title,
      content.home && content.home.service_2_title,
      content.home && content.home.service_3_title,
    ].filter(Boolean);
    if (!svcTitles.length) svcTitles = ['Web Design', 'UI / UX Design', 'Web Development'];
    var line = svcTitles.join('  &middot;  ') + '  &middot;  ';
    var ribbon1 = $('#v2Ribbon1');
    var ribbon2 = $('#v2Ribbon2');
    if (ribbon1) ribbon1.innerHTML = '<span>' + line.repeat(8) + '</span><span>' + line.repeat(8) + '</span>';
    if (ribbon2) ribbon2.innerHTML = '<span>' + line.repeat(8) + '</span><span>' + line.repeat(8) + '</span>';
    if ((ribbon1 || ribbon2) && !reduce) {
      var r1 = { x: 0 }, r2 = { x: -50 };
      var vel = 0;
      ScrollTrigger.create({ onUpdate: function (self) { vel = self.getVelocity() / 4000; } });
      gsap.ticker.add(function (t, dt) {
        var base = dt * 0.0018;
        r1.x -= base * (1 + Math.min(Math.abs(vel), 3));
        if (r1.x <= -50) r1.x += 50;
        r2.x += base * (1 + Math.min(Math.abs(vel), 3));
        if (r2.x >= 0) r2.x -= 50;
        if (ribbon1) ribbon1.style.transform = 'translate3d(' + r1.x + '%,0,0)';
        if (ribbon2) ribbon2.style.transform = 'translate3d(' + r2.x + '%,0,0)';
      });
    }

    // interlude photo: reuse the uploaded hero image if there is one, and let the
    // full-colour photo show through the headline letters (background-clip:text).
    var interImg = $('#v2InterImg');
    var interlude = $('#v2Interlude');
    var interFills = $$('#v2Interlude .knock .fill span');
    if (interImg) {
      if (src) {
        interImg.src = src; interImg.hidden = false;
        interFills.forEach(function (sp) { sp.style.backgroundImage = 'url("' + src + '")'; });
        if (interlude) interlude.classList.add('has-fill');
      } else {
        interImg.hidden = true;
        if (interlude) interlude.classList.remove('has-fill');
      }
    }

    // manifesto: word-breath reveal
    var maniP = $('#v2ManiText');
    if (maniP) {
      var words2 = maniP.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
      maniP.innerHTML = words2;
      var maniWords = $$('#v2ManiText .w');
      if (!reduce) {
        ScrollTrigger.create({
          trigger: '#v2-manifesto', start: 'top 85%', end: 'bottom bottom', scrub: 0.4,
          onUpdate: function (self) {
            var k = Math.min(Math.max((self.progress - 0.05) / 0.75, 0), 1);
            var n = Math.floor(k * maniWords.length);
            maniWords.forEach(function (w, i) { w.classList.toggle('on', i < n); });
          }
        });
        $$('.v2-mani-shard').forEach(function (sh, i) {
          gsap.fromTo(sh, { yPercent: i ? -70 : 80 }, {
            yPercent: i ? 80 : -100, ease: 'none',
            scrollTrigger: { trigger: '#v2-manifesto', start: 'top bottom', end: 'bottom top', scrub: true }
          });
        });
      } else {
        maniWords.forEach(function (w) { w.classList.add('on'); });
      }
    }

    // process: four steps pulled from the "How I Work" content
    var services = content.services || {};
    var steps = [1, 2, 3, 4].map(function (n) {
      return {
        title: services['step_' + n + '_title'] || ['Discover', 'Design', 'Develop', 'Launch'][n - 1],
        desc: services['step_' + n + '_desc'] || '',
      };
    });
    initProcess(steps);

    // featured work: horizontal scroll of real projects
    loadWork();

    // stats count-up
    initStatCounts();

    // footer wordmark
    var brand = (content.site && content.site.brand_name) || 'MoonStar Studio';
    var footMark = $('#v2FootMark');
    if (footMark) {
      footMark.innerHTML = brand.toUpperCase().split('').map(function (c) {
        return c === ' ' ? '&nbsp;' : '<span class="fch">' + c + '</span>';
      }).join('');
      var fchs = $$('#v2FootMark .fch');
      if (!reduce && fchs.length) {
        var footStates = fchs.map(function (ch, i) {
          return { ch: ch, w: 900, pos: fchs.length > 1 ? i / (fchs.length - 1) : 0 };
        });
        var footT = 0.5;
        addEventListener('pointermove', function (e) { footT = e.clientX / innerWidth; });
        gsap.ticker.add(function () {
          for (var i = 0; i < footStates.length; i++) {
            var s = footStates[i];
            var d = Math.abs(s.pos - footT);
            var target = 900 - Math.min(d * 2.2, 1) * 750;
            s.w += (target - s.w) * 0.16;
            s.ch.style.fontVariationSettings = "'wght' " + s.w.toFixed(0);
          }
        });
      }
    }

    if (!reduce) ScrollTrigger.refresh();
  }

  // Run as soon as the site content is available. site-content.js dispatches a
  // one-shot 'sitecontent:ready' event, but on a cold load /api/settings can
  // resolve before the vendor JS + this file finish downloading — so the event
  // may fire before this listener is registered. Guard against that race by
  // checking for content that already landed on window.__siteContent.
  if (window.__siteContent) {
    onSiteContent(window.__siteContent);
  } else {
    document.addEventListener('sitecontent:ready', function (e) {
      onSiteContent(e.detail || {});
    }, { once: true });
  }

  // ---------- process (replaces the reference's weight-axis section) ----------
  function initProcess(steps) {
    var title = $('#v2ProcTitle'), hud = $('#v2ProcHud'), tick = $('#v2ProcTick'),
        num = $('#v2ProcNum'), name = $('#v2ProcName'), rail = $('#v2ProcRail');
    if (!title) return;
    for (var i = 0; i < steps.length; i++) {
      var n = document.createElement('i');
      n.style.left = (i / (steps.length - 1) * 100) + '%';
      rail.appendChild(n);
    }
    var detent = -1;
    function apply(idx) {
      if (idx === detent) return;
      detent = idx;
      title.textContent = String(idx + 1).padStart(2, '0');
      num.textContent = 'step ' + (idx + 1) + ' / ' + steps.length;
      name.textContent = steps[idx].title;
      name.classList.remove('stamped'); void name.offsetWidth; name.classList.add('stamped');
    }
    if (!reduce) {
      var st = { p: 0 };
      gsap.to(st, {
        p: 1, ease: 'none',
        scrollTrigger: { trigger: '#v2-process', start: 'top bottom', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true },
        onUpdate: function () {
          var p = st.p;
          var rev = gsap.parseEase('expo.out')(Math.min(Math.max((p - 0.08) / 0.34, 0), 1));
          title.style.transform = 'translateY(' + ((1 - rev) * 115) + '%)';
          hud.style.opacity = Math.min(Math.max((p - 0.30) / 0.12, 0), 1);
          var wp = Math.min(Math.max((p - 0.44) / 0.52, 0), 1);
          apply(Math.min(steps.length - 1, Math.round(wp * (steps.length - 1))));
          tick.style.left = (wp * 100) + '%';
          title.style.fontVariationSettings = "'wght' " + Math.round(100 + wp * 800);
        }
      });
    } else {
      title.style.transform = 'none';
      title.style.fontVariationSettings = "'wght' 700";
      hud.style.opacity = 1;
      apply(0);
    }
  }

  // ---------- featured work: pinned horizontal scroll of real projects ----------
  function loadWork() {
    var track = $('#v2Track');
    var meta = $('#v2WorkMeta');
    if (!track || !window.PortfolioAPI) return;

    PortfolioAPI.fetchProjects({ featured: '1' })
      .then(function (projects) {
        if (projects.length) return projects;
        return PortfolioAPI.fetchProjects({}).then(function (all) { return all.slice(0, 6); });
      })
      .then(function (projects) {
        if (!projects.length) {
          track.innerHTML = '<p class="v2-frame-empty">No projects yet &mdash; check back soon.</p>';
          return;
        }
        if (meta) meta.textContent = 'drag or scroll · ' + projects.length + ' project' + (projects.length === 1 ? '' : 's');
        track.innerHTML = projects.map(function (p, i) {
          var img = p.image_path
            ? '<img src="' + PortfolioAPI.escapeHtml(p.image_path) + '" alt="' + PortfolioAPI.escapeHtml(p.title) + '" loading="lazy">'
            : '';
          return (
            '<figure class="v2-frame">' + img +
              '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
              '<figcaption class="cap">' + PortfolioAPI.escapeHtml(p.title) + '</figcaption>' +
            '</figure>'
          );
        }).join('');
        initWorkScroll(track);
      })
      .catch(function () {
        track.innerHTML = '<p class="v2-frame-empty">Couldn\'t load projects right now.</p>';
      });
  }

  function initWorkScroll(track) {
    if (reduce) return;
    var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: '#v2WorkPin', start: 'top 12%', end: function () { return '+=' + dist(); },
        pin: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true,
      }
    });
  }

  // ---------- stats count-up ----------
  function initStatCounts() {
    $$('.v2-led-row .v[data-sc-count]').forEach(function (el) {
      var raw = el.getAttribute('data-count') || el.textContent || '0';
      var target = parseInt(raw, 10) || 0;
      if (reduce || !target) { el.textContent = raw; return; }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          obs.unobserve(el);
          var start = null;
          var duration = 900;
          function step(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            if (progress < 1) {
              el.textContent = Math.floor(progress * target);
              requestAnimationFrame(step);
            } else {
              el.textContent = raw;
            }
          }
          requestAnimationFrame(step);
        });
      }, { threshold: 0.4 });
      obs.observe(el);
    });
  }

  // ---------- tester ----------
  (function initTester() {
    var line = $('#v2TesterLine'), read = $('#v2TesterRead');
    var cW = $('#v2CWght'), cD = $('#v2CWdth'), cS = $('#v2CSize');
    var rW = $('#v2RWght'), rD = $('#v2RWdth'), rS = $('#v2RSize');
    if (!line || !cW) return;
    var state = { w: 700, d: 100, s: 64 };
    function render() {
      line.style.fontVariationSettings = "'wght' " + state.w + ", 'wdth' " + state.d;
      line.style.fontSize = state.s + 'px';
      rW.textContent = state.w; rD.textContent = state.d; rS.textContent = state.s;
      read.innerHTML = 'wght ' + state.w + ' &middot; wdth ' + state.d + ' &middot; ' + state.s + 'px';
    }
    var presets = $$('#v2Presets button');
    function clearPreset() { presets.forEach(function (b) { b.classList.remove('on'); }); }
    cW.addEventListener('input', function () { state.w = +cW.value; render(); clearPreset(); });
    cD.addEventListener('input', function () { state.d = +cD.value; render(); clearPreset(); });
    cS.addEventListener('input', function () { state.s = +cS.value; render(); });
    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        clearPreset(); b.classList.add('on');
        gsap.to(state, {
          w: +b.getAttribute('data-w'), d: +b.getAttribute('data-d'), duration: 0.6, ease: 'expo.out',
          onUpdate: function () {
            state.w = Math.round(state.w); state.d = Math.round(state.d);
            cW.value = state.w; cD.value = state.d; render();
          }
        });
      });
    });
    line.addEventListener('paste', function (e) {
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    render();
  })();

  // ---------- features: hover demos ----------
  (function initFeatures() {
    var anims = {
      count: function (el) {
        var o = { n: 0 };
        gsap.to(o, {
          n: 1000000, duration: 0.9, ease: 'power2.out',
          onUpdate: function () { el.textContent = '$' + o.n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        });
      },
      case: function (el) { gsap.fromTo(el, { letterSpacing: '0.2em', opacity: 0.4 }, { letterSpacing: '0em', opacity: 1, duration: 0.6, ease: 'expo.out' }); },
      alt: function (el) {
        var o = { w: 100 };
        gsap.to(o, {
          w: 800, duration: 0.7, ease: 'expo.out',
          onUpdate: function () { el.style.fontVariationSettings = "'wght' " + Math.round(o.w); }
        });
      },
      arrows: function (el) { gsap.fromTo(el, { x: -16, opacity: 0.3 }, { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }); },
    };
    $$('.v2-feat-row').forEach(function (row) {
      var demo = row.querySelector('.demo');
      var kind = demo.getAttribute('data-anim');
      var orig = demo.innerHTML;
      row.addEventListener('pointerenter', function () { if (!reduce && anims[kind]) anims[kind](demo); });
      row.addEventListener('pointerleave', function () { if (kind === 'count') demo.innerHTML = orig; });
    });
  })();

  // ---------- interlude parallax ----------
  if (!reduce && $('#v2Interlude')) {
    gsap.fromTo('#v2InterImg', { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '#v2Interlude', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.from('.v2-interlude .knock span', {
      yPercent: 70, opacity: 0, stagger: 0.16, duration: 1.5, ease: 'expo.out',
      scrollTrigger: { trigger: '#v2Interlude', start: 'top 78%' }
    });
  }

  // ---------- glyph grid ----------
  (function initGlyphs() {
    var chars = 'MOONSTARSTUDIOWEBDESIGN&0479#@?!';
    var grid = $('#v2GlyphGrid');
    if (!grid) return;
    chars.split('').forEach(function (c) {
      var d = document.createElement('span');
      d.className = 'v2-glyph';
      d.textContent = c;
      grid.appendChild(d);
    });
    while (grid.children.length % 10) {
      var d = document.createElement('span');
      d.className = 'v2-glyph';
      d.innerHTML = '&middot;';
      grid.appendChild(d);
    }
    if (!reduce) {
      gsap.to('.v2-glyph', {
        opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)',
        stagger: { each: 0.012, grid: 'auto', from: 'random' },
        scrollTrigger: { trigger: '#v2GlyphGrid', start: 'top 82%' }
      });
    } else {
      $$('.v2-glyph').forEach(function (g) { g.style.opacity = 1; g.style.transform = 'none'; });
    }
  })();

  // ---------- footer ghost zero parallax ----------
  if (!reduce) {
    gsap.fromTo('.v2-foot-zero', { yPercent: 16 }, {
      yPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '#v2Footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  addEventListener('load', function () { if (!reduce) ScrollTrigger.refresh(); });
})();
