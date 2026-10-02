/*
 * hero-3d.js
 * Hero scene: a wireframe quadcopter built from Three.js primitives
 * (body, four arms, four rotor discs, two landing skids, a gimbal) over a faint ground grid and a cyan glow.
 *
 * Behaviour
 *  - Lazy start: the scene is built the first time the hero is visible; it runs only while visible.
 *  - Idle hover bob and yaw; rotors spin faster with scroll velocity.
 *  - Tilts toward the cursor; on desktop it can be dragged to rotate and eases back on release.
 *  - Stops with the 3D toggle (fx3d:change) and when the tab is hidden; one static frame under reduced motion.
 *
 * Blocks: 1. Config · 2. Model · 3. Scene and loop · 4. Boot
 */
'use strict';

(() => {
  /* =====================================================================
   * 1. Config
   * ===================================================================== */
  const CONFIG = {
    colors: { body: 0x00d4ff, rotor: 0x8b5cf6, accent: 0x06b6d4, soft: 0xe6edf7 },
    armLength: 1.9,
    yawSpeed: 0.22,          // radians per second
    rotorSpeed: 24,          // radians per second at rest
    rotorBoostMax: 3,        // extra multiples of rotorSpeed at high scroll speed
    scrollForFullBoost: 2400, // px per second
    maxTilt: 0.3,
    tiltEase: 0.06,
    dragSensitivity: 0.008,  // radians per pixel
    dragReturnEase: 0.06,
    maxPixelRatio: 2,
    maxPixelRatioPhone: 1.5,
  };

  /* =====================================================================
   * 2. Model
   * ===================================================================== */
  function buildDrone(THREE) {
    const C = CONFIG.colors;
    const lineMat = (color, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    const edges = (geometry, color, opacity) => {
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), lineMat(color, opacity));
      geometry.dispose();
      return line;
    };
    const wire = (geometry, color, opacity) => {
      const line = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMat(color, opacity));
      geometry.dispose();
      return line;
    };

    const drone = new THREE.Group();
    const rotors = [];

    // Body and canopy
    drone.add(edges(new THREE.CylinderGeometry(0.75, 0.9, 0.35, 8), C.body));
    const canopy = wire(new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), C.accent, 0.6);
    canopy.position.y = 0.17;
    drone.add(canopy);

    // Arms, motors and rotor discs
    const L = CONFIG.armLength;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));

      const arm = edges(new THREE.BoxGeometry(L, 0.1, 0.14), C.body);
      arm.position.copy(dir).multiplyScalar(L / 2 + 0.55);
      arm.rotation.y = -a;
      drone.add(arm);

      const tip = dir.clone().multiplyScalar(L + 0.55);
      const motor = edges(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 10), C.accent);
      motor.position.copy(tip).setY(0.08);
      drone.add(motor);

      // Translucent disc + rim + two blades that spin
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 40),
        new THREE.MeshBasicMaterial({ color: C.rotor, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(tip).setY(0.27);
      drone.add(disc);
      const rim = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 40 }, (_, k) => new THREE.Vector3(Math.cos((k / 40) * Math.PI * 2) * 0.85, 0, Math.sin((k / 40) * Math.PI * 2) * 0.85))
        ),
        lineMat(C.rotor, 0.55)
      );
      rim.position.copy(tip).setY(0.27);
      drone.add(rim);

      const rotor = new THREE.Group();
      rotor.position.copy(tip).setY(0.28);
      rotor.add(edges(new THREE.BoxGeometry(1.5, 0.02, 0.12), C.rotor));
      rotor.userData.direction = i % 2 === 0 ? 1 : -1; // diagonal pairs counter-rotate
      rotors.push(rotor);
      drone.add(rotor);
    }

    // Two landing skids with struts
    for (const side of [-1, 1]) {
      const skid = edges(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), C.accent, 0.85);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(side * 0.65, -0.75, 0);
      drone.add(skid);
      for (const end of [-1, 1]) {
        const strut = edges(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), C.accent, 0.85);
        strut.position.set(side * 0.55, -0.45, end * 0.5);
        strut.rotation.z = side * 0.35;
        drone.add(strut);
      }
    }

    // Gimbal
    const gimbal = wire(new THREE.SphereGeometry(0.22, 8, 6), C.soft, 0.7);
    gimbal.position.y = -0.38;
    drone.add(gimbal);

    return { drone, rotors };
  }

  /** Soft radial glow texture drawn on a canvas (no image files). */
  function glowTexture(THREE) {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0, 212, 255, 0.55)');
    g.addColorStop(0.45, 'rgba(0, 212, 255, 0.12)');
    g.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  /* =====================================================================
   * 3. Scene and loop
   * ===================================================================== */
  function createHero(THREE, container) {
    const phone = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !phone, alpha: true });
    } catch (err) {
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? CONFIG.maxPixelRatioPhone : CONFIG.maxPixelRatio));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 2.8, 10.6);
    camera.lookAt(0, -0.3, 0);

    // tilt (cursor) → drag (user rotation) → yaw (idle spin) → hover (bob) → drone
    const tilt = new THREE.Group();
    const drag = new THREE.Group();
    const yaw = new THREE.Group();
    const hover = new THREE.Group();
    const { drone, rotors } = buildDrone(THREE);
    hover.add(drone);
    yaw.add(hover);
    drag.add(yaw);
    tilt.add(drag);
    scene.add(tilt);
    yaw.rotation.y = 0.6;

    // Ground grid and glow
    const grid = new THREE.GridHelper(6.4, 16, CONFIG.colors.accent, CONFIG.colors.accent);
    grid.material.transparent = true;
    grid.material.opacity = 0.12;
    grid.position.y = -1.9;
    scene.add(grid);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshBasicMaterial({ map: glowTexture(THREE), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -1.88;
    scene.add(glow);

    /* ----- Sizing ----- */
    function resize() {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    }

    /* ----- Inputs: cursor tilt, drag rotation, scroll velocity ----- */
    const target = { x: 0, z: 0 };
    const dragState = { active: false, x: 0, y: 0, yaw: 0, pitch: 0 };
    const scrollState = { lastY: window.scrollY, lastT: performance.now(), boost: 0, targetBoost: 0 };

    // Desktop only: tilt toward the mouse and drag to rotate. Touch gets the idle animation and
    // keeps native scrolling (the canvas never captures touches; CSS sets touch-action: pan-y).
    const onPointerMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = ny * CONFIG.maxTilt;
      target.z = -nx * CONFIG.maxTilt;
      if (dragState.active) {
        dragState.yaw += (e.clientX - dragState.x) * CONFIG.dragSensitivity;
        dragState.pitch = Math.max(-0.6, Math.min(0.6, dragState.pitch + (e.clientY - dragState.y) * CONFIG.dragSensitivity));
        dragState.x = e.clientX;
        dragState.y = e.clientY;
      }
    };
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (finePointer.matches) container.classList.add('is-draggable');
    const onPointerDown = (e) => {
      if (!finePointer.matches || e.pointerType !== 'mouse' || e.button !== 0) return;
      dragState.active = true;
      dragState.x = e.clientX;
      dragState.y = e.clientY;
      container.classList.add('is-dragging');
      container.setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => {
      dragState.active = false;
      container.classList.remove('is-dragging');
    };
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(now - scrollState.lastT, 1) / 1000;
      const v = Math.abs(window.scrollY - scrollState.lastY) / dt;
      scrollState.lastY = window.scrollY;
      scrollState.lastT = now;
      scrollState.targetBoost = Math.min(v / CONFIG.scrollForFullBoost, 1) * CONFIG.rotorBoostMax;
    };

    /* ----- Loop ----- */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let elapsed = 0;
    let frameId = 0;
    let running = false;
    let onScreen = false;
    let enabled = document.documentElement.dataset.fx !== 'off';

    function tick() {
      frameId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.1);
      elapsed += dt;

      // Scroll boost decays back to idle
      scrollState.boost += (scrollState.targetBoost - scrollState.boost) * 0.08;
      scrollState.targetBoost *= 0.92;
      const rotorSpeed = CONFIG.rotorSpeed * (1 + scrollState.boost);
      for (const r of rotors) r.rotation.y += r.userData.direction * rotorSpeed * dt;

      yaw.rotation.y += CONFIG.yawSpeed * dt;
      hover.position.y = Math.sin(elapsed * 1.6) * 0.12;

      tilt.rotation.x += (target.x - tilt.rotation.x) * CONFIG.tiltEase;
      tilt.rotation.z += (target.z - tilt.rotation.z) * CONFIG.tiltEase;

      // Drag rotation; eases back when released
      if (!dragState.active) {
        dragState.yaw *= 1 - CONFIG.dragReturnEase;
        dragState.pitch *= 1 - CONFIG.dragReturnEase;
      }
      drag.rotation.y = dragState.yaw;
      drag.rotation.x = dragState.pitch;

      renderer.render(scene, camera);
    }

    function update() {
      renderer.domElement.hidden = !enabled;
      const shouldRun = enabled && onScreen && !document.hidden && !reduceMotion.matches;
      if (shouldRun && !running) {
        running = true;
        clock.getDelta();
        tick();
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frameId);
      }
      if (!running && enabled) renderer.render(scene, camera); // correct static frame
    }

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      update();
    });
    io.observe(container);
    // ResizeObserver where available (iOS 13.4+), window resize otherwise
    const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container);
    else window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    const onToggle = (e) => {
      enabled = !!e.detail.enabled;
      update();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('fx3d:change', onToggle);
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', update);

    function dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      io.disconnect();
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('fx3d:change', onToggle);
      document.removeEventListener('visibilitychange', update);
      reduceMotion.removeEventListener('change', update);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) dispose();
    });

    resize();
    return { dispose, isRunning: () => running };
  }

  /* =====================================================================
   * 4. Boot: main.js loads Three.js first; build the scene the first time the hero is visible
   * ===================================================================== */
  const container = document.getElementById('hero-3d');
  if (window.THREE && container && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      window.Hero3D = createHero(window.THREE, container);
    });
    io.observe(container);
  }
})();
