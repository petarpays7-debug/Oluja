import { rafThrottle, lerp, prefersReducedMotion, isTouch } from '../utils/performance.js';

// Interaktivna art-directed scena koja reagira na miš.
export function initLaboratory() {
  const scene = document.getElementById('lab-scene');
  if (!scene || prefersReducedMotion() || isTouch()) return;

  const mesh = document.getElementById('lab-mesh');
  const spotlight = document.getElementById('lab-spotlight');
  const title = document.getElementById('lab-title');
  const panels = [...scene.querySelectorAll('.lab-panel')];

  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let mxPx = 0;
  let myPx = 0;
  let sxPx = 0;
  let syPx = 0;
  let active = false;

  const onMove = rafThrottle((e) => {
    const r = scene.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) {
      active = false;
      return;
    }
    active = true;
    tx = (e.clientX - (r.left + r.width / 2)) / r.width;
    ty = (e.clientY - (r.top + r.height / 2)) / r.height;
    mxPx = e.clientX - r.left;
    myPx = e.clientY - r.top;
  });
  window.addEventListener('mousemove', onMove, { passive: true });

  let raf;
  const tick = () => {
    cx = lerp(cx, active ? tx : 0, 0.06);
    cy = lerp(cy, active ? ty : 0, 0.06);

    if (mesh) {
      mesh.style.transform = `rotateX(${cy * 12}deg) rotateY(${-cx * 12}deg) translateZ(0)`;
    }
    if (title) {
      title.style.transform = `rotateX(${-cy * 10}deg) rotateY(${cx * 12}deg) translateZ(40px)`;
    }
    panels.forEach((p) => {
      const d = parseFloat(p.dataset.depth) || 1;
      p.style.translate = `${cx * d * 30}px ${cy * d * 30}px`;
    });
    if (spotlight) {
      const r = scene.getBoundingClientRect();
      const targetX = active ? mxPx : r.width / 2;
      const targetY = active ? myPx : r.height / 2;
      sxPx = lerp(sxPx, targetX, 0.12);
      syPx = lerp(syPx, targetY, 0.12);
      spotlight.style.left = sxPx + 'px';
      spotlight.style.top = syPx + 'px';
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
}
