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

const windArrow = (g, x, y, v, label) => { const l = 16 + Math.abs(v) * 34, d = Math.sign(v) || 1; g.save(); g.translate(x, y); g.fillStyle = "rgba(6,22,40,.62)"; g.beginPath(); g.roundRect(-62, -19, 124, 38, 12); g.fill(); g.fillStyle = "#fff"; g.font = "700 12px sans-serif"; g.textAlign = "left"; g.fillText(label, -54, 4); g.translate(18, 0); g.strokeStyle = "#FFE27A"; g.fillStyle = "#FFE27A"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(-d * l / 2, 0); g.lineTo(d * l / 2 - d * 6, 0); g.stroke(); g.beginPath(); g.moveTo(d * l / 2 + d * 3, 0); g.lineTo(d * l / 2 - d * 8, -7); g.lineTo(d * l / 2 - d * 8, 7); g.fill(); g.restore(); };
// a line of text on a dark or bright rounded plate, drawn on the canvas
// text with its fractions stacked, as in a textbook (children read 1/5 as a fraction only when it looks like one). Centred on x, y; fills with the current fillStyle, and outlines first when asked.
const uiFont = () => getComputedStyle(document.body).fontFamily;
const richParts = t => String(t).split(/(\d+\/\d+)/).filter(Boolean).map(p => { const m = p.match(/^(\d+)\/(\d+)$/); return m ? { n: m[1], d: m[2] } : { s: p }; });
const richWidth = (g, parts, size, face, weight) => { let tw = 0; for (const p of parts) { g.font = `${weight} ${p.s ? size : size * .8}px ${face}`; p.w = p.s ? g.measureText(p.s).width : Math.max(g.measureText(p.n).width, g.measureText(p.d).width) + size * .34; tw += p.w; } return tw; };
const rich = (g, x, y, text, size, face, weight = 700, outline = false) => { const parts = richParts(text); let px = x - richWidth(g, parts, size, face, weight) / 2; g.textAlign = "center"; g.textBaseline = "middle";
  const put = (t, cx, cy) => { if (outline) g.strokeText(t, cx, cy); g.fillText(t, cx, cy); };
  for (const p of parts) { const cx = px + p.w / 2; if (p.s) { g.font = `${weight} ${size}px ${face}`; put(p.s, cx, y + 1); } else { g.font = `${weight} ${size * .8}px ${face}`; put(p.n, cx, y - size * .5); put(p.d, cx, y + size * .54); const bar = Math.max(2, size * .09); if (outline) g.strokeRect(cx - p.w / 2 + 1, y - bar / 2 + 1, p.w - 2, bar); g.fillRect(cx - p.w / 2 + 1, y - bar / 2 + 1, p.w - 2, bar); } px += p.w; } g.textBaseline = "alphabetic"; };
