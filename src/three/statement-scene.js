import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * Kinematska "signature" scena uvodne izjave.
 *
 * Tijek: tipografija mirno osvane → tri dijagonalna reza (tigrova šapa) prođu
 * KROZ slova → rezane trake gube napetost, savijaju se kao tkanina i padaju →
 * iza razbijene tipografije provali roj leptira koji odlete prema gledatelju i
 * van kadra.
 *
 * Tekst je renderiran u teksturu i mapiran na gusto subdividiranu ravninu koja
 * je geometrijski podijeljena duž tri dijagonale; vertex shader radi gravitaciju,
 * rotaciju oko gornjeg ruba reza i „fabric” savijanje. Leptiri su jedan
 * InstancedMesh (krila se lepršaju u shaderu, putanje se računaju na CPU-u).
 */
export function createStatementScene(canvas, { mobile = false } = {}) {
  const scene = new THREE.Scene();

  const CAM_Z = 12;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 0, CAM_Z);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !mobile,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2);
  renderer.setPixelRatio(DPR);

  const BLUE = '#74a6ff';
  const root = new THREE.Group();
  scene.add(root);

  // ---- vidljiva visina/širina na z=0 ----
  const fovRad = (camera.fov * Math.PI) / 180;
  let viewH = 2 * Math.tan(fovRad / 2) * CAM_Z;
  let viewW = viewH; // ažurira resize()

  // ================= TEKST → TEKSTURA =================
  function makeTextTexture(lines, { weight = 700, blue = false } = {}) {
    const dpr = 2;
    const fontPx = 130;
    const lineH = fontPx * 1.16;
    const pad = fontPx * 0.6;
    const measure = document.createElement('canvas').getContext('2d');
    const font = (px) => `${weight} ${px}px "Space Grotesk", system-ui, sans-serif`;
    measure.font = font(fontPx);
    let maxW = 0;
    lines.forEach((l) => (maxW = Math.max(maxW, measure.measureText(l).width)));
    const W = Math.ceil(maxW + pad * 2);
    const H = Math.ceil(lineH * lines.length + pad * 1.4);
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * dpr);
    c.height = Math.ceil(H * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = font(fontPx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = blue ? BLUE : '#f4f4f1';
    lines.forEach((l, i) => {
      const y = pad * 0.7 + lineH * (i + 0.5);
      ctx.fillText(l, W / 2, y);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return { tex, aspect: W / H };
  }

  // Glavna izjava (uppercase, kinematski) — ovo se reže.
  const MAIN_LINES = [
    'VAŠA WEB STRANICA ČESTO JE PRVI',
    'KONTAKT KUPCA S VAŠOM TVRTKOM.',
    'POBRINUT ĆEMO SE DA TAJ PRVI',
    'DOJAM NE IZGLEDA PROSJEČNO.'
  ];
  // Renderiraj 2 bijela + 2 plava retka na ISTU teksturu (poravnanje).
  const mainTex = (() => {
    const dpr = 2;
    const fontPx = 132;
    const lineH = fontPx * 1.18;
    const coupleGap = fontPx * 0.55;
    const pad = fontPx * 0.65;
    const mctx = document.createElement('canvas').getContext('2d');
    const font = `700 ${fontPx}px "Space Grotesk", system-ui, sans-serif`;
    mctx.font = font;
    let maxW = 0;
    MAIN_LINES.forEach((l) => (maxW = Math.max(maxW, mctx.measureText(l).width)));
    const W = Math.ceil(maxW + pad * 2);
    const H = Math.ceil(lineH * 4 + coupleGap + pad * 1.2);
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * dpr);
    c.height = Math.ceil(H * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ys = [];
    let y = pad * 0.6 + lineH * 0.5;
    ys.push(y);
    ys.push((y += lineH));
    y += coupleGap;
    ys.push((y += lineH));
    ys.push((y += lineH));
    MAIN_LINES.forEach((l, i) => {
      ctx.fillStyle = i < 2 ? '#f4f4f1' : BLUE;
      if (i >= 2) ctx.globalAlpha = 0.82;
      ctx.fillText(l, W / 2, ys[i]);
      ctx.globalAlpha = 1;
    });
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return { tex, aspect: W / H };
  })();

  const subInfo = makeTextTexture(
    [
      'Od jednostavne poslovne prezentacije do potpuno prilagođenog',
      'interaktivnog iskustva — dizajn, kod i animacije kao jedna cjelina.'
    ],
    { weight: 500 }
  );

  // ================= GLAVNA RAVNINA (rezana tkanina) =================
  let planeW = 0;
  let planeH = 0;
  const SEGX = mobile ? 90 : 150;
  const SEGY = mobile ? 30 : 54;

  // tri dijagonalna reza: y = m_k * x + b_k  (gornji-lijevi → donji-desni)
  // b/slope u lokalnim, normaliziranim jedinicama (-0.5..0.5 po visini).
  const CUTS = [
    { m: -0.42, b: 0.2 },
    { m: -0.5, b: -0.01 },
    { m: -0.36, b: -0.22 }
  ];

  // Po-fragment (0=dno .. 3=vrh) parametri pada. Sve trake na kraju odu;
  // vrh ostaje najdulje pa se zadnji predaje gravitaciji.
  const FRAG = [
    { delay: 0.14, fall: 2.4, rot: 0.5, swing: 0.9 }, // donja traka
    { delay: 0.06, fall: 2.1, rot: -0.42, swing: 1.1 },
    { delay: 0.02, fall: 1.8, rot: 0.34, swing: 0.8 },
    { delay: 0.3, fall: 1.5, rot: -0.22, swing: 0.55 } // vrh — pada zadnji
  ];

  const mainUniforms = {
    uMap: { value: mainTex.tex },
    uProgress: { value: 0 },
    uReveal: { value: 0 },
    uTime: { value: 0 },
    uFocus: { value: 0.0 } // blagi blur/raspršenje na ulazu (0=oštro)
  };

  const mainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: mainUniforms,
    vertexShader: /* glsl */ `
      attribute float aDelay;
      attribute vec2  aAttach;
      attribute float aFall;
      attribute float aRot;
      attribute float aSwing;
      attribute float aPhase;
      uniform float uProgress;
      uniform float uTime;
      varying vec2 vUv;
      varying float vA;

      mat2 rot2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

      void main(){
        vUv = uv;
        vec3 p = position;

        float L = clamp((uProgress - aDelay) / max(0.0001, 1.0 - aDelay), 0.0, 1.0);
        // suspendirani „hold” pa ubrzanje (gravitacija)
        float g = L * L;
        float hang = max(0.0, aAttach.y - p.y);

        // šarka oko gornjeg ruba reza
        float ang = aRot * g;
        vec2 d = p.xy - aAttach;
        d = rot2(ang) * d;
        p.xy = aAttach + d;

        // „fabric” savijanje: dubinski val + lagani vertikalni progib
        float w = sin(hang * 3.0 + aPhase + uTime * 2.2);
        float soft = smoothstep(0.0, 0.35, L);
        p.z += w * 0.16 * hang * soft;
        p.y -= w * 0.04 * hang * soft;
        p.x += sin(uTime * 1.4 + aPhase) * aSwing * 0.12 * hang * soft;

        // gravitacija
        p.y -= g * aFall;

        vA = 1.0 - smoothstep(0.6, 1.0, L);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uReveal;
      uniform float uFocus;
      varying vec2 vUv;
      varying float vA;
      void main(){
        // blagi „focus” reveal: spoji nekoliko uzoraka kad je uFocus>0
        vec4 t = texture2D(uMap, vUv);
        if(uFocus > 0.001){
          float o = uFocus * 0.004;
          t += texture2D(uMap, vUv + vec2(o, 0.0));
          t += texture2D(uMap, vUv + vec2(-o, 0.0));
          t += texture2D(uMap, vUv + vec2(0.0, o));
          t *= 0.25;
        }
        float a = t.a * vA * uReveal;
        if(a < 0.008) discard;
        gl_FragColor = vec4(t.rgb, a);
      }
    `
  });

  // Non-indexed: svaki trokut ima vlastite vrhove → traku dodjeljujemo po
  // trokutu pa se susjedne trake ne „razvlače” preko reza (nema smearanja).
  const mainMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, SEGX, SEGY).toNonIndexed(),
    mainMat
  );
  mainMesh.frustumCulled = false;
  root.add(mainMesh);

  function classifyFrag(nx, ny) {
    // nx,ny u lokalnim koordinatama ravnine [-0.5..0.5];
    // broji rezove ispod vrha (vertex iznad linije) → traka 0..3
    let r = 0;
    for (const cut of CUTS) if (ny > cut.m * nx + cut.b) r++;
    return r;
  }

  function buildFragments() {
    const geo = mainMesh.geometry;
    const pos = geo.attributes.position;
    const n = pos.count;
    const aDelay = new Float32Array(n);
    const aAttach = new Float32Array(n * 2);
    const aFall = new Float32Array(n);
    const aRot = new Float32Array(n);
    const aSwing = new Float32Array(n);
    const aPhase = new Float32Array(n);
    // Klasifikacija PO TROKUTU (3 vrha) prema centroidu → rigidne trake.
    for (let tri = 0; tri < n; tri += 3) {
      const cx = (pos.getX(tri) + pos.getX(tri + 1) + pos.getX(tri + 2)) / 3;
      const cy = (pos.getY(tri) + pos.getY(tri + 1) + pos.getY(tri + 2)) / 3;
      const f = classifyFrag(cx, cy);
      const fr = FRAG[f];
      const attachNy = f === 3 ? 0.5 : CUTS[f].b;
      for (let v = 0; v < 3; v++) {
        const i = tri + v;
        aDelay[i] = fr.delay;
        aAttach[i * 2] = 0;
        aAttach[i * 2 + 1] = attachNy;
        aFall[i] = fr.fall; // lokalne jedinice; mesh.scale.y skalira u svijet
        aRot[i] = fr.rot;
        aSwing[i] = fr.swing;
        aPhase[i] = (f * 1.7 + cx * 8.0) % 6.283;
      }
    }
    geo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));
    geo.setAttribute('aAttach', new THREE.BufferAttribute(aAttach, 2));
    geo.setAttribute('aFall', new THREE.BufferAttribute(aFall, 1));
    geo.setAttribute('aRot', new THREE.BufferAttribute(aRot, 1));
    geo.setAttribute('aSwing', new THREE.BufferAttribute(aSwing, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  }

  // ================= POMOĆNA TIPOGRAFIJA (sub) =================
  const subMat = new THREE.MeshBasicMaterial({
    map: subInfo.tex,
    transparent: true,
    depthWrite: false,
    opacity: 0
  });
  const subMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), subMat);
  root.add(subMesh);

  // ================= POZADINSKI SJAJ =================
  const glowTex = (() => {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(70,120,255,0.55)');
    grd.addColorStop(0.4, 'rgba(50,90,220,0.18)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  })();
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0
  });
  const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
  glowMesh.position.z = -3;
  root.add(glowMesh);

  // ================= SLASH FLASH (3 trake) =================
  const lineTex = (() => {
    const w = 8;
    const h = 128;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  })();
  const slashGroup = new THREE.Group();
  root.add(slashGroup);
  const slashMats = [];
  CUTS.forEach((cut) => {
    const mat = new THREE.MeshBasicMaterial({
      map: lineTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
      color: new THREE.Color(0xbcd4ff)
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.z = 0.15;
    slashGroup.add(mesh);
    slashMats.push({ mesh, mat, cut });
  });

  // ================= PRAŠINA (dust burst po rezovima) =================
  const DUST = mobile ? 70 : 150;
  const dustGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST * 3);
  const dDir = new Float32Array(DUST * 3);
  const dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dSeed[i] = Math.random();
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aDir', new THREE.BufferAttribute(dDir, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uSize: { value: mobile ? 2.0 : 3.0 }, uDpr: { value: DPR } },
    vertexShader: /* glsl */ `
      attribute vec3 aDir; attribute float aSeed;
      uniform float uT; uniform float uSize; uniform float uDpr;
      varying float vA;
      void main(){
        float t = clamp(uT, 0.0, 1.0);
        vec3 p = position + aDir * t * (0.6 + aSeed);
        p.y -= t * t * 0.5;
        vA = (1.0 - t) * smoothstep(0.0, 0.1, t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * uDpr * (1.0 + aSeed) * (1.0 - t) ;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(d)) * vA;
        if(a < 0.01) discard;
        gl_FragColor = vec4(0.78, 0.86, 1.0, a);
      }
    `
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  root.add(dust);

  // ================= LEPTIRI (InstancedMesh) =================
  const BCOUNT = mobile ? 30 : 110;
  const butterflyTex = makeButterflyTexture();

  // krilo: dvije plohe (lijevo/desno), šarka oko x=0
  const wingGeo = (() => {
    const g = new THREE.BufferGeometry();
    // right: x[0..1], left: x[-1..0]; y[-1..1]; uv -> obje strane teksture
    const verts = [];
    const uvs = [];
    const quad = (x0, x1, u0, u1) => {
      verts.push(x0, -1, 0, x1, -1, 0, x1, 1, 0, x0, -1, 0, x1, 1, 0, x0, 1, 0);
      uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    };
    quad(0, 1, 0.5, 1.0); // desno krilo (uv 0.5→1)
    quad(-1, 0, 1.0, 0.5); // lijevo krilo (zrcaljeno: x −1→0 ⇒ uv 1→0.5)
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return g;
  })();

  const bUniforms = {
    uTime: { value: 0 },
    uMap: { value: butterflyTex },
    uReveal: { value: 1 }
  };
  const bMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: bUniforms,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aFlapSpeed;
      attribute float aFlapAmp;
      attribute float aTint;
      attribute float aOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vTint;
      varying float vOpacity;
      void main(){
        vUv = uv;
        vTint = aTint;
        vOpacity = aOpacity;
        vec3 p = position;
        // lepršanje krila: rotacija oko Y u x=0
        float flap = 0.35 + sin(uTime * aFlapSpeed + aPhase) * aFlapAmp;
        float c = cos(flap);
        float s = sin(flap);
        p.x = position.x * c;
        p.z = position.z + abs(position.x) * s;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec2 vUv;
      varying float vTint;
      varying float vOpacity;
      void main(){
        vec4 t = texture2D(uMap, vUv);
        float sil = t.a;                          // silueta krila
        float rim = clamp(t.r * 1.5, 0.0, 1.0);   // rub (rim) maska
        if(sil < 0.02 && rim < 0.02) discard;
        // tamno, jedva vidljivo tijelo krila + svjetleći plavi rub
        vec3 body = mix(vec3(0.05, 0.08, 0.16), vec3(0.10, 0.16, 0.30), vTint);
        vec3 edge = mix(vec3(0.26, 0.56, 1.0), vec3(0.82, 0.90, 1.0), vTint);
        vec3 col = mix(body, edge, rim);
        float alpha = max(sil * 0.42, rim) * vOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const butterflies = new THREE.InstancedMesh(wingGeo, bMat, BCOUNT);
  butterflies.frustumCulled = false;
  butterflies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(butterflies);

  const aPhase = new Float32Array(BCOUNT);
  const aFlapSpeed = new Float32Array(BCOUNT);
  const aFlapAmp = new Float32Array(BCOUNT);
  const aTint = new Float32Array(BCOUNT);
  const aOpacity = new Float32Array(BCOUNT);
  for (let i = 0; i < BCOUNT; i++) {
    aPhase[i] = Math.random() * 6.283;
    aFlapSpeed[i] = 7 + Math.random() * 7;
    aFlapAmp[i] = 0.5 + Math.random() * 0.5;
    aTint[i] = Math.random() < 0.18 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3;
    aOpacity[i] = 0;
  }
  wingGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(aPhase, 1));
  wingGeo.setAttribute('aFlapSpeed', new THREE.InstancedBufferAttribute(aFlapSpeed, 1));
  wingGeo.setAttribute('aFlapAmp', new THREE.InstancedBufferAttribute(aFlapAmp, 1));
  wingGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 1));
  const aOpacityAttr = new THREE.InstancedBufferAttribute(aOpacity, 1);
  aOpacityAttr.setUsage(THREE.DynamicDrawUsage);
  wingGeo.setAttribute('aOpacity', aOpacityAttr);

  // stanje po leptiru (CPU putanje)
  const flies = [];
  for (let i = 0; i < BCOUNT; i++) {
    flies.push({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      layer: 0,
      scale: 1,
      roll: Math.random() * 6.283,
      rollV: (Math.random() - 0.5) * 0.6,
      spawnDelay: 0,
      active: false,
      op: 0,
      curlF: 0.6 + Math.random() * 1.2,
      curlA: 0.3 + Math.random() * 0.7
    });
  }
  const dummy = new THREE.Object3D();
  let released = false;
  let releaseClock = 0;

  function spawnFly(f, i) {
    // iza tipografije (z<0), oko rezova / slova
    const cutPick = CUTS[i % CUTS.length];
    const nx = (Math.random() - 0.5) * 0.95;
    const ny = cutPick.m * nx + cutPick.b + (Math.random() - 0.5) * 0.2;
    f.pos.set(nx * planeW, ny * planeH, -2.0 - Math.random() * 5.0);
    f.layer = Math.random();
    // veličine u svjetskim jedinicama (krilo je široko 2 jedinice)
    const base = f.layer < 0.28 ? 0.5 : f.layer > 0.78 ? 0.2 : 0.32;
    f.scale = base * (0.82 + Math.random() * 0.42);
    // naprijed prema kameri dominira; široko bočno raspršenje; malo vertikale
    const fwd = f.layer < 0.28 ? 2.7 + Math.random() * 1.4 : f.layer > 0.78 ? 0.5 + Math.random() * 0.6 : 1.3 + Math.random();
    f.vel.set(
      (Math.random() - 0.5) * 2.6,
      (Math.random() - 0.5) * 1.3 + 0.12,
      fwd
    );
    // staggered: većina kreće malo kasnije, par ranije → „prvo nekoliko pa roj”
    f.spawnDelay = Math.pow(Math.random(), 1.6) * (mobile ? 1.0 : 1.7);
    f.active = true;
    f.op = 0;
    f.roll = Math.random() * 6.283;
    f.curlF = 0.5 + Math.random() * 1.0;
    f.curlA = 0.25 + Math.random() * 0.5;
  }

  function release() {
    if (released) return;
    released = true;
    releaseClock = 0;
    flies.forEach((f, i) => spawnFly(f, i));
  }

  function resetFlies() {
    released = false;
    flies.forEach((f) => {
      f.active = false;
      f.op = 0;
    });
    for (let i = 0; i < BCOUNT; i++) aOpacity[i] = 0;
    aOpacityAttr.needsUpdate = true;
  }

  function updateButterflies(dt) {
    if (!released) return;
    releaseClock += dt;
    const halfW = viewW * 0.5 + 2;
    const halfH = viewH * 0.5 + 2;
    for (let i = 0; i < BCOUNT; i++) {
      const f = flies[i];
      if (!f.active) {
        aOpacity[i] = 0;
        continue;
      }
      if (releaseClock < f.spawnDelay) {
        aOpacity[i] = 0;
        dummy.position.copy(f.pos);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        butterflies.setMatrixAt(i, dummy.matrix);
        continue;
      }
      // gibanje: naprijed + graciozno zakrivljenje + tek blagi uzgon
      const t = releaseClock;
      f.vel.x += Math.sin(t * f.curlF + f.roll) * f.curlA * dt;
      f.vel.y += Math.cos(t * f.curlF * 0.8 + f.roll) * f.curlA * 0.5 * dt + 0.06 * dt;
      f.pos.addScaledVector(f.vel, dt);
      f.roll += f.rollV * dt;

      // fade in pa fade out kad prođe kameru / izađe
      const nearCam = f.pos.z > CAM_Z - 2.5;
      const out =
        f.pos.x < -halfW ||
        f.pos.x > halfW ||
        f.pos.y > halfH ||
        f.pos.y < -halfH ||
        f.pos.z > CAM_Z + 1.5;
      f.op = Math.min(1, f.op + dt * 2.2);
      let op = f.op;
      if (nearCam) op *= Math.max(0, (CAM_Z + 1.5 - f.pos.z) / 4);

      if (out) {
        // recikliraj manji dio u pozadinu (daleki leptiri ostaju), ostatak gasi
        if (Math.random() < 0.35 && releaseClock < (mobile ? 3 : 5)) {
          spawnFly(f, i);
          f.spawnDelay = releaseClock + Math.random() * 0.4;
          f.layer = 0.85 + Math.random() * 0.15;
          f.scale *= 0.6;
        } else {
          f.active = false;
        }
        aOpacity[i] = 0;
        continue;
      }

      aOpacity[i] = op;
      dummy.position.copy(f.pos);
      dummy.scale.setScalar(f.scale);
      dummy.up.set(0, 1, 0);
      dummy.lookAt(camera.position);
      dummy.rotateZ(f.roll);
      dummy.rotateX(Math.sin(t * 0.8 + f.roll) * 0.25);
      dummy.updateMatrix();
      butterflies.setMatrixAt(i, dummy.matrix);
    }
    butterflies.instanceMatrix.needsUpdate = true;
    aOpacityAttr.needsUpdate = true;
  }

  // ================= LAYOUT / RESIZE =================
  function layout() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewH = 2 * Math.tan(fovRad / 2) * CAM_Z;
    viewW = viewH * camera.aspect;

    // glavna tipografija ~ 88% širine, ali stane po visini
    planeW = Math.min(viewW * (mobile ? 0.94 : 0.88), viewH * mainTex.aspect * 0.92);
    planeH = planeW / mainTex.aspect;
    mainMesh.scale.set(planeW, planeH, 1);
    mainMesh.position.y = viewH * 0.04;

    // sub tekst ispod
    const subW = Math.min(viewW * 0.6, planeW * 0.82);
    subMesh.scale.set(subW, subW / subInfo.aspect, 1);
    subMesh.position.set(0, mainMesh.position.y - planeH * 0.5 - (subW / subInfo.aspect) * 0.9, 0.2);

    glowMesh.scale.set(viewW * 1.1, viewH * 1.1, 1);

    // slash trake duž rezova
    slashMats.forEach(({ mesh, cut }) => {
      const angle = Math.atan2(cut.m * planeW, planeW); // nagib reza u world
      const len = Math.hypot(planeW, cut.m * planeW) * 1.15;
      mesh.scale.set(len, planeH * 0.16, 1);
      mesh.position.set(0, cut.b * planeH + mainMesh.position.y, 0.15);
      mesh.rotation.z = angle;
    });

    // dust pozicije po rezovima
    for (let i = 0; i < DUST; i++) {
      const cut = CUTS[i % 3];
      const nx = (Math.random() - 0.5) * 0.95;
      const ny = cut.m * nx + cut.b;
      dPos[i * 3] = nx * planeW;
      dPos[i * 3 + 1] = ny * planeH + mainMesh.position.y;
      dPos[i * 3 + 2] = 0.2;
      const a = Math.random() * 6.283;
      dDir[i * 3] = Math.cos(a) * (0.4 + Math.random());
      dDir[i * 3 + 1] = Math.sin(a) * (0.4 + Math.random()) - 0.4;
      dDir[i * 3 + 2] = Math.random() * 0.6;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.aDir.needsUpdate = true;

    buildFragments();
  }
  layout();

  // ================= TIMELINE / SEKVENCA =================
  let seqTl = null;
  let hasPlayed = false;

  function trigger() {
    if (hasPlayed) return;
    hasPlayed = true;
    if (seqTl) seqTl.kill();
    seqTl = gsap.timeline();

    // PRE-IMPACT: minimalni push-in + sjena (fokus)
    seqTl.to(camera.position, { z: CAM_Z * 0.96, duration: 0.45, ease: 'power2.inOut' }, 0);
    seqTl.to(subMat, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0); // sub nestaje prije udara

    // STRIKE: bljesak rezova + dust + shake (na CSS wrapperu izvana)
    const STRIKE = 0.5;
    slashMats.forEach((s, k) => {
      seqTl.fromTo(
        s.mat,
        { opacity: 0 },
        { opacity: 1, duration: 0.06, ease: 'power2.out' },
        STRIKE + k * 0.05
      );
      seqTl.to(s.mat, { opacity: 0, duration: 0.42, ease: 'power2.in' }, STRIKE + k * 0.05 + 0.06);
    });
    seqTl.fromTo(dustMat.uniforms.uT, { value: 0 }, { value: 1, duration: 0.7, ease: 'power1.out' }, STRIKE);
    if (onShake) seqTl.add(() => onShake(), STRIKE);

    // tiny impact zoom pa pull-back
    seqTl.to(camera.position, { z: CAM_Z * 0.9, duration: 0.1, ease: 'power3.out' }, STRIKE);
    seqTl.to(camera.position, { z: CAM_Z * 1.14, duration: 2.6, ease: 'power2.inOut' }, STRIKE + 0.12);

    // COLLAPSE: tkanina pada
    seqTl.to(
      mainUniforms.uProgress,
      { value: 1, duration: mobile ? 1.9 : 2.5, ease: 'power1.in' },
      STRIKE + 0.04
    );

    // BUTTERFLY REVEAL
    seqTl.add(() => release(), STRIKE + 0.16);
    seqTl.to(glowMat, { opacity: 0.9, duration: 0.6, ease: 'power2.out' }, STRIKE + 0.1);
    seqTl.to(glowMat, { opacity: 0.28, duration: 2.0, ease: 'power2.inOut' }, STRIKE + 0.9);
    // povratak u gotovo potpunu tamu — ostane tek nekoliko dalekih leptira
    seqTl.to(glowMat, { opacity: 0.06, duration: 1.6, ease: 'power2.inOut' }, STRIKE + 3.2);

    return seqTl;
  }

  function reset() {
    hasPlayed = false;
    if (seqTl) {
      seqTl.kill();
      seqTl = null;
    }
    mainUniforms.uProgress.value = 0;
    mainUniforms.uReveal.value = 0;
    dustMat.uniforms.uT.value = 0;
    glowMat.opacity = 0;
    subMat.opacity = 0;
    camera.position.z = CAM_Z;
    slashMats.forEach((s) => (s.mat.opacity = 0));
    resetFlies();
  }

  // arrival reveal (vođeno scrollom 0..1)
  function setReveal(v) {
    mainUniforms.uReveal.value = Math.min(1, Math.max(0, v));
    mainUniforms.uFocus.value = Math.max(0, 1 - v * 1.4);
    subMat.opacity = Math.min(0.7, Math.max(0, (v - 0.3) / 0.5) * 0.7);
    glowMat.opacity = Math.max(glowMat.opacity, Math.min(0.22, v * 0.22));
  }

  // ================= RENDER LOOP =================
  let raf = null;
  let running = false;
  let last = performance.now();
  let onShake = null;

  function frame() {
    if (!running) return;
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    mainUniforms.uTime.value += dt;
    bUniforms.uTime.value += dt;
    updateButterflies(dt);
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

  function resize() {
    layout();
  }

  function dispose() {
    stop();
    if (seqTl) seqTl.kill();
    mainMesh.geometry.dispose();
    mainMat.dispose();
    mainTex.tex.dispose();
    subMesh.geometry.dispose();
    subMat.dispose();
    subInfo.tex.dispose();
    glowMesh.geometry.dispose();
    glowMat.dispose();
    glowTex.dispose();
    slashMats.forEach((s) => {
      s.mesh.geometry.dispose();
      s.mat.dispose();
    });
    lineTex.dispose();
    dustGeo.dispose();
    dustMat.dispose();
    wingGeo.dispose();
    bMat.dispose();
    butterflyTex.dispose();
    butterflies.dispose();
    renderer.dispose();
  }

  return {
    start,
    stop,
    resize,
    dispose,
    trigger,
    reset,
    setReveal,
    setShake: (fn) => (onShake = fn),
    // Dev-only: izravno postavi fazu razaranja (za QA snimke).
    setProgress: (p, doRelease = false) => {
      mainUniforms.uReveal.value = 1;
      mainUniforms.uProgress.value = p;
      if (doRelease) {
        glowMat.opacity = 0.6;
        release();
      }
    },
    releaseNow: () => release(),
    get hasPlayed() {
      return hasPlayed;
    }
  };
}

// Stilizirana premium silueta leptira.
//   alpha  = puna silueta krila (tijelo)
//   r-kanal = maska ruba (rim) za svjetleći plavi obrub u shaderu
// Desna polovica se crta u uv [0.5..1]; lijeva se zrcali u shaderu.
function makeButterflyTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  const cx = S * 0.5;
  const cy = S * 0.5;
  const k = S / 128; // skala

  // Putanja desnog krila (gornje + donje) — elegantan, blago šiljat gornji,
  // zaobljen donji dio s malim repom.
  const wingPath = () => {
    g.beginPath();
    // gornje krilo
    g.moveTo(3 * k, -3 * k);
    g.bezierCurveTo(16 * k, -46 * k, 54 * k, -52 * k, 60 * k, -16 * k);
    g.bezierCurveTo(62 * k, -2 * k, 44 * k, 4 * k, 4 * k, -2 * k);
    // donje krilo
    g.moveTo(4 * k, 2 * k);
    g.bezierCurveTo(22 * k, 18 * k, 46 * k, 30 * k, 44 * k, 58 * k);
    g.bezierCurveTo(43 * k, 74 * k, 22 * k, 70 * k, 14 * k, 44 * k);
    g.bezierCurveTo(10 * k, 30 * k, 6 * k, 18 * k, 3 * k, 6 * k);
    g.closePath();
  };

  // 1) puna silueta (alpha) — suptilan dark→edge gradient po krilu
  const grd = g.createLinearGradient(0, 0, 64 * k, 0);
  grd.addColorStop(0, 'rgba(12,16,26,0.5)');
  grd.addColorStop(1, 'rgba(20,30,55,0.9)');
  g.save();
  g.translate(cx, cy);
  g.fillStyle = grd;
  wingPath();
  g.fill();
  g.restore();

  // 2) rub (rim) u CRVENI kanal — shader ga koristi za svjetleći obrub
  g.save();
  g.translate(cx, cy);
  g.globalCompositeOperation = 'lighter';
  g.lineJoin = 'round';
  g.lineWidth = 3 * k;
  g.strokeStyle = 'rgba(255,0,0,0.9)';
  wingPath();
  g.stroke();
  g.lineWidth = 1.4 * k;
  g.strokeStyle = 'rgba(255,120,120,1)';
  wingPath();
  g.stroke();
  g.restore();

  // 3) tijelo (u oba kanala — tamno, tanko)
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(10,12,20,0.95)';
  g.beginPath();
  g.ellipse(cx, cy, 2.4 * k, 26 * k, 0, 0, Math.PI * 2);
  g.fill();

  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
