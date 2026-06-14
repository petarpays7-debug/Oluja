import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

// Opće scroll animacije (statement, capabilities, process, footer, scroll progress).
export function initScroll() {
  const reduced = prefersReducedMotion();

  // --- scroll progress bar ---
  const bar = document.getElementById('scroll-progress');
  if (bar) {
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
  }

  if (reduced) return;

  // --- statement: linije se pale jedna po jedna ---
  const stmLines = gsap.utils.toArray('.stm-line');
  stmLines.forEach((line) => {
    ScrollTrigger.create({
      trigger: line,
      start: 'top 70%',
      end: 'bottom 40%',
      onEnter: () => line.classList.add('is-lit'),
      onLeaveBack: () => line.classList.remove('is-lit')
    });
  });
  gsap.from(stmLines, {
    yPercent: 60,
    opacity: 0,
    duration: 0.9,
    stagger: 0.1,
    ease: 'power4.out',
    scrollTrigger: { trigger: '.statement', start: 'top 70%' }
  });

  // centrirani vertikalni akcent „izraste” na ulazu u sekciju
  const accent = document.querySelector('.statement__accent');
  if (accent) {
    ScrollTrigger.create({
      trigger: '.statement',
      start: 'top 75%',
      once: true,
      onEnter: () => accent.classList.add('is-grown')
    });
  }

  // --- generic reveal za capabilities, values, steps, trust ---
  const revealEls = gsap.utils.toArray(
    '.cap, .value, .step, .section-head__title, .section-head__lead, .lab__intro, .trust__lead'
  );
  revealEls.forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // trust kartice: blagi stagger po retku
  ScrollTrigger.batch('.trust-card', {
    start: 'top 88%',
    onEnter: (batch) =>
      gsap.from(batch, {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        overwrite: true
      })
  });

  // --- process rail + active steps ---
  initProcess();

  // --- footer giant: pomak + impuls ---
  initFooter();

  // refresh nakon učitavanja fontova/slika
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

function initProcess() {
  const steps = gsap.utils.toArray('.step');
  const fill = document.getElementById('steps-fill');
  const isMobile = window.matchMedia('(max-width: 860px)').matches;

  if (fill) {
    gsap.to(fill, {
      [isMobile ? 'height' : 'width']: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.steps',
        start: 'top 70%',
        end: 'bottom 75%',
        scrub: 0.4
      }
    });
  }

  // Uvijek točno jedan aktivan korak dok je sekcija u kadru (bez „mrtve zone”).
  const setActive = (idx) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
  };
  ScrollTrigger.create({
    trigger: '.steps',
    start: 'top 65%',
    end: 'bottom 75%',
    onUpdate: (self) => {
      const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
      setActive(idx);
    },
    onEnter: () => setActive(0),
    onEnterBack: () => setActive(steps.length - 1)
  });
}

function initFooter() {
  const giant = document.getElementById('footer-giant');
  if (!giant) return;
  gsap.to(giant, {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });
  ScrollTrigger.create({
    trigger: '.footer__giant',
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.fromTo(
        giant,
        { textShadow: '0 0 0 rgba(52,120,255,0)' },
        {
          textShadow: '0 0 40px rgba(52,120,255,0.4)',
          duration: 0.6,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut'
        }
      );
    }
  });
}
