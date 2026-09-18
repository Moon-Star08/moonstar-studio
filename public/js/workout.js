/* MoonStar Fitness — multi-user tracker.
   Screens: auth (login/sign-up) -> onboarding questionnaire -> tracker.
   Plan + progress live on the server, tied to each account. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // How-to video for every exercise (plays inside the app).
  var VID = {
    // gym
    'Cable Crunch': 'QR3vANGukK8', 'Cable Curl': '2MUEL4nL6hA', 'Calf Raise': 'k8ipHzKeAkQ',
    'Dead Bug': 'o4GKiEoYClI', 'Dumbbell Bench Press': 'O7ECGhZj_Hc', 'Dumbbell Curl': 'XE_pHwbst04',
    'Dumbbell Lateral Raise': 'PzsMitRdI_8', 'Dumbbell Shoulder Press': '0JfYxMRsUCQ', 'Goblet Squat': 'meJSJEG_sT0',
    'Hammer Curl': '8XLxfXROrTo', 'Incline Dumbbell Press': 'IP4oeKh1Sd4', 'Lat Pulldown': 'AOpi-p0cJkc',
    'Leg Curl': 'q1cKTmaeQWo', 'Leg Extension': 'qYxo9ZFvHQE', 'Leg Press': 'K5n2vg3oZa4',
    'Machine Chest Press': 'xUm0BiZCWlQ', 'Machine Shoulder Press': '3R14MnZbcpw', 'Overhead Triceps Extension': 'fYqswDVbJDg',
    'Plank': 'pvIjsG5Svck', 'Romanian Deadlift (RDL)': 'hQgFixeXdZo', 'Seated Cable Row': 'vwHG9Jfu4sw',
    'Triceps Pushdown': '-zLyUAo1gMw',
    // home / bodyweight
    'Push-up': 'I9fsqKE5XHo', 'Incline Push-up': 'cfns5VDVVvk', 'Chair Dips': 'E7WwqwD7NWE',
    'Bodyweight Squat': 'YaXPRqUwItQ', 'Reverse Lunge': 'Ry-wqegeKlE', 'Glute Bridge': 'wPM8icPu6H8',
    'Wall Sit': 'Me0aYi81ick', 'Bodyweight Calf Raise': 'k8ipHzKeAkQ', 'Superman': 'J9zXkxUAfUA',
    'Bird Dog': 'xEDnlOxeJH4', 'Bicycle Crunch': 'HWX93vAoLvw', 'Jumping Jacks': 'XR0xeuK5zBU',
    'Mountain Climbers': 'cnyTQDSE884', 'High Knees': 'ZNDHivUg7vA'
  };

  var LIKES = [['chicken', 'Chicken'], ['beef', 'Beef'], ['fish', 'Fish / seafood'], ['eggs', 'Eggs'], ['rice', 'Rice'], ['noodles', 'Noodles / pasta'], ['bread', 'Bread'], ['oats', 'Oats'], ['dairy', 'Dairy / yogurt'], ['fruit', 'Fruit'], ['veg', 'Vegetables'], ['beans', 'Beans / tofu'], ['potato', 'Potato']];
  var ALLERGIES = [['dairy', 'Dairy'], ['egg', 'Eggs'], ['nuts', 'Nuts'], ['gluten', 'Gluten'], ['fish', 'Fish / seafood']];

  var state = { user: null, profile: null, plan: null, progress: { days: {}, ex: {} } };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function api(path, method, body) {
    var opt = { method: method || 'GET', headers: {}, credentials: 'same-origin' };
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch('/api/workout' + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
    });
  }

  // ── screen routing ──────────────────────────────────────────────────────
  var SCREENS = ['wkBoot', 'wkAuth', 'wkOnboard', 'wkApp'];
  function show(id) { SCREENS.forEach(function (s) { var el = document.getElementById(s); if (el) el.hidden = (s !== id); }); }

  function normalizeProgress(p) { p = p || {}; if (!p.days) p.days = {}; if (!p.ex) p.ex = {}; return p; }

  function route() {
    if (!state.plan || !state.plan.days) { showOnboard(); return; }
    show('wkApp'); renderApp();
  }

  // ── auth ─────────────────────────────────────────────────────────────────
  function showAuth() { show('wkAuth'); }
  $('#tabLogin').addEventListener('click', function () { $('#tabLogin').classList.add('is-active'); $('#tabSignup').classList.remove('is-active'); $('#loginForm').hidden = false; $('#signupForm').hidden = true; });
  $('#tabSignup').addEventListener('click', function () { $('#tabSignup').classList.add('is-active'); $('#tabLogin').classList.remove('is-active'); $('#signupForm').hidden = false; $('#loginForm').hidden = true; });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#liErr').textContent = ''; $('#liBtn').disabled = true;
    api('/login', 'POST', { email: $('#liEmail').value, password: $('#liPass').value }).then(function (r) {
      $('#liBtn').disabled = false;
      if (!r.ok) { $('#liErr').textContent = r.data.error || 'Could not log in'; return; }
      state.user = r.data.user; state.profile = r.data.profile; state.plan = r.data.plan; state.progress = normalizeProgress(r.data.progress); clearAuthForms(); route();
    });
  });

  $('#signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#suErr').textContent = ''; $('#suBtn').disabled = true;
    api('/signup', 'POST', { name: $('#suName').value, email: $('#suEmail').value, password: $('#suPass').value, invite: $('#suInvite').value }).then(function (r) {
      $('#suBtn').disabled = false;
      if (!r.ok) { $('#suErr').textContent = r.data.error || 'Could not sign up'; return; }
      state.user = r.data.user; state.profile = null; state.plan = null; state.progress = { days: {}, ex: {} }; clearAuthForms(); route();
    });
  });

  function clearAuthForms() {
    ['liEmail', 'liPass', 'suName', 'suEmail', 'suPass', 'suInvite'].forEach(function (id) { var el = $('#' + id); if (el) el.value = ''; });
    $('#liErr').textContent = ''; $('#suErr').textContent = '';
  }
  function logout() { api('/logout', 'POST').then(function () { state = { user: null, profile: null, plan: null, progress: { days: {}, ex: {} } }; clearAuthForms(); showAuth(); }); }
  $('#wkLogout').addEventListener('click', logout);
  $('#obLogout').addEventListener('click', logout);

  // ── onboarding ─────────────────────────────────────────────────────────
  function wireSeg(el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(el.querySelectorAll('button'), function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active'); el.dataset.val = b.dataset.v;
    });
  }
  ['obSex', 'obGoal', 'obLoc'].forEach(function (id) { wireSeg($('#' + id)); });

  function buildChips(container, list) {
    container.innerHTML = list.map(function (x) { return '<button type="button" class="wk-chipbtn" data-v="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('');
    container.addEventListener('click', function (e) { var b = e.target.closest('.wk-chipbtn'); if (b) b.classList.toggle('is-active'); });
  }
  buildChips($('#obLikes'), LIKES);
  buildChips($('#obAllergies'), ALLERGIES);
  function chosenChips(container) { return Array.prototype.map.call(container.querySelectorAll('.wk-chipbtn.is-active'), function (b) { return b.dataset.v; }); }
  function setSeg(id, val) { var el = $('#' + id); if (!el || val == null) return; el.dataset.val = String(val); Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) { b.classList.toggle('is-active', b.dataset.v === String(val)); }); }
  function setChips(container, vals) { vals = vals || []; Array.prototype.forEach.call(container.querySelectorAll('.wk-chipbtn'), function (b) { b.classList.toggle('is-active', vals.indexOf(b.dataset.v) >= 0); }); }

  function showOnboard() {
    var p = state.profile || {};
    $('#obOwner').hidden = !(state.user && state.user.isOwner);
    $('#obName').value = p.name || (state.user && state.user.name) || '';
    $('#obAge').value = p.age || '';
    $('#obKg').value = p.weight_kg || '';
    $('#obCm').value = p.height_cm || '';
    setSeg('obSex', p.sex || 'male'); setSeg('obGoal', p.goal || 'maintain');
    setSeg('obLoc', p.location || 'gym');
    $('#obDiet').value = p.diet || 'none';
    setChips($('#obLikes'), p.likes); setChips($('#obAllergies'), p.allergies);
    show('wkOnboard');
  }

  $('#onboardForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var profile = {
      name: $('#obName').value.trim(),
      age: parseInt($('#obAge').value, 10),
      sex: $('#obSex').dataset.val,
      weight_kg: parseFloat($('#obKg').value),
      height_cm: parseFloat($('#obCm').value),
      goal: $('#obGoal').dataset.val,
      location: $('#obLoc').dataset.val,
      diet: $('#obDiet').value,
      likes: chosenChips($('#obLikes')),
      allergies: chosenChips($('#obAllergies')),
      dislikes: []
    };
    if (!profile.age || !profile.weight_kg || !profile.height_cm) { $('#obErr').textContent = 'Please fill in age, weight and height.'; return; }
    $('#obErr').textContent = ''; $('#obBtn').disabled = true; $('#obBtn').textContent = 'Building…';
    api('/profile', 'POST', { profile: profile }).then(function (r) {
      $('#obBtn').disabled = false; $('#obBtn').textContent = 'Build my plan';
      if (!r.ok) { $('#obErr').textContent = r.data.error || 'Could not build plan'; return; }
      state.profile = r.data.profile; state.plan = r.data.plan; route();
    });
  });

  $('#obRestore').addEventListener('click', function () {
    $('#obRestore').disabled = true; $('#obErr').textContent = '';
    api('/restore-original', 'POST').then(function (r) {
      $('#obRestore').disabled = false;
      if (!r.ok) { $('#obErr').textContent = r.data.error || 'Could not load your original plan'; return; }
      state.profile = r.data.profile; state.plan = r.data.plan; route();
    });
  });

  $('#wkEdit').addEventListener('click', showOnboard);

  // ── progress (server-synced) ─────────────────────────────────────────────
  var saveTimer;
  function saveProgress() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { api('/progress', 'POST', { progress: state.progress }); }, 600); }
  function dayDone(n) { return !!state.progress.days[n]; }
  function exState(day) { return state.progress.ex[day] || {}; }

  // ── tracker rendering ─────────────────────────────────────────────────────
  var plan, cal, drawer, panel, videoModal, videoFrame, videoTitle, todayNum;

  function shortDate(iso) { var p = String(iso).split('-'); return p.length === 3 ? (parseInt(p[1], 10) + '/' + parseInt(p[2], 10)) : iso; }
  function fmtDate(iso) { var p = String(iso).split('-'); if (p.length !== 3) return iso; var mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(p[1], 10) - 1]; return mo + ' ' + parseInt(p[2], 10); }

  function renderApp() {
    plan = state.plan;
    cal = $('#wkCal'); drawer = $('#wkDrawer'); panel = $('#wkPanel');
    videoModal = $('#wkVideo'); videoFrame = $('#wkVideoFrame'); videoTitle = $('#wkVideoTitle');
    todayNum = null;
    if (plan.start) { var s = new Date(plan.start + 'T00:00:00'); var n = Math.floor((Date.now() - s.getTime()) / 86400000) + 1; if (n >= 1 && n <= plan.days.length) todayNum = n; }
    renderCalendar(); updateHeader();
    if (todayNum) setTimeout(function () { openDay(todayNum); }, 250);
  }

  function updateHeader() {
    var done = plan.days.filter(function (d) { return dayDone(d.day); }).length;
    $('#wkProgress').textContent = done + ' / ' + plan.days.length;
    if (todayNum) {
      var td = plan.days[todayNum - 1];
      $('#wkTitle').innerHTML = 'Day ' + todayNum + ' <span style="color:var(--red)">· today</span>';
      var sub = $('.wk-sub'); if (sub && td) sub.textContent = 'Today is ' + td.dayName + ', ' + fmtDate(td.date) + ' — day ' + todayNum + ' of ' + plan.days.length + '. Tap a day for the workout and food; tap an exercise for the how-to.';
    }
  }

  function renderCalendar() {
    cal.innerHTML = plan.days.map(function (d) {
      var cls = ['wk-cell', d.type === 'rest' ? 'wk-cell--rest' : 'wk-cell--work'];
      if (dayDone(d.day)) cls.push('wk-cell--done');
      if (d.day === todayNum) cls.push('wk-cell--today');
      var check = dayDone(d.day) ? '<span class="wk-cell__check">✓</span>' : (d.checkin ? '<span class="wk-cell__check">📏</span>' : '');
      return '<button type="button" class="' + cls.join(' ') + '" data-day="' + d.day + '" aria-label="Day ' + d.day + '">' +
        '<span class="wk-cell__n">' + d.day + '</span>' +
        (d.date ? '<span class="wk-cell__d">' + shortDate(d.date) + '</span>' : '') + check + '</button>';
    }).join('');
  }

  function mealsHtml() {
    return '<ul class="wk-meals">' + (plan.meals || []).map(function (m) {
      return '<li><strong>' + esc(m.meal) + '</strong> — ' + esc(m.food) + (m.note ? '<br><span style="font-family:var(--mono);font-size:11px;color:rgba(22,21,19,.5)">' + esc(m.note) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function exercisesHtml(d) {
    var done = exState(d.day);
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
    var wasOpen = !drawer.hidden;
    var keepScroll = wasOpen ? panel.scrollTop : 0;
    var isDone = dayDone(d.day);
    var chips = '<div class="wk-nutri">' +
      '<span class="wk-chip wk-chip--red">' + esc(d.calories) + ' kcal</span>' +
      '<span class="wk-chip">' + esc(d.protein) + ' protein</span>' +
      (d.water ? '<span class="wk-chip">💧 ' + esc(d.water) + '</span>' : '') +
      (d.sleep ? '<span class="wk-chip">😴 ' + esc(d.sleep) + '</span>' : '') + '</div>';

    var body;
    if (d.type === 'rest') {
      body = '<div class="wk-sec"><div class="wk-sec__label">// today</div><p class="wk-rest-note">Rest day. Keep active with a ' + esc(d.rest || d.focus || 'walk') + ', plus light stretching. Still hit your food and protein.</p></div>';
    } else {
      var ed = exState(d.day); var dc = d.exercises.filter(function (_, i) { return ed[i]; }).length;
      body = '<div class="wk-sec"><div class="wk-sec__label">// workout · ' + dc + '/' + d.exercises.length + ' done · tap name for video, ✓ to log</div>' + exercisesHtml(d) + '</div>';
    }

    panel.innerHTML =
      '<div class="wk-day__top"><div>' +
        '<div class="wk-day__num">Day ' + d.day + (d.date ? ' · ' + fmtDate(d.date) : '') + (d.dayName ? ' · ' + esc(d.dayName) : '') + '</div>' +
        '<div class="wk-day__title">' + esc(d.title) + '</div>' +
        '<div class="wk-day__focus">' + esc(d.focus) + '</div>' +
      '</div><button class="wk-x" data-close="1" aria-label="Close">×</button></div>' +
      (d.checkin ? '<div class="wk-sec" style="margin-top:16px"><span class="wk-chip wk-chip--red">📏 Check-in day — log your weight</span></div>' : '') +
      body +
      '<div class="wk-sec"><div class="wk-sec__label">// eat today' + (plan.targetLine ? ' · ' + esc(plan.targetLine) : '') + '</div>' + chips + mealsHtml() + '</div>' +
      '<button type="button" class="wk-done-btn ' + (isDone ? 'is-done' : '') + '" id="wkDone" data-day="' + d.day + '">' + (isDone ? '✓ Done — tap to undo' : 'Mark day ' + d.day + ' done') + '</button>';

    drawer.hidden = false;
    if (!wasOpen) lockScroll();
    panel.scrollTop = keepScroll;
  }

  function closeDrawer() { drawer.hidden = true; unlockScroll(); }

  // scroll lock
  var lockY = 0, locked = false;
  function lockScroll() { if (locked) return; lockY = window.scrollY || 0; document.body.style.top = -lockY + 'px'; document.body.classList.add('wk-locked'); locked = true; }
  function unlockScroll() { if (!locked) return; document.body.classList.remove('wk-locked'); document.body.style.top = ''; window.scrollTo(0, lockY); locked = false; }

  function ytId(url) { if (!url) return null; var m = url.match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/); return m ? m[1] : null; }
  function openVideo(ex) {
    videoTitle.textContent = ex.name;
    var id = ytId(ex.yt) || VID[ex.name] || null;
    var out = $('#wkVideoOut');
    if (id) {
      videoFrame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&modestbranding=1" title="' + esc(ex.name) + '" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
      if (out) { out.href = 'https://www.youtube.com/watch?v=' + id; out.hidden = false; }
    } else {
      var url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent('how to ' + ex.name + ' proper form beginner');
      videoFrame.innerHTML = '<div class="wk-modal__search"><p>' + esc(ex.muscles || '') + '<br>Watch the how-to on YouTube. Start light and learn the movement first.</p><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">▶ Watch how-to</a></div>';
      if (out) out.hidden = true;
    }
    videoModal.hidden = false;
  }
  function closeVideo() { videoModal.hidden = true; videoFrame.innerHTML = ''; }

  // events (bound once; elements exist in #wkApp)
  document.addEventListener('click', function (e) {
    if (!state.plan) return;
    var c = e.target.closest('#wkCal .wk-cell'); if (c) { openDay(parseInt(c.dataset.day, 10)); return; }
  });
  $('#wkDrawer').addEventListener('click', function (e) {
    if (e.target.dataset && e.target.dataset.close) { closeDrawer(); return; }
    var chk = e.target.closest('.wk-ex__check');
    if (chk) {
      var cd = parseInt(chk.dataset.day, 10), idx = parseInt(chk.dataset.exdone, 10);
      if (!state.progress.ex[cd]) state.progress.ex[cd] = {};
      if (state.progress.ex[cd][idx]) delete state.progress.ex[cd][idx]; else state.progress.ex[cd][idx] = true;
      saveProgress(); openDay(cd); return;
    }
    var ex = e.target.closest('.wk-ex__main');
    if (ex) { var d = plan.days.filter(function (x) { return x.day === parseInt(ex.dataset.day, 10); })[0]; openVideo(d.exercises[parseInt(ex.dataset.ex, 10)]); return; }
    var done = e.target.closest('#wkDone');
    if (done) {
      var day = parseInt(done.dataset.day, 10);
      if (state.progress.days[day]) delete state.progress.days[day]; else state.progress.days[day] = true;
      saveProgress(); renderCalendar(); updateHeader(); openDay(day);
    }
  });
  $('#wkVideo').addEventListener('click', function (e) { if (e.target.dataset && e.target.dataset.close) closeVideo(); });
  $('#wkVideoClose').addEventListener('click', closeVideo);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#wkVideo').hidden) closeVideo(); else if (!$('#wkDrawer').hidden) closeDrawer(); } });

  // block pinch / double-tap zoom
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });

  // ── boot ──────────────────────────────────────────────────────────────
  api('/me').then(function (r) {
    if (r.ok) { state.user = r.data.user; state.profile = r.data.profile; state.plan = r.data.plan; state.progress = normalizeProgress(r.data.progress); route(); }
    else showAuth();
  }).catch(function () { showAuth(); });
})();
