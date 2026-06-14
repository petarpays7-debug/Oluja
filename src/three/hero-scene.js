import * as THREE from 'three';
import { rafThrottle, lerp } from '../utils/performance.js';

// Suptilan particle field iza hero teksta. Lagan, capped DPR, pauzira na blur.
export function initHeroScene(canvas) {
  if (!canvas) return () => {};

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // Particles
  const COUNT = 900;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x72a4ff,
    size: 0.045,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // jedan svjetlosni "impuls" — tanka ravnina koja prolazi
  const pulseGeo = new THREE.PlaneGeometry(0.06, 22);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0x3478ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending
  });
  const pulse = new THREE.Mesh(pulseGeo, pulseMat);
  pulse.position.x = -16;
  scene.add(pulse);

  let mx = 0;
  let my = 0;
  let cxr = 0;
  let cyr = 0;
  const onMove = rafThrottle((e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('mousemove', onMove, { passive: true });

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const w = r.width || canvas.clientWidth || 1;
    const h = r.height || canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let raf;
  let running = true;
  let t = 0;
  const animate = () => {
    if (!running) return;
    t += 0.005;
    cxr = lerp(cxr, mx, 0.04);
    cyr = lerp(cyr, my, 0.04);

    points.rotation.y = t * 0.4 + cxr * 0.25;
    points.rotation.x = cyr * 0.18;

    // impuls prelazi scenom periodički
    pulse.position.x += 0.12;
    pulseMat.opacity = Math.max(0, 0.5 - Math.abs(pulse.position.x) / 16);
    if (pulse.position.x > 16) pulse.position.x = -16;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  const onVisibility = () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      animate();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // dispose
  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    geometry.dispose();
    material.dispose();
    pulseGeo.dispose();
    pulseMat.dispose();
    renderer.dispose();
  };
}
