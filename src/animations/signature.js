import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobile, supportsWebGL } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Orkestrator kinematske "signature" scene uvodne izjave.
 *
 *  - desktop + WebGL  → puna scena (src/three/statement-scene.js)
 *  - mobitel / bez WebGL-a → laka 2D verzija (canvas: rez + pad traka + ~20 leptira)
 *  - prefers-reduced-motion → statičan tekst + par mirnih silueta
 *
 * Semantički tekst uvijek ostaje u DOM-u (a11y/SEO/no-JS).
 */
export function initSignature() {
  const section = document.getElementById('statement');
  const sceneEl = document.getElementById('statement-scene');
  const canvas = document.getElementById('statement-canvas');
  if (!section || !sceneEl || !canvas) return;

  if (prefersReducedMotion()) {
    runReduced(section, canvas);
    return;
  }

  const mobile = isMobile();
  const webgl = supportsWebGL();

  if (webgl && !mobile) runWebGL(section, sceneEl, canvas);
  else runLite(section, sceneEl, canvas, { mobile });
}

/* ============================ WEBGL (desktop) ============================ */
function runWebGL(section, sceneEl, canvas) {
  section.dataset.mode = 'webgl';
  let scene = null;
  let st = null;

  const shake = () => {
    gsap.fromTo(
      sceneEl,
      { x: 0, y: 0 },
      {
        x: 'random(-3,3)',
        y: 'random(-2,2)',
        duration: 0.05,
        repeat: 5,
        yoyo: true,
        ease: 'none',
        onComplete: () => gsap.set(sceneEl, { x: 0, y: 0 })
      }
    );
    gsap.fromTo(
      canvas,
      { filter: 'blur(3px)' },
      { filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' }
    );
  };

  import('../three/statement-scene.js')
    .then(({ createStatementScene }) => ready(createStatementScene))
    .catch(() => {
      // WebGL modul pao → 2D fallback
      delete section.dataset.mode;
      runLite(section, sceneEl, canvas, { mobile: false });
    });

  function ready(createStatementScene) {
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      scene = createStatementScene(canvas, { mobile: false });
      scene.setShake(shake);
      scene.resize();

      // Dev-only hook za determinističku QA (uklonjen iz produkcijskog builda).
      if (import.meta.env.DEV) window.__statementScene = scene;

      // renderiraj samo dok je sekcija u kadru
      const io = new IntersectionObserver(
        (ents) =>
          ents.forEach((e) => (e.isIntersecting ? scene.start() : scene.stop())),
        { rootMargin: '10% 0px' }
      );
      io.observe(section);

      // scroll vodi arrival/tension; prag pokreće udar
      st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          if (!scene) return;
          if (!scene.hasPlayed) {
            scene.setReveal(Math.min(1, self.progress / 0.3));
            if (self.progress >= 0.34) scene.trigger();
          }
        },
        onLeaveBack: () => scene && scene.reset()
      });

      window.addEventListener('resize', onResize, { passive: true });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }

  let rT;
  function onResize() {
    clearTimeout(rT);
    rT = setTimeout(() => {
      scene && scene.resize();
      st && st.refresh();
    }, 200);
  }
}

