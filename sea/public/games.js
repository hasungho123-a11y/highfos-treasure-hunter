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
const sea = (g, w, h, t) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3A86BD"); gr.addColorStop(1, "#123E66"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 2; for (let y = (t * 30) % 46 - 46; y < h; y += 46) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * .03 + y) * 5); g.stroke(); } };
const boat = (g, x, y, s, hull = "#7A4A28", sail = "#EFE4C8") => { g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = sail; g.beginPath(); g.moveTo(1, -26); g.lineTo(1, -4); g.lineTo(15, -4); g.fill(); g.beginPath(); g.moveTo(-1, -22); g.lineTo(-1, -4); g.lineTo(-12, -4); g.fill();
  g.fillStyle = "#4E321E"; g.fillRect(-1, -28, 2, 26); g.fillStyle = hull; g.beginPath(); g.moveTo(-17, -2); g.lineTo(17, -2); g.lineTo(11, 8); g.lineTo(-11, 8); g.fill(); g.restore(); };

// the same games get faster and change their dressing from sea to sea
const PACE = [1, 1.2, 1.4];
const targetShip = (g, x, y, s, map) => { if (!map) return boat(g, x, y, s, "#8E2A22", "#2B2B2E"); g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = map === 1 ? "#23262B" : "#8A949E"; g.fillRect(-8, -14, 12, 12); g.fillStyle = "#23262B"; if (map === 1) g.fillRect(-3, -24, 5, 10); else g.fillRect(-1, -26, 2, 12);
  g.fillStyle = map === 1 ? "#3C3F44" : "#5F6973"; g.beginPath(); g.moveTo(-20, -2); g.lineTo(21, -2); g.lineTo(15, 8); g.lineTo(-16, 8); g.fill(); g.restore(); };
const hazard = (g, k, map) => { if (map === 2) { g.strokeStyle = "#16181C"; g.lineWidth = 3; for (let a = 0; a < 6.3; a += .79) { g.beginPath(); g.moveTo(k.x, k.y); g.lineTo(k.x + Math.cos(a) * (k.r + 5), k.y + Math.sin(a) * (k.r + 5)); g.stroke(); } g.fillStyle = "#2B2F36"; g.beginPath(); g.arc(k.x, k.y, k.r * .9, 0, 7); g.fill(); return; }
  g.fillStyle = map === 1 ? "#CFE4EE" : "#5A5048"; g.beginPath(); g.ellipse(k.x, k.y, k.r, k.r * .8, 0, 0, 7); g.fill(); g.fillStyle = map === 1 ? "#F4FAFC" : "#7A6E62"; g.beginPath(); g.ellipse(k.x - 4, k.y - 4, k.r * .55, k.r * .4, 0, 0, 7); g.fill(); };

/* 포격 섬: tap when the moving target crosses your aim. 10 shots, and it speeds up. */
function cannon({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "표적이 가운데 올 때 화면을 눌러 쏴요. 10발!"), cv = canvasIn(s.stage), { g } = cv;
    let shots = 10, hits = 0, t = 0, last = performance.now(), phase = 0, ball = null, flash = null, over = false;
    const fire = e => { e.preventDefault(); if (ball || over || shots <= 0) return; shots--; ball = { p: 0 }; };
    s.stage.addEventListener("pointerdown", fire);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, speed = (1.5 + (10 - shots) * .22 + hits * .08) * PACE[map]; phase += dt * speed;
      const tx = w / 2 + Math.sin(phase) * (w / 2 - 44), ty = h * .24;
      sea(g, w, h, t); targetShip(g, tx, ty + Math.sin(t * 3) * 3, 1.5, map);
      g.strokeStyle = "rgba(255,255,255,.4)"; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(w / 2, ty + 24); g.lineTo(w / 2, h - 80); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#23262B"; g.fillRect(w / 2 - 11, h - 92, 22, 46); g.beginPath(); g.arc(w / 2, h - 40, 28, 0, 7); g.fill();
      if (ball) { ball.p += dt / .42; const y = h - 92 + (ty - h + 92) * Math.min(1, ball.p); g.fillStyle = "#F1C04B"; g.beginPath(); g.arc(w / 2, y, 8, 0, 7); g.fill();
        if (ball.p >= 1) { const hit = Math.abs(tx - w / 2) < 34; if (hit) hits++; flash = { hit, a: 1 }; ball = null; if (!shots) setTimeout(() => end(hits), 500); } }
      if (flash) { flash.a -= dt * 2.2; if (flash.a <= 0) flash = null; else { g.fillStyle = `rgba(255,255,255,${flash.a})`; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText(flash.hit ? "명중!" : "빗나갔어요", w / 2, h * .5); } }
      s.hud.textContent = `명중 ${hits} · 남은 ${shots}발`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 암초 해협: slide left and right past the rocks; it gets faster until you hit one. */
function reef({ map, title }) {
  return new Promise(done => {
    const s = shell(title, `손가락을 좌우로 움직여 ${["암초를", "빙산을", "기뢰를"][map]} 피해요.`), cv = canvasIn(s.stage), { g } = cv;
    let x = .5, t = 0, last = performance.now(), rocks = [], spawn = 0, passed = 0, over = false, crashed = 0;
    const move = e => { const r = s.stage.getBoundingClientRect(); x = Math.min(.95, Math.max(.05, (e.clientX - r.left) / r.width)); };
    s.stage.addEventListener("pointerdown", move); s.stage.addEventListener("pointermove", move);
    const end = v => { if (over) return; over = true; cv.stop(); s.el.remove(); done(v); };
    s.quit.onclick = () => end(null);
    (function tick(now) { if (over) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; const w = cv.w, h = cv.h, speed = (170 + t * 9) * PACE[map];
      sea(g, w, h, t * 3);
      if (!crashed) { spawn -= dt; if (spawn <= 0) { spawn = Math.max(.34, .95 - t * .012); rocks.push({ x: Math.random() * (w - 50) + 25, y: -30, r: 17 + Math.random() * 13 }); } }
      const px = x * w, py = h - 70;
      for (const k of rocks) { if (!crashed) k.y += speed * dt; hazard(g, k, map);
        if (!crashed && Math.hypot(k.x - px, k.y - py) < k.r + 15) { crashed = t; setTimeout(() => end(passed), 800); } }
      const before = rocks.length; rocks = rocks.filter(k => k.y < h + 40); passed += before - rocks.length;
      boat(g, px, py, 1.4); if (crashed) { g.fillStyle = "#fff"; g.font = "400 34px Jua, sans-serif"; g.textAlign = "center"; g.fillText("쿵!", w / 2, h * .45); }
      s.hud.textContent = `피한 ${["암초", "빙산", "기뢰"][map]} ${passed}`;
      requestAnimationFrame(tick); })(last);
  });
}
/* 보물 동굴: find the pairs. Fewer turns scores higher. */
function memory({ map, title }) {
  return new Promise(done => {
    const s = shell(title, "같은 그림의 짝을 찾아요. 적게 뒤집을수록 좋아요."), ids = ["star", "heart", "flower", "butterfly", "crown", "shell"];
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
