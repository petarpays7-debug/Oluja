import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobile, supportsWebGL, isLowPower } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Orchestrator for "THE STORM CORE" statement section.
 *
 *   desktop + WebGL   → full glass-bloom scene (src/three/statement-scene.js)
 *                       with editorial typography choreographed around it
 *   mobile / no-WebGL → lightweight CSS-lite sculpture, centered text, shorter
 *   reduced motion    → static premium composition, no pin, no bloom
 *
 * One master ScrollTrigger drives both the DOM choreography and the scene's
 * scroll progress (the scene eases toward it internally for cinematic inertia),
 * so forward / reverse / refresh-in-place are all deterministic.
 */
export function initSignature() {
  const section = document.getElementById('statement');
  if (!section) return;

  const els = {
    scene: document.getElementById('stm-scene'),
    canvas: document.getElementById('stm-canvas'),
    lite: document.getElementById('stm-lite'),
    atmos: document.getElementById('stm-atmos'),
    eyebrow: section.querySelector('.stm-eyebrow'),
    s1: section.querySelector('.stm-statement--1'),
    s2: section.querySelector('.stm-statement--2'),
    support: section.querySelector('.stm-support')
  };
  if (!els.scene || !els.canvas || !els.s1) return;

  if (prefersReducedMotion()) {
    section.dataset.mode = 'reduced';
    gsap.set(els.scene, { '--lite-scale': 0.95, '--lite-bloom': 0.55, '--lite-core': 0.45 });
    return;
  }

  const mobile = isMobile();
  const webgl = supportsWebGL() && !isLowPower();

  if (!mobile && webgl) runCinematic(section, els);
  else runLite(section, els, { mobile: true });
}

/* ===================== CINEMATIC (WebGL desktop) ===================== */
function runCinematic(section, els) {
  section.dataset.mode = 'cinematic';
  let scene = null;

  import('../three/statement-scene.js')
    .then(({ createStatementScene }) => {
      scene = createStatementScene(els.canvas, { mobile: false });
      scene.resize();
      gsap.to(els.canvas, { opacity: 1, duration: 0.6, ease: 'power2.out' });
      if (import.meta.env.DEV) window.__stmScene = scene;

      const io = new IntersectionObserver(
        (ents) => ents.forEach((e) => (e.isIntersecting ? scene.start() : scene.stop())),
        { rootMargin: '15% 0px' }
      );
      io.observe(section);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) scene && scene.stop();
        else if (onScreen(section)) scene && scene.start();
      });

      buildTimeline(section, els, (p) => scene && scene.setProgress(p));

      let rT;
      window.addEventListener('resize', () => {
        clearTimeout(rT);
        rT = setTimeout(() => { scene && scene.resize(); ScrollTrigger.refresh(); }, 200);
      }, { passive: true });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    })
    .catch(() => {
      delete section.dataset.mode;
      runLite(section, els, { mobile: false });
    });

  function onScreen(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
}

/* DOM choreography for the cinematic editorial composition. */
function buildTimeline(section, els, onProgress) {
  const { eyebrow, s1, s2, support, atmos } = els;

  gsap.set([eyebrow, s1, s2, support], { xPercent: -50 });
  gsap.set(eyebrow, { opacity: 0, y: 12 });
  gsap.set(s1, { opacity: 0, y: 30 });
  gsap.set(s2, { opacity: 0, y: 30 });
  gsap.set(support, { opacity: 0, y: 18 });
  gsap.set(atmos, { opacity: 0, scale: 0.7 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0,
      onUpdate: (self) => onProgress(self.progress)
    }
  });
  if (import.meta.env.DEV) window.__stmTL = tl;

  tl
    // PHASE 1 — arrival (label + primary enter, calm)
    .to(eyebrow, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.0)
    .to(s1, { opacity: 1, y: 0, duration: 0.1, ease: 'power3.out' }, 0.03)
    // PHASE 2 — activation (supporting copy appears)
    .to(support, { opacity: 0.72, y: 0, duration: 0.08, ease: 'power2.out' }, 0.16)
    // PHASE 3 — unfolding (secondary statement arrives)
    .to(s2, { opacity: 1, y: 0, duration: 0.1, ease: 'power3.out' }, 0.3)
    // PHASE 4 — bloom (primary quieter, secondary prominent)
    .to(s1, { opacity: 0.5, duration: 0.08 }, 0.52)
    // PHASE 5 — inner core (scene cleaner: eyebrow + support recede)
    .to(support, { opacity: 0, y: -14, duration: 0.08, ease: 'power2.in' }, 0.66)
    .to(eyebrow, { opacity: 0, duration: 0.08 }, 0.66)
    // PHASE 6 — release (statements clear after their movement; violet veil blooms)
    .to(s1, { opacity: 0, y: -30, duration: 0.1, ease: 'power2.in' }, 0.78)
    .to(s2, { opacity: 0, y: -22, duration: 0.1, ease: 'power2.in' }, 0.82)
    .to(atmos, { opacity: 0.8, scale: 1.15, duration: 0.12, ease: 'power2.out' }, 0.82)
    // PHASE 7 — transition out (atmosphere dissipates → clean dark handoff)
    .to(atmos, { opacity: 0, duration: 0.08, ease: 'power2.in' }, 0.93);
}

/* ===================== CSS-LITE (mobile / no-WebGL) ===================== */
function runLite(section, els, { mobile }) {
  section.dataset.mode = mobile ? 'mobile' : 'cinematic';
  if (!mobile) { els.canvas.style.display = 'none'; els.lite.style.display = 'block'; }

  const { scene, atmos, eyebrow, s1, s2, support } = els;

  gsap.set(scene, { '--lite-scale': 0.55, '--lite-bloom': 0.35, '--lite-core': 0.0 });
  gsap.set(eyebrow, { opacity: 0, y: 12 });
  gsap.set(s1, { opacity: 0, y: 24 });
  gsap.set(s2, { opacity: 0, y: 24 });
  gsap.set(support, { opacity: 0, y: 18 });
  gsap.set(atmos, { opacity: 0, scale: 0.7 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.9 }
  });

  tl
    .to(eyebrow, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.0)
    .to(s1, { opacity: 1, y: 0, duration: 0.12, ease: 'power3.out' }, 0.04)
    .to(s2, { opacity: 1, y: 0, duration: 0.12, ease: 'power3.out' }, 0.12)
    .to(support, { opacity: 0.7, y: 0, duration: 0.1, ease: 'power2.out' }, 0.16)
    .to(scene, { '--lite-scale': 1.05, '--lite-bloom': 0.85, duration: 0.5, ease: 'power1.inOut' }, 0.1)
    .to(scene, { '--lite-core': 0.85, duration: 0.3, ease: 'power2.in' }, 0.48)
    .to([eyebrow, support], { opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.52)
    .to([s1, s2], { opacity: 0, y: -14, duration: 0.14, ease: 'power2.in' }, 0.6)
    .to(scene, { '--lite-scale': 1.5, duration: 0.3, ease: 'power2.in' }, 0.66)
    .to(atmos, { opacity: 0.82, scale: 1.2, duration: 0.16, ease: 'power2.out' }, 0.7)
    .to(atmos, { opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.92);
}
