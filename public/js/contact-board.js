/* Contact "reach me" — split-flap board that flips through the real contact
   details (read from the .reach-links row, so it stays in sync with whatever
   the admin edits) and cycles: SAY HI -> email -> phone -> location. */
(function () {
  'use strict';

  var board = document.getElementById('contactBoard');
  var linksWrap = document.querySelector('.reach-links');
  if (!board || !linksWrap) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?#$@+-'.split('');
  var idx = 0, cells = [], timers = [], auto = null, messages = [];

  function buildMessages() {
    var nodes = linksWrap.querySelectorAll('a, span');
    var email = (nodes[0] && nodes[0].textContent.trim()) || 'moonstarstudio.co@gmail.com';
    var phone = (nodes[1] && nodes[1].textContent.trim()) || '+855 85 887 688';
    var loc = (nodes[2] && nodes[2].textContent.trim()) || 'Cambodia';
    return ['SAY HI', email.toUpperCase(), phone, loc.toUpperCase()];
  }

  function cellSize(cols) {
    var avail = Math.min(window.innerWidth * 0.86, 1000);
    return Math.max(13, Math.min(38, Math.floor(avail / cols)));
  }

  function build(text) {
    timers.forEach(clearInterval); timers = [];
    var lines = text.split('\n');
    var cols = 1;
    lines.forEach(function (l) { if (l.length > cols) cols = l.length; });
    var fs = cellSize(cols);
    board.innerHTML = ''; cells = [];
    lines.forEach(function (line) {
      var row = document.createElement('div');
      row.className = 'fb-row';
      for (var i = 0; i < cols; i++) {
        var ch = line[i] || ' ';
        var cell = document.createElement('div');
        cell.className = 'fb-cell';
        cell.style.fontSize = fs + 'px';
        cell.dataset.target = ch;
        cell.textContent = ' ';
        row.appendChild(cell);
        cells.push(cell);
      }
      board.appendChild(row);
    });
    if (reduce) { cells.forEach(function (c) { settle(c); }); return; }
    flip(cols);
  }

  function settle(cell) {
    var t = cell.dataset.target;
    cell.textContent = t;
    cell.style.color = /[#$@!?+]/.test(t) ? '#d9333f' : 'var(--bone)';
  }

  function flip(cols) {
    cells.forEach(function (cell, n) {
      var t = cell.dataset.target;
      var ti = CHARS.indexOf(t.toUpperCase()); if (ti < 0) ti = 0;
      var steps = 6 + (n % cols) + Math.floor(Math.random() * 6), k = 0;
      var id = setInterval(function () {
        if (k >= steps) { settle(cell); clearInterval(id); return; }
        cell.textContent = CHARS[(ti - steps + k + CHARS.length * 3) % CHARS.length];
        cell.style.color = '#8e8e85';
        k++;
      }, 28);
      timers.push(id);
    });
  }

  function show(i) { idx = (i + messages.length) % messages.length; build(messages[idx]); }

  function autoStart() {
    if (reduce) return;
    clearInterval(auto);
    auto = setInterval(function () { show(idx + 1); }, 6000);
  }

  function start() {
    messages = buildMessages();
    show(0);
    autoStart();
  }

  // Manual "Flip" button: advance now, then restart the auto timer so it
  // doesn't jump again immediately.
  var nextBtn = document.getElementById('boardNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (!messages.length) return;
      show(idx + 1);
      autoStart();
    });
  }

  // Build once now, and rebuild if site-content updates the contact values.
  if (window.__siteContent) start();
  else document.addEventListener('sitecontent:ready', start, { once: true });
  if (!window.__siteContent) start(); // also run immediately with the fallback values
  addEventListener('resize', function () { if (messages.length) build(messages[idx]); });
})();