const plate = (g, x, y, text, size, bg, ink) => { const face = uiFont(), tw = richWidth(g, richParts(text), size, face, 700) + size * .9, th = size * (/\d\/\d/.test(text) ? 2.15 : 1.55); g.fillStyle = bg; g.beginPath(); if (g.roundRect) g.roundRect(x - tw / 2, y - th / 2, tw, th, 8); else g.rect(x - tw / 2, y - th / 2, tw, th); g.fill(); g.fillStyle = ink; rich(g, x, y, text, size, face); };
/* 범선의 바다 포격: the ship hides in the fog on a 6-by-6 sea. Two sums give its column and row; from shot 7 a wind pushes the ball, so aim the other way. 10 shots; score = hits. */
function cannon({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "식을 풀어 안개 속 적함이 있는 칸을 쏴요. 10발!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    const SHOTS = 10, N = 6, TOP = 128, timeOf = n => 24 - n * .6; // time to work out both sums: 23.4 seconds, down to 18
    let shot = 0, hits = 0, t = 0, last = performance.now(), q = null, left = 0, ball = null, reveal = null, pause = .3, msg = null, over = false, kick = 0;
    const layout = (w, h) => { const c = Math.floor(Math.min((w - 58) / N, (h - TOP - 118) / N)); return { c, ox: (w - c * N) / 2 + 12, oy: TOP }; };
    const spot = ({ c, ox, oy }, i, j) => [ox + (i - .5) * c, oy + (N - j + .5) * c];
    const say = (text, good) => { msg = { text, good, a: good ? 1 : 2.6 }; };
    const finish = (ok, wait) => { reveal = { ok, left: wait }; ball = null; };
    s.stage.addEventListener("pointerdown", e => { e.preventDefault(); if (!q || ball || reveal || over) return; const r = s.stage.getBoundingClientRect(), l = layout(cv.w, cv.h), i = Math.floor((e.clientX - r.left - l.ox) / l.c) + 1, j = N - Math.floor((e.clientY - r.top - l.oy) / l.c); if (i < 1 || i > N || j < 1 || j > N) return;
      ball = { p: 0, i: i + q.wind, j, aim: [i, j] }; kick = 1; Sfx.shot("cannon"); fx.add(cv.w / 2, cv.h - 112, 9, () => ({ vx: (Math.random() - .5) * 50, vy: -70 - Math.random() * 120, life: .3 + Math.random() * .2, c: "#FFD27A", a: 1, r0: 7, r1: 1 })); });
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, l = layout(w, h), { c, ox, oy } = l;
      sea(g, w, h, t * .3, art); g.fillStyle = "rgba(6,28,46,.34)"; g.fillRect(0, 0, w, h);
      if (!q && !reveal && shot < SHOTS) { pause -= dt; if (pause <= 0) { shot++; q = MathQ.grid(shot); left = timeOf(shot); } }
      if (q && !ball && !reveal) { left -= dt; if (left <= 0) { say(`시간 초과 · 가로 ${q.x}, 세로 ${q.y}`, false); Sfx.splash(); finish(false, 2.2); } }
      // the sea chart
      for (let i = 1; i <= N; i++) for (let j = 1; j <= N; j++) { const [x, y] = spot(l, i, j); g.fillStyle = (i + j) % 2 ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)"; g.fillRect(x - c / 2, y - c / 2, c, c); }
      g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= N; i++) { g.moveTo(ox + i * c, oy); g.lineTo(ox + i * c, oy + N * c); g.moveTo(ox, oy + i * c); g.lineTo(ox + N * c, oy + i * c); } g.stroke();
      g.fillStyle = "#fff"; g.font = "700 15px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 1; i <= N; i++) { g.fillText(i, ox + (i - .5) * c, oy + N * c + 12); g.fillText(i, ox - 12, oy + (N - i + .5) * c); }
      g.font = "700 12px sans-serif"; g.fillStyle = "#FFE27A"; g.fillText("가로 →", ox + N * c - 20, oy + N * c + 28); g.save(); g.translate(ox - 28, oy + 24); g.rotate(-Math.PI / 2); g.fillText("세로 →", 0, 0); g.restore(); g.textBaseline = "alphabetic";
      // the orders
      if (q) { const size = Math.min(20, w / 19); plate(g, w / 2, 27, `가로 칸: ${q.xText}`, size, "rgba(255,226,122,.97)", "#1B2A33"); plate(g, w / 2, 71, `세로 칸: ${q.yText}`, size, "rgba(255,226,122,.97)", "#1B2A33");
        if (q.wind) plate(g, w / 2, 109, `바람: 포탄이 ${q.wind > 0 ? "오른쪽" : "왼쪽"}으로 ${Math.abs(q.wind)}칸 밀려요`, Math.min(14, w / 25), "rgba(6,22,40,.82)", "#BFE8FF"); }
      if (q && !reveal) { g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(0, 0, w, 5); g.fillStyle = "#FF6A52"; g.fillRect(0, 0, w * Math.max(0, left) / timeOf(shot), 5); }
      kick = Math.max(0, kick - dt * 5); if (h - 112 > oy + N * c + 30) gunBarrel(g, w, h, kick);
      if (ball) { ball.p += dt / .55; const p = Math.min(1, ball.p), [ax, ay] = spot(l, ball.aim[0], ball.aim[1]), [lx, ly] = spot(l, ball.i, ball.j), bx = w / 2 + (ax - w / 2) * p + (lx - ax) * p * p, y = h - 112 + (ly - h + 112) * p - Math.sin(p * Math.PI) * 26, r = 9 - 5 * p; g.fillStyle = "#1C1E22"; g.beginPath(); g.arc(bx, y, r, 0, 7); g.fill(); g.fillStyle = "rgba(255,235,180,.7)"; g.beginPath(); g.arc(bx - r * .3, y - r * .3, r * .3, 0, 7); g.fill();
        if (ball.p >= 1) { const hit = ball.i === q.x && ball.j === q.y; if (hit) { hits++; blast(fx, lx, ly); Sfx.boom(.8); say("명중!", true); finish(true, 1); } else { spray(fx, lx, ly); Sfx.splash(); say(`빗나갔어요 · 가로 ${q.x}, 세로 ${q.y}`, false); finish(false, 2.2); } } }
      if (reveal && q) { const [x, y] = spot(l, q.x, q.y), big = art?.target; if (big) sprite(g, big, x, y + c * .2, c * 1.25, false); else targetShip(g, x, y + c * .15, c / 38, map); g.strokeStyle = reveal.ok ? "#FFE27A" : "#FF6A52"; g.lineWidth = 3; g.strokeRect(x - c / 2 + 1, y - c / 2 + 1, c - 2, c - 2);
        reveal.left -= dt; if (reveal.left <= 0) { reveal = null; q = null; pause = .25; if (shot >= SHOTS) { end(hits); return; } } }
      fx.draw(g, dt);
      if (msg) { msg.a -= dt * 1.2; if (msg.a <= 0) msg = null; else { g.fillStyle = `rgba(255,255,255,${Math.min(1, msg.a)})`; g.strokeStyle = `rgba(5,24,38,${Math.min(.85, msg.a)})`; g.lineWidth = 5; rich(g, w / 2, oy + N * c / 2, msg.text, Math.min(30, w / 14), "Jua, sans-serif", 400, true); } }
      s.hud.textContent = `명중 ${hits} · ${Math.max(shot, 1)}/${SHOTS}발`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 암초 해협: a line of rocks with three channels comes down; the question is on top and each channel carries an answer. Steer into the right one.
   Each sea keeps its own trouble: a current that pushes the ship, fog that hides the answers until late, mines lit only by the sonar with the channels coming faster.
   Score = 3 for each channel, the same scale as before; three wrong channels and it's over; 20 channels at most. */
function reef({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, ["문제를 풀어 정답 통로로 배를 몰아요. 해류가 배를 옆으로 밀어요.", "문제를 먼저 풀어 둬요. 안개 때문에 통로의 답이 늦게 보여요.", "문제를 풀어 정답 통로로 배를 몰아요. 기뢰는 소나가 지날 때만 보여요."][map]), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    const GATES = 20, POINT = 3, LANES = 3, thing = ["암초", "빙산", "기뢰"][map];
    let x = .5, t = 0, last = performance.now(), gate = null, gap = .5, count = 0, passed = 0, lives = 3, over = false, ending = false, ping = 0, msg = null;
    const move = e => { const r = s.stage.getBoundingClientRect(); x = Math.min(.95, Math.max(.05, (e.clientX - r.left) / r.width)); };
    s.stage.addEventListener("pointerdown", move); s.stage.addEventListener("pointermove", move);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    const say = (text, good) => { msg = { text, good, a: good ? 1 : 2.6 }; };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; t += dt; const w = cv.w, h = cv.h, py = h - 70, travel = Math.max(6, 11 - count * .25) / [1, 1, 1.15][map], speed = (h + 20) / travel; // seconds from the top of the screen to the ship
      sea(g, w, h, t * 3, art);
      if (!gate && !ending) { gap -= dt; if (gap <= 0) { count++; gate = { q: MathQ.order(Math.min(10, count), LANES, "통로"), y: -30, rocks: [0, 1, 2, 3].map(i => ({ i, x: 0, y: 0, r: i % 3 ? 19 : 15 })) }; } }
      const push = map === 0 && !ending ? (Math.sin(t * .62 + 1) * .065 + Math.sin(t * .27) * .035) * Math.min(1.5, 1 + count * .03) : 0, px = Math.min(.96, Math.max(.04, x + push)) * w, lane = Math.min(LANES - 1, Math.floor(px / w * LANES));
      if (map === 0) { windArrow(g, w - 72, h - 26, Math.max(-1, Math.min(1, push * 8)), "해류"); if (Math.random() < dt * 22) fx.add(Math.random() * w, Math.random() * h, 1, () => ({ vx: push * 1600, vy: speed * .5, life: .5, c: "#DDF2FF", a: .4, r0: 1.5, r1: .5 })); }
      g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(lane * w / LANES, 0, w / LANES, h); // the channel the ship is lined up with
      if (map === 2) { g.fillStyle = "rgba(3,16,28,.62)"; g.fillRect(0, 0, w, h); ping += dt; if (ping >= 1.5) { ping = 0; Sfx.ping(); }
        const R = Math.min(1, ping / .9) * Math.hypot(w, h), fade = Math.max(0, 1 - ping / .9); g.strokeStyle = `rgba(110,240,190,${fade * .85})`; g.lineWidth = 3; g.beginPath(); g.arc(px, py, R, 0, 7); g.stroke(); g.lineWidth = 1; g.strokeStyle = "rgba(110,240,190,.1)"; for (let r = 90; r < h * 1.2; r += 90) { g.beginPath(); g.arc(px, py, r, 0, 7); g.stroke(); }
        if (gate) for (const k of gate.rocks) if (Math.hypot(k.x - px, k.y - py) <= R && ping < .9) k.seen = t; }
      if (gate) { gate.y += speed * dt;
        for (const k of gate.rocks) { k.x = k.i * w / LANES; k.y = gate.y; if (map === 2) g.globalAlpha = Math.max(.12, 1 - (t - (k.seen ?? -9)) / 1.05); hazard(g, k, map, t); g.globalAlpha = 1; } }
      if (map === 1) { const clear = h * .34, f = g.createLinearGradient(0, 0, 0, clear); f.addColorStop(0, "rgba(222,232,236,1)"); f.addColorStop(.62, "rgba(222,232,236,.97)"); f.addColorStop(1, "rgba(222,232,236,0)"); g.fillStyle = f; g.fillRect(0, 0, w, clear); }
      if (gate) { if (map !== 1 || gate.y > h * .3) gate.q.opts.forEach((o, i) => plate(g, (i + .5) * w / LANES, gate.y, o, Math.min(19, w / 21), "rgba(5,24,38,.93)", "#FFF3B8"));
        plate(g, w / 2, 30, gate.q.ask, Math.min(20, w / 18), "rgba(255,226,122,.97)", "#1B2A33");
        if (gate.y >= py - 12) { const right = gate.q.opts[lane] === gate.q.real; if (right) { passed++; Sfx.match(); say(`통과! +${POINT}`, true); } else { lives--; blast(fx, px, py - 6); Sfx.boom(); say(`쿵! 정답은 ${gate.q.real}`, false); }
          gap = right ? .5 : 1.7; gate = null; if (!ending && (lives <= 0 || count >= GATES)) { ending = true; setTimeout(() => end(passed * POINT), 1600); } } }
      if (!ending && Math.random() < dt * 28) fx.add(px + (Math.random() - .5) * 16, py + 20, 1, () => ({ vx: (Math.random() - .5) * 26, vy: 70 + speed * .35, life: .6, c: "#F2FAFF", a: .65, r0: 3, r1: 8 }));
      fx.draw(g, dt);
      if (art?.me) sprite(g, art.me, px, py, 110); else boat(g, px, py, 1.4);
      if (msg) { msg.a -= dt * 1.2; if (msg.a <= 0) msg = null; else { g.fillStyle = `rgba(255,255,255,${Math.min(1, msg.a)})`; g.strokeStyle = `rgba(5,24,38,${Math.min(.85, msg.a)})`; g.lineWidth = 5; rich(g, w / 2, h * .5, msg.text, Math.min(30, w / 14), "Jua, sans-serif", 400, true); } }
      s.hud.textContent = `점수 ${passed * POINT} · 기회 ${lives} · ${Math.min(count, GATES)}/${GATES}`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 보물 동굴: find the pairs of cards worth the same (3/4 and 75%). Every deck is new. Fewer turns scores higher. */
function memory({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "값이 같은 카드끼리 짝을 찾아요. 적게 뒤집을수록 좋아요."), set = MathQ.pairs(), ids = set.map(p => p.key);
    s.el.classList.add("g-mem", `era-${map}`); s.stage.style.setProperty("--pic", `url(/maps/sea${map + 1}.webp)`);
    const deck = MathQ.shuffle(set.flatMap(p => [{ id: p.key, label: p.a }, { id: p.key, label: p.b }]));
    s.stage.innerHTML = `<div class="mem">${deck.map((c, i) => `<button type="button" class="mem-c" data-i="${i}" aria-label="카드 ${i + 1}"><span class="mem-b"></span><span class="mem-f"><span class="mem-q num${c.label.length > 6 ? " long" : ""}">${MathQ.html(c.label)}</span></span></button>`).join("")}</div>`;
    let first = null, lock = false, turns = 0, pairs = 0, left = 120, over = false;
    const end = v => { if (over) return; over = true; clearInterval(tm); s.el.remove(); done(v); };
    const show = () => s.hud.textContent = `뒤집기 ${turns} · ${left}초`;
    const tm = setInterval(() => { left--; show(); if (left <= 0) end(pairs); }, 1000); show();
    s.quit.onclick = () => end(null);
    s.stage.addEventListener("click", e => { const b = e.target.closest(".mem-c"); if (!b || lock || b.classList.contains("up")) return; const c = deck[b.dataset.i]; b.classList.add("up"); Sfx.flip();
      if (!first) { first = { b, c }; return; }
      turns++; show();
      if (first.c.id === c.id) { pairs++; first = null; Sfx.match(); if (pairs === ids.length) { const score = Math.max(0, 30 - turns); setTimeout(() => end(score), 500); } return; }
      lock = true; const a = first.b; first = null; setTimeout(() => { a.classList.remove("up"); b.classList.remove("up"); lock = false; }, 1300); }); // long enough to read both and remember them
  });
}
/* 증기의 바다 포격: a torpedo is slow, so aim where the ship will be, not where it is. 10 torpedoes; score = hits. */
/* 증기의 바다 포격: while the torpedo runs, the ship keeps sailing. Work out how far away the ship must be when the torpedo is fired and press that mark on the ruler.
   Everything then plays out at true scale, so a wrong answer shows by how much it missed. 10 shots; score = hits. */