/* ============================ LITE 2D (mobitel / bez WebGL-a) ============================ */
function runLite(section, sceneEl, canvas, { mobile }) {
  section.dataset.mode = 'lite';
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    delete section.dataset.mode; // pokaži DOM tekst
    return;
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0;
  let H = 0;
  let textCanvas = null;
  let textW = 0;
  let textH = 0;
  let textBox = { x: 0, y: 0, w: 0, h: 0 };

  const LINES = [
    { t: 'VAŠA WEB STRANICA ČESTO JE PRVI', blue: false },
    { t: 'KONTAKT KUPCA S VAŠOM TVRTKOM.', blue: false },
    { t: 'POBRINUT ĆEMO SE DA TAJ PRVI', blue: true },
    { t: 'DOJAM NE IZGLEDA PROSJEČNO.', blue: true }
  ];

  function buildText() {
    const maxW = W * (mobile ? 0.9 : 0.7);
    let fontPx = mobile ? 30 : 54;
    const off = document.createElement('canvas');
    const o = off.getContext('2d');
    const fit = () => {
      o.font = `700 ${fontPx}px "Space Grotesk", system-ui, sans-serif`;
      let widest = 0;
      LINES.forEach((l) => (widest = Math.max(widest, o.measureText(l.t).width)));
      return widest;
    };
    while (fit() > maxW && fontPx > 12) fontPx -= 1;
    const lineH = fontPx * 1.2;
    const coupleGap = fontPx * 0.5;
    const widest = fit();
    const pad = fontPx * 0.6;
    textW = Math.ceil(widest + pad * 2);
    textH = Math.ceil(lineH * 4 + coupleGap + pad);
    off.width = Math.ceil(textW * DPR);
    off.height = Math.ceil(textH * DPR);
    o.scale(DPR, DPR);
    o.font = `700 ${fontPx}px "Space Grotesk", system-ui, sans-serif`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    const ys = [];
    let y = pad * 0.5 + lineH * 0.5;
    ys.push(y);
    ys.push((y += lineH));
    y += coupleGap;
    ys.push((y += lineH));
    ys.push((y += lineH));
    LINES.forEach((l, i) => {
      o.fillStyle = l.blue ? '#74a6ff' : '#f4f4f1';
      o.globalAlpha = l.blue ? 0.85 : 1;
      o.fillText(l.t, textW / 2, ys[i]);
    });
    o.globalAlpha = 1;
    textCanvas = off;
  }

  function resize() {
    const r = sceneEl.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    buildText();
    const scale = Math.min(1, (W * (mobile ? 0.92 : 0.66)) / textW);
    const dw = textW * scale;
    const dh = textH * scale;
    textBox = { x: (W - dw) / 2, y: H * 0.42 - dh / 2, w: dw, h: dh };
  }

  // 3 dijagonalna reza u koordinatama textBox-a (nx,ny u 0..1)
  const CUTS = [
    { m: -0.42, b: 0.34 },
    { m: -0.5, b: 0.55 },
    { m: -0.34, b: 0.74 }
  ];
  // 4 trake (gornja ostaje) – po-traci parametri pada
  const BANDS = [
    { delay: 0, fall: 0, rot: 0 }, // vrh
    { delay: 0.05, fall: 1.2, rot: 0.18 },
    { delay: 0.12, fall: 1.5, rot: -0.22 },
    { delay: 0.18, fall: 1.8, rot: 0.26 }
  ];

  // leptiri 2D
  const NB = mobile ? 22 : 30;
  const flies = [];

  function spawnFlies() {
    flies.length = 0;
    for (let i = 0; i < NB; i++) {
      const cut = CUTS[i % 3];
      const nx = Math.random();
      const ny = cut.m * (nx - 0.5) + cut.b;
      flies.push({
        x: textBox.x + nx * textBox.w,
        y: textBox.y + ny * textBox.h,
        vx: (Math.random() - 0.5) * 120,
        vy: -40 - Math.random() * 140,
        s: (mobile ? 9 : 12) + Math.random() * (mobile ? 8 : 14),
        rot: Math.random() * 6.28,
        flap: Math.random() * 6.28,
        flapV: 8 + Math.random() * 8,
        delay: Math.random() * 0.7,
        tint: Math.random() < 0.2 ? 1 : 0,
        op: 0
      });
    }
  }

  function drawButterfly(f) {
    const open = 0.3 + 0.7 * Math.abs(Math.sin(f.flap));
    ctx.save();
    ctx.translate(f.x * DPR, f.y * DPR);
    ctx.scale(DPR, DPR);
    ctx.rotate(f.rot);
    ctx.globalAlpha = f.op;
    const edge = f.tint ? 'rgba(200,220,255,0.9)' : 'rgba(60,140,255,0.85)';
    const wing = (side) => {
      ctx.save();
      ctx.scale(side * open, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(0.35 * f.s, -0.62 * f.s, 1.05 * f.s, -0.7 * f.s, 1.16 * f.s, -0.18 * f.s);
      ctx.bezierCurveTo(1.26 * f.s, 0.12 * f.s, 0.6 * f.s, 0.16 * f.s, 0, 0);
      ctx.moveTo(0, 0.05 * f.s);
      ctx.bezierCurveTo(0.3 * f.s, 0.34 * f.s, 0.74 * f.s, 0.5 * f.s, 0.7 * f.s, 0.84 * f.s);
      ctx.bezierCurveTo(0.66 * f.s, 1.0 * f.s, 0.2 * f.s, 0.6 * f.s, 0, 0.22 * f.s);
      ctx.fillStyle = 'rgba(10,13,20,0.92)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = edge;
      ctx.stroke();
      ctx.restore();
    };
    wing(1);
    wing(-1);
    ctx.restore();
  }

  let raf = null;
  let running = false;
  let reveal = 0;
  let triggered = false;
  let played = false;
  let tStrike = 0;
  let last = 0;

  function render(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const prog = triggered ? Math.min(1, (now - tStrike) / 1000 / (mobile ? 1.9 : 2.4)) : 0;

    if (!triggered) {
      // arrival: tekst se pojavi
      ctx.save();
      ctx.globalAlpha = reveal;
      ctx.drawImage(textCanvas, textBox.x * DPR, textBox.y * DPR, textBox.w * DPR, textBox.h * DPR);
      ctx.restore();
    } else {
      // pad traka po dijagonalnim rezovima — transform PA clip PA crtanje,
      // da se traka pomiče kruto (bez duplog/ghost teksta).
      for (let bi = 0; bi < 4; bi++) {
        const band = BANDS[bi];
        const L = Math.max(0, Math.min(1, (prog - band.delay) / (1 - band.delay)));
        const g = L * L;
        const cxp = (textBox.x + textBox.w / 2) * DPR;
        const topY = (textBox.y + (bi === 0 ? 0 : CUTS[bi - 1].b * textBox.h)) * DPR;
        const dy = g * band.fall * textBox.h * DPR;
        ctx.save();
        ctx.translate(cxp, topY + dy);
        ctx.rotate(band.rot * g);
        ctx.translate(-cxp, -topY);
        ctx.beginPath();
        bandPath(ctx, bi);
        ctx.clip();
        ctx.globalAlpha = 1 - Math.max(0, (L - 0.6) / 0.4);
        ctx.drawImage(
          textCanvas,
          textBox.x * DPR,
          textBox.y * DPR,
          textBox.w * DPR,
          textBox.h * DPR
        );
        ctx.restore();
      }
      // slash flash (kratko)
      const sl = Math.max(0, 1 - (now - tStrike) / 480);
      if (sl > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = sl;
        ctx.strokeStyle = 'rgba(190,212,255,0.95)';
        ctx.lineWidth = 2 * DPR;
        ctx.shadowColor = 'rgba(120,170,255,0.9)';
        ctx.shadowBlur = 10 * DPR;
        CUTS.forEach((cut) => {
          ctx.beginPath();
          const y0 = (textBox.y + (cut.m * -0.5 + cut.b) * textBox.h) * DPR;
          const y1 = (textBox.y + (cut.m * 0.5 + cut.b) * textBox.h) * DPR;
          ctx.moveTo(textBox.x * DPR, y0);
          ctx.lineTo((textBox.x + textBox.w) * DPR, y1);
          ctx.stroke();
        });
        ctx.restore();
      }
      // leptiri
      const bt = (now - tStrike) / 1000;
      flies.forEach((f) => {
        if (bt < f.delay) return;
        f.flap += f.flapV * dt;
        f.vy += 60 * dt; // blagi pad pa let
        f.vx += Math.sin(bt * 1.5 + f.rot) * 30 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += dt * 0.4;
        f.op = Math.min(1, f.op + dt * 2);
        if (f.y < -40 || f.x < -40 || f.x > W + 40) f.op = Math.max(0, f.op - dt * 2);
        drawButterfly(f);
      });
    }
    raf = requestAnimationFrame(render);
  }

  function bandPath(c, bi) {
    const x0 = textBox.x * DPR;
    const x1 = (textBox.x + textBox.w) * DPR;
    const top = bi === 0 ? textBox.y * DPR : null;
    const yAt = (cut, side) => (textBox.y + (cut.m * (side - 0.5) + cut.b) * textBox.h) * DPR;
    c.beginPath();
    if (bi === 0) {
      c.moveTo(x0, textBox.y * DPR);
      c.lineTo(x1, textBox.y * DPR);
      c.lineTo(x1, yAt(CUTS[0], 1));
      c.lineTo(x0, yAt(CUTS[0], 0));
    } else if (bi < 3) {
      c.moveTo(x0, yAt(CUTS[bi - 1], 0));
      c.lineTo(x1, yAt(CUTS[bi - 1], 1));
      c.lineTo(x1, yAt(CUTS[bi], 1));
      c.lineTo(x0, yAt(CUTS[bi], 0));
    } else {
      c.moveTo(x0, yAt(CUTS[2], 0));
      c.lineTo(x1, yAt(CUTS[2], 1));
      c.lineTo(x1, (textBox.y + textBox.h) * DPR);
      c.lineTo(x0, (textBox.y + textBox.h) * DPR);
    }
    c.closePath();
  }

  function trigger() {
    if (played) return;
    played = true;
    triggered = true;
    tStrike = performance.now();
    spawnFlies();
    if (navigator.vibrate && mobile) navigator.vibrate(12);
  }
  function reset() {
    played = false;
    triggered = false;
    reveal = 0;
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(render);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  resize();
  let rT;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(rT);
      rT = setTimeout(resize, 200);
    },
    { passive: true }
  );

  const io = new IntersectionObserver(
    (ents) => ents.forEach((e) => (e.isIntersecting ? start() : stop())),
    { rootMargin: '10% 0px' }
  );
  io.observe(section);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      if (!played) {
        reveal = Math.min(1, self.progress / 0.3);
        if (self.progress >= 0.34) trigger();
      }
    },
    onLeaveBack: () => reset()
  });
  requestAnimationFrame(() => ScrollTrigger.refresh());

  if (import.meta.env.DEV) {
    window.__statementLite = {
      trigger,
      reset,
      setReveal: (v) => {
        reveal = v;
      }
    };
  }
}

