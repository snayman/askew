// Scene helpers (geometry, figure, particles, background, seams). Needs global THREE (r128) and src/world.js. Browser: W.SceneFx.
(function (root) {
  const T = root.THREE, GOLD = 0xE9C27A;
  let PLANE = null, GLOW = null;
  const plane = () => PLANE || (PLANE = new T.PlaneGeometry(1, 1));

  // Rounded box 1x1x1 with vertex colours: top lighter, bottom darker.
  function bevelGeo(b) {
    const g = new T.BoxGeometry(1, 1, 1, 3, 3, 3), p = g.attributes.position, n = g.attributes.normal, h = 0.5 - b;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const q = [p.getX(i), p.getY(i), p.getZ(i)], inn = [], d = [];
      for (let k = 0; k < 3; k++) { const a = Math.abs(q[k]); q[k] = a > 0.4 ? Math.sign(q[k]) * 0.5 : Math.sign(q[k]) * h; inn[k] = Math.max(-h, Math.min(h, q[k])); d[k] = q[k] - inn[k]; }
      const l = Math.hypot(d[0], d[1], d[2]), nn = [n.getX(i), n.getY(i), n.getZ(i)];
      if (l > 1e-6) for (let k = 0; k < 3; k++) nn[k] = d[k] / l;
      p.setXYZ(i, inn[0] + nn[0] * b, inn[1] + nn[1] * b, inn[2] + nn[2] * b); n.setXYZ(i, nn[0], nn[1], nn[2]);
      const top = Math.max(0, nn[1]), bot = Math.max(0, -nn[1]);
      let c = 0.74 + 0.26 * top - 0.3 * bot; if (top < 0.5) c *= 0.84 + 0.16 * (inn[1] + 0.5);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c;
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
    x.strokeStyle = '#E9C27A'; x.fillStyle = '#E9C27A'; x.lineWidth = 16; x.lineCap = 'round'; x.shadowColor = '#E9C27A'; x.shadowBlur = 24;
    for (let k = 0; k < 2; k++) {
      const a0 = k * Math.PI + 0.25, a1 = a0 + 1.9, R = 205;
      x.beginPath(); x.arc(256, 256, R, a0, a1); x.stroke();
      const ex = 256 + Math.cos(a1) * R, ey = 256 + Math.sin(a1) * R, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
      x.beginPath(); x.moveTo(ex + tx * 34, ey + ty * 34); x.lineTo(ex + nx * 26, ey + ny * 26); x.lineTo(ex - nx * 26, ey - ny * 26); x.closePath(); x.fill();
    }
    return new T.CanvasTexture(c);
  }

  // Small rounded character: pill body, sphere head, gold scarf with a tail. Faces +z.
  function makeFigure(o) {
    o = o || {};
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const mB = new T.MeshLambertMaterial({ color: o.body || 0xF1E8D6, emissive: o.bodyE || 0x2b2519 }), mS = new T.MeshLambertMaterial({ color: o.scarf || GOLD, emissive: o.scarfE || 0x6b5424 });
    const H = 0.34, R = 0.15, pr = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; pr.push(new T.Vector2(Math.max(0.001, Math.cos(a) * R), R + Math.sin(a) * R)); }
    for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pr.push(new T.Vector2(Math.max(0.001, Math.cos(a) * R * 0.92), H - R + 0.04 + Math.sin(a) * R)); }
    const torso = new T.Mesh(new T.LatheGeometry(pr, 18), mB); body.add(torso);
    const head = new T.Mesh(new T.SphereGeometry(0.115, 18, 14), mB); head.position.y = H + 0.05; body.add(head);
    const eyeM = new T.MeshBasicMaterial({ color: 0x1b1f2c });
    for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.017, 8, 6), eyeM); e.position.set(sx * 0.04, H + 0.07, 0.1); body.add(e); }
    const sc = new T.Mesh(new T.TorusGeometry(0.115, 0.032, 8, 20), mS); sc.rotation.x = Math.PI / 2; sc.position.y = H - 0.07; body.add(sc);
    const tail = new T.Group(); tail.position.set(-0.08, H - 0.07, -0.1); const tm = new T.Mesh(new T.BoxGeometry(0.05, 0.15, 0.025), mS); tm.position.y = -0.07; tail.add(tm); body.add(tail);
    g.userData = { body, head, tail, mats: [mB, mS] }; return g;
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
      depthTest: false, depthWrite: false, uniforms: { hue: { value: new T.Color(hue) }, asp: { value: 1 } },
      vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy*2.,1.,1.);}',
      fragmentShader: 'varying vec2 vU;uniform vec3 hue;uniform float asp;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}' +
        'void main(){vec3 a=vec3(.043,.051,.078),b=vec3(.102,.118,.169);vec3 c=mix(b,a,smoothstep(0.,1.,vU.y));' +
        'vec2 q=(vU-vec2(.5,.52))*vec2(asp,1.);c+=hue*.085*smoothstep(.75,0.,length(q));c*=1.-.4*smoothstep(.35,1.05,length((vU-.5)*vec2(1.,1.15)));c+=(h(gl_FragCoord.xy)-.5)*.008;gl_FragColor=vec4(c,1.);}',
    });
    const mesh = new T.Mesh(plane(), m); mesh.renderOrder = -10; mesh.frustumCulled = false; return mesh;
  }

  // Seam: a billboard group (parts in camera plane) = glowing bridge between two tiles that touch only on screen.
  function makeSeam() {
    const g = new T.Group(), tex = glowTex(), p = {};
    for (const k of ['halo', 'core', 'edge', 'd1', 'd2']) {
      const m = new T.MeshBasicMaterial({ map: tex, color: k === 'core' ? 0xFFF1CF : GOLD, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending });
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
