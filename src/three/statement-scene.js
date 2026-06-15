import * as THREE from 'three';

/**
 * OLUJA STUDIO — cinematic "digital sculpture" reveal for the statement section.
 *
 * A black-glass / dark-chrome crystalline flower grows from a small bud into a
 * full radial bloom of iridescent blades, ignites a luminous violet core, and
 * releases into a volumetric powder-nebula that bridges into the next section.
 *
 * Driven entirely by scroll progress (0..1) via setProgress(); the scene lerps
 * internally toward the target for cinematic inertia, so forward / reverse /
 * refresh-in-place all resolve to the same deterministic state.
 *
 * Transparent canvas (the section background stays pure black behind it) so the
 * decorative giant typography can sit *behind* the glass. Glow comes from
 * additive sprites + additive GPU particles — no postprocessing passes, which
 * keeps transparency intact and the cost low.
 */
export function createStatementScene(canvas, { mobile = false } = {}) {
  const scene = new THREE.Scene();

  const CAM_Z = 6.6;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !mobile,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.85);
  renderer.setPixelRatio(DPR);

  const root = new THREE.Group();
  scene.add(root);

  // ===================== ENVIRONMENT (reflections) =====================
  // Procedural equirect studio: dark navy with a few soft cold/violet lights.
  const envTex = (() => {
    const w = 512;
    const h = 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#05070f');
    base.addColorStop(0.5, '#0a0e1c');
    base.addColorStop(1, '#020308');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const blob = (x, y, r, col) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    };
    blob(w * 0.26, h * 0.30, 150, 'rgba(175,205,255,1)');    // cool key
    blob(w * 0.74, h * 0.28, 140, 'rgba(245,250,255,1)');    // white rim
    blob(w * 0.52, h * 0.74, 140, 'rgba(170,125,255,0.8)');  // violet fill
    blob(w * 0.07, h * 0.60, 100, 'rgba(110,165,255,0.8)');  // blue edge
    blob(w * 0.92, h * 0.66, 90, 'rgba(150,200,255,0.7)');
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  pmrem.dispose();
  envTex.dispose();

  // ===================== LIGHTS =====================
  scene.add(new THREE.AmbientLight(0x283044, 0.8));
  const key = new THREE.PointLight(0xcfe0ff, 26, 40);
  key.position.set(4, 5, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0x7a5cff, 20, 40);
  rim.position.set(-5, -2, 3);
  scene.add(rim);
  const fill = new THREE.PointLight(0xbcd0ff, 14, 40);
  fill.position.set(0, -4, 5);
  scene.add(fill);
  const coreLight = new THREE.PointLight(0x9a5cff, 0, 18);
  coreLight.position.set(0, 0, 0.5);
  scene.add(coreLight);

  // ===================== GLASS BLADES (instanced) =====================
  const N = mobile ? 54 : 112;

  // One faceted "thorn" blade along +Y, base at origin, tip at y=1.
  const bladeGeo = (() => {
    const profile = [
      [0.004, 0.0],
      [0.05, 0.06],
      [0.078, 0.18],
      [0.062, 0.42],
      [0.036, 0.7],
      [0.014, 0.9],
      [0.0, 1.0]
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(profile, 6); // 6 facets → crystalline
    g.computeVertexNormals();
    return g;
  })();

  const bladeMat = new THREE.MeshPhysicalMaterial({
    color: 0x070912,
    metalness: 0.9,
    roughness: 0.11,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    iridescence: 1.0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [140, 880],
    envMapIntensity: 2.3,
    flatShading: true
  });

  const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, N);
  blades.frustumCulled = false;
  blades.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(blades);

  // Per-blade static params (direction, length, thickness, stagger, roll).
  const UP = new THREE.Vector3(0, 1, 0);
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const bladeData = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2; // 1..-1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLD;
    const dir = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    // random roll about the blade axis for facet variation
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2));
    bladeData.push({
      dir,
      quat,
      len: (mobile ? 1.7 : 2.3) * (0.72 + Math.random() * 0.5),
      thick: 0.62 + Math.random() * 0.8,
      stagger: Math.random(),
      curl: (Math.random() - 0.5) * 0.5
    });
  }
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _twist = new THREE.Quaternion();

  function updateBlades(bloom, spin, fade) {
    for (let i = 0; i < N; i++) {
      const b = bladeData[i];
      // staggered unfold for an organic bloom
      const bb = THREE.MathUtils.clamp((bloom - b.stagger * 0.28) / 0.72, 0, 1);
      const eased = bb * bb * (3 - 2 * bb); // smoothstep
      const len = THREE.MathUtils.lerp(0.2, b.len, eased) * (1 - fade * 0.25);
      const thick = THREE.MathUtils.lerp(0.55, b.thick, eased) * (1 - fade * 0.3);
      // gentle blade-axis twist that increases as it opens (adds motion/life)
      _twist.setFromAxisAngle(b.dir, b.curl * eased + spin * 0.15);
      _q.copy(_twist).multiply(b.quat);
      // base pushes very slightly outward as it blooms
      _p.copy(b.dir).multiplyScalar(0.12 * eased);
      _s.set(thick, len, thick);
      _m.compose(_p, _q, _s);
      blades.setMatrixAt(i, _m);
    }
    blades.instanceMatrix.needsUpdate = true;
    bladeMat.opacity = 1 - fade;
    bladeMat.transparent = fade > 0.001;
  }

  // ===================== LUMINOUS CORE =====================
  const coreGeo = new THREE.IcosahedronGeometry(0.16, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x14081f,
    emissive: 0x7a3cff,
    emissiveIntensity: 0.0,
    metalness: 0.2,
    roughness: 0.4
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  root.add(core);

  // Additive radial sprite for soft glow (replaces postprocessing bloom).
  const glowTex = (() => {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.18, 'rgba(214,170,255,0.9)');
    rg.addColorStop(0.5, 'rgba(150,90,255,0.35)');
    rg.addColorStop(1, 'rgba(80,40,160,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const makeGlow = (scale, opacity) => {
    const m = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      opacity
    });
    const sp = new THREE.Sprite(m);
    sp.scale.setScalar(scale);
    root.add(sp);
    return sp;
  };
  const coreGlow = makeGlow(1.2, 0); // tight core glow
  const auraGlow = makeGlow(5.0, 0); // wide release aura

  // ===================== RELEASE PARTICLES =====================
  const PCOUNT = mobile ? 900 : 2600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PCOUNT * 3); // origin (filled in shader from aDir)
  const aDir = new Float32Array(PCOUNT * 3);
  const aSpeed = new Float32Array(PCOUNT);
  const aSeed = new Float32Array(PCOUNT);
  for (let i = 0; i < PCOUNT; i++) {
    // biased outward direction with a flatter, petal-like spread
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    aDir[i * 3] = Math.cos(t) * r;
    aDir[i * 3 + 1] = u * 0.7;
    aDir[i * 3 + 2] = Math.sin(t) * r;
    aSpeed[i] = 0.5 + Math.random() * 1.0;
    aSeed[i] = Math.random();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aDir', new THREE.BufferAttribute(aDir, 3));
  pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));

  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uRelease: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: (mobile ? 26 : 34) * DPR },
      uMaxR: { value: mobile ? 3.2 : 4.4 }
    },
    vertexShader: /* glsl */ `
      attribute vec3 aDir;
      attribute float aSpeed;
      attribute float aSeed;
      uniform float uRelease;
      uniform float uTime;
      uniform float uSize;
      uniform float uMaxR;
      varying float vAlpha;
      varying float vSeed;
      void main(){
        vSeed = aSeed;
        float rel = clamp(uRelease, 0.0, 1.0);
        float reach = rel * (0.55 + aSpeed) * uMaxR;
        vec3 p = aDir * reach;
        // gentle turbulence so the cloud feels volumetric, not radial spokes
        float tw = uTime * 0.6 + aSeed * 6.2831;
        p += vec3(sin(tw), cos(tw * 1.3), sin(tw * 0.7)) * 0.18 * rel;
        // fade in fast, then dissipate toward the end
        float fin = smoothstep(0.0, 0.12, rel);
        float fout = 1.0 - smoothstep(0.62, 1.0, rel);
        vAlpha = fin * fout;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.4 + aSeed) * (1.0 - rel * 0.35) / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vSeed;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        float soft = smoothstep(0.5, 0.0, r);
        if(soft < 0.01) discard;
        // violet core → magenta → cold white sparkle
        vec3 col = mix(vec3(0.55,0.28,1.0), vec3(0.95,0.55,1.0), vSeed);
        col = mix(col, vec3(1.0,0.95,1.0), pow(soft, 3.0) * 0.6);
        gl_FragColor = vec4(col, soft * vAlpha * 0.9);
      }
    `
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  root.add(particles);

  // ===================== PROGRESS / STATE =====================
  let pTarget = 0;
  let pSmooth = 0;
  const sub = (a, b, x) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  const ss = (x) => x * x * (3 - 2 * x);

  function applyProgress(p) {
    const bloom = ss(sub(0.05, 0.6, p));
    const coreAmt = ss(sub(0.46, 0.74, p));
    const release = sub(0.7, 0.98, p);
    const fade = ss(sub(0.9, 1.0, p));

    updateBlades(bloom, p * 1.4, fade);

    // core — fully extinguishes by the end for a clean dark handoff
    const cs = THREE.MathUtils.lerp(0.12, 1.25, coreAmt) * (1 + release * 0.6) * (1 - fade * 0.8);
    core.scale.setScalar(cs);
    coreMat.emissiveIntensity = coreAmt * 3.2 * (1 - fade);
    coreLight.intensity = coreAmt * 22 * (1 - fade);

    coreGlow.scale.setScalar(THREE.MathUtils.lerp(0.6, 2.0, coreAmt) * (1 + release));
    coreGlow.material.opacity = Math.max(coreAmt * 0.7, release * 0.5) * (1 - fade);

    auraGlow.scale.setScalar(THREE.MathUtils.lerp(3.5, 9.0, release));
    auraGlow.material.opacity = release * (1 - smoothstep01(release)) * 0.5;

    pMat.uniforms.uRelease.value = release;

    // subtle camera push-in through growth, easing back at the very end
    camera.position.z = THREE.MathUtils.lerp(CAM_Z, 5.3, ss(sub(0, 0.7, p))) + fade * 0.6;
  }
  function smoothstep01(x) {
    const c = THREE.MathUtils.clamp(x, 0, 1);
    return c * c * (3 - 2 * c);
  }

  // ===================== LAYOUT =====================
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  // ===================== RENDER LOOP =====================
  let raf = null;
  let running = false;
  let last = performance.now();

  function frame() {
    if (!running) return;
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    // inertial easing toward scroll target for cinematic smoothness
    pSmooth += (pTarget - pSmooth) * Math.min(1, dt * 6);
    pMat.uniforms.uTime.value += dt;

    // slow idle rotation + bloom-linked spin
    root.rotation.y += dt * 0.12;
    root.rotation.x = Math.sin(pMat.uniforms.uTime.value * 0.2) * 0.05;

    applyProgress(pSmooth);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function dispose() {
    stop();
    bladeGeo.dispose();
    bladeMat.dispose();
    blades.dispose();
    coreGeo.dispose();
    coreMat.dispose();
    glowTex.dispose();
    coreGlow.material.dispose();
    auraGlow.material.dispose();
    pGeo.dispose();
    pMat.dispose();
    envRT.texture.dispose();
    renderer.dispose();
  }

  return {
    start,
    stop,
    resize,
    dispose,
    setProgress: (p) => {
      pTarget = THREE.MathUtils.clamp(p, 0, 1);
    },
    // Dev/QA: jump straight to a state without inertia.
    setProgressImmediate: (p) => {
      pTarget = pSmooth = THREE.MathUtils.clamp(p, 0, 1);
      applyProgress(pSmooth);
    },
    // Dev/QA: render a single frame synchronously (for headless inspection
    // when rAF is throttled, e.g. a hidden tab).
    renderFrame: () => {
      applyProgress(pSmooth);
      renderer.render(scene, camera);
    }
  };
}
