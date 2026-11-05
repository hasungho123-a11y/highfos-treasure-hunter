/* 하이포스 제도 — the mini-games. Games.run(kind) shows a full-screen game and resolves with the score (null if the child leaves early). */
(() => {
const V = window.Voyage;
function shell(title, help) {
  const el = document.createElement("div"); el.className = "game";
  el.innerHTML = `<div class="game-top"><b>${title}</b><span class="game-hud num"></span><button type="button" class="btn sm" data-quit>그만하기</button></div><p class="game-help">${help}</p><div class="game-stage"></div>`;
  document.body.appendChild(el);
  return { el, hud: el.querySelector(".game-hud"), stage: el.querySelector(".game-stage"), quit: el.querySelector("[data-quit]") };
}
function canvasIn(stage) {
  const c = document.createElement("canvas"); stage.appendChild(c); const g = c.getContext("2d");
  const fit = () => { const r = stage.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0); return r; };
  let size = fit(); const ro = new ResizeObserver(() => size = fit()); ro.observe(stage);
  return { c, g, get w() { return size.width; }, get h() { return size.height; }, stop: () => ro.disconnect() };
}
const SEA_CROP = [300, 905, 640, 150]; // an empty stretch of water in the painted map pictures (x, y, w, h)
const sea = (g, w, h, t, art) => { const im = art && art.sea;
  if (im && im.complete && im.naturalWidth) { // the map's own water, mirrored every other row so it scrolls without a seam
    const [cx, cy, cw, ch] = SEA_CROP, rowH = w * ch / cw, off = (t * 26) % (rowH * 2); let i = 0;
    for (let y = off - rowH * 2; y < h; y += rowH, i++) { g.save(); if (i % 2) { g.translate(0, y + rowH); g.scale(1, -1); g.drawImage(im, cx, cy, cw, ch, 0, 0, w, rowH + 1); } else g.drawImage(im, cx, cy, cw, ch, 0, y, w, rowH + 1); g.restore(); }
    g.fillStyle = "rgba(255,255,255,.3)"; for (let n = 0; n < 16; n++) { const x = (n * 197 + Math.sin(n) * 60) % w, y = ((n * 131 + t * 26) % (h + 20)) - 10, l = 8 + (n % 4) * 5; g.fillRect(x, y, l * (.6 + .4 * Math.sin(t * 2 + n)), 1.5); } return; }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3A86BD"); gr.addColorStop(1, "#123E66"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 2; for (let y = (t * 30) % 46 - 46; y < h; y += 46) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * .03 + y) * 5); g.stroke(); } };
// a picture of a ship, standing on its waterline at (x, y)
const sprite = (g, im, x, y, width, flip) => { const hgt = width * im.naturalHeight / im.naturalWidth; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(im, -width / 2, -hgt * .62, width, hgt); g.restore(); };
// short-lived sparks, smoke and spray
function bits() { const list = []; return {
  add(x, y, n, make) { for (let i = 0; i < n; i++) list.push({ x, y, age: 0, ...make(i) }); },
  draw(g, dt) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.age += dt; if (p.age >= p.life) { list.splice(i, 1); continue; } p.vy += (p.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; const k = p.age / p.life; g.globalAlpha = p.a * (1 - k); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * k, 0, 7); g.fill(); } g.globalAlpha = 1; } }; }
const blast = (b, x, y) => { b.add(x, y, 16, () => ({ vx: (Math.random() - .5) * 240, vy: (Math.random() - .5) * 240, life: .35 + Math.random() * .25, c: Math.random() < .5 ? "#FFB347" : "#FFE27A", a: 1, r0: 8, r1: 1 })); b.add(x, y, 10, () => ({ vx: (Math.random() - .5) * 70, vy: -30 - Math.random() * 60, life: .9 + Math.random() * .5, c: "#2B2A2C", a: .7, r0: 6, r1: 24 })); };
const spray = (b, x, y) => { b.add(x, y, 22, () => ({ vx: (Math.random() - .5) * 90, vy: -80 - Math.random() * 170, grav: 420, life: .7 + Math.random() * .3, c: "#EEF8FF", a: .95, r0: 5, r1: 2 })); };
const boat = (g, x, y, s, hull = "#7A4A28", sail = "#EFE4C8") => { g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = sail; g.beginPath(); g.moveTo(1, -26); g.lineTo(1, -4); g.lineTo(15, -4); g.fill(); g.beginPath(); g.moveTo(-1, -22); g.lineTo(-1, -4); g.lineTo(-12, -4); g.fill();
  g.fillStyle = "#4E321E"; g.fillRect(-1, -28, 2, 26); g.fillStyle = hull; g.beginPath(); g.moveTo(-17, -2); g.lineTo(17, -2); g.lineTo(11, 8); g.lineTo(-11, 8); g.fill(); g.restore(); };

// the same games get faster and change their dressing from sea to sea
const PACE = [1, 1.2, 1.4];
const targetShip = (g, x, y, s, map) => { if (!map) return boat(g, x, y, s, "#8E2A22", "#2B2B2E"); g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = map === 1 ? "#23262B" : "#8A949E"; g.fillRect(-8, -14, 12, 12); g.fillStyle = "#23262B"; if (map === 1) g.fillRect(-3, -24, 5, 10); else g.fillRect(-1, -26, 2, 12);
  g.fillStyle = map === 1 ? "#3C3F44" : "#5F6973"; g.beginPath(); g.moveTo(-20, -2); g.lineTo(21, -2); g.lineTo(15, 8); g.lineTo(-16, 8); g.fill(); g.restore(); };
