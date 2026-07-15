(function () {
  'use strict';

  var grid = document.getElementById('websites-grid');
  if (!grid) return;

  PortfolioAPI.fetchProjects({ category: 'website' })
    .then(function (projects) {
      if (!projects.length) {
        grid.innerHTML = '<p class="state-msg">No websites listed yet — check back soon.</p>';
        return;
      }
      grid.innerHTML = projects.map(function (p) { return PortfolioAPI.projectCardHtml(p, { mode: 'website' }); }).join('');
      window.observeReveal(grid);
    })
    .catch(function () {
      grid.innerHTML = '<p class="state-msg">Couldn\'t load websites right now.</p>';
    });
})();
