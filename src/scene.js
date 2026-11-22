// W.Scene.create(canvas) — Three.js r128 renderer for the "impossible world". Needs THREE, W (world.js), W.SceneFx (scene-fx.js).
(function (root) {
  const RMOT = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; // reduced motion: camera and slider moves are instant
  const T = root.THREE, W = root.W, FX = W.SceneFx, D2R = Math.PI / 180, GOLD = FX.GOLD;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), mod = (a, n) => ((a % n) + n) % n;
  const sh = {}; // shared geometries / materials (disposed in s.dispose)
  const SLATE = 0x5f6a86, GLASS = 0xaec3e6;

  function create(canvas) {
    const s = {}, pr = Math.min(root.devicePixelRatio || 1, 1.5), COSE = Math.cos(W.EL * D2R), SINE = Math.sin(W.EL * D2R);
    const renderer = new T.WebGLRenderer({ canvas, antialias: (root.devicePixelRatio || 1) < 1.75, powerPreference: 'high-performance' });
    renderer.setPixelRatio(pr); renderer.setClearColor(0x0B0D14);
    const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 300), world = new T.Group();
    scene.add(cam, world);
    const bg = FX.makeBackground('#E9C27A'); scene.add(bg);
    scene.add(new T.HemisphereLight(0xdfe6ff, 0x3a4260, 0.82));
    const sun = new T.DirectionalLight(0xfff0d8, 0.62); sun.position.set(-3, 6, 4.5); cam.add(sun, sun.target); // light lives in camera space
    const bevel = FX.bevelGeo(0.07); sh.bevel = bevel;
    sh.rim = new T.BufferGeometry().setFromPoints([[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]].map((p) => new T.Vector3(p[0] * 0.455, 0, p[1] * 0.455)));
    sh.disc = new T.CircleGeometry(0.26, 28); sh.ring = new T.RingGeometry(0.33, 0.41, 40); sh.torus = new T.TorusGeometry(0.27, 0.028, 8, 36); sh.plate = new T.CylinderGeometry(0.23, 0.25, 0.06, 20);
    sh.rail = new T.CylinderGeometry(0.014, 0.014, 1, 6); sh.grip = new T.BoxGeometry(0.34, 0.012, 0.035);
    sh.dark = new T.MeshBasicMaterial({ map: FX.glowTex(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });
    const goldMat = (o) => new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending });

    const fig = FX.makeFigure(); fig.visible = false; world.add(fig);
    const shadow = new T.Mesh(FX.plane(), sh.dark); shadow.rotation.x = -Math.PI / 2; world.add(shadow);
    const hlRing = new T.Mesh(sh.ring, goldMat(0)); hlRing.rotation.x = -Math.PI / 2; hlRing.visible = false; world.add(hlRing);
    const arrow = new T.Mesh(FX.plane(), new T.MeshBasicMaterial({ map: FX.arrowTex(), transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    arrow.rotation.x = -Math.PI / 2; arrow.renderOrder = 15; arrow.visible = false; scene.add(arrow);
    const sparks = FX.fxPoints(120, pr), motes = FX.fxPoints(44, pr); scene.add(sparks, motes);
    const sp = { v: new Float32Array(120 * 3), life: new Float32Array(120), max: new Float32Array(120), n: 0 };
    const md = []; for (let i = 0; i < 44; i++) md.push([Math.random(), Math.random(), Math.random(), Math.random() * 6.28]);

    let hooks = {}, enabled = true, level = null, st = null, tiles = {}, slv = {}, seams = {}, seamPairs = [], seamA = 1;
    let ctr = new T.Vector3(), ext = [2, 2], rad = 3, az = 45, logical = 0, camAnim = null, walkS = null, win = null, hint = null, hl = null, disposed = false;
    let time = 0, last = 0, W_ = 1, H_ = 1, figTile = null, yaw = 0, landSq = 0, drag = null, ptr = null;
    const worldDirs = (a) => ({ r: [Math.cos(a * D2R), -Math.sin(a * D2R)], f: [-Math.sin(a * D2R), -Math.cos(a * D2R)] });

    // ---------- build ----------
    function clearWorld() {
      for (const k in tiles) { world.remove(tiles[k].g); tiles[k].g.traverse((c) => { if (c.material && !Object.values(sh).includes(c.material)) c.material.dispose(); }); }
      for (const o of world.children.slice()) if (o.userData.lvl) { world.remove(o); o.traverse((c) => { if (c.material && !Object.values(sh).includes(c.material)) c.material.dispose(); }); }
      for (const k in seams) { scene.remove(seams[k].g); } tiles = {}; slv = {}; seams = {}; seamPairs = [];
    }
    const PHD = new T.RingGeometry(0.2, 0.3, 4, 1);
    function buildTile(d, hue) {
      const t = { id: d.id, d, kind: d.kind, sl: d.slider, base: d.pos, off: [0, 0, 0], open: 0, openT: 0, press: 0, pressT: 0, sweep: 2, gone: 0, goneT: 0, g: new T.Group() };
      const glass = d.kind === 'gate';
      t.mat = new T.MeshLambertMaterial({ color: glass ? GLASS : SLATE, vertexColors: true, emissive: new T.Color(hue).multiplyScalar(0.05), transparent: glass || d.kind === 'crumble' || d.kind === 'phase', opacity: glass ? 0.3 : 1, depthWrite: !glass });
      if (d.kind === 'phase') t.phc = new T.Color(d.ph ? '#FFC857' : '#6FD3E6');
      if (d.kind === 'crumble') { t.mat.color.lerp(new T.Color('#e8a66e'), 0.3); t.mat.emissive.lerp(new T.Color('#c8703a'), 0.1); }
      t.body = new T.Mesh(bevel, t.mat); t.g.add(t.body);
      const rimC = new T.Color(GOLD).lerp(new T.Color(hue), 0.35);
      t.rim = new T.LineLoop(sh.rim, new T.LineBasicMaterial({ color: rimC, transparent: true, opacity: glass ? 0.55 : 0.34 })); t.rim.position.y = 0.502; t.g.add(t.rim);
      const hc = new T.Color(hue).lerp(new T.Color(GOLD), 0.4);
      if (d.kind === 'goal') {
        t.ring = new T.Mesh(sh.torus, new T.MeshBasicMaterial({ color: GOLD })); t.ring.rotation.x = Math.PI / 2; t.ring.position.y = 0.53;
        t.disc = new T.Mesh(sh.disc, goldMat(0.15)); t.disc.rotation.x = -Math.PI / 2; t.disc.position.y = 0.515;
        t.halo = FX.glowSprite(GOLD, 1.5, 0.4); t.halo.position.y = 0.9; t.g.add(t.ring, t.disc, t.halo);
      } else if (d.kind === 'switch' || d.kind === 'toggle') {
        t.plate = new T.Mesh(sh.plate, new T.MeshLambertMaterial({ color: 0x2c3345, emissive: hc, emissiveIntensity: 0.15 })); t.plate.position.y = 0.53;
        t.pring = new T.Mesh(sh.ring, goldMat(0.3)); t.pring.scale.setScalar(0.85); t.pring.rotation.x = -Math.PI / 2; t.pring.position.y = 0.512;
        t.halo = FX.glowSprite(hc, 0.9, 0.15); t.halo.position.y = 0.62; t.g.add(t.plate, t.pring, t.halo);
      } else if (d.kind === 'gate') {
        t.sw_ = new T.Mesh(FX.plane(), goldMat(0)); t.sw_.rotation.x = -Math.PI / 2; t.sw_.scale.set(0.2, 0.95, 1); t.sw_.position.y = 0.512; t.g.add(t.sw_);
      } else if (d.kind === 'phase') {
        t.mat.emissive.copy(t.phc).multiplyScalar(0.16); t.rim.material.color.copy(t.phc); t.rim.material.opacity = 0.9;
        t.pring = new T.Mesh(d.ph ? PHD : sh.ring, new T.MeshBasicMaterial({ color: t.phc, transparent: true, opacity: 0.8, side: T.DoubleSide })); t.pring.rotation.x = -Math.PI / 2; t.pring.position.y = 0.512; t.pring.scale.setScalar(d.ph ? 1 : 0.7); // ph0: round ring, ph1: diamond (shape, not only colour)
        t.halo = FX.glowSprite(t.phc, 1.1, 0.22); t.halo.position.y = 0.62; t.g.add(t.pring, t.halo);
      } else if (d.kind === 'crumble') {
        const cp = [[-0.42, 0.1, -0.1, 0.05, -0.12, 0.35, 0.05, 0.12, 0.3, 0.45, 0.1, 0.1], [0.1, -0.44, 0.0, -0.18, -0.1, -0.05, 0.05, 0.14, 0.4, 0.3]]; const arr = [];
        for (const c of cp) for (let i = 0; i + 3 < c.length; i += 2) arr.push(c[i], 0.506, c[i + 1], c[i + 2], 0.506, c[i + 3]);
        const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
        t.cracks = new T.LineSegments(cg, new T.LineBasicMaterial({ color: 0x151a28, transparent: true, opacity: 0.85 })); t.g.add(t.cracks);
      } else if (d.kind === 'start') {
        const m = new T.Mesh(sh.ring, goldMat(0.22)); m.rotation.x = -Math.PI / 2; m.position.y = 0.512; m.scale.setScalar(0.8); t.g.add(m);
      }
      if (d.slider) {
        t.grip = new T.Group(); t.halo2 = FX.glowSprite(GOLD, 1.2, 0.3); t.halo2.position.y = 0.6;
        for (const z of [-0.09, 0.09]) { const m = new T.Mesh(sh.grip, new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8 })); m.position.set(0, 0.508, z); t.grip.add(m); }
        t.g.add(t.grip, t.halo2);
      }
      world.add(t.g); return t;
    }
    function buildSliderTrack(sd, defs) {
      const P = sd.positions, first = defs.find((x) => x.slider === sd.id), g = new T.Group(); g.userData.lvl = 1;
      const rimM = new T.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.28 });
      for (const d of defs.filter((x) => x.slider === sd.id)) for (const o of P) { const r = new T.LineLoop(sh.rim, rimM); r.position.set(d.pos[0] + o[0] + 0.5, d.pos[1] + o[1] + 1.003, d.pos[2] + o[2] + 0.5); g.add(r); }
      const rm = new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.42 });
      const pt = (o) => new T.Vector3(first.pos[0] + o[0] + 0.5, first.pos[1] + o[1] + 1.0, first.pos[2] + o[2] + 0.5);
      for (let i = 0; i < P.length - 1; i++) {
        const a = pt(P[i]), b = pt(P[i + 1]), m = new T.Mesh(sh.rail, rm); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = a.distanceTo(b);
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(m);
      }
      world.add(g);
    }
    s.setLevel = function (lv) {
      clearWorld(); level = lv; const hue = lv.hue || '#E9C27A'; bg.material.uniforms.hue.value.set(hue);
      for (const d of lv.tiles) tiles[d.id] = buildTile(d, hue);
      for (const sd of lv.sliders || []) { slv[sd.id] = { idx: sd.start || 0, cur: sd.positions[sd.start || 0].slice(), from: null, to: null, t0: 0 }; buildSliderTrack(sd, lv.tiles); }
      // bounding box over every tile at every slider position
      const pts = [];
      for (const d of lv.tiles) {
        const sd = d.slider && lv.sliders.find((x) => x.id === d.slider);
        for (const o of sd ? sd.positions : [[0, 0, 0]]) for (const dx of [0, 1]) for (const dy of [0, 1.9]) for (const dz of [0, 1]) pts.push([d.pos[0] + o[0] + dx, d.pos[1] + o[1] + dy, d.pos[2] + o[2] + dz]);
      }
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of pts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      ctr.set((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2 - 0.1, (mn[2] + mx[2]) / 2); ext = [0, 0]; rad = 2.5;
      for (let c = 0; c < 4; c++) for (const p of pts) {
        const q = [p[0] - ctr.x, p[1] - ctr.y, p[2] - ctr.z], b = W.bases[c];
        ext[0] = Math.max(ext[0], Math.abs(q[0] * b.u[0] + q[1] * b.u[1] + q[2] * b.u[2])); ext[1] = Math.max(ext[1], Math.abs(q[0] * b.v[0] + q[1] * b.v[1] + q[2] * b.v[2]));
        rad = Math.max(rad, Math.hypot(q[0], q[2]));
      }
      logical = lv.cam || 0; az = W.camAz(logical); camAnim = null; walkS = win = hint = hl = null; seamA = 0; figOnTop(false); shadow.visible = true;
      arrow.visible = hlRing.visible = false; sp.n = 0; sparks.arr.alpha.fill(0);
      s.resize(); s.setState(W.initial(lv), false);
    };

    // ---------- state ----------
    const topOf = (id, v) => { const t = tiles[id]; return (v || new T.Vector3()).set(t.base[0] + 0.5 + t.off[0], t.base[1] + 1 + t.off[1], t.base[2] + 0.5 + t.off[2]); };
    s.setState = function (state, animate) {
      st = state; const now = performance.now();
      for (const k in tiles) {
        const t = tiles[k];
        if (t.kind === 'gate') { const o = (!!st.sw[t.d.sw]) !== !!t.d.inv ? 1 : 0; if (o && !t.openT && animate) t.sweep = 0; t.openT = o; if (!animate) t.open = o; }
        if (t.kind === 'switch' || t.kind === 'toggle') { t.pressT = st.sw[t.d.sw] ? 1 : 0; if (!animate) t.press = t.pressT; }
        if (t.kind === 'phase') { t.openT = W.active(t.d, st) ? 1 : 0; if (!animate) t.open = t.openT; }
        if (t.kind === 'crumble') { t.goneT = st.gone && st.gone[t.id] ? 1 : 0; if (!animate) t.gone = t.goneT; }
      }
      for (const id in slv) {
        const v = slv[id], P = level.sliders.find((x) => x.id === id).positions, to = P[st.sl[id]];
        if (drag && drag.sl === id) continue; v.idx = st.sl[id];
        if (animate) { v.from = v.cur.slice(); v.to = to.slice(); v.t0 = now; v.dur = RMOT ? 1 : 350; } else { v.cur = to.slice(); v.to = null; }
      }
      if (!walkS) { figTile = st.tile; if (!win) { fig.visible = true; fig.scale.setScalar(1); shadow.visible = true; } topOf(figTile, fig.position); }
      applyTiles(0);
    };
    function applyTiles(dt) {
      for (const k in tiles) {
        const t = tiles[k];
        if (t.sl) t.off = slv[t.sl].cur;
        t.g.position.set(t.base[0] + 0.5 + t.off[0], t.base[1] + 0.5 + t.off[1], t.base[2] + 0.5 + t.off[2]);
        const f = Math.min(1, dt * 7);
        if (t.kind === 'gate') {
          t.open += (t.openT - t.open) * f; const o = t.open;
          t.mat.opacity = 0.3 + 0.7 * o; t.mat.color.setHex(SLATE).lerp(new T.Color(GLASS), 1 - o); t.mat.transparent = o < 0.98; t.mat.depthWrite = o > 0.5; t.rim.material.opacity = 0.55 - 0.2 * o;
          if (t.sweep < 1) { t.sweep += dt / 0.7; t.sw_.position.x = lerp(-0.45, 0.45, clamp(t.sweep, 0, 1)); t.sw_.material.opacity = Math.sin(Math.PI * clamp(t.sweep, 0, 1)) * 0.9; }
        } else if (t.kind === 'phase') {
          t.open += (t.openT - t.open) * Math.min(1, dt * 3.5); const o = t.open; t.mat.opacity = 0.28 + 0.72 * o; t.mat.transparent = o < 0.98; t.mat.depthWrite = o > 0.6;
          t.rim.material.opacity = 0.55 + 0.4 * o; t.pring.material.opacity = 0.4 + 0.45 * o; t.halo.material.opacity = 0.05 + 0.2 * o; t.g.position.y -= (1 - o) * 0.08;
        } else if (t.kind === 'switch' || t.kind === 'toggle') {
          t.press += (t.pressT - t.press) * f; t.plate.position.y = 0.53 - 0.035 * t.press; t.plate.material.emissiveIntensity = 0.15 + 1.2 * t.press; t.halo.material.opacity = 0.12 + 0.5 * t.press; t.pring.material.opacity = 0.3 + 0.5 * t.press;
        } else if (t.kind === 'crumble') {
          t.gone += (t.goneT - t.gone) * Math.min(1, dt * 4.5); const gn = t.gone; t.g.visible = gn < 0.985;
          t.g.position.y -= gn * 0.7; t.mat.opacity = 1 - gn; t.rim.material.opacity = 0.34 * (1 - gn); t.cracks.material.opacity = 0.85 * (1 - gn);
        } else if (t.kind === 'goal') {
          const p = 0.5 + 0.5 * Math.sin(time * 2.2); t.ring.rotation.z = time * 0.6; t.ring.scale.setScalar(1 + 0.05 * p); t.disc.material.opacity = 0.1 + 0.12 * p; t.halo.material.opacity = (win ? 0 : 0.32 + 0.16 * p);
        }
        if (t.sl) { const ok = hooks.canSlide ? hooks.canSlide(t.sl) : true; t.halo2.material.opacity = (ok ? 0.22 + 0.12 * Math.sin(time * 2.6) : 0.05); t.grip.children.forEach((m) => (m.material.opacity = ok ? 0.8 : 0.25)); }
      }
    }

    // ---------- camera ----------
    function placeCam() {
      const a = az * D2R, R = 60; cam.position.set(ctr.x + Math.sin(a) * COSE * R, ctr.y + SINE * R, ctr.z + Math.cos(a) * COSE * R); cam.lookAt(ctr); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    }
    s.resize = function () {
      const r = canvas.getBoundingClientRect(); W_ = Math.max(2, r.width || canvas.clientWidth || 300); H_ = Math.max(2, r.height || canvas.clientHeight || 300);
      renderer.setSize(W_, H_, false); const asp = W_ / H_;
      const hh = Math.max(1.9, ext[1] * 1.1 + 0.45, (ext[0] * 1.08 + 0.4) / asp), hw = hh * asp;
      cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; bg.material.uniforms.asp.value = asp; placeCam();
    };
    s.setCam = function (c, animate) {
      logical = mod(c, 4); const to = W.camAz(logical), d = mod(to - az + 180, 360) - 180;
      if (animate === false || !level) { az = az + d; camAnim = null; } else camAnim = { from: az, to: az + d, t0: performance.now(), dur: RMOT ? 1 : 450 };
    };
    s.getCam = () => logical;
    s.isBusy = () => !!(camAnim || walkS || win);
    s.setInputEnabled = (b) => { enabled = !!b; };
    s.setHooks = (h) => { hooks = h || {}; };

    // ---------- seams / hints ----------
    s.setSeams = (pairs) => {
      const want = {}; for (const p of pairs || []) want[p[0] + '|' + p[1]] = p; seamPairs = [];
      for (const k in want) { if (!seams[k]) { const g = FX.makeSeam(); g.visible = false; scene.add(g); seams[k] = { g, a: 0, p: want[k] }; } seams[k].want = true; seams[k].p = want[k]; }
      for (const k in seams) if (!want[k]) seams[k].want = false;
    };
    s.highlightTile = (id) => { hl = id && tiles[id] ? id : null; hlRing.visible = !!hl; };
    s.pulseHint = (kind) => { arrow.scale.set(rad * 2 + 2.4, rad * 2 + 2.4, 1); arrow.scale.x *= kind === 'rotate-left' ? -1 : 1; hint = { t0: performance.now(), dir: kind === 'rotate-left' ? 1 : -1 }; arrow.visible = true; };
    const vv = new T.Vector3(), vw = new T.Vector3();
    function updateSeams(dt) {
      const settled = !camAnim && !drag && !win; seamA = settled ? 1 : 0;
      const inv = cam.matrixWorldInverse;
      for (const k in seams) {
        const m = seams[k]; m.a += clamp((m.want && settled ? 1 : 0) - m.a, -dt / 0.15, dt / 0.25);
        if (!m.want && m.a <= 0) { scene.remove(m.g); delete seams[k]; continue; }
        const A = tiles[m.p[0]], B = tiles[m.p[1]]; if (!A || !B) continue;
        topOf(A.id, vv).applyMatrix4(inv); topOf(B.id, vw).applyMatrix4(inv);
        const mx = (vv.x + vw.x) / 2, my = (vv.y + vw.y) / 2;
        m.g.position.set(0, 0, 0).add(topOf(A.id, vv)).add(topOf(B.id, new T.Vector3())).multiplyScalar(0.5); m.g.quaternion.copy(cam.quaternion);
        topOf(A.id, vv).applyMatrix4(inv); topOf(B.id, vw).applyMatrix4(inv);
        FX.seamUpdate(m.g, vv.x - mx, vv.y - my, vw.x - mx, vw.y - my, time, m.a);
      }
    }

    // ---------- effects ----------
    function burst(x, y, z, n, spd, up, life, white) {
      const a = sparks.arr;
      for (let i = 0; i < n; i++) {
        const k = sp.n++ % 120, th = Math.random() * 6.283, v = spd * (0.4 + Math.random() * 0.6);
        a.pos.set([x, y, z], k * 3); sp.v.set([Math.cos(th) * v, up * (0.5 + Math.random()), Math.sin(th) * v], k * 3);
        sp.life[k] = sp.max[k] = life * (0.6 + Math.random() * 0.5); a.size[k] = white ? 5 + Math.random() * 4 : 7 + Math.random() * 6;
        a.col.set(white ? [0.75, 0.72, 0.65] : [0.91, 0.76, 0.48], k * 3);
      }
    }
    function updateFx(dt) {
      const a = sparks.arr;
      for (let k = 0; k < 120; k++) {
        if (sp.life[k] <= 0) { a.alpha[k] = 0; continue; }
        sp.life[k] -= dt; const f = Math.max(0, sp.life[k] / sp.max[k]);
        a.pos[k * 3] += sp.v[k * 3] * dt; a.pos[k * 3 + 1] += sp.v[k * 3 + 1] * dt; a.pos[k * 3 + 2] += sp.v[k * 3 + 2] * dt; sp.v[k * 3 + 1] -= dt * 0.8; a.alpha[k] = f * 0.9;
      }
      sparks.flush();
      const m = motes.arr, sz = rad + 3;
      for (let i = 0; i < 44; i++) {
        const d = md[i]; d[3] += dt * (0.3 + d[0] * 0.4); d[1] = (d[1] + dt * 0.012 * (0.5 + d[2])) % 1;
        m.pos[i * 3] = ctr.x + (d[0] - 0.5) * 2 * sz + Math.sin(d[3]) * 0.25; m.pos[i * 3 + 1] = ctr.y - 2 + d[1] * 6; m.pos[i * 3 + 2] = ctr.z + (d[2] - 0.5) * 2 * sz + Math.cos(d[3] * 0.8) * 0.25;
        m.size[i] = 2 + d[2] * 2.5; m.alpha[i] = (0.1 + 0.2 * d[0]) * Math.sin(Math.PI * d[1]) * (0.7 + 0.3 * Math.sin(time * 1.5 + i)); m.col[i * 3] = 0.9; m.col[i * 3 + 1] = 0.8; m.col[i * 3 + 2] = 0.62;
      }
      motes.flush();
    }

    // ---------- walking ----------
    s.walk = function (path, onStep, onDone) {
      if (!path || !path.length) { onDone && onDone(); return; }
      walkS = { path: path.slice(), i: -1, onStep, onDone }; nextHop();
    };
    function figOnTop(on) { fig.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.depthTest = !on; }); o.renderOrder = on ? 50 : 0; } }); }
    function nextHop() {
      const w = walkS; w.i++;
      if (w.i >= w.path.length) { const d = w.onDone; walkS = null; d && d(); return; }
      w.from = fig.position.clone(); w.to = topOf(w.path[w.i], new T.Vector3()); w.t = 0;
      // A perspective seam (not a same-height neighbour): glide flat across the picture, drawn on top of the blocks, no hop.
      const dd = w.to.clone().sub(w.from); w.seam = !(Math.abs(dd.y) < 0.01 && Math.abs(Math.abs(dd.x) + Math.abs(dd.z) - 1) < 0.01);
      figOnTop(w.seam); shadow.visible = !w.seam;
      const a = new T.Vector3().copy(w.from).applyMatrix4(cam.matrixWorldInverse), b = w.to.clone().applyMatrix4(cam.matrixWorldInverse), dr = worldDirs(az);
      const sx = b.x - a.x, sy = (b.y - a.y) / SINE * 1; w.yaw = Math.atan2(dr.r[0] * sx + dr.f[0] * sy, dr.r[1] * sx + dr.f[1] * sy);
    }
    function updateWalk(dt) {
      const w = walkS; if (!w) return; w.t = Math.min(1, w.t + dt / (w.seam ? 0.45 : 0.26));
      const t = w.t, e = t * t * (3 - 2 * t); fig.position.lerpVectors(w.from, w.to, e); const arc = w.seam ? 0 : Math.sin(Math.PI * t); fig.position.y += arc * 0.24;
      shadowAt(lerp(w.from.y, w.to.y, e), arc);
      if (t >= 1) { figOnTop(false); shadow.visible = true; figTile = w.path[w.i]; landSq = 1; burst(w.to.x, w.to.y + 0.03, w.to.z, 7, 0.45, 0.35, 0.5, true); const i = w.i; try { w.onStep && w.onStep(w.path[i], i); } catch (e) { if (root.console) console.error('walk step error', e); } if (walkS === w) nextHop(); }
    }
    const shadowAt = (gy, arc) => { shadow.position.set(fig.position.x, gy + 0.006, fig.position.z); shadow.scale.setScalar(0.62 * (1 - 0.3 * (arc || 0))); sh.dark.opacity = 0.5 - 0.2 * (arc || 0); };
    function updateFigure(dt) {
      if (!fig.visible) { shadow.visible = false; return; } shadow.visible = true;
      const u = fig.userData, w = walkS;
      if (!w && !win && figTile) { topOf(figTile, fig.position); shadowAt(fig.position.y, 0); }
      const tgt = w ? w.yaw : yaw; let d = mod(tgt - yaw + Math.PI, 6.2832) - Math.PI; yaw += d * Math.min(1, dt * 14); fig.rotation.y = yaw;
      landSq = Math.max(0, landSq - dt * 5); let sy = 1 + 0.02 * Math.sin(time * 2.2) - 0.2 * landSq * landSq;
      if (w) { const t = w.t; sy += t < 0.15 ? -0.16 * (1 - t / 0.15) : 0.14 * Math.sin(Math.PI * t); }
      u.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)); u.head.position.y = 0.39 + 0.004 * Math.sin(time * 2.2 + 1); u.tail.rotation.z = 0.25 * Math.sin(time * 3) + (w ? 0.5 : 0); u.tail.rotation.x = 0.3 + (w ? 0.4 : 0);
    }

    // ---------- win ----------
    s.playWin = function (onDone) {
      if (win) return; const gl = Object.values(tiles).find((t) => t.kind === 'goal'); win = { t: 0, onDone, burst: 0, a0: az, goal: gl };
      walkS = null; camAnim = null; const g = gl ? topOf(gl.id) : fig.position; burst(g.x, g.y + 0.1, g.z, 40, 1.6, 1.8, 1.4, false);
    };
    function updateWin(dt) {
      const w = win; w.t += dt; const T_ = 2.5, k = clamp(w.t / T_, 0, 1); az = w.a0 + 90 * ease(k);
      const f = clamp((w.t - 0.25) / 1.4, 0, 1), g = w.goal && topOf(w.goal.id);
      if (w.goal) { w.goal.ring.scale.setScalar(1 + 1.2 * Math.sin(Math.PI * Math.min(1, w.t / 0.9))); w.goal.disc.material.opacity = 0.9 * (1 - k); w.goal.halo.material.opacity = 0.7 * (1 - k); w.goal.halo.scale.setScalar(1.5 + 2.5 * Math.min(1, w.t / 0.5)); }
      if (g) { fig.position.set(g.x, g.y + ease(f) * 1.5, g.z); fig.scale.setScalar(1 - 0.9 * f * f); yaw += dt * (2 + 10 * f); fig.rotation.y = yaw; shadow.visible = false; if (f > 0 && f < 1) { w.burst += dt; while (w.burst > 0.03) { w.burst -= 0.03; burst(fig.position.x, fig.position.y + 0.3, fig.position.z, 2, 0.5, 0.9, 1.0, false); } } }
      if (f >= 1) fig.visible = false;
      if (w.t >= T_) { win = null; logical = mod(logical + 1, 4); fig.visible = false; const d = w.onDone; d && d(); }
    }

    // ---------- main frame ----------
    s.frame = function (now) {
      if (disposed || !level) return; now = now || performance.now(); const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now; time = now / 1000;
      const nowp = performance.now();
      if (camAnim) { const k = clamp((nowp - camAnim.t0) / camAnim.dur, 0, 1); az = lerp(camAnim.from, camAnim.to, ease(k)); if (k >= 1) camAnim = null; }
      else if (drag && drag.tgt != null) az += (drag.tgt - az) * Math.min(1, dt * 14);
      for (const id in slv) { const v = slv[id]; if (v.to && !(drag && drag.sl === id)) { const k = clamp((nowp - v.t0) / v.dur, 0, 1), e = ease(k); v.cur = v.from.map((x, i) => lerp(x, v.to[i], e)); if (k >= 1) { v.cur = v.to; v.to = null; } } }
      applyTiles(dt); if (win) updateWin(dt);
      updateWalk(dt); updateFigure(dt); placeCam(); updateSeams(dt); updateFx(dt);
      if (hl && tiles[hl]) { topOf(hl, hlRing.position); hlRing.position.y += 0.02; const p = Math.sin(time * 5); hlRing.scale.setScalar(1.05 + 0.1 * p); hlRing.material.opacity = 0.55 + 0.35 * p; }
      if (hint) {
        const k = (nowp - hint.t0) / 1500; if (k >= 1) { hint = null; arrow.visible = false; } else { arrow.position.set(ctr.x, ctr.y - 0.2, ctr.z); arrow.rotation.z = hint.dir * (k - 0.5) * 0.9 + az * D2R * 0; arrow.material.opacity = Math.sin(Math.PI * k) * 0.55; }
      }
      renderer.render(scene, cam);
    };

    // ---------- picking & input ----------
    const ray = new T.Raycaster(), nd = new T.Vector2();
    s.pick = function (cx, cy) {
      if (!level) return null; const r = canvas.getBoundingClientRect(); nd.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
      cam.updateMatrixWorld(); ray.setFromCamera(nd, cam); const bodies = Object.values(tiles).filter((t) => !(t.kind === 'crumble' && t.gone > 0.5) && !(t.kind === 'phase' && t.open < 0.5)).map((t) => t.body), hit = ray.intersectObjects(bodies, false)[0];
      if (hit) return Object.values(tiles).find((t) => t.body === hit.object).id;
      let best = null, bd = 0.62 * (r.width / (cam.right - cam.left));
      for (const k in tiles) { const tk = tiles[k]; if (tk.kind === 'phase' && tk.open < 0.5 && k !== figTile) continue; const p = topOf(k, vv).project(cam), d = Math.hypot((p.x - nd.x) * r.width / 2, (p.y - nd.y) * r.height / 2); if (d < bd) { bd = d; best = k; } }
      return best;
    };
    const px = (v) => { const p = v.clone().project(cam), r = canvas.getBoundingClientRect(); return [(p.x + 1) / 2 * r.width, (1 - p.y) / 2 * r.height]; };
    function slideInit(id) {
      const sd = level.sliders.find((x) => x.id === id), t0 = Object.values(tiles).find((t) => t.sl === id), i = slv[id].idx;
      const pos = (o) => px(new T.Vector3(t0.base[0] + o[0] + 0.5, t0.base[1] + o[1] + 1, t0.base[2] + o[2] + 0.5));
      const pi = pos(sd.positions[i]); return { sl: id, sd, i, j: i, t: 0, vecs: sd.positions.map((o) => { const p = pos(o); return [p[0] - pi[0], p[1] - pi[1]]; }) };
    }
    function down(e) {
      if (ptr) abortPtr(); // a lost pointerup (context menu, ctrl-click, leaving the window) must never lock the board
      if (!enabled || s.isBusy() || !level || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const id = s.pick(e.clientX, e.clientY), t = id && tiles[id];
      ptr = { x: e.clientX, y: e.clientY, t0: performance.now(), id, mode: 'wait', az0: az, pid: e.pointerId, slider: t && t.sl && hooks.canSlide && hooks.canSlide(t.sl) ? t.sl : null, blocked: t && t.sl && hooks.canSlide && !hooks.canSlide(t.sl) ? t.sl : null };
      try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    }
    function move(e) {
      if (!ptr || e.pointerId !== ptr.pid) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      if (ptr.mode === 'wait' && Math.hypot(dx, dy) > 8) { ptr.mode = ptr.slider ? 'slide' : ptr.blocked ? 'blocked' : 'turn'; if (ptr.mode !== 'blocked') drag = ptr.slider ? slideInit(ptr.slider) : { tgt: az }; ptr.az0 = az + (ptr.slider ? 0 : 0); ptr.sx = 0; }
      if (ptr.mode === 'turn') { drag.tgt = ptr.az0 - (dx - ptr.sx) * 0.55; }
      else if (ptr.mode === 'slide') {
        const d = drag; let best = d.i, bc = 0.35;
        d.vecs.forEach((v, j) => { const l = Math.hypot(v[0], v[1]); if (j === d.i || l < 4) return; const c = (dx * v[0] + dy * v[1]) / (Math.hypot(dx, dy) * l + 1e-6); if (c > bc) { bc = c; best = j; } });
        d.j = best; if (best === d.i) d.t = 0; else { const v = d.vecs[best]; d.t = clamp((dx * v[0] + dy * v[1]) / (v[0] * v[0] + v[1] * v[1]), 0, 1); }
        const a = d.sd.positions[d.i], b = d.sd.positions[d.j]; slv[d.sl].cur = a.map((x, k) => lerp(x, b[k], d.t)); slv[d.sl].to = null;
      }
    }
    function abortPtr() { if (ptr) { try { up({ pointerId: ptr.pid, clientX: ptr.x, clientY: ptr.y }, true); } catch (x) { ptr = null; drag = null; } } }
    function up(e, cancel) {
      if (!ptr || e.pointerId !== ptr.pid) return; const p = ptr; ptr = null; try { canvas.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      if (p.mode === 'wait') { if (!cancel && performance.now() - p.t0 < 300 && p.id && hooks.onTapTile) hooks.onTapTile(p.id); }
      else if (p.mode === 'blocked') { if (!cancel && hooks.onSlideBlocked) hooks.onSlideBlocked(p.blocked); }
      else if (p.mode === 'turn') {
        const dxx = e.clientX - p.x, n0 = Math.round((p.az0 - 45) / 90); let n = Math.round((drag.tgt - 45) / 90);
        if (n === n0 && Math.abs(dxx) >= 40) n = n0 + (dxx > 0 ? -1 : 1); // flick: always advance one cam in the swipe direction
        const c = mod(n, 4), to = 45 + 90 * n; drag = null; camAnim = { from: az, to, t0: performance.now(), dur: RMOT ? 1 : 280 };
        if (c !== logical) { logical = c; hooks.onCam && hooks.onCam(c); }
      } else if (p.mode === 'slide') {
        const d = drag, idx = d.t > 0.5 ? d.j : d.i, v = slv[d.sl]; drag = null; v.from = v.cur.slice(); v.to = d.sd.positions[idx].slice(); v.t0 = performance.now(); v.dur = RMOT ? 1 : 220;
        if (idx !== d.i) { v.idx = idx; hooks.onSlide && hooks.onSlide(d.sl, idx); }
      }
    }
    function key(e) {
      if (!enabled || s.isBusy() || !level) return; const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight') { const c = mod(logical + (k === 'ArrowLeft' ? 1 : -1), 4); s.setCam(c, true); hooks.onCam && hooks.onCam(c); e.preventDefault(); }
    }
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', (e) => up(e, true)); canvas.addEventListener('lostpointercapture', abortPtr); canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); abortPtr(); }); root.addEventListener('blur', abortPtr); root.addEventListener('keydown', key);

    s.dispose = function () {
      disposed = true; canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); root.removeEventListener('keydown', key);
      clearWorld(); for (const k in sh) sh[k].dispose && sh[k].dispose(); renderer.dispose();
    };
    return s;
  }
  W.Scene = { create };
})(typeof window !== 'undefined' ? window : globalThis);
