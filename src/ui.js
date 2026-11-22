// Vantage UI helpers (no game rules): screens, toast, coach card, level cards with mini iso diagrams, how-to art, win stars.
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
    if (hooks[name]) hooks[name](prev);
    const f = doc.querySelector('.screen.is-active .btn-primary, .screen.is-active .icon-btn'); if (f && name !== 'play') try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
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
    },
    hide() { this.on = false; $('coach').hidden = true; },
  };

  function stars(n, el, big) {
    let h = ''; for (let i = 0; i < 3; i++) h += '<svg class="ic' + (i < n ? ' on' : '') + '" style="--d:' + (0.35 + i * 0.22) + 's" aria-hidden="true"><use href="#i-star"/></svg>';
    el.innerHTML = h;
  }

  // ---- mini iso diagram of a level at its start camera (same projection as the world rules) ----
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const TOP = { floor: '#4A5680', start: '#5CC6D9', goal: '#F6D898', switch: '#C79BF2', gate: '#C79BF2', crumble: '#B98A66', phase: '#6FD3E6', toggle: '#C79BF2', warp: '#B58CFF', twin: '#6FD3E6', tgoal: '#6FD3E6' };
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
      const [x, y, z] = p, base = tl.slider ? '#8FCF8A' : tl.kind === 'phase' && tl.ph ? '#FFC857' : TOP[tl.kind] || TOP.floor, gate = (tl.kind === 'gate' && !tl.inv) || tl.kind === 'phase', a = tl.kind === 'phase' ? 0.55 : gate ? 0.35 : 1;
      g.globalAlpha = a;
      const sides = [[[1, 0, 0], [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], .7], [[-1, 0, 0], [[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]], .7],
        [[0, 0, 1], [[x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], .5], [[0, 0, -1], [[x, y, z], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y, z]], .5]];
      sides.forEach(([n, q, s]) => { if (dot(n, b.dir) > 0) poly(q, shade(base === TOP.floor ? '#3A4468' : base, s * (base === TOP.floor ? 1 : .75)), 'rgba(0,0,0,.35)'); });
      if (tl.kind === 'goal') { const c = P(pr([x + .5, y + 1, z + .5])); g.shadowColor = '#E9C27A'; g.shadowBlur = 18 * dpr; poly([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], base); g.shadowBlur = 0; g.beginPath(); g.arc(c[0], c[1], k * .16, 0, 7); g.fillStyle = '#fff'; g.fill(); }
      else poly([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], gate ? null : base, gate ? (tl.kind === 'phase' ? base : '#C79BF2') : 'rgba(255,255,255,.18)', gate ? [4 * dpr, 3 * dpr] : null);
      if (tl.kind === 'phase') { const c = P(pr([x + .5, y + 1, z + .5])), r = k * .13; g.beginPath(); if (tl.ph) { g.moveTo(c[0], c[1] - r * 1.2); g.lineTo(c[0] + r * 1.2, c[1]); g.lineTo(c[0], c[1] + r * 1.2); g.lineTo(c[0] - r * 1.2, c[1]); g.closePath(); } else g.arc(c[0], c[1], r, 0, 7); g.strokeStyle = base; g.lineWidth = Math.max(1.5, 1.6 * dpr); g.stroke(); }
      if (tl.kind === 'warp' || tl.kind === 'twin' || tl.kind === 'tgoal') { const c = P(pr([x + .5, y + 1, z + .5])); g.beginPath(); g.arc(c[0], c[1], k * (tl.kind === 'twin' ? .13 : .2), 0, 7); g.fillStyle = tl.kind === 'twin' ? '#0B0D14' : 'rgba(11,13,20,.55)'; g.fill(); g.lineWidth = 1.6 * dpr; g.strokeStyle = tl.kind === 'warp' ? (tl.wc ? '#FF8FB1' : '#E3D2FF') : '#CFF4FA'; if (tl.kind !== 'twin') g.stroke(); }
      if (tl.kind === 'start') { const c = P(pr([x + .5, y + 1, z + .5])); g.beginPath(); g.arc(c[0], c[1], k * .13, 0, 7); g.fillStyle = '#0B0D14'; g.fill(); }
      g.globalAlpha = 1; g.setLineDash([]);
    });
  }

  function buildLevels(prog, onPick) {
    const grid = $('lv-grid'); grid.innerHTML = ''; let solved = 0, lastCh = 0;
    W.LEVELS.forEach((lv, i) => {
      const pw = !!(V.paywall && V.paywall.locked(lv)), rec = prog.solved[lv.id], open = !pw && (i === 0 || !!prog.solved[W.LEVELS[i - 1].id] || W.LEVELS.slice(i).some((x) => prog.solved[x.id])), b = doc.createElement('button');
      if (rec) solved++;
      if (lv.ch && lv.ch !== lastCh) {
        lastCh = lv.ch; const c = (W.CHAPTERS || []).find((x) => x.n === lv.ch), inCh = W.LEVELS.filter((x) => x.ch === lv.ch), done = inCh.filter((x) => prog.solved[x.id]).length, stars = inCh.reduce((s, x) => s + (prog.solved[x.id] ? prog.solved[x.id].stars : 0), 0);
        const h = doc.createElement('div'); h.className = 'ch-head'; h.innerHTML = '<span>' + t('ch.n', { n: lv.ch }) + '</span><h3>' + (c ? V.i18n.pick(c.name) : '') + '</h3><small>' + done + '/' + inCh.length + ' · ' + stars + '/' + inCh.length * 3 + ' ★</small>'; grid.appendChild(h);
      }
      b.className = 'lv' + (open ? '' : ' locked') + (pw ? ' pro' : '') + (open && !rec ? ' current' : ''); b.style.setProperty('--i', i); b.style.setProperty('--hue', lv.hue);
      b.disabled = !open && !pw; b.setAttribute('aria-label', (i + 1) + '. ' + V.i18n.pick(lv.name));
      b.innerHTML = '<span class="lv-art"><canvas></canvas>' + (open ? '' : '<span class="lv-lock">' + SVG('i-lock') + '</span>') + '<span class="lv-n">' + (i + 1) + '</span></span>' +
        '<span class="lv-info"><div><h3>' + V.i18n.pick(lv.name) + '</h3><small>' + (pw ? t('levels.pro') : open ? (rec ? t('levels.best', { n: rec.best }) : t('levels.new')) : t('levels.locked')) + '</small></div><span class="lv-stars">' +
        [0, 1, 2].map((s) => SVG('i-star', rec && s < rec.stars ? 'on' : '')).join('') + '</span></span>';
      b.addEventListener('click', () => { if (pw) V.paywall.offer(); else if (open) onPick(i); }); grid.appendChild(b);
    });
    $('lv-sub').textContent = t('levels.sub', { n: solved, m: W.LEVELS.length });
    requestAnimationFrame(() => { let k = 0; Array.from(grid.children).forEach((c) => { const cv = c.querySelector('canvas'); if (cv) { drawMini(cv, W.LEVELS[k], W.initial(W.LEVELS[k])); k++; } }); });
  }

  // ---- how to ----
  const dia = (x, y, c, w, h) => '<path class="' + c + '" d="M' + x + ' ' + (y - h) + 'L' + (x + w) + ' ' + y + 'L' + x + ' ' + (y + h) + 'L' + (x - w) + ' ' + y + 'Z"/>';
  const ART = [
    '<ellipse class="dash" cx="56" cy="46" rx="44" ry="20"/>' + dia(56, 46, 't', 20, 11) + dia(56, 57, 't2', 20, 11).replace('class="t2"', 'class="t2" opacity=".5"') + '<path class="ar" d="M16 66Q56 90 96 66M89 61L96 66L88 71"/>',
    dia(40, 68, 't', 20, 11) + '<path class="dash" d="M60 66V84M44 86q16 5 32 0"/>' + dia(60, 55, 't2', 20, 11) + '<path class="seam" d="M40 57L60 68"/>',
    dia(24, 74, 't', 16, 9) + dia(44, 62, 't', 16, 9) + dia(64, 50, 't', 16, 9) + dia(84, 38, 't2', 16, 9) + '<circle class="dot" cx="24" cy="70" r="4"/><circle cx="84" cy="36" r="12" fill="rgba(233,194,122,.16)"/><circle class="dot" cx="84" cy="36" r="3.5"/>',
  ];
  function buildHow() {
    $('how-list').innerHTML = [1, 2, 3].map((n) => '<div class="step"><svg class="step-art" viewBox="0 0 112 96" aria-hidden="true">' + ART[n - 1] + '</svg><div class="step-text"><span class="step-n">0' + n + '</span><h3>' + t('how.' + n + '.h') + '</h3><p>' + t('how.' + n + '.p') + '</p></div></div>').join('') +
      '<p class="how-note">' + t('how.stars') + '</p>';
  }

  V.UI = { $, t, SVG, go, toast, Coach, stars, drawMini, buildLevels, buildHow, cur: () => cur, on: (n, f) => { hooks[n] = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
