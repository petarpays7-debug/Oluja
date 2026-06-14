// Lokalno snimanje screenshotova javnih projektnih stranica.
// Pokretanje: npm run capture-projects
//
// Zahtjeva Playwright browsere: npx playwright install chromium
// Snima u src/assets/projects/ kao optimizirani WebP (preko sharp).
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'assets', 'projects');

const PROJECTS = [
  { key: 'doors', url: 'https://doorsinterijeri-bgb.pages.dev' },
  { key: 'bimmer', url: 'https://auto-centar-bimmer.pages.dev' }
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  wide: { width: 1920, height: 1080 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 }
};

const QUALITY = 85;

async function toWebp(buffer, outPath) {
  await sharp(buffer).webp({ quality: QUALITY }).toFile(outPath);
}

// Učitavanje + smirivanje, BEZ skrolanja (čuva pravi hero na vrhu).
// Ne forsiramo reduced-motion jer neke stranice (Doors) tek intro animacijom
// otkrivaju sadržaj — pričekamo da intro/splash završi.
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3500);
  for (const sel of ['[aria-label*="close" i]', 'button:has-text("Prihvati")', 'button:has-text("Slažem")']) {
    const el = await page.$(sel);
    if (el) await el.click().catch(() => {});
  }
}

// Skrolanje radi lazy-load slika (poziva se tek nakon hero snimke).
async function lazyScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        y += window.innerHeight;
        window.scrollTo(0, y);
        if (y < document.body.scrollHeight) setTimeout(step, 120);
        else resolve();
      };
      step();
    });
  });
  await page.waitForTimeout(600);
}

async function captureProject(browser, { key, url }) {
  const results = [];
  const log = (m) => console.log(`  [${key}] ${m}`);

  // --- desktop: hero + detail + full ---
  const ctxDesktop = await browser.newContext({ viewport: VIEWPORTS.desktop, deviceScaleFactor: 1 });
  const page = await ctxDesktop.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);

    // HERO prvo — prije bilo kakvog skrolanja (čuva vrh stranice)
    log('hero (1440×1000)');
    await toWebp(await page.screenshot(), join(OUT_DIR, `${key}-desktop.webp`));
    results.push(`${key}-desktop.webp`);

    // lazy-load + detail donje sekcije
    await lazyScroll(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
    await page.waitForTimeout(700);
    log('detail (donja sekcija)');
    await toWebp(await page.screenshot(), join(OUT_DIR, `${key}-detail.webp`));
    results.push(`${key}-detail.webp`);

    log('full-page (rezerva)');
    await toWebp(await page.screenshot({ fullPage: true }), join(OUT_DIR, `${key}-full.webp`));
    results.push(`${key}-full.webp`);
  } catch (e) {
    log(`GREŠKA desktop: ${e.message}`);
  } finally {
    await ctxDesktop.close();
  }

  // --- wide hero ---
  await captureHero(browser, key, url, 'wide', `${key}-wide.webp`, results, log);
  // --- mobile hero ---
  await captureHero(browser, key, url, 'mobile', `${key}-mobile.webp`, results, log, true);
  // --- tablet hero (bonus) ---
  await captureHero(browser, key, url, 'tablet', `${key}-tablet.webp`, results, log, true);

  return results;
}

async function captureHero(browser, key, url, vpName, outFile, results, log, isMobile = false) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[vpName],
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    log(`hero (${VIEWPORTS[vpName].width}×${VIEWPORTS[vpName].height})`);
    await toWebp(await page.screenshot(), join(OUT_DIR, outFile));
    results.push(outFile);
  } catch (e) {
    log(`GREŠKA ${vpName}: ${e.message}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error('\n✗ Playwright browser nije dostupan.');
    console.error('  Pokreni:  npx playwright install chromium');
    console.error('  Detalji:', e.message, '\n');
    process.exitCode = 1;
    return;
  }

  console.log('Snimanje projektnih screenshotova...\n');
  const all = [];
  for (const project of PROJECTS) {
    console.log(`▸ ${project.key} — ${project.url}`);
    const r = await captureProject(browser, project);
    all.push(...r);
  }
  await browser.close();

  console.log('\n✓ Gotovo. Spremljeno u src/assets/projects/:');
  all.forEach((f) => console.log('  -', f));
  if (all.length === 0) {
    console.log('  (ništa snimljeno — provjeri internet vezu i Playwright instalaciju)');
  }
}

main().catch((e) => {
  console.error('Neočekivana greška:', e);
  process.exitCode = 1;
});
