(function () {
  'use strict';

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
      var el = e.target.closest('a,button,.v2-frame,input');
      if (el) cur.classList.add('is-link');
    });
    document.addEventListener('pointerout', function (e) {
      var el = e.target.closest('a,button,.v2-frame,input');
      if (el) cur.classList.remove('is-link');
    });
  } else {
    var curEl = $('#v2Cursor');
    if (curEl) curEl.style.display = 'none';
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
        oWrap.style.opacity = p >= FLIP ? 0 : 1;
      }
    });
  })();

  // ---------- once real content has loaded, wire up text-dependent bits ----------
  document.addEventListener('sitecontent:ready', function (e) {
    var content = e.detail || {};

    // hero title: wrap words in spans for the reveal + cursor-weight effect
    var titleRow = $('#v2HeroTitle .row');
    var titleTarget = $('#v2HeroTitleWords');
    if (titleRow && titleTarget) {
      var words = (titleTarget.textContent || '').trim().split(/\s+/);
      titleTarget.innerHTML = words.map(function (w) {
        return '<span class="v2-word" style="display:inline-block;">' + w.split('').map(function (c) {
          return '<span class="ch" style="display:inline-block;">' + c + '</span>';
        }).join('') + '&nbsp;</span>';
      }).join('');
      if (reduce) { titleRow.querySelectorAll('span').forEach(function (s) { s.style.transform = 'none'; }); }
    }

    // hero: cursor proximity drives per-glyph weight
    var heroChs = $$('#v2HeroTitle .ch');
    if (!touch && !reduce && heroChs.length) {
      var hx = -9999, hy = -9999, heroOn = false;
      var hero = $('#v2Hero');
      hero.addEventListener('pointermove', function (e) { hx = e.clientX; hy = e.clientY; heroOn = true; });
      hero.addEventListener('pointerleave', function () { heroOn = false; });
      var states = heroChs.map(function (ch) { return { ch: ch, w: 900, base: 900 }; });
      gsap.ticker.add(function () {
        for (var i = 0; i < states.length; i++) {
          var s = states[i];
          var target = s.base;
          if (heroOn) {
            var r = s.ch.getBoundingClientRect();
            var d = Math.hypot(hx - (r.left + r.width / 2), hy - (r.top + r.height / 2));
            var f = Math.max(0, 1 - d / 260);
            target = 900 - 750 * f;
          }
          s.w += (target - s.w) * 0.16;
          s.ch.style.fontVariationSettings = "'wght' " + s.w.toFixed(0) + ", 'wdth' 100";
        }
      });
    }

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
    if (ribbon1) {
      ribbon1.innerHTML = '<span>' + line.repeat(8) + '</span><span>' + line.repeat(8) + '</span>';
      if (!reduce) {
        var rx = { x: 0 };
        var vel = 0;
        ScrollTrigger.create({ onUpdate: function (self) { vel = self.getVelocity() / 4000; } });
        gsap.ticker.add(function (t, dt) {
          var base = dt * 0.0018;
          rx.x -= base * (1 + Math.min(Math.abs(vel), 3));
          if (rx.x <= -50) rx.x += 50;
          ribbon1.style.transform = 'translate3d(' + rx.x + '%,0,0)';
        });
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
      if (!touch && !reduce) {
        addEventListener('pointermove', function (e) {
          var t = e.clientX / innerWidth;
          fchs.forEach(function (ch, i) {
            var pos = fchs.length > 1 ? i / (fchs.length - 1) : 0;
            var d = Math.abs(pos - t);
            var w = 900 - Math.min(d * 2.2, 1) * 750;
            ch.style.fontVariationSettings = "'wght' " + w.toFixed(0);
          });
        });
      }
    }

    if (!reduce) ScrollTrigger.refresh();
  });

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
        }
      });
    } else {
      title.style.transform = 'none';
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
        pin: true, scrub: 0.6, invalidateOnRefresh: true,
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

  // ---------- footer ghost zero parallax ----------
  if (!reduce) {
    gsap.fromTo('.v2-foot-zero', { yPercent: 16 }, {
      yPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '#v2Footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  addEventListener('load', function () { if (!reduce) ScrollTrigger.refresh(); });
})();
