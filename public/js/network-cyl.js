/* Network page — "beyond websites" 3D cylinder of services.
   Rows sit on a drum: each is rotateX(angle) translateZ(radius); scroll drives
   the drum's rotateX so words roll up through the middle band and turn ink when
   centered. Adapted from the reference "Volta" services cylinder. */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sec = document.getElementById('beyond');
  var cyl = document.getElementById('netCyl');
  if (!sec || !cyl) return;
  if (reduce) return; // static stacked layout handled by CSS

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  // Densify the ring by cloning the base rows once, so neighbours sit close
  // enough to read as one continuous surface (like a physical drum).
  var base = [].slice.call(cyl.querySelectorAll('.cyl-row'));
  base.forEach(function (r) { cyl.appendChild(r.cloneNode(true)); });
  var rows = [].slice.call(cyl.querySelectorAll('.cyl-row'));
  var N = rows.length, STEP = 360 / N;
  var radius = 210, cur = 0, target = 0;

  function size() {
    // radius from the vertical gap we want between rows: gap = 2·R·sin(step/2)
    var gap = clamp(innerWidth * 0.042, 44, 82);
    radius = gap / (2 * Math.sin(Math.PI / N));
    rows.forEach(function (r, i) { r.dataset.angle = String(i * STEP); });
    place();
  }

  function place() {
    cyl.style.transform = 'rotateX(' + (-cur) + 'deg)';
    rows.forEach(function (r) {
      var a = parseFloat(r.dataset.angle);
      r.style.transform = 'translate(-50%,-50%) rotateX(' + a + 'deg) translateZ(' + radius + 'px)';
      var d = ((a - cur) % 360 + 540) % 360 - 180;   // signed distance to camera
      var face = Math.cos(d * Math.PI / 180);
      r.style.opacity = String(clamp((face - 0.02) * 1.55, 0, 1));
      r.classList.toggle('mid', Math.abs(d) < STEP * 0.5);
      var h3 = r.querySelector('h3');
      if (h3) h3.style.transform = 'scale(' + (0.72 + 0.28 * clamp(face, 0, 1)).toFixed(3) + ')';
    });
  }

  size();
  addEventListener('resize', size);

  // Give the pinned section room to scroll through ~1.6 turns.
  sec.style.height = '300vh';

  if (window.gsap && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) { target = self.progress * 600; },
    });
    gsap.ticker.add(function () { cur = lerp(cur, target, 0.09); place(); });
    ScrollTrigger.refresh();
  } else {
    (function loop() {
      var r = sec.getBoundingClientRect();
      var p = clamp((-r.top) / (r.height - innerHeight), 0, 1);
      target = p * 600; cur = lerp(cur, target, 0.09); place();
      requestAnimationFrame(loop);
    })();
  }
})();
