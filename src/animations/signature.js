import { prefersReducedMotion, isMobile } from '../utils/performance.js';

/**
 * Signature moment uvodne izjave: nekoliko elegantnih, svjetlosnih
 * leptira / krilatih formi koje se rađaju iza teksta, prolaze oko slova
 * i tiho odlebde prema rubovima gdje se rasprše.
 *
 * Premium i suptilno: malen broj formi, aditivno stapanje, meki sjaj,
 * plavo–ljubičasta paleta. Gasi se izvan kadra, preskače reduced-motion,
 * a na mobitelu radi pojednostavljenu, lakšu verziju.
 */
export function initSignature() {
  if (prefersReducedMotion()) return;

  const canvas = document.getElementById('statement-fx');
  const section = document.getElementById('statement');
  if (!canvas || !section) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const mobile = isMobile();
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);

  // Manje formi i bez skupog sjaja na mobitelu.
  const MAX_ALIVE = mobile ? 3 : 6;
  const USE_GLOW = !mobile;

  let w = 0;
  let h = 0;
  let raf = null;
  let running = false;
  let lastSpawn = 0;
  let started = false;
  const flutters = [];

  function resize() {
    const r = section.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  // Izvor: oko sredine teksta, blago iznad centra sekcije.
  function spawn() {
    if (flutters.length >= MAX_ALIVE) return;
    const cx = w * rand(0.4, 0.6);
    const cy = h * rand(0.42, 0.56);
    const dir = rand(0, Math.PI * 2);
    const speed = rand(0.18, 0.42);
    flutters.push({
      x: cx,
      y: cy,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed - rand(0.05, 0.22), // blagi uzgon prema gore
      size: rand(mobile ? 9 : 11, mobile ? 15 : 24),
      rot: rand(-0.5, 0.5),
      vrot: rand(-0.004, 0.004),
      flap: rand(0, Math.PI * 2),
      flapSpeed: rand(0.12, 0.2),
      hue: rand(0, 1), // 0 = plava, 1 = ljubičasta
      life: 0,
      maxLife: rand(320, 520), // u frame-ovima (~5-8s)
      drift: rand(0.4, 1.1)
    });
  }

  // Jedno krilo (gornje + donje), nacrtano u +x; lijevo se zrcali.
  function wing(s) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(0.35 * s, -0.62 * s, 1.05 * s, -0.7 * s, 1.18 * s, -0.22 * s);
    ctx.bezierCurveTo(1.28 * s, 0.12 * s, 0.7 * s, 0.18 * s, 0, 0);
    ctx.closePath();
    ctx.fill();
    // donje, manje krilo
    ctx.beginPath();
    ctx.moveTo(0, 0.05 * s);
    ctx.bezierCurveTo(0.28 * s, 0.32 * s, 0.74 * s, 0.5 * s, 0.78 * s, 0.86 * s);
    ctx.bezierCurveTo(0.8 * s, 1.06 * s, 0.34 * s, 0.74 * s, 0, 0.28 * s);
    ctx.closePath();
    ctx.fill();
  }

  function drawFlutter(f) {
    const t = f.life / f.maxLife;
    // mek ulaz/izlaz: 0 -> fade in -> hold -> fade out
    const alpha =
      (t < 0.18 ? t / 0.18 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1) *
      (f.fade ?? 1);
    if (alpha <= 0.01) return;

    const s = f.size;
    const open = 0.32 + 0.68 * Math.abs(Math.sin(f.flap)); // zamah krila

    const blue = [114, 164, 255];
    const violet = [138, 120, 255];
    const c = blue.map((b, i) => Math.round(b + (violet[i] - b) * f.hue));
    const rgb = `${c[0]}, ${c[1]}, ${c[2]}`;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.55;

    const grad = ctx.createLinearGradient(-s, 0, s, 0);
    grad.addColorStop(0, `rgba(${rgb}, 0.05)`);
    grad.addColorStop(0.5, `rgba(${rgb}, 0.5)`);
    grad.addColorStop(1, `rgba(${rgb}, 0.05)`);
    ctx.fillStyle = grad;

    if (USE_GLOW) {
      ctx.shadowColor = `rgba(${rgb}, 0.65)`;
      ctx.shadowBlur = s * 0.9;
    }

    // desno krilo
    ctx.save();
    ctx.scale(open, 1);
    wing(s);
    ctx.restore();
    // lijevo krilo (zrcaljeno)
    ctx.save();
    ctx.scale(-open, 1);
    wing(s);
    ctx.restore();

    // tijelo — tanka svjetlosna nit
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = `rgba(${rgb}, 0.9)`;
    ctx.fillRect(-0.6, -s * 0.5, 1.2, s * 1.15);

    ctx.restore();
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);

    const now = performance.now();
    // tihi, rijetki dolazak novih leptira dok je sekcija u kadru
    const interval = started && flutters.length < 2 ? 900 : mobile ? 4200 : 2600;
    if (now - lastSpawn > interval && flutters.length < MAX_ALIVE) {
      spawn();
      lastSpawn = now;
    }

    for (let i = flutters.length - 1; i >= 0; i--) {
      const f = flutters[i];
      f.life++;
      f.flap += f.flapSpeed;
      f.rot += f.vrot;
      // lebdeća putanja: zamah + spori drift prema van
      f.x += f.vx + Math.sin(f.life * 0.03) * 0.25 * f.drift;
      f.y += f.vy + Math.cos(f.life * 0.025) * 0.12 * f.drift;
      f.vy -= 0.0006; // postupni uzgon

      // rasprši se kad izađe iz kadra ili istekne život
      const out =
        f.x < -40 || f.x > w + 40 || f.y < -40 || f.y > h + 40;
      if (f.life >= f.maxLife || out) {
        flutters.splice(i, 1);
        continue;
      }
      drawFlutter(f);
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    if (!started) {
      // početni nježni „izlet” od nekoliko leptira
      started = true;
      const burst = mobile ? 3 : 5;
      for (let i = 0; i < burst; i++) {
        setTimeout(() => running && spawn(), i * 220);
      }
    }
    lastSpawn = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  resize();
  let resizeT;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(resize, 200);
    },
    { passive: true }
  );

  // Pokreni samo dok je sekcija vidljiva — bez trošenja izvan kadra.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) start();
        else stop();
      });
    },
    { threshold: 0.2 }
  );
  io.observe(section);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (
      section.getBoundingClientRect().top < window.innerHeight &&
      section.getBoundingClientRect().bottom > 0
    )
      start();
  });
}