// rocks and icebergs are faceted from a seed so each one keeps its shape; lit from the upper left like the map
const hazard = (g, k, map, t = 0) => { k.seed = k.seed || 1 + Math.random() * 90;
  const ring = (rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(k.x, k.y + k.r * .32, rx, ry, 0, 0, 7); g.fill(); };
  if (map === 2) { ring(k.r * 1.25, k.r * .55, "rgba(0,0,0,.28)"); const bob = Math.sin(t * 2.4 + k.seed) * 2;
    g.fillStyle = "#16181C"; for (let a = 0; a < 6.3; a += .79) { g.beginPath(); g.arc(k.x + Math.cos(a) * k.r * .95, k.y + bob + Math.sin(a) * k.r * .95, k.r * .16, 0, 7); g.fill(); }
    const m = g.createRadialGradient(k.x - k.r * .35, k.y + bob - k.r * .35, 1, k.x, k.y + bob, k.r); m.addColorStop(0, "#6A727D"); m.addColorStop(.55, "#30353D"); m.addColorStop(1, "#14161A"); g.fillStyle = m; g.beginPath(); g.arc(k.x, k.y + bob, k.r * .85, 0, 7); g.fill();
    g.fillStyle = Math.sin(t * 6 + k.seed) > 0 ? "#FF5A47" : "#7A2018"; g.beginPath(); g.arc(k.x, k.y + bob - k.r * .55, 3, 0, 7); g.fill(); return; }
  const ice = map === 1, N = 7, pts = []; for (let i = 0; i < N; i++) { const a = i / N * 6.283 - 1.57, rr = k.r * (.72 + .33 * Math.abs(Math.sin(k.seed * (i + 1)))); pts.push([k.x + Math.cos(a) * rr, k.y + Math.sin(a) * rr * (ice ? 1.05 : .9) - (i === 0 ? k.r * .3 : 0)]); }
  ring(k.r * 1.3, k.r * .62, "rgba(255,255,255,.55)"); ring(k.r * 1.12, k.r * .5, ice ? "rgba(90,150,190,.65)" : "rgba(10,30,45,.5)");
  const light = ice ? "#F6FCFF" : "#A89580", mid = ice ? "#CBE5F1" : "#6E6152", dark = ice ? "#86B4CC" : "#3E352C", top = [k.x - k.r * .12, k.y - k.r * .22];
  for (let i = 0; i < N; i++) { const a = pts[i], b = pts[(i + 1) % N], mx = (a[0] + b[0]) / 2 - top[0], my = (a[1] + b[1]) / 2 - top[1], lit = (-mx - my) / (k.r * 1.4); g.fillStyle = lit > .3 ? light : lit > -.25 ? mid : dark; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill(); } };
const gunBarrel = (g, w, h, kick) => { const x = w / 2, y0 = h - 16 + kick * 14; // my own gun in the foreground
  const m = g.createLinearGradient(x - 22, 0, x + 22, 0); m.addColorStop(0, "#14161A"); m.addColorStop(.4, "#5A616B"); m.addColorStop(.62, "#2B2F36"); m.addColorStop(1, "#0D0E11"); g.fillStyle = m; g.beginPath(); g.moveTo(x - 25, y0); g.lineTo(x - 14, y0 - 94); g.lineTo(x + 14, y0 - 94); g.lineTo(x + 25, y0); g.fill();
  g.fillStyle = "#C9A24A"; g.fillRect(x - 17, y0 - 94, 34, 6); g.fillRect(x - 21, y0 - 40, 42, 5);
  const c = g.createLinearGradient(0, y0 - 18, 0, h); c.addColorStop(0, "#6B4A2C"); c.addColorStop(1, "#2C1C10"); g.fillStyle = c; g.beginPath(); g.moveTo(x - 66, h); g.lineTo(x - 50, y0 - 18); g.lineTo(x + 50, y0 - 18); g.lineTo(x + 66, h); g.fill(); };

