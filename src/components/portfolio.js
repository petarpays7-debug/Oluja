import { PROJECTS } from '../config.js';
import { hydrateMedia } from '../utils/media.js';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../utils/performance.js';

export function buildPortfolio() {
  const wrap = document.getElementById('portfolio-panels');
  if (!wrap) return;

  PROJECTS.forEach((p, i) => {
    const panel = document.createElement('article');
    panel.className = 'pf-panel' + (i === 0 ? ' is-active' : '');
    panel.dataset.cursor = p.cursor;
    panel.dataset.index = String(i);
    panel.innerHTML = `
      <div class="pf-panel__info">
        <span class="pf-panel__index">${p.index} / ODABRANI PROJEKT</span>
        <h3 class="pf-panel__title">${p.title}</h3>
        <p class="pf-panel__cat">${p.category}</p>
        <p class="pf-panel__desc">${p.description}</p>
        <p class="pf-panel__detail">${p.detail}</p>
        <ul class="pf-panel__caps">
          ${p.capabilities.map((c) => `<li>${c}</li>`).join('')}
        </ul>
        ${
          (p.solved && p.solved.length)
            ? `<div class="pf-panel__solved">
          <span class="pf-panel__solved-label">ŠTO JE OVAJ PROJEKT RIJEŠIO</span>
          <ul>
            ${p.solved.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </div>`
            : ''
        }
        <a class="btn btn--primary pf-panel__cta" href="${p.url}"
           target="_blank" rel="noopener noreferrer"
           data-project-link data-project-title="${p.title}" data-magnetic>
          <span>OTVORI PROJEKT</span>
        </a>
      </div>
      <div class="pf-panel__visual">
        <div class="pf-detail">
          <div class="browser__screen">
            <img alt="${p.title} — detalj" data-asset="${p.assets.detail}" loading="lazy" decoding="async" width="600" height="450" />
          </div>
        </div>
        <div class="pf-browser">
          <div class="browser__bar">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="browser__url">${p.url.replace('https://', '')}</span>
          </div>
          <div class="pf-browser__screen">
            <img alt="${p.title} — naslovna stranica" data-asset="${p.assets.desktop}" loading="lazy" decoding="async" width="1440" height="900" />
          </div>
        </div>
        <div class="pf-phone">
          <div class="phone__screen">
            <img alt="${p.title} — mobilni prikaz" data-asset="${p.assets.mobile}" loading="lazy" decoding="async" width="390" height="844" />
          </div>
        </div>
      </div>
    `;
    wrap.appendChild(panel);
  });

  hydrateMedia(wrap);
  initProjectLinks();
}

// Cinematic page transition prije otvaranja projekta u novoj kartici:
// zoom browsera -> tamni overlay -> naziv u sredini -> otvaranje (~400ms).
function initProjectLinks() {
  const wipe = document.getElementById('page-wipe');
  const wipeLabel = document.getElementById('page-wipe-label');
  let busy = false;

  document.querySelectorAll('[data-project-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (prefersReducedMotion() || !wipe) return; // pusti default ponašanje
      e.preventDefault();
      if (busy) return;
      busy = true;

      const url = link.getAttribute('href');
      const title = link.dataset.projectTitle || '';
      const browser = link.closest('.pf-panel')?.querySelector('.pf-browser');

      wipeLabel.textContent = title;
      wipe.classList.add('is-active');

      const tl = gsap.timeline({
        onComplete: () => {
          window.open(url, '_blank', 'noopener,noreferrer');
          gsap.to(wipe, {
            autoAlpha: 0,
            duration: 0.45,
            delay: 0.15,
            ease: 'power2.out',
            onComplete: () => {
              wipe.classList.remove('is-active');
              gsap.set(wipe, { autoAlpha: 1, scaleY: 0, transformOrigin: 'bottom' });
              gsap.set(wipeLabel, { opacity: 0, y: 14 });
              if (browser) gsap.set(browser, { clearProps: 'scale' });
              busy = false;
            }
          });
        }
      });

      if (browser) {
        tl.to(browser, { scale: 1.06, duration: 0.4, ease: 'power2.out' }, 0);
      }
      tl.to(wipe, { scaleY: 1, duration: 0.4, ease: 'power3.inOut' }, 0).fromTo(
        wipeLabel,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' },
        0.12
      );
    });
  });
}
