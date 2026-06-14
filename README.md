# OLUJA — Digitalni studio

Premium prezentacijska web stranica za digitalni studio **OLUJA**.
Vanilla JS + Vite, GSAP / ScrollTrigger, Lenis smooth scroll, opcionalni Three.js
particle field, custom cursor i CSS 3D portfolio kompozicija.

---

## 1. Instalacija

```bash
npm install
```

## 2. Development server

```bash
npm run dev
```

Otvara se na `http://localhost:5173`.

## 3. Production build

```bash
npm run build
```

Rezultat je u mapi `dist/`. Pregled builda:

```bash
npm run preview
```

## 4. Objava na Cloudflare Pages

- **Build command:** `npm run build`
- **Output directory:** `dist`
- Framework preset: *None / Vite*

Screenshotovi se commitaju u repozitorij (u `src/assets/projects/`) i ne snimaju
se tijekom builda.

## 5. Screenshot capture skripta

Snima prave screenshotove javnih projektnih stranica:

```bash
# jednom, za Playwright browser:
npx playwright install chromium

npm run capture-projects
```

Ako mreža ili Playwright nisu dostupni, generiraj dizajnirane placeholdere:

```bash
npm run placeholders          # popunjava samo ono što nedostaje
npm run placeholders -- --force   # prepisuje sve
```

## 6. Gdje se nalaze projektne slike

`src/assets/projects/`. Imenovanje:

```
doors-desktop.webp   bimmer-desktop.webp
doors-wide.webp      bimmer-wide.webp
doors-mobile.webp    bimmer-mobile.webp
doors-detail.webp    bimmer-detail.webp
doors-full.webp      bimmer-full.webp
doors-tablet.webp    bimmer-tablet.webp   (bonus)
```

Slike se učitavaju automatski preko `import.meta.glob` u
`src/utils/media.js`. Ako neka slika nedostaje, prikazuje se dizajnirani
placeholder (bez broken-image ikona).

## 7. Ponovno snimanje screenshotova

```bash
npm run capture-projects
```

Prepisuje postojeće datoteke novim snimkama.

## 8. Kontaktni podaci

Sve na jednom mjestu: `src/config.js` → `SITE_CONFIG.company`
(`email`, `address`, `oib`, `registrationNumber`, `founded`, `activity`).
Footer i schema.org podaci pune se automatski iz toga.

## 9. Dodavanje broja telefona

U `src/config.js` postavi `company.phone` na npr. `'+385 91 234 5678'`.
Prazan string znači da se telefon **nigdje ne prikazuje** (footer ga doda
automatski tek kad je popunjen). Po želji ga dodaj i u schema.org blok u
`index.html` (`telephone`).

## 10. URL-ovi projekata

`src/config.js` → `SITE_CONFIG.projects` i polje `PROJECTS` (svaki `url`).

## 11. Boje

`src/style.css`, na vrhu u `:root` (CSS varijable: `--bg`, `--blue`,
`--text` …).

## 12. Isključivanje Three.js

Three.js se učitava dinamički i samo kad uređaj nije touch/slab/reduced-motion
(vidi `canRunHeavyMotion()` u `src/utils/performance.js`). Za potpuno
isključivanje zakomentiraj poziv `loadThree()` u `src/main.js`. Stranica i
dalje radi (CSS grid + glow u herou).

## 13. Testiranje reduced motion

- **Windows:** Postavke → Pristupačnost → Vizualni efekti → isključi animacije.
- **Chrome DevTools:** Rendering panel → *Emulate CSS prefers-reduced-motion*.

U reduced-motion načinu nema preloadera, smooth scrolla, custom cursora,
Three.js scene ni scroll-scrub rotacija — sav sadržaj je odmah vidljiv.

## 14. Dodavanje novog projekta (npr. Nemo Transporti)

1. Snimi/dodaj slike u `src/assets/projects/`:
   `nemo-desktop.webp`, `nemo-mobile.webp`, `nemo-detail.webp` (+ ostalo).
2. U `src/config.js`:
   - Dodaj u `SITE_CONFIG.projects.nemo = { title, url }`.
   - Dodaj novi objekt u polje `PROJECTS` (s `index: '03'`, `assets`, `cursor`,
     `capabilities` i `solved` — lista „što je projekt riješio”). Polje `solved`
     je opcionalno; ako ga izostaviš, blok se jednostavno ne prikazuje.
3. (Opcionalno) dodaj `nemo` u `scripts/capture-projects.mjs` (`PROJECTS` polje)
   za automatsko snimanje.

Portfolio sekcija i scroll-prijelaz automatski se prilagođavaju broju projekata.

> Nemo Transporti trenutno **nije** prikazan na stranici — dodaje se gornjim
> koracima tek kad projekt bude gotov.

## 15. Optimizacija novih slika

Capture skripta već sprema WebP (kvaliteta 85) preko `sharp`. Za ručne slike:

```bash
npx sharp-cli --input slika.png --output slika.webp --format webp -q 85
```

ili kroz bilo koji WebP/AVIF alat; ciljana kvaliteta 80–88, širina prema
prikazu (desktop ~1440px, mobile ~390–780px).

---

## Struktura projekta

```
index.html
vite.config.js
src/
  main.js · style.css · config.js
  components/  navigation · cursor · portfolio · contact · loader
  animations/  hero · scroll · portfolio · laboratory
  three/       hero-scene
  utils/       media · performance
  assets/projects/   (screenshotovi)
scripts/
  capture-projects.mjs · make-placeholders.mjs
public/
  favicon.svg · robots.txt · sitemap.xml · og-image-placeholder.webp
```