const WINDS = [-1, -.65, -.35, .35, .65, 1], pickWind = () => WINDS[Math.floor(Math.random() * WINDS.length)];
const windArrow = (g, x, y, v, label) => { const l = 16 + Math.abs(v) * 34, d = Math.sign(v) || 1; g.save(); g.translate(x, y); g.fillStyle = "rgba(6,22,40,.62)"; g.beginPath(); g.roundRect(-62, -19, 124, 38, 12); g.fill(); g.fillStyle = "#fff"; g.font = "700 12px sans-serif"; g.textAlign = "left"; g.fillText(label, -54, 4); g.translate(18, 0); g.strokeStyle = "#FFE27A"; g.fillStyle = "#FFE27A"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(-d * l / 2, 0); g.lineTo(d * l / 2 - d * 6, 0); g.stroke(); g.beginPath(); g.moveTo(d * l / 2 + d * 3, 0); g.lineTo(d * l / 2 - d * 8, -7); g.lineTo(d * l / 2 - d * 8, 7); g.fill(); g.restore(); };
/* 범선의 바다 포격: the wind bends each shot, so the spot to wait for changes every time. 10 shots, and it speeds up. */
function cannon({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "바람에 포탄이 휘어요. 점선이 닿는 곳에 표적이 올 때 눌러요. 10발!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    let shots = 10, hits = 0, t = 0, last = performance.now(), phase = 0, ball = null, flash = null, over = false, kick = 0, lastX = 0, wind = pickWind();
    const fire = e => { e.preventDefault(); if (ball || over || shots <= 0) return; shots--; ball = { p: 0 }; kick = 1; Sfx.shot("cannon"); fx.add(cv.w / 2, cv.h - 112, 9, () => ({ vx: (Math.random() - .5) * 50, vy: -70 - Math.random() * 120, life: .3 + Math.random() * .2, c: "#FFD27A", a: 1, r0: 7, r1: 1 })); };
    s.stage.addEventListener("pointerdown", fire);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, speed = (1.5 + (10 - shots) * .22 + hits * .08) * PACE[map]; phase += dt * speed;
      const tx = w / 2 + Math.sin(phase) * (w / 2 - 44), ty = h * .24, landX = w / 2 + wind * Math.min(150, w * .3);
      sea(g, w, h, t * .3, art); const bobY = ty + Math.sin(t * 3) * 3, big = art?.target;
      if (big) sprite(g, big, tx, bobY, Math.min(190, w * .46), tx < lastX); else targetShip(g, tx, bobY, 1.5, map); lastX = tx;
      g.strokeStyle = "rgba(255,255,255,.4)"; g.setLineDash([6, 8]); g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 14; i++) { const p = i / 14; g.lineTo(w / 2 + (landX - w / 2) * p * p, h - 120 + (ty + 24 - h + 120) * p); } g.stroke(); g.setLineDash([]);
      g.strokeStyle = "rgba(255,226,122,.8)"; g.lineWidth = 2; g.beginPath(); g.ellipse(landX, ty + 8, 30, 11, 0, 0, 7); g.stroke();
      windArrow(g, 72, h - 34, wind, "바람");
      kick = Math.max(0, kick - dt * 5); gunBarrel(g, w, h, kick);
      if (ball) { ball.p += dt / .42; const p = Math.min(1, ball.p), bx = w / 2 + (landX - w / 2) * p * p, y = h - 112 + (ty - h + 112) * p, r = 9 - 5 * ball.p; g.fillStyle = "#1C1E22"; g.beginPath(); g.arc(bx, y, r, 0, 7); g.fill(); g.fillStyle = "rgba(255,235,180,.7)"; g.beginPath(); g.arc(bx - r * .3, y - r * .3, r * .3, 0, 7); g.fill();
        if (ball.p >= 1) { const hit = Math.abs(tx - landX) < 34; if (hit) { hits++; blast(fx, landX, ty); Sfx.boom(.8); } else { spray(fx, landX, ty + 6); Sfx.splash(); } flash = { hit, a: 1 }; ball = null; wind = pickWind(); if (!shots) setTimeout(() => end(hits), 700); } }
      fx.draw(g, dt);
      if (flash) { flash.a -= dt * 2.2; if (flash.a <= 0) flash = null; else { g.fillStyle = `rgba(255,255,255,${flash.a})`; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText(flash.hit ? "명중!" : "빗나갔어요", w / 2, h * .5); } }
      s.hud.textContent = `명중 ${hits} · 남은 ${shots}발`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 피하기: slide left and right; it gets faster until you hit one. Each sea adds its own trouble:
   a current that pushes the ship off your finger, fog that hides what's ahead, mines seen only when the sonar passes over them. */
function reef({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, ["해류가 배를 옆으로 밀어요. 손가락으로 버티며 암초를 피해요.", "안개 때문에 빙산이 늦게 보여요. 침착하게 피해요.", "기뢰는 소나 파동이 지나갈 때만 보여요. 움직이는 기뢰도 있어요."][map]), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    let x = .5, t = 0, last = performance.now(), rocks = [], spawn = 0, passed = 0, over = false, crashed = 0, ping = 0;
    const move = e => { const r = s.stage.getBoundingClientRect(); x = Math.min(.95, Math.max(.05, (e.clientX - r.left) / r.width)); };
    s.stage.addEventListener("pointerdown", move); s.stage.addEventListener("pointermove", move);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, speed = (170 + t * 9) * [1, 1, 1.1][map];
      sea(g, w, h, t * 6, art);
      if (!crashed) { spawn -= dt; if (spawn <= 0) { spawn = Math.max(.34, .95 - t * .012); rocks.push({ x: Math.random() * (w - 50) + 25, y: -30, r: 17 + Math.random() * 13, vx: map === 2 && Math.random() < .35 ? (Math.random() < .5 ? -1 : 1) * (26 + Math.random() * 30) : 0 }); } }
      const push = map === 0 && !crashed ? (Math.sin(t * .62 + 1) * .13 + Math.sin(t * .27) * .07) * Math.min(1.6, 1 + t * .012) : 0, px = Math.min(.96, Math.max(.04, x + push)) * w, py = h - 70;
      if (map === 0) { windArrow(g, w - 72, 34, Math.max(-1, Math.min(1, push * 5)), "해류"); if (!crashed && Math.random() < dt * 22) fx.add(Math.random() * w, Math.random() * h, 1, () => ({ vx: push * 900, vy: speed * .5, life: .5, c: "#DDF2FF", a: .4, r0: 1.5, r1: .5 })); }
      if (map === 2) { g.fillStyle = "rgba(3,16,28,.62)"; g.fillRect(0, 0, w, h); ping += dt; const period = 1.5; if (ping >= period && !crashed) { ping = 0; Sfx.ping(); }
        const R = Math.min(1, ping / .9) * Math.hypot(w, h), fade = Math.max(0, 1 - ping / .9); g.strokeStyle = `rgba(110,240,190,${fade * .85})`; g.lineWidth = 3; g.beginPath(); g.arc(px, py, R, 0, 7); g.stroke(); g.lineWidth = 1; g.strokeStyle = "rgba(110,240,190,.1)"; for (let r = 90; r < h * 1.2; r += 90) { g.beginPath(); g.arc(px, py, r, 0, 7); g.stroke(); }
        for (const k of rocks) if (Math.hypot(k.x - px, k.y - py) <= R && ping < .9) k.seen = t; }
      for (const k of rocks) { if (!crashed) { k.y += speed * dt; if (k.vx) { k.x += k.vx * dt; if (k.x < 22 || k.x > w - 22) k.vx = -k.vx; } } if (map === 2) g.globalAlpha = crashed ? 1 : Math.max(.08, 1 - (t - (k.seen ?? -9)) / 1.05); hazard(g, k, map, t); g.globalAlpha = 1;
        if (!crashed && Math.hypot(k.x - px, k.y - py) < k.r + 15) { crashed = t; blast(fx, px, py - 6); Sfx.boom(); setTimeout(() => end(passed), 1000); } }
      if (map === 1) { const clear = h * (.56 - Math.min(.1, t * .0016)), f = g.createLinearGradient(0, 0, 0, clear); f.addColorStop(0, "rgba(222,232,236,1)"); f.addColorStop(.62, "rgba(222,232,236,.97)"); f.addColorStop(1, "rgba(222,232,236,0)"); g.fillStyle = f; g.fillRect(0, 0, w, clear); }
      const before = rocks.length; rocks = rocks.filter(k => k.y < h + 40); if (before > rocks.length && !crashed) Sfx.tick(); passed += before - rocks.length;
      if (!crashed && Math.random() < dt * 28) fx.add(px + (Math.random() - .5) * 16, py + 20, 1, () => ({ vx: (Math.random() - .5) * 26, vy: 70 + speed * .35, life: .6, c: "#F2FAFF", a: .65, r0: 3, r1: 8 }));
      fx.draw(g, dt);
      if (art?.me) sprite(g, art.me, px, py + (crashed ? 6 : 0), 124); else boat(g, px, py, 1.4);
      if (crashed) { g.fillStyle = "#fff"; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText("쿵!", w / 2, h * .45); }
      s.hud.textContent = `피한 ${["암초", "빙산", "기뢰"][map]} ${passed}`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 보물 동굴: find the pairs. Fewer turns scores higher. */
function memory({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "같은 그림의 짝을 찾아요. 적게 뒤집을수록 좋아요."), ids = ["star", "heart", "flower", "butterfly", "crown", "shell"];
    s.el.classList.add("g-mem", `era-${map}`); s.stage.style.setProperty("--pic", `url(/maps/sea${map + 1}.webp)`);
    const deck = [...ids, ...ids].map(id => ({ id })).sort(() => Math.random() - .5);
    s.stage.innerHTML = `<div class="mem">${deck.map((c, i) => `<button type="button" class="mem-c" data-i="${i}" aria-label="카드 ${i + 1}"><span class="mem-b"></span><span class="mem-f">${`<svg viewBox="0 0 100 100" aria-hidden="true">${V.embSVG(c.id, 50, 50, 78, "#14466F", "#FFFDF9")}</svg>`}</span></button>`).join("")}</div>`;
    let first = null, lock = false, turns = 0, pairs = 0, left = [90, 70, 55][map], over = false;
    const end = v => { if (over) return; over = true; clearInterval(tm); s.el.remove(); done(v); };
    const show = () => s.hud.textContent = `뒤집기 ${turns} · ${left}초`;
    const tm = setInterval(() => { left--; show(); if (left <= 0) end(pairs); }, 1000); show();
    s.quit.onclick = () => end(null);
    s.stage.addEventListener("click", e => { const b = e.target.closest(".mem-c"); if (!b || lock || b.classList.contains("up")) return; const c = deck[b.dataset.i]; b.classList.add("up"); Sfx.flip();
      if (!first) { first = { b, c }; return; }
      turns++; show();
      if (first.c.id === c.id) { pairs++; first = null; Sfx.match(); if (pairs === ids.length) { const score = Math.max(0, 30 - turns); setTimeout(() => end(score), 500); } return; }
      lock = true; const a = first.b; first = null; setTimeout(() => { a.classList.remove("up"); b.classList.remove("up"); lock = false; }, 750); });
  });
}
/* 증기의 바다 포격: a torpedo is slow, so aim where the ship will be, not where it is. 10 torpedoes; score = hits. */
function torpedo({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "어뢰는 느려요. 배가 갈 자리를 미리 계산해서 눌러요. 10발!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    let shots = 10, hits = 0, t = 0, last = performance.now(), ship = null, run = null, flash = null, over = false, kick = 0;
    const TRAVEL = 1.25, sail = w => { const dir = Math.random() < .5 ? 1 : -1; ship = { x: dir > 0 ? -90 : w + 90, dir, v: 100 + Math.random() * 45 + (10 - shots) * 8 }; };
    const fire = e => { e.preventDefault(); if (run || over || shots <= 0) return; shots--; run = { p: 0 }; kick = 1; Sfx.shot("torpedo"); };
    s.stage.addEventListener("pointerdown", fire);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, ty = h * .2, y0 = h - 74; if (!ship) sail(w);
      ship.x += ship.dir * ship.v * dt; if (ship.x < -130 || ship.x > w + 130) sail(w);
      sea(g, w, h, t * .3, art); const bob = ty + Math.sin(t * 2.6) * 2; if (art?.target) sprite(g, art.target, ship.x, bob, Math.min(190, w * .46), ship.dir < 0); else targetShip(g, ship.x, bob, 1.5, map);
      g.strokeStyle = "rgba(255,255,255,.35)"; g.setLineDash([4, 10]); g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, ty + 16); g.lineTo(w / 2, y0); g.stroke(); g.setLineDash([]);
      if (run) { run.p += dt / TRAVEL; const p = Math.min(1, run.p), y = y0 + (ty - y0) * p; fx.add(w / 2 + (Math.random() - .5) * 6, y + 14, 2, () => ({ vx: (Math.random() - .5) * 18, vy: 8, life: .9, c: "#E8F6FF", a: .7, r0: 2.5, r1: 7 }));
        g.save(); g.translate(w / 2, y); g.fillStyle = "#23272C"; g.beginPath(); g.ellipse(0, 0, 5, 16, 0, 0, 7); g.fill(); g.fillStyle = "#C9A24A"; g.fillRect(-5, -9, 10, 3); g.restore();
        if (run.p >= 1) { const hit = Math.abs(ship.x - w / 2) < 46; if (hit) { hits++; blast(fx, w / 2, ty); Sfx.boom(); sail(w); } else { spray(fx, w / 2, ty + 6); Sfx.splash(); } flash = { hit, a: 1 }; run = null; if (!shots) setTimeout(() => end(hits), 700); } }
      fx.draw(g, dt);
      kick = Math.max(0, kick - dt * 5); g.save(); g.translate(w / 2, h - 18 + kick * 12); const m = g.createLinearGradient(-30, 0, 30, 0); m.addColorStop(0, "#14161A"); m.addColorStop(.45, "#59616B"); m.addColorStop(1, "#101215"); g.fillStyle = m; g.beginPath(); g.roundRect(-22, -48, 44, 70, 8); g.fill(); g.fillStyle = "#0A0B0D"; g.beginPath(); g.ellipse(0, -46, 15, 6, 0, 0, 7); g.fill(); g.fillStyle = "#7B5A36"; g.fillRect(-48, 2, 96, 30); g.restore();
      if (flash) { flash.a -= dt * 2.2; if (flash.a <= 0) flash = null; else { g.fillStyle = `rgba(255,255,255,${flash.a})`; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText(flash.hit ? "명중!" : "빗나갔어요", w / 2, h * .5); } }
      s.hud.textContent = `명중 ${hits} · 남은 ${shots}발`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 현대의 바다 포격: press and hold the real warship until the lock closes; flickering contacts are decoys. 10 waves; score = kills. */
function missile({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "진짜 적함을 꾹 눌러 조준을 고정해요. 깜빡이는 표적은 미끼예요. 10번!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    const WAVES = 10, HOLD = .42;
    let wave = 0, hits = 0, t = 0, last = performance.now(), cs = [], left = 0, lock = null, shot = null, pause = .5, msg = null, over = false;
    const spawn = (w, h) => { wave++; const n = 2 + Math.min(2, Math.floor(wave / 4)), real = Math.floor(Math.random() * n); cs = []; left = 2.9 - wave * .11;
      for (let i = 0; i < n; i++) { let x, y, tries = 0; do { x = 60 + Math.random() * (w - 120); y = h * .14 + Math.random() * h * .5; } while (cs.some(c => Math.hypot(c.x - x, c.y - y) < 110) && ++tries < 30); cs.push({ x, y, real: i === real, vx: (Math.random() - .5) * 26, seed: Math.random() * 9 }); } };
    const say = (text, good) => { msg = { text, good, a: 1 }; };
    const closeWave = () => { cs = []; lock = null; pause = .55; if (wave >= WAVES) { over = "ending"; setTimeout(() => end(hits), 800); } };
    const at = e => { const r = s.stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const near = e => { const [x, y] = at(e); let best = null, bd = 62; for (const c of cs) { const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } } return best; };
    const down = e => { e.preventDefault(); if (shot) return; const c = near(e); if (c) { lock = { c, p: 0 }; Sfx.lock(); } };
    const up = () => { lock = null; };
    s.stage.addEventListener("pointerdown", down); s.stage.addEventListener("pointerup", up); s.stage.addEventListener("pointercancel", up); s.stage.addEventListener("pointerleave", up);
    function end(v) { if (over === true) return; over = true; cv.stop(); s.el.remove(); done(v); }
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over === true) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h;
      sea(g, w, h, t * .3, art); g.fillStyle = "rgba(3,18,30,.55)"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(120,230,190,.13)"; g.lineWidth = 1; for (let r = 90; r < h * 1.25; r += 90) { g.beginPath(); g.arc(w / 2, h, r, 0, 7); g.stroke(); }
      const sweep = t * 1.3 % 6.283; g.strokeStyle = "rgba(120,230,190,.32)"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2 + Math.cos(sweep) * h * 1.3, h + Math.sin(sweep) * h * 1.3); g.stroke();
      if (!cs.length && !shot && over !== "ending" && wave < WAVES) { pause -= dt; if (pause <= 0) spawn(w, h); }
      if (cs.length && !shot) { left -= dt; if (left <= 0) { say("놓쳤어요", false); Sfx.splash(); closeWave(); } }
      for (const c of cs) { c.x = Math.max(44, Math.min(w - 44, c.x + c.vx * dt)); const flicker = !c.real && Math.sin(t * 17 + c.seed) > .1; g.globalAlpha = c.real ? 1 : flicker ? .3 : .95;
        if (art?.target) sprite(g, art.target, c.x, c.y + 10, 96, c.vx < 0); else targetShip(g, c.x, c.y + 8, 1.05, map); g.globalAlpha = 1;
        g.strokeStyle = "#FF6A52"; g.lineWidth = 2; const b = 40; for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(c.x + dx * b, c.y + dy * (b - 13)); g.lineTo(c.x + dx * b, c.y + dy * b); g.lineTo(c.x + dx * (b - 13), c.y + dy * b); g.stroke(); } }
      if (lock && !shot) { lock.p += dt / HOLD; g.strokeStyle = "#FFE27A"; g.lineWidth = 5; g.beginPath(); g.arc(lock.c.x, lock.c.y, 50, -1.57, -1.57 + Math.min(1, lock.p) * 6.283); g.stroke(); if (lock.p >= 1) { shot = { c: lock.c, p: 0 }; lock = null; Sfx.shot("missile"); } }
      if (shot) { shot.p += dt / .55; const p = Math.min(1, shot.p), mx = w / 2 + (shot.c.x - w / 2) * p, my = h - 20 + (shot.c.y - h + 20) * p * p; fx.add(mx, my + 8, 3, () => ({ vx: (Math.random() - .5) * 22, vy: 24, life: .55, c: "#F3F5F7", a: .7, r0: 3, r1: 10 })); g.fillStyle = "#EDEFF2"; g.beginPath(); g.ellipse(mx, my, 4, 12, Math.atan2(shot.c.x - w / 2, h) * .8, 0, 7); g.fill();
        if (shot.p >= 1) { if (shot.c.real) { hits++; blast(fx, shot.c.x, shot.c.y); Sfx.boom(); say("격추!", true); } else { spray(fx, shot.c.x, shot.c.y); Sfx.wrong(); say("미끼였어요", false); } shot = null; closeWave(); } }
      fx.draw(g, dt);
      if (cs.length) { g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(0, 0, w, 5); g.fillStyle = "#FF6A52"; g.fillRect(0, 0, w * Math.max(0, left) / (2.9 - wave * .11), 5); }
      if (msg) { msg.a -= dt * 1.7; if (msg.a <= 0) msg = null; else { g.fillStyle = `rgba(255,255,255,${msg.a})`; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText(msg.text, w / 2, h * .82); } }
      s.hud.textContent = `격추 ${hits} · 표적 ${Math.min(wave, WAVES)}/${WAVES}`;
      requestAnimationFrame(tick); })(last);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 암호 등대: repeat the lamp signal, one lamp longer each round. Score = correct lamps in a row, each counted once; two lives. */
