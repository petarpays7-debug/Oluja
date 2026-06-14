import { NAV_LINKS } from '../config.js';

export function initNavigation() {
  const nav = document.getElementById('nav');
  const navList = document.getElementById('nav-list');
  const mobileList = document.getElementById('mobile-menu-list');
  const footerNav = document.getElementById('footer-nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-menu-close');

  // --- render linkova iz configa ---
  NAV_LINKS.forEach((link, i) => {
    navList.insertAdjacentHTML(
      'beforeend',
      `<li><a href="${link.target}" data-nav>${link.label}</a></li>`
    );
    mobileList.insertAdjacentHTML(
      'beforeend',
      `<li><a href="${link.target}" style="--i:${i}"><span class="num">${link.n}</span>${link.label}</a></li>`
    );
    footerNav.insertAdjacentHTML(
      'beforeend',
      `<li><a href="${link.target}">${link.label}</a></li>`
    );
  });

  // --- scroll state ---
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    // u vrhu (hero) nijedna stavka nije aktivna
    if (window.scrollY < window.innerHeight * 0.4) {
      navList.querySelectorAll('a.is-active').forEach((a) => {
        a.classList.remove('is-active');
        a.removeAttribute('aria-current');
      });
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // --- mobile menu ---
  const open = () => {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
  };
  const close = () => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  };

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });

  // --- active section highlight ---
  const sections = NAV_LINKS.map((l) => document.querySelector(l.target)).filter(Boolean);
  const navAnchors = [...navList.querySelectorAll('a')];

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = '#' + entry.target.id;
            navAnchors.forEach((a) => {
              const on = a.getAttribute('href') === id;
              a.classList.toggle('is-active', on);
              if (on) a.setAttribute('aria-current', 'true');
              else a.removeAttribute('aria-current');
            });
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => io.observe(s));
  }
}
