export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouch = () =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches;

export const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

// Gruba procjena slabog uređaja — koristi se za gašenje WebGL-a.
export function isLowPower() {
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  return mem <= 4 || cores <= 4;
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// Treba li uopće pokretati tešku WebGL/mouse grafiku.
export function canRunHeavyMotion() {
  return (
    !prefersReducedMotion() &&
    !isTouch() &&
    !isMobile() &&
    !isLowPower() &&
    supportsWebGL()
  );
}

// Pauzira callback dok je tab neaktivan.
export function onVisibilityChange(onHide, onShow) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onHide?.();
    else onShow?.();
  });
}

// rAF-throttled handler za mousemove i slično.
export function rafThrottle(fn) {
  let ticking = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      fn(...lastArgs);
      ticking = false;
    });
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
