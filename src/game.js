// Vantage game controller: state, input handlers, undo, hints, coach, win, save, wiring. Rules live in world.js, drawing in scene.js.
(function (root) {
  const W = root.W, V = root.V, UI = V.UI, A = V.Audio || { play() {}, unlock() {}, setSound() {}, setMusic() {}, setHaptics() {}, haptic() {} };
  const $ = UI.$, t = UI.t, LV = W.LEVELS, KEY = 'walk.v1', pick = (o) => V.i18n.pick(o);

  // ---------- save ----------
  const defSave = () => ({ v: 1, solved: {}, tut: {}, curs: {}, last: '', daily: null, owned: false, hu: {}, set: { lang: /^ru|^uk|^be/i.test(navigator.language || 'ru') ? 'ru' : 'en', sound: true, music: true, haptics: true } });
  let save = defSave();
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && r.v === 1) { const d = defSave(); save = { v: 1, solved: r.solved || {}, tut: r.tut || {}, curs: r.curs || (r.cur && r.cur.id ? { [r.cur.id]: r.cur } : {}), last: r.last || (r.cur && r.cur.id) || '', daily: r.daily || null, owned: !!r.owned, hu: r.hu || {}, set: Object.assign(d.set, r.set || {}) }; } } catch (e) { /* private mode */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
  let idleAt = Date.now(); const bumpIdle = () => { idleAt = Date.now(); };
  const RM = !!(root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const SID = Math.random().toString(36).slice(2, 10);
  // Analytics: a small local event log (last 300) and a hook for a real SDK: V.analytics.sink = (name, props) => ...
  const track = (name, props) => {
    const ev = Object.assign({ e: name, t: Date.now(), s: SID, lang: V.i18n.lang(), w: root.innerWidth }, props || {});
    try { const a = JSON.parse(localStorage.getItem('walk.ev') || '[]'); a.push(ev); localStorage.setItem('walk.ev', JSON.stringify(a.slice(-300))); } catch (e) { /* ignore */ }
    try { V.analytics && V.analytics.sink && V.analytics.sink(name, ev); } catch (e) { /* ignore */ }
  };
  V.analytics = V.analytics || { sink: null, track };
  // Par = the fewest "moves" a perfect player needs: one tap per walk (any run of steps without a turn) plus one per block slide. Turning the world is free.
  const parCache = {};
  function parOf(lv) {
    const ck = lv.id + ':' + (lv.cam || 0); if (parCache[ck] != null) return parCache[ck];
    // Fewest moves a perfect player needs: 0-1 BFS where turning the world is free and a tap (planFrom) or a block slide costs 1.
    const K = W.key, s0 = W.initial(lv), dist = new Map([[K(s0), 0]]); let layer = [s0], d = 0;
    while (layer.length && d < 40) {
      for (let q = 0; q < layer.length; q++) for (const dir of [1, -1]) { const r = W.rotate(layer[q], dir), k = K(r); if (!dist.has(k)) { dist.set(k, d); layer.push(r); } }
      const next = [];
      for (const s of layer) {
        if (W.solved(lv, s)) return (parCache[ck] = Math.max(1, d));
        const moves = [];
        for (const tl of lv.tiles) if (tl.id !== s.tile) { const path = planFrom(lv, s, tl.id); if (path) { let n = s; for (const id of path) n = W.step(lv, n, id); moves.push(n); } }
        for (const sl of lv.sliders || []) if (W.canSlide(lv, s, sl.id)) sl.positions.forEach((_, i) => { if (i !== s.sl[sl.id]) moves.push(W.slide(lv, s, sl.id, i)); });
        for (const n of moves) { const k = K(n); if (!dist.has(k)) { dist.set(k, d + 1); next.push(n); } }
      }
      layer = next; d++;
    }
    return (parCache[ck] = 1);
  }
  const isOpen = (i) => i === 0 || !!save.solved[LV[i - 1].id] || LV.slice(i).some((l) => save.solved[l.id]); // also open when a later level is solved (old saves)

  // ---------- full version: one purchase in the store (App Store / Google Play). The native wrapper provides V.store;
  // in the browser there is no store, so everything stays open. ----------
  const CFG = V.config || {};
  const gateOn = () => !!V.store;
  const unlockedAll = () => !gateOn() || save.owned;
  const lockedLv = (lv) => !unlockedAll() && (lv.ch || 1) > (CFG.freeChapters || 2);
  const freeCount = () => LV.filter((l) => !lockedLv(l)).length;
  function offerMsg(k, ok) { const m = $('offer-msg'); m.textContent = k ? t(k) : ''; m.classList.toggle('ok', !!ok); }
  function showOffer() {
    $('offer-t').textContent = t('pw.title'); $('offer-p').textContent = t('pw.p'); offerMsg('');
    $('offer-buy').textContent = t('pw.buy') + (V.store && V.store.price ? ' · ' + V.store.price() : '');
    $('offer').hidden = false; track('paywall_view', {});
  }
  async function storeDo(fn, okKey) {
    try { if (await fn()) { save.owned = true; persist(); track('purchase_ok', {}); offerMsg(okKey, true); setTimeout(() => { $('offer').hidden = true; refreshText(); }, 900); } else offerMsg('pw.bad'); }
    catch (e) { offerMsg('pw.bad'); }
  }
  if (V.store && V.store.owned) V.store.owned().then((o) => { if (o && !save.owned) { save.owned = true; persist(); refreshText(); } }).catch(() => {});
  V.paywall = { locked: lockedLv, offer: () => showOffer() };

  // ---------- scene ----------
  let scene = null;
  const noop = () => {};
  const Null = { setHooks: noop, setLevel: noop, setState: noop, setCam: noop, getCam: () => 0, walk: (p, s, d) => d && d(), setSeams: noop, highlightTile: noop, pulseHint: noop, playWin: (d) => d && d(), pick: noop, isBusy: () => false, setInputEnabled: noop, frame: noop, resize: noop };
  try { scene = root.W.Scene.create($('game')); } catch (e) { console.error('Scene unavailable', e); scene = Null; }

  // ---------- game state ----------
  let li = 0, level = LV[0], st = W.initial(level), undo = [], moves = 0, turns = 0, hints = 0, walking = false, won = false, hlTimer = 0, seamN = 0, lastStars = 3, barTimer = 0, t0 = 0, daily = false, dailyDay = 0, trail = '';
  let lastHint = '', coachStep = null; // 'rot' | 'seam' | 'goal' | 'lever' | 'slider' | null
  const playing = () => UI.cur() === 'play';
  const seams = () => { const p = W.visualPairs(level, st); scene.setSeams(p); return p; };
  const clearHl = () => { clearTimeout(hlTimer); scene.highlightTile(null); };
  const hl = (id, ms) => { scene.highlightTile(id); clearTimeout(hlTimer); hlTimer = setTimeout(() => scene.highlightTile(null), ms || 3500); };
  const snap = () => undo.push({ st, moves, turns, trail });
  const say = (k, p, ms) => UI.toast(t(k, p), ms);
  // Bottom bar with actions (dead end, "level restarted — bring back"). buttons: [{ k: i18n key, fn, primary }]
  function showBar(textKey, buttons, ms) {
    clearTimeout(barTimer); $('dead-t').textContent = t(textKey); const box = $('dead-a'); box.innerHTML = '';
    buttons.forEach((b) => { const el = document.createElement('button'); el.className = 'btn ' + (b.primary ? 'btn-primary' : 'btn-glass'); el.textContent = t(b.k); el.addEventListener('click', () => { hideBar(); b.fn(); }); box.appendChild(el); });
    $('dead').hidden = false; if (ms) barTimer = setTimeout(hideBar, ms);
  }
  function hideBar() { clearTimeout(barTimer); $('dead').hidden = true; }
  // Remember where the player is, so leaving the level (or closing the tab) never loses the progress.
  function saveCur() { if (daily) return; if (won) delete save.curs[level.id]; else if (moves + turns + undo.length > 0) { save.curs[level.id] = { id: level.id, st, undo, moves, turns, hints, trail }; save.last = level.id; } else delete save.curs[level.id]; persist(); }   // one saved position per level
  // After a walk ends: if the level can no longer be won (a crumbled tile, a lever used too early), say so instead of leaving the player lost.
  function checkDead() {
    if (won || walking || !playing()) return;
    if (!W.solve(level, 60, st)) { track('deadlock', { level: level.id, moves }); showBar('dead.t', [{ k: 'dead.undo', fn: doUndo, primary: true }, { k: 'dead.reset', fn: () => $('h-reset').click() }]); A.play('coach'); }
  }

  function hud() {
    $('h-num').textContent = daily ? t('daily.t') : t('hud.level', { n: li + 1 }); $('h-name').textContent = pick(level.name);
    const m = $('h-moves'); if (m.textContent !== String(moves)) { m.textContent = moves; const c = m.parentNode; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    $('h-undo').disabled = !undo.length || walking || won; $('h-hint').disabled = walking || won; $('h-hint').classList.toggle('spent', !!save.hu[level.id]); $('h-reset').disabled = walking;
    $('h-rotl').disabled = $('h-rotr').disabled = walking || won;
    const b = $('h-hints'); b.hidden = !hints; b.textContent = hints;
  }

  // ---------- coach ----------
  const desk = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  function coachShow() {
    const C = UI.Coach;
    if (coachStep === 'rot') C.show(t('coach.rot'), desk() ? t('coach.rotkey') : '', 'drag');
    else if (coachStep === 'rot2') C.show(t('coach.seamno'), desk() ? t('coach.rotkey') : '', 'drag');
    else if (coachStep === 'seam') C.show(t('coach.seam'), '', 'tap');
    else if (coachStep === 'goal') C.show(t('coach.goal'), '', 'tap');
    else if (coachStep === 'lever') C.show(t('coach.lever'), '', 'tap');
    else if (coachStep === 'warp') C.show(t('coach.warp'), '', 'tap');
    else if (coachStep === 'twin') C.show(t('coach.twin'), '', 'tap');
    else if (coachStep === 'slider') C.show(t('coach.slider'), '', 'drag');
    else if (coachStep === 'crumble') C.show(t('coach.crumble'), '', 'tap');
    else if (coachStep === 'phase') C.show(t('coach.phase'), '', 'drag');
    else if (coachStep === 'toggle') C.show(t('coach.toggle'), '', 'tap');
    else C.hide();
  }
  const TUT = { W01: 'w01', W03: 'w03', W04: 'w04', W05: 'w05', W22: 'w22', W28: 'w28', W49: 'w49', W58: 'w58' };
  function coachDone() { if (coachStep && TUT[level.id] && !daily) { save.tut[TUT[level.id]] = 1; persist(); } coachStep = null; UI.Coach.hide(); }
  function coachInit() {
    const k = TUT[level.id]; coachStep = null;
    if (k && !save.tut[k] && !daily) coachStep = level.id === 'W01' ? 'rot' : level.id === 'W03' ? 'lever' : level.id === 'W05' ? 'crumble' : level.id === 'W22' ? 'phase' : level.id === 'W28' ? 'toggle' : level.id === 'W49' ? 'warp' : level.id === 'W58' ? 'twin' : 'slider';
    coachShow();
    if (!coachStep && !won) setTimeout(() => { if (playing() && !coachStep && !moves) UI.toast(pick(level.hint), 4600); }, 600);
  }
  function coachRotated(n) {
    if (coachStep === 'rot' || coachStep === 'rot2' || coachStep === 'seam') {
      const was = coachStep; coachStep = n > 0 ? 'seam' : 'rot2'; if (was !== coachStep || was === 'rot2') coachShow();
    }
  }

  // ---------- actions ----------
  function setCamAnim(c) { if (scene.getCam() !== c) scene.setCam(c, true); }
  function applyCam(c, viaButton) {
    if (!playing() || walking || won || c === st.cam) return;
    snap(); st = Object.assign({}, st, { cam: c }); turns++; trail += 'T'; clearHl(); hideBar();
    if (viaButton) scene.setCam(c, true);
    if (level.tiles.some((x) => x.kind === 'phase')) scene.setState(st, true);
    const n = seams().length; if (n > seamN) A.play('near'); else A.play('flip'); seamN = n; A.haptic('tap');
    coachRotated(n); if (coachStep === 'phase') coachDone(); hud(); saveCur();
  }
  const rotate = (dir) => applyCam((st.cam + dir + W.CAMS) % W.CAMS, true);

  // BFS over single steps at the current camera, applying W.step so switches/gates update while planning.
  const plan = (to) => planFrom(level, st, to);
  function planFrom(lv, s0, to) {
    const q = [{ s: s0, path: [] }], seen = new Set([W.key(s0)]);
    while (q.length) {
      const { s, path } = q.shift();
      for (const id of W.neighbors(lv, s)) {
        const n = W.step(lv, s, id), k = W.key(n); if (seen.has(k)) continue; seen.add(k);
        if (id === to) return path.concat(id);
        q.push({ s: n, path: path.concat(id) });
      }
    }
    return null;
  }
  function tapTile(id) {
    if (!playing() || won || walking || id === st.tile) return;
    clearHl(); A.play('click');
    const path = plan(id);
    if (!path) { hl(id, 600); A.play('coach'); A.haptic('tap'); say('toast.blocked'); return; }
    snap(); moves++; trail += 'W'; walking = true; hideBar(); scene.setInputEnabled(false);
    if (coachStep === 'seam') { coachStep = 'goal'; coachShow(); }
    hud();
    scene.walk(path, (tid) => {
      const prev = st; st = W.step(level, st, tid); A.play('step'); A.haptic('step');
      if (st.tile !== tid) { scene.teleport(st.tile); seams(); A.play('warp'); A.haptic('tap'); if (coachStep === 'warp') coachDone(); }
      if (st.tw !== prev.tw) { scene.setState(st, true); seams(); A.play('twin'); }
      if (Object.keys(st.gone).length !== Object.keys(prev.gone || {}).length) { scene.setState(st, true); seams(); A.play('side'); if (coachStep === 'crumble') coachDone(); }
      if (Object.keys(st.sw).length !== Object.keys(prev.sw).length) {
        const on = Object.keys(st.sw).length > Object.keys(prev.sw).length; scene.setState(st, true); seams(); A.play(on ? 'unlock' : 'side'); say(on ? 'toast.gate' : 'toast.gateoff', null, 1800);
        if (coachStep === 'lever' || coachStep === 'toggle') coachDone();
      }
    }, () => {
      walking = false; scene.setInputEnabled(true); seamN = seams().length; if (coachStep === 'twin') coachDone();
      if (W.solved(level, st)) win(); else { hud(); saveCur(); checkDead(); }
    });
  }
  function slideBlock(id, idx) {
    if (!playing() || won || walking || idx === st.sl[id]) return;
    if (!W.canSlide(level, st, id)) { scene.setState(st, true); A.play('coach'); say('toast.fixed'); return; }
    clearHl(); hideBar(); snap(); st = W.slide(level, st, id, idx); moves++; trail += 'S'; scene.setState(st, true); seamN = seams().length;
    A.play('side'); A.haptic('tap'); if (coachStep === 'slider') coachDone(); hud(); saveCur(); setTimeout(checkDead, 350);
  }
  function doUndo() {
    if (!playing() || walking || won || !undo.length) return;
    const u = undo.pop(); st = u.st; moves = u.moves; turns = u.turns || 0; trail = u.trail || ''; clearHl(); hideBar(); scene.setState(st, true); setCamAnim(st.cam); seamN = seams().length; A.play('click'); track('undo', { level: level.id }); hud(); saveCur(); checkDead();
  }
  function restart(keepHints) {
    st = W.initial(level); undo = []; moves = 0; turns = 0; trail = ''; if (!keepHints) hints = 0; won = false; walking = false; clearHl(); hideBar();
    scene.setState(st, true); setCamAnim(st.cam); seamN = seams().length; scene.setInputEnabled(true); $('win').hidden = true; hud(); saveCur();
  }
  // One hint per level, and it carries an idea rather than the next click: the turn to make (if any) and the tile to walk to,
  // or the lever / portal that matters next. It is spent for good on that level, so it cannot be mashed.
  function hint() {
    if (!playing() || walking || won) return;
    if (save.hu[level.id]) { say('hint.spent', null, 2600); A.play('coach'); return; }
    const sol = W.solve(level, 60, st), acts = sol && sol.actions;
    if (!acts || !acts.length) { say('toast.nohint'); A.play('coach'); return; }
    let i = 0, rot = 0; while (acts[i] && acts[i].t === 'rot') { rot += acts[i].dir; i++; }
    const n = ((rot % 4) + 4) % 4, dirL = n === 1 || (n === 2 && acts[0].dir > 0), cnt = n === 3 ? 1 : n, run = [];
    let j = i; while (acts[j] && acts[j].t === 'step') run.push(acts[j++].to);
    const kindOf = (id) => (level.tiles.find((x) => x.id === id) || {}).kind;
    const key = run.find((id) => ['switch', 'toggle', 'warp'].includes(kindOf(id)));
    let tile = null, msg;
    if (run.length) {
      const k = key ? kindOf(key) : '';
      tile = key || run[run.length - 1];
      msg = k === 'switch' || k === 'toggle' ? 'hint.lever' : k === 'warp' ? 'hint.warp' : n ? (n === 3 ? 'hint.rt.r' : dirL ? 'hint.rt.l' : 'hint.rt.r') : 'hint.go';
    } else if (acts[i] && acts[i].t === 'slide') { tile = (level.tiles.find((x) => x.slider === acts[i].id) || {}).id; msg = 'hint.slide'; }
    else { say('toast.nohint'); A.play('coach'); return; }
    save.hu[level.id] = 1; hints++; lastHint = W.key(st) + '|' + moves; persist(); track('hint', { level: level.id, n: hints });
    A.play('hint'); const hb = $('h-hint'); hb.classList.remove('glow'); void hb.offsetWidth; hb.classList.add('glow'); clearHl();
    if (n && run.length && msg.startsWith('hint.rt')) scene.pulseHint(n === 3 ? 'rotate-right' : dirL ? 'rotate-left' : 'rotate-right');
    if (tile) hl(tile, 7000);
    const sl = acts[i] && acts[i].t === 'slide' ? level.sliders.find((s) => s.id === acts[i].id) : null;
    say(msg, sl ? { n: acts[i].pos + 1, m: sl.positions.length } : { x: cnt === 2 ? t('hint.twice') : '' }, 6500);
    hud();
  }

  // ---------- daily level, sharing, photo mode ----------
  const dayNo = () => Math.floor(Date.now() / 864e5) - 20778;           // day 1 = launch day 2026-11-22 (UTC): same level for everyone
  // No repeats: every cycle of (levels - 2) days plays each level once, in an order shuffled by the cycle number; the start camera varies by day.
  function dailyPick(d) {
    d = d || dayNo(); const pool = freeCount() - 2, cyc = Math.floor((d - 1) / pool), idx = Array.from({ length: pool }, (_, k) => k);
    let x = (cyc + 1) * 2654435761 >>> 0; const rnd = () => { x = (x + 0x6D2B79F5) >>> 0; let z = x; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
    for (let k = pool - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
    return { i: 2 + idx[(d - 1) % pool], cam: d % 4, day: d };
  }
  const solvedN = () => Object.keys(save.solved).length, DAILY_AT = 8;                 // the daily opens after 5 solved levels
  const dailyDone = () => !!(save.daily && save.daily.day === dayNo());
  function dailyLabel() {
    const b = $('t-daily'); if (!b) return; const open = solvedN() >= DAILY_AT; $('b-daily').disabled = !open; $('b-daily').style.opacity = open ? '' : '.5';
    b.textContent = !open ? t('daily.lock', { n: DAILY_AT - solvedN() }) : t('daily.t') + (dailyDone() ? ' ✓' : '');
  }
  function shareText() {
    const sq = { T: '🟦', W: '🟨', S: '🟩' }; let tr = trail.split('').map((c) => sq[c] || '').join(''); if (tr.length > 20) tr = tr.slice(0, 20) + '…';
    const par = parOf(level), head = daily ? t('share.daily', { n: dailyDay }) : t('share.level', { n: li + 1 });
    return head + '\n' + '⭐'.repeat(lastStars) + '☆'.repeat(3 - lastStars) + ' · ' + moves + ' / ' + par + '\n' + tr + '\n' + location.href.split('#')[0].split('?')[0] + (daily ? '?d=' + dailyDay : '');
  }
  // A 1080x1350 picture of the result (level diagram, stars, moves, trail) for Stories and chats.
  function cardFile() {
    return new Promise((resolve) => {
      const W_ = 1080, H_ = 1350, cv = document.createElement('canvas'); cv.width = W_; cv.height = H_; const g = cv.getContext('2d'), F = '-apple-system, "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif';
      const bg = g.createLinearGradient(0, 0, 0, H_); bg.addColorStop(0, '#1A1F2E'); bg.addColorStop(1, '#0B0D14'); g.fillStyle = bg; g.fillRect(0, 0, W_, H_);
      const mini = document.createElement('canvas'); UI.drawMini(mini, level, W.initial(level), [W_, 760]); g.drawImage(mini, 0, 150);
      g.fillStyle = '#F5F5F7'; g.font = '700 64px ' + F; g.fillText('Vantage', 72, 118);
      g.fillStyle = 'rgba(245,245,247,.62)'; g.font = '500 34px ' + F; g.textAlign = 'right'; g.fillText(daily ? t('share.daily', { n: dailyDay }).replace('Vantage · ', '') : t('hud.level', { n: li + 1 }) + ' · ' + pick(level.name), W_ - 72, 114); g.textAlign = 'left';
      g.font = '700 120px ' + F; g.fillStyle = '#F6D898'; g.fillText('★'.repeat(lastStars), 72, 1090); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillText('★'.repeat(3 - lastStars), 72 + 120 * 0.97 * lastStars, 1090);
      g.fillStyle = '#F5F5F7'; g.font = '600 48px ' + F; g.fillText(moves + ' / ' + parOf(level) + (V.i18n.lang() === 'ru' ? '  ходов' : '  moves'), 72, 1170);
      const col = { T: '#5CC6D9', W: '#F6D898', S: '#8FCF8A' }; const tr = trail.slice(0, 24).split(''); tr.forEach((c, i) => { g.fillStyle = col[c] || '#fff'; g.beginPath(); g.roundRect ? g.roundRect(72 + i * 40, 1214, 32, 32, 8) : g.rect(72 + i * 40, 1214, 32, 32); g.fill(); });
      g.fillStyle = 'rgba(245,245,247,.45)'; g.font = '500 30px ' + F; g.fillText(location.host || 'vantage', 72, 1296);
      cv.toBlob((b) => resolve(b ? new File([b], 'vantage.png', { type: 'image/png' }) : null), 'image/png');
    });
  }
  async function share() {
    const text = shareText(); track('share', { level: level.id, daily });
    try { const f = await cardFile(); if (f && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); say('share.copied', null, 1800); } catch (e) { say('share.fail', null, 2600); }
  }
  let photoOff = 0;
  function photo(on) { $('app').classList.toggle('photo', on); if (!on) photoOff = Date.now(); }
  // ---------- win ----------
  function win() {
    won = true; walking = false; scene.setInputEnabled(false); coachDone(); hud();
    A.play('solve'); A.haptic('solve');
    const par = parOf(level), stars = 1 + (hints === 0 ? 1 : 0) + (moves <= par ? 1 : 0), old = save.solved[level.id];
    lastStars = stars;
    if (daily) { const d = dailyDay; if (d === dayNo()) { const pv = save.daily && save.daily.day === d ? save.daily : null; save.daily = { day: d, stars: Math.max(stars, pv ? pv.stars : 0), moves: pv ? Math.min(moves, pv.moves) : moves }; } }
    else { save.solved[level.id] = { stars: Math.max(stars, old ? old.stars : 0), best: Math.min(moves, old ? old.best : 1e9) }; delete save.curs[level.id]; }
    persist();
    track('level_complete', { level: level.id, daily, moves, turns, hints, par, stars, sec: Math.round((Date.now() - t0) / 1000) });
    scene.playWin(() => { if (!won) return; showWin(stars); });
  }
  function showWin(stars) {
    const last = !daily && li === LV.length - 1, par = parOf(level);
    $('win-lv').textContent = (daily ? t('daily.t') : t('hud.level', { n: li + 1 })) + ' · ' + pick(level.name);
    UI.stars(stars, $('win-stars')); $('win-moves').textContent = moves; $('win-best').textContent = par; $('win-hints').textContent = hints;
    $('win-tip').textContent = hints > 0 ? t('win.tip.hint') : moves > par ? t('win.tip.par', { n: par + ' ' + (V.i18n.lang() === 'ru' ? (par % 10 === 1 && par % 100 !== 11 ? 'ход' : par % 10 >= 2 && par % 10 <= 4 && (par % 100 < 10 || par % 100 >= 20) ? 'хода' : 'ходов') : par === 1 ? 'move' : 'moves') }) : t('win.tip.full');
    $('win-next').hidden = last || daily; $('win-note').hidden = !(last || daily); $('win-note').textContent = daily ? t('daily.note') : t('win.last'); $('win').hidden = false;
    const c = document.querySelector('.win-card'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
    try { (last || daily ? $('win-share') : $('win-next')).focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  // ---------- level start ----------
  function startLevel(i, opts) {
    if (lockedLv(LV[i])) { showOffer(); return; }
    photo(false); daily = !!(opts && opts.daily); dailyDay = daily ? opts.day || dayNo() : 0; li = i; level = daily ? Object.assign({}, LV[i], { cam: opts.cam || 0 }) : LV[i]; st = W.initial(level); trail = ''; undo = []; moves = 0; turns = 0; hints = 0; walking = false; won = false; bgOn = false; clearHl(); hideBar(); t0 = Date.now();
    const c = daily ? null : save.curs[level.id]; if (c && c.id === level.id && c.st && LV[i].tiles.some((x) => x.id === c.st.tile)) { st = c.st; undo = c.undo || []; moves = c.moves || 0; turns = c.turns || 0; hints = c.hints || 0; trail = c.trail || ''; }
    $('win').hidden = true; $('toast').classList.remove('is-on');
    scene.setLevel(level); scene.setState(st, false); scene.setCam(st.cam, false); seamN = seams().length; scene.setInputEnabled(true);
    bumpIdle(); track('level_start', { level: level.id, daily, resumed: moves + turns > 0 });
    UI.go('play'); hud(); coachInit(); if (moves + turns > 0) setTimeout(checkDead, 400);
    trans();
  }
  // Level card: ink fades in with the level number and chapter, the level is already swapped underneath, then it clears. Skipped for the very first start.
  let transT = 0, booted = false;
  function trans() {
    const e = $('transition'); if (!e) return; if (!booted) { booted = true; return; }
    const ch = (W.CHAPTERS || []).find((x) => x.n === (level.ch || 1));
    $('tr-num').textContent = daily ? '·' : li + 1; $('tr-chapter').textContent = daily ? t('daily.t') : t('ch.n', { n: level.ch || 1 }) + (ch ? ' · ' + V.i18n.pick(ch.name) : '');
    e.classList.add('is-on'); A.play('trans'); clearTimeout(transT); transT = setTimeout(() => e.classList.remove('is-on'), RM ? 160 : 520);
  }
  // ---------- menu backdrop: level 1 turns slowly behind the menu ----------
  let bgOn = false, bgCam = 0;
  function backdrop() {
    if (bgOn || playing()) return; bgOn = true; bgCam = 0;
    const s0 = W.initial(LV[0]); scene.setLevel(LV[0]); scene.setState(s0, false); scene.setCam(0, false); scene.setSeams([]); scene.setInputEnabled(false);
  }
  setInterval(() => {
    if (RM || !bgOn || playing() || document.hidden || UI.cur() === 'splash') return;
    bgCam = (bgCam + 1) % 4; scene.setCam(bgCam, true); scene.setSeams(W.visualPairs(LV[0], Object.assign(W.initial(LV[0]), { cam: bgCam })));
  }, 4200);

  // ---------- scene hooks ----------
  scene.setHooks({
    onCam: (c) => { if (playing()) applyCam(c, false); },
    onTapTile: (id) => tapTile(id),
    onSlide: (id, idx) => slideBlock(id, idx),
    onSlideBlocked: () => { if (playing() && !won && !walking) { say('toast.fixed'); A.play('coach'); A.haptic('tap'); } },
    canSlide: (id) => {
      if (!playing() || won || walking) return false;
      return W.canSlide(level, st, id); // read every frame by the scene: no side effects here
    },
  });

  // ---------- settings ----------
  function applySettings() {
    A.setSound(save.set.sound); A.setMusic(save.set.music); A.setHaptics(save.set.haptics);
    document.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-checked', String(!!save.set[b.dataset.set])));
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === V.i18n.lang())));
  }
  function refreshText() {
    $('t-play').textContent = t(Object.keys(save.solved).length || Object.keys(save.curs).length ? 'menu.continue' : 'menu.play'); dailyLabel();
    UI.buildHow(); $('set-foot').textContent = t('set.foot', { n: LV.length }); hud(); if (UI.Coach.on) coachShow(); proRows();
    if (UI.cur() === 'levels') UI.buildLevels(save, startLevel);
    if (!$('win').hidden) showWin(lastStars);
  }
  document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.set; save.set[k] = !save.set[k]; persist(); applySettings();
    if (k === 'sound' && save.set.sound) A.play('click');
  }));
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { save.set.lang = b.dataset.lang; persist(); V.i18n.setLang(b.dataset.lang); applySettings(); refreshText(); }));
  $('b-reset').addEventListener('click', () => { $('modal').hidden = false; $('m-cancel').focus(); });
  $('m-cancel').addEventListener('click', () => { $('modal').hidden = true; });
  $('m-ok').addEventListener('click', () => { const s = save.set, ow = save.owned; save = defSave(); save.set = s; save.owned = ow; persist(); $('modal').hidden = true; refreshText(); });

  $('b-pro').addEventListener('click', () => { if (!unlockedAll()) showOffer(); });
  $('offer-buy').addEventListener('click', () => V.store && storeDo(() => V.store.buy(), 'pw.on'));
  $('offer-restore').addEventListener('click', () => V.store && storeDo(() => V.store.restore(), 'pw.on'));
  $('offer-x').addEventListener('click', () => { $('offer').hidden = true; });
  function proRows() { $('b-pro').hidden = !gateOn(); $('t-pro').textContent = unlockedAll() ? t('pw.active') : t('pw.open') }
  // Stuck for a while? Offer the hint button instead of leaving the player alone.
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, bumpIdle, true));
  setInterval(() => {
    if (!playing() || won || walking || document.hidden || UI.Coach.on || !$('dead').hidden || !$('offer').hidden) return;
    if (Date.now() - idleAt > 25000 && !save.hu[level.id]) { idleAt = Date.now(); say('hint.idle', null, 4800); const hb = $('h-hint'); hb.classList.remove('glow'); void hb.offsetWidth; hb.classList.add('glow'); track('idle', { level: level.id }); }
  }, 3000);
  // ---------- wiring ----------
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => UI.go(b.dataset.go)));
  document.addEventListener('click', (e) => { if (e.target.closest('.btn, .icon-btn, .tool, .seg button, .switch')) { A.unlock(); if (!e.target.closest('.tool, .rot')) A.play('click'); } });
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => A.unlock(), { once: true, passive: true }));
  $('b-play').addEventListener('click', () => {
    if (!Object.keys(save.solved).length && !Object.keys(save.curs).length) return startLevel(0);
    const li2 = LV.findIndex((l) => l.id === save.last && save.curs[l.id] && !save.solved[l.id]);
    const i = li2 >= 0 && !lockedLv(LV[li2]) ? li2 : LV.findIndex((l) => !save.solved[l.id] && !lockedLv(l)); if (i < 0) UI.go('levels'); else startLevel(i);
  });
  $('b-daily').addEventListener('click', () => { const p = dailyPick(); track('daily_open', { done: dailyDone() }); startLevel(p.i, { daily: true, cam: p.cam, day: p.day }); });
  $('win-share').addEventListener('click', share);
  $('win-photo').addEventListener('click', () => photo(true));
  document.addEventListener('pointerdown', (e) => { if ($('app').classList.contains('photo')) { e.stopPropagation(); e.preventDefault(); photo(false); } }, true);
  document.addEventListener('click', (e) => { if (Date.now() - photoOff < 500) { e.stopPropagation(); e.preventDefault(); photoOff = 0; } }, true);
  $('h-back').addEventListener('click', () => { UI.Coach.hide(); hideBar(); saveCur(); UI.go('levels'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing()) saveCur(); });
  $('h-rotl').addEventListener('click', () => rotate(1)); $('h-rotr').addEventListener('click', () => rotate(-1)); // same sense as the scene's ArrowLeft (+1)
  $('h-undo').addEventListener('click', doUndo); $('h-hint').addEventListener('click', hint);
  $('h-reset').addEventListener('click', () => {
    if (!moves && !turns && !undo.length) return;
    const back = { st, undo, moves, turns, hints, trail }; track('restart', { level: level.id, moves });
    restart(true); A.play('flip'); coachInit();
    showBar('bar.reset', [{ k: 'bar.restore', fn: () => { st = back.st; undo = back.undo; moves = back.moves; turns = back.turns; hints = back.hints; trail = back.trail; scene.setState(st, true); setCamAnim(st.cam); seamN = seams().length; hud(); saveCur(); } }], 6000);
  });
  $('coach-x').addEventListener('click', coachDone);
  $('win-next').addEventListener('click', () => startLevel(li + 1));
  $('win-levels').addEventListener('click', () => UI.go('levels'));
  $('win-replay').addEventListener('click', () => { restart(false); coachInit(); });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.altKey) return;
    if (!playing()) { if (e.key === 'Escape' && UI.cur() !== 'menu' && UI.cur() !== 'splash') { $('modal').hidden = true; UI.go('menu'); } return; }
    const k = e.key.toLowerCase();
    if (k === 'a') rotate(1); else if (k === 'd') rotate(-1); // arrow keys are handled by the scene itself
    else if (k === 'z' || k === 'я') doUndo(); else if (k === 'h' || k === 'р') hint(); else if (k === 'r' || k === 'к') $('h-reset').click();
    else if (k === 'escape') $('h-back').click(); else return;
    e.preventDefault();
  });
  UI.on('menu', () => { refreshText(); backdrop(); }); UI.on('levels', () => { UI.buildLevels(save, startLevel); backdrop(); });
  UI.on('settings', () => { applySettings(); $('set-foot').textContent = t('set.foot', { n: LV.length }); backdrop(); }); UI.on('howto', () => { UI.buildHow(); backdrop(); });
  UI.on('play', () => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  root.addEventListener('resize', () => scene.resize());
  // Schedule the next frame FIRST and isolate errors: one bad frame must never stop the loop (that would freeze the whole game).
  // Frame loop: idle scenes are drawn at ~30 fps to save battery; if moving frames keep taking too long the render resolution steps down (never back up).
  let fLast = 0, fSlow = 0, fStep = 0; const SCALES = [1.5, 1, 0.75];
  (function loop(now) {
    requestAnimationFrame(loop); const dt = now - fLast;
    if (dt < 30 && !scene.busy()) return;
    if (fLast && scene.busy() && dt < 250) { fSlow = dt > 30 ? fSlow + 1 : Math.max(0, fSlow - 2); if (fSlow > 60 && fStep < SCALES.length - 1) { fStep++; fSlow = 0; scene.setScale(SCALES[fStep]); track('perf_down', { step: fStep }); } }
    fLast = now; try { scene.frame(now); } catch (e) { if (root.console) console.error('frame error', e); }
  })(0);

  // ---------- boot ----------
  V.i18n.setLang(save.set.lang); applySettings(); UI.buildHow(); scene.resize();
  UI.go('splash');
  const boot = Date.now();
  const ready = (document.fonts && document.fonts.ready) || Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1600))]).then(() => setTimeout(() => {
    if (UI.cur() !== 'splash') return;
    track('app_open', { first: !Object.keys(save.solved).length });
    const dl = /[?&]d=(\d+)/.exec(location.search), dn = dl ? +dl[1] : 0;
    if (dn >= 1 && dn <= dayNo() && solvedN() >= DAILY_AT) { const p = dailyPick(dn); startLevel(p.i, { daily: true, cam: p.cam, day: p.day }); }  // shared link: the same daily level
    else if (!solvedN() && !Object.keys(save.curs).length && !/nostart/.test(location.hash)) startLevel(0); else UI.go('menu'); // a new player lands straight in level 1
  }, Math.max(300, 1300 - (Date.now() - boot))));

  // ---------- debug ----------
  if (/debug/.test(location.hash)) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (f, max) => { for (let i = 0; i < (max || 400) && !f(); i++) await wait(50); };
    root.G = {
      card: () => cardFile(), parOf: (i) => parOf(LV[i]), dailyPick, start: (i) => startLevel(i || 0), state: () => ({ li, st, moves, hints, walking, won, undo: undo.length, coach: coachStep, save }),
      solveNow: async () => {
        for (let n = 0; n < 60 && !won; n++) {
          const sol = W.solve(level, 60, st), a = sol && sol.actions[0]; if (!a) break;
          if (a.t === 'rot') { rotate(a.dir); await wait(500); }
          else if (a.t === 'step') { tapTile(a.to); await until(() => !walking); }
          else { slideBlock(a.id, a.pos); await wait(500); }
        }
        await wait(100); return { won, moves };
      },
      scene,
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
