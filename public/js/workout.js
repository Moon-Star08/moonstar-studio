/* Workout tracker — renders the 100-day calendar, day detail (food + workout),
   an exercise how-to video modal, and saves progress on the device. */
(function () {
  'use strict';
  var plan = window.WORKOUT_PLAN;
  if (!plan || !plan.days) return;

  var $ = function (s) { return document.querySelector(s); };
  var cal = $('#wkCal');
  var drawer = $('#wkDrawer'), panel = $('#wkPanel');
  var videoModal = $('#wkVideo'), videoFrame = $('#wkVideoFrame'), videoTitle = $('#wkVideoTitle');
  var PKEY = 'wk_progress_v1';
  var EKEY = 'wk_ex_v1';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function getProgress() { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; } }
  function setProgress(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} }
  function getEx() { try { return JSON.parse(localStorage.getItem(EKEY)) || {}; } catch (e) { return {}; } }
  function setEx(o) { try { localStorage.setItem(EKEY, JSON.stringify(o)); } catch (e) {} }
  function shortDate(iso) { var p = String(iso).split('-'); return p.length === 3 ? (parseInt(p[1], 10) + '/' + parseInt(p[2], 10)) : iso; }

  // today's day number from the plan start date
  var todayNum = null;
  if (plan.start) {
    var start = new Date(plan.start + 'T00:00:00');
    var n = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    if (n >= 1 && n <= plan.days.length) todayNum = n;
  }

  function updateProgressCount() {
    var p = getProgress();
    var done = plan.days.filter(function (d) { return p[d.day]; }).length;
    $('#wkProgress').textContent = done + ' / ' + plan.days.length;
    var t = $('#wkTitle');
    if (todayNum) {
      var td = plan.days[todayNum - 1];
      t.innerHTML = 'Day ' + todayNum + ' <span style="color:var(--red)">· today</span>';
      var sub = document.querySelector('.wk-sub');
      if (sub && td) sub.textContent = 'Today is ' + td.dayName + ', ' + fmtDate(td.date) + ' — day ' + todayNum + ' of ' + plan.days.length + '. Tap a day for the workout and food; tap an exercise for the how-to.';
    }
  }

  function renderCalendar() {
    var p = getProgress();
    cal.innerHTML = plan.days.map(function (d) {
      var cls = ['wk-cell', d.type === 'rest' ? 'wk-cell--rest' : 'wk-cell--work'];
      if (p[d.day]) cls.push('wk-cell--done');
      if (d.day === todayNum) cls.push('wk-cell--today');
      var check = p[d.day] ? '<span class="wk-cell__check">✓</span>' : (d.checkin ? '<span class="wk-cell__check">📏</span>' : '');
      return '<button type="button" class="' + cls.join(' ') + '" data-day="' + d.day + '" aria-label="Day ' + d.day + '">' +
        '<span class="wk-cell__n">' + d.day + '</span>' +
        (d.date ? '<span class="wk-cell__d">' + shortDate(d.date) + '</span>' : '') +
        check + '</button>';
    }).join('');
  }

  function mealsHtml() {
    var rows = (plan.meals || []).map(function (m) {
      return '<li><strong>' + esc(m.meal) + '</strong> — ' + esc(m.food) +
        (m.time ? ' <span style="opacity:.6">· ' + esc(m.time) + '</span>' : '') + '</li>';
    }).join('');
    var extra = '';
    if (plan.shake) extra += '<li><strong>Calorie shake</strong> — ' + esc(plan.shake) + '</li>';
    return '<ul class="wk-meals">' + rows + extra + '</ul>';
  }

  function exercisesHtml(d) {
    var done = getEx()[d.day] || {};
    return d.exercises.map(function (ex, i) {
      return '<div class="wk-ex ' + (done[i] ? 'is-done' : '') + '">' +
        '<button type="button" class="wk-ex__main" data-day="' + d.day + '" data-ex="' + i + '">' +
          '<span class="wk-ex__play">▶</span>' +
          '<span class="wk-ex__name">' + esc(ex.name) +
          (ex.muscles ? '<span style="display:block;font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:rgba(22,21,19,.5);font-weight:400;margin-top:3px">' + esc(ex.muscles) + '</span>' : '') +
          '</span>' +
          '<span class="wk-ex__sets">' + ex.sets + ' × ' + esc(ex.reps) + '</span>' +
        '</button>' +
        '<button type="button" class="wk-ex__check" data-exdone="' + i + '" data-day="' + d.day + '" aria-label="Mark exercise done">✓</button>' +
        '</div>';
    }).join('');
  }

  function openDay(day) {
    var d = plan.days.filter(function (x) { return x.day === day; })[0];
    if (!d) return;
    var p = getProgress();
    var isDone = !!p[d.day];
    var chips = '<div class="wk-nutri">' +
      '<span class="wk-chip wk-chip--red">' + esc(d.calories) + ' kcal</span>' +
      '<span class="wk-chip">' + esc(d.protein) + ' protein</span>' +
      (d.water ? '<span class="wk-chip">💧 ' + esc(d.water) + '</span>' : '') +
      (d.sleep ? '<span class="wk-chip">😴 ' + esc(d.sleep) + '</span>' : '') +
      '</div>';

    var body;
    if (d.type === 'rest') {
      body = '<div class="wk-sec"><div class="wk-sec__label">// today</div>' +
        '<p class="wk-rest-note">Rest day — take it easy. A 15–30 minute walk and some light stretching keeps you moving without taxing recovery. Still hit your food and protein.</p></div>';
    } else {
      var exDone = getEx()[d.day] || {};
      var doneCount = d.exercises.filter(function (_, i) { return exDone[i]; }).length;
      body = '<div class="wk-sec"><div class="wk-sec__label">// workout · ' + doneCount + '/' + d.exercises.length + ' done · tap name for video, ✓ to log</div>' + exercisesHtml(d) + '</div>';
    }

    panel.innerHTML =
      '<div class="wk-day__top"><div>' +
        '<div class="wk-day__num">Day ' + d.day + (d.date ? ' · ' + fmtDate(d.date) : '') + (d.dayName ? ' · ' + esc(d.dayName) : '') + '</div>' +
        '<div class="wk-day__title">' + esc(d.title) + '</div>' +
        '<div class="wk-day__focus">' + esc(d.focus) + '</div>' +
      '</div><button class="wk-x" data-close="1" aria-label="Close">×</button></div>' +
      (d.checkin ? '<div class="wk-sec" style="margin-top:16px"><span class="wk-chip wk-chip--red">📏 Check-in day — log your weight</span></div>' : '') +
      body +
      '<div class="wk-sec"><div class="wk-sec__label">// eat today' + (plan.target && plan.target[0] ? ' · ' + esc(plan.target[0]) : '') + '</div>' + chips + mealsHtml() + '</div>' +
      '<button type="button" class="wk-done-btn ' + (isDone ? 'is-done' : '') + '" id="wkDone" data-day="' + d.day + '">' + (isDone ? '✓ Done — tap to undo' : 'Mark day ' + d.day + ' done') + '</button>';

    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.scrollTop = 0;
  }

  function fmtDate(iso) {
    var parts = iso.split('-'); if (parts.length !== 3) return iso;
    var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(parts[1], 10) - 1];
    return mo + ' ' + parseInt(parts[2], 10);
  }

  function closeDrawer() { drawer.hidden = true; document.body.style.overflow = ''; }

  function ytId(url) {
    if (!url) return null;
    var m = url.match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function openVideo(ex) {
    videoTitle.textContent = ex.name;
    var id = ytId(ex.yt);
    if (id) {
      videoFrame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="' + esc(ex.name) +
        '" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    } else {
      var url = ex.yt || 'https://www.youtube.com/results?search_query=' + encodeURIComponent('how to ' + ex.name + ' proper form beginner');
      videoFrame.innerHTML = '<div class="wk-modal__search">' +
        '<p>' + esc(ex.muscles || '') + '<br>Tap below to watch the how-to on YouTube. Start light and learn the movement — don\'t copy the weight from the video.</p>' +
        '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">▶ Watch how-to</a></div>';
    }
    videoModal.hidden = false;
  }
  function closeVideo() { videoModal.hidden = true; videoFrame.innerHTML = ''; }

  // ---- events ----
  cal.addEventListener('click', function (e) {
    var c = e.target.closest('.wk-cell'); if (c) openDay(parseInt(c.dataset.day, 10));
  });
  drawer.addEventListener('click', function (e) {
    if (e.target.dataset.close) { closeDrawer(); return; }
    var chk = e.target.closest('.wk-ex__check');
    if (chk) {
      var cd = parseInt(chk.dataset.day, 10), idx = parseInt(chk.dataset.exdone, 10);
      var all = getEx(), dd = all[cd] || {};
      if (dd[idx]) delete dd[idx]; else dd[idx] = true;
      all[cd] = dd; setEx(all);
      openDay(cd);
      return;
    }
    var ex = e.target.closest('.wk-ex__main');
    if (ex) {
      var d = plan.days.filter(function (x) { return x.day === parseInt(ex.dataset.day, 10); })[0];
      openVideo(d.exercises[parseInt(ex.dataset.ex, 10)]);
      return;
    }
    var done = e.target.closest('#wkDone');
    if (done) {
      var day = parseInt(done.dataset.day, 10);
      var p = getProgress();
      if (p[day]) delete p[day]; else p[day] = true;
      setProgress(p);
      renderCalendar(); updateProgressCount(); openDay(day);
    }
  });
  videoModal.addEventListener('click', function (e) { if (e.target.dataset.close) closeVideo(); });
  $('#wkVideoClose').addEventListener('click', closeVideo);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!videoModal.hidden) closeVideo(); else if (!drawer.hidden) closeDrawer(); } });

  $('#wkLogout').addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () { window.location.href = '/admin/login'; });
  });

  renderCalendar();
  updateProgressCount();
  // jump straight to today on open
  if (todayNum) setTimeout(function () { openDay(todayNum); }, 250);
})();
