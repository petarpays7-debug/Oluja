import * as THREE from 'three';

/**
 * OLUJA STUDIO — "THE STORM CORE"
 *
 * A closed dark-glass seed unfolds into a layered, glossy organic bloom of
 * curved petals, ignites a luminous violet core, then releases into a fine
 * volumetric particle nebula that bridges into the next section.
 *
 * Geometry is art-directed (not random spikes): 18 curved, cupped, tapering
 * glass membranes arranged in three tuned rings (inner / middle / outer) around
 * a dense dark core. Everything is driven by a single scroll progress value;
 * the scene eases toward it internally for cinematic inertia, so forward /
 * reverse / refresh all resolve to the same deterministic state.
 *
 * Transparent canvas over the black section; glow is additive (sprites +
 * GPU particles) so black depth stays black and the canvas stays see-through.
 */
export function createStatementScene(canvas, { mobile = false } = {}) {
  const scene = new THREE.Scene();

  const CAM_Z = 6.2;
  const CAM_Y = 2.1; // elevated 3/4 view — looks down into the radial bloom
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !mobile,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.85);
  renderer.setPixelRatio(DPR);

  const root = new THREE.Group();
  scene.add(root);
  const bloomGroup = new THREE.Group(); // petals + core (spins/tilts together)
  root.add(bloomGroup);

  // ===================== STUDIO ENVIRONMENT (reflections) =====================
  // Dark, directional — not flat. A few cool/violet light blobs the glass catches.
  const envTex = (() => {
    const w = 512, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#04060d');
    base.addColorStop(0.5, '#080b16');
    base.addColorStop(1, '#020308');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const blob = (x, y, r, col) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    };
    blob(w * 0.28, h * 0.24, 120, 'rgba(200,222,255,1)');  // narrow cool key
    blob(w * 0.70, h * 0.30, 150, 'rgba(120,165,255,0.8)'); // soft blue side
    blob(w * 0.50, h * 0.80, 130, 'rgba(150,110,255,0.6)'); // violet under-fill
    blob(w * 0.05, h * 0.55, 80, 'rgba(90,140,255,0.5)');
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

  // ===================== LIGHTING (product-shoot) =====================
  scene.add(new THREE.AmbientLight(0x1a2030, 0.55));
  const keyLight = new THREE.PointLight(0xcfe0ff, 22, 40);   // narrow cool rim
  keyLight.position.set(3.5, 5, 5.5);
  scene.add(keyLight);
  const sideLight = new THREE.PointLight(0x5e7cff, 16, 40);  // softer blue side
  sideLight.position.set(-5, -1, 3);
  scene.add(sideLight);
  const coreLight = new THREE.PointLight(0x9a5cff, 0, 16);   // violet, near core
  coreLight.position.set(0, 0, 0.6);
  scene.add(coreLight);

  // ===================== PETAL GEOMETRY =====================
  // A curved, cupped, tapering glass membrane. Base at origin, grows +Y, curls +Z.
  function makePetal({ L, W, bend, cup, taper }) {
    const segU = mobile ? 16 : 26;
    const segV = mobile ? 6 : 10;
    const pos = [];
    const idx = [];
    const R = bend > 0.001 ? L / bend : 0;
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      // arc spine in the Y-Z plane
      let sy, sz, ty, tz;
      if (bend > 0.001) {
        const a = bend * u;
        sy = R * Math.sin(a);
        sz = R * (1 - Math.cos(a));
        ty = Math.cos(a); tz = Math.sin(a);
      } else {
        sy = L * u; sz = 0; ty = 1; tz = 0;
      }
      // petal-normal in Y-Z (perpendicular to tangent)
      const nyv = -tz, nzv = ty;
      const halfW = W * Math.pow(1 - u, taper);
      for (let j = 0; j <= segV; j++) {
        const v = (j / segV) * 2 - 1; // -1..1 across width
        const x = v * halfW;
        const cupOff = cup * halfW * (v * v - 0.34); // cupped cross-section
        pos.push(x, sy + nyv * cupOff, sz + nzv * cupOff);
      }
    }
    for (let i = 0; i < segU; i++) {
      for (let j = 0; j < segV; j++) {
        const a = i * (segV + 1) + j;
        const b = a + (segV + 1);
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x070912,
    metalness: 0.55,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    iridescence: 0.5,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [120, 620],
    envMapIntensity: 1.9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1
  });

  // ── three tuned rings → 18 petals ──
  const RINGS = mobile
    ? [
        { count: 3, L: 0.95, W: 0.5, bend: 1.05, cup: 0.5, taper: 0.7, azim: 0.0, tiltMax: 0.5, start: 0.0 },
        { count: 4, L: 1.5, W: 0.62, bend: 0.9, cup: 0.45, taper: 0.7, azim: 0.4, tiltMax: 1.0, start: 0.18 },
        { count: 4, L: 2.0, W: 0.78, bend: 0.78, cup: 0.4, taper: 0.65, azim: 0.2, tiltMax: 1.4, start: 0.36 }
      ]
    : [
        { count: 4, L: 0.95, W: 0.46, bend: 1.15, cup: 0.52, taper: 0.72, azim: 0.0, tiltMax: 0.42, start: 0.0 },
        { count: 7, L: 1.45, W: 0.56, bend: 1.0, cup: 0.48, taper: 0.7, azim: 0.32, tiltMax: 0.86, start: 0.16 },
        { count: 7, L: 2.0, W: 0.72, bend: 0.92, cup: 0.42, taper: 0.66, azim: 0.16, tiltMax: 1.2, start: 0.34 }
      ];

  const petals = [];
  const geos = [];
  RINGS.forEach((ring, ri) => {
    const geo = makePetal(ring);
    geos.push(geo);
    for (let i = 0; i < ring.count; i++) {
      const mesh = new THREE.Mesh(geo, glassMat);
      mesh.frustumCulled = false;
      // deterministic, tuned variation (no reliance on randomness)
      const lenVar = 1 + 0.09 * Math.sin(ri * 2.1 + i * 1.7);
      const azim = ring.azim + (i / ring.count) * Math.PI * 2;
      bloomGroup.add(mesh);
      petals.push({
        mesh,
        azim,
        tiltMax: ring.tiltMax + 0.06 * Math.cos(i * 1.3 + ri),
        tiltClosed: -0.14, // tips converge inward when closed (a bud)
        lenVar,
        // staggered unfold: inner ring opens first
        start: ring.start + (i / ring.count) * 0.06,
        ri
      });
    }
  });

  // ===================== DARK CORE + EMISSIVE HEART =====================
  const coreShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.34, 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x05060d, metalness: 0.6, roughness: 0.25,
      clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.6,
      flatShading: false, transparent: true, opacity: 1
    })
  );
  bloomGroup.add(coreShell);

  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.26, 4),
    new THREE.MeshStandardMaterial({
      color: 0x1a0a2e, emissive: 0x8a48ff, emissiveIntensity: 0, roughness: 0.35, metalness: 0,
      transparent: true, opacity: 0.95
    })
  );
  bloomGroup.add(heart);

  // additive glow sprites (cheap bloom substitute, keeps canvas transparent)
  const glowTex = (() => {
    const s = 256;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.16, 'rgba(214,170,255,0.92)');
    rg.addColorStop(0.5, 'rgba(150,90,255,0.34)');
    rg.addColorStop(1, 'rgba(70,40,150,0)');
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  })();
  const makeGlow = (sc) => {
    const m = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 });
    const sp = new THREE.Sprite(m); sp.scale.setScalar(sc); root.add(sp); return sp;
  };
  const coreGlow = makeGlow(1.4);
  const auraGlow = makeGlow(6.0);

  // ===================== RELEASE PARTICLES =====================
  const PCOUNT = mobile ? 2400 : 24000;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PCOUNT * 3);
  const aDir = new Float32Array(PCOUNT * 3);
  const aSpeed = new Float32Array(PCOUNT);
  const aSeed = new Float32Array(PCOUNT);
  for (let i = 0; i < PCOUNT; i++) {
    // even spherical directions, slightly flattened → volumetric, not spokes
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    aDir[i*3] = Math.cos(t) * r;
    aDir[i*3+1] = u * 0.82;
    aDir[i*3+2] = Math.sin(t) * r;
    // strong central concentration: most particles stay near the core (dense
    // glowing cloud), a thin tail reaches out as fine mist
    aSpeed[i] = Math.pow(Math.random(), 3.0) * 1.5 + 0.06;
    aSeed[i] = Math.random();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aDir', new THREE.BufferAttribute(aDir, 3));
  pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uRelease: { value: 0 }, uTime: { value: 0 }, uSize: { value: (mobile ? 40 : 64) * DPR }, uMaxR: { value: mobile ? 2.8 : 3.6 } },
    vertexShader: /* glsl */`
      attribute vec3 aDir; attribute float aSpeed; attribute float aSeed;
      uniform float uRelease, uTime, uSize, uMaxR;
      varying float vA; varying float vSeed; varying float vNear;
      void main(){
        vSeed = aSeed;
        float rel = clamp(uRelease, 0.0, 1.0);
        float reach = rel * (0.12 + aSpeed) * uMaxR;
        vNear = 1.0 - clamp(reach / uMaxR, 0.0, 1.0); // 1 at core, 0 at rim
        vec3 p = aDir * reach;
        float tw = uTime * 0.5 + aSeed * 6.2831;
        p += vec3(sin(tw), cos(tw*1.3), sin(tw*0.7)) * 0.18 * rel * (0.3 + aSeed) * (0.4 + reach);
        float fin = smoothstep(0.0, 0.10, rel);
        float fout = 1.0 - smoothstep(0.55, 1.0, rel);
        vA = fin * fout;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // bigger soft sprites near the core, finer toward the rim
        gl_PointSize = uSize * (0.25 + aSeed * 0.6) * (0.4 + vNear) * (1.0 - rel * 0.35) / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying float vSeed; varying float vNear;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float soft = smoothstep(0.5, 0.0, length(d));
        if(soft < 0.004) discard;
        vec3 violet = vec3(0.42, 0.2, 1.0);
        vec3 magenta = vec3(0.95, 0.42, 1.0);
        vec3 col = mix(violet, magenta, vSeed);
        col = mix(col, vec3(1.0, 0.95, 1.0), pow(soft, 3.0) * (0.4 + vNear * 0.5));
        // low per-particle alpha; density builds the glowing cloud via overlap
        gl_FragColor = vec4(col, soft * vA * (0.16 + vNear * 0.34));
      }`
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  particles.visible = false;
  root.add(particles);

  // ===================== PROGRESS → STATE =====================
  let pTarget = 0, pSmooth = 0;
  const sub = (a, b, x) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  const ss = (x) => x * x * (3 - 2 * x);
  const _euler = new THREE.Euler();

  function applyProgress(p) {
    const bloom = ss(sub(0.08, 0.66, p));     // petals unfold
    const coreAmt = ss(sub(0.62, 0.84, p));   // inner core ignites
    const release = sub(0.8, 1.0, p);         // particle nebula
    const fade = ss(sub(0.9, 1.0, p));        // clean dark handoff

    // petals: staggered tilt + scale
    for (const pet of petals) {
      const local = ss(THREE.MathUtils.clamp((bloom - pet.start) / 0.55, 0, 1));
      const tilt = THREE.MathUtils.lerp(pet.tiltClosed, pet.tiltMax, local);
      const s = THREE.MathUtils.lerp(0.34, pet.lenVar, local) * (1 - fade * 0.18);
      _euler.set(tilt, pet.azim, 0, 'YXZ');
      pet.mesh.quaternion.setFromEuler(_euler);
      pet.mesh.scale.setScalar(s);
      glassMat.opacity = 1 - fade * 0.85;
    }

    // dark core shell OPENS (shrinks + fades) as the inner core ignites
    const cShellS = THREE.MathUtils.lerp(0.5, 1.0, bloom) * (1 - coreAmt * 0.55) * (1 - fade * 0.5);
    coreShell.scale.setScalar(cShellS);
    coreShell.material.opacity = (1 - coreAmt * 0.85) * (1 - fade);
    coreShell.visible = coreShell.material.opacity > 0.02;

    // luminous violet heart grows beyond the shell and ignites
    const hs = THREE.MathUtils.lerp(0.35, 1.4, coreAmt) * (1 + release * 0.6) * (1 - fade * 0.6);
    heart.scale.setScalar(hs);
    heart.material.emissiveIntensity = coreAmt * 4.6 * (1 - fade);
    coreLight.intensity = coreAmt * 24 * (1 - fade);

    coreGlow.scale.setScalar(THREE.MathUtils.lerp(0.8, 3.0, coreAmt) * (1 + release * 0.8));
    coreGlow.material.opacity = Math.max(coreAmt * 0.95, release * 0.6) * (1 - fade);
    auraGlow.scale.setScalar(THREE.MathUtils.lerp(3.0, 10.0, release));
    auraGlow.material.opacity = release * (1 - ss(release) * 0.7) * 0.7;

    particles.visible = release > 0.001;
    pMat.uniforms.uRelease.value = release;

    // restrained camera push-in through unfold + core, easing back at the very end
    camera.position.z = THREE.MathUtils.lerp(CAM_Z, 4.9, ss(sub(0.1, 0.8, p))) + fade * 0.7;
    // ease the elevation down slightly as we push in (more into the bloom)
    camera.position.y = THREE.MathUtils.lerp(CAM_Y, 1.5, ss(sub(0.1, 0.8, p)));
    camera.lookAt(0, 0, 0);
  }

  // ===================== LAYOUT =====================
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  // ===================== RENDER LOOP =====================
  let raf = null, running = false, last = performance.now();
  function frame() {
    if (!running) return;
    const now = performance.now();
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    pSmooth += (pTarget - pSmooth) * Math.min(1, dt * 6);
    pMat.uniforms.uTime.value += dt;
    bloomGroup.rotation.y += dt * 0.1;            // slow, restrained spin
    bloomGroup.rotation.x = Math.sin(pMat.uniforms.uTime.value * 0.18) * 0.04;
    applyProgress(pSmooth);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function dispose() {
    stop();
    geos.forEach((g) => g.dispose());
    glassMat.dispose();
    coreShell.geometry.dispose(); coreShell.material.dispose();
    heart.geometry.dispose(); heart.material.dispose();
    glowTex.dispose(); coreGlow.material.dispose(); auraGlow.material.dispose();
    pGeo.dispose(); pMat.dispose();
    envRT.texture.dispose();
    renderer.dispose();
  }

  return {
    start, stop, resize, dispose,
    setProgress: (p) => { pTarget = THREE.MathUtils.clamp(p, 0, 1); },
    setProgressImmediate: (p) => { pTarget = pSmooth = THREE.MathUtils.clamp(p, 0, 1); applyProgress(pSmooth); },
    renderFrame: () => { applyProgress(pSmooth); renderer.render(scene, camera); }
  };
}
