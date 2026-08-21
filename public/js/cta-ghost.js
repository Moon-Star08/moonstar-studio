/* CTA ghost-field — rotate each scattered "LET'S BUILD IT" and let the whole
   field drift gently with the pointer (depth from each span's data-d). Falls
   back to a static rotated field when JS is off or reduced-motion is set. */
(function () {
  'use strict';

  var fields = [].slice.call(document.querySelectorAll('.v2-cta-ghost .ghosts'));
  if (!fields.length) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  fields.forEach(function (field) {
    var spans = [].slice.call(field.querySelectorAll('span'));
    spans.forEach(function (s) {
      var rot = parseFloat(s.dataset.rot || '0');
      s.dataset.baseRot = String(rot);
      s.style.transform = 'rotate(' + rot + 'deg)';
    });
    if (reduce) return;

    var host = field.parentElement; // .v2-cta-ghost
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!running) { running = true; requestAnimationFrame(loop); }
    });

    function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      spans.forEach(function (s) {
        var d = parseFloat(s.dataset.d || '0.5');
        var rot = parseFloat(s.dataset.baseRot || '0');
        s.style.transform = 'translate(' + (cx * d * 42).toFixed(1) + 'px,' + (cy * d * 42).toFixed(1) + 'px) rotate(' + rot + 'deg)';
      });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) requestAnimationFrame(loop);
      else running = false;
    }
  });
})();
