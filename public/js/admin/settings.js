(function () {
  'use strict';

  var SCHEMA = [
    {
      key: 'site',
      label: 'Site-wide (nav, footer, contact info)',
      fields: [
        { key: 'brand_name', label: 'Brand name', type: 'text' },
        { key: 'footer_tagline', label: 'Footer tagline', type: 'textarea' },
        { key: 'copyright_name', label: 'Copyright name', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'tiktok_url', label: 'TikTok URL', type: 'text' },
        { key: 'facebook_url', label: 'Facebook URL', type: 'text' },
        { key: 'instagram_url', label: 'Instagram URL', type: 'text' },
      ],
    },
    {
      key: 'home',
      label: 'Home page',
      fields: [
        { key: 'hero_eyebrow', label: 'Hero eyebrow label', type: 'text' },
        { key: 'hero_headline', label: 'Hero headline', type: 'text' },
        { key: 'hero_tagline', label: 'Hero subheadline', type: 'textarea' },
        { key: 'hero_btn_primary_text', label: 'Hero primary button text', type: 'text' },
        { key: 'hero_btn_primary_href', label: 'Hero primary button link', type: 'text' },
        { key: 'hero_btn_secondary_text', label: 'Hero secondary button text', type: 'text' },
        { key: 'hero_btn_secondary_href', label: 'Hero secondary button link', type: 'text' },
        { key: 'intro_heading', label: 'Intro heading', type: 'text' },
        { key: 'intro_text', label: 'Intro text', type: 'textarea' },
        { key: 'service_1_title', label: 'Service 1 title', type: 'text' },
        { key: 'service_1_desc', label: 'Service 1 description', type: 'textarea' },
        { key: 'service_2_title', label: 'Service 2 title', type: 'text' },
        { key: 'service_2_desc', label: 'Service 2 description', type: 'textarea' },
        { key: 'service_3_title', label: 'Service 3 title', type: 'text' },
        { key: 'service_3_desc', label: 'Service 3 description', type: 'textarea' },
        { key: 'featured_intro', label: 'Featured projects intro', type: 'textarea' },
        { key: 'stat_1_value', label: 'Stat 1 value', type: 'text' },
        { key: 'stat_1_label', label: 'Stat 1 label', type: 'text' },
        { key: 'stat_2_value', label: 'Stat 2 value', type: 'text' },
        { key: 'stat_2_label', label: 'Stat 2 label', type: 'text' },
        { key: 'stat_3_value', label: 'Stat 3 value', type: 'text' },
        { key: 'stat_3_label', label: 'Stat 3 label', type: 'text' },
        { key: 'stat_4_value', label: 'Stat 4 value', type: 'text' },
        { key: 'stat_4_label', label: 'Stat 4 label', type: 'text' },
        { key: 'cta_heading', label: 'Bottom CTA heading', type: 'text' },
        { key: 'cta_text', label: 'Bottom CTA text', type: 'textarea' },
        { key: 'cta_btn_text', label: 'Bottom CTA button text', type: 'text' },
      ],
    },
    {
      key: 'about',
      label: 'About page',
      fields: [
        { key: 'who_heading', label: '"Who I Am" heading', type: 'text' },
        { key: 'who_p1', label: '"Who I Am" paragraph 1', type: 'textarea' },
        { key: 'who_p2', label: '"Who I Am" paragraph 2', type: 'textarea' },
        { key: 'who_p3', label: '"Who I Am" paragraph 3', type: 'textarea' },
        { key: 'journey_intro', label: '"My Journey" intro', type: 'textarea' },
        { key: 'journey_1_date', label: 'Journey item 1 — date', type: 'text' },
        { key: 'journey_1_title', label: 'Journey item 1 — title', type: 'text' },
        { key: 'journey_1_desc', label: 'Journey item 1 — description', type: 'textarea' },
        { key: 'journey_2_date', label: 'Journey item 2 — date', type: 'text' },
        { key: 'journey_2_title', label: 'Journey item 2 — title', type: 'text' },
        { key: 'journey_2_desc', label: 'Journey item 2 — description', type: 'textarea' },
        { key: 'expertise_intro', label: '"My Expertise" intro', type: 'textarea' },
        { key: 'expertise_1_title', label: 'Expertise 1 — title', type: 'text' },
        { key: 'expertise_1_desc', label: 'Expertise 1 — description', type: 'text' },
        { key: 'expertise_2_title', label: 'Expertise 2 — title', type: 'text' },
        { key: 'expertise_2_desc', label: 'Expertise 2 — description', type: 'text' },
        { key: 'expertise_3_title', label: 'Expertise 3 — title', type: 'text' },
        { key: 'expertise_3_desc', label: 'Expertise 3 — description', type: 'text' },
        { key: 'expertise_4_title', label: 'Expertise 4 — title', type: 'text' },
        { key: 'expertise_4_desc', label: 'Expertise 4 — description', type: 'text' },
        { key: 'expertise_5_title', label: 'Expertise 5 — title', type: 'text' },
        { key: 'expertise_5_desc', label: 'Expertise 5 — description', type: 'text' },
        { key: 'expertise_6_title', label: 'Expertise 6 — title', type: 'text' },
        { key: 'expertise_6_desc', label: 'Expertise 6 — description', type: 'text' },
        { key: 'exp_1_date', label: 'Work experience 1 — date', type: 'text' },
        { key: 'exp_1_title', label: 'Work experience 1 — title', type: 'text' },
        { key: 'exp_1_desc', label: 'Work experience 1 — description', type: 'textarea' },
        { key: 'exp_2_date', label: 'Work experience 2 — date', type: 'text' },
        { key: 'exp_2_title', label: 'Work experience 2 — title', type: 'text' },
        { key: 'exp_2_desc', label: 'Work experience 2 — description', type: 'textarea' },
        { key: 'exp_3_date', label: 'Work experience 3 — date', type: 'text' },
        { key: 'exp_3_title', label: 'Work experience 3 — title', type: 'text' },
        { key: 'exp_3_desc', label: 'Work experience 3 — description', type: 'textarea' },
      ],
    },
    {
      key: 'services',
      label: 'Services page',
      fields: [
        { key: 'intro', label: 'Page intro', type: 'textarea' },
        { key: 'svc_1_title', label: 'Service 1 — title', type: 'text' },
        { key: 'svc_1_desc', label: 'Service 1 — description', type: 'textarea' },
        { key: 'svc_1_list', label: 'Service 1 — includes (comma-separated)', type: 'text' },
        { key: 'svc_2_title', label: 'Service 2 — title', type: 'text' },
        { key: 'svc_2_desc', label: 'Service 2 — description', type: 'textarea' },
        { key: 'svc_2_list', label: 'Service 2 — includes (comma-separated)', type: 'text' },
        { key: 'svc_3_title', label: 'Service 3 — title', type: 'text' },
        { key: 'svc_3_desc', label: 'Service 3 — description', type: 'textarea' },
        { key: 'svc_3_list', label: 'Service 3 — includes (comma-separated)', type: 'text' },
        { key: 'step_1_title', label: 'Process step 1 — title', type: 'text' },
        { key: 'step_1_desc', label: 'Process step 1 — description', type: 'text' },
        { key: 'step_2_title', label: 'Process step 2 — title', type: 'text' },
        { key: 'step_2_desc', label: 'Process step 2 — description', type: 'text' },
        { key: 'step_3_title', label: 'Process step 3 — title', type: 'text' },
        { key: 'step_3_desc', label: 'Process step 3 — description', type: 'text' },
        { key: 'step_4_title', label: 'Process step 4 — title', type: 'text' },
        { key: 'step_4_desc', label: 'Process step 4 — description', type: 'text' },
        { key: 'cta_heading', label: 'Bottom CTA heading', type: 'text' },
        { key: 'cta_text', label: 'Bottom CTA text', type: 'textarea' },
      ],
    },
    {
      key: 'contact',
      label: 'Contact page',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'intro', label: 'Intro text', type: 'textarea' },
        { key: 'form_success_message', label: 'After-submit message', type: 'textarea' },
      ],
    },
    {
      key: 'work',
      label: 'Work page',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'intro', label: 'Intro text', type: 'textarea' },
      ],
    },
    {
      key: 'websites',
      label: 'Websites page',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'intro', label: 'Intro text', type: 'textarea' },
      ],
    },
  ];

  var container = document.getElementById('settings-sections');
  var form = document.getElementById('settings-form');
  var alertBox = document.getElementById('settings-alert');
  var saveBtn = document.getElementById('save-btn');
  var resetBtn = document.getElementById('reset-btn');

  var heroImageCurrent = document.getElementById('hero-image-current');
  var heroImageFile = document.getElementById('hero-image-file');
  var heroImageUploadBtn = document.getElementById('hero-image-upload-btn');
  var heroImageRemoveBtn = document.getElementById('hero-image-remove-btn');

  var faviconCurrent = document.getElementById('favicon-current');
  var faviconFile = document.getElementById('favicon-file');
  var faviconUploadBtn = document.getElementById('favicon-upload-btn');
  var faviconRemoveBtn = document.getElementById('favicon-remove-btn');

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function showAlert(type, msg) {
    alertBox.innerHTML = '<div class="alert alert--' + type + '">' + escapeHtml(msg) + '</div>';
  }

  function fieldId(sectionKey, fieldKey) {
    return sectionKey + '__' + fieldKey;
  }

  // Cover-crop the source image to a square, then clip it to a circle so
  // the favicon is actually round in the browser tab (CSS can't reach
  // into a <link rel="icon"> file — the shape has to be baked into the
  // pixels themselves).
  function cropToCircle(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var size = 512;
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');

        var srcSize = Math.min(img.naturalWidth, img.naturalHeight);
        var sx = (img.naturalWidth - srcSize) / 2;
        var sy = (img.naturalHeight - srcSize) / 2;

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);

        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('Could not process that image'));
        }, 'image/png');
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that image file'));
      };
      img.src = url;
    });
  }

  function renderForm(content) {
    var html = '';
    SCHEMA.forEach(function (section) {
      html += '<fieldset style="border: 2px solid var(--ink); border-radius: var(--radius-md); padding: 20px 20px 4px; margin-bottom: 22px;">';
      html += '<legend style="font-family: var(--font-display); font-size: 0.7rem; padding: 0 8px;">' + escapeHtml(section.label) + '</legend>';
      section.fields.forEach(function (field) {
        var id = fieldId(section.key, field.key);
        var value = (content[section.key] || {})[field.key] || '';
        html += '<div class="field">';
        html += '<label for="' + id + '">' + escapeHtml(field.label) + '</label>';
        if (field.type === 'textarea') {
          html += '<textarea id="' + id + '" name="' + id + '">' + escapeHtml(value) + '</textarea>';
        } else {
          html += '<input type="text" id="' + id + '" name="' + id + '" value="' + escapeHtml(value) + '">';
        }
        html += '</div>';
      });
      html += '</fieldset>';
    });
    container.innerHTML = html;
    renderHeroImage((content.home || {}).hero_image);
    renderFavicon((content.site || {}).favicon);
  }

  function renderHeroImage(src) {
    if (!heroImageCurrent) return;
    heroImageCurrent.innerHTML = src
      ? '<img src="' + escapeHtml(src) + '" alt=""><span class="hint">Current hero image</span>'
      : '<span class="hint">No image uploaded yet — the placeholder shows on the live site.</span>';
  }

  function renderFavicon(src) {
    if (!faviconCurrent) return;
    faviconCurrent.innerHTML = src
      ? '<img src="' + escapeHtml(src) + '" alt=""><span class="hint">Current favicon</span>'
      : '<span class="hint">Using the default MoonStar icon.</span>';
  }

  function collectForm() {
    var data = {};
    SCHEMA.forEach(function (section) {
      data[section.key] = {};
      section.fields.forEach(function (field) {
        var el = document.getElementById(fieldId(section.key, field.key));
        data[section.key][field.key] = el ? el.value : '';
      });
    });
    return data;
  }

  async function loadSettings() {
    try {
      var res = await fetch('/api/admin/settings', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var content = await res.json();
      renderForm(content);
    } catch (err) {
      container.innerHTML = '<p class="state-msg">Failed to load site content.</p>';
    }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertBox.innerHTML = '';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      var res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(collectForm()),
      });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      if (!res.ok) throw new Error('Save failed');
      showAlert('success', 'Saved. Your changes are live on the site now.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showAlert('error', 'Could not save changes. Try again.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  });

  resetBtn.addEventListener('click', async function () {
    if (!window.confirm('Reset ALL site content to the original defaults? This cannot be undone.')) return;
    resetBtn.disabled = true;
    try {
      var res = await fetch('/api/admin/settings/reset', { method: 'POST', credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      var content = await res.json();
      renderForm(content);
      showAlert('success', 'Site content reset to defaults.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showAlert('error', 'Could not reset content. Try again.');
    } finally {
      resetBtn.disabled = false;
    }
  });

  if (heroImageUploadBtn) {
    heroImageUploadBtn.addEventListener('click', async function () {
      var file = heroImageFile.files[0];
      if (!file) {
        showAlert('error', 'Choose an image file first.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAlert('error', 'Image must be under 5MB.');
        return;
      }
      var formData = new FormData();
      formData.append('image', file);

      heroImageUploadBtn.disabled = true;
      heroImageUploadBtn.textContent = 'Uploading…';
      try {
        var res = await fetch('/api/admin/settings/hero-image', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        renderHeroImage(data.home.hero_image);
        heroImageFile.value = '';
        showAlert('success', 'Hero image uploaded. It\'s live on the site now.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showAlert('error', err.message || 'Could not upload that image.');
      } finally {
        heroImageUploadBtn.disabled = false;
        heroImageUploadBtn.textContent = 'Upload image';
      }
    });
  }

  if (heroImageRemoveBtn) {
    heroImageRemoveBtn.addEventListener('click', async function () {
      if (!window.confirm('Remove the hero image? The site will fall back to the placeholder.')) return;
      heroImageRemoveBtn.disabled = true;
      try {
        var res = await fetch('/api/admin/settings/hero-image', { method: 'DELETE', credentials: 'same-origin' });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        var data = await res.json();
        if (!res.ok) throw new Error('Remove failed');
        renderHeroImage(data.home.hero_image);
        showAlert('success', 'Hero image removed.');
      } catch (err) {
        showAlert('error', 'Could not remove the image.');
      } finally {
        heroImageRemoveBtn.disabled = false;
      }
    });
  }

  if (faviconUploadBtn) {
    faviconUploadBtn.addEventListener('click', async function () {
      var file = faviconFile.files[0];
      if (!file) {
        showAlert('error', 'Choose an image file first.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAlert('error', 'Image must be under 5MB.');
        return;
      }

      faviconUploadBtn.disabled = true;
      faviconUploadBtn.textContent = 'Processing…';
      try {
        var circularBlob = await cropToCircle(file);
        var formData = new FormData();
        formData.append('image', circularBlob, 'favicon.png');

        faviconUploadBtn.textContent = 'Uploading…';
        var res = await fetch('/api/admin/settings/favicon', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        renderFavicon(data.site.favicon);
        faviconFile.value = '';
        showAlert('success', 'Favicon uploaded. It\'s live on the site now.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showAlert('error', err.message || 'Could not upload that image.');
      } finally {
        faviconUploadBtn.disabled = false;
        faviconUploadBtn.textContent = 'Upload icon';
      }
    });
  }

  if (faviconRemoveBtn) {
    faviconRemoveBtn.addEventListener('click', async function () {
      if (!window.confirm('Reset the favicon to the default MoonStar icon?')) return;
      faviconRemoveBtn.disabled = true;
      try {
        var res = await fetch('/api/admin/settings/favicon', { method: 'DELETE', credentials: 'same-origin' });
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        var data = await res.json();
        if (!res.ok) throw new Error('Remove failed');
        renderFavicon(data.site.favicon);
        showAlert('success', 'Favicon reset to default.');
      } catch (err) {
        showAlert('error', 'Could not reset the favicon.');
      } finally {
        faviconRemoveBtn.disabled = false;
      }
    });
  }

  loadSettings();
})();