function torpedo({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "적함이 몇 m 남았을 때 쏠지 계산해서 그 눈금을 눌러요. 10발!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    const SHOTS = 10, MARKS = 6, START = MARKS + .6, FLIGHT = 1.3, timeOf = n => 31 - n; // time to work it out: 30 seconds, down to 21
    let shot = 0, hits = 0, t = 0, last = performance.now(), q = null, left = 0, shipAt = START, run = null, pause = .3, rest = 0, gone = false, msg = null, over = false, kick = 0;
    const layout = (w, h) => { const x0 = Math.max(44, w * .12), step = (w - x0 - 34) / START, ty = Math.max(178, h * .36); return { x0, step, ty, bar: ty + 40, y0: h - 74 }; };
    const say = (a, b, good) => { msg = { a, b, good, life: good ? 1.2 : 3 }; };
    s.stage.addEventListener("pointerdown", e => { e.preventDefault(); if (!q || run || rest > 0 || over) return; const r = s.stage.getBoundingClientRect(), l = layout(cv.w, cv.h), y = e.clientY - r.top; if (y < l.ty - 30 || y > l.bar + 62) return; const k = Math.round((e.clientX - r.left - l.x0) / l.step); if (k < 1 || k > MARKS) return; run = { k, fired: false, p: 0 }; Sfx.lock(); });
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; t += dt; const w = cv.w, h = cv.h, l = layout(w, h), { x0, step, ty, bar, y0 } = l, X = k => x0 + k * step;
      sea(g, w, h, t * .3, art); g.fillStyle = "rgba(6,28,46,.3)"; g.fillRect(0, 0, w, h);
      if (!q && rest <= 0 && shot < SHOTS) { pause -= dt; if (pause <= 0) { shot++; q = MathQ.speed(shot); left = timeOf(shot); shipAt = START; gone = false; run = null; } }
      if (q && !run && rest <= 0) { left -= dt; if (left <= 0) { say("시간 초과", q.D + "m에서 쏴요 · " + q.why, false); Sfx.splash(); rest = 3.2; } }
      // the ship sails at its true speed on the ruler's scale, and covers the right distance in exactly the torpedo's flight
      if (run) shipAt -= dt * q.k / FLIGHT;
      if (run && !run.fired && shipAt <= run.k) { run.fired = true; kick = 1; Sfx.shot("torpedo"); }
      if (run && run.fired && run.p < 1) { run.p += dt / FLIGHT; const p = Math.min(1, run.p);
        if (p >= 1) { if (run.k === q.k) { hits++; gone = true; blast(fx, x0, ty); Sfx.boom(); say("명중!", q.why, true); rest = 1.6; } else { spray(fx, x0, ty + 6); Sfx.splash(); say(q.D + "m에서 쏴야 해요", q.why, false); rest = 3.2; } } }
      // the ship's track, the crossing point and the torpedo's lane
      g.strokeStyle = "rgba(255,255,255,.28)"; g.setLineDash([4, 10]); g.lineWidth = 2; g.beginPath(); g.moveTo(0, ty + 8); g.lineTo(w, ty + 8); g.moveTo(x0, ty + 8); g.lineTo(x0, y0); g.stroke(); g.setLineDash([]);
      g.strokeStyle = "#FFE27A"; g.lineWidth = 2; g.beginPath(); g.arc(x0, ty + 8, 11, 0, 7); g.stroke();
      // the ruler
      if (q) { g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, bar); g.lineTo(X(MARKS), bar); g.stroke();
        for (let k = 0; k <= MARKS; k++) { g.beginPath(); g.moveTo(X(k), bar - 6); g.lineTo(X(k), bar + 6); g.stroke(); }
        const showAnswer = rest > 0; for (let k = 1; k <= MARKS; k++) { const on = run && run.k === k, right = showAnswer && k === q.k; g.fillStyle = right ? "#9DF2C7" : on ? "#FFE27A" : "rgba(8,24,40,.88)"; g.beginPath(); g.roundRect(X(k) - step / 2 + 2, bar + 10, step - 4, 44, 8); g.fill(); g.fillStyle = right || on ? "#14251F" : "#fff"; g.font = "700 " + Math.min(16, step / 2.8) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(q.S * k, X(k), bar + 33); g.textBaseline = "alphabetic"; }
        g.fillStyle = "#fff"; g.font = "700 12px sans-serif"; g.textAlign = "center"; g.fillText("0m", x0, bar + 22); g.fillStyle = "#FFE27A"; g.fillText("만나는 곳", Math.max(32, x0), ty - 16);
        if (run && !run.fired) { g.strokeStyle = "#FFE27A"; g.lineWidth = 2; g.setLineDash([3, 5]); g.beginPath(); g.moveTo(X(run.k), bar); g.lineTo(X(run.k), ty + 8); g.stroke(); g.setLineDash([]); } }
      // the ship, then the torpedo
      if (q && !gone) { const x = x0 + shipAt * step, bob = ty + Math.sin(t * 2.6) * 2; if (art?.target) sprite(g, art.target, x, bob, Math.min(116, w * .3), true); else targetShip(g, x, bob, 1.2, map); }
      if (run && run.fired && run.p < 1) { const y = y0 + (ty + 8 - y0) * Math.min(1, run.p); fx.add(x0 + (Math.random() - .5) * 6, y + 14, 2, () => ({ vx: (Math.random() - .5) * 18, vy: 8, life: .9, c: "#E8F6FF", a: .7, r0: 2.5, r1: 7 })); g.save(); g.translate(x0, y); g.fillStyle = "#23272C"; g.beginPath(); g.ellipse(0, 0, 5, 16, 0, 0, 7); g.fill(); g.fillStyle = "#C9A24A"; g.fillRect(-5, -9, 10, 3); g.restore(); }
      fx.draw(g, dt);
      kick = Math.max(0, kick - dt * 5); g.save(); g.translate(x0, h - 18 + kick * 12); const m = g.createLinearGradient(-30, 0, 30, 0); m.addColorStop(0, "#14161A"); m.addColorStop(.45, "#59616B"); m.addColorStop(1, "#101215"); g.fillStyle = m; g.beginPath(); g.roundRect(-22, -48, 44, 70, 8); g.fill(); g.fillStyle = "#0A0B0D"; g.beginPath(); g.ellipse(0, -46, 15, 6, 0, 0, 7); g.fill(); g.fillStyle = "#7B5A36"; g.fillRect(-44, 2, 88, 30); g.restore();
      // the orders
      if (q) { const size = Math.min(18, w / 21), ink = "#1B2A33"; plate(g, w / 2, 27, q.shipText, size, "rgba(255,226,122,.97)", ink); plate(g, w / 2, 62, q.torpText, size, "rgba(255,226,122,.97)", ink); plate(g, w / 2, 98, "적함이 몇 m 남았을 때 쏠까요?", Math.min(15, w / 25), "rgba(6,22,40,.85)", "#BFE8FF"); }
      if (q && !run && rest <= 0) { g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(0, 0, w, 5); g.fillStyle = "#FF6A52"; g.fillRect(0, 0, w * Math.max(0, left) / timeOf(shot), 5); }
      if (rest > 0) { rest -= dt; if (rest <= 0) { const wasLast = shot >= SHOTS; q = null; run = null; pause = .25; if (wasLast) { end(hits); return; } } }
      if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; else { const my = bar + 92; g.fillStyle = "#fff"; g.strokeStyle = "rgba(5,24,38,.85)"; g.lineWidth = 5; rich(g, w / 2, my, msg.a, Math.min(26, w / 15), "Jua, sans-serif", 400, true); rich(g, w / 2, my + 30, msg.b, Math.min(17, w / 23), "Jua, sans-serif", 400, true); } }
      s.hud.textContent = "명중 " + hits + " · " + Math.max(shot, 1) + "/" + SHOTS + "발";
      requestAnimationFrame(tick); })(last);
  });
}
/* 현대의 바다 포격: the order names one target by a math condition; press and hold it until the lock closes. Nothing else tells it from the rest. 10 waves; score = kills. */
function missile({ map, title, art }) {
  return new Promise(done => {
    const s = shell(title, "명령에 맞는 표적을 계산해서 꾹 눌러요. 10번!"), cv = canvasIn(s.stage), { g } = cv, fx = bits();
    const WAVES = 10, HOLD = .42, timeOf = w => 15 - w * .5; // time to work it out: 14.5 seconds, down to 10
    let wave = 0, hits = 0, t = 0, last = performance.now(), cs = [], left = 0, lock = null, shot = null, pause = .5, msg = null, over = false, q = null;
    const spawn = (w, h) => { wave++; const n = 2 + Math.min(2, Math.floor(wave / 4)); q = MathQ.order(wave, n); cs = []; left = timeOf(wave);
      for (let i = 0; i < n; i++) { let x, y, tries = 0; do { x = 66 + Math.random() * (w - 132); y = h * .24 + Math.random() * h * .42; } while (cs.some(c => Math.abs(c.x - x) < 125 && Math.abs(c.y - y) < 96) && ++tries < 40); cs.push({ x, y, label: q.opts[i], real: q.opts[i] === q.real, vx: (Math.random() - .5) * 12 }); } };
    const say = (text, good) => { msg = { text, good, a: good ? 1 : 2.4 }; }; // a wrong answer stays up longer, so the right one can be read
    const closeWave = () => { cs = []; lock = null; pause = msg && !msg.good ? 1.5 : .55; if (wave >= WAVES) { over = "ending"; setTimeout(() => end(hits), 1000); } };    const at = e => { const r = s.stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
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
      if (cs.length && !shot) { left -= dt; if (left <= 0) { say(`시간 초과 · 정답 ${q.real}`, false); Sfx.splash(); closeWave(); } }
      for (const c of cs) { c.x = Math.max(62, Math.min(w - 62, c.x + c.vx * dt));
        if (art?.target) sprite(g, art.target, c.x, c.y + 4, 84, c.vx < 0); else targetShip(g, c.x, c.y + 2, .95, map);
        g.strokeStyle = "#FF6A52"; g.lineWidth = 2; const b = 40; for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(c.x + dx * b, c.y + dy * (b - 13)); g.lineTo(c.x + dx * b, c.y + dy * b); g.lineTo(c.x + dx * (b - 13), c.y + dy * b); g.stroke(); }
        plate(g, c.x, c.y + 28, c.label, 19, "rgba(5,24,38,.92)", "#FFF3B8"); }
      if (q && cs.length) plate(g, w / 2, 34, q.ask, Math.min(21, w / 17), "rgba(255,226,122,.96)", "#1B2A33");
      if (lock && !shot) { lock.p += dt / HOLD; g.strokeStyle = "#FFE27A"; g.lineWidth = 5; g.beginPath(); g.arc(lock.c.x, lock.c.y, 50, -1.57, -1.57 + Math.min(1, lock.p) * 6.283); g.stroke(); if (lock.p >= 1) { shot = { c: lock.c, p: 0 }; lock = null; Sfx.shot("missile"); } }
      if (shot) { shot.p += dt / .55; const p = Math.min(1, shot.p), mx = w / 2 + (shot.c.x - w / 2) * p, my = h - 20 + (shot.c.y - h + 20) * p * p; fx.add(mx, my + 8, 3, () => ({ vx: (Math.random() - .5) * 22, vy: 24, life: .55, c: "#F3F5F7", a: .7, r0: 3, r1: 10 })); g.fillStyle = "#EDEFF2"; g.beginPath(); g.ellipse(mx, my, 4, 12, Math.atan2(shot.c.x - w / 2, h) * .8, 0, 7); g.fill();
        if (shot.p >= 1) { if (shot.c.real) { hits++; blast(fx, shot.c.x, shot.c.y); Sfx.boom(); say("격추!", true); } else { spray(fx, shot.c.x, shot.c.y); Sfx.wrong(); say(`아니에요 · 정답 ${q.real}`, false); } shot = null; closeWave(); } }
      fx.draw(g, dt);
      if (cs.length) { g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(0, 0, w, 5); g.fillStyle = "#FF6A52"; g.fillRect(0, 0, w * Math.max(0, left) / timeOf(wave), 5); }
      if (msg) { msg.a -= dt * 1.7; if (msg.a <= 0) msg = null; else { g.fillStyle = `rgba(255,255,255,${Math.min(1, msg.a)})`; rich(g, w / 2, h * .82, msg.text, Math.min(34, w / 13), "Jua, sans-serif", 400); } }
      s.hud.textContent = `격추 ${hits} · 표적 ${Math.min(wave, WAVES)}/${WAVES}`;
      requestAnimationFrame(tick); })(last);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 암호 등대: the lighthouse sends five numbers of a series. Find the rule, then press the lamp with the next number, three times over. A wrong lamp costs a chance and shows the rule.
   Score = 1 for each right lamp, 8 rounds, up to 24, the same scale as before; three misses or three minutes end it. */
function lighthouse({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "수가 변하는 규칙을 찾아 다음 수가 적힌 등을 눌러요."), ROUNDS = 8, TOTAL = 180;
    s.el.classList.add("g-mem", "era-" + map); s.stage.style.setProperty("--pic", "url(/maps/sea" + (map + 1) + ".webp)");
    s.stage.innerHTML = '<div class="sig seq"><div class="seq-tape num" aria-live="polite"></div><i class="code-time"><i></i></i><p class="sig-say" aria-live="polite"></p><div class="lamps">' + ["red", "amber", "green", "blue"].map((c, i) => '<button type="button" class="lamp l-' + c + '" data-i="' + i + '"><b class="num"></b></button>').join("") + "</div></div>";
    const tape = s.stage.querySelector(".seq-tape"), bar = s.stage.querySelector(".code-time i"), say = s.stage.querySelector(".sig-say"), lamps = [...s.stage.querySelectorAll(".lamp")], words = lamps.map(b => b.querySelector("b"));
    let round = 0, cur = null, step = 0, score = 0, lives = 3, left = TOTAL, lock = true, over = false, lastT = performance.now();
    const hud = () => s.hud.textContent = "점수 " + score + " · 기회 " + lives + " · " + Math.ceil(left) + "초";
    const end = v => { if (over) return; over = true; clearInterval(tm); s.el.remove(); done(v); };
    const tm = setInterval(() => { const n = performance.now(); left -= (n - lastT) / 1000; lastT = n; bar.style.width = Math.max(0, left / TOTAL * 100) + "%"; hud(); if (left <= 0) end(score); }, 100);
    s.quit.onclick = () => end(null);
    const flash = async (i, ms) => { lamps[i].classList.add("lit"); Sfx.lamp(i); await wait(ms); lamps[i].classList.remove("lit"); };
    const chip = (text, cls = "") => { const e = document.createElement("span"); e.className = cls; e.innerHTML = MathQ.html(text); tape.appendChild(e); return e; };
    const blank = () => { tape.querySelector(".blank")?.remove(); chip("?", "blank"); };
    const deal = () => { cur.asks[step].opts.forEach((o, i) => { words[i].innerHTML = MathQ.html(o); lamps[i].setAttribute("aria-label", o); }); blank(); say.textContent = "다음 수가 적힌 등을 눌러요"; lock = false; };
    const show = async () => { lock = true; step = 0; cur = MathQ.series(round); tape.innerHTML = ""; words.forEach(w => w.innerHTML = ""); say.textContent = round === 2 || round === 5 ? "규칙이 더 어려워져요!" : "신호를 받는 중이에요"; await wait(500); for (const label of cur.shown) { if (over) return; chip(label); await flash(Math.floor(Math.random() * 4), 230); await wait(90); } if (!over) deal(); };
    s.stage.addEventListener("click", async e => { const b = e.target.closest(".lamp"); if (!b || lock || over) return; const i = Number(b.dataset.i), ask = cur.asks[step], got = ask.opts[i]; lock = true; flash(i, 170);
      if (got !== ask.real) { lives--; hud(); Sfx.wrong(); tape.querySelector(".blank")?.remove(); chip(ask.real, "fix"); say.innerHTML = MathQ.html("정답 " + ask.real + " · " + cur.rule); await wait(3000); if (over) return; if (!lives) return end(score); round++; if (round >= ROUNDS) return end(score); return show(); }
      score++; hud(); tape.querySelector(".blank")?.remove(); chip(ask.real, "got"); step++;
      if (step < cur.asks.length) return deal();
      Sfx.match(); say.textContent = "수신 완료! " + cur.rule; await wait(1300); if (over) return; round++; if (round >= ROUNDS) return end(score); show(); });
    hud(); show();
  });
}
/* 통신 기지: work out what a symbol is worth from the clues. Right answers bring harder messages, worth more:
   the first 3 give 1 point each, the next 3 give 2, the rest give 3. Score = points, up to 24. */
