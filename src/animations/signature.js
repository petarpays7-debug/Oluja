import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobile } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * "PRVI DOJAM" — typography-first cinematic section.
 *
 * Motion typography (letters assemble from scattered typographic fragments),
 * a premium shockwave "lock-in", a Canvas-2D atmosphere of charged dust and
 * drifting glyph fragments, then a dissolve that carries the words forward into
 * the next section. One master ScrollTrigger drives the DOM timeline and feeds
 * scroll progress to the particle field. No WebGL / 3D.
 */
export function initSignature() {
  const section = document.getElementById('statement');
  if (!section) return;

  const els = {
    scene: document.getElementById('stm-scene'),
    canvas: document.getElementById('stm-particles'),
    streaks: section.querySelectorAll('.stm-streaks span'),
    shock: document.getElementById('stm-shock'),
    content: document.getElementById('stm-content'),
    eyebrow: section.querySelector('.stm-eyebrow'),
    main: document.getElementById('stm-main'),
    secondary: document.getElementById('stm-secondary'),
    support: document.getElementById('stm-support')
  };
  if (!els.scene || !els.main) return;

  if (prefersReducedMotion()) {
    section.dataset.mode = 'reduced';
    return; // CSS shows a clean static composition
  }

  const mobile = isMobile();
  section.dataset.mode = mobile ? 'mobile' : 'cinematic';

  const chars = splitChars(els.main);
  const words = splitWords(els.secondary);

  const field = createParticleField(els.canvas, { mobile });
  field.resize();

  // render only while the section is near the viewport / tab visible
  const io = new IntersectionObserver(
    (ents) => ents.forEach((e) => (e.isIntersecting ? field.start() : field.stop())),
    { rootMargin: '15% 0px' }
  );
  io.observe(section);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) field.stop();
    else if (onScreen(section)) field.start();
  });

  if (mobile) buildMobile(section, els, { chars, words, field });
  else buildDesktop(section, els, { chars, words, field });

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { field.resize(); ScrollTrigger.refresh(); }, 200);
  }, { passive: true });
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

function onScreen(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/* ===================== TEXT SPLITTING ===================== */
// Per-character spans (words kept intact so wrapping never breaks a word).
function splitChars(el) {
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const chars = [];
  text.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span');
    w.className = 'stm-word';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'stm-char';
      c.textContent = ch;
      w.appendChild(c);
      chars.push(c);
    }
    el.appendChild(w);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return chars;
}

