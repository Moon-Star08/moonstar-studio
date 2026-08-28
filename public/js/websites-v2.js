/* Work page — editorial project gallery (real projects) + tag filters, plus the
   scroll-highlighted capabilities statement. Reveals via page-v2.js. */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gallery = document.getElementById('v2WorkGallery');
  var filterBar = document.getElementById('v2Filters');
  var esc = window.PortfolioAPI && PortfolioAPI.escapeHtml;

  // ---- capabilities statement: highlight lines on scroll ----
  (function initStatement() {
    var stmt = document.getElementById('wkStatement');
    if (!stmt) return;
    var spans = [].slice.call(stmt.querySelectorAll('span'));
    if (reduce || !window.ScrollTrigger) { spans.forEach(function (s) { s.classList.add('on'); }); return; }
    ScrollTrigger.create({
      trigger: stmt, start: 'top 78%', end: 'bottom 60%', scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * spans.length);
        spans.forEach(function (s, i) { s.classList.toggle('on', i < n); });
      }
    });
  })();

  if (!gallery || !window.PortfolioAPI) return;

  var allProjects = [];
  var activeTag = 'all';

  function uniqueTags(projects) {
    var set = {};
    projects.forEach(function (p) { (p.tech_tags || []).forEach(function (t) { set[t] = 1; }); });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function renderFilters(tags) {
    if (!filterBar) return;
    var html = ['<button class="is-active" data-tag="all" type="button">All</button>'];
    tags.forEach(function (t) { html.push('<button data-tag="' + esc(t) + '" type="button">' + esc(t) + '</button>'); });
    filterBar.innerHTML = html.join('');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      activeTag = btn.getAttribute('data-tag');
      [].slice.call(filterBar.children).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      renderGallery();
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Per-project scroll motion (same language as the reference design): the media
  // frame scales up as it passes through, the image parallaxes inside it, the
  // title rises out of a mask, and the copy fades in.
  var builtTriggers = [];
  function animateRows() {
    builtTriggers.forEach(function (t) { t.kill(); });
    builtTriggers = [];
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    function reg(tw) { if (tw && tw.scrollTrigger) builtTriggers.push(tw.scrollTrigger); }
    gsap.utils.toArray('.wk-proj').forEach(function (proj) {
      var media = proj.querySelector('.wk-proj__media');
      var img = proj.querySelector('.wk-proj__media img');
      var titleSpan = proj.querySelector('.wk-proj__title span');
      var idx = proj.querySelector('.wk-proj__idx');
      var rest = [proj.querySelector('.wk-proj__desc'), proj.querySelector('.wk-proj__tags')].filter(Boolean);
      if (img) reg(gsap.fromTo(img, { yPercent: -6, scale: 1.1 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: proj, start: 'top bottom', end: 'bottom top', scrub: true } }));
      if (titleSpan) reg(gsap.from(titleSpan, { yPercent: 115, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: proj, start: 'top 74%' } }));
      if (idx) reg(gsap.from(idx, { y: 18, opacity: 0, duration: .7, scrollTrigger: { trigger: proj, start: 'top 72%' } }));
      if (rest.length) reg(gsap.from(rest, { y: 20, opacity: 0, stagger: .1, duration: .7, delay: .1, scrollTrigger: { trigger: proj, start: 'top 68%' } }));
    });
    ScrollTrigger.refresh();
  }

  function rowHtml(p, i, total) {
    var media = p.image_path
      ? '<img src="' + esc(p.image_path) + '" alt="' + esc(p.title) + '" loading="lazy">'
      : '<div class="wk-proj__ph">No image</div>';
    var go = p.live_url
      ? '<a class="wk-proj__go" href="' + esc(p.live_url) + '" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>'
      : '';
    var tags = (p.tech_tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    return '<article class="wk-proj">' +
      '<div class="wk-proj__copy">' +
        '<div class="wk-proj__idx">' + pad(i + 1) + ' / ' + pad(total) + '</div>' +
        '<h3 class="wk-proj__title"><span>' + esc(p.title) + '</span></h3>' +
        (p.short_description ? '<p class="wk-proj__desc">' + esc(p.short_description) + '</p>' : '') +
        (tags ? '<div class="wk-proj__tags">' + tags + '</div>' : '') +
      '</div>' +
      '<div class="wk-proj__media">' + media + '<span class="wk-proj__glare" aria-hidden="true"></span>' + go + '</div>' +
    '</article>';
  }

  function renderGallery() {
    var projects = activeTag === 'all' ? allProjects : allProjects.filter(function (p) {
      return (p.tech_tags || []).some(function (t) { return t === activeTag; });
    });
    if (!projects.length) { gallery.innerHTML = '<p class="v2-state" style="padding:6vh 0">No projects match that filter yet.</p>'; return; }
    gallery.innerHTML = projects.map(function (p, i) { return rowHtml(p, i, projects.length); }).join('');
    animateRows();
    initTilt();
  }

  // Spring-smoothed 3D tilt (comet-card style): an element leans toward the
  // cursor and settles back on leave. Applied to project frames (with glare)
  // and to the pricing plan cards (tilt only, to keep the copy crisp).
  var tilts = [], tiltRAF = null;
  function addTilt(el, depth) {
    if (reduce || el.__tilt) return;
    el.__tilt = true;
    var s = { tx: 0, ty: 0, cx: 0, cy: 0, vx: 0, vy: 0, th: 0, ch: 0, vh: 0, over: false, el: el, d: depth || 11, glare: el.querySelector('.wk-proj__glare') };
    el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); s.tx = (e.clientX - r.left) / r.width - 0.5; s.ty = (e.clientY - r.top) / r.height - 0.5; });
    el.addEventListener('pointerenter', function () { s.over = true; });
    el.addEventListener('pointerleave', function () { s.over = false; s.tx = 0; s.ty = 0; });
    tilts.push(s);
    if (!tiltRAF) loopTilt();
  }
  function initTilt() {
    [].forEach.call(document.querySelectorAll('.wk-proj__media'), function (el) { addTilt(el, 11); });
  }
  function loopTilt() {
    var dt = 1 / 60, K = 90, D = 14;
    for (var i = 0; i < tilts.length; i++) {
      var s = tilts[i];
      s.vx += ((s.tx - s.cx) * K - s.vx * D) * dt; s.cx += s.vx * dt;
      s.vy += ((s.ty - s.cy) * K - s.vy * D) * dt; s.cy += s.vy * dt;
      s.th = s.over ? 1 : 0; s.vh += ((s.th - s.ch) * K - s.vh * D) * dt; s.ch += s.vh * dt;
      var rotX = (s.cy * s.d).toFixed(2), rotY = (-s.cx * s.d).toFixed(2), sc = (1 + s.ch * 0.03).toFixed(3), z = (s.ch * 34).toFixed(1);
      s.el.style.transform = 'perspective(1100px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateZ(' + z + 'px) scale(' + sc + ')';
      if (s.glare) {
        s.glare.style.opacity = (s.ch * 0.5).toFixed(2);
        s.glare.style.background = 'radial-gradient(circle at ' + ((s.cx * 100) + 50).toFixed(0) + '% ' + ((s.cy * 100) + 50).toFixed(0) + '%, rgba(255,255,255,.75) 8%, rgba(255,255,255,0) 60%)';
      }
    }
    tiltRAF = requestAnimationFrame(loopTilt);
  }
  // Pricing plan cards are static in the HTML — wire them once, with a gentler tilt.
  [].forEach.call(document.querySelectorAll('.wk-plan'), function (el) { addTilt(el, 8); });

  PortfolioAPI.fetchProjects()
    .then(function (projects) {
      allProjects = projects || [];
      if (!allProjects.length) { gallery.innerHTML = '<p class="v2-state" style="padding:6vh 0">No projects yet — check back soon.</p>'; return; }
      renderFilters(uniqueTags(allProjects));
      renderGallery();
    })
    .catch(function () {
      gallery.innerHTML = '<p class="v2-state" style="padding:6vh 0">Couldn\'t load projects right now.</p>';
    });
})();