function codebreak({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "식을 풀어 기호의 값을 알아내요. 틀리면 5초가 줄어요."), ids = ["star", "anchor", "compass", "moon", "flame", "shell"], MAX = 24, TOTAL = 120;
    s.el.classList.add("g-mem", `era-${map}`); s.stage.style.setProperty("--pic", `url(/maps/sea${map + 1}.webp)`);
    const icon = id => `<svg class="code-ic" viewBox="0 0 100 100" aria-hidden="true">${V.embSVG(id, 50, 50, 86, "#FFFFFF", "#0B2233")}</svg>`;
    s.stage.innerHTML = `<div class="cipher"><div class="code-clues" aria-live="polite"></div><div class="code-in"><p class="code-ask num"></p><i class="code-time"><i></i></i><p class="sig-say" aria-live="polite"></p></div><div class="code-keys nine">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-n="${n}" class="num">${n}</button>`).join("")}</div></div>`;
    const clues = s.stage.querySelector(".code-clues"), ask = s.stage.querySelector(".code-ask"), bar = s.stage.querySelector(".code-time i"), say = s.stage.querySelector(".sig-say");
    let cur = null, solved = 0, wrong = 0, score = 0, left = TOTAL, over = false, wait2 = false, lastT = performance.now();
    const levelOf = n => n < 3 ? 0 : n < 6 ? 1 : 2;
    const next = () => { cur = MathQ.cipher(levelOf(solved)); wrong = 0; const pick = MathQ.shuffle(ids), sym = { a: pick[0], b: pick[1], c: pick[2] }, tok = t => sym[t] ? icon(sym[t]) : `<b>${t}</b>`;
      clues.innerHTML = cur.clues.map(c => `<div class="num">${c.map(tok).join("")}</div>`).join(""); clues.classList.remove("new"); clues.offsetWidth; clues.classList.add("new");
      ask.innerHTML = `${icon(sym[cur.ask])}<b>= ?</b>`; };
    const end = v => { if (over) return; over = true; clearInterval(tm); s.el.remove(); done(v); };
    const hud = () => s.hud.textContent = `점수 ${score} · ${Math.ceil(left)}초`;
    const tm = setInterval(() => { const n = performance.now(); left -= (n - lastT) / 1000; lastT = n; bar.style.width = Math.max(0, left / TOTAL * 100) + "%"; hud(); if (left <= 0) end(score); }, 100);
    s.quit.onclick = () => end(null);
    s.stage.addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b || over || wait2) return;
      if (Number(b.dataset.n) === cur.answer) { score = Math.min(MAX, score + levelOf(solved) + 1); solved++; Sfx.match(); say.textContent = solved === 3 || solved === 6 ? "더 어려운 암호가 들어와요!" : "해독 성공!"; if (score >= MAX) return end(score); next(); }
      else { left -= 5; wrong++; Sfx.wrong(); if (wrong < 2) say.textContent = "틀렸어요! 5초 감소"; else { say.textContent = `정답은 ${cur.answer}이었어요. 다음 암호로 넘어가요`; wait2 = true; setTimeout(() => { wait2 = false; if (!over) { say.textContent = ""; next(); } }, 1800); } } hud(); });
    next(); hud();
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
    { short: "가로와 세로를 계산해서 그 칸을 쏴요. 10발!", steps: ["적함은 안개에 숨어 있어요. 위의 식을 풀면 가로, 세로 칸 번호가 나와요.", "그 칸을 누르면 포탄이 날아가요. 기회는 한 번이에요.", "뒤로 가면 바람이 포탄을 밀어요. 바람이 미는 만큼 반대쪽을 쏴요."], art: `${WATER}${[0, 1, 2, 3].map(i => `<path d="M${60 + i * 40} 18v80M60 ${18 + i * 26.6}h120" stroke="#fff" stroke-opacity=".45"/>`).join("")}<rect x="100" y="44.6" width="40" height="26.6" fill="#FFE27A" fill-opacity=".55"/>${label(120, 13, "가로 2", "#FFE27A")}${label(36, 62, "세로 2", "#FFE27A")}` },
    { short: "적함이 몇 m 남았을 때 쏠지 계산해요. 10발!", steps: ["위에 적함의 빠르기와 어뢰가 도착하는 시간이 나와요.", "어뢰가 가는 동안 적함도 움직여요. 빠르기 × 시간으로 쏠 거리를 구해요.", "그 눈금을 누르면 적함이 거기 왔을 때 어뢰가 나가요. 뒤로 가면 빠르기와 시간부터 구해야 해요."], art: `${WATER}<rect x="44" y="4" width="152" height="18" rx="5" fill="#FFE27A"/>${label(120, 17, "1초에 30m · 4초 뒤 도착", "#1B2A33")}${hull(206, 44, "#5B6470")}<path d="M30 56h190" stroke="#fff" stroke-dasharray="3 6"/><path d="M30 56v46" ${dash}/><circle cx="30" cy="56" r="6" fill="none" stroke="#FFE27A" stroke-width="2"/>${[60, 120, 180].map((m, i) => `<rect x="${44 + i * 54}" y="72" width="46" height="24" rx="5" fill="${m === 120 ? "#FFE27A" : "#0D2233"}"/>${label(67 + i * 54, 88, m, m === 120 ? "#1B2A33" : "#fff")}`).join("")}` },
    { short: "명령에 맞는 표적을 계산해서 꾹! 10번!", steps: ["위에 나온 명령을 읽어요. 수나 식이 조건에 맞는 표적이 진짜예요.", "진짜 표적을 손가락으로 꾹 누르고 있으면 미사일이 날아가요.", "틀린 표적을 누르거나 시간이 지나면 놓쳐요. 뒤로 갈수록 어려워져요."], art: `${WATER}<rect x="66" y="4" width="108" height="20" rx="5" fill="#FFE27A"/>${label(120, 18, "3의 배수인 표적", "#1B2A33")}${hull(70, 52, "#5B6470")}${bracket(70, 50, 24)}${label(70, 84, "27", "#FFF3B8")}${hull(176, 52, "#5B6470")}${label(176, 84, "35", "#FFF3B8")}` }
  ],
  reef: [
    { short: "정답 통로로 배를 몰아요. 해류를 버텨요!", steps: ["위의 문제를 풀고 정답이 적힌 통로로 배를 몰아요.", "해류가 배를 옆으로 밀어요. 반대로 버텨요.", "통로 하나에 3점이에요. 틀린 통로에 들어가면 기회가 줄어요. 기회는 3번이에요."], art: `${WATER}${rock(40, 28)}${rock(120, 28)}${rock(200, 28)}${label(80, 32, "24", "#FFE27A")}${label(160, 32, "27", "#FFE27A")}${hull(80, 78)}<path d="M150 86h34m-9-6 9 6-9 6" fill="none" stroke="#BFE8FF" stroke-width="3"/>${label(166, 104, "해류", "#BFE8FF")}` },
    { short: "안개 속 정답이 늦게 보여요. 미리 풀어요!", steps: ["위의 문제를 먼저 풀어 둬요. 답이 적힌 통로는 안개를 지나야 보여요.", "정답이 적힌 통로로 배를 몰아요.", "통로 하나에 3점이에요. 틀린 통로에 들어가면 기회가 줄어요. 기회는 3번이에요."], art: `<defs><linearGradient id="hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8EEF2"/><stop offset=".65" stop-color="#E8EEF2" stop-opacity="0"/></linearGradient></defs>${WATER}<path d="M60 64l13-24 12 14 8-6 12 16z" fill="#DDF3FA"/><path d="M160 26l10-16 12 16z" fill="#DDF3FA" opacity=".35"/><rect width="240" height="110" rx="10" fill="url(#hf)"/>${hull(130, 88)}` },
    { short: "정답 통로로 배를 몰아요. 빠르게 풀어요!", steps: ["위의 문제를 풀고 정답이 적힌 통로로 배를 몰아요.", "기뢰는 소나 파동이 지나갈 때만 보여요. 통로가 더 빨리 다가와요.", "통로 하나에 3점이에요. 틀린 통로에 들어가면 기회가 줄어요. 기회는 3번이에요."], art: `${WATER}<g fill="none" stroke="#9DF2C7" stroke-width="2"><path d="M60 92a60 60 0 0 1 120 0" opacity=".9"/><path d="M90 92a30 30 0 0 1 60 0" opacity=".5"/><path d="M28 92a92 92 0 0 1 184 0" opacity=".35"/></g>${mine(66, 46)}${mine(176, 58)}${mine(122, 20, .3)}${hull(120, 88, "#5B6470")}` }
  ],
  memory: [
    { short: "값이 같은 카드끼리 짝을 찾아요!", steps: ["카드를 두 장씩 뒤집어요.", "값이 같으면 짝이에요. 3/4과 75%, 2+3×2와 8처럼요.", "적게 뒤집을수록 점수가 높아요. 어디에 뭐가 있었는지 기억해요."], art: `<rect width="240" height="110" rx="10" fill="#3C3430"/>${[0, 1, 2, 3].flatMap(c => [0, 1].map(r => { const x = 42 + c * 42, y = 12 + r * 46, t = c === 0 && r === 0 ? "3/4" : c === 2 && r === 1 ? "75%" : ""; return `<rect x="${x}" y="${y}" width="34" height="40" rx="6" fill="${t ? "#FFF6E0" : "#8A5A3B"}"/>${t ? (t === "3/4" ? `<g font-size="13" font-weight="700" fill="#14466F" text-anchor="middle"><text x="${x + 17}" y="${y + 17}">3</text><text x="${x + 17}" y="${y + 34}">4</text><rect x="${x + 10}" y="${y + 20}" width="14" height="2"/></g>` : `<text x="${x + 17}" y="${y + 25}" font-size="13" font-weight="700" fill="#14466F" text-anchor="middle">${t}</text>`) : ""}`; })).join("")}` },
    { short: "규칙을 찾아 다음 수가 적힌 등을 눌러요!", steps: ["등대가 수를 차례로 보내요. 수가 변하는 규칙을 찾아요.", "다음 수가 적힌 등을 눌러요. 한 라운드에 세 수를 이어 가요. 맞힌 수마다 1점이에요.", "뒤로 갈수록 규칙이 어려워져요. 세 번 틀리거나 3분이 지나면 끝나요."], art: `<rect width="240" height="110" rx="10" fill="#1E2C44"/>${[2, 5, 8, 11, "?"].map((n, i) => `<rect x="${24 + i * 40}" y="10" width="34" height="28" rx="6" fill="${n === "?" ? "none" : "#0D2233"}" stroke="${n === "?" ? "#FFE27A" : "none"}" stroke-dasharray="4 3" stroke-width="2"/>${label(41 + i * 40, 29, n, n === "?" ? "#FFE27A" : "#fff")}`).join("")}${[13, 14, 16].map((n, i) => { const x = 60 + i * 60; return `<circle cx="${x}" cy="74" r="23" fill="${n === 14 ? "#FFE27A" : "#3B4E6D"}"/>${label(x, 79, n, n === 14 ? "#1B2A33" : "#fff")}`; }).join("")}` },
    { short: "식을 풀어 기호의 값을 찾아요. 틀리면 5초 줄어요!", steps: ["위의 식을 보고 물어본 기호의 값을 구해요. 값은 1부터 9까지예요.", "맞힐수록 어려운 암호가 와요. 어려운 암호는 점수가 커요.", "틀리면 5초가 줄고, 두 번 틀리면 다음 암호로 넘어가요. 2분 동안 풀어요."], art: `<rect width="240" height="110" rx="10" fill="#14251F"/><text x="120" y="30" font-size="19" font-weight="700" fill="#fff" text-anchor="middle">★ + ★ = 8</text><text x="120" y="58" font-size="19" font-weight="700" fill="#fff" text-anchor="middle">★ + ☾ = 7</text><text x="96" y="92" font-size="21" font-weight="700" fill="#FFE27A" text-anchor="middle">☾ = ?</text><rect x="146" y="70" width="34" height="32" rx="8" fill="#9DF2C7"/><text x="163" y="93" font-size="21" font-weight="700" fill="#14251F" text-anchor="middle">3</text>` }
  ]
};
// the explanation card; resolves true to play. `ask` is false when opened from the 게임 방법 button, where there is nothing to start
const intro = (kind, map, title, stars, ask) => new Promise(done => { const h = HOW[kind][map || 0], m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<div class="panel how"><h2>${title}</h2><svg viewBox="0 0 240 110" role="img" aria-label="게임 그림 설명">${h.art}</svg><ol>${h.steps.map(s => `<li>${MathQ.html(s)}</li>`).join("")}</ol><p class="small muted num">별 1개 ${stars[0]}점 · 별 2개 ${stars[1]}점 · 별 3개 ${stars[2]}점</p><div class="row how-go">${ask ? `<button type="button" class="btn primary lg" data-go>시작</button><button type="button" class="btn" data-no>취소</button>` : `<button type="button" class="btn primary lg" data-no>알겠어요</button>`}</div></div>`;
  document.body.appendChild(m); const go = m.querySelector("[data-go]"), no = m.querySelector("[data-no]"), end = v => { m.remove(); done(v); }; if (go) go.onclick = () => end(true); no.onclick = () => end(false); (go || no).focus(); });
// 3-2-1 with the game's one-line reminder, so a game never starts before the child is looking
const countdown = (title, line) => new Promise(done => { const m = document.createElement("div"); m.className = "game-count"; m.setAttribute("role", "status"); m.innerHTML = `<b>${title}</b><span class="count-n num"></span><p>${line}</p>`; document.body.appendChild(m); const n = m.querySelector(".count-n"); let i = 3;
  const step = () => { if (!i) { m.remove(); done(); return; } n.textContent = i; n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; window.Sfx?.tick?.(); i--; setTimeout(step, 750); }; step(); });
window.Games = { intro, run: async (kind, opts) => { const map = opts.map || 0; await countdown(opts.title, HOW[kind][map].short); return ({ cannon: [cannon, torpedo, missile], reef: [reef, reef, reef], memory: [memory, lighthouse, codebreak] })[kind][map](opts); } };
})();
