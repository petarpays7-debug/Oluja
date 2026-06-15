import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobile, supportsWebGL, isLowPower } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Orchestrator for the cinematic "digital sculpture" statement section.
 *
 *   desktop + WebGL   → full glass-bloom scene (src/three/statement-scene.js)
 *                       with art-directed typography choreographed around it
 *   mobile / no-WebGL → lightweight CSS-lite sculpture, centered text, shorter
 *   reduced motion    → static premium composition, no pin, no bloom
 *
 * The scroll progress drives one source of truth; the WebGL scene eases toward
 * it internally, so forward / reverse / refresh-in-place are all deterministic.
 */
export function initSignature() {
  const section = document.getElementById('statement');
  if (!section) return;

  const els = {
    scene: document.getElementById('stm-scene'),
    canvas: document.getElementById('stm-canvas'),
    lite: document.getElementById('stm-lite'),
    atmos: document.getElementById('stm-atmos'),
    g1: section.querySelector('.stm-giant--1'),
    g2: section.querySelector('.stm-giant--2'),
    eyebrow: section.querySelector('.stm-eyebrow'),
    s1: section.querySelector('.stm-statement--1'),
    s2: section.querySelector('.stm-statement--2'),
    support: section.querySelector('.stm-support')
  };
  if (!els.scene || !els.canvas) return;

  if (prefersReducedMotion()) {
    section.dataset.mode = 'reduced';
    gsap.set(els.scene, { '--lite-scale': 0.92, '--lite-bloom': 0.55, '--lite-core': 0.4 });
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
  let st = null;

  import('../three/statement-scene.js')
    .then(({ createStatementScene }) => {
      scene = createStatementScene(els.canvas, { mobile: false });
      scene.resize();
      gsap.to(els.canvas, { opacity: 1, duration: 0.6, ease: 'power2.out' });

      if (import.meta.env.DEV) window.__stmScene = scene;

      // Render only while the section is on (or near) screen.
      const io = new IntersectionObserver(
        (ents) => ents.forEach((e) => (e.isIntersecting ? scene.start() : scene.stop())),
        { rootMargin: '15% 0px' }
      );
      io.observe(section);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) scene && scene.stop();
        else if (isOnScreen(section)) scene && scene.start();
      });

      buildTimeline(section, els, (p) => scene && scene.setProgress(p));

      let rT;
      window.addEventListener(
        'resize',
        () => {
          clearTimeout(rT);
          rT = setTimeout(() => {
            scene && scene.resize();
            ScrollTrigger.refresh();
          }, 200);
        },
        { passive: true }
      );
      requestAnimationFrame(() => ScrollTrigger.refresh());
    })
    .catch(() => {
      // WebGL module failed — fall back to the CSS-lite choreography.
      delete section.dataset.mode;
      runLite(section, els, { mobile: false });
    });

  function isOnScreen(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
}

/* DOM choreography shared shape — feeds scroll progress to `onProgress`. */
function buildTimeline(section, els, onProgress) {
  const { g1, g2, eyebrow, s1, s2, support, atmos } = els;

  gsap.set([g1, g2], { opacity: 0, scale: 1.08 });
  gsap.set(eyebrow, { opacity: 0, y: 14 });
  gsap.set(s1, { opacity: 0, x: -36 });
  gsap.set(s2, { opacity: 0, x: 36 });
  gsap.set(support, { opacity: 0, y: 22 });
  gsap.set(atmos, { opacity: 0, scale: 0.7 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.1,
      onUpdate: (self) => onProgress(self.progress)
    }
  });

  // ── ARRIVAL ──────────────────────────────────────────────────────────
  tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.07, ease: 'power2.out' }, 0.0)
    .to(s1, { opacity: 1, x: 0, duration: 0.1, ease: 'power3.out' }, 0.02)
    .to([g1, g2], { opacity: 0.9, scale: 1, duration: 0.12, ease: 'power2.out' }, 0.0)
    .to(support, { opacity: 0.7, y: 0, duration: 0.09, ease: 'power2.out' }, 0.08)

    // ── GROWTH (parallax: giant words drift outward, second line arrives) ─
    .to(s2, { opacity: 1, x: 0, duration: 0.1, ease: 'power3.out' }, 0.2)
    .to(g1, { yPercent: -42, xPercent: -10, duration: 0.6, ease: 'power1.in' }, 0.1)
    .to(g2, { yPercent: 42, xPercent: 10, duration: 0.6, ease: 'power1.in' }, 0.1)

    // ── BLOOM / CORE (support recedes, statements begin to leave) ─────────
    .to(support, { opacity: 0, y: -16, duration: 0.1, ease: 'power2.in' }, 0.48)
    .to(eyebrow, { opacity: 0, duration: 0.1 }, 0.5)
    .to(s1, { opacity: 0, x: -60, duration: 0.14, ease: 'power2.in' }, 0.56)
    .to(s2, { opacity: 0, x: 60, duration: 0.14, ease: 'power2.in' }, 0.62)

    // ── RELEASE (typography clears, violet atmosphere blooms) ────────────
    .to([g1, g2], { opacity: 0, duration: 0.14, ease: 'power2.in' }, 0.66)
    .to(atmos, { opacity: 0.85, scale: 1.15, duration: 0.16, ease: 'power2.out' }, 0.74)

    // ── TRANSITION OUT (atmosphere dissipates → clean dark handoff) ──────
    .to(atmos, { opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.92);
}

/* ===================== CSS-LITE (mobile / no-WebGL) ===================== */
function runLite(section, els, { mobile }) {
  section.dataset.mode = mobile ? 'mobile' : 'cinematic';
  // In the no-WebGL desktop fallback we still use the lite sculpture; show it.
  if (!mobile) {
    els.canvas.style.display = 'none';
    els.lite.style.display = 'block';
  }

  const { scene, atmos, eyebrow, s1, s2, support } = els;

  gsap.set(scene, { '--lite-scale': 0.55, '--lite-bloom': 0.35, '--lite-core': 0.0 });
  gsap.set(eyebrow, { opacity: 0, y: 12 });
  gsap.set(s1, { opacity: 0, y: 24 });
  gsap.set(s2, { opacity: 0, y: 24 });
  gsap.set(support, { opacity: 0, y: 18 });
  gsap.set(atmos, { opacity: 0, scale: 0.7 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.9
    }
  });

  tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.0)
    .to(s1, { opacity: 1, y: 0, duration: 0.12, ease: 'power3.out' }, 0.04)
    .to(s2, { opacity: 1, y: 0, duration: 0.12, ease: 'power3.out' }, 0.12)
    .to(support, { opacity: 0.7, y: 0, duration: 0.1, ease: 'power2.out' }, 0.16)

    // sculpture grows + ignites
    .to(scene, { '--lite-scale': 1.05, '--lite-bloom': 0.85, duration: 0.5, ease: 'power1.inOut' }, 0.1)
    .to(scene, { '--lite-core': 0.85, duration: 0.3, ease: 'power2.in' }, 0.45)

    // text clears, violet release blooms
    .to([eyebrow, support], { opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.5)
    .to([s1, s2], { opacity: 0, y: -14, duration: 0.14, ease: 'power2.in' }, 0.58)
    .to(scene, { '--lite-scale': 1.5, duration: 0.3, ease: 'power2.in' }, 0.66)
    .to(atmos, { opacity: 0.85, scale: 1.2, duration: 0.16, ease: 'power2.out' }, 0.7)
    .to(atmos, { opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.92);
}
