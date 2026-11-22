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
    renderer.setPixelRatio(pr); renderer.setClearColor(0x0B0D14); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 300), world = new T.Group();
    scene.add(cam, world);
    const bg = FX.makeBackground('#EDE4CF'); scene.add(bg);
    const hemi = new T.HemisphereLight(0xdfe6ff, 0x3a4260, 0.62); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff0d8, 0.82); scene.add(sun, sun.target); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.camera.near = 5; sun.shadow.camera.far = 140; const sunOff = new T.Vector3(-4, 7, 3).normalize().multiplyScalar(45);
    const rim = new T.DirectionalLight(0x9ab8ff, 0.18); rim.position.set(5, 2, -2); cam.add(rim, rim.target); // light lives in camera space
    
    sh.rim = new T.BufferGeometry().setFromPoints([[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]].map((p) => new T.Vector3(p[0] * 0.455, 0, p[1] * 0.455)));
    sh.disc = new T.CircleGeometry(0.26, 28); sh.ring = new T.RingGeometry(0.33, 0.41, 40); sh.torus = new T.TorusGeometry(0.27, 0.028, 8, 36); sh.plate = new T.CylinderGeometry(0.23, 0.25, 0.06, 20);
    sh.rail = new T.CylinderGeometry(0.014, 0.014, 1, 6); sh.grip = new T.BoxGeometry(0.34, 0.012, 0.035);
    sh.dark = new T.MeshBasicMaterial({ map: FX.glowTex(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });
    const goldMat = (o) => new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending });

    const fig = FX.makeFigure(); fig.visible = false; world.add(fig); fig.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const FIG = 1.12; const figScale = (k) => fig.scale.setScalar(k * FIG), fig2Scale = (k) => fig2.scale.setScalar(k * FIG);
    const TWC = 0x7FE3B8, fig2 = FX.makeFigure({ body: 0xCFE8DB, hood: 0xB4D4C4, bodyE: 0x0c1a14, scarf: TWC, scarfE: 0x0f3a2a }); fig2.visible = false; world.add(fig2); fig2.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const shadow2 = new T.Mesh(FX.plane(), sh.dark); shadow2.rotation.x = -Math.PI / 2; shadow2.visible = false; world.add(shadow2);
    const shadow = new T.Mesh(FX.plane(), sh.dark); shadow.rotation.x = -Math.PI / 2; world.add(shadow);
    const hlRing = new T.Mesh(sh.ring, new T.MeshBasicMaterial({ color: 0xE0343A, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); hlRing.rotation.x = -Math.PI / 2; hlRing.visible = false; world.add(hlRing);
    const arrow = new T.Mesh(FX.plane(), new T.MeshBasicMaterial({ map: FX.arrowTex(), transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    arrow.rotation.x = -Math.PI / 2; arrow.renderOrder = 15; arrow.visible = false; scene.add(arrow);
    const sparks = FX.fxPoints(120, pr), motes = FX.fxPoints(44, pr); scene.add(sparks, motes);
    const sp = { v: new Float32Array(120 * 3), life: new Float32Array(120), max: new Float32Array(120), n: 0 };
    const md = []; for (let i = 0; i < 44; i++) md.push([Math.random(), Math.random(), Math.random(), Math.random() * 6.28]);

    let hooks = {}, enabled = true, level = null, st = null, tiles = {}, slv = {}, seams = {}, seamPairs = [], seamA = 1;
    let ctr = new T.Vector3(), ext = [2, 2], rad = 3, az = 45, logical = 0, camAnim = null, walkS = null, win = null, hint = null, hl = null, disposed = false;
    let lift = [0, 0], entry = null, camOff = 0, twTile = null, twAnim = null, time = 0, last = 0, W_ = 1, H_ = 1, figTile = null, yaw = 0, landSq = 0, drag = null, ptr = null;
    const worldDirs = (a) => ({ r: [Math.cos(a * D2R), -Math.sin(a * D2R)], f: [-Math.sin(a * D2R), -Math.cos(a * D2R)] });

    // ---------- build ----------
    function clearWorld() {
      for (const k in tiles) { world.remove(tiles[k].g); tiles[k].g.traverse((c) => { if (c.material && !Object.values(sh).includes(c.material)) c.material.dispose(); }); }
      for (const o of world.children.slice()) if (o.userData.lvl) { world.remove(o); o.traverse((c) => { if (c.material && !Object.values(sh).includes(c.material)) c.material.dispose(); }); }
      for (const k in seams) { scene.remove(seams[k].g); } tiles = {}; slv = {}; seams = {}; seamPairs = [];
    }
    // One palette per chapter: tile faces (top, x-faces, z-faces), backdrop (top, bottom), glow behind the scene, sun, sky and bounce light.
    const hex = (c) => { const k = new T.Color(c); return [k.r, k.g, k.b]; };
    const mix = (a, b, t) => '#' + new T.Color(a).lerp(new T.Color(b), t).getHexString();
    const P = (t, l, r, glow, bgDeep, bgLight) => ({ t, l, r, glow, top: bgDeep, bot: mix(bgDeep, bgLight, 0.55), sun: mix('#FFFFFF', '#F2E6CC', 0.5), sky: mix('#C8D8CF', bgLight, 0.5), gnd: mix(bgDeep, r, 0.5) });
    const PAL = {
      1: P('#CDC2A6', '#9A9078', '#585342', '#EDE4CF', '#0E1C17', '#2A4A3C'),   // bone stone on dark green
      2: P('#3C6B55', '#1B3A2E', '#0C1C16', '#8FD6B8', '#07100E', '#1B4536'),   // emerald night
      3: P('#6C706C', '#3F4140', '#202221', '#E0343A', '#0D0C0D', '#3A2326'),   // black marble
      4: P('#8FB5A3', '#587A6B', '#2F4A3E', '#BFE3D0', '#0C1815', '#2C5245'),   // mist
      5: P('#C0B59A', '#8C836E', '#4E4A3C', '#EDE4CF', '#101612', '#2C4033'),   // bone dusk
      6: P('#5E1E22', '#38110F', '#1B0809', '#E0343A', '#0D0708', '#3A1517'),   // oxblood
      7: P('#C9CFCA', '#8D9490', '#4C5350', '#9FE3C8', '#09110F', '#1F322A'),   // mirror
    };
    const grainTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), im = x.createImageData(128, 128); let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 128 * 128; i++) { const v = 232 + (r() - 0.5) * 26 - (r() > 0.985 ? 38 : 0); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0); const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; return tx; })();
    const hash01 = (str, k) => { let h = 2166136261 ^ k; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
    const geoCache = {}; const bevelFor = (p) => geoCache[p.t] || (geoCache[p.t] = FX.bevelGeo(0.05, { t: hex(p.t), x: hex(p.l), z: hex(p.r) }));
    let pal = PAL[1];
    const pilTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'), g = x.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.5, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); return new T.CanvasTexture(c); })();
    const pilGeo = new T.CylinderGeometry(0.17, 0.2, 1.8, 14, 1, true);
    const pillar = (col) => { const m = new T.Mesh(pilGeo, new T.MeshBasicMaterial({ map: pilTex, color: col, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending })); m.position.y = 0.5 + 0.9; return m; };
    const PHD = new T.RingGeometry(0.2, 0.3, 4, 1), WARPC = ['#EDE4CF', '#8FD6B8'];
    // Architecture: purely visual dressing, never changes what is walkable. Plinth and cornice on every block, arched doors and slit windows on side faces
    // that do not touch a neighbouring block (so seams stay clean). The mix depends on the chapter, picked per face from a hash so it is stable.
    const decoTex = (kind) => { const c = document.createElement('canvas'); c.width = 96; c.height = 144; const x = c.getContext('2d');
      if (kind === 'arch') { x.fillStyle = 'rgba(4,9,7,.78)'; x.beginPath(); x.moveTo(14, 144); x.lineTo(14, 62); x.arc(48, 62, 34, Math.PI, 0); x.lineTo(82, 144); x.closePath(); x.fill(); x.strokeStyle = 'rgba(237,228,207,.22)'; x.lineWidth = 4; x.stroke(); x.fillStyle = 'rgba(237,228,207,.07)'; x.fillRect(14, 140, 68, 4); }
      else if (kind === 'slit') { x.fillStyle = 'rgba(4,9,7,.8)'; x.beginPath(); x.moveTo(36, 40); x.lineTo(60, 40); x.lineTo(60, 100); x.lineTo(36, 100); x.closePath(); x.fill(); x.strokeStyle = 'rgba(237,228,207,.2)'; x.lineWidth = 3; x.stroke(); }
      else { x.fillStyle = 'rgba(4,9,7,.55)'; for (let k = 0; k < 4; k++) x.fillRect(10 + k * 22, 20, 12, 108); }                 // 'pilasters'
      const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; };
    const DECO = { arch: decoTex('arch'), slit: decoTex('slit'), pil: decoTex('pil') };
    const decoGeo = { plinth: new T.BoxGeometry(1.06, 0.12, 1.06), cornice: new T.BoxGeometry(1.05, 0.07, 1.05), plane: new T.PlaneGeometry(0.34, 0.51) };
    const decoMats = {};
    const decoMat = (p) => decoMats[p.t] || (decoMats[p.t] = { trim: new T.MeshLambertMaterial({ color: new T.Color(p.l).multiplyScalar(0.9) }), base: new T.MeshLambertMaterial({ color: new T.Color(p.r).multiplyScalar(1.1) }) });
    const faceMat = {}; const decalMat = (k) => faceMat[k] || (faceMat[k] = new T.MeshBasicMaterial({ map: DECO[k], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const CH_DECO = { 1: ['arch', 'slit'], 2: ['pil', 'slit'], 3: ['slit'], 4: ['arch'], 5: ['arch', 'pil'], 6: ['slit', 'arch'], 7: ['pil'] };
    function dress(t, d) {
      const dm = decoMat(pal), base = new T.Mesh(decoGeo.plinth, dm.base); base.position.y = -0.44; const top = new T.Mesh(decoGeo.cornice, dm.trim); top.position.y = 0.5 - 0.035 - 0.006;
      t.g.add(base, top);
      const kinds = CH_DECO[level.ch || 1] || ['arch'], FACES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      FACES.forEach(([nx, nz], i) => {
        const touching = level.tiles.some((o) => o !== d && o.pos[1] === d.pos[1] && o.pos[0] === d.pos[0] + nx && o.pos[2] === d.pos[2] + nz);
        if (touching || hash01(d.id, 10 + i) > 0.55) return;
        const k = kinds[Math.floor(hash01(d.id, 20 + i) * kinds.length)], m = new T.Mesh(decoGeo.plane, decalMat(k));
        m.position.set(nx * 0.508, -0.02, nz * 0.508); m.rotation.y = Math.atan2(nx, nz); t.g.add(m);
      });
    }
    function buildTile(d, hue) {
      const t = { id: d.id, d, kind: d.kind, sl: d.slider, base: d.pos, off: [0, 0, 0], open: 0, openT: 0, press: 0, pressT: 0, sweep: 2, gone: 0, goneT: 0, g: new T.Group() };
      const glass = d.kind === 'gate';
      t.mat = new T.MeshLambertMaterial({ color: glass ? GLASS : 0xffffff, vertexColors: true, emissive: new T.Color(hue).multiplyScalar(0.05), transparent: glass || d.kind === 'crumble' || d.kind === 'phase', opacity: glass ? 0.3 : 1, depthWrite: !glass });
      if (d.kind === 'phase') t.phc = new T.Color(d.ph ? '#EDE4CF' : '#8FD6B8');
      if (d.kind === 'crumble') { t.mat.color.lerp(new T.Color('#b4623c'), 0.5); t.mat.emissive.lerp(new T.Color('#5a210f'), 0.14); }
      if (!glass) { t.mat.map = grainTex; const j = 0.9 + 0.1 * hash01(d.id, 1); t.mat.color.setRGB(j, j * (0.97 + 0.05 * hash01(d.id, 2)), j * (0.97 + 0.05 * hash01(d.id, 3))); }
      t.body = new T.Mesh(bevelFor(pal), t.mat); t.g.add(t.body); if (!glass) { t.body.castShadow = true; t.body.receiveShadow = true; if (d.kind !== 'phase' && d.kind !== 'crumble') dress(t, d); }
      const rimC = new T.Color(GOLD).lerp(new T.Color(hue), 0.35);
      t.rim = new T.LineLoop(sh.rim, new T.LineBasicMaterial({ color: rimC, transparent: true, opacity: glass ? 0.55 : 0.34 })); t.rim.position.y = 0.502; t.g.add(t.rim);
      const hc = new T.Color(hue).lerp(new T.Color(GOLD), 0.4);
      if (d.kind === 'goal') {
        t.ring = new T.Mesh(sh.torus, new T.MeshBasicMaterial({ color: GOLD })); t.ring.rotation.x = Math.PI / 2; t.ring.position.y = 0.53;
        t.disc = new T.Mesh(sh.disc, goldMat(0.15)); t.disc.rotation.x = -Math.PI / 2; t.disc.position.y = 0.515;
        t.halo = FX.glowSprite(GOLD, 1.5, 0.3); t.halo.position.y = 0.9; t.pil = pillar(GOLD); t.g.add(t.ring, t.disc, t.halo, t.pil);
      } else if (d.kind === 'tgoal') {
        t.ring = new T.Mesh(sh.torus, new T.MeshBasicMaterial({ color: TWC })); t.ring.rotation.x = Math.PI / 2; t.ring.position.y = 0.53;
        t.disc = new T.Mesh(sh.disc, new T.MeshBasicMaterial({ color: TWC, transparent: true, opacity: 0.15, depthWrite: false, blending: T.AdditiveBlending })); t.disc.rotation.x = -Math.PI / 2; t.disc.position.y = 0.515;
        t.halo = FX.glowSprite(TWC, 1.5, 0.4); t.halo.position.y = 0.9; t.pil = pillar(TWC); t.g.add(t.ring, t.disc, t.halo, t.pil);
      } else if (d.kind === 'twin') {
        const m = new T.Mesh(sh.ring, new T.MeshBasicMaterial({ color: TWC, transparent: true, opacity: 0.35, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.512; m.scale.setScalar(0.8); t.g.add(m);
      } else if (d.kind === 'warp') {
        const wc = new T.Color(WARPC[d.wc || 0]); t.wcol = wc;
        t.pring = new T.Mesh(sh.ring, new T.MeshBasicMaterial({ color: wc, transparent: true, opacity: 0.85, side: T.DoubleSide })); t.pring.rotation.x = -Math.PI / 2; t.pring.position.y = 0.512; t.pring.scale.setScalar(0.9);
        t.ring = new T.Mesh(PHD, new T.MeshBasicMaterial({ color: wc, transparent: true, opacity: 0.9, side: T.DoubleSide })); t.ring.rotation.x = -Math.PI / 2; t.ring.position.y = 0.516; t.ring.scale.setScalar(1.15);
        t.halo = FX.glowSprite(wc, 1.2, 0.35); t.halo.position.y = 0.7; t.mat.emissive.copy(wc).multiplyScalar(0.12); t.g.add(t.pring, t.ring, t.halo);
      } else if (d.kind === 'switch' || d.kind === 'toggle') {
        t.plate = new T.Mesh(sh.plate, new T.MeshLambertMaterial({ color: 0x1d2c25, emissive: hc, emissiveIntensity: 0.15 })); t.plate.position.y = 0.53;
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
      clearWorld(); level = lv; pal = PAL[lv.ch || 1] || PAL[1]; const hue = pal.glow;
      const U = bg.material.uniforms; U.hue.value.set(pal.glow); U.top.value.set(pal.top); U.bot.value.set(pal.bot);
      hemi.color.set(pal.sky); hemi.groundColor.set(pal.gnd); sun.color.set(pal.sun); renderer.setClearColor(pal.top);
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
      logical = lv.cam || 0; az = W.camAz(logical); camAnim = null; walkS = win = hint = hl = null; seamA = 0; figOnTop(false); shadow.visible = true; twTile = null; twAnim = null; fig2.visible = false; fig2Scale(1); onTop(fig2, false);
      arrow.visible = hlRing.visible = false; sp.n = 0; sparks.arr.alpha.fill(0);
      { const e = rad + 4; const c = sun.shadow.camera; c.left = c.bottom = -e; c.right = c.top = e; c.updateProjectionMatrix(); }
      s.resize(); s.setState(W.initial(lv), false);
      // entrance: tiles rise one after another from the start tile outwards, the camera swings in, the walker drops in last
      entry = null; camOff = 0; cam.zoom = 1;
      if (!RMOT && lv.tiles.length) {
        const sp = (lv.tiles.find((x) => x.kind === 'start') || lv.tiles[0]).pos, ds = lv.tiles.map((x) => Math.hypot(x.pos[0] - sp[0], (x.pos[1] - sp[1]) * 1.4, x.pos[2] - sp[2])), mx = Math.max(1, ...ds);
        lv.tiles.forEach((x, i) => { tiles[x.id].eDelay = 0.05 + 0.75 * ds[i] / mx; });
        entry = { t0: performance.now(), dur: 2000, landed: false };
        for (const k in tiles) { tiles[k].g.visible = false; } fig.visible = false; shadow.visible = false; fig2.visible = false; shadow2.visible = false;
      }
    };
    const eOut = (p) => 1 - Math.pow(1 - p, 3), eBack = (p) => { const c = 1.45; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
    function entryApply(nowp) {
      const el = s._freeze != null ? s._freeze : nowp - entry.t0;
      for (const k in tiles) {
        const t = tiles[k], p = clamp((el - t.eDelay * 1000) / 650, 0, 1), e = eBack(p);
        if (t.kind !== 'crumble' || !(t.gone > 0.985)) t.g.visible = p > 0;
        t.g.position.y -= (1 - e) * 2.6; t.g.scale.setScalar(Math.max(0.001, e));
      }
      const ck = clamp(el / 1500, 0, 1); camOff = -(1 - eOut(ck)) * 40; cam.zoom = 0.8 + 0.2 * eOut(ck);
      const f = clamp((el - 1000) / 750, 0, 1);
      if (f > 0) {
        fig.visible = true; shadow.visible = true; const d = eOut(f);
        fig.position.y += (1 - d) * 3.2 * (1 - 0.0); figScale(0.5 + 0.5 * eOut(f)); shadowAt(fig.position.y - (1 - d) * 3.2, 1 - d);
        if (twTile) { fig2.visible = true; shadow2.visible = true; fig2.position.y += (1 - d) * 3.2; fig2Scale(0.5 + 0.5 * d); }
        if (f >= 1 && !entry.landed) { entry.landed = true; landSq = 1; burst(fig.position.x, fig.position.y + 0.03, fig.position.z, 14, 0.7, 0.5, 0.6, true); hooks.entered && hooks.entered(); }
      }
      else { fig.visible = false; shadow.visible = false; fig2.visible = false; shadow2.visible = false; }
      if (el > entry.dur) { entry = null; camOff = 0; cam.zoom = 1; for (const k in tiles) { tiles[k].g.scale.setScalar(1); } figScale(1); fig2Scale(1); }
    }

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
      if (!walkS) { figTile = st.tile; if (!win) { fig.visible = true; figScale(1); shadow.visible = true; } topOf(figTile, fig.position); }
      if (st.tw) {
        if (twTile !== st.tw) {
          const to = topOf(st.tw, new T.Vector3());
          if (animate && twTile && fig2.visible) { const from = fig2.position.clone(), dd = to.clone().sub(from); twAnim = { from, to, t: 0, seam: !(Math.abs(dd.y) < 0.01 && Math.abs(Math.abs(dd.x) + Math.abs(dd.z) - 1) < 0.01) }; fig2.rotation.y = Math.atan2(dd.x, dd.z); onTop(fig2, twAnim.seam); }
          else { twAnim = null; fig2.position.copy(to); }
          twTile = st.tw;
        }
        if (!win) { fig2.visible = true; fig2Scale(1); }
      } else { twTile = null; twAnim = null; fig2.visible = false; shadow2.visible = false; }
      applyTiles(0);
    };
    function updateTwin(dt) {
      if (!fig2.visible || !twTile) { shadow2.visible = false; return; }
      const a = twAnim; let arc = 0;
      if (a) { a.t = Math.min(1, a.t + dt / (a.seam ? 0.45 : 0.26)); const e = a.t * a.t * (3 - 2 * a.t); fig2.position.lerpVectors(a.from, a.to, e); arc = a.seam ? 0 : Math.sin(Math.PI * a.t); fig2.position.y += arc * 0.24; if (a.t >= 1) { onTop(fig2, false); burst(a.to.x, a.to.y + 0.03, a.to.z, 5, 0.4, 0.3, 0.45, true); twAnim = null; } }
      else if (!win) topOf(twTile, fig2.position);
      shadow2.visible = !(a && a.seam); shadow2.position.set(fig2.position.x, topOf(twTile, new T.Vector3()).y + 0.006 - (a ? 0 : 0), fig2.position.z); if (a) shadow2.position.y = lerp(a.from.y, a.to.y, a.t) + 0.006; shadow2.scale.setScalar(0.62 * (1 - 0.3 * arc));
      const u = fig2.userData; u.body.scale.set(1, 1 + 0.02 * Math.sin(time * 2.2 + 1.3), 1); u.head.position.y = u.headY + 0.004 * Math.sin(time * 2.2 + 2); poseFigure(u, dt, time, !!twAnim, twAnim ? twAnim.t : 0, 0, 1.7);
    }
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
        } else if (t.kind === 'warp') {
          const p = 0.5 + 0.5 * Math.sin(time * 2.4 + (t.base[0] + t.base[2])); t.ring.rotation.z = time * 1.1; t.pring.scale.setScalar(0.82 + 0.1 * p); t.halo.material.opacity = 0.22 + 0.2 * p;
        } else if (t.kind === 'goal' || t.kind === 'tgoal') {
          const p = 0.5 + 0.5 * Math.sin(time * 2.2); t.ring.rotation.z = time * 0.6; t.ring.scale.setScalar(1 + 0.05 * p); t.disc.material.opacity = 0.1 + 0.12 * p; t.halo.material.opacity = (win ? 0 : 0.32 + 0.16 * p); if (t.pil) { if (win && win.goal === t) { const u = clamp(win.t / 2.2, 0, 1); t.pil.material.opacity = 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.1)); t.pil.scale.set(1 + 0.8 * u, 1 + 2.4 * ease(u), 1 + 0.8 * u); t.pil.position.y = 0.5 + 0.9 * t.pil.scale.y; } else if (win) t.pil.material.opacity = 0; else { t.pil.material.opacity = 0.12 + 0.08 * p; t.pil.scale.set(1, 1, 1); t.pil.position.y = 1.4; } }
        }
        if (t.sl) { const ok = hooks.canSlide ? hooks.canSlide(t.sl) : true; t.halo2.material.opacity = (ok ? 0.22 + 0.12 * Math.sin(time * 2.6) : 0.05); t.grip.children.forEach((m) => (m.material.opacity = ok ? 0.8 : 0.25)); }
      }
    }

    // ---------- camera ----------
    function placeCam() {
      const a = (az + camOff) * D2R, R = 60; cam.position.set(ctr.x + Math.sin(a) * COSE * R, ctr.y + SINE * R, ctr.z + Math.cos(a) * COSE * R); cam.lookAt(ctr); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); sun.position.copy(sunOff).applyQuaternion(cam.quaternion).add(ctr); sun.target.position.copy(ctr);
    }
    s.setLift = (fy, fx) => { lift = [fy || 0, fx || 0]; if (level) s.resize(); };
    s.resize = function () {
      const r = canvas.getBoundingClientRect(); W_ = Math.max(2, r.width || canvas.clientWidth || 300); H_ = Math.max(2, r.height || canvas.clientHeight || 300);
      renderer.setSize(W_, H_, false); const asp = W_ / H_;
      const hh = Math.max(1.4, ext[1] * 0.92 + 0.4, (ext[0] * 1.02 + 0.5) / asp), hw = hh * asp;
      cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; if (lift[0] || lift[1]) cam.setViewOffset(W_, H_, lift[1] * W_, lift[0] * H_, W_, H_); else cam.clearViewOffset(); bg.material.uniforms.asp.value = asp; placeCam();
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
        if (m.fired === undefined) m.fired = !!entry;
        if (m.want && settled && m.a > 0.55 && !m.fired) { m.fired = true; m.flash = 1; const pp = m.g.position; burst(pp.x, pp.y, pp.z, 26, 1.3, 0.5, 0.9, true); }
        if (!m.want) m.fired = false;
        m.flash = Math.max(0, (m.flash || 0) - dt * 2.0);
        FX.seamUpdate(m.g, vv.x - mx, vv.y - my, vw.x - mx, vw.y - my, time, Math.min(1.6, m.a * (1 + 0.6 * (m.flash || 0))));
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
    // Frame pacing helpers: busy = something is moving (render at full rate); otherwise the game idles at ~30 fps. setScale lowers the render resolution on slow devices.
    s.busy = () => !!(entry || walkS || camAnim || win || drag || hint || twAnim || Object.values(slv).some((v) => v.to));
    s.setScale = (v) => { renderer.setPixelRatio(Math.min(pr, v)); sun.castShadow = v >= 1; s.resize(); };
    s.pr = pr; s._dbg = { sun, hemi, rim, renderer };
    s.screenOf = (id) => { const t = tiles[id]; if (!t) return null; const v = topOf(id, new T.Vector3()).project(cam), r = canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
    s.teleport = function (id) {   // the walker was carried to another tile: puff of light at both ends, no glide
      const a = fig.position.clone(), b = topOf(id, new T.Vector3()); burst(a.x, a.y + 0.2, a.z, 16, 0.9, 0.9, 0.7, false); fig.position.copy(b); figTile = id; landSq = 1; burst(b.x, b.y + 0.2, b.z, 16, 0.9, 0.9, 0.7, false);
    };
    s.walk = function (path, onStep, onDone) {
      if (!path || !path.length) { onDone && onDone(); return; }
      walkS = { path: path.slice(), i: -1, onStep, onDone }; nextHop();
    };
    function figOnTop(on) { onTop(fig, on); }
    function onTop(f, on) { f.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.depthTest = !on; }); o.renderOrder = on ? 50 : 0; } }); }
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
    // Gait: lean into the step, the hood lags a little behind the body, the scarf ripples down its four segments and cracks when you land.
    function poseFigure(u, dt, tm, walking, wt, land, phase) {
      u.wk = (u.wk || 0) + ((walking ? 1 : 0) - (u.wk || 0)) * Math.min(1, dt * 9);
      const lean = u.wk * (0.16 + 0.1 * Math.sin(Math.PI * wt)); u.lean = (u.lean || 0) + (lean - (u.lean || 0)) * Math.min(1, dt * 14);
      u.body.rotation.x = u.lean; u.head.rotation.x = -u.lean * 0.9 + 0.05 * Math.sin(tm * 2.1 + phase); u.head.rotation.z = 0.04 * Math.sin(tm * 1.7 + phase);
      u.tail.rotation.x = 0.28 + u.wk * 0.55 + u.lean * 0.6 + land * 0.5;
      const amp = 0.14 + u.wk * 0.3 + land * 0.5;
      u.segs.forEach((sg, i) => { sg.rotation.x = amp * Math.sin(tm * (4.2 + u.wk * 3) - i * 0.95 + phase) + 0.1; sg.rotation.z = (0.1 + 0.18 * u.wk) * Math.sin(tm * 3.1 - i * 0.8 + phase + 1.3); });
    }
    function updateFigure(dt) {
      if (!fig.visible) { shadow.visible = false; return; } shadow.visible = true;
      const u = fig.userData, w = walkS;
      if (!w && !win && figTile) { topOf(figTile, fig.position); shadowAt(fig.position.y, 0); }
      const tgt = w ? w.yaw : yaw; let d = mod(tgt - yaw + Math.PI, 6.2832) - Math.PI; yaw += d * Math.min(1, dt * 14); fig.rotation.y = yaw;
      landSq = Math.max(0, landSq - dt * 5); let sy = 1 + 0.02 * Math.sin(time * 2.2) - 0.2 * landSq * landSq;
      if (w) { const t = w.t; sy += t < 0.15 ? -0.16 * (1 - t / 0.15) : 0.14 * Math.sin(Math.PI * t); }
      u.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)); u.head.position.y = u.headY + 0.004 * Math.sin(time * 2.2 + 1); poseFigure(u, dt, time, !!w, w ? w.t : 0, landSq, 0);
    }

    // ---------- win ----------
    s.playWin = function (onDone) {
      if (win) return; const gl = Object.values(tiles).find((t) => t.kind === 'goal'); win = { t: 0, onDone, burst: 0, a0: az, goal: gl, wave: null }; if (gl) { const gp = gl.base; win.wave = Object.values(tiles).map((x) => ({ t: x, d: Math.hypot(x.base[0] - gp[0], (x.base[1] - gp[1]) * 1.3, x.base[2] - gp[2]) })); const mx = Math.max(1, ...win.wave.map((o) => o.d)); win.wave.forEach((o) => { o.d /= mx; o.e0 = o.t.mat.emissive.clone(); }); }
      walkS = null; camAnim = null; const g = gl ? topOf(gl.id) : fig.position; burst(g.x, g.y + 0.1, g.z, 40, 1.6, 1.8, 1.4, false);
    };
    function updateWin(dt) {
      const w = win; w.t += dt; if (s._wfreeze != null) w.t = s._wfreeze; const T_ = 3.1, k = clamp(w.t / T_, 0, 1); az = w.a0 + 90 * ease(k);
      cam.zoom = 1 - 0.17 * Math.sin(Math.PI * Math.min(1, k * 1.08));                                  // pull back and let the whole island breathe
      if (w.wave) { const front = clamp((w.t - 0.15) / 1.6, 0, 1.25), glowC = new T.Color(pal.glow);
        for (const o of w.wave) { const wv = clamp(1 - Math.abs(front - o.d) / 0.28, 0, 1), fade = 1 - k * 0.6; o.t.mat.emissive.copy(o.e0).lerp(glowC, wv * 0.55 * fade); o.t.g.position.y += wv * 0.14; } }
      { const U = bg.material.uniforms, boost = 1 + 1.6 * Math.sin(Math.PI * Math.min(1, k * 1.15)); U.hue.value.set(pal.glow).multiplyScalar(boost); }
      const f = clamp((w.t - 0.25) / 1.4, 0, 1), g = w.goal && topOf(w.goal.id);
      if (w.goal) { w.goal.ring.scale.setScalar(1 + 1.2 * Math.sin(Math.PI * Math.min(1, w.t / 0.9))); w.goal.disc.material.opacity = 0.9 * (1 - k); w.goal.halo.material.opacity = 0.7 * (1 - k); w.goal.halo.scale.setScalar(1.5 + 2.5 * Math.min(1, w.t / 0.5)); }
      if (g) { fig.position.set(g.x, g.y + ease(f) * 1.5, g.z); figScale(1 - 0.9 * f * f); yaw += dt * (2 + 10 * f); fig.rotation.y = yaw; shadow.visible = false; if (f > 0 && f < 1) { w.burst += dt; while (w.burst > 0.03) { w.burst -= 0.03; burst(fig.position.x, fig.position.y + 0.3, fig.position.z, 2, 0.5, 0.9, 1.0, false); } } }
      if (f >= 1) fig.visible = false;
      if (twTile && fig2.visible) { const q = topOf(twTile); fig2.position.set(q.x, q.y + ease(f) * 1.5, q.z); fig2Scale(1 - 0.9 * f * f); shadow2.visible = false; if (f >= 1) fig2.visible = false; }
      if (w.t >= T_) { if (w.wave) for (const o of w.wave) o.t.mat.emissive.copy(o.e0); bg.material.uniforms.hue.value.set(pal.glow); cam.zoom = 1; win = null; logical = mod(logical + 1, 4); fig.visible = false; const d = w.onDone; d && d(); }
    }

    // ---------- main frame ----------
    s.frame = function (now) {
      if (disposed || !level) return; now = now || performance.now(); const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now; time = now / 1000;
      const nowp = performance.now();
      if (camAnim) { const k = clamp((nowp - camAnim.t0) / camAnim.dur, 0, 1); az = lerp(camAnim.from, camAnim.to, ease(k)); if (k >= 1) camAnim = null; }
      else if (drag && drag.tgt != null) az += (drag.tgt - az) * Math.min(1, dt * 14);
      for (const id in slv) { const v = slv[id]; if (v.to && !(drag && drag.sl === id)) { const k = clamp((nowp - v.t0) / v.dur, 0, 1), e = ease(k); v.cur = v.from.map((x, i) => lerp(x, v.to[i], e)); if (k >= 1) { v.cur = v.to; v.to = null; } } }
      applyTiles(dt); if (win) updateWin(dt);
      updateWalk(dt); updateFigure(dt); updateTwin(dt); if (entry) entryApply(nowp); placeCam(); updateSeams(dt); updateFx(dt);
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
      if (!enabled || entry || s.isBusy() || !level || (e.pointerType === 'mouse' && e.button !== 0)) return;
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
      if (!enabled || entry || s.isBusy() || !level) return; const k = e.key;
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
