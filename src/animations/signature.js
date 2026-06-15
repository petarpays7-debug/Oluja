import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobile } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Cinematic scroll-driven transition for the statement section.
 *
 * Phases:
 *   01 ARRIVAL          — text fades in from slight offset, settles
 *   02 DEPTH ACTIVATION — scale separation creates visual depth between layers
 *   03 SEPARATION       — upper text moves up, lower moves down
 *   04 CENTRAL REVEAL   — clip-path ellipse expands from centre, exposing deep space
 *   05 FULL EXPANSION   — ellipse fills the viewport
 *   06 RELEASE          — sticky ends, normal scroll resumes
 *
 * Pure GSAP + ScrollTrigger + CSS transforms. No WebGL, no canvas, no Three.js.
 */
export function initSignature() {
  const section = document.getElementById('statement');
  if (!section) return;

  const scene = document.getElementById('stm-scene');
  const depth = document.getElementById('stm-depth');
  const grid  = depth?.querySelector('.stm-depth__grid');
  const stage = document.getElementById('stm-stage');
  const upper = document.getElementById('stm-upper');
  const lower = document.getElementById('stm-lower');
  const sub   = document.getElementById('stm-sub');

  if (!scene || !depth || !stage || !upper || !lower || !sub) return;

  if (prefersReducedMotion()) {
    runReduced(section, stage, upper, lower, sub);
    return;
  }

  if (isMobile()) {
    runMobile(section, scene, depth, grid, stage, upper, lower, sub);
  } else {
    runDesktop(section, scene, depth, grid, stage, upper, lower, sub);
  }
}

/* ─── DESKTOP (full choreography) ─────────────────────────────────────────── */
function runDesktop(section, scene, depth, grid, stage, upper, lower, sub) {
  section.dataset.mode = 'cinematic';

  // Stage container is visible; individual layers are revealed by the timeline.
  gsap.set(stage, { opacity: 1 });
  // All elements start hidden; GSAP reveals them on scroll
  gsap.set(upper, { opacity: 0, y: 38, willChange: 'transform, opacity' });
  gsap.set(lower, { opacity: 0, y: -30, willChange: 'transform, opacity' });
  gsap.set(sub,   { opacity: 0 });
  gsap.set(depth, { clipPath: 'ellipse(1% 1% at 50% 50%)' });
  if (grid) gsap.set(grid, { opacity: 0 });

  // scrub maps timeline progress directly to scroll position, so reverse
  // scrolling unwinds the timeline cleanly — no manual reset needed.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   1.1
    }
  });

  tl
    // ── 01 ARRIVAL (timeline 0 – 0.16) ────────────────────────────────────
    // Text settles into a calm, centred composition
    .to(upper, { opacity: 1, y: 0, duration: 0.14, ease: 'power3.out' }, 0)
    .to(lower, { opacity: 1, y: 0, duration: 0.14, ease: 'power3.out' }, 0.04)
    .to(sub,   { opacity: 0.68,    duration: 0.10, ease: 'power2.out' }, 0.09)

    // ── 02 DEPTH ACTIVATION (timeline 0.22 – 0.40) ────────────────────────
    // Upper moves slightly toward viewer (scale up), lower recedes (scale down)
    // Creates controlled visual depth without actual 3-D transforms
    .to(upper, { scale: 1.018, duration: 0.18, ease: 'power1.inOut', transformOrigin: '50% 50%' }, 0.22)
    .to(lower, { scale: 0.975, duration: 0.18, ease: 'power1.inOut', transformOrigin: '50% 50%' }, 0.22)

    // Supporting text fades before separation begins
    .to(sub, { opacity: 0, duration: 0.10, ease: 'power2.in' }, 0.34)

    // ── 03 TYPOGRAPHIC SEPARATION (timeline 0.40 – 0.68) ──────────────────
    // Upper and lower layers separate — scene physically opening
    .to(upper, { y: '-44vh', duration: 0.30, ease: 'power2.inOut' }, 0.40)
    .to(lower, { y:  '44vh', duration: 0.30, ease: 'power2.inOut' }, 0.40)

    // ── 04 + 05 CENTRAL REVEAL → FULL EXPANSION (timeline 0.46 – 0.92) ───
    // Clip-path ellipse expands from the centre, revealing deep space behind text
    .to(depth, {
      clipPath: 'ellipse(87% 73% at 50% 50%)',
      duration: 0.46,
      ease: 'power2.inOut'
    }, 0.46)
    // Subtle grid fades in as the space opens
    .to(grid, { opacity: 1, duration: 0.24, ease: 'power1.out' }, 0.58)

    // ── 06 TEXT EXIT (timeline 0.68 – 0.82) ───────────────────────────────
    // Text fades only after completing its spatial movement
    .to([upper, lower], { opacity: 0, duration: 0.14, ease: 'power1.in' }, 0.68);

  // Handle resize: refresh ScrollTrigger so section height recalculates
  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => ScrollTrigger.refresh(), 250);
  }, { passive: true });
}

/* ─── MOBILE (simplified choreography) ───────────────────────────────────── */
function runMobile(section, scene, depth, grid, stage, upper, lower, sub) {
  section.dataset.mode = 'mobile';

  gsap.set(stage, { opacity: 1 });
  gsap.set(upper, { opacity: 0, y: 24, willChange: 'transform, opacity' });
  gsap.set(lower, { opacity: 0, y: -18, willChange: 'transform, opacity' });
  gsap.set(sub,   { opacity: 0 });
  gsap.set(depth, { clipPath: 'ellipse(1% 1% at 50% 50%)' });
  if (grid) gsap.set(grid, { opacity: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   0.85,
    }
  });

  tl
    // Arrival
    .to(upper, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0)
    .to(lower, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0.04)
    .to(sub,   { opacity: 0.62,    duration: 0.10, ease: 'power2.out' }, 0.08)

    // Supporting text fades
    .to(sub, { opacity: 0, duration: 0.10, ease: 'power2.in' }, 0.30)

    // Vertical separation — simpler, faster than desktop
    .to(upper, { y: '-32vh', duration: 0.28, ease: 'power2.inOut' }, 0.36)
    .to(lower, { y:  '32vh', duration: 0.28, ease: 'power2.inOut' }, 0.36)

    // Reveal
    .to(depth, {
      clipPath: 'ellipse(87% 73% at 50% 50%)',
      duration: 0.38,
      ease: 'power2.inOut'
    }, 0.40)
    .to(grid, { opacity: 0.7, duration: 0.18 }, 0.52)

    // Text exit
    .to([upper, lower], { opacity: 0, duration: 0.12, ease: 'power1.in' }, 0.66);
}

/* ─── REDUCED MOTION ──────────────────────────────────────────────────────── */
function runReduced(section, stage, upper, lower, sub) {
  section.dataset.mode = 'reduced';
  // Show all text immediately — no scroll trapping, no perspective, no pinning
  gsap.set([stage, upper, lower, sub], { opacity: 1, y: 0 });
}
