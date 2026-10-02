/*
 * bg-3d.js
 * Morphing particle field behind the whole page (Three.js r128 + inline GLSL).
 * The same particles fly between formations as the visitor scrolls, like a drone swarm:
 *   home → nebula · about → sphere · skills → rippling grid · projects → V flight
 *   experience / education → double helix · contact → pulsing ring
 *
 * Blocks:
 *  1. Config
 *  2. Shaders           morph (current → target), organic noise, grid ripple, ring pulse, mouse push, depth fade
 *  3. Formations        one position buffer per formation (seeded, shuffled)
 *  4. Quality           device tier → particle count
 *  5. Field             renderer, morph scheduling, loop, adaptive quality, toggle, resize, teardown
 *  6. Boot              waits for Three.js (100 ms × 40); otherwise the CSS gradient stays
 *
 * Debug: <html data-bg3d="tier:count" data-bg-formation="name">
 * Shared toggle: main.js sets <html data-fx="on|off"> and fires `fx3d:change` { enabled }.
 */
'use strict';

(() => {
  /* =====================================================================
   * 1. Config
   * ===================================================================== */
  const CONFIG = {
    counts: { low: 1200, medium: 2500, high: 4000 },
    maxPixelRatio: 2,
    colors: [
      { hex: '#00D4FF', weight: 0.34 },
      { hex: '#8B5CF6', weight: 0.3 },
      { hex: '#06B6D4', weight: 0.24 },
      { hex: '#E6EDF7', weight: 0.12 },
    ],
    pointSize: 6.5,
    camera: { fov: 55, z: 34 },
    morphSeconds: 1.4,
    mouse: { radius: 6, strength: 2.6, ease: 0.08 },
    fog: { near: 18, far: 60 },
    // Which formation each section shows (sections not listed keep the current one)
    sectionFormation: {
      home: 'nebula',
      about: 'sphere',
      skills: 'grid',
      projects: 'vflight',
      experience: 'helix',
      education: 'helix',
      contact: 'ring',
    },
    // Per-formation motion: spin (rad/s around its centre), ripple, pulse, idle drift
    fx: {
      nebula: { spin: 0.03, ripple: 0, pulse: 0, drift: 1.4 },
      sphere: { spin: 0.14, ripple: 0, pulse: 0, drift: 0.25 },
      grid: { spin: 0, ripple: 1, pulse: 0, drift: 0.15 },
      vflight: { spin: 0, ripple: 0, pulse: 0, drift: 0.35 },
      helix: { spin: 0.3, ripple: 0, pulse: 0, drift: 0.2 },
      ring: { spin: 0.06, ripple: 0, pulse: 1, drift: 0.2 },
    },
    adaptive: { minFps: 30, seconds: 3 },
    staticTime: 8,
    retry: { interval: 100, attempts: 40 },
  };

  /* =====================================================================
   * 2. Shaders
   * ===================================================================== */
  // 3D simplex noise by Ashima Arts / Stefan Gustavson (MIT).
  const NOISE_GLSL = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
  `;

  const VERTEX_SHADER = `
    attribute vec3 aTarget;
    attribute vec3 aColor;
    attribute float aSeed;
    attribute float aScale;

    uniform float uTime;
    uniform float uMorph;
    uniform float uPixelRatio;
    uniform float uSize;
    uniform vec4 uFxFrom;      // ripple, pulse, drift, unused
    uniform vec4 uFxTo;
    uniform float uAngleFrom;  // accumulated spin of each formation
    uniform float uAngleTo;
    uniform vec3 uCenterFrom;
    uniform vec3 uCenterTo;
    uniform vec3 uGridNormal;
    uniform vec3 uGridCenter;
    uniform vec2 uMouse;
    uniform float uMouseRadius;
    uniform float uMouseStrength;
    uniform float uFogNear;
    uniform float uFogFar;

    varying vec3 vColor;
    varying float vAlpha;

    ${NOISE_GLSL}

    vec3 rotateY(vec3 p, vec3 c, float a) {
      vec3 q = p - c;
      float cs = cos(a);
      float sn = sin(a);
      return c + vec3(cs * q.x + sn * q.z, q.y, -sn * q.x + cs * q.z);
    }

    void main() {
      vec3 from = rotateY(position, uCenterFrom, uAngleFrom);
      vec3 to = rotateY(aTarget, uCenterTo, uAngleTo);

      // Staggered, eased morph: each particle starts a little later than the last
      float delay = aSeed * 0.3;
      float m = clamp((uMorph - delay) / 0.7, 0.0, 1.0);
      float e = m < 0.5 ? 4.0 * m * m * m : 1.0 - pow(-2.0 * m + 2.0, 3.0) / 2.0;
      vec3 p = mix(from, to, e);
      vec4 fx = mix(uFxFrom, uFxTo, e);
      vec3 center = mix(uCenterFrom, uCenterTo, e);

      // Organic swirl while in flight (zero at both ends of the morph)
      float travel = sin(e * 3.14159);
      p += vec3(
        snoise(position * 0.07 + vec3(uTime * 0.2, 0.0, 0.0)),
        snoise(aTarget * 0.07 + vec3(17.0, uTime * 0.2, 0.0)),
        snoise(position * 0.07 + vec3(31.0, 0.0, uTime * 0.2))
      ) * travel * 3.0;

      // Idle drift
      p += vec3(
        sin(uTime * 0.45 + aSeed * 6.2831),
        cos(uTime * 0.38 + aSeed * 12.566),
        sin(uTime * 0.31 + aSeed * 3.1415)
      ) * fx.z;

      // Grid ripple along the plane normal
      if (fx.x > 0.001) {
        vec3 q = p - uGridCenter;
        float d = length(q - dot(q, uGridNormal) * uGridNormal);
        p += uGridNormal * sin(d * 0.45 - uTime * 1.6) * 1.1 * fx.x;
      }

      // Ring pulse
      if (fx.y > 0.001) {
        p = center + (p - center) * (1.0 + sin(uTime * 2.2) * 0.045 * fx.y);
      }

      // Mouse / touch: push away gently; particles return on their own
      vec2 dm = p.xy - uMouse;
      float dist = length(dm);
      float push = smoothstep(uMouseRadius, 0.0, dist);
      p.xy += (dm / max(dist, 0.0001)) * push * uMouseStrength;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(uSize * aScale * uPixelRatio * (24.0 / -mv.z), 26.0 * uPixelRatio);

      float depth = smoothstep(uFogFar, uFogNear, -mv.z);
      vColor = aColor;
      vAlpha = (0.5 + 0.3 * sin(uTime * 1.3 + aSeed * 40.0) + push * 0.3) * mix(0.25, 1.0, depth);
    }
  `;

  const FRAGMENT_SHADER = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float strength = pow(1.0 - d * 2.0, 1.6);
      gl_FragColor = vec4(vColor, strength * vAlpha);
    }
  `;

  /* =====================================================================
   * 3. Formations
   * ===================================================================== */

  /** Small seeded PRNG so formations look the same on every visit. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (rand) => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

  const GRID_TILT = -0.95; // radians around X: the grid reads as a floor
  const GRID_CENTER = [0, -1, 0];
  const GRID_NORMAL = [0, -Math.sin(GRID_TILT), Math.cos(GRID_TILT)];

  /**
   * Build every formation for `count` particles. `wide` moves the helix beside the timeline.
   * Returns { name: { positions: Float32Array, center: [x,y,z] } }.
   */
  function buildFormations(count, wide) {
    const out = {};
    const make = (name, seed, center, fill) => {
      const rand = rng(seed);
      const pts = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const [x, y, z] = fill(i, rand);
        pts[i * 3] = x;
        pts[i * 3 + 1] = y;
        pts[i * 3 + 2] = z;
      }
      shuffle(pts, rng(seed + 99));
      out[name] = { positions: pts, center };
    };

    // Nebula: soft lobes plus scattered dust
    const lobes = [[-14, 6, -6], [10, -4, -2], [18, 9, -12], [-6, -10, -8]];
    make('nebula', 11, [0, 0, 0], (i, r) => {
      if (r() < 0.32) {
        const rad = 40 * Math.sqrt(r());
        const a = r() * Math.PI * 2;
        return [Math.cos(a) * rad, Math.sin(a) * rad, -16 + r() * 24];
      }
      const c = lobes[i % lobes.length];
      return [c[0] + gauss(r) * 6.5, c[1] + gauss(r) * 4.5, c[2] + gauss(r) * 5];
    });

    // Sphere: Fibonacci lattice with a little jitter
    make('sphere', 22, [0, 0, 0], (i, r) => {
      const R = 12.5;
      const y = 1 - (i / (count - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653;
      return [Math.cos(theta) * rad * R + gauss(r) * 0.2, y * R + gauss(r) * 0.2, Math.sin(theta) * rad * R + gauss(r) * 0.2];
    });

    // Grid: flat plane tilted into a floor
    const cols = Math.ceil(Math.sqrt(count * 1.7));
    const rows = Math.ceil(count / cols);
    make('grid', 33, GRID_CENTER, (i) => {
      const gx = ((i % cols) / (cols - 1) - 0.5) * 70;
      const gy = (Math.floor(i / cols) / Math.max(rows - 1, 1) - 0.5) * 44;
      const y = gy * Math.cos(GRID_TILT);
      const z = gy * Math.sin(GRID_TILT);
      return [gx + GRID_CENTER[0], y + GRID_CENTER[1], z + GRID_CENTER[2]];
    });

    // V flight: 11 tight clusters (one leader, five per wing)
    const clusters = [[0, 8, 3]];
    for (let k = 1; k <= 5; k++) {
      clusters.push([-k * 5.4, 8 - k * 2.7, 3 - k * 3.2], [k * 5.4, 8 - k * 2.7, 3 - k * 3.2]);
    }
    make('vflight', 44, [0, 2, -4], (i, r) => {
      const c = clusters[i % clusters.length];
      return [c[0] + gauss(r) * 0.75, c[1] + gauss(r) * 0.55, c[2] + gauss(r) * 0.75];
    });

    // Double helix: two strands plus rungs, beside the timeline on wide screens
    const hx = wide ? -18 : 0;
    make('helix', 55, [hx, 0, -4], (i, r) => {
      const rung = r() < 0.16;
      const y = -22 + r() * 44;
      const a = y * 0.42;
      const R = 4.6;
      if (rung) {
        const t = r() * 2 - 1;
        return [hx + Math.cos(a) * R * t, y, -4 + Math.sin(a) * R * t];
      }
      const strand = i % 2 ? Math.PI : 0;
      return [hx + Math.cos(a + strand) * R + gauss(r) * 0.25, y + gauss(r) * 0.15, -4 + Math.sin(a + strand) * R + gauss(r) * 0.25];
    });

    // Ring: tight torus with a faint halo
    make('ring', 66, [0, 0, -2], (i, r) => {
      const a = r() * Math.PI * 2;
      const halo = r() < 0.1;
      const R = halo ? 13 + gauss(r) * 1.6 : 10.5;
      const t = halo ? 0.6 : 0.42;
      return [Math.cos(a) * R + gauss(r) * t, Math.sin(a) * R + gauss(r) * t, -2 + gauss(r) * t];
    });

    return out;
  }

  /** Shuffle particle order (in triples) so halving the draw range keeps every formation's shape. */
  function shuffle(pts, rand) {
    const n = pts.length / 3;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      for (let k = 0; k < 3; k++) {
        const tmp = pts[i * 3 + k];
        pts[i * 3 + k] = pts[j * 3 + k];
        pts[j * 3 + k] = tmp;
      }
    }
  }

  /* =====================================================================
   * 4. Quality detection
   * ===================================================================== */
  function probeGL() {
    try {
      const canvas = document.createElement('canvas');
      return canvas.getContext('webgl2') || canvas.getContext('webgl');
    } catch {
      return null;
    }
  }

  function gpuName(gl) {
    // Firefox exposes the real renderer via RENDERER and warns if the debug extension is used
    if (!/firefox/i.test(navigator.userAgent)) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    }
    return String(gl.getParameter(gl.RENDERER) || '');
  }

  function detectQuality() {
    const gl = probeGL();
    if (!gl) return { tier: 'none', count: 0 };
    const mobile =
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    let tier = 'medium';
    if (mobile) tier = 'low';
    else if (/RTX|Radeon RX|Radeon Pro|Apple M\d|Apple GPU|GTX 1[06-9]\d0|GTX 16\d0|Arc A\d/i.test(gpuName(gl))) tier = 'high';
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return { tier, count: CONFIG.counts[tier] };
  }

  /* =====================================================================
   * 5. Field
   * ===================================================================== */
  function createField(THREE) {
    const root = document.documentElement;
    const { tier, count } = detectQuality();
    root.dataset.bg3d = `${tier}:${count}`;
    if (!count) return null;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch {
      root.dataset.bg3d = 'none:0';
      return null;
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.id = 'bg-3d';
    canvas.className = 'bg-3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = CONFIG.camera.z;

    /* ----- Geometry: from (position) + target (aTarget), colours, seeds, sizes ----- */
    const isWide = () => window.innerWidth >= 1024;
    let wide = isWide();
    let formations = buildFormations(count, wide);

    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);
    const palette = CONFIG.colors.map((c) => ({ weight: c.weight, color: new THREE.Color(c.hex) }));
    const rand = rng(7);
    for (let i = 0; i < count; i++) {
      let r = rand();
      let color = palette[palette.length - 1].color;
      for (const p of palette) {
        if ((r -= p.weight) <= 0) {
          color = p.color;
          break;
        }
      }
      colors.set([color.r, color.g, color.b], i * 3);
      seeds[i] = rand();
      scales[i] = 0.5 + rand() * rand() * 1.6;
    }

    const geometry = new THREE.BufferGeometry();
    const fromAttr = new THREE.BufferAttribute(formations.nebula.positions.slice(), 3);
    const toAttr = new THREE.BufferAttribute(formations.nebula.positions.slice(), 3);
    geometry.setAttribute('position', fromAttr);
    geometry.setAttribute('aTarget', toAttr);
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const fxVec = (name) => {
      const f = CONFIG.fx[name];
      return new THREE.Vector4(f.ripple, f.pulse, f.drift, 0);
    };
    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uSize: { value: CONFIG.pointSize },
      uFxFrom: { value: fxVec('nebula') },
      uFxTo: { value: fxVec('nebula') },
      uAngleFrom: { value: 0 },
      uAngleTo: { value: 0 },
      uCenterFrom: { value: new THREE.Vector3() },
      uCenterTo: { value: new THREE.Vector3() },
      uGridNormal: { value: new THREE.Vector3(...GRID_NORMAL) },
      uGridCenter: { value: new THREE.Vector3(...GRID_CENTER) },
      uMouse: { value: new THREE.Vector2(9999, 9999) },
      uMouseRadius: { value: CONFIG.mouse.radius },
      uMouseStrength: { value: CONFIG.mouse.strength },
      uFogNear: { value: CONFIG.fog.near },
      uFogFar: { value: CONFIG.fog.far },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; // vertices move in the shader
    scene.add(points);

    /* ----- Morph state ----- */
    const state = {
      from: 'nebula',
      to: 'nebula',
      pending: null,
      morphing: false,
      morphStart: 0,
      angleFrom: 0,
      angleTo: 0,
    };
    root.dataset.bgFormation = 'nebula';

    function setFormationUniforms(which, name) {
      const f = formations[name];
      uniforms[which === 'from' ? 'uCenterFrom' : 'uCenterTo'].value.set(...f.center);
      uniforms[which === 'from' ? 'uFxFrom' : 'uFxTo'].value.copy(fxVec(name));
    }

    function startMorph(name, now) {
      state.to = name;
      state.angleTo = 0;
      toAttr.array.set(formations[name].positions);
      toAttr.needsUpdate = true;
      setFormationUniforms('to', name);
      state.morphing = true;
      state.morphStart = now;
      root.dataset.bgFormation = `${state.from}→${name}`;
    }

    function finishMorph() {
      state.morphing = false;
      state.from = state.to;
      state.angleFrom = state.angleTo;
      fromAttr.array.set(formations[state.from].positions);
      fromAttr.needsUpdate = true;
      setFormationUniforms('from', state.from);
      uniforms.uMorph.value = 0;
      root.dataset.bgFormation = state.from;
    }

    /** Request a formation; queued if a morph is already running. */
    function requestFormation(name) {
      if (!formations[name]) return;
      if (state.morphing) {
        state.pending = name === state.to ? null : name;
        return;
      }
      // Reduced motion keeps the single static frame: no morphing
      if (name === state.from || reduceMotion.matches) return;
      startMorph(name, performance.now());
    }

    /* ----- Pointer ----- */
    const mouseTarget = new THREE.Vector2(9999, 9999);
    const mouse = uniforms.uMouse.value;
    function setPointer(x, y) {
      const halfH = Math.tan(THREE.MathUtils.degToRad(CONFIG.camera.fov / 2)) * CONFIG.camera.z;
      const halfW = halfH * camera.aspect;
      mouseTarget.set((x / window.innerWidth) * 2 * halfW - halfW, -((y / window.innerHeight) * 2 * halfH - halfH));
      if (mouse.x > 9000) mouse.copy(mouseTarget);
    }
    const onPointerMove = (e) => setPointer(e.clientX, e.clientY);
    const onTouchMove = (e) => e.touches[0] && setPointer(e.touches[0].clientX, e.touches[0].clientY);
    const clearPointer = () => mouseTarget.set(9999, 9999);

    /* ----- Loop ----- */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let elapsed = 0;
    let frameId = 0;
    let running = false;
    let enabled = root.dataset.fx !== 'off';
    const perf = { frames: 0, time: 0, slowSeconds: 0, reduced: false };

    function renderOnce() {
      renderer.render(scene, camera);
    }

    function adaptQuality(dt) {
      if (perf.reduced) return;
      perf.frames++;
      perf.time += dt;
      if (perf.time < 1) return;
      const fps = perf.frames / perf.time;
      perf.slowSeconds = fps < CONFIG.adaptive.minFps ? perf.slowSeconds + 1 : 0;
      perf.frames = 0;
      perf.time = 0;
      if (perf.slowSeconds >= CONFIG.adaptive.seconds) {
        // Halve the particles once and stop mouse repulsion
        perf.reduced = true;
        geometry.setDrawRange(0, Math.floor(count / 2));
        uniforms.uMouseStrength.value = 0;
        root.dataset.bg3d = `${tier}:${Math.floor(count / 2)}:reduced`;
      }
    }

    function tick() {
      frameId = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(clock.getDelta(), 0.1);
      elapsed += dt;
      uniforms.uTime.value = elapsed;

      // Spin each formation around its own centre
      state.angleFrom += CONFIG.fx[state.from].spin * dt;
      state.angleTo += CONFIG.fx[state.to].spin * dt;
      uniforms.uAngleFrom.value = state.angleFrom;
      uniforms.uAngleTo.value = state.angleTo;

      if (state.morphing) {
        const t = (now - state.morphStart) / (CONFIG.morphSeconds * 1000);
        uniforms.uMorph.value = Math.min(t, 1);
        if (t >= 1) {
          finishMorph();
          if (state.pending && state.pending !== state.from) {
            const next = state.pending;
            state.pending = null;
            startMorph(next, now);
          }
          state.pending = null;
        }
      }

      if (mouseTarget.x > 9000) mouse.set(9999, 9999);
      else mouse.lerp(mouseTarget, CONFIG.mouse.ease);

      renderOnce();
      adaptQuality(dt);
    }

    function play() {
      if (running || !enabled || document.hidden || reduceMotion.matches) return;
      running = true;
      clock.getDelta();
      perf.frames = 0;
      perf.time = 0;
      tick();
    }
    function pause() {
      running = false;
      cancelAnimationFrame(frameId);
    }
    function renderStatic() {
      pause();
      uniforms.uTime.value = CONFIG.staticTime;
      mouse.set(9999, 9999);
      renderOnce();
    }
    function refresh() {
      canvas.hidden = !enabled;
      if (!enabled) pause();
      else if (reduceMotion.matches) renderStatic();
      else play();
    }

    /* ----- Section tracking (IntersectionObserver on the middle band of the viewport) ----- */
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) requestFormation(CONFIG.sectionFormation[entry.target.id]);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    document.querySelectorAll('main > section[id]').forEach((s) => {
      if (CONFIG.sectionFormation[s.id]) io.observe(s);
    });

    /* ----- Resize: camera, renderer and the helix position ----- */
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (isWide() !== wide) {
          wide = isWide();
          formations = buildFormations(count, wide);
          fromAttr.array.set(formations[state.from].positions);
          toAttr.array.set(formations[state.to].positions);
          fromAttr.needsUpdate = toAttr.needsUpdate = true;
          setFormationUniforms('from', state.from);
          setFormationUniforms('to', state.to);
        }
        if (!running && enabled) renderOnce();
      }, 150);
    };

    const onVisibility = () => (document.hidden ? pause() : play());
    const onToggle = (e) => {
      enabled = !!e.detail.enabled;
      refresh();
    };
    const onContextLost = (e) => {
      e.preventDefault();
      pause();
    };

    function dispose() {
      pause();
      clearTimeout(resizeTimer);
      io.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', clearPointer);
      root.removeEventListener('mouseleave', clearPointer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('fx3d:change', onToggle);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceMotion.removeEventListener('change', refresh);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', clearPointer, { passive: true });
    root.addEventListener('mouseleave', clearPointer);
    window.addEventListener('resize', onResize);
    window.addEventListener('fx3d:change', onToggle);
    document.addEventListener('visibilitychange', onVisibility);
    reduceMotion.addEventListener('change', refresh);
    canvas.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) dispose();
    });

    refresh();
    return { tier, count, dispose, isRunning: () => running, formation: () => root.dataset.bgFormation };
  }

  /* =====================================================================
   * 6. Boot: wait for Three.js
   * ===================================================================== */
  let attempts = 0;
  (function waitForThree() {
    if (window.THREE) {
      window.Background3D = createField(window.THREE);
      return;
    }
    if (++attempts >= CONFIG.retry.attempts) {
      document.documentElement.dataset.bg3d = 'unavailable:0';
      return;
    }
    setTimeout(waitForThree, CONFIG.retry.interval);
  })();
})();
