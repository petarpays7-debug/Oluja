import { gsap } from 'gsap';
import { prefersReducedMotion, isTouch, rafThrottle, lerp } from '../utils/performance.js';

export function initHero() {
  const reduced = prefersReducedMotion();

  // --- intro timeline ---
  const lines = gsap.utils.toArray('.hero__title .line > span');
  const reveals = gsap.utils.toArray('.hero .reveal-line');

  if (reduced) {
    gsap.set([lines, reveals], { clearProps: 'all', opacity: 1, y: 0 });
  } else {
    const tl = gsap.timeline({ delay: 0.1 });
    tl.from(lines, {
      yPercent: 115,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power4.out'
    })
      .from(
        reveals,
        { y: 24, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' },
        '-=0.5'
      )
      .from(
        '.stage__scene',
        { opacity: 0, scale: 0.92, duration: 1, ease: 'power3.out' },
        '-=0.9'
      );
  }

  if (reduced || isTouch()) return;
  initStageParallax();
}

// Reakcija 3D scene na položaj miša.
function initStageParallax() {
  const stage = document.getElementById('hero-stage');
  const scene = document.getElementById('stage-scene');
  const glow = document.getElementById('hero-glow');
  if (!stage || !scene) return;

  const depthEls = [...scene.querySelectorAll('[data-depth]')];
  let tx = 0;
  let ty = 0;
  let cxr = 0;
  let cyr = 0;

  const onMove = rafThrottle((e) => {
    const r = stage.getBoundingClientRect();
    tx = (e.clientX - (r.left + r.width / 2)) / r.width;
    ty = (e.clientY - (r.top + r.height / 2)) / r.height;
  });
  window.addEventListener('mousemove', onMove, { passive: true });

  let raf;
  const tick = () => {
    cxr = lerp(cxr, tx, 0.08);
    cyr = lerp(cyr, ty, 0.08);
    scene.style.transform = `rotateY(${cxr * 10}deg) rotateX(${-cyr * 8}deg)`;
    depthEls.forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 1;
      // `translate` je nezavisno od `transform` u CSS-u i ne gazi rotacije iz klase.
      el.style.translate = `${cxr * d * 16}px ${cyr * d * 16}px`;
    });
    if (glow) {
      glow.style.transform = `translate(${cxr * 40}px, ${cyr * 40}px)`;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
}
