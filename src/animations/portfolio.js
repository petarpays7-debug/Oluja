import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobile } from '../utils/performance.js';

gsap.registerPlugin(ScrollTrigger);

// Scroll-driven portfolio: Doors -> Bimmer transformacija.
// Desktop: pinano. Mobitel / reduced-motion: vertikalni stacked prikaz (bez pina).
export function initPortfolioScroll() {
  const sticky = document.getElementById('portfolio-sticky');
  const panels = gsap.utils.toArray('.pf-panel');
  if (!sticky || panels.length < 2) return;

  const bgNum = document.getElementById('portfolio-bgnum');
  const pulse = document.getElementById('portfolio-pulse');

  if (prefersReducedMotion() || isMobile()) {
    panels.forEach((p) => {
      p.classList.add('is-active');
      gsap.set(p, { clearProps: 'all', opacity: 1, visibility: 'visible' });
    });
    return;
  }

  // Početno stanje
  gsap.set(panels[0], { autoAlpha: 1 });
  gsap.set(panels[0].querySelector('.pf-panel__info'), { xPercent: 0, autoAlpha: 1 });
  gsap.set(panels[0].querySelector('.pf-browser'), {
    autoAlpha: 1,
    rotateY: -12,
    xPercent: 0
  });
  for (let i = 1; i < panels.length; i++) {
    gsap.set(panels[i], { autoAlpha: 0 });
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: sticky,
      start: 'top top',
      end: '+=' + 120 * (panels.length - 1) + '%',
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => {
        const idx = Math.round(self.progress * (panels.length - 1));
        if (bgNum) bgNum.textContent = panels[idx].dataset.index === '0' ? '01' : '02';
      }
    }
  });

  for (let i = 0; i < panels.length - 1; i++) {
    const cur = panels[i];
    const next = panels[i + 1];
    const curBrowser = cur.querySelector('.pf-browser');
    const curInfo = cur.querySelector('.pf-panel__info');
    const nextBrowser = next.querySelector('.pf-browser');
    const nextInfo = next.querySelector('.pf-panel__info');

    gsap.set(next, { autoAlpha: 0 });

    // izlaz trenutnog projekta — povećanje pa rotacija u dubinu
    tl.to(curBrowser, { scale: 1.05, duration: 0.25 })
      .to(curBrowser, { rotateY: -42, xPercent: -60, z: -300, autoAlpha: 0, duration: 0.5 }, '>')
      .to(curInfo, { xPercent: -25, autoAlpha: 0, duration: 0.45 }, '<')
      // svjetlosni impuls prelazi ekranom
      .fromTo(
        pulse,
        { autoAlpha: 0, left: '-30%' },
        { autoAlpha: 1, left: '110%', duration: 0.5, ease: 'power1.inOut' },
        '<0.1'
      )
      .to(pulse, { autoAlpha: 0, duration: 0.1 }, '>')
      // ulaz idućeg projekta iz suprotnog smjera
      .set(cur, { autoAlpha: 0 }, '>-0.1')
      .set(next, { autoAlpha: 1 }, '<')
      .fromTo(
        nextBrowser,
        { rotateY: 42, xPercent: 60, z: -300, autoAlpha: 0 },
        { rotateY: -12, xPercent: 0, z: 0, autoAlpha: 1, duration: 0.55 },
        '<'
      )
      .fromTo(
        nextInfo,
        { clipPath: 'inset(0 100% 0 0)', autoAlpha: 0, xPercent: 20 },
        { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, xPercent: 0, duration: 0.5 },
        '<0.05'
      );
  }
}
