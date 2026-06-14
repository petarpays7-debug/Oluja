// Generira OG/social placeholder sliku u public/og-image-placeholder.webp
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const w = 1200;
const h = 630;

const lines = Array.from(
  { length: Math.ceil(w / 64) },
  (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="${h}"/>`
).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#050505"/>
  <g stroke="rgba(244,244,241,0.05)">${lines}</g>
  <radialGradient id="g" cx="70%" cy="40%" r="60%">
    <stop offset="0%" stop-color="rgba(52,120,255,0.25)"/>
    <stop offset="100%" stop-color="rgba(52,120,255,0)"/>
  </radialGradient>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <path d="M470 400 L600 205 L730 400" fill="none" stroke="#3478FF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="600" y="500" fill="#F4F4F1" font-family="sans-serif" font-size="96" font-weight="700" text-anchor="middle" letter-spacing="12">OLUJA</text>
  <text x="600" y="552" fill="#90939A" font-family="sans-serif" font-size="26" text-anchor="middle" letter-spacing="14">DIGITALNI STUDIO</text>
</svg>`;

await sharp(Buffer.from(svg))
  .webp({ quality: 88 })
  .toFile(join(__dirname, '..', 'public', 'og-image-placeholder.webp'));
console.log('✓ og-image-placeholder.webp');