// Word-level spans, preserving the accent word.
function splitWords(el) {
  const full = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', full);
  el.innerHTML = '';
  const words = [];
  full.split(' ').forEach((token, wi, arr) => {
    const w = document.createElement('span');
    w.className = 'stm-word';
    w.setAttribute('aria-hidden', 'true');
    if (token.replace(/[^\p{L}]/gu, '').toLowerCase() === 'prosječno') w.classList.add('accent');
    w.textContent = token;
    el.appendChild(w);
    words.push(w);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return words;
}

// deterministic pseudo-random (stable across reloads / refresh)
const rnd = (i, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ===================== DESKTOP TIMELINE ===================== */
function buildDesktop(section, els, { chars, words, field }) {
  const { eyebrow, main, secondary, support, shock, streaks } = els;

  // luminance sweep bar (created here to avoid extra markup)
  const sweep = document.createElement('span');
  sweep.className = 'stm-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  Object.assign(sweep.style, {
    position: 'absolute', top: '0', left: '0', height: '100%', width: '22%',
    background: 'linear-gradient(90deg, transparent, rgba(190,215,255,0.5), transparent)',
    mixBlendMode: 'screen', pointerEvents: 'none', opacity: '0', zIndex: '3',
    transform: 'translateX(-30%)', willChange: 'transform, opacity'
  });
  els.scene.appendChild(sweep);

  // initial scattered state — letters are "fragments" pulled from charged air
  chars.forEach((c, i) => {
    const a = rnd(i, 1) * Math.PI * 2;
    const d = 130 + rnd(i, 2) * 340;
    gsap.set(c, {
      x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7,
      rotation: (rnd(i, 3) - 0.5) * 44, scale: 0.55 + rnd(i, 4) * 0.5,
      opacity: 0, transformOrigin: '50% 50%'
    });
  });
  gsap.set(eyebrow, { opacity: 0, y: 10 });
  gsap.set(secondary, { filter: 'blur(7px)' });
  gsap.set(words, { opacity: 0, y: 22 });
  gsap.set(support, { opacity: 0, y: 16 });
  gsap.set(shock, { opacity: 0, scale: 0.2 });
  gsap.set(streaks, { opacity: 0, x: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1.0,
      onUpdate: (self) => { field.progress = self.progress; }
    }
  });
  if (import.meta.env.DEV) window.__stmTL = tl;

  tl
    // PHASE 1 — prelude
    .to(eyebrow, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.0)
    // PHASE 2 — letters gather (magnetic convergence)
    .to(chars, {
      x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
      duration: 0.3, ease: 'power3.out',
      stagger: { each: 0.004, from: 'random' }
    }, 0.1)
    // PHASE 3 — lock-in + shockwave
    .to(shock, { opacity: 0.85, duration: 0.04, ease: 'power2.out' }, 0.42)
    .to(shock, { scale: 2.7, duration: 0.14, ease: 'power2.out' }, 0.42)
    .to(shock, { opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.46)
    .fromTo(sweep, { opacity: 0, xPercent: -40 }, { opacity: 1, duration: 0.05, ease: 'power1.out' }, 0.43)
    .to(sweep, { xPercent: 520, duration: 0.12, ease: 'power1.inOut' }, 0.43)
    .to(sweep, { opacity: 0, duration: 0.04 }, 0.52)
    .fromTo(els.content, { scale: 1 }, { scale: 1.012, duration: 0.04, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 0.44)
    // PHASE 4 — second sentence (blur-resolve, word stagger)
    .to(secondary, { filter: 'blur(0px)', duration: 0.12, ease: 'power2.out' }, 0.5)
    .to(words, { opacity: 1, y: 0, duration: 0.12, ease: 'power3.out', stagger: 0.012 }, 0.5)
    // PHASE 5 — atmospheric reaction (light streaks sweep behind text)
    .fromTo(streaks, { opacity: 0, x: '-10%' }, { opacity: 0.7, x: '12%', duration: 0.14, stagger: 0.04, ease: 'power1.inOut' }, 0.6)
    .to(streaks, { opacity: 0, x: '30%', duration: 0.12, stagger: 0.04, ease: 'power1.in' }, 0.74)
    // PHASE 6 — supporting paragraph (quiet)
    .to(support, { opacity: 0.72, y: 0, duration: 0.1, ease: 'power2.out' }, 0.66)
    // PHASE 7 — dissolve / carried forward by the storm
    .to(support, { opacity: 0, y: -12, duration: 0.08, ease: 'power2.in' }, 0.85)
    .to(words, { opacity: 0, y: -18, duration: 0.1, ease: 'power2.in', stagger: 0.008 }, 0.85)
    .to(eyebrow, { opacity: 0, duration: 0.08 }, 0.84)
    .to(chars, {
      x: (i) => Math.cos(rnd(i, 1) * Math.PI * 2) * (320 + rnd(i, 5) * 280),
      y: (i) => Math.sin(rnd(i, 1) * Math.PI * 2) * (200 + rnd(i, 6) * 220) - 80,
      rotation: (i) => (rnd(i, 7) - 0.5) * 70, scale: 0.5, opacity: 0,
      duration: 0.14, ease: 'power2.in', stagger: { each: 0.003, from: 'edges' }
    }, 0.85);
}

/* ===================== MOBILE TIMELINE (lighter) ===================== */
function buildMobile(section, els, { chars, words, field }) {
  const { eyebrow, secondary, support } = els;
  field.mobile = true;

  // simpler: words rise from soft offset (no scattered-char storm)
  gsap.set(chars, { opacity: 0 });
  gsap.set(els.main, { y: 26, opacity: 0 });
  gsap.set(eyebrow, { opacity: 0, y: 8 });
  gsap.set(secondary, { filter: 'blur(5px)' });
  gsap.set(words, { opacity: 0, y: 16 });
  gsap.set(support, { opacity: 0, y: 14 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.9,
      onUpdate: (self) => { field.progress = self.progress; }
    }
  });

  tl
    .to(eyebrow, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.0)
    .to(els.main, { y: 0, opacity: 1, duration: 0.16, ease: 'power3.out' }, 0.06)
    .to(chars, { opacity: 1, duration: 0.14, stagger: { each: 0.004, from: 'start' } }, 0.06)
    .to(secondary, { filter: 'blur(0px)', duration: 0.14, ease: 'power2.out' }, 0.34)
    .to(words, { opacity: 1, y: 0, duration: 0.14, ease: 'power3.out', stagger: 0.02 }, 0.34)
    .to(support, { opacity: 0.72, y: 0, duration: 0.12, ease: 'power2.out' }, 0.52)
    .to([eyebrow, support], { opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.82)
    .to([els.main, secondary], { opacity: 0, y: -16, duration: 0.14, ease: 'power2.in' }, 0.84);
}

/* ===================== CANVAS PARTICLE FIELD ===================== */
function createParticleField(canvas, { mobile }) {
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const GLYPHS = 'OLUJAVŠPRINKT".•'.split('');
  let W = 0, H = 0, cx = 0, cy = 0;
  const DUST = mobile ? 60 : 150;
  const FRAG = mobile ? 26 : 80;
  const dust = [];
  const frags = [];

  function build() {
    dust.length = 0; frags.length = 0;
    for (let i = 0; i < DUST; i++) {
      dust.push({ hx: Math.random() * W, hy: Math.random() * H, z: 0.2 + Math.random() * 0.8,
        r: 0.5 + Math.random() * 1.4, ph: Math.random() * 6.28, sp: 0.2 + Math.random() * 0.6,
        a: 0.06 + Math.random() * 0.18 });
    }
    for (let i = 0; i < FRAG; i++) {
      frags.push({ hx: Math.random() * W, hy: Math.random() * H, z: 0.25 + Math.random() * 0.75,
        ch: GLYPHS[(Math.random() * GLYPHS.length) | 0], size: (mobile ? 9 : 12) + Math.random() * (mobile ? 8 : 16),
        ph: Math.random() * 6.28, sp: 0.15 + Math.random() * 0.5, rot: (Math.random() - 0.5) * 0.6,
        rotV: (Math.random() - 0.5) * 0.3, a: 0.05 + Math.random() * 0.16,
        ang: Math.random() * 6.28, dist: Math.random() });
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cx = W / 2; cy = H / 2;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  const field = { progress: 0, mobile: !!mobile, start, stop, resize, dispose };
  let raf = null, running = false, t = 0, last = 0;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    ctx.clearRect(0, 0, W, H);

    const p = field.progress;
    // gather inward (0.12→0.4), disperse outward + storm wind (0.82→1)
    const gather = clamp((p - 0.12) / 0.28) * 0.3;
    const disperse = clamp((p - 0.82) / 0.18);
    // brief charged spike around the shockwave, plus a global fade near the end
    const charge = bell(p, 0.46, 0.08);
    const endFade = 1 - clamp((p - 0.9) / 0.1);
    const wind = disperse * (mobile ? 220 : 360);

    // dust
    ctx.fillStyle = '#cfe0ff';
    for (const d of dust) {
      const drift = Math.sin(t * d.sp + d.ph) * 10 * d.z;
      let x = d.hx + drift + Math.cos(t * 0.2 + d.ph) * 6;
      let y = d.hy + Math.cos(t * d.sp * 0.8 + d.ph) * 8 * d.z;
      x = lerp(x, cx, gather * d.z);
      y = lerp(y, cy, gather * d.z);
      x += wind * d.z + (x - cx) * disperse * 0.6;
      y += (y - cy) * disperse * 0.6 - wind * 0.2 * d.z;
      const a = (d.a + charge * 0.1) * (0.4 + d.z) * endFade * (0.5 + Math.min(1, gather * 2 + 0.5));
      if (a <= 0.002) continue;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, d.r * (0.6 + d.z), 0, 6.2832); ctx.fill();
    }

    // typographic fragments
    ctx.font = '600 16px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of frags) {
      const drift = Math.sin(t * f.sp + f.ph);
      let x = f.hx + drift * 16 * f.z + Math.cos(t * 0.18 + f.ph) * 10;
      let y = f.hy + Math.cos(t * f.sp * 0.7 + f.ph) * 14 * f.z;
      x = lerp(x, cx + Math.cos(f.ang) * 40, gather * f.z * 1.4);
      y = lerp(y, cy + Math.sin(f.ang) * 30, gather * f.z * 1.4);
      x += wind * f.z * 1.2 + (x - cx) * disperse * 0.8;
      y += (y - cy) * disperse * 0.8 - wind * 0.25 * f.z;
      const rot = f.rot + f.rotV * t + disperse * f.ang;
      // fragments fade out as the real letters lock in (hand-off), back in on dissperse
      const handoff = 1 - clamp((p - 0.3) / 0.12) * (1 - disperse);
      const a = (f.a + charge * 0.12) * (0.4 + f.z) * endFade * handoff;
      if (a <= 0.003) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, a);
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(f.size / 16, f.size / 16);
      ctx.fillStyle = f.z > 0.6 ? '#dce8ff' : '#8aa6e6';
      ctx.fillText(f.ch, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function dispose() { stop(); }

  return field;
}

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const bell = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (2 * w * w));
