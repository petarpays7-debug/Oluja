// Učitava sve dostupne projektne screenshotove iz assets/projects.
// Nedostajuće slike se gracefully zamjenjuju dizajniranim placeholderom.
const modules = import.meta.glob('../assets/projects/*.{webp,png,jpg,jpeg}', {
  eager: true,
  import: 'default'
});

const assetMap = {};
for (const path in modules) {
  const name = path.split('/').pop().replace(/\.\w+$/, '');
  assetMap[name] = modules[path];
}

export function resolveAsset(key) {
  return assetMap[key] || null;
}

const LABELS = {
  doors: 'DOORS INTERIJERI',
  bimmer: 'AUTO CENTAR BIMMER'
};

function placeholderFor(key) {
  const base = key.split('-')[0];
  const label = LABELS[base] || key.toUpperCase();
  const kind = key.split('-')[1] || '';
  return `${label}${kind ? ' · ' + kind.toUpperCase() : ''}`;
}

function applyPlaceholder(img) {
  const key = img.dataset.asset || '';
  const ph = document.createElement('div');
  ph.className = 'media-placeholder';
  ph.textContent = placeholderFor(key);
  img.replaceWith(ph);
}

// Resolva sve <img data-asset="..."> elemente na stranici.
export function hydrateMedia(root = document) {
  const imgs = root.querySelectorAll('img[data-asset]');
  imgs.forEach((img) => {
    const src = resolveAsset(img.dataset.asset);
    if (src) {
      img.addEventListener('error', () => applyPlaceholder(img), { once: true });
      img.src = src;
    } else {
      applyPlaceholder(img);
    }
  });
}
