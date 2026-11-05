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

/* 포격 섬: tap when the moving target crosses your aim. 10 shots, and it speeds up. */
function cannon({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "표적이 가운데 올 때 화면을 눌러 쏴요. 10발!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    let shots = 10, hits = 0, t = 0, last = performance.now(), phase = 0, ball = null, flash = null, over = false, kick = 0, lastX = 0;
    const fire = e => { e.preventDefault(); if (ball || over || shots <= 0) return; shots--; ball = { p: 0 }; kick = 1; fx.add(cv.w / 2, cv.h - 112, 9, () => ({ vx: (Math.random() - .5) * 50, vy: -70 - Math.random() * 120, life: .3 + Math.random() * .2, c: "#FFD27A", a: 1, r0: 7, r1: 1 })); };
    s.stage.addEventListener("pointerdown", fire);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, speed = (1.5 + (10 - shots) * .22 + hits * .08) * PACE[map]; phase += dt * speed;
      const tx = w / 2 + Math.sin(phase) * (w / 2 - 44), ty = h * .24;
      sea(g, w, h, t * .3, art); const bobY = ty + Math.sin(t * 3) * 3, big = art?.target;
      if (big) sprite(g, big, tx, bobY, Math.min(190, w * .46), tx < lastX); else targetShip(g, tx, bobY, 1.5, map); lastX = tx;
      g.strokeStyle = "rgba(255,255,255,.4)"; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(w / 2, ty + 24); g.lineTo(w / 2, h - 120); g.stroke(); g.setLineDash([]);
      kick = Math.max(0, kick - dt * 5); gunBarrel(g, w, h, kick);
      if (ball) { ball.p += dt / .42; const y = h - 112 + (ty - h + 112) * Math.min(1, ball.p), r = 9 - 5 * ball.p; g.fillStyle = "#1C1E22"; g.beginPath(); g.arc(w / 2, y, r, 0, 7); g.fill(); g.fillStyle = "rgba(255,235,180,.7)"; g.beginPath(); g.arc(w / 2 - r * .3, y - r * .3, r * .3, 0, 7); g.fill();
        if (ball.p >= 1) { const hit = Math.abs(tx - w / 2) < 34; if (hit) { hits++; blast(fx, w / 2, ty); } else spray(fx, w / 2, ty + 6); flash = { hit, a: 1 }; ball = null; if (!shots) setTimeout(() => end(hits), 700); } }
      fx.draw(g, dt);
      if (flash) { flash.a -= dt * 2.2; if (flash.a <= 0) flash = null; else { g.fillStyle = `rgba(255,255,255,${flash.a})`; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText(flash.hit ? "명중!" : "빗나갔어요", w / 2, h * .5); } }
      s.hud.textContent = `명중 ${hits} · 남은 ${shots}발`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 암초 해협: slide left and right past the rocks; it gets faster until you hit one. */
function reef({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, `손가락을 좌우로 움직여 ${["암초를", "빙산을", "기뢰를"][map]} 피해요.`), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    let x = .5, t = 0, last = performance.now(), rocks = [], spawn = 0, passed = 0, over = false, crashed = 0;
    const move = e => { const r = s.stage.getBoundingClientRect(); x = Math.min(.95, Math.max(.05, (e.clientX - r.left) / r.width)); };
    s.stage.addEventListener("pointerdown", move); s.stage.addEventListener("pointermove", move);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, speed = (170 + t * 9) * PACE[map];
      sea(g, w, h, t * 6, art);
      if (!crashed) { spawn -= dt; if (spawn <= 0) { spawn = Math.max(.34, .95 - t * .012); rocks.push({ x: Math.random() * (w - 50) + 25, y: -30, r: 17 + Math.random() * 13 }); } }
      const px = x * w, py = h - 70;
      for (const k of rocks) { if (!crashed) k.y += speed * dt; hazard(g, k, map, t);
        if (!crashed && Math.hypot(k.x - px, k.y - py) < k.r + 15) { crashed = t; blast(fx, px, py - 6); setTimeout(() => end(passed), 1000); } }
      const before = rocks.length; rocks = rocks.filter(k => k.y < h + 40); passed += before - rocks.length;
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
    s.stage.addEventListener("click", e => { const b = e.target.closest(".mem-c"); if (!b || lock || b.classList.contains("up")) return; const c = deck[b.dataset.i]; b.classList.add("up");
      if (!first) { first = { b, c }; return; }
      turns++; show();
      if (first.c.id === c.id) { pairs++; first = null; if (pairs === ids.length) { const score = Math.max(0, 30 - turns); setTimeout(() => end(score), 500); } return; }
      lock = true; const a = first.b; first = null; setTimeout(() => { a.classList.remove("up"); b.classList.remove("up"); lock = false; }, 750); });
  });
}
window.Games = { run: (kind, opts) => ({ cannon, reef, memory })[kind](opts) };
})();
