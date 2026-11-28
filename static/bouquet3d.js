/* 3D glowing bouquets (three.js r128). Two separate builders: buildDion() and buildEunice(). */
(() => {
  const T = window.THREE;
  if (!T) { console.warn('three.js did not load'); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const UP = new T.Vector3(0, 1, 0);
  const V = (x, y, z) => new T.Vector3(x, y, z);

  let renderer, scene, camera, group, pts, raf = 0, t0 = 0, last = 0, ro = null;
  let updaters = [], spin = -0.6, dragging = false, lastX = 0, bound = false;
  let glowTex, dotTex;

  /* ---------- helpers ---------- */
  function radialTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, a]) => g.addColorStop(o, `rgba(255,255,255,${a})`));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  function halo(hex, size, opacity) {
    const m = new T.SpriteMaterial({ map: glowTex, color: hex, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
    const s = new T.Sprite(m); s.scale.set(size, size, 1); s.userData.base = opacity; return s;
  }

  // one curved, pointed petal/leaf blade, base at origin, pointing +Y, "outward" = +Z
  function petalGeo({ len = 1, width = 0.3, bulge = 0, curl = 0, cup = 0, tip = 0.85 }) {
    const SX = 8, SY = 14, pos = [], uv = [], idx = [];
    for (let j = 0; j <= SY; j++) {
      const y = j / SY;
      const w = width * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(y, tip))), 0.85) + 1e-4;
      for (let i = 0; i <= SX; i++) {
        const x = (i / SX) * 2 - 1, px = x * w;
        pos.push(px, len * y, bulge * len * Math.sin(Math.PI * Math.min(1, y * 0.9)) + curl * len * y * y - (cup * px * px) / width);
        uv.push(x, y);
      }
    }
    for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) {
      const a = j * (SX + 1) + i, b = a + 1, c = a + SX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function paint(geo, hex, mode) {
    const c = new T.Color(hex), white = new T.Color(1, 1, 1), tmp = new T.Color();
    const uv = geo.attributes.uv, arr = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) {
      const x = uv.getX(i), y = uv.getY(i);
      if (mode === 'lily') {                       // white throat + white centre stripe, blue tips
        tmp.copy(white).lerp(c, ease(y * 1.8 - 0.15) * 0.85 + 0.15);
        tmp.lerp(white, clamp(1 - Math.abs(x) * 3.2) * clamp(1 - y * 1.1) * 0.75);
      } else if (mode === 'tulip') {               // paler at the base, richer at the rim
        tmp.copy(white).lerp(c, 0.55 + 0.45 * ease(y * 1.3));
      } else {                                      // leaf
        tmp.copy(c).multiplyScalar(0.8 + 0.3 * y).lerp(white, clamp(1 - Math.abs(x) * 8) * 0.2);
      }
      arr.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3)); return geo;
  }
  const petalMat = (hex) => new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.5, metalness: 0, emissive: new T.Color(hex), emissiveIntensity: 0.3 });
  const stemMat = () => new T.MeshStandardMaterial({ color: 0x86ab8b, roughness: 0.6, emissive: 0x3d6b4a, emissiveIntensity: 0.25 });

  /* ---------- flower models ---------- */
  function makeTulip(hex) {
    const g = new T.Group(), m = petalMat(hex), petals = [];
    const go = paint(petalGeo({ len: 1.2, width: 0.36, bulge: 0.2, curl: 0.1, cup: 0.5 }), hex, 'tulip');
    const gi = paint(petalGeo({ len: 1.1, width: 0.33, bulge: 0.16, curl: 0.04, cup: 0.5 }), hex, 'tulip');
    for (let k = 0; k < 6; k++) {
      const pivot = new T.Group(); pivot.rotation.y = (k * Math.PI) / 3;
      const mesh = new T.Mesh(k % 2 ? gi : go, m); mesh.position.z = 0.05;
      pivot.add(mesh); g.add(pivot); petals.push({ mesh, closed: -0.22, open: 0.2 });
    }
    return { hex, group: g, petals, mats: [m], glowY: 0.55, haloSize: 2.1, size: 0.9, extra: null };
  }
  function makeLily(hex) {
    const g = new T.Group(), m = petalMat(hex), petals = [];
    const go = paint(petalGeo({ len: 1.45, width: 0.46, curl: 0.55, cup: 0.6 }), hex, 'lily');
    const gi = paint(petalGeo({ len: 1.3, width: 0.44, curl: 0.5, cup: 0.6 }), hex, 'lily');
    for (let k = 0; k < 6; k++) {
      const pivot = new T.Group(); pivot.rotation.y = (k * Math.PI) / 3;
      const mesh = new T.Mesh(k % 2 ? gi : go, m);
      pivot.add(mesh); g.add(pivot); petals.push({ mesh, closed: 0.05, open: k % 2 ? 0.8 : 0.95 });
    }
    const stam = new T.Group(), gold = new T.MeshStandardMaterial({ color: 0xf3e3a0, emissive: 0xd9b95c, emissiveIntensity: 0.6 });
    const fil = new T.CylinderGeometry(0.012, 0.012, 0.8, 5); fil.translate(0, 0.4, 0);
    const anth = new T.SphereGeometry(0.045, 8, 6);
    for (let k = 0; k < 6; k++) {
      const p = new T.Group(); p.rotation.y = (k * Math.PI) / 3 + 0.26;
      const f = new T.Mesh(fil, gold); f.rotation.x = 0.28;
      const a = new T.Mesh(anth, gold); a.position.y = 0.8; f.add(a); p.add(f); stam.add(p);
    }
    const pist = new T.Mesh(fil.clone().scale(1.4, 1.2, 1.4), new T.MeshStandardMaterial({ color: 0xeaf4e0, emissive: 0xffffff, emissiveIntensity: 0.3 }));
    stam.add(pist); g.add(stam);
    return { hex, group: g, petals, mats: [m, gold], glowY: 0.3, haloSize: 3.1, size: 0.64, extra: stam };
  }

  /* ---------- scene pieces ---------- */
  function addStemCurve(curve, delay, r = 0.035) {
    const geo = new T.TubeGeometry(curve, 28, r, 6, false);
    group.add(new T.Mesh(geo, stemMat()));
    updaters.push((t) => geo.setDrawRange(0, Math.floor(ease((t - delay) / 1.8) * 28) * 36));
    return curve;
  }
  function addStem(to, delay) {
    const from = V(0, -1.15, 0);
    const ctrl = V(to.x * 0.5, (from.y + to.y) / 2 + 0.2, to.z * 0.5);
    return addStemCurve(new T.QuadraticBezierCurve3(from, ctrl, to), delay);
  }
  function addHead(curve, fl, delay, phase) {
    const g = fl.group;
    g.position.copy(curve.getPoint(1));
    g.quaternion.setFromUnitVectors(UP, curve.getTangent(1).normalize());
    g.rotateY(phase * 3);
    const h = halo(fl.hex, fl.haloSize, 0.4); h.position.y = fl.glowY; g.add(h);
    group.add(g);
    updaters.push((t) => {
      const o = ease((t - delay - 1.5) / 3.2);                    // slow bloom
      g.visible = o > 0;
      g.scale.setScalar(fl.size * (0.2 + 0.8 * ease(o * 1.4)));
      const breathe = Math.sin(t * 0.8 + phase) * 0.025;
      fl.petals.forEach((p) => { p.mesh.rotation.x = lerp(p.closed, p.open, o) + breathe * o; });
      if (fl.extra) fl.extra.scale.setScalar(0.2 + 0.8 * o);
      const pulse = Math.sin(t * 1.4 + phase);
      fl.mats[0].emissiveIntensity = 0.3 + 0.14 * pulse;
      h.material.opacity = h.userData.base * o * (0.8 + 0.2 * pulse);
    });
  }
  function addLeaf(len, width, hex, ang, tilt, y0, delay) {
    const pivot = new T.Group(); pivot.position.y = y0; pivot.rotation.y = ang;
    const mesh = new T.Mesh(
      paint(petalGeo({ len, width, curl: 0.45, cup: 0.3, tip: 0.7 }), hex, 'leaf'),
      new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.6, emissive: 0x2f5a3c, emissiveIntensity: 0.2 }));
    mesh.rotation.x = tilt; pivot.add(mesh); group.add(pivot);
    updaters.push((t) => pivot.scale.setScalar(0.01 + 0.99 * ease((t - delay) / 1.8)));
  }
  function addWrapper(topHex, botHex, ribbonHex) {
    const wr = new T.Group(); wr.position.y = -1.9;
    const geo = new T.CylinderGeometry(1.1, 0.25, 2.0, 28, 6, true), p = geo.attributes.position;
    const ct = new T.Color(topHex), cb = new T.Color(botHex), col = new Float32Array(p.count * 3), tmp = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = (y + 1) / 2, a = Math.atan2(z, x);
      const s = 1 + 0.09 * Math.sin(a * 6) * f;
      p.setXYZ(i, x * s, y + 0.05 * Math.sin(a * 6) * f, z * s);
      tmp.copy(cb).lerp(ct, f); col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const cone = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, flatShading: true, roughness: 0.7, emissive: new T.Color(topHex), emissiveIntensity: 0.14 }));
    cone.position.y = 1; wr.add(cone);
    const rm = new T.MeshStandardMaterial({ color: ribbonHex, roughness: 0.4, emissive: ribbonHex, emissiveIntensity: 0.25 });
    const ring = new T.Mesh(new T.TorusGeometry(0.68, 0.05, 8, 40), rm); ring.rotation.x = Math.PI / 2; ring.position.y = 0.92; wr.add(ring);
    const loop = new T.SphereGeometry(0.2, 12, 8);
    [-1, 1].forEach((s) => { const l = new T.Mesh(loop, rm); l.scale.set(1.5, 0.6, 0.5); l.position.set(s * 0.22, 0.92, 0.72); l.rotation.z = s * 0.45; wr.add(l); });
    const knot = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), rm); knot.position.set(0, 0.92, 0.74); wr.add(knot);
    group.add(wr);
    updaters.push((t) => wr.scale.setScalar(0.01 + 0.99 * ease(t / 0.9)));
  }

  /* ---------- DION: soft tulips, green wrapper ---------- */
  function buildDion() {
    const cols = ['#f4b9cc', '#a9d4ee', '#c7acea', '#b8dff0', '#f6c9d8', '#cdb8ee'];
    const spots = [[0, 2.7, 0]];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; spots.push([Math.cos(a) * 0.95, 2.3, Math.sin(a) * 0.95]); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.9; spots.push([Math.cos(a) * 1.65, 1.65, Math.sin(a) * 1.65]); }
    spots.forEach((p, i) => {
      const curve = addStem(V(...p), i * 0.12);
      addHead(curve, makeTulip(cols[i % cols.length]), i * 0.12, i * 1.7);
    });
    for (let k = 0; k < 6; k++) addLeaf(2.3, 0.26, '#86ab8b', (k * Math.PI) / 3 + 0.2, 0.5, -0.8, 0.6 + k * 0.1);
    addWrapper('#e1ecd9', '#a9c4a8', '#f4c3d2');
    return { glow: 0xf3c4dc, light: 0xffd6e8, dust: 0xffe3a6 };
  }

  /* ---------- EUNICE: blue lilies + lily of the valley, blue wrapper ---------- */
  function makeBell() {
    const pts = [[0.002, 0.09], [0.05, 0.085], [0.085, 0.04], [0.09, -0.03], [0.115, -0.07], [0.09, -0.085]].map(([r, y]) => new T.Vector2(r, y));
    return new T.LatheGeometry(pts, 12);
  }
  function buildEunice() {
    const cols = ['#a4cdea', '#b9daf1', '#9fc8e8', '#c2e0f3'];
    const spots = [[0, 2.9, 0, 0.7]];
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; spots.push([Math.cos(a) * 1.3, 2.35, Math.sin(a) * 1.3, 0.62]); }
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 1.2; spots.push([Math.cos(a) * 1.9, 1.55, Math.sin(a) * 1.9, 0.6]); }
    spots.forEach((p, i) => {
      const curve = addStem(V(p[0], p[1], p[2]), i * 0.14);
      const fl = makeLily(cols[i % cols.length]); fl.size = p[3];
      addHead(curve, fl, i * 0.14, i * 1.3);
    });
    // lily of the valley: arching sprigs hung with tiny glowing bells
    const bellGeo = makeBell();
    const bellMat = new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.35, emissive: 0xcfe6f7, emissiveIntensity: 0.45 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.7, c = Math.cos(a), s = Math.sin(a), d = 1.2 + k * 0.15;
      const curve = new T.CatmullRomCurve3([V(0, -1.1, 0), V(c * 0.5, 0.5, s * 0.5), V(c * 1.0, 1.35, s * 1.0), V(c * 1.45, 1.15, s * 1.45)]);
      addStemCurve(curve, d, 0.022);
      for (let b = 0; b < 6; b++) {
        const tt = 0.5 + b * 0.1, bell = new T.Mesh(bellGeo, bellMat);
        const pt = curve.getPoint(tt); bell.position.set(pt.x, pt.y - 0.09, pt.z);
        const h = halo(0xcfe6f7, 0.55, 0.22); h.position.copy(bell.position);
        group.add(bell, h);
        const bd = d + 1.6 + b * 0.18, size = 1 - b * 0.05;
        updaters.push((t) => { const o = ease((t - bd) / 1.4); bell.scale.setScalar(Math.max(0.01, o * size * 1.6)); h.material.opacity = 0.22 * o; });
      }
    }
    for (let k = 0; k < 5; k++) addLeaf(2.1, 0.5, '#8fb59a', (k * 2 * Math.PI) / 5 + 0.35, 0.45, -0.75, 0.6 + k * 0.1);
    addWrapper('#e3f1f7', '#a6c8dc', '#ffffff');
    return { glow: 0xa9d3f2, light: 0xcfe8ff, dust: 0xcfe8ff };
  }

  /* ---------- lifecycle ---------- */
  function fit() {
    const c = renderer.domElement, w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = reduce ? 20 : (now - t0) / 1000;
    updaters.forEach((u) => u(t, dt));
    if (!dragging && !reduce) spin += dt * 0.32;
    group.rotation.y = spin; group.position.y = Math.sin(t * 0.9) * 0.04;
    pts.rotation.y -= dt * 0.06; pts.material.opacity = 0.7 + 0.25 * Math.sin(t * 1.7);
    renderer.render(scene, camera);
  }
  function bindDrag(c) {
    if (bound) return; bound = true;
    c.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (dragging) { spin += (e.clientX - lastX) * 0.012; lastX = e.clientX; } });
    const up = () => { dragging = false; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }

  function show(canvas, friend) {
    hide();
    if (!renderer) {
      try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
      catch (e) { console.error('WebGL unavailable', e); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
    }
    glowTex = glowTex || radialTex([[0, 0.9], [0.3, 0.35], [1, 0]]);
    dotTex = dotTex || radialTex([[0, 1], [0.4, 0.5], [1, 0]]);

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.5, 11.5); camera.lookAt(0, 0.85, 0);
    group = new T.Group(); scene.add(group); updaters = [];

    const theme = friend === 'eunice' ? buildEunice() : buildDion();

    scene.add(new T.HemisphereLight(0xffffff, 0xe6e0f0, 1.05));
    const sun = new T.DirectionalLight(0xffffff, 0.7); sun.position.set(3, 5, 4); scene.add(sun);
    const inner = new T.PointLight(theme.light, 1.2, 7); inner.position.set(0, 1.8, 0); group.add(inner);

    const back = halo(theme.glow, 8, 0.28); back.position.set(0, 1.4, -1.5); scene.add(back);   // soft aura behind
    const n = 70, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.3 + Math.random() * 1.5, a = Math.random() * Math.PI * 2;
      arr.set([Math.cos(a) * r, -0.6 + Math.random() * 4.6, Math.sin(a) * r], i * 3);
    }
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(arr, 3));
    pts = new T.Points(pg, new T.PointsMaterial({ size: 0.16, map: dotTex, color: theme.dust, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
    scene.add(pts);

    canvas.setAttribute('aria-label', friend === 'eunice' ? 'A glowing 3D bouquet of blue lilies and lily of the valley' : 'A glowing 3D bouquet of soft pastel tulips');
    bindDrag(canvas);
    ro = new ResizeObserver(fit); ro.observe(canvas); fit();
    spin = -0.6; t0 = last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function hide() {
    cancelAnimationFrame(raf); raf = 0;
    if (ro) { ro.disconnect(); ro = null; }
    if (scene) {
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      scene = null;
    }
    updaters = [];
  }

  window.Bouquet3D = { show, hide };
})();