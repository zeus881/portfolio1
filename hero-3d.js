/*
 * hero-3d.js
 * Hero scene: a wireframe quadcopter built from Three.js primitives.
 * Body, four arms, four motors with spinning rotors and prop guards, landing skids and a gimbal.
 * It rotates slowly, hovers, and tilts toward the mouse.
 *
 * Blocks:
 *  1. Config
 *  2. Model     builds the drone from primitives
 *  3. Scene     renderer, camera, holographic ground rings
 *  4. Loop      animation; runs only while the hero is on screen and the tab is visible
 *  5. Boot      waits for Three.js and the #hero-3d container
 */
'use strict';

(() => {
  /* =====================================================================
   * 1. Config
   * ===================================================================== */
  const CONFIG = {
    colors: { body: 0x00d4ff, rotor: 0x8b5cf6, accent: 0x06b6d4, soft: 0xf8fafc },
    armLength: 1.9,
    spinSpeed: 0.25,      // radians per second, whole drone
    rotorSpeed: 28,       // radians per second
    maxTilt: 0.35,        // radians
    tiltEase: 0.06,
    maxPixelRatio: 2,
    retry: { interval: 100, attempts: 40 },
  };

  /* =====================================================================
   * 2. Model
   * ===================================================================== */
  function buildDrone(THREE) {
    const C = CONFIG.colors;
    const materials = new Map();
    const lineMat = (color, opacity = 1) => {
      const key = `${color}:${opacity}`;
      if (!materials.has(key)) {
        materials.set(key, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
      }
      return materials.get(key);
    };
    // Outline of a solid primitive
    const edges = (geometry, color, opacity) => {
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), lineMat(color, opacity));
      geometry.dispose();
      return line;
    };
    // Full wireframe of a curved primitive
    const wire = (geometry, color, opacity) => {
      const line = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMat(color, opacity));
      geometry.dispose();
      return line;
    };
    const circle = (radius, segments, color, opacity) => {
      const pts = [];
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color, opacity));
    };

    const drone = new THREE.Group();
    const rotors = [];

    // Body: octagonal frame plus a canopy dome
    drone.add(edges(new THREE.CylinderGeometry(0.75, 0.9, 0.35, 8), C.body));
    const canopy = wire(new THREE.SphereGeometry(0.52, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), C.accent, 0.65);
    canopy.position.y = 0.17;
    drone.add(canopy);

    // Arms, motors, rotors and prop guards
    const L = CONFIG.armLength;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));

      const arm = edges(new THREE.BoxGeometry(L, 0.1, 0.14), C.body);
      arm.position.copy(dir).multiplyScalar(L / 2 + 0.55);
      arm.rotation.y = -a;
      drone.add(arm);

      const motorPos = dir.clone().multiplyScalar(L + 0.55);
      const motor = edges(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 10), C.accent);
      motor.position.copy(motorPos).setY(0.08);
      drone.add(motor);

      const rotor = new THREE.Group();
      rotor.position.copy(motorPos).setY(0.27);
      rotor.add(edges(new THREE.BoxGeometry(1.5, 0.02, 0.13), C.rotor));
      rotor.add(edges(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), C.soft, 0.8));
      rotor.userData.direction = i % 2 === 0 ? 1 : -1; // diagonal pairs spin in opposite directions
      rotors.push(rotor);
      drone.add(rotor);

      const guard = circle(0.85, 40, C.rotor, 0.45);
      guard.position.copy(motorPos).setY(0.27);
      drone.add(guard);
    }

    // Landing skids
    for (const side of [-1, 1]) {
      const skid = edges(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), C.accent, 0.8);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(side * 0.65, -0.75, 0);
      drone.add(skid);
      for (const end of [-1, 1]) {
        const strut = edges(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), C.accent, 0.8);
        strut.position.set(side * 0.55, -0.45, end * 0.5);
        strut.rotation.z = side * 0.35;
        drone.add(strut);
      }
    }

    // Camera gimbal under the body
    const gimbal = wire(new THREE.SphereGeometry(0.22, 8, 6), C.soft, 0.7);
    gimbal.position.y = -0.38;
    drone.add(gimbal);

    return { drone, rotors };
  }

  /* =====================================================================
   * 3–4. Scene and loop
   * ===================================================================== */
  function start(THREE, container) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      container.classList.add('hero-fallback');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
    renderer.setClearColor(0x000000, 0);
    container.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 2.8, 10.6);
    camera.lookAt(0, -0.2, 0);

    // Hierarchy: tilt (follows mouse) → spin (slow yaw) → hover (bob) → drone
    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    const hover = new THREE.Group();
    const { drone, rotors } = buildDrone(THREE);
    hover.add(drone);
    spin.add(hover);
    tilt.add(spin);
    scene.add(tilt);

    // Holographic ground rings
    const rings = new THREE.Group();
    [1.9, 2.8, 3.7].forEach((r, i) => {
      const pts = [];
      for (let k = 0; k < 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      rings.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: CONFIG.colors.accent, transparent: true, opacity: 0.35 - i * 0.09 })
        )
      );
    });
    rings.position.y = -1.9;
    scene.add(rings);

    // Default pose: slight angle so the static frame reads as 3D
    spin.rotation.y = 0.6;

    /* ----- Sizing ----- */
    function resize() {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    }

    /* ----- Mouse tilt (relative to the window) ----- */
    const target = { x: 0, z: 0 };
    const onPointerMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = ny * CONFIG.maxTilt;   // pitch toward the cursor
      target.z = -nx * CONFIG.maxTilt;  // roll toward the cursor
    };

    /* ----- Loop ----- */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let elapsed = 0;
    let frameId = 0;
    let running = false;
    let onScreen = true;

    function tick() {
      frameId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.1);
      elapsed += dt;

      spin.rotation.y += CONFIG.spinSpeed * dt;
      hover.position.y = Math.sin(elapsed * 1.6) * 0.12;
      for (const r of rotors) r.rotation.y += r.userData.direction * CONFIG.rotorSpeed * dt;
      tilt.rotation.x += (target.x - tilt.rotation.x) * CONFIG.tiltEase;
      tilt.rotation.z += (target.z - tilt.rotation.z) * CONFIG.tiltEase;
      rings.rotation.y -= dt * 0.1;

      renderer.render(scene, camera);
    }

    function update() {
      const shouldRun = onScreen && !document.hidden && !reduceMotion.matches;
      if (shouldRun && !running) {
        running = true;
        clock.getDelta();
        tick();
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frameId);
      }
      if (!running) renderer.render(scene, camera); // keep a correct static frame
    }

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      update();
    });
    io.observe(container);

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', update);

    function dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', update);
      reduceMotion.removeEventListener('change', update);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) dispose();
    });

    resize();
    update();
    window.Hero3D = { dispose, isRunning: () => running };
  }

  /* =====================================================================
   * 5. Boot
   * ===================================================================== */
  let attempts = 0;
  (function waitForThree() {
    const container = document.getElementById('hero-3d');
    if (window.THREE && container) return start(window.THREE, container);
    if (++attempts >= CONFIG.retry.attempts) {
      if (container) container.classList.add('hero-fallback');
      return;
    }
    setTimeout(waitForThree, CONFIG.retry.interval);
  })();
})();
