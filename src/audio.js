// Askew audio: everything synthesized with Web Audio (no files). window.V.Audio
// Calm, warm, gallery-like: mallet / kalimba / glass tones, soft pads, D major pentatonic.
// Every method is a safe no-op when Web Audio is unavailable or before unlock().
(function (root) {
  const V = (root.V = root.V || {});
  const AC = root.AudioContext || root.webkitAudioContext;
  const MAX_VOICES = 12;
  // D major pentatonic: D E F# A B
  const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77];
  const D6 = 1174.66, F5 = 739.99;

  let ctx = null, master, comp, sfxBus, revIn, revOut, noiseBuf, musicRevIn;
  let soundOn = true, musicOn = true, hapticsOn = true, volume = 0.8;
  let voices = 0, lastStep = 0, lastStepIdx = -1;
  // music
  let musicGain = null, musicActive = false, noteTimer = 0, padTimer = 0, droneTimer = 0, stopTimer = 0, chordIdx = 0;
  const pads = new Set(); // every long-lived music node group (pads, drone, notes): {stop()}
  // proximity
  let prox = null, proxP = 0;
  let hidden = false;

  const now = () => ctx.currentTime;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const running = () => !!ctx && ctx.state === 'running';
  const safe = (fn) => function () { try { return fn.apply(null, arguments); } catch (e) { /* audio must never break the game */ } };

  function makeImpulse(seconds) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let y = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const lp = 0.55 - 0.45 * k; // darker as the tail decays
        y += ((Math.random() * 2 - 1) - y) * lp;
        d[i] = y * Math.pow(1 - k, 2.6) * (k < 0.01 ? k * 100 : 1);
      }
    }
    return buf;
  }

  // fast, click-free linear ramp of a gain param to v over `sec`
  function cut(node, v, sec) {
    const p = node.gain, t = now();
    p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + sec);
  }

  function build() {
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 6;
    comp.attack.value = 0.005; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = volume;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 1 : 0; sfxBus.connect(master);
    const conv = ctx.createConvolver(); conv.buffer = makeImpulse(3);
    revIn = ctx.createGain(); revOut = ctx.createGain(); revOut.gain.value = 0.7;
    revIn.connect(conv); conv.connect(revOut); revOut.connect(master);
    // music has its own gain bus AND its own reverb so that muting it cuts the tail instantly
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    const mconv = ctx.createConvolver(); mconv.buffer = makeImpulse(2.4);
    musicRevIn = ctx.createGain(); musicRevIn.connect(mconv); mconv.connect(musicGain);
    cut(sfxBus, soundOn ? 1 : 0, 0.001); cut(revOut, soundOn ? 0.7 : 0, 0.001);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // One mallet/kalimba/glass note. o: dur, vol, type, ratio (2nd partial), pv (partial level), send (reverb), attack, dest, music
  function voice(f, t, o) {
    o = o || {};
    if (!o.music && voices >= MAX_VOICES) return;
    const dur = o.dur || 0.9, vol = o.vol || 0.2, atk = o.attack || 0.004;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const a = ctx.createOscillator(); a.type = o.type || 'sine'; a.frequency.value = f;
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = f * (o.ratio || 4);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(vol * (o.pv === undefined ? 0.35 : o.pv), t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.35);
    a.connect(g); b.connect(bg); bg.connect(g);
    const nodes = [a, b, g, bg];
    g.connect(o.dest || sfxBus);
    if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(o.music ? musicRevIn : revIn); nodes.push(s); }
    const rec = { stop() { try { a.stop(); b.stop(); } catch (e) {} } };
    if (o.music) pads.add(rec); else voices++;
    a.onended = () => { nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} }); if (o.music) pads.delete(rec); else voices--; };
    a.start(t); b.start(t); a.stop(t + dur + 0.05); b.stop(t + dur + 0.05);
  }

  function noiseBurst(t, dur, freq, vol, type, dest, sweepTo) {
    if (voices >= MAX_VOICES) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = 0.7;
    if (sweepTo) { f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    voices++;
    s.onended = () => { [s, f, g].forEach((n) => { try { n.disconnect(); } catch (e) {} }); voices--; };
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  }

  const SOUNDS = {
    click(t) {
      noiseBurst(t, 0.035, 3200, 0.05, 'bandpass');
      voice(1500, t, { dur: 0.06, vol: 0.035, ratio: 2, pv: 0.2 });
    },
    grab(t) {
      if (voices >= MAX_VOICES) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(65, t + 0.14);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(sfxBus); voices++;
      o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} voices--; };
      o.start(t); o.stop(t + 0.22);
      noiseBurst(t, 0.05, 700, 0.09);
    },
    step(t) {
      if (t - lastStep < 0.045) return;
      lastStep = t;
      let i; do { i = Math.floor(Math.random() * PENTA.length); } while (i === lastStepIdx);
      lastStepIdx = i;
      voice(PENTA[i], t, { dur: 0.55, vol: 0.11, ratio: 4.02, pv: 0.3, send: 0.35 });
    },
    near(t) {
      voice(880, t, { dur: 1.1, vol: 0.12, ratio: 2.76, pv: 0.4, send: 0.6, attack: 0.008 });
      voice(D6, t + 0.17, { dur: 1.5, vol: 0.13, ratio: 2.76, pv: 0.4, send: 0.7, attack: 0.008 });
    },
    solve(t) {
      [293.66, 369.99, 440, 493.88, 587.33, 739.99].forEach((f, i) =>
        voice(f, t + i * 0.2, { dur: 1.6, vol: 0.16, ratio: 3, pv: 0.3, send: 0.9, attack: 0.006 }));
      voice(146.83, t, { dur: 2.6, vol: 0.12, type: 'triangle', ratio: 2, pv: 0.2, send: 0.8, attack: 0.04 });
      voice(1174.66, t + 1.2, { dur: 1.3, vol: 0.07, ratio: 2.76, pv: 0.4, send: 1.1, attack: 0.01 });
    },
    unlock(t) {
      voice(880, t, { dur: 0.7, vol: 0.12, ratio: 2.76, pv: 0.45, send: 0.5 });
      voice(D6, t + 0.09, { dur: 0.9, vol: 0.12, ratio: 2.76, pv: 0.45, send: 0.6 });
    },
    coach(t) { voice(1100, t, { dur: 0.09, vol: 0.03, ratio: 2, pv: 0.15, send: 0.3, attack: 0.006 }); },
    flip(t) {
      noiseBurst(t, 0.45, 500, 0.06, 'bandpass', null, 2600);
      voice(659.25, t + 0.12, { dur: 1.0, vol: 0.12, ratio: 2.76, pv: 0.4, send: 0.7, attack: 0.008 });
      voice(987.77, t + 0.3, { dur: 1.2, vol: 0.12, ratio: 2.76, pv: 0.4, send: 0.8, attack: 0.008 });
    },
    side(t) {
      [293.66, 440, 587.33, 739.99].forEach((f, i) =>
        voice(f, t + i * 0.035, { dur: 1.3, vol: 0.12, ratio: 3, pv: 0.3, send: 0.9, attack: 0.012 }));
      voice(1479.98, t + 0.12, { dur: 1.1, vol: 0.04, ratio: 2.76, pv: 0.3, send: 1.1, attack: 0.02 });
    },
    warp(t) {                    // portal: a bright upward sweep, then two glassy tones a fifth apart
      noiseBurst(t, 0.4, 700, 0.05, 'bandpass', null, 3800);
      voice(1318.51, t + 0.1, { dur: 0.9, vol: 0.1, ratio: 2.76, pv: 0.4, send: 0.9, attack: 0.006 });
      voice(1975.53, t + 0.2, { dur: 1.1, vol: 0.08, ratio: 2.76, pv: 0.4, send: 1.0, attack: 0.006 });
    },
    twin(t) {                    // the twin answers a moment later, softer and lower
      const i = Math.max(0, (lastStepIdx < 0 ? 4 : lastStepIdx) - 3);
      voice(PENTA[i] * 0.5, t + 0.11, { dur: 0.6, vol: 0.06, ratio: 4.02, pv: 0.3, send: 0.7 });
    },
    trans(t) {                   // level card: a soft downward breath
      noiseBurst(t, 0.5, 1800, 0.035, 'bandpass', null, 420);
      voice(196, t + 0.05, { dur: 0.9, vol: 0.05, type: 'triangle', ratio: 2, pv: 0.15, send: 0.8, attack: 0.05 });
    },
    hint(t) {
      voice(440, t, { dur: 0.6, vol: 0.1, type: 'triangle', ratio: 2, pv: 0.15, send: 0.5, attack: 0.012 });
      voice(659.25, t + 0.22, { dur: 0.9, vol: 0.09, type: 'triangle', ratio: 2, pv: 0.15, send: 0.7, attack: 0.012 });
    },
  };

  // ---------- music ----------
  const MUSIC_LEVEL = 0.3;
  const CHORDS = [[146.83, 220, 293.66], [123.47, 185, 246.94], [164.81, 220, 329.63], [146.83, 185, 246.94]];

  // slow soft pad/drone voice: two sines (one detuned) through a lowpass, own envelope, own reverb send on the music bus
  function padVoice(f, dur, vol, cutoff, attackFrac) {
    const t = now();
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * attackFrac);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const oscs = [0, 6].map((cents) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = cents;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.1); return o;
    });
    lp.connect(g); g.connect(musicGain);
    const s = ctx.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(musicRevIn);
    const rec = { stop() { oscs.forEach((o) => { try { o.stop(); } catch (e) {} }); } };
    pads.add(rec);
    oscs[0].onended = () => { [lp, g, s].forEach((n) => { try { n.disconnect(); } catch (e) {} }); oscs.forEach((o) => { try { o.disconnect(); } catch (e) {} }); pads.delete(rec); };
  }

  function padTick() {
    if (!musicActive) return;
    CHORDS[chordIdx++ % CHORDS.length].forEach((f) => padVoice(f, 24, 0.032, 520, 0.35));
    padTimer = setTimeout(padTick, 13000);
  }
  function droneTick() { // slow low fifth, D2 + A2
    if (!musicActive) return;
    padVoice(73.42, 36, 0.05, 260, 0.4); padVoice(110, 36, 0.03, 260, 0.4);
    droneTimer = setTimeout(droneTick, 26000);
  }
  function noteTick() {
    if (!musicActive) return;
    if (running()) {
      const f = PENTA[Math.floor(rnd(0, PENTA.length))] * (Math.random() < 0.3 ? 2 : 1);
      voice(f, now() + 0.02, { dur: 3.2, vol: 0.05, ratio: 3, pv: 0.25, send: 1.2, attack: 0.01, dest: musicGain, music: true });
    }
    noteTimer = setTimeout(noteTick, rnd(2200, 6500));
  }

  function musicStart() {
    if (musicActive || !running() || !musicOn || hidden) return;
    musicActive = true;
    clearTimeout(stopTimer);
    cut(musicGain, MUSIC_LEVEL, 0.6);
    padTick(); droneTick();
    noteTimer = setTimeout(noteTick, 900);
  }
  // near-instant: 60ms ramp to silence (bus includes the music reverb tail), then kill every music node
  function musicStop() {
    if (!ctx) return;
    musicActive = false;
    clearTimeout(noteTimer); clearTimeout(padTimer); clearTimeout(droneTimer); clearTimeout(stopTimer);
    cut(musicGain, 0, 0.06);
    stopTimer = setTimeout(() => { pads.forEach((p) => p.stop()); }, 90);
  }

  // ---------- proximity hum ----------
  function proxInit() {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'triangle'; o3.type = 'sine';
    const g2 = ctx.createGain(), g3 = ctx.createGain(); g2.gain.value = 0.35; g3.gain.value = 0.2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.5;
    const out = ctx.createGain(); out.gain.value = 0;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp);
    lp.connect(out); out.connect(sfxBus);
    const s = ctx.createGain(); s.gain.value = 0.5; out.connect(s); s.connect(revIn);
    o1.frequency.value = 147; o2.frequency.value = 220; o3.frequency.value = 294.5;
    o1.start(); o2.start(); o3.start();
    prox = { o1, o2, o3, lp, out };
  }
  function proxApply() {
    if (!prox) return;
    const p = soundOn && running() && !hidden ? proxP : 0, t = now();
    const f = 146.83 * Math.pow(2, p * 1.6); // D3 up to ~D4.5
    prox.o1.frequency.setTargetAtTime(f, t, 0.12);
    prox.o2.frequency.setTargetAtTime(f * 1.5, t, 0.12);
    prox.o3.frequency.setTargetAtTime(f * 2.005, t, 0.12);
    prox.lp.frequency.setTargetAtTime(250 + p * 2600, t, 0.12);
    prox.out.gain.setTargetAtTime(p < 0.03 ? 0 : 0.005 + 0.017 * p * p, t, 0.15);
  }

  // ---------- visibility ----------
  function onVisibility() {
    if (!ctx) return;
    if (document.hidden) {
      hidden = true;
      musicStop(); proxApply();
      setTimeout(() => { if (hidden && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 400);
    } else {
      hidden = false;
      ctx.resume().then(() => { musicStart(); proxApply(); }).catch(() => {});
    }
  }

  const Audio = {
    unlock: safe(function () {
      if (!AC) return;
      if (!ctx) {
        build();
        if (typeof document !== 'undefined') {
          hidden = !!document.hidden;
          document.addEventListener('visibilitychange', safe(onVisibility));
        }
        // iOS: a started silent buffer inside the gesture fully unlocks output
        const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050);
        s.connect(ctx.destination); s.start(0);
      }
      if (ctx.state !== 'running') {
        ctx.resume().then(() => { if (!prox) proxInit(); musicStart(); proxApply(); }).catch(() => {});
      } else { if (!prox) proxInit(); musicStart(); }
    }),
    play: safe(function (name) {
      if (!ctx || !soundOn || hidden) return;
      if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return; }
      const fn = SOUNDS[name];
      if (fn) fn(now() + 0.005);
    }),
    setSound: safe(function (on) {
      soundOn = !!on;
      if (!ctx) return;
      cut(sfxBus, soundOn ? 1 : 0, soundOn ? 0.1 : 0.03);
      cut(revOut, soundOn ? 0.7 : 0, soundOn ? 0.1 : 0.03); // also cuts the effects' reverb tail
      proxApply();
    }),
    setMusic: safe(function (on) {
      musicOn = !!on;
      if (!ctx) return;
      if (musicOn) musicStart(); else musicStop();
    }),
    setProximity: safe(function (p) {
      p = p > 0 ? (p < 1 ? p : 1) : 0;
      if (p === proxP) return;
      proxP = p;
      proxApply();
    }),
    setHaptics: function (on) { hapticsOn = !!on; },
    haptic: function (kind) {
      try {
        if (!hapticsOn || typeof navigator === 'undefined' || !navigator.vibrate) return;
        const pat = kind === 'tap' ? 10 : kind === 'step' ? 6 : kind === 'solve' ? [20, 40, 20, 40, 60] : 0;
        if (pat) navigator.vibrate(pat);
      } catch (e) {}
    },
    setVolume: safe(function (v) {
      volume = v > 0 ? (v < 1 ? v : 1) : 0;
      if (ctx) master.gain.setTargetAtTime(volume, now(), 0.05);
    }),
    // test hooks (not part of the game API)
    _ctx: () => ctx,
    _tap: () => comp,
    _voices: () => voices,
  };
  V.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
