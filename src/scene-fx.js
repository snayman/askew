// Scene helpers (geometry, figure, particles, background, seams). Needs global THREE (r128) and src/world.js. Browser: W.SceneFx.
(function (root) {
  const T = root.THREE, root_ = root, GOLD = 0xEDE4CF;
  const FIT = { min: 1.0, v: [0.78, 0.3], u: [1.03, 0.32] };   // camera framing: half-height = max(min, ext_v * a + b, (ext_u * c + d) / aspect); shared by scene.js and the architecture validator
  let PLANE = null, GLOW = null;
  const plane = () => PLANE || (PLANE = new T.PlaneGeometry(1, 1));

  // Rounded box 1x1x1 with vertex colours: three face hues (top, x-faces, z-faces) from a palette, darker toward the base for a hint of occlusion.
  function bevelGeo(b, cols) {
    cols = cols || { t: [1, 1, 1], x: [.7, .7, .7], z: [.5, .5, .5] };
    const g = new T.BoxGeometry(1, 1, 1, 3, 3, 3), p = g.attributes.position, n = g.attributes.normal, h = 0.5 - b;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const q = [p.getX(i), p.getY(i), p.getZ(i)], inn = [], d = [];
      for (let k = 0; k < 3; k++) { const a = Math.abs(q[k]); q[k] = a > 0.4 ? Math.sign(q[k]) * 0.5 : Math.sign(q[k]) * h; inn[k] = Math.max(-h, Math.min(h, q[k])); d[k] = q[k] - inn[k]; }
      const l = Math.hypot(d[0], d[1], d[2]), nn = [n.getX(i), n.getY(i), n.getZ(i)];
      if (l > 1e-6) for (let k = 0; k < 3; k++) nn[k] = d[k] / l;
      p.setXYZ(i, inn[0] + nn[0] * b, inn[1] + nn[1] * b, inn[2] + nn[2] * b); n.setXYZ(i, nn[0], nn[1], nn[2]);
      const wt = Math.max(0, nn[1]), wx = Math.abs(nn[0]), wz = Math.abs(nn[2]), bot = Math.max(0, -nn[1]), sw = wt + wx + wz + 1e-6;
      const sh = (1 - 0.35 * bot) * (wt > 0.5 ? 1 : 0.8 + 0.2 * (inn[1] + 0.5)), hl = Math.min(1, 2 * wt * (wx + wz)) * 0.4;        // sides get darker toward the foot; the top edge bevel catches light
      for (let k = 0; k < 3; k++) { const c = (wt * cols.t[k] + wx * cols.x[k] + wz * cols.z[k]) / sw * sh; col[i * 3 + k] = c + (1 - c) * hl; }
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); return g;
  }
  function glowTex() {
    if (GLOW) return GLOW;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (GLOW = new T.CanvasTexture(c));
  }
  function glowSprite(color, scale, opacity) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending }));
    s.scale.set(scale, scale, 1); return s;
  }
  function arrowTex() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.strokeStyle = '#EDE4CF'; x.fillStyle = '#EDE4CF'; x.lineWidth = 16; x.lineCap = 'round'; x.shadowColor = '#EDE4CF'; x.shadowBlur = 24;
    for (let k = 0; k < 2; k++) {
      const a0 = k * Math.PI + 0.25, a1 = a0 + 1.9, R = 205;
      x.beginPath(); x.arc(256, 256, R, a0, a1); x.stroke();
      const ex = 256 + Math.cos(a1) * R, ey = 256 + Math.sin(a1) * R, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
      x.beginPath(); x.moveTo(ex + tx * 34, ey + ty * 34); x.lineTo(ex + nx * 26, ey + ny * 26); x.lineTo(ex - nx * 26, ey - ny * 26); x.closePath(); x.fill();
    }
    return new T.CanvasTexture(c);
  }

  // A faceless traveller: bell-shaped cloak, dark head, tall pointed hat with a brim, one scarlet scarf knotted at the neck whose tail hangs at the side
  // (so it shows from the front too). Faces +z. Height ~0.72.
  function makeFigure(o) {
    o = o || {};
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const mB = new T.MeshLambertMaterial({ color: o.body || 0xEFE8DA, emissive: o.bodyE || 0x22201a }), mH = new T.MeshLambertMaterial({ color: o.hood || 0xE4DBC7, emissive: o.bodyE || 0x22201a }),
      mD = new T.MeshLambertMaterial({ color: o.head || 0x0E1A15, emissive: 0x050a08 }), mS = new T.MeshLambertMaterial({ color: o.scarf || 0xC8202B, emissive: o.scarfE || 0x3a070c });
    const prof = [[0.001, 0], [0.16, 0.012], [0.178, 0.04], [0.15, 0.11], [0.112, 0.2], [0.086, 0.285], [0.092, 0.33], [0.066, 0.372], [0.001, 0.384]], pr = prof.map((p) => new T.Vector2(p[0], p[1]));
    const torso = new T.Mesh(new T.LatheGeometry(pr, 24), mB); body.add(torso);
    const head = new T.Mesh(new T.SphereGeometry(0.074, 20, 16), mD); head.position.y = 0.435; body.add(head);
    const hat = new T.Mesh(new T.ConeGeometry(0.098, 0.27, 24), mH); hat.position.y = 0.155; hat.rotation.z = 0.11; head.add(hat);
    const brim = new T.Mesh(new T.CylinderGeometry(0.135, 0.135, 0.016, 28), mH); brim.position.y = 0.03; head.add(brim);
    const sc = new T.Mesh(new T.TorusGeometry(0.07, 0.03, 10, 24), mS); sc.rotation.x = Math.PI / 2; sc.position.y = 0.352; body.add(sc);
    const knot = new T.Mesh(new T.SphereGeometry(0.034, 12, 10), mS); knot.position.set(0.062, 0.34, 0.046); body.add(knot);
    // the scarf tail: a chain of four ribbons hanging from the knot, each swinging a little behind the one above
    const tail = new T.Group(); tail.position.set(0.075, 0.335, 0.035); body.add(tail);
    const segs = []; let par = tail; const SL = 0.08;
    for (let i = 0; i < 4; i++) { const sg = new T.Group(); sg.position.y = i ? -SL : 0; const m = new T.Mesh(new T.BoxGeometry(0.06 - i * 0.008, SL + 0.004, 0.02), mS); m.position.y = -SL / 2; sg.add(m); par.add(sg); segs.push(sg); par = sg; }
    g.userData = { body, head, tail, segs, headY: 0.435, mats: [mB, mH, mD, mS] }; return g;
  }

  // Additive point pool with per-point size/alpha/colour. Attributes are plain arrays you edit, then call .flush().
  function fxPoints(n, pr) {
    const geo = new T.BufferGeometry(), a = { pos: new Float32Array(n * 3), col: new Float32Array(n * 3), size: new Float32Array(n), alpha: new Float32Array(n) };
    geo.setAttribute('position', new T.BufferAttribute(a.pos, 3)); geo.setAttribute('aCol', new T.BufferAttribute(a.col, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(a.size, 1)); geo.setAttribute('aAlpha', new T.BufferAttribute(a.alpha, 1));
    const mat = new T.ShaderMaterial({
      uniforms: { pr: { value: pr } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aSize;attribute float aAlpha;attribute vec3 aCol;varying float vA;varying vec3 vC;uniform float pr;void main(){vA=aAlpha;vC=aCol;gl_PointSize=aSize*pr;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vC,smoothstep(1.,0.,d)*vA);}',
    });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false;
    pts.flush = () => { for (const k of ['position', 'aCol', 'aSize', 'aAlpha']) geo.attributes[k].needsUpdate = true; };
    pts.arr = a; return pts;
  }

  function makeBackground(hue) {
    const m = new T.ShaderMaterial({
      depthTest: false, depthWrite: false, uniforms: { hue: { value: new T.Color(hue) }, top: { value: new T.Color('#2A2540') }, bot: { value: new T.Color('#3D2F4F') }, asp: { value: 1 } },
      vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy*2.,1.,1.);}',
      fragmentShader: 'varying vec2 vU;uniform vec3 hue,top,bot;uniform float asp;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}' +
        'void main(){vec3 c=mix(bot,top,smoothstep(0.,1.,vU.y));vec2 q=(vU-vec2(.5,.5))*vec2(asp,1.);' +
        'c+=hue*.20*smoothstep(.8,0.,length(q*vec2(.9,1.15)));c+=hue*.07*smoothstep(.22,0.,abs(vU.y-.42))*smoothstep(1.,.2,abs(q.x));' +   // glow behind the scene + a faint horizon band
        'c*=1.-.34*smoothstep(.4,1.1,length((vU-.5)*vec2(1.,1.1)));c+=(h(gl_FragCoord.xy)-.5)*.010;gl_FragColor=vec4(c,1.);}',
    });
    const mesh = new T.Mesh(plane(), m); mesh.renderOrder = -10; mesh.frustumCulled = false; return mesh;
  }

  // Seam: a billboard group (parts in camera plane) = glowing bridge between two tiles that touch only on screen.
  function makeSeam() {
    const g = new T.Group(), tex = glowTex(), p = {};
    for (const k of ['halo', 'core', 'edge', 'd1', 'd2']) {
      const m = new T.MeshBasicMaterial({ map: tex, color: k === 'core' ? 0xFFF8E6 : GOLD, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending });
      const me = new T.Mesh(plane(), m); me.renderOrder = 20; g.add(me); p[k] = me;
    }
    g.userData = p; return g;
  }
  // (ax,ay)/(bx,by) tile top centres relative to the seam midpoint, in camera-plane units; alpha 0..1.
  function seamUpdate(g, ax, ay, bx, by, t, al) {
    const p = g.userData, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), pulse = 0.82 + 0.18 * Math.sin(t * 3.2);
    p.halo.rotation.z = ang; p.halo.scale.set(len * 1.2 + 0.6, 0.8, 1); p.halo.material.opacity = 0.42 * al * pulse;
    p.core.rotation.z = ang; p.core.scale.set(len * 0.95, 0.075, 1); p.core.material.opacity = 0.95 * al;
    p.edge.rotation.z = ang + Math.PI / 2; p.edge.scale.set(1.15, 0.34, 1); p.edge.material.opacity = 0.75 * al * pulse;
    [p.d1, p.d2].forEach((d, i) => { const u = (t * 0.55 + i * 0.5) % 1; d.position.set(ax + dx * u, ay + dy * u, 0); d.scale.set(0.2, 0.2, 1); d.material.opacity = al * Math.sin(Math.PI * u); });
    g.visible = al > 0.01;
  }

  // ---------- architecture (purely visual) ----------
  // Towers, stepped plinths, pillars, arcades and buttresses built under and beside the islands, merged into ONE vertex-coloured geometry (one draw call, no per-frame cost).
  // Every piece is validated at build time: it may not overlap a tile volume, may not hide any walkable top (or the hero standing on it) from any of the 4 cameras,
  // and free-standing pieces must stay inside the framing box. Pieces that fail are dropped, so logic, tiles and the screen-space matching are untouched.
  const STYLE = { 1: 'temple', 2: 'spire', 3: 'zig', 4: 'aque', 5: 'bell', 6: 'spike', 7: 'mono' }, R2 = Math.SQRT2;
  function rng(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  const bx = (o, x, y0, z, w, h, d, sh) => o.push({ x, y: y0 + h / 2, z, w, h, d, sh: sh || 1, hx: w / 2, hz: d / 2 });                         // box standing on y0
  const cyl = (o, x, y0, z, r0, r1, h, sh) => o.push({ x, y: y0 + h / 2, z, rb: r0, rt: r1, h, seg: 10, sh: sh || 1, hx: Math.max(r0, r1), hz: Math.max(r0, r1) });   // round column (foot r0, head r1)
  const pyr = (o, x, y0, z, w0, w1, h, sh) => o.push({ x, y: y0 + h / 2, z, rb: w0 / 2 * R2, rt: w1 / 2 * R2, h, seg: 4, sh: sh || 1, hx: Math.max(w0, w1) / 2, hz: Math.max(w0, w1) / 2 }); // square taper (obelisk / pyramid)
  function under(o, st, x, y, z, nb, r) {     // underside of an island tile: y = bottom of the tile
    const cx = x + 0.5, cz = z + 0.5;
    if (st === 'spike') pyr(o, cx, y - (0.9 + 0.5 * nb + 0.3 * r()), cz, 0.04, 0.8, 0.9 + 0.5 * nb + 0.3 * r(), 0.88);
    else { const n = 1 + Math.min(nb, 3), top = st === 'mono' ? 0.8 : 0.94, tp = st === 'spire' ? 0.27 : 0.2; let yy = y; for (let i = 0; i < n; i++) { const h = 0.3 + 0.07 * i, w = Math.max(0.3, top - tp * i); yy -= h; bx(o, cx, yy, cz, w, h, w, 0.93 - 0.06 * i); } }
  }
  function buttress(o, x, y, z, nx, nz) {      // against a free side face, ending just below the cornice
    for (const s of [-1, 1]) { const px = x + 0.5 + (nx ? nx * 0.58 : s * 0.36), pz = z + 0.5 + (nz ? nz * 0.58 : s * 0.36), w = nx ? 0.24 : 0.16, d = nx ? 0.16 : 0.24;
      bx(o, px, y - 0.7, pz, w, 1.55, d, 0.95); bx(o, px + nx * 0.06, y - 0.7, pz + nz * 0.06, w + (nx ? 0.12 : 0.04), 0.4, d + (nx ? 0.04 : 0.12), 0.9); }
  }
  function pillars(o, x, y, z, nx, nz, nb) {   // arcade: two slender pillars under a free edge, joined by a lintel
    const cx = x + 0.5, cz = z + 0.5, h = 1.1 + 0.4 * (4 - nb);
    for (const s of [-1, 1]) { const px = cx + (nx ? nx * 0.36 : s * 0.3), pz = cz + (nz ? nz * 0.36 : s * 0.3); bx(o, px, y - 0.18, pz, 0.26, 0.18, 0.26, 0.95); cyl(o, px, y - h, pz, 0.14, 0.12, h - 0.18, 0.92); bx(o, px, y - h - 0.1, pz, 0.24, 0.1, 0.24, 0.85); }
    bx(o, cx + (nx ? nx * 0.36 : 0), y - h * 0.62, cz + (nz ? nz * 0.36 : 0), nx ? 0.26 : 0.74, 0.2, nx ? 0.74 : 0.26, 0.9);
  }
  function tower(o, st, x, z, yb, H, r) {      // free-standing: tapered foundation + shaft, base at yb
    for (let i = 0; i < 3; i++) { const w = [0.92, 0.64, 0.38][i]; bx(o, x, yb - 0.3 * (i + 1), z, w, 0.3, w, 0.92 - 0.07 * i); }
    if (st === 'temple') { bx(o, x, yb, z, 0.82, 0.2, 0.82); cyl(o, x, yb + 0.2, z, 0.2, 0.16, H - 0.55); bx(o, x, yb + H - 0.35, z, 0.56, 0.13, 0.56); bx(o, x, yb + H - 0.22, z, 0.7, 0.1, 0.7, 1.04); }
    else if (st === 'spire') { pyr(o, x, yb, z, 0.66, 0.26, H * 0.8); pyr(o, x, yb + H * 0.8, z, 0.3, 0.001, 0.55 + 0.1 * H, 1.06); }
    else if (st === 'zig') { const n = Math.max(3, Math.round(H / 0.6)); let w = 0.82, yy = yb; for (let i = 0; i < n; i++) { const h = H / n; bx(o, x, yy, z, w, h, w, 1 + 0.03 * i); yy += h; w -= 0.52 / n; } }
    else if (st === 'aque') { const ax = r() < 0.5; for (const s of [-1, 1]) { const px = x + (ax ? s * 0.28 : 0), pz = z + (ax ? 0 : s * 0.28); cyl(o, px, yb, pz, 0.14, 0.12, H); bx(o, px, yb + H, pz, 0.26, 0.1, 0.26, 1.04); }
      bx(o, x, yb + H * 0.55, z, ax ? 0.74 : 0.3, 0.2, ax ? 0.3 : 0.74, 0.92); bx(o, x, yb + H, z, ax ? 0.84 : 0.3, 0.12, ax ? 0.3 : 0.84, 1.02); }
    else if (st === 'bell') { bx(o, x, yb, z, 0.72, 0.18); bx(o, x, yb + 0.18, z, 0.5, H - 0.9); bx(o, x, yb + H - 0.72, z, 0.64, 0.12, 0.64, 1.04); bx(o, x, yb + H - 0.6, z, 0.4, 0.34, 0.4); pyr(o, x, yb + H - 0.26, z, 0.52, 0.001, 0.62, 1.06); }
    else if (st === 'spike') { pyr(o, x, yb, z, 0.78, 0.001, H * 1.05); pyr(o, x + 0.34, yb, z + 0.1, 0.34, 0.001, H * 0.55, 0.95); pyr(o, x - 0.3, yb, z - 0.2, 0.3, 0.001, H * 0.4, 0.95); }
    else { const f = r() < 0.5; bx(o, x, yb, z, f ? 0.22 : 0.56, H, f ? 0.56 : 0.22); bx(o, x + (f ? 0.28 : 0), yb, z + (f ? 0 : 0.28), f ? 0.16 : 0.36, H * 0.62, f ? 0.36 : 0.16, 0.94); }
  }
  function archGeo(lv, cols, ctr, ext) {
    const o = [], st = STYLE[lv.ch || 1] || 'temple', r = rng(lv.id || 'x'), B = root_.W.bases, EL = root_.W.EL * Math.PI / 180;
    const ce = Math.cos(EL), se = Math.sin(EL), dirs = [0, 1, 2, 3].map((c) => { const a = root_.W.camAz(c) * Math.PI / 180; return [Math.sin(a) * ce, se, Math.cos(a) * ce]; });
    const key = (x, y, z) => x + ',' + y + ',' + z, at = {}; lv.tiles.forEach((d) => { at[key(d.pos[0], d.pos[1], d.pos[2])] = d; });
    const tb = [], pts = [];                                                          // tile volumes and sample points (tile tops + hero) over every slider position
    for (const d of lv.tiles) { const sd = d.slider && (lv.sliders || []).find((q) => q.id === d.slider);
      for (const f of sd ? sd.positions : [[0, 0, 0]]) { const x = d.pos[0] + f[0], y = d.pos[1] + f[1], z = d.pos[2] + f[2]; tb.push([x + 0.03, y + 0.03, z + 0.03, x + 0.97, y + 0.97, z + 0.97]);
        for (const [dx, dz] of [[0.5, 0.5], [0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) pts.push([x + dx, y + 1.01, z + dz]); pts.push([x + 0.5, y + 1.8, z + 0.5]); } }
    const box = (q) => [q.x - q.hx, q.y - q.h / 2, q.z - q.hz, q.x + q.hx, q.y + q.h / 2, q.z + q.hz];
    const hit = (b, p, d) => { let t0 = 0, t1 = 80; for (let k = 0; k < 3; k++) { if (Math.abs(d[k]) < 1e-6) { if (p[k] < b[k] || p[k] > b[k + 3]) return false; } else { let a = (b[k] - p[k]) / d[k], c = (b[k + 3] - p[k]) / d[k]; if (a > c) { const m = a; a = c; c = m; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return false; } } return true; };
    const ovl = (a, b) => a[0] < b[3] && a[3] > b[0] && a[1] < b[4] && a[4] > b[1] && a[2] < b[5] && a[5] > b[2];
    const okP = (ps, free, acc) => {
      for (const q of ps) { const b = box(q); for (const t of tb) if (ovl(b, t)) return false; if (acc) for (const a of acc) if (ovl(b, a)) return false; }
      for (const q of ps) { const b = box(q); for (const p of pts) for (const d of dirs) if (hit(b, p, d)) return false; }
      if (free) for (const q of ps) for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yy of [q.y - q.h / 2, q.y + q.h / 2]) for (let c = 0; c < 4; c++) { const v = [q.x + sx * q.hx - ctr.x, yy - ctr.y, q.z + sz * q.hz - ctr.z]; if (Math.abs(v[0] * B[c].u[0] + v[1] * B[c].u[1] + v[2] * B[c].u[2]) > ext[0] * FIT.u[0] + FIT.u[1] - 0.06 || Math.abs(v[0] * B[c].v[0] + v[1] * B[c].v[1] + v[2] * B[c].v[2]) > ext[1] * FIT.v[0] + FIT.v[1] - 0.1) return false; }
      return true;
    };
    const solid = lv.tiles.filter((d) => !d.slider && d.kind !== 'crumble' && d.kind !== 'phase' && d.kind !== 'gate'), FACES = [[1, 0], [-1, 0], [0, 1], [0, -1]], keep = [], cand = [];
    for (const d of solid) { const [x, y, z] = d.pos, free = FACES.filter(([a, b]) => !at[key(x + a, y, z + b)]), nb = 4 - free.length;
      if (!at[key(x, y - 1, z)]) { const ps = []; under(ps, st, x, y, z, nb, r); if (okP(ps, false)) keep.push(...ps); }
      for (const [a, b] of free) { if (r() < 0.55 && (st === 'temple' || st === 'zig' || st === 'bell')) { const ps = []; buttress(ps, x, y, z, a, b); if (okP(ps, false)) keep.push(...ps); }
        else if (st === 'aque' && r() < 0.6 && !at[key(x, y - 1, z)]) { const ps = []; pillars(ps, x, y, z, a, b, nb); if (okP(ps, false)) keep.push(...ps); }
        for (const k of [1, 2, 3]) cand.push([x + a * k + 0.5, z + b * k + 0.5, y - (r() < 0.35 ? 1 : 0)]); } }
    cand.forEach((c) => { c.s = Math.hypot(c[0] - ctr.x, c[1] - ctr.z) + r() * 1.6; }); cand.sort((a, b) => b.s - a.s);   // prefer the outer rim, away from the gaps where islands meet
    const acc = keep.map(box), want = Math.max(2, Math.min(8, Math.round(solid.length / 5) + 2)), ctrs = []; let n = 0;
    for (const [x, z, yb] of cand) { if (n >= want) break; if (ctrs.some((c) => Math.hypot(c[0] - x, c[1] - z) < 2.3)) continue;
      for (const H of st === 'mono' || st === 'spire' ? [4.6, 3.6, 2.6, 1.7] : [3.8, 2.9, 2.1, 1.4]) { const ps = []; tower(ps, st, x, z, yb, H, r); if (okP(ps, true, acc)) { keep.push(...ps); acc.push(...ps.map(box)); ctrs.push([x, z]); n++; break; } } }
    if (!keep.length) return null;
    const pos = [], nor = [], col = [], uv = [], tt = cols.t, xx = cols.x.map((v, k) => v + (tt[k] - v) * 0.14), zz = cols.z.map((v, k) => v + (tt[k] - v) * 0.14);   // faces lifted a little so dark chapters keep the shapes readable
    for (const q of keep) {
      const g = (q.seg ? new T.CylinderGeometry(q.rt, q.rb, q.h, q.seg, 1) : new T.BoxGeometry(q.w, q.h, q.d)).toNonIndexed(), p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv, rot = q.seg === 4 ? Math.PI / 4 : 0, c = Math.cos(rot), s = Math.sin(rot), c_ = 1;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), nx = nn.getX(i), ny = nn.getY(i), nz = nn.getZ(i), wt = Math.max(0, ny), wx = Math.abs(nx), wz = Math.abs(nz), sw = wt + wx + wz + 1e-6;
        pos.push(q.x + x * c + z * s, q.y + p.getY(i), q.z - x * s + z * c); nor.push(nx * c + nz * s, ny, -nx * s + nz * c); uv.push(u.getX(i), u.getY(i));
        for (let k = 0; k < 3; k++) { const c = (wt * tt[k] + wx * xx[k] + wz * zz[k]) / sw * q.sh * (1 - 0.4 * Math.max(0, -ny)) * (ny > 0.5 ? 1 : 0.9 + 0.2 * (p.getY(i) > 0 ? 1 : 0)), lit = (ny > 0.5 ? 0.22 : 0) + (nx * c_ > 0.5 && p.getY(i) > 0 ? 0.12 : 0); col.push(c + (1 - c) * lit); }
      }
      g.dispose();
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); return geo;
  }

  root.W = root.W || {}; root.W.SceneFx = { archGeo, GOLD, bevelGeo, glowTex, glowSprite, arrowTex, makeFigure, fxPoints, makeBackground, makeSeam, FIT, seamUpdate, plane };
})(typeof window !== 'undefined' ? window : globalThis);
