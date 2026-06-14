import { gsap } from 'gsap';
import { prefersReducedMotion } from '../utils/performance.js';

const SESSION_KEY = 'oluja_seen';

// Kratki premium preloader. Prikazuje se jednom po sesiji.
// Vraća Promise koji se resolva kad je hero spreman za animaciju.
export function runLoader() {
  const el = document.getElementById('preloader');
  if (!el) return Promise.resolve();

  const finish = () => {
    el.classList.add('is-done');
    el.style.display = 'none';
  };

  if (prefersReducedMotion()) {
    finish();
    return Promise.resolve();
  }

  const seen = sessionStorage.getItem(SESSION_KEY);
  const logo = el.querySelector('.preloader__logo');
  const sub = el.querySelector('.preloader__sub');
  const pulse = el.querySelector('.preloader__pulse');
  const wipe = el.querySelector('.preloader__wipe');

  // Ponovni posjet: vrlo kratki fade.
  if (seen) {
    return new Promise((resolve) => {
      gsap.to(el, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => {
          finish();
          resolve();
        }
      });
    });
  }

  sessionStorage.setItem(SESSION_KEY, '1');

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        finish();
        resolve();
      }
    });

    tl.fromTo(
      logo,
      { opacity: 0, scale: 0.96, filter: 'blur(6px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.45, ease: 'power3.out' }
    )
      .to(sub, { opacity: 1, duration: 0.3 }, '-=0.1')
      // slova kratko u dubinu
      .to(logo, { letterSpacing: '0.12em', duration: 0.25, ease: 'power2.inOut' }, '-=0.1')
      // plavi električni impuls
      .fromTo(
        pulse,
        { opacity: 0, left: '-10%' },
        { opacity: 1, left: '110%', duration: 0.45, ease: 'power2.inOut' },
        '-=0.2'
      )
      .to(pulse, { opacity: 0, duration: 0.15 }, '-=0.1')
      // vertikalni wipe
      .to(wipe, { scaleY: 1, duration: 0.4, ease: 'power3.inOut' }, '-=0.05')
      .set(el, { autoAlpha: 0 });
  });
}
