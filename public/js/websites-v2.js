/* Websites/Work page — loads real projects into the v2 grid + tag filters.
   Reuses PortfolioAPI (fetchProjects/escapeHtml); reveals via page-v2.js. */
(function () {
  'use strict';

  var grid = document.getElementById('v2WorkGrid');
  var filterBar = document.getElementById('v2Filters');
  if (!grid || !window.PortfolioAPI) return;
  var esc = PortfolioAPI.escapeHtml;
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
      renderGrid();
    });
  }

  function cardHtml(p) {
    var media = p.image_path
      ? (p.featured ? '<span class="v2-proj__badge">Featured</span>' : '') +
        '<img src="' + esc(p.image_path) + '" alt="' + esc(p.title) + '" loading="lazy">'
      : '<div class="v2-proj__ph">No image</div>';
    var tags = (p.tech_tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var action = p.live_url
      ? '<a class="v2-btn v2-btn--primary" href="' + esc(p.live_url) + '" target="_blank" rel="noopener noreferrer">Visit site</a>'
      : '';
    return '<article class="v2-proj reveal">' +
      '<div class="v2-proj__media">' + media + '</div>' +
      '<div class="v2-proj__body"><h3>' + esc(p.title) + '</h3>' +
      '<p>' + esc(p.short_description) + '</p>' +
      (tags ? '<div class="v2-proj__tags">' + tags + '</div>' : '') +
      (action ? '<div class="v2-proj__actions">' + action + '</div>' : '') +
      '</div></article>';
  }

  function renderGrid() {
    var projects = activeTag === 'all' ? allProjects : allProjects.filter(function (p) {
      return (p.tech_tags || []).some(function (t) { return t === activeTag; });
    });
    if (!projects.length) { grid.innerHTML = '<p class="v2-state">No projects match that filter yet.</p>'; return; }
    grid.innerHTML = projects.map(cardHtml).join('');
    if (window.v2Reveal) window.v2Reveal(grid);
  }

  PortfolioAPI.fetchProjects()
    .then(function (projects) {
      allProjects = projects || [];
      if (!allProjects.length) { grid.innerHTML = '<p class="v2-state">No projects yet — check back soon.</p>'; return; }
      renderFilters(uniqueTags(allProjects));
      renderGrid();
    })
    .catch(function () {
      grid.innerHTML = '<p class="v2-state">Couldn\'t load projects right now.</p>';
    });
})();
