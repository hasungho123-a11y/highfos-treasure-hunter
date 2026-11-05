/* 하이포스 제도 — every sound is synthesised here, so there are no audio files to download. Sfx.on / Sfx.toggle() is the kid's switch. */
window.Sfx = (() => {
  const KEY = "hs_sound"; let on = true; try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  let ctx = null, out = null, noiseBuf = null;
  function ac() {
    if (!on) return null;
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      const comp = ctx.createDynamicsCompressor(); out = ctx.createGain(); out.gain.value = .55; out.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  // phones only allow sound after a touch, so the first touch anywhere opens it
  addEventListener("pointerdown", () => ac(), { passive: true });
  const env = (g, at, vol, attack, dur) => { g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), at + attack); g.gain.exponentialRampToValueAtTime(.0001, at + attack + dur); };
  function tone(f, dur, { to, type = "sine", vol = .4, at = 0, attack = .005 } = {}) { const c = ac(); if (!c) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); env(g, t, vol, attack, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + attack + dur + .02); }
  function noise(dur, { f = 1200, to, kind = "lowpass", vol = .5, at = 0, attack = .005, q = .7 } = {}) { const c = ac(); if (!c) return; const t = c.currentTime + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = kind; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur); env(g, t, vol, attack, dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + attack + dur + .02); }
  const boomAt = (at, size = 1) => { noise(.55 * size, { f: 900, to: 90, vol: .9, at }); tone(120, .5 * size, { to: 34, vol: .8, at }); };
  // the launch of each weapon kind in battle
  const SHOTS = {
    bolt() { tone(300, .1, { to: 90, type: "triangle", vol: .35 }); noise(.22, { f: 2600, to: 800, kind: "bandpass", vol: .3 }); },
    stone() { tone(90, .18, { to: 50, vol: .6 }); noise(.5, { f: 500, to: 1400, kind: "bandpass", vol: .22, at: .06 }); },
    cannon() { boomAt(0, .55); },
    gun() { for (let i = 0; i < 7; i++) { noise(.05, { f: 2400, to: 500, vol: .55, at: i * .075 }); tone(170, .04, { type: "square", vol: .1, at: i * .075 }); } },
    torpedo() { noise(.8, { f: 260, to: 700, kind: "bandpass", vol: .4, attack: .08 }); tone(70, .7, { to: 110, vol: .22, attack: .08 }); },
    turret() { boomAt(0, .75); boomAt(.13, .6); },
    missile() { noise(.95, { f: 500, to: 3800, kind: "bandpass", vol: .5, attack: .05 }); tone(140, .8, { to: 520, type: "sawtooth", vol: .07, attack: .05 }); }
  };
  const notes = (list, gap, opts) => list.forEach((f, i) => tone(f, opts.dur || .2, { ...opts, at: i * gap }));
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} if (on) this.tap(); return on; },
    shot: kind => (SHOTS[kind] || SHOTS.cannon)(),
    boom: size => boomAt(0, size || 1),
    splash() { noise(.4, { f: 1800, to: 4200, kind: "highpass", vol: .3, attack: .02 }); tone(420, .12, { to: 160, vol: .1 }); },
    hurt() { boomAt(0, .8); noise(.3, { f: 3000, to: 700, kind: "bandpass", vol: .3, q: 4 }); },
    tap: () => tone(620, .05, { type: "triangle", vol: .16 }),
    flip: () => noise(.07, { f: 3200, to: 1500, kind: "bandpass", vol: .25 }),
    match: () => notes([784, 1175], .08, { type: "triangle", vol: .24, dur: .16 }),
    tick: () => tone(980, .04, { type: "triangle", vol: .07 }),
    lamp: i => tone([330, 440, 554, 659][i] || 440, .2, { type: "triangle", vol: .3 }),
    lock: () => tone(1320, .35, { to: 1760, type: "square", vol: .05 }),
    ping: () => tone(1480, .5, { to: 1200, vol: .14 }),
    wrong: () => tone(170, .24, { to: 120, type: "sawtooth", vol: .16 }),
    coin: () => notes([1319, 1976], .07, { type: "square", vol: .07, dur: .16 }),
    stars(n) { const scale = [523, 659, 784]; if (!n) return notes([392, 330], .16, { type: "triangle", vol: .24, dur: .22 }); for (let i = 0; i < n; i++) tone(scale[i], .24, { type: "triangle", vol: .3, at: i * .16 }); },
    win: () => notes([523, 659, 784, 1047, 784, 1047], .13, { type: "triangle", vol: .32, dur: .24 }),
    lose: () => notes([392, 349, 311, 233], .22, { type: "triangle", vol: .28, dur: .32 }),
    bossHit() { boomAt(0, .6); noise(.22, { f: 2600, to: 900, kind: "bandpass", vol: .3, q: 5, at: .03 }); },
    bossDown() { boomAt(0, 1.2); boomAt(.32, 1); boomAt(.62, 1.3); [392, 523, 659, 784, 1047, 1319].forEach((f, i) => { tone(f, .34, { type: "triangle", vol: .3, at: 1.15 + i * .13 }); tone(f / 2, .34, { type: "sawtooth", vol: .06, at: 1.15 + i * .13 }); }); }
  };
})();
