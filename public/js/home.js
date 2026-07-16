(function () {
  'use strict';

  var heroImg = document.getElementById('hero-image');
  var heroPlaceholder = document.getElementById('hero-image-placeholder');
  if (heroImg && heroPlaceholder) {
    document.addEventListener('sitecontent:ready', function (e) {
      var src = e.detail && e.detail.home && e.detail.home.hero_image;
      if (src) {
        heroImg.src = src;
        heroImg.hidden = false;
        heroPlaceholder.hidden = true;
      } else {
        heroImg.hidden = true;
        heroPlaceholder.hidden = false;
      }
    });
  }

  var grid = document.getElementById('featured-grid');
  if (!grid) return;

  PortfolioAPI.fetchProjects({ featured: '1' })
    .then(function (projects) {
      if (!projects.length) {
        grid.innerHTML = '<p class="state-msg">No featured projects yet — check back soon.</p>';
        return;
      }
      grid.innerHTML = projects.map(function (p) { return PortfolioAPI.projectCardHtml(p); }).join('');
      window.observeReveal(grid);
    })
    .catch(function () {
      grid.innerHTML = '<p class="state-msg">Couldn\'t load projects right now.</p>';
    });
})();
