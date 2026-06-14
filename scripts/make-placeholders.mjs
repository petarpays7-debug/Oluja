// Generira dizajnirane placeholder WebP slike za projekte.
// Korisno kad capture-projects ne može doći do mreže.
// Pokretanje: npm run placeholders
// NAPOMENA: ne prepisuje postojeće prave screenshotove osim s --force.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, access } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'assets', 'projects');
const FORCE = process.argv.includes('--force');

const PROJECTS = {
  doors: { label: 'DOORS INTERIJERI', accent: '#b9885f' },
  bimmer: { label: 'AUTO CENTAR BIMMER', accent: '#3478ff' }
};

const VARIANTS = {
  desktop: [1440, 900],
  wide: [1920, 1080],
  detail: [800, 600],
  full: [1440, 2400],
  mobile: [390, 844],
  tablet: [768, 1024]
};

function svg(w, h, label, kind, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#090A0D"/>
    <g stroke="rgba(244,244,241,0.05)">
      ${Array.from({ length: Math.ceil(w / 64) }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="${h}"/>`).join('')}
      ${Array.from({ length: Math.ceil(h / 64) }, (_, i) => `<line x1="0" y1="${i * 64}" x2="${w}" y2="${i * 64}"/>`).join('')}
    </g>
    <circle cx="${w / 2}" cy="${h / 2 - 40}" r="34" fill="none" stroke="${accent}" stroke-width="2"/>
    <text x="${w / 2}" y="${h / 2 + 40}" fill="#F4F4F1" font-family="sans-serif" font-size="${Math.max(20, w / 36)}" font-weight="700" text-anchor="middle" letter-spacing="4">${label}</text>
    <text x="${w / 2}" y="${h / 2 + 80}" fill="#90939A" font-family="sans-serif" font-size="${Math.max(12, w / 70)}" text-anchor="middle" letter-spacing="6">${kind.toUpperCase()} · PLACEHOLDER</text>
  </svg>`;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let made = 0;
  for (const [key, { label, accent }] of Object.entries(PROJECTS)) {
    for (const [kind, [w, h]] of Object.entries(VARIANTS)) {
      const out = join(OUT_DIR, `${key}-${kind}.webp`);
      if (!FORCE && (await exists(out))) continue;
      await sharp(Buffer.from(svg(w, h, label, kind, accent)))
        .webp({ quality: 80 })
        .toFile(out);
      made++;
      console.log('  +', `${key}-${kind}.webp`);
    }
  }
  console.log(made ? `\n✓ Generirano ${made} placeholdera.` : '\nSvi screenshotovi već postoje (koristi --force za prepisivanje).');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