/* ============================ REDUCED MOTION ============================ */
function runReduced(section, canvas) {
  section.dataset.mode = 'reduced';
  // tekst ostaje vidljiv (CSS). Par mirnih silueta za eleganciju (bez animacije).
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const sceneEl = document.getElementById('statement-scene');
  const draw = () => {
    const r = (sceneEl || section).getBoundingClientRect();
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * DPR);
    canvas.height = Math.round(r.height * DPR);
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sil = [
      { x: r.width * 0.2, y: r.height * 0.32, s: 26 },
      { x: r.width * 0.82, y: r.height * 0.6, s: 20 },
      { x: r.width * 0.7, y: r.height * 0.28, s: 16 }
    ];
    sil.forEach((b) => {
      ctx.save();
      ctx.translate(b.x * DPR, b.y * DPR);
      ctx.scale(DPR, DPR);
      ctx.globalAlpha = 0.5;
      [1, -1].forEach((side) => {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.35 * b.s, -0.62 * b.s, 1.05 * b.s, -0.7 * b.s, 1.16 * b.s, -0.18 * b.s);
        ctx.bezierCurveTo(1.26 * b.s, 0.12 * b.s, 0.6 * b.s, 0.16 * b.s, 0, 0);
        ctx.strokeStyle = 'rgba(80,150,255,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    });
  };
  draw();
  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(draw, 250);
  });
}
