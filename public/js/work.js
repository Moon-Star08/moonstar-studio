(function () {
  'use strict';

  var grid = document.getElementById('work-grid');
  var filterBar = document.getElementById('tag-filters');
  if (!grid) return;

  var allProjects = [];
  var activeTag = 'all';

  function uniqueTags(projects) {
    var set = new Set();
    projects.forEach(function (p) {
      (p.tech_tags || []).forEach(function (t) { set.add(t); });
    });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function renderFilters(tags) {
    var buttons = ['<button class="tag-filter is-active" data-tag="all" type="button">All</button>'];
    tags.forEach(function (t) {
      buttons.push('<button class="tag-filter" data-tag="' + PortfolioAPI.escapeHtml(t) + '" type="button">' + PortfolioAPI.escapeHtml(t) + '</button>');
    });
    filterBar.innerHTML = buttons.join('');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.tag-filter');
      if (!btn) return;
      activeTag = btn.getAttribute('data-tag');
      filterBar.querySelectorAll('.tag-filter').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      renderGrid();
    });
  }

  function renderGrid() {
    var projects = activeTag === 'all'
      ? allProjects
      : allProjects.filter(function (p) {
          return (p.tech_tags || []).some(function (t) { return t === activeTag; });
        });

    if (!projects.length) {
      grid.innerHTML = '<p class="state-msg">No projects match that filter yet.</p>';
      return;
    }
    grid.innerHTML = projects.map(function (p) { return PortfolioAPI.projectCardHtml(p); }).join('');
    window.observeReveal(grid);
  }

  PortfolioAPI.fetchProjects()
    .then(function (projects) {
      allProjects = projects;
      if (!projects.length) {
        grid.innerHTML = '<p class="state-msg">No projects yet — check back soon.</p>';
        return;
      }
      renderFilters(uniqueTags(projects));
      renderGrid();
    })
    .catch(function () {
      grid.innerHTML = '<p class="state-msg">Couldn\'t load projects right now.</p>';
    });
})();
