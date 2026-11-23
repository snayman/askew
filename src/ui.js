// Askew UI helpers (no game rules): screens, toast, coach card, level cards with mini iso diagrams, how-to art, win stars.
// window.V.UI. Used by game.js.
(function (root) {
  const V = (root.V = root.V || {}), W = root.W, doc = document;
  const $ = (id) => doc.getElementById(id), t = (k, p) => V.i18n.t(k, p);
  const SVG = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  const screens = Array.from(doc.querySelectorAll('.screen'));
  let cur = 'splash'; const hooks = {};

  function go(name) {
    if (name === 'back') name = 'menu';
    const prev = cur; cur = name; $('app').classList.toggle('on-menu', name === 'menu');
    screens.forEach((s) => { const on = s.dataset.screen === name; s.classList.toggle('is-active', on); s.inert = !on; s.setAttribute('aria-hidden', on ? 'false' : 'true'); });
    [hooks['*'], hooks[name]].forEach((h, k) => { if (h) try { h(k ? prev : name, prev); } catch (e) { if (root.console) console.error('screen hook', name, e); } });   // a failing hook never blocks navigation
    const f = doc.querySelector('.screen.is-active .btn-primary, .screen.is-active .icon-btn'); if (f && keyNav && name !== 'play') try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  // toast (bottom of play screen)
  let toastTimer = 0;
  function toast(text, ms) {
    const el = $('toast'); el.textContent = text; el.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-on'), ms || 2400);
  }

  // coach card: top, slim, animated hand. kind: 'drag' | 'tap'
  const Coach = {
    on: false, onClose: null,
    show(text, sub, kind) {
      const el = $('coach'), was = this.on; this.on = true;
      $('coach-art').className = 'coach-art ' + (kind === 'tap' ? 'tap' : 'drag');
      $('coach-art').innerHTML = SVG('i-hand');
      $('coach-text').textContent = text; $('coach-sub').textContent = sub || '';
      el.hidden = false; el.classList.remove('swap'); void el.offsetWidth; if (was) el.classList.add('swap');
      if (!was) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
      clearTimeout(this.timer); this.timer = setTimeout(() => this.hide(), 4200);   // the card never lingers: it steps aside after ~4 s (a tap on x still marks the tutorial done)
    },
    hide() { clearTimeout(this.timer); this.on = false; $('coach').hidden = true; },
  };

  function stars(n, el, big) {
    let h = ''; for (let i = 0; i < 3; i++) h += '<svg class="ic' + (i < n ? ' on' : '') + '" style="--d:' + (0.35 + i * 0.22) + 's" aria-hidden="true"><use href="#i-star"/></svg>';
    el.innerHTML = h;
  }

  // ---- mini iso diagram of a level at its start camera (same projection as the world rules) ----
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const TOP = { floor: '#3F5F50', start: '#8FD6B8', goal: '#EDE4CF', switch: '#D9CFB8', gate: '#8FD6B8', crumble: '#A9633F', phase: '#8FD6B8', toggle: '#D9CFB8', warp: '#EDE4CF', twin: '#7FE3B8', tgoal: '#7FE3B8' };
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))); return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; }
  function drawMini(cv, level, st, sz) {   // sz = [w, h] draws at an exact pixel size (used for the share picture)
    const r = sz ? { width: sz[0], height: sz[1] } : cv.getBoundingClientRect(), dpr = sz ? 1 : Math.min(2, root.devicePixelRatio || 1);
    const w = (cv.width = Math.max(2, Math.round(r.width * dpr))), h = (cv.height = Math.max(2, Math.round(r.height * dpr)));
    const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
    const b = W.bases[st.cam], pr = (P) => [dot(P, b.u), -dot(P, b.v)];
    const items = level.tiles.map((tl) => { const p = W.cell(level, tl, st); return { tl, p, d: dot([p[0] + .5, p[1] + .5, p[2] + .5], b.dir) }; }).sort((a, c) => a.d - c.d);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    items.forEach(({ p }) => { for (let i = 0; i < 8; i++) { const q = pr([p[0] + (i & 1), p[1] + ((i >> 1) & 1), p[2] + (i >> 2)]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } });
    const k = Math.min(w * 0.78 / (x1 - x0), h * 0.74 / (y1 - y0)), ox = w / 2 - ((x0 + x1) / 2) * k, oy = h / 2 - ((y0 + y1) / 2) * k;
    const P = (q) => [q[0] * k + ox, q[1] * k + oy];
    const poly = (pts, fill, stroke, dash) => { g.beginPath(); pts.forEach((q, i) => { const s = P(pr(q)); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.setLineDash(dash || []); g.strokeStyle = stroke; g.lineWidth = Math.max(1, dpr); g.stroke(); } };
    items.forEach(({ tl, p }) => {
      const [x, y, z] = p, base = tl.slider ? '#6FA88A' : tl.kind === 'phase' && tl.ph ? '#EDE4CF' : TOP[tl.kind] || TOP.floor, gate = (tl.kind === 'gate' && !tl.inv) || tl.kind === 'phase', a = tl.kind === 'phase' ? 0.55 : gate ? 0.35 : 1;
      g.globalAlpha = a;
      const sides = [[[1, 0, 0], [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], .7], [[-1, 0, 0], [[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]], .7],
        [[0, 0, 1], [[x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], .5], [[0, 0, -1], [[x, y, z], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y, z]], .5]];
      sides.forEach(([n, q, s]) => { if (dot(n, b.dir) > 0) poly(q, shade(base === TOP.floor ? '#1C3329' : base, s * (base === TOP.floor ? 1 : .75)), 'rgba(0,0,0,.35)'); });
      if (tl.kind === 'goal') { const c = P(pr([x + .5, y + 1, z + .5])); g.shadowColor = '#EDE4CF'; g.shadowBlur = 18 * dpr; poly([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], base); g.shadowBlur = 0; g.beginPath(); g.arc(c[0], c[1], k * .16, 0, 7); g.fillStyle = '#fff'; g.fill(); }
      else poly([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], gate ? null : base, gate ? (tl.kind === 'phase' ? base : '#8FD6B8') : 'rgba(255,255,255,.18)', gate ? [4 * dpr, 3 * dpr] : null);
      if (tl.kind === 'phase') { const c = P(pr([x + .5, y + 1, z + .5])), r = k * .13; g.beginPath(); if (tl.ph) { g.moveTo(c[0], c[1] - r * 1.2); g.lineTo(c[0] + r * 1.2, c[1]); g.lineTo(c[0], c[1] + r * 1.2); g.lineTo(c[0] - r * 1.2, c[1]); g.closePath(); } else g.arc(c[0], c[1], r, 0, 7); g.strokeStyle = base; g.lineWidth = Math.max(1.5, 1.6 * dpr); g.stroke(); }
      if (tl.kind === 'warp' || tl.kind === 'twin' || tl.kind === 'tgoal') { const c = P(pr([x + .5, y + 1, z + .5])); g.beginPath(); g.arc(c[0], c[1], k * (tl.kind === 'twin' ? .13 : .2), 0, 7); g.fillStyle = tl.kind === 'twin' ? '#0A1210' : 'rgba(11,13,20,.55)'; g.fill(); g.lineWidth = 1.6 * dpr; g.strokeStyle = tl.kind === 'warp' ? (tl.wc ? '#8FD6B8' : '#EDE4CF') : '#CFF4E4'; if (tl.kind !== 'twin') g.stroke(); }
      if (tl.kind === 'start') { const c = P(pr([x + .5, y + 1, z + .5])); g.beginPath(); g.arc(c[0], c[1], k * .13, 0, 7); g.fillStyle = '#0A1210'; g.fill(); }
      g.globalAlpha = 1; g.setLineDash([]);
    });
  }

  // ---- chapter map: each chapter is a small drawn island (SVG, no filters), tinted by its own hue (see .cm.cN in theme.css), with its levels as nodes along a path ----
  const CM_W = 320, CM_COLS = [56, 160, 264], CM_PITCH = 62, CM_TOP = 36;
  function mapSvg(pts, n, H, solvedFlags) {
    let sd = n * 9301 + 49297; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280 - .5; };
    const x0 = 14, x1 = CM_W - 14, y0 = 12, y1 = H - 40, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const base = [[x0 + 26, y0 + 6], [mx, y0 - 4], [x1 - 30, y0 + 8], [x1 + 4, y0 + 40], [x1 - 2, my + 20], [x1 - 24, y1 - 2], [mx + 20, y1 + 6], [x0 + 34, y1], [x0 - 4, y1 - 36], [x0 + 2, my - 10], [x0 - 2, y0 + 36]];
    const poly = base.map((q) => [Math.round(q[0] + rnd() * 14), Math.round(q[1] + rnd() * 10)]);
    const d = 'M' + poly.map((q) => q.join(' ')).join('L') + 'Z';
    const ring = (k) => '<path class="cm-contour" vector-effect="non-scaling-stroke" transform="translate(' + mx + ' ' + my + ') scale(' + k + ') translate(' + -mx + ' ' + -my + ')" d="' + d + '"/>';
    let g = '<path class="cm-cliff" d="' + d + '" transform="translate(0 8)"/><path class="cm-top" d="' + d + '"/>' + ring(.86) + ring(.7);
    const f = (v) => Math.round(v * 10) / 10;
    // lead-in: the path enters the island from its edge, so level 1 sits ON a path
    const s0 = [Math.max(x0 + 14, pts[0][0] - 36), pts[0][1] + 10];
    g += '<path class="cm-seg lead' + (solvedFlags[0] ? ' on' : '') + '" d="M' + s0[0] + ' ' + s0[1] + 'Q' + f(s0[0] + 14) + ' ' + f(pts[0][1] + 10) + ' ' + pts[0][0] + ' ' + pts[0][1] + '"/><circle class="cm-start" cx="' + s0[0] + '" cy="' + s0[1] + '" r="2.6"/>';
    pts.slice(1).forEach((q, i) => {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = q, p3 = pts[Math.min(pts.length - 1, i + 2)];
      g += '<path class="cm-seg' + (solvedFlags[i] ? ' on' : '') + '" d="M' + p1[0] + ' ' + p1[1] + 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0] + ' ' + p2[1] + '"/>';
    });
    return '<svg class="cm-svg" viewBox="0 0 ' + CM_W + ' ' + H + '" aria-hidden="true" focusable="false">' + g + '</svg>';
  }

  // chapter emblems: small isometric tower / column silhouettes, one per chapter. box = [centre x, base y, half width, height, mode]
  const EMB = [
    [[15, 40, 9, 12], [33, 34, 9, 24]],                                            // 1 seam: two edges, two heights
    [[24, 43, 11, 6], [24, 37, 5, 22], [24, 15, 8, 4]],                           // 2 mechanisms: a column with a capital
    [[20, 43, 11, 10], [27, 33, 8, 10], [22, 23, 6, 8], [38, 15, 3.5, 3.5]],      // 3 fragile: a stack coming apart
    [[24, 43, 10, 30, 'd']],                                                       // 4 ghosts: an outline only
    [[24, 43, 5, 24], [24, 19, 15, 4]],                                            // 5 balance: a slab on a pillar
    [[11, 43, 6, 27], [37, 43, 6, 27], [24, 16, 18, 4]],                           // 6 portals: an arch
    [[24, 24, 8, 17], [24, 46, 8, 13, 'm']],                                       // 7 reflection: a column and its echo
  ];
  function emblem(n) {
    const box = ([cx, by, w, h, m]) => {
      const T = 'M' + cx + ' ' + (by - h - w / 2) + 'L' + (cx + w) + ' ' + (by - h) + 'L' + cx + ' ' + (by - h + w / 2) + 'L' + (cx - w) + ' ' + (by - h) + 'Z',
        L = 'M' + (cx - w) + ' ' + (by - h) + 'L' + cx + ' ' + (by - h + w / 2) + 'L' + cx + ' ' + (by + w / 2) + 'L' + (cx - w) + ' ' + by + 'Z',
        R = 'M' + (cx + w) + ' ' + (by - h) + 'L' + cx + ' ' + (by - h + w / 2) + 'L' + cx + ' ' + (by + w / 2) + 'L' + (cx + w) + ' ' + by + 'Z';
      if (m === 'd') return '<g class="e-d"><path d="' + T + L + R + '"/></g>';
      return '<g' + (m === 'm' ? ' class="e-m"' : '') + '><path class="e-l" d="' + L + '"/><path class="e-r" d="' + R + '"/><path class="e-t" d="' + T + '"/></g>';
    };
    return '<svg class="cm-emb" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + (n === 7 ? '<path class="e-line" d="M6 29H42"/>' : '') + EMB[(n - 1) % EMB.length].map(box).join('') + '</svg>';
  }

  let keyNav = false; doc.addEventListener('keydown', () => { keyNav = true; }, true); doc.addEventListener('pointerdown', () => { keyNav = false; }, true);

  function buildLevels(prog, onPick) {
    const grid = $('lv-grid'); grid.innerHTML = ''; let solved = 0;
    const chs = (W.CHAPTERS || [{ n: 1 }]).map((c) => c.n), frag = doc.createDocumentFragment();
    const isPw = (lv) => !!(V.paywall && V.paywall.locked(lv)), curIdx = W.LEVELS.findIndex((lv) => !prog.solved[lv.id] && !isPw(lv));
    chs.forEach((cn) => {
      const c = (W.CHAPTERS || []).find((x) => x.n === cn), inCh = W.LEVELS.map((lv, i) => ({ lv, i })).filter((o) => (o.lv.ch || 1) === cn);
      if (!inCh.length) return;
      const done = inCh.filter((o) => prog.solved[o.lv.id]).length, stars = inCh.reduce((s, o) => s + (prog.solved[o.lv.id] ? prog.solved[o.lv.id].stars : 0), 0), pwCh = inCh.every((o) => isPw(o.lv));
      const rows = Math.ceil(inCh.length / 3), H = CM_TOP + (rows - 1) * CM_PITCH + 64;
      const pts = inCh.map((o, k) => { const r = Math.floor(k / 3), col = r % 2 ? 2 - (k % 3) : k % 3; return [CM_COLS[col], CM_TOP + r * CM_PITCH + ((k * 7 + cn * 3) % 5 - 2) * 3]; });
      const sec = doc.createElement('section'); sec.className = 'cm c' + ((cn - 1) % 7 + 1) + (pwCh ? ' pro' : '') + (done === inCh.length ? ' full' : '');
      sec.setAttribute('aria-label', t('ch.n', { n: cn }) + (c ? '. ' + V.i18n.pick(c.name) : ''));
      const line = t('chl.' + cn);
      sec.innerHTML = '<header class="cm-head"><div class="cm-txt"><span class="cm-n">' + t('ch.n', { n: cn }) + (pwCh ? '<i class="cm-lock">' + SVG('i-lock') + '</i>' : '') + '</span><h3>' + (c ? V.i18n.pick(c.name) : '') + '</h3>' +
        (line && line !== 'chl.' + cn ? '<p>' + line + '</p>' : '') + '</div><div class="cm-side">' + emblem(cn) + '<small>' + done + '/' + inCh.length + (stars ? ' · ' + stars + ' ★' : '') + '</small></div></header>';
      const map = doc.createElement('div'); map.className = 'cm-map'; map.style.aspectRatio = CM_W + ' / ' + H;
      map.innerHTML = mapSvg(pts, cn, H, inCh.map((o) => !!prog.solved[o.lv.id]));
      inCh.forEach((o, k) => {
        const lv = o.lv, i = o.i, pw = isPw(lv), rec = prog.solved[lv.id], open = !pw && (i === 0 || !!prog.solved[W.LEVELS[i - 1].id] || W.LEVELS.slice(i).some((x) => prog.solved[x.id])), b = doc.createElement('button');
        if (rec) solved++;
        b.className = 'cm-node' + (rec ? ' done' : '') + (open ? '' : ' locked') + (pw ? ' pro' : '') + (i === curIdx ? ' current' : '');
        b.style.left = (pts[k][0] / CM_W * 100).toFixed(2) + '%'; b.style.top = (pts[k][1] / H * 100).toFixed(2) + '%';
        b.disabled = !open && !pw;
        b.setAttribute('aria-label', (i + 1) + '. ' + V.i18n.pick(lv.name) + ', ' + (pw ? t('levels.pro') : open ? (rec ? t('levels.best', { n: rec.best }) + ', ' + rec.stars + '/3 ★' : t('levels.new')) : t('levels.locked')));
        b.innerHTML = '<span class="cm-dot">' + (i + 1) + '</span>' + (!open || pw ? '<span class="cm-lk" aria-hidden="true">' + SVG('i-lock') + '</span>' : '') + (rec ? '<span class="cm-st" aria-hidden="true">' + [0, 1, 2].map((s) => SVG('i-star', s < rec.stars ? 'on' : '')).join('') + '</span>' : '');
        b.addEventListener('click', () => { if (pw) V.paywall.offer(); else if (open) onPick(i); }); map.appendChild(b);
      });
      sec.appendChild(map); frag.appendChild(sec);
    });
    grid.appendChild(frag);
    $('lv-sub').textContent = t('levels.sub', { n: solved, m: W.LEVELS.length });
    // bring the chapter you are on into view (the screen may still be fading in, so measure on the next frame)
    requestAnimationFrame(() => {
      const sc = grid.parentElement, cur = grid.querySelector('.cm-node.current'); if (!sc || !cur || !sc.clientHeight) return;
      const dy = cur.getBoundingClientRect().top - sc.getBoundingClientRect().top; sc.scrollTo({ top: sc.scrollTop + dy - (sc.clientHeight - cur.offsetHeight) / 2, behavior: 'instant' });   // centred, instant (no smooth scroll: it would fight the screen fade-in and reduced motion)
    });
  }

  // ---- how to ----
  const dia = (x, y, c, w, h) => '<path class="' + c + '" d="M' + x + ' ' + (y - h) + 'L' + (x + w) + ' ' + y + 'L' + x + ' ' + (y + h) + 'L' + (x - w) + ' ' + y + 'Z"/>';
  const ART = [
    '<ellipse class="dash" cx="56" cy="46" rx="44" ry="20"/>' + dia(56, 46, 't', 20, 11) + dia(56, 57, 't2', 20, 11).replace('class="t2"', 'class="t2" opacity=".5"') + '<path class="ar" d="M16 66Q56 90 96 66M89 61L96 66L88 71"/>',
    dia(40, 68, 't', 20, 11) + '<path class="dash" d="M60 66V84M44 86q16 5 32 0"/>' + dia(60, 55, 't2', 20, 11) + '<path class="seam" d="M40 57L60 68"/>',
    dia(24, 74, 't', 16, 9) + dia(44, 62, 't', 16, 9) + dia(64, 50, 't', 16, 9) + dia(84, 38, 't2', 16, 9) + '<circle class="dot" cx="24" cy="70" r="4"/><circle cx="84" cy="36" r="12" fill="rgba(233,194,122,.16)"/><circle class="dot" cx="84" cy="36" r="3.5"/>',
  ];
  const G_ = (c, body) => '<svg viewBox="0 0 28 28" aria-hidden="true" style="color:' + c + '">' + body + '</svg>';
  const LEG = [
    ['lever', '#D9CFB8', '<circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="14" r="3.6" fill="currentColor"/>'],
    ['slider', '#6FA88A', '<rect x="5" y="6" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 14h8M15 11l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
    ['crumble', '#B4623C', '<rect x="5" y="6" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8l4 6-3 3 4 5M19 8l-3 5 4 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'],
    ['ghost', '#8FD6B8', '<path d="M14 5l9 9-9 9-9-9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2.5"/>'],
    ['portal', '#EDE4CF', '<circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="14" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="14" r="1.6" fill="currentColor"/>'],
    ['twin', '#7FE3B8', '<ellipse cx="14" cy="17" rx="6" ry="6.5" fill="currentColor" opacity=".85"/><circle cx="14" cy="9" r="4" fill="currentColor"/><path d="M14 3v22" stroke="#0B0D14" stroke-width="1" opacity=".5"/>'],
  ];
  const legend = () => '<h3 class="legend-h">' + t('how.legend') + '</h3><div class="legend">' + LEG.map(([k, c, body]) => '<div class="legend-i">' + G_(c, body) + '<div><b>' + t('how.l.' + k) + '</b><span>' + t('how.l.' + k + '.p') + '</span></div></div>').join('') + '</div><p class="how-note">' + t('how.hint') + '</p>';
  function buildHow() {
    $('how-list').innerHTML = [1, 2, 3].map((n) => '<div class="step"><svg class="step-art" viewBox="0 0 112 96" aria-hidden="true">' + ART[n - 1] + '</svg><div class="step-text"><span class="step-n">0' + n + '</span><h3>' + t('how.' + n + '.h') + '</h3><p>' + t('how.' + n + '.p') + '</p></div></div>').join('') +
      '<p class="how-note">' + t('how.stars') + '</p>' + legend();
  }

  V.UI = { $, t, SVG, go, toast, Coach, stars, drawMini, buildLevels, buildHow, cur: () => cur, on: (n, f) => { hooks[n] = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