function lighthouse({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "등대 불빛 순서를 외워서 똑같이 눌러요. 라운드마다 길어져요. 두 번 틀리면 끝!"), MAX = 24;
    s.el.classList.add("g-mem", `era-${map}`); s.stage.style.setProperty("--pic", `url(/maps/sea${map + 1}.webp)`);
    s.stage.innerHTML = `<div class="sig"><p class="sig-say" aria-live="polite"></p><div class="lamps">${["red", "amber", "green", "blue"].map((c, i) => `<button type="button" class="lamp l-${c}" data-i="${i}" aria-label="${["빨강", "노랑", "초록", "파랑"][i]} 등"></button>`).join("")}</div></div>`;
    const say = s.stage.querySelector(".sig-say"), lamps = [...s.stage.querySelectorAll(".lamp")];
    const seq = [], pick = () => seq.push(Math.floor(Math.random() * 4));
    let pos = 0, best = 0, score = 0, lives = 2, lock = true, over = false; for (let i = 0; i < 3; i++) pick();
    const end = v => { if (over) return; over = true; s.el.remove(); done(v); };
    const hud = () => s.hud.textContent = `점수 ${score} · 기회 ${lives}`; s.quit.onclick = () => end(null);
    const flash = async (i, ms) => { lamps[i].classList.add("lit"); Sfx.lamp(i); await wait(ms); lamps[i].classList.remove("lit"); };
    const show = async () => { lock = true; pos = 0; say.textContent = `신호 ${seq.length}개를 잘 보세요`; await wait(650); const ms = Math.max(240, 480 - seq.length * 25); for (const i of seq) { if (over) return; await flash(i, ms); await wait(130); } if (over) return; say.textContent = "이제 똑같이 눌러요"; lock = false; };
    s.stage.addEventListener("click", async e => { const b = e.target.closest(".lamp"); if (!b || lock || over) return; const i = Number(b.dataset.i); flash(i, 170);
      if (i !== seq[pos]) { lock = true; lives--; hud(); Sfx.wrong(); say.textContent = lives ? "틀렸어요! 같은 신호를 다시 보여 줘요" : "신호를 놓쳤어요"; await wait(900); if (!lives) return end(score); return show(); }
      pos++; if (pos > best) { best = pos; score++; hud(); }
      if (score >= MAX) { lock = true; await wait(350); return end(score); }
      if (pos === seq.length) { lock = true; Sfx.match(); say.textContent = "수신 완료!"; best = 0; pick(); await wait(650); show(); } });
    hud(); show();
  });
}
/* 통신 기지: read the code table and key in the digit for each incoming symbol. The table changes every 6 right answers. Score = right answers. */
function codebreak({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "암호표를 보고 들어온 기호의 숫자를 눌러요. 틀리면 3초가 줄어요."), ids = ["star", "anchor", "compass", "moon", "flame", "shell"], MAX = 24, TOTAL = 40;
    s.el.classList.add("g-mem", `era-${map}`); s.stage.style.setProperty("--pic", `url(/maps/sea${map + 1}.webp)`);
    const icon = (id, ink = "#BDF5DC") => `<svg viewBox="0 0 100 100" aria-hidden="true">${V.embSVG(id, 50, 50, 82, ink, "#0B2233")}</svg>`;
    s.stage.innerHTML = `<div class="cipher"><div class="code-table"></div><div class="code-in"><span class="code-sym"></span><i class="code-time"><i></i></i><p class="sig-say" aria-live="polite"></p></div><div class="code-keys">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" data-n="${n}" class="num">${n}</button>`).join("")}</div></div>`;
    const table = s.stage.querySelector(".code-table"), sym = s.stage.querySelector(".code-sym"), bar = s.stage.querySelector(".code-time i"), say = s.stage.querySelector(".sig-say");
    let map2 = {}, cur = null, score = 0, left = TOTAL, over = false, lastT = performance.now();
    const shuffle = () => { const digits = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - .5); ids.forEach((id, i) => map2[id] = digits[i]); table.innerHTML = ids.map(id => `<div>${icon(id)}<b class="num">${map2[id]}</b></div>`).join(""); table.classList.remove("new"); table.offsetWidth; table.classList.add("new"); };
    const next = () => { let id; do { id = ids[Math.floor(Math.random() * ids.length)]; } while (id === cur); cur = id; sym.innerHTML = icon(id, "#FFFFFF"); };
    const end = v => { if (over) return; over = true; clearInterval(tm); s.el.remove(); done(v); };
    const hud = () => s.hud.textContent = `해독 ${score} · ${Math.ceil(left)}초`;
    const tm = setInterval(() => { const n = performance.now(); left -= (n - lastT) / 1000; lastT = n; bar.style.width = Math.max(0, left / TOTAL * 100) + "%"; hud(); if (left <= 0) end(score); }, 100);
    s.quit.onclick = () => end(null);
    s.stage.addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b || over) return;
      if (Number(b.dataset.n) === map2[cur]) { score++; Sfx.match(); say.textContent = ""; if (score >= MAX) return end(score); if (score % 6 === 0) { shuffle(); Sfx.ping(); say.textContent = "암호표가 바뀌었어요!"; } next(); }
      else { left -= 3; Sfx.wrong(); say.textContent = "틀렸어요! 3초 감소"; } hud(); });
    shuffle(); next(); hud();
  });
}
// every sea plays its own game on each island; the score scale of each island stays the same, so the server's stars and rewards still fit
/* ---------- how each game works: a small drawing, three steps, and the line repeated over the countdown ---------- */
const WATER = `<rect width="240" height="110" rx="10" fill="#2F7FB0"/><path d="M0 34q20-6 40 0t40 0 40 0 40 0 40 0 40 0M0 74q20-6 40 0t40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>`;
const hull = (x, y, c = "#7A3B2E") => `<path d="M${x - 20} ${y}h40l-7 11h-26z" fill="${c}"/><path d="M${x} ${y}v-20l13 16z" fill="#F5EFE0"/>`;
const mine = (x, y, o = 1) => `<g opacity="${o}"><circle cx="${x}" cy="${y}" r="8" fill="#23262B"/><path d="M${x} ${y - 12}v24M${x - 12} ${y}h24" stroke="#23262B" stroke-width="2"/></g>`;
const rock = (x, y) => `<path d="M${x - 16} ${y + 9}l7-17 8 5 7-10 10 22z" fill="#5C5A58"/>`;
const label = (x, y, t, c = "#fff") => `<text x="${x}" y="${y}" fill="${c}" font-size="11" font-weight="700" text-anchor="middle">${t}</text>`;
const dash = 'fill="none" stroke="#FFE27A" stroke-width="2.5" stroke-dasharray="5 5"';
const bracket = (x, y, s, c = "#FF5A4F") => `<path d="M${x - s} ${y - s + 6}v-6h6M${x + s - 6} ${y - s}h6v6M${x + s} ${y + s - 6}v6h-6M${x - s + 6} ${y + s}h-6v-6" fill="none" stroke="${c}" stroke-width="2.5"/>`;
const HOW = {
  cannon: [
    { short: "바람에 포탄이 휘어요. 10발!", steps: ["바람 화살표를 봐요. 포탄은 바람 쪽으로 휘어요.", "점선이 닿는 곳에 표적이 올 때 눌러요.", "10발 중 많이 맞힐수록 별이 늘어요."], art: `${WATER}${hull(182, 44)}<path d="M36 100Q96 10 178 46" ${dash}/><path d="M92 16h44m-9-6 9 6-9 6" fill="none" stroke="#fff" stroke-width="3"/>${label(114, 34, "바람")}<circle cx="36" cy="100" r="8" fill="#23262B"/>` },
    { short: "어뢰는 느려요. 앞을 보고 쏴요. 10발!", steps: ["어뢰는 천천히 나아가요.", "배가 지금 있는 곳 말고, 갈 자리를 보고 눌러요.", "10발 중 많이 맞힐수록 별이 늘어요."], art: `${WATER}${hull(66, 34, "#5B6470")}<path d="M90 42h70" ${dash}/><g opacity=".55">${hull(180, 34, "#5B6470")}</g>${label(180, 66, "갈 자리", "#FFE27A")}<path d="M120 104 174 56" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 6"/><circle cx="120" cy="104" r="5" fill="#FFE27A"/>` },
    { short: "진짜 적함을 꾹! 깜빡이면 미끼예요. 10번!", steps: ["진짜 적함을 손가락으로 꾹 누르고 있어요.", "조준이 다 차면 미사일이 날아가요.", "깜빡이는 표적은 미끼예요. 누르면 손해예요."], art: `${WATER}${hull(70, 56, "#5B6470")}${bracket(70, 52, 28)}${label(70, 96, "꾹 눌러요")}<g opacity=".4">${hull(176, 40, "#8B97A5")}</g>${label(176, 76, "미끼")}` }
  ],
  reef: [
    { short: "해류가 배를 밀어요. 손가락으로 버텨요!", steps: ["배를 손가락으로 좌우로 움직여요.", "해류가 배를 옆으로 밀어요. 반대로 버텨요.", "암초에 부딪히지 않고 오래 갈수록 점수가 올라요."], art: `${WATER}${rock(52, 28)}${rock(186, 44)}${rock(112, 20)}${hull(120, 78)}<path d="M44 86h34m-9-6 9 6-9 6M44 66h24m-8-6 8 6-8 6" fill="none" stroke="#BFE8FF" stroke-width="3"/>${label(58, 104, "해류", "#BFE8FF")}` },
    { short: "안개 속 빙산은 늦게 보여요. 침착하게!", steps: ["배를 손가락으로 좌우로 움직여요.", "안개 때문에 빙산이 가까이 와야 보여요.", "부딪히지 않고 오래 갈수록 점수가 올라요."], art: `<defs><linearGradient id="hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8EEF2"/><stop offset=".65" stop-color="#E8EEF2" stop-opacity="0"/></linearGradient></defs>${WATER}<path d="M60 64l13-24 12 14 8-6 12 16z" fill="#DDF3FA"/><path d="M160 26l10-16 12 16z" fill="#DDF3FA" opacity=".35"/><rect width="240" height="110" rx="10" fill="url(#hf)"/>${hull(130, 88)}` },
    { short: "기뢰는 파동이 지나갈 때만 보여요!", steps: ["배를 손가락으로 좌우로 움직여요.", "기뢰는 소나 파동이 지나갈 때만 보여요. 위치를 기억해요.", "움직이는 기뢰도 있어요. 조심해요."], art: `${WATER}<g fill="none" stroke="#9DF2C7" stroke-width="2"><path d="M60 92a60 60 0 0 1 120 0" opacity=".9"/><path d="M90 92a30 30 0 0 1 60 0" opacity=".5"/><path d="M28 92a92 92 0 0 1 184 0" opacity=".35"/></g>${mine(66, 46)}${mine(176, 58)}${mine(122, 20, .3)}${hull(120, 88, "#5B6470")}` }
  ],
  memory: [
    { short: "같은 그림의 짝을 찾아요!", steps: ["카드를 두 장씩 뒤집어요.", "같은 그림이면 짝이 맞아 열린 채로 남아요.", "적게 뒤집을수록 점수가 높아요."], art: `<rect width="240" height="110" rx="10" fill="#3C3430"/>${[0, 1, 2, 3].flatMap(c => [0, 1].map(r => { const x = 42 + c * 42, y = 12 + r * 46, up = (c === 0 && r === 0) || (c === 2 && r === 1); return `<rect x="${x}" y="${y}" width="34" height="40" rx="6" fill="${up ? "#FFF6E0" : "#8A5A3B"}"/>${up ? `<text x="${x + 17}" y="${y + 27}" font-size="20" fill="#D84B6B" text-anchor="middle">♥</text>` : ""}`; })).join("")}` },
    { short: "불빛 순서를 외워서 똑같이 눌러요!", steps: ["등대 불빛이 켜지는 순서를 잘 봐요.", "똑같은 순서로 눌러요. 라운드마다 길어져요.", "두 번 틀리면 끝나요."], art: `<rect width="240" height="110" rx="10" fill="#1E2C44"/>${[0, 1, 2, 3].map(i => { const x = 45 + i * 50, n = [2, 0, 3, 1][i]; return `<circle cx="${x}" cy="48" r="19" fill="${n === 1 ? "#FFE27A" : "#3B4E6D"}"/>${n ? label(x, 86, `${n}번째`, "#FFE27A") : ""}`; }).join("")}` },
    { short: "암호표를 보고 숫자를 눌러요. 틀리면 3초 줄어요!", steps: ["위에 나온 기호를 암호표에서 찾아요.", "그 기호의 숫자를 빠르게 눌러요.", "틀리면 시간이 3초 줄어요. 40초 동안 많이 풀어요."], art: `<rect width="240" height="110" rx="10" fill="#14251F"/>${["★", "☾", "⚓", "♨"].map((t, i) => `<rect x="${22 + i * 50}" y="10" width="44" height="40" rx="6" fill="#23403A"/><text x="${44 + i * 50}" y="27" font-size="14" fill="#fff" text-anchor="middle">${t}</text>${label(44 + i * 50, 44, i + 1, "#9DF2C7")}`).join("")}<text x="82" y="92" font-size="28" fill="#fff" text-anchor="middle">☾</text><path d="M104 84h24m-8-6 8 6-8 6" fill="none" stroke="#9DF2C7" stroke-width="3"/><rect x="138" y="62" width="40" height="40" rx="8" fill="#9DF2C7"/><text x="158" y="90" font-size="24" font-weight="700" fill="#14251F" text-anchor="middle">2</text>` }
  ]
};
// the explanation card; resolves true to play. `ask` is false when opened from the 게임 방법 button, where there is nothing to start
const intro = (kind, map, title, stars, ask) => new Promise(done => { const h = HOW[kind][map || 0], m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<div class="panel how"><h2>${title}</h2><svg viewBox="0 0 240 110" role="img" aria-label="게임 그림 설명">${h.art}</svg><ol>${h.steps.map(s => `<li>${s}</li>`).join("")}</ol><p class="small muted num">별 1개 ${stars[0]}점 · 별 2개 ${stars[1]}점 · 별 3개 ${stars[2]}점</p><div class="row how-go">${ask ? `<button type="button" class="btn primary lg" data-go>시작</button><button type="button" class="btn" data-no>취소</button>` : `<button type="button" class="btn primary lg" data-no>알겠어요</button>`}</div></div>`;
  document.body.appendChild(m); const go = m.querySelector("[data-go]"), no = m.querySelector("[data-no]"), end = v => { m.remove(); done(v); }; if (go) go.onclick = () => end(true); no.onclick = () => end(false); (go || no).focus(); });
// 3-2-1 with the game's one-line reminder, so a game never starts before the child is looking
const countdown = (title, line) => new Promise(done => { const m = document.createElement("div"); m.className = "game-count"; m.setAttribute("role", "status"); m.innerHTML = `<b>${title}</b><span class="count-n num"></span><p>${line}</p>`; document.body.appendChild(m); const n = m.querySelector(".count-n"); let i = 3;
  const step = () => { if (!i) { m.remove(); done(); return; } n.textContent = i; n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; window.Sfx?.tick?.(); i--; setTimeout(step, 750); }; step(); });
window.Games = { intro, run: async (kind, opts) => { const map = opts.map || 0; await countdown(opts.title, HOW[kind][map].short); return ({ cannon: [cannon, torpedo, missile], reef: [reef, reef, reef], memory: [memory, lighthouse, codebreak] })[kind][map](opts); } };
})();
