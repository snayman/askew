// "Impossible world" rules. Browser: window.W. Node: require(). Pure logic, no rendering.
// The world is a set of walkable tiles (top faces of unit cubes) in a 3D grid, seen through an ORTHOGRAPHIC
// isometric camera that the player turns in 90-degree steps (cam 0..3). THE RULE: two tiles are connected iff, on
// screen at the current camera, one top face touches the other like a normal neighbour would (the screen offset
// between their centres equals the screen image of a unit step along +-x or +-z). Tiles that are far apart in
// depth/height but line up in the picture are therefore connected — forced perspective, as in Monument Valley/Fez.
// Normal same-height neighbours are connected at every camera (same rule, k=0).
//
// level = {
//   id, name:{ru,en}, hint:{ru,en}, theme:{ hue:'#rrggbb' accent },
//   tiles:[{ id, pos:[x,y,z], kind:'floor'|'start'|'goal'|'switch'|'gate'|'crumble'|'phase'|'toggle'|'warp'|'twin'|'tgoal', pair?:'id' (warp: stepping on it carries you to its pair; wc? colour index), twin = where the mirror twin starts, tgoal = where it must end (the twin copies every step you take, mirrored left-right ON SCREEN; it stays put if it cannot), sw?:'s1' (switch id for switch/toggle/gate), inv?:true (gate that is OPEN until its switch is flipped; a toggle flips it back and forth), ph?:0|1 (phase tile: exists only while cam%2 === ph), slider?:'k1' }],
//   sliders:[{ id, positions:[[dx,dy,dz],...], start:0 }],     // a slider moves ALL its tiles by the chosen offset
//   cam:0                                                     // starting camera
// }
// state = { tile:'id', tw?:'id' (twin tile), cam:0..3, sw:{ s1:true }, sl:{ k1:0 }, gone:{ tileId:true } }   (gone = crumbled tiles)
(function (root) {
  const D2R = Math.PI / 180, EL = 35.264, CAMS = 4, EPS = 0.02;
  const camAz = (c) => 45 + 90 * c;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function basis(az, el) {
    const a = az * D2R, e = el * D2R;
    const d = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
    const l = Math.hypot(d[2], d[0]); const u = [d[2] / l, 0, -d[0] / l];
    const f = [-d[0], -d[1], -d[2]];
    const v = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
    return { dir: d, u, v };
  }
  const bases = [0, 1, 2, 3].map((c) => basis(camAz(c), EL));
  const STEPS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];

  const byId = (level) => (level._m || (level._m = Object.fromEntries(level.tiles.map((t) => [t.id, t]))));
  const sliderOf = (level, id) => level.sliders.find((s) => s.id === id);
  function initial(level) {
    const start = level.tiles.find((t) => t.kind === 'start');
    const sl = {}; for (const s of level.sliders || []) sl[s.id] = s.start || 0;
    const tw = level.tiles.find((t) => t.kind === 'twin'), st = { tile: start.id, cam: level.cam || 0, sw: {}, sl, gone: {} };
    if (tw) st.tw = tw.id;
    return st;
  }
  // Actual cell of a tile in a state (slider offsets applied).
  function cell(level, tile, st) {
    const p = tile.pos.slice();
    if (tile.slider) { const o = sliderOf(level, tile.slider).positions[st.sl[tile.slider]]; p[0] += o[0]; p[1] += o[1]; p[2] += o[2]; }
    return p;
  }
  // gate: open once its switch is pressed. crumble: gone for good once the walker steps off it.
// phase: a ghost tile that exists only from two opposite sides (cam%2 === ph); the tile the walker stands on never vanishes.
const active = (tile, st) => (tile.kind === 'gate' ? (!!st.sw[tile.sw]) !== !!tile.inv : tile.kind === 'crumble' ? !(st.gone && st.gone[tile.id]) : tile.kind === 'phase' ? (((st.cam || 0) % 2) === tile.ph || tile.id === st.tile || tile.id === st.tw) : true);
  // Screen position (x right, y up, in cell units) of the walking point (centre of the top face) at camera c.
  function screen(p, c) { const b = bases[c], P = [p[0] + 0.5, p[1] + 1, p[2] + 0.5]; return [dot(P, b.u), dot(P, b.v)]; }
  // Is the top face of `tile` fully in view at camera c (nothing in front of it)? Rays from a 3x3 grid on the face towards the camera.
  const GRID = [0.2, 0.5, 0.8];
  function faceVisible(level, tile, st, c) {
    const p = cell(level, tile, st), d = bases[c].dir, others = [], sc = Object.assign({}, st, { cam: c });
    for (const t of level.tiles || []) if (t !== tile && active(t, sc)) others.push(cell(level, t, st));
    for (const gx of GRID) for (const gz of GRID) {
      const o = [p[0] + gx, p[1] + 1, p[2] + gz];
      for (const q of others) {
        let t0 = 1e-4, t1 = 1e9;
        for (let k = 0; k < 3 && t1 > t0; k++) {
          const lo = q[k] + 0.02, hi = q[k] + 0.98;
          if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo || o[k] > hi) { t1 = -1; } } else { const a = (lo - o[k]) / d[k], b = (hi - o[k]) / d[k]; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); }
        }
        if (t1 > t0) return false;
      }
    }
    return true;
  }
  // Same-height neighbours always connect. Any other pair connects only through a perspective seam: the two top faces must
  // meet edge to edge on screen AND both be fully visible (an occluding block would break the illusion for the player).
  function connected(level, a, b, st, c) {
    if (a === b || !active(a, st) || !active(b, st)) return false;
    const pa = cell(level, a, st), pb = cell(level, b, st), sa = screen(pa, c), sb = screen(pb, c), bs = bases[c];
    const dx = sb[0] - sa[0], dy = sb[1] - sa[1];
    if (!STEPS.some((s) => Math.abs(dx - dot(s, bs.u)) < EPS && Math.abs(dy - dot(s, bs.v)) < EPS)) return false;
    if (pa[1] === pb[1] && Math.abs(pa[0] - pb[0]) + Math.abs(pa[2] - pb[2]) === 1) return true;
    return faceVisible(level, a, st, c) && faceVisible(level, b, st, c);
  }
  function neighbors(level, st, c = st.cam) {
    const a = byId(level)[st.tile];
    return level.tiles.filter((b) => b.id !== st.tw && connected(level, a, b, st, c)).map((b) => b.id);
  }
  // Pairs that are connected ONLY by perspective (not same-height neighbours) — used to draw the glowing seams.
  function visualPairs(level, st, c = st.cam) {
    const out = [], T = level.tiles;
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      if (!connected(level, T[i], T[j], st, c)) continue;
      const pa = cell(level, T[i], st), pb = cell(level, T[j], st);
      const phys = pa[1] === pb[1] && Math.abs(pa[0] - pb[0]) + Math.abs(pa[2] - pb[2]) === 1;
      if (!phys) out.push([T[i].id, T[j].id]);
    }
    return out;
  }
  function touch(n, t) { if (t.kind === 'switch') n.sw[t.sw] = true; else if (t.kind === 'toggle') { if (n.sw[t.sw]) delete n.sw[t.sw]; else n.sw[t.sw] = true; } } // toggle: every visit flips the lever
  function step(level, st, toId) {
    const B = byId(level), t = B[toId], from = B[st.tile], n = { tile: toId, cam: st.cam, sw: Object.assign({}, st.sw), sl: Object.assign({}, st.sl), gone: Object.assign({}, st.gone) };
    if (st.tw) n.tw = st.tw;
    if (from.kind === 'crumble') n.gone[from.id] = true;
    touch(n, t);
    if (t.kind === 'warp' && t.pair && B[t.pair]) n.tile = t.pair;      // carried to the other end; arriving does not trigger it again
    if (st.tw) {                                                        // the twin mirrors the move on screen (left-right), or stays if it cannot
      const c = st.cam, a = screen(cell(level, from, st), c), b = screen(cell(level, t, st), c), tw0 = B[st.tw], s0 = screen(cell(level, tw0, st), c), dx = b[0] - a[0], dy = b[1] - a[1];
      for (const q of level.tiles) {
        if (q.id === n.tile || !connected(level, tw0, q, n, c)) continue;
        const s1 = screen(cell(level, q, st), c);
        if (Math.abs(s1[0] - s0[0] + dx) < EPS && Math.abs(s1[1] - s0[1] - dy) < EPS) { if (tw0.kind === 'crumble') n.gone[tw0.id] = true; n.tw = q.id; touch(n, q); break; }
      }
    }
    return n;
  }
  const rotate = (st, dir) => Object.assign({}, st, { cam: (st.cam + dir + CAMS) % CAMS });
  function canSlide(level, st, id) { return byId(level)[st.tile].slider !== id; }
  function slide(level, st, id, idx) { return Object.assign({}, st, { sl: Object.assign({}, st.sl, { [id]: idx }) }); }
  const solved = (level, st) => byId(level)[st.tile].kind === 'goal' && (!st.tw || byId(level)[st.tw].kind === 'tgoal');
  const key = (st) => [st.tile, st.tw || '', st.cam, Object.keys(st.sw).sort().join(','), Object.keys(st.sl).sort().map((k) => k + st.sl[k]).join(','), Object.keys(st.gone || {}).sort().join(',')].join('|');

  // Breadth-first solver over (tile, camera, switches, sliders). Returns { len, actions } or null.
  // actions: {t:'rot',dir} | {t:'step',to} | {t:'slide',id,pos}.
  function solve(level, limit = 60, from) {
    const s0 = from || initial(level), seen = new Map([[key(s0), null]]); let frontier = [{ st: s0, path: [] }];
    for (let d = 0; d <= limit && frontier.length; d++) {
      const next = [];
      for (const { st, path } of frontier) {
        if (solved(level, st)) return { len: path.length, actions: path };
        const moves = [];
        for (const dir of [1, -1]) moves.push([rotate(st, dir), { t: 'rot', dir }]);
        for (const to of neighbors(level, st)) moves.push([step(level, st, to), { t: 'step', to }]);
        for (const s of level.sliders || []) if (canSlide(level, st, s.id)) s.positions.forEach((_, i) => { if (i !== st.sl[s.id]) moves.push([slide(level, st, s.id, i), { t: 'slide', id: s.id, pos: i }]); });
        for (const [n, a] of moves) { const k = key(n); if (!seen.has(k)) { seen.set(k, 1); next.push({ st: n, path: path.concat([a]) }); } }
      }
      frontier = next;
    }
    return null;
  }
  // Sanity: unique ids, one start, >=1 goal, solvable. Also reports how many rotations / slides the best solution needs.
  function validate(level) {
    const errors = [], ids = new Set(); let starts = 0, goals = 0;
    for (const t of level.tiles) { if (ids.has(t.id)) errors.push('duplicate tile ' + t.id); ids.add(t.id); if (t.kind === 'start') starts++; if (t.kind === 'goal') goals++; }
    if (starts !== 1) errors.push('need exactly one start'); if (!goals) errors.push('need a goal');
    const sol = errors.length ? null : solve(level);
    if (!errors.length && !sol) errors.push('unsolvable');
    const info = sol ? { len: sol.len, rots: sol.actions.filter((a) => a.t === 'rot').length, steps: sol.actions.filter((a) => a.t === 'step').length, slides: sol.actions.filter((a) => a.t === 'slide').length } : {};
    return { ok: errors.length === 0, errors, info, solution: sol };
  }

  const W = { faceVisible, EL, CAMS, camAz, basis, bases, STEPS, initial, cell, active, screen, connected, neighbors, visualPairs, step, rotate, canSlide, slide, solved, key, solve, validate, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = W; else root.W = Object.assign(root.W || {}, W);
})(typeof window !== 'undefined' ? window : globalThis);
