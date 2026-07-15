(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  async function fetchProjects(params) {
    var qs = new URLSearchParams(params || {}).toString();
    var res = await fetch('/api/projects' + (qs ? '?' + qs : ''));
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  }

  function projectCardHtml(project, opts) {
    opts = opts || {};
    var showWebsiteLink = opts.mode === 'website';
    var img = project.image_path
      ? '<img class="card__image" src="' + escapeHtml(project.image_path) + '" alt="' + escapeHtml(project.title) + ' screenshot" loading="lazy">'
      : '<div class="card__image card__image--placeholder">NO IMAGE</div>';

    var badge = project.featured ? '<span class="card__badge">FEATURED</span>' : '';

    var tags = (project.tech_tags || [])
      .map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; })
      .join('');

    var actions = '';
    if (showWebsiteLink && project.live_url) {
      actions += '<a class="btn btn--primary btn--sm" href="' + escapeHtml(project.live_url) + '" target="_blank" rel="noopener noreferrer">Visit site</a>';
    } else {
      if (project.live_url) {
        actions += '<a class="btn btn--sm" href="' + escapeHtml(project.live_url) + '" target="_blank" rel="noopener noreferrer">Live</a>';
      }
      if (project.github_url) {
        actions += '<a class="btn btn--sm" href="' + escapeHtml(project.github_url) + '" target="_blank" rel="noopener noreferrer">Code</a>';
      }
    }

    return (
      '<article class="card reveal">' +
        '<div class="card__media">' + badge + img + '</div>' +
        '<div class="card__body">' +
          '<h3 class="card__title">' + escapeHtml(project.title) + '</h3>' +
          '<p class="card__desc">' + escapeHtml(project.short_description) + '</p>' +
          '<div class="card__tags">' + tags + '</div>' +
          (actions ? '<div class="card__actions">' + actions + '</div>' : '') +
        '</div>' +
      '</article>'
    );
  }

  global.PortfolioAPI = {
    escapeHtml: escapeHtml,
    fetchProjects: fetchProjects,
    projectCardHtml: projectCardHtml,
  };
})(window);
