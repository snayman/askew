// Scene helpers (geometry, figure, particles, background, seams). Needs global THREE (r128) and src/world.js. Browser: W.SceneFx.
(function (root) {
  const T = root.THREE, GOLD = 0xEDE4CF;
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
      const sh = (1 - 0.35 * bot) * (wt > 0.5 ? 1 : 0.8 + 0.2 * (inn[1] + 0.5));        // sides get darker toward the foot
      for (let k = 0; k < 3; k++) col[i * 3 + k] = (wt * cols.t[k] + wx * cols.x[k] + wz * cols.z[k]) / sw * sh;
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

  root.W = root.W || {}; root.W.SceneFx = { GOLD, bevelGeo, glowTex, glowSprite, arrowTex, makeFigure, fxPoints, makeBackground, makeSeam, seamUpdate, plane };
})(typeof window !== 'undefined' ? window : globalThis);
