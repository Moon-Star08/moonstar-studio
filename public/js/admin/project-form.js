(function () {
  'use strict';

  var MAX_FILE_BYTES = 5 * 1024 * 1024;

  var form = document.getElementById('project-form');
  var alertBox = document.getElementById('form-alert');
  var submitBtn = document.getElementById('submit-btn');
  var heading = document.getElementById('form-heading');
  var pageTitle = document.getElementById('page-title');
  var currentImageBox = document.getElementById('current-image');
  var imageInput = document.getElementById('image');

  var params = new URLSearchParams(window.location.search);
  var editId = params.get('id');
  var existingImagePath = '';
  var removeImageFlag = false;

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function showError(msg) {
    alertBox.innerHTML = '<div class="alert alert--error">' + escapeHtml(msg) + '</div>';
  }

  function renderCurrentImage() {
    if (!existingImagePath) {
      currentImageBox.innerHTML = '';
      return;
    }
    currentImageBox.innerHTML =
      '<img src="' + escapeHtml(existingImagePath) + '" alt="Current screenshot">' +
      '<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem;">' +
        '<input type="checkbox" id="remove-image-cb"> Remove current image' +
      '</label>';
    document.getElementById('remove-image-cb').addEventListener('change', function (e) {
      removeImageFlag = e.target.checked;
    });
  }

  async function loadExistingProject() {
    try {
      var res = await fetch('/api/projects/' + editId, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Not found');
      var p = await res.json();

      document.getElementById('title').value = p.title;
      document.getElementById('short_description').value = p.short_description;
      document.getElementById('long_description').value = p.long_description || '';
      document.getElementById('category').value = p.category;
      document.getElementById('tech_tags').value = (p.tech_tags || []).join(', ');
      document.getElementById('live_url').value = p.live_url || '';
      document.getElementById('github_url').value = p.github_url || '';
      document.getElementById('featured').checked = !!p.featured;

      existingImagePath = p.image_path || '';
      renderCurrentImage();
    } catch (err) {
      showError('Could not load that project. It may have been deleted.');
      submitBtn.disabled = true;
    }
  }

  if (editId) {
    heading.textContent = 'Edit project';
    pageTitle.textContent = 'Edit project — Admin';
    loadExistingProject();
  }

  imageInput.addEventListener('change', function () {
    var file = imageInput.files[0];
    if (file && file.size > MAX_FILE_BYTES) {
      showError('Image is too large. Max size is 5MB.');
      imageInput.value = '';
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertBox.innerHTML = '';

    var file = imageInput.files[0];
    if (file && file.size > MAX_FILE_BYTES) {
      showError('Image is too large. Max size is 5MB.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    var formData = new FormData();
    formData.append('title', document.getElementById('title').value.trim());
    formData.append('short_description', document.getElementById('short_description').value.trim());
    formData.append('long_description', document.getElementById('long_description').value.trim());
    formData.append('category', document.getElementById('category').value);
    formData.append('tech_tags', document.getElementById('tech_tags').value.trim());
    formData.append('live_url', document.getElementById('live_url').value.trim());
    formData.append('github_url', document.getElementById('github_url').value.trim());
    formData.append('featured', document.getElementById('featured').checked ? 'true' : 'false');
    if (file) formData.append('image', file);
    if (editId && removeImageFlag) formData.append('remove_image', 'true');

    try {
      var url = editId ? '/api/admin/projects/' + editId : '/api/admin/projects';
      var method = editId ? 'PUT' : 'POST';
      var res = await fetch(url, { method: method, body: formData, credentials: 'same-origin' });

      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }

      var body = await res.json();
      if (!res.ok) {
        showError(body.error || 'Could not save project.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save project';
        return;
      }

      window.location.href = '/admin/dashboard.html';
    } catch (err) {
      showError('Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save project';
    }
  });
})();
