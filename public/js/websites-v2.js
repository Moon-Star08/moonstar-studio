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

  function rowHtml(p, i, total) {
    var media = p.image_path
      ? '<img src="' + esc(p.image_path) + '" alt="' + esc(p.title) + '" loading="lazy">'
      : '<div class="wk-proj__ph">No image</div>';
    var go = p.live_url
      ? '<a class="wk-proj__go" href="' + esc(p.live_url) + '" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>'
      : '';
    var tags = (p.tech_tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    return '<article class="wk-proj reveal">' +
      '<div class="wk-proj__copy">' +
        '<div class="wk-proj__idx">' + pad(i + 1) + ' / ' + pad(total) + '</div>' +
        '<h3 class="wk-proj__title">' + esc(p.title) + '</h3>' +
        (p.short_description ? '<p class="wk-proj__desc">' + esc(p.short_description) + '</p>' : '') +
        (tags ? '<div class="wk-proj__tags">' + tags + '</div>' : '') +
      '</div>' +
      '<div class="wk-proj__media">' + media + go + '</div>' +
    '</article>';
  }

  function renderGallery() {
    var projects = activeTag === 'all' ? allProjects : allProjects.filter(function (p) {
      return (p.tech_tags || []).some(function (t) { return t === activeTag; });
    });
    if (!projects.length) { gallery.innerHTML = '<p class="v2-state" style="padding:6vh 0">No projects match that filter yet.</p>'; return; }
    gallery.innerHTML = projects.map(function (p, i) { return rowHtml(p, i, projects.length); }).join('');
    if (window.v2Reveal) window.v2Reveal(gallery);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

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
