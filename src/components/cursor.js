import { prefersReducedMotion, isTouch, lerp, clamp } from '../utils/performance.js';

// Potpuno prilagođen cursor sustav (samo desktop / fine pointer).
export function initCursor() {
  if (prefersReducedMotion() || isTouch() || !window.matchMedia('(hover: hover)').matches) {
    return;
  }

  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  cursor.innerHTML = `
    <svg class="cursor__svg" data-c="doors" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(114,164,255,0.5)" stroke-width="1"/>
      <rect x="38" y="22" width="24" height="46" rx="2" fill="none" stroke="rgba(244,244,241,0.6)" stroke-width="1.5"/>
      <circle cx="56" cy="46" r="2" fill="#72a4ff"/>
    </svg>
    <svg class="cursor__svg" data-c="bimmer" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(114,164,255,0.5)" stroke-width="1"/>
      <path d="M22 60 A30 30 0 0 1 78 60" fill="none" stroke="rgba(244,244,241,0.4)" stroke-width="1.5"/>
      <line class="cursor__needle" x1="50" y1="56" x2="50" y2="30" stroke="#72a4ff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="50" cy="56" r="3" fill="#72a4ff"/>
    </svg>
    <span class="cursor__arrow" aria-hidden="true">↗</span>
    <span class="cursor__label"></span>
  `;

  const label = cursor.querySelector('.cursor__label');
  const needle = cursor.querySelector('.cursor__needle');
  const svgDoors = cursor.querySelector('[data-c="doors"]');
  const svgBimmer = cursor.querySelector('[data-c="bimmer"]');

  document.documentElement.classList.add('has-custom-cursor');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  let prevX = mx;
  let velocity = 0;
  let ready = false;

  window.addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!ready) {
        ready = true;
        cursor.classList.add('is-ready');
      }
    },
    { passive: true }
  );

  // Project / link hover stanja kroz delegaciju
  const setProject = (type) => {
    cursor.classList.add('is-project');
    svgDoors.classList.toggle('is-active', type === 'doors');
    svgBimmer.classList.toggle('is-active', type === 'bimmer');
    label.textContent = type === 'doors' ? 'OTVORI' : 'VOZI';
  };
  const clearProject = () => {
    cursor.classList.remove('is-project');
    svgDoors.classList.remove('is-active');
    svgBimmer.classList.remove('is-active');
    label.textContent = '';
  };

  document.addEventListener('mouseover', (e) => {
    const project = e.target.closest('[data-cursor]');
    if (project) {
      setProject(project.dataset.cursor);
      return;
    }
    if (e.target.closest('a, button, [data-magnetic]')) {
      cursor.classList.add('is-hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-cursor]')) clearProject();
    if (e.target.closest('a, button, [data-magnetic]')) {
      cursor.classList.remove('is-hover');
    }
  });

  // Magnetic dugmad
  initMagnetic();

  let raf;
  const tick = () => {
    cx = lerp(cx, mx, 0.22);
    cy = lerp(cy, my, 0.22);
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;

    // velocity -> brzinomjer kazaljka
    velocity = lerp(velocity, Math.abs(mx - prevX), 0.2);
    prevX = mx;
    if (needle) {
      const angle = clamp(velocity * 1.6, 0, 120) - 60;
      needle.setAttribute('transform', `rotate(${angle} 50 56)`);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
}

function initMagnetic() {
  const els = document.querySelectorAll('[data-magnetic]');
  els.forEach((el) => {
    const strength = 0.3;
    const max = 14;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = clamp((e.clientX - (r.left + r.width / 2)) * strength, -max, max);
      const y = clamp((e.clientY - (r.top + r.height / 2)) * strength, -max, max);
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}
