/*
 * bg-3d.js
 * Full-screen particle background (Three.js r128 + inline GLSL).
 *
 * Blocks:
 *  1. Config        particle counts, colours, motion and mouse settings
 *  2. Shaders       vertex (noise + sine waves + orbital rotation + mouse) and fragment (soft round points)
 *  3. Quality       device detection → particle count
 *  4. Scene         renderer, camera, particle geometry
 *  5. Loop          animation, pause when hidden, reduced motion, resize, teardown
 *  6. Boot          wait for Three.js (100 ms × 40), otherwise keep the CSS gradient fallback
 *
 * The chosen quality is written to <html data-bg3d="quality:count"> for debugging.
 */
'use strict';

(() => {
  /* =====================================================================
   * 1. Config
   * ===================================================================== */
  const CONFIG = {
    counts: { low: 1200, medium: 2500, high: 4000 },
    maxPixelRatio: 2,
    // Weighted palette: electric cyan, neon purple, cyan, soft white
    colors: [
      { hex: '#00D4FF', weight: 0.35 },
      { hex: '#8B5CF6', weight: 0.3 },
      { hex: '#06B6D4', weight: 0.25 },
      { hex: '#F8FAFC', weight: 0.1 },
    ],
    radius: 42,              // particles fill a disc in the XY plane (covers the viewport diagonal)
    depth: [-16, 10],        // z range
    pointSize: 7,
    rotationSpeed: 0.018,    // radians per second around the view axis
    mouse: { radius: 7, strength: 3.2, ease: 0.08 }, // strength > 0 pushes away, < 0 pulls toward
    camera: { fov: 55, z: 34 },
    staticTime: 12,          // shader time used for the single reduced-motion frame
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
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    uniform float uRotation;
    uniform vec2 uMouse;
    uniform float uMouseRadius;
    uniform float uMouseStrength;

    attribute vec3 aColor;
    attribute float aSeed;
    attribute float aScale;

    varying vec3 vColor;
    varying float vAlpha;

    ${NOISE_GLSL}

    void main() {
      vec3 p = position;
      float t = uTime;

      // Slow orbital rotation around the view axis; inner particles turn a little faster
      float angle = t * uRotation * (0.7 + 0.6 * aSeed);
      float c = cos(angle);
      float s = sin(angle);
      p.xy = mat2(c, s, -s, c) * p.xy;

      // Sine waves
      p.y += sin(t * 0.55 + p.x * 0.14 + aSeed * 6.2831) * 0.9;
      p.x += cos(t * 0.35 + p.y * 0.11 + aSeed * 3.1415) * 0.6;

      // Noise drift
      vec3 q = p * 0.055;
      p += vec3(
        snoise(q + vec3(t * 0.04, 0.0, 0.0)),
        snoise(q + vec3(0.0, t * 0.04, 17.0)),
        snoise(q + vec3(31.0, 0.0, t * 0.04))
      ) * 1.8;

      // Mouse / touch: push particles away (or pull, with negative strength)
      vec2 d = p.xy - uMouse;
      float dist = length(d);
      float influence = smoothstep(uMouseRadius, 0.0, dist);
      p.xy += (d / max(dist, 0.0001)) * influence * uMouseStrength;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(uSize * aScale * uPixelRatio * (24.0 / -mv.z), 28.0 * uPixelRatio);

      vColor = aColor;
      // Gentle twinkle plus a brightness boost near the cursor
      vAlpha = (0.45 + 0.35 * sin(t * 1.3 + aSeed * 40.0)) + influence * 0.4;
    }
  `;

  const FRAGMENT_SHADER = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Soft round point
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float strength = pow(1.0 - d * 2.0, 1.6);
      gl_FragColor = vec4(vColor, strength * vAlpha);
    }
  `;

  /* =====================================================================
   * 3. Quality detection
   * ===================================================================== */
  function getWebGLContext() {
    try {
      const canvas = document.createElement('canvas');
      return canvas.getContext('webgl2') || canvas.getContext('webgl');
    } catch {
      return null;
    }
  }

  function gpuName(gl) {
    // Firefox exposes the real renderer via RENDERER and warns when the debug extension is used
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (!isFirefox) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    }
    return String(gl.getParameter(gl.RENDERER) || '');
  }

  function detectQuality() {
    const gl = getWebGLContext();
    if (!gl) return { quality: 'none', count: 0 };

    const isMobile =
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    let quality = 'medium';
    if (isMobile) {
      quality = 'low';
    } else if (/RTX|Radeon RX|Radeon Pro|Apple M\d|Apple GPU|GTX 1[06-9]\d0|GTX 16\d0|Arc A\d/i.test(gpuName(gl))) {
      quality = 'high';
    }

    // Release the probe context
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();

    return { quality, count: CONFIG.counts[quality] };
  }

  /* =====================================================================
   * 4. Scene
   * ===================================================================== */
  function pickColor(THREE, palette) {
    let r = Math.random();
    for (const c of palette) {
      if ((r -= c.weight) <= 0) return c.color;
    }
    return palette[palette.length - 1].color;
  }

  function createParticles(THREE, count) {
    const palette = CONFIG.colors.map((c) => ({ weight: c.weight, color: new THREE.Color(c.hex) }));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);
    const [zMin, zMax] = CONFIG.depth;

    for (let i = 0; i < count; i++) {
      // Uniform distribution over a disc in XY
      const r = CONFIG.radius * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);

      const color = pickColor(THREE, palette);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      seeds[i] = Math.random();
      scales[i] = 0.5 + Math.random() * Math.random() * 1.6; // mostly small, a few large
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: CONFIG.pointSize },
        uRotation: { value: CONFIG.rotationSpeed },
        uMouse: { value: new THREE.Vector2(9999, 9999) },
        uMouseRadius: { value: CONFIG.mouse.radius },
        uMouseStrength: { value: CONFIG.mouse.strength },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material, points: new THREE.Points(geometry, material) };
  }

  /* =====================================================================
   * 5. Background controller: loop, visibility, motion, resize, teardown
   * ===================================================================== */
  function start(THREE) {
    const { quality, count } = detectQuality();
    document.documentElement.dataset.bg3d = `${quality}:${count}`;
    if (!count) return; // No WebGL: the CSS gradient stays as the background

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch {
      document.documentElement.dataset.bg3d = 'none:0';
      return;
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

    const { geometry, material, points } = createParticles(THREE, count);
    material.uniforms.uPixelRatio.value = pixelRatio;
    scene.add(points);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let elapsed = 0;
    let frameId = 0;
    let running = false;

    // Mouse target in world units on the z = 0 plane, eased toward each frame
    const mouseTarget = new THREE.Vector2(9999, 9999);
    const mouse = material.uniforms.uMouse.value;

    function halfExtents() {
      const halfH = Math.tan(THREE.MathUtils.degToRad(CONFIG.camera.fov / 2)) * CONFIG.camera.z;
      return { halfW: halfH * camera.aspect, halfH };
    }

    function setPointer(clientX, clientY) {
      const { halfW, halfH } = halfExtents();
      mouseTarget.set((clientX / window.innerWidth) * 2 * halfW - halfW, -((clientY / window.innerHeight) * 2 * halfH - halfH));
      // Jump straight to the first position instead of sweeping in from far away
      if (mouse.x > 9000) mouse.copy(mouseTarget);
    }
    const clearPointer = () => mouseTarget.set(9999, 9999);

    const onPointerMove = (e) => setPointer(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    };

    function renderFrame() {
      renderer.render(scene, camera);
    }

    function tick() {
      frameId = requestAnimationFrame(tick);
      elapsed += Math.min(clock.getDelta(), 0.1); // clamp long gaps (tab switches)
      material.uniforms.uTime.value = elapsed;
      if (mouseTarget.x > 9000) {
        mouse.set(9999, 9999);
      } else {
        mouse.lerp(mouseTarget, CONFIG.mouse.ease);
      }
      renderFrame();
    }

    function play() {
      if (running || reduceMotion.matches || document.hidden) return;
      running = true;
      clock.getDelta(); // reset delta so time does not jump
      tick();
    }

    function pause() {
      running = false;
      cancelAnimationFrame(frameId);
    }

    function renderStatic() {
      pause();
      material.uniforms.uTime.value = CONFIG.staticTime;
      mouse.set(9999, 9999);
      renderFrame();
    }

    function applyMotionPreference() {
      if (reduceMotion.matches) renderStatic();
      else play();
    }

    const onVisibility = () => (document.hidden ? pause() : play());

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (!running) renderFrame();
      }, 120);
    };

    // Stop on GPU context loss; the gradient fallback shows through the transparent canvas
    const onContextLost = (e) => {
      e.preventDefault();
      pause();
    };

    function dispose() {
      pause();
      clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', clearPointer);
      document.documentElement.removeEventListener('mouseleave', clearPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceMotion.removeEventListener('change', applyMotionPreference);
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
    document.documentElement.addEventListener('mouseleave', clearPointer);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    reduceMotion.addEventListener('change', applyMotionPreference);
    canvas.addEventListener('webglcontextlost', onContextLost);
    // Tear down when the page is really unloaded (not when it goes into the back/forward cache)
    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) dispose();
    });

    applyMotionPreference();
    window.Background3D = { dispose, quality, count };
  }

  /* =====================================================================
   * 6. Boot: wait for Three.js
   * ===================================================================== */
  let attempts = 0;
  (function waitForThree() {
    if (window.THREE) return start(window.THREE);
    if (++attempts >= CONFIG.retry.attempts) {
      // Three.js never loaded: keep the CSS gradient background, page works without 3D
      document.documentElement.dataset.bg3d = 'unavailable:0';
      return;
    }
    setTimeout(waitForThree, CONFIG.retry.interval);
  })();
})();
