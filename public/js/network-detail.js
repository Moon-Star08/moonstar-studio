/* Network page — "everything, in detail" horizontal-scroll card track.
   The section is made tall enough that scrolling vertically translates the
   pinned card row sideways. Reduced-motion falls back to a wrapped grid. */
(function () {
  'use strict';

  var section = document.getElementById('beyond-detail');
  var track = document.getElementById('netTrack');
  if (!section || !track) return;

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var distance = 0, current = 0, target = 0, lastW = 0, lastH = 0;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function measure() {
    if (reduced) { section.style.height = ''; track.style.transform = ''; return; }
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    distance = Math.max(0, track.scrollWidth - vw);
    section.style.height = Math.ceil(vh + distance) + 'px';
    var rect = section.getBoundingClientRect();
    var range = Math.max(1, section.offsetHeight - vh);
    var pos = clamp(-rect.top / range, 0, 1);
    target = distance * pos; current = target;
    track.style.transform = 'translate3d(' + (-current).toFixed(2) + 'px,0,0)';
  }

  function frame() {
    if (!reduced) {
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      if (vw !== lastW || vh !== lastH) { lastW = vw; lastH = vh; measure(); }
      var rect = section.getBoundingClientRect();
      var range = Math.max(1, section.offsetHeight - vh);
      var pos = clamp(-rect.top / range, 0, 1);
      target = distance * pos;
      if (pos <= 0.001 || pos >= 0.999) current = target;
      else current += (target - current) * 0.12;
      track.style.transform = 'translate3d(' + (-current).toFixed(2) + 'px,0,0)';
    }
    requestAnimationFrame(frame);
  }

  addEventListener('resize', measure, { passive: true });
  addEventListener('load', measure, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  lastW = document.documentElement.clientWidth; lastH = window.innerHeight;
  measure();
  requestAnimationFrame(frame);
})();
