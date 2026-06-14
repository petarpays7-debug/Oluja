import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { SITE_CONFIG } from './config.js';
import { runLoader } from './components/loader.js';
import { initNavigation } from './components/navigation.js';
import { initCursor } from './components/cursor.js';
import { buildPortfolio } from './components/portfolio.js';
import { initContact } from './components/contact.js';
import { hydrateMedia } from './utils/media.js';

import { initHero } from './animations/hero.js';
import { initScroll } from './animations/scroll.js';
import { initPortfolioScroll } from './animations/portfolio.js';
import { initLaboratory } from './animations/laboratory.js';

import { prefersReducedMotion, canRunHeavyMotion } from './utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

// Označi da JS radi — neke progresivne nadogradnje (npr. fokus na koraku procesa)
// primjenjuju se samo tada; bez JS-a sadržaj ostaje potpuno vidljiv.
document.documentElement.classList.add('has-js');

function initSmoothScroll() {
  if (prefersReducedMotion()) {
    // Sidrene poveznice rade preko native scrolla.
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView();
      });
    });
    return null;
  }

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Sidrene poveznice kroz Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -10 });
    });
  });

  return lenis;
}

function fillFooter() {
  const c = SITE_CONFIG.company;
  const legal = document.getElementById('footer-legal');
  if (legal) {
    const rows = [
      c.legalName,
      c.address,
      `OIB: ${c.oib}`,
      `Matični broj: ${c.registrationNumber}`,
      `Godina osnivanja: ${c.founded}.`,
      `Registrirana djelatnost: ${c.activity}`
    ];
    if (c.phone) rows.splice(2, 0, `Telefon: ${c.phone}`);
    legal.innerHTML = rows.map((r) => `<span>${r}</span>`).join('');
  }
  const copy = document.getElementById('footer-copy');
  if (copy) {
    copy.textContent = `© ${new Date().getFullYear()} ${c.brand}. Sva prava pridržana.`;
  }
}

async function loadThree() {
  if (!canRunHeavyMotion()) return;
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  try {
    const { initHeroScene } = await import('./three/hero-scene.js');
    initHeroScene(canvas);
  } catch (e) {
    // WebGL/Three nedostupan — hero ostaje s CSS gridom i glowom.
    console.warn('Three.js scena preskočena:', e?.message);
  }
}

function boot() {
  // Sadržaj koji ovisi o configu
  fillFooter();
  hydrateMedia(document); // hero browseri
  buildPortfolio();

  initNavigation();
  initContact();
  initCursor();

  const lenis = initSmoothScroll();

  initHero();
  initScroll();
  initPortfolioScroll();
  initLaboratory();

  // Three.js tek kad je sve ostalo spremno (idle ako moguće)
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  idle(() => loadThree());

  // Sigurnosni refresh layouta
  requestAnimationFrame(() => ScrollTrigger.refresh());
  return lenis;
}

// Pokreni nakon preloadera.
runLoader().then(() => {
  boot();
});

// Fallback: ako se nešto u loaderu sruši, ipak pokreni stranicu.
window.addEventListener('error', () => {
  const pre = document.getElementById('preloader');
  if (pre && !pre.classList.contains('is-done')) {
    pre.style.display = 'none';
  }
});
