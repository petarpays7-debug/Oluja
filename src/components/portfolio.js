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

// Page transition prije otvaranja projekta u novoj kartici.
function initProjectLinks() {
  const wipe = document.getElementById('page-wipe');
  const wipeLabel = document.getElementById('page-wipe-label');

  document.querySelectorAll('[data-project-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (prefersReducedMotion() || !wipe) return; // pusti default ponašanje
      e.preventDefault();
      const url = link.getAttribute('href');
      const title = link.dataset.projectTitle || '';
      wipeLabel.textContent = title;
      wipe.classList.add('is-active');

      const tl = gsap.timeline({
        onComplete: () => {
          window.open(url, '_blank', 'noopener,noreferrer');
          gsap.to(wipe, {
            scaleY: 0,
            transformOrigin: 'top',
            duration: 0.4,
            delay: 0.1,
            ease: 'power3.inOut',
            onComplete: () => {
              wipe.classList.remove('is-active');
              gsap.set(wipe, { scaleY: 0, transformOrigin: 'bottom' });
              gsap.set(wipeLabel, { opacity: 0 });
            }
          });
        }
      });
      tl.to(wipe, { scaleY: 1, duration: 0.4, ease: 'power3.inOut' }).to(
        wipeLabel,
        { opacity: 1, duration: 0.2 },
        '-=0.2'
      );
    });
  });
}
