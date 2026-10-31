/* 하이포스 트레저헌터 — voyage chart, ships and treasure-chest effects (shared by teacher and student screens) */
(() => {
const ROUTE_D = "M 80 525 C 280 580, 560 470, 860 515 C 990 535, 995 375, 840 360 C 620 335, 420 415, 190 352 C 40 312, 55 190, 225 175 C 440 155, 650 238, 905 118";
const SAILS = ["#E0573F", "#F2B134", "#2E9C8F", "#7A5CC7", "#3D8BD9", "#D9467A", "#5E9E3E", "#C9702D", "#1F6F8B", "#9B4FB0"];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const dpos = (t, L) => t <= 0 ? 0 : ((t - 1) % L) + 1;
const voyageOf = (t, L) => t <= 0 ? 1 : Math.floor((t - 1) / L) + 1;
const isChest = (p, s) => p > 0 && p < s.routeLen && p % s.treasureEvery === 0;
const sail = i => SAILS[((Number(i) || 0) % SAILS.length + SAILS.length) % SAILS.length];
const pct = pt => ({ left: pt.x / 10, top: pt.y / 6.2 });

const measure = document.createElementNS("http://www.w3.org/2000/svg", "svg");
measure.setAttribute("width", "0"); measure.setAttribute("height", "0"); measure.style.position = "absolute";
measure.innerHTML = `<path d="${ROUTE_D}"/>`;
document.body.appendChild(measure);
const ptsCache = {};
function stopPts(L) {
  if (ptsCache[L]) return ptsCache[L];
  const p = measure.querySelector("path"), len = p.getTotalLength(), out = [];
  for (let i = 0; i <= L; i++) { const q = p.getPointAtLength(len * i / L); out.push({ x: q.x, y: q.y }); }
  return ptsCache[L] = out;
}

const BOAT = `<svg viewBox="0 0 48 44" aria-hidden="true"><g class="hull">
  <path d="M24 4 L24 31" stroke="#5A3A22" stroke-width="2"/><path d="M25.5 6 L25.5 28 L41 28 Z" fill="var(--sail)"/>
  <path d="M22.5 10 L22.5 28 L11 28 Z" fill="#FFF8EA"/><path d="M24 4 L31 6.5 L24 9 Z" fill="var(--sail)"/>
  <path d="M5 30 L43 30 L37 39 Q24 42 11 39 Z" fill="#7A4A28"/><path d="M6.5 32 L41.5 32" stroke="#F1C04B" stroke-width="1.6"/></g></svg>`;

function mapHTML(season, id = "map") {
  const L = season.routeLen, P = stopPts(L), stops = [];
  for (let i = 1; i < L; i++) {
    const p = P[i];
    if (isChest(i, season)) stops.push(`<g transform="translate(${p.x} ${p.y})"><ellipse rx="34" ry="15" cy="4" fill="var(--sand)"/><ellipse rx="26" ry="9" cy="1" fill="var(--sand2)" opacity=".5"/>
      <use href="#chestIcon" x="-14" y="-40" width="28" height="24"/><circle r="11" fill="#FFE59A" stroke="#9C6A22" stroke-width="2"/><text class="stopn" text-anchor="middle" dy="4">${i}</text></g>`);
    else stops.push(`<g transform="translate(${p.x} ${p.y})"><circle r="9.5" fill="#fff" stroke="rgb(255 255 255 / .5)" stroke-width="5"/><text class="stopn" text-anchor="middle" dy="4">${i}</text></g>`);
  }
  const S0 = P[0], E = P[L];
  return `<div class="map" id="${id}">
    <svg class="sea" viewBox="0 0 1000 620" role="img" aria-label="항해 지도: 출항부터 도착 항구까지 ${L}칸">
      <defs>
        <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sea1)"/><stop offset="1" stop-color="var(--sea2)"/></linearGradient>
        <pattern id="wv" width="60" height="34" patternUnits="userSpaceOnUse"><path d="M0 17 q15 -9 30 0 t30 0" fill="none" stroke="#fff" stroke-width="1.6" opacity=".14"/></pattern>
        <symbol id="chestIcon" viewBox="0 0 28 24"><path d="M2 11 Q14 0 26 11 Z" fill="#B06B36"/><rect x="2" y="10" width="24" height="13" rx="2" fill="#8A5328"/><rect x="2" y="14" width="24" height="2.6" fill="#F1C04B"/><rect x="12" y="12" width="4" height="6" rx="1" fill="#F1C04B"/></symbol>
      </defs>
      <rect width="1000" height="620" fill="url(#seaG)"/><rect class="waves" x="0" width="1100" height="620" fill="url(#wv)"/>
      <g opacity=".9">
        <ellipse cx="350" cy="452" rx="46" ry="16" fill="var(--sand)"/><ellipse cx="342" cy="446" rx="24" ry="9" fill="var(--leaf)"/>
        <ellipse cx="690" cy="440" rx="34" ry="12" fill="var(--sand)"/>
        <ellipse cx="470" cy="272" rx="52" ry="18" fill="var(--sand)"/><ellipse cx="480" cy="265" rx="30" ry="10" fill="var(--leaf)"/>
        <ellipse cx="90" cy="70" rx="40" ry="14" fill="var(--sand)"/><ellipse cx="960" cy="590" rx="60" ry="22" fill="var(--sand)"/><ellipse cx="950" cy="582" rx="30" ry="10" fill="var(--leaf)"/>
      </g>
      <path d="${ROUTE_D}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" opacity=".75"/>
      <g transform="translate(${S0.x} ${S0.y})"><rect x="-38" y="-6" width="52" height="12" rx="2" fill="#8A5328"/><rect x="-34" y="6" width="4" height="12" fill="#6B3F1F"/><rect x="4" y="6" width="4" height="12" fill="#6B3F1F"/>
        <text class="lbl" x="-12" y="40" text-anchor="middle" font-size="20">출항</text></g>
      ${stops.join("")}
      <g transform="translate(${E.x} ${E.y})"><ellipse rx="70" ry="26" cy="8" fill="var(--sand)"/><ellipse rx="44" ry="15" cy="2" fill="var(--leaf)"/>
        <rect x="16" y="-46" width="12" height="44" fill="#FFF8EA"/><rect x="16" y="-34" width="12" height="7" fill="var(--coral)"/><rect x="16" y="-16" width="12" height="7" fill="var(--coral)"/>
        <path d="M13 -46 L31 -46 L22 -58 Z" fill="var(--coral)"/><circle cx="22" cy="-44" r="3" fill="#FFE59A"/>
        <circle r="13" fill="var(--coral)" stroke="#fff" stroke-width="3"/><text x="0" dy="5" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">${L}</text>
        <text class="lbl" x="-6" y="56" text-anchor="middle" font-size="22">도착 항구 · ${season.arrivalPoints}P</text></g>
    </svg>
    <div class="ships"></div>
    <div class="mapfx"><div class="fx-dim"></div><canvas class="fx-cv"></canvas><div class="fx-flash"></div></div>
  </div>`;
}

// ships: [{id, nickname, sail, moves}] ; opts: {me, prev:{id:moves}}
function placeShips(map, ships, season, opts = {}) {
  const box = map.querySelector(".ships"), L = season.routeLen, P = stopPts(L), groups = {}, fin = {};
  for (const s of ships) { const p = dpos(s.moves, L); (groups[p] = groups[p] || []).push(s); }
  for (const p in groups) {
    const g = groups[p].sort((a, b) => (a.id === opts.me) - (b.id === opts.me)), n = g.length, per = 4;
    g.forEach((s, k) => { const row = Math.floor(k / per), inRow = Math.min(per, n - row * per), col = k % per, b = pct(P[p]); fin[s.id] = { left: b.left + (col - (inRow - 1) / 2) * 5.4, top: b.top + row * 8.5 }; });
  }
  box.innerHTML = ships.map(s => { const i = dpos(s.moves, L), cur = P[i], nx = P[Math.min(L, i + 1)], pv = P[Math.max(0, i - 1)], dx = i < L ? nx.x - cur.x : cur.x - pv.x, f = fin[s.id];
    return `<div class="ship ${dx < 0 ? "flip" : ""} ${i === L ? "arrived" : ""} ${s.id === opts.me ? "mine" : ""} ${opts.me && s.id !== opts.me ? "other" : ""}" data-id="${s.id}" style="--sail:${sail(s.sail)};left:${f.left}%;top:${f.top}%"
      title="${esc(s.nickname)} · ${voyageOf(s.moves, L)}번째 항해 · ${i === L ? "도착 항구" : i + "칸"}">${BOAT}<span class="nmtag">${s.id === opts.me ? "나 · " : ""}${esc(s.nickname)}</span></div>`; }).join("");
  if (!opts.prev || reduced()) return;
  for (const s of ships) {
    const prev = opts.prev[s.id]; if (prev == null || prev >= s.moves) continue;
    const el = box.querySelector(`[data-id="${s.id}"]`), frames = [];
    const push = p => { const q = pct(P[p]); frames.push({ left: q.left + "%", top: q.top + "%" }); };
    push(dpos(prev, L)); for (let u = prev + 1; u <= s.moves; u++) { const p = dpos(u, L); if (p === 1 && u > 1) push(0); push(p); }
    frames[frames.length - 1] = { left: fin[s.id].left + "%", top: fin[s.id].top + "%" };
    el.style.zIndex = 2;
    el.animate(frames, { duration: Math.min(5200, 650 * (frames.length - 1)), easing: "ease-in-out", delay: 250 }).finished.then(() => el.style.zIndex = "", () => {});
  }
}

/* ---------- effects ---------- */
const C_BODY = `<svg viewBox="0 0 210 108" aria-hidden="true"><defs><linearGradient id="cwB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9652F"/><stop offset="1" stop-color="#5E2E13"/></linearGradient></defs>
  <rect x="4" y="0" width="202" height="104" rx="8" fill="url(#cwB)"/><path d="M26 36 H184 M26 72 H184" stroke="#4A230E" stroke-width="2.5" opacity=".5"/>
  <rect x="4" y="0" width="24" height="104" rx="6" fill="#3B271B"/><rect x="182" y="0" width="24" height="104" rx="6" fill="#3B271B"/>
  <g fill="#F1C04B"><circle cx="16" cy="16" r="3.4"/><circle cx="16" cy="52" r="3.4"/><circle cx="16" cy="88" r="3.4"/><circle cx="194" cy="16" r="3.4"/><circle cx="194" cy="52" r="3.4"/><circle cx="194" cy="88" r="3.4"/></g>
  <rect x="4" y="0" width="202" height="9" fill="#E2A93A"/><rect x="4" y="9" width="202" height="3" fill="#7A4A10" opacity=".5"/>
  <rect x="86" y="0" width="38" height="46" rx="7" fill="#F1C04B" stroke="#9C6A22" stroke-width="2.5"/><circle cx="105" cy="18" r="6" fill="#5A3412"/><path d="M101 21 h8 l-2 13 h-4 Z" fill="#5A3412"/></svg>`;
const C_LID = `<svg viewBox="0 0 210 78" aria-hidden="true"><defs><linearGradient id="cwL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9813F"/><stop offset="1" stop-color="#8A4A20"/></linearGradient></defs>
  <path d="M4 78 V42 Q105 -14 206 42 V78 Z" fill="url(#cwL)"/><path d="M30 30 Q105 2 180 30" fill="none" stroke="#FFD9A0" stroke-width="3" opacity=".35"/>
  <path d="M4 78 V42 Q14 35 28 30 V78 Z" fill="#3B271B"/><path d="M206 78 V42 Q196 35 182 30 V78 Z" fill="#3B271B"/>
  <rect x="4" y="67" width="202" height="11" fill="#E2A93A"/><rect x="86" y="54" width="38" height="24" rx="6" fill="#F1C04B" stroke="#9C6A22" stroke-width="2.5"/></svg>`;

const FX = { parts: [], raf: 0, ctx: null, w: 0, h: 0, skip: false, wake: [] };
const sleep = ms => new Promise(r => { if (FX.skip) return r(); const t = setTimeout(r, ms); FX.wake.push(() => { clearTimeout(t); r(); }); });
const play = (el, kf, opt) => FX.skip || !el ? Promise.resolve() : el.animate(kf, { fill: "forwards", ...opt }).finished.catch(() => {});
function skip() {
  FX.skip = true; FX.wake.splice(0).forEach(f => f());
  document.querySelectorAll(".mapfx *, .ships .ship").forEach(el => el.getAnimations().forEach(a => { try { a.finish(); } catch (e) { a.cancel(); } }));
}
function canvasFor(fx) {
  const cv = fx.querySelector(".fx-cv"), r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
  cv.width = r.width * d; cv.height = r.height * d; FX.ctx = cv.getContext("2d"); FX.ctx.setTransform(d, 0, 0, d, 0, 0); FX.w = r.width; FX.h = r.height;
}
function burstAt(xp, yp, n, kind) {
  if (!FX.ctx) return; const k = FX.w / 1000, x = xp / 100 * FX.w, y = yp / 100 * FX.h;
  const cols = kind === "coin" ? ["#FFE27A", "#FFF6D6", "#F1C04B", "#FFFFFF"] : ["#FFF6D6", "#FFE27A", "#9FD8FF", "#FFFFFF", "#FFB3A6"];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.25, sp = (4 + Math.random() * 9) * k * 1.4;
    FX.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 55 + Math.random() * 55, size: (2.5 + Math.random() * 4) * k * 1.5, coin: kind === "coin" && Math.random() < .6, color: cols[Math.floor(Math.random() * cols.length)], spin: Math.random() * 6, k });
  }
  if (!FX.raf) FX.raf = requestAnimationFrame(loop);
}
function loop() {
  const c = FX.ctx; if (!c) { FX.raf = 0; return; }
  c.clearRect(0, 0, FX.w, FX.h);
  FX.parts = FX.parts.filter(p => p.life < p.max);
  for (const p of FX.parts) {
    p.life++; p.vy += .22 * p.k; p.vx *= .985; p.vy *= .99; p.x += p.vx; p.y += p.vy;
    c.globalAlpha = Math.max(0, 1 - p.life / p.max);
    if (p.coin) { const w = Math.abs(Math.cos(p.life * .22 + p.spin)) * p.size * 1.5 + .6; c.fillStyle = "#F1C04B"; c.strokeStyle = "#A9771A"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y, w, p.size * 1.5, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    else { const s = p.size * (1 + .3 * Math.sin(p.life * .4)); c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 8; c.beginPath();
      c.moveTo(p.x, p.y - s * 1.8); c.lineTo(p.x + s * .45, p.y - s * .45); c.lineTo(p.x + s * 1.8, p.y); c.lineTo(p.x + s * .45, p.y + s * .45); c.lineTo(p.x, p.y + s * 1.8); c.lineTo(p.x - s * .45, p.y + s * .45); c.lineTo(p.x - s * 1.8, p.y); c.lineTo(p.x - s * .45, p.y - s * .45); c.closePath(); c.fill(); c.shadowBlur = 0; }
  }
  c.globalAlpha = 1;
  FX.raf = FX.parts.length ? requestAnimationFrame(loop) : 0;
  if (!FX.raf) c.clearRect(0, 0, FX.w, FX.h);
}
function legendShake() { const f = []; for (let i = 0; i <= 20; i++) { const amp = 1.5 + i * .75, dir = i % 2 ? 1 : -1; f.push({ transform: `translateY(${-i * .45}%) rotate(${i === 20 ? 0 : dir * amp}deg) scale(${1 + i * .007})` }); } return f; }
function waitTap(targets, auto) {
  return new Promise(res => {
    if (FX.skip) return res();
    let done = false; const fin = () => { if (done) return; done = true; clearTimeout(t); targets.forEach(x => x.removeEventListener("pointerdown", fin)); res(); };
    const t = auto ? setTimeout(fin, auto) : 0; targets.forEach(x => x.addEventListener("pointerdown", fin)); FX.wake.push(fin);
  });
}

// opener(): Promise<{name, rarity, points}> — called on the third tap; from: map point or null (centre)
async function chestFx(fx, from, who, stop, opener, { autoMs = 6000 } = {}) {
  if (!fx || FX.skip) return null;
  const pp = from ? pct(from) : { left: 50, top: 110 }, dim = fx.querySelector(".fx-dim"), flash = fx.querySelector(".fx-flash");
  const el = document.createElement("div");
  el.className = "mchest";
  el.innerHTML = `<div class="rays"></div><div class="beam"></div>
    <div class="chest3d"><div class="c-shadow"></div><div class="c-lid">${C_LID}</div><div class="c-body">${C_BODY}</div><div class="c-glow"></div></div>
    <div class="gcard"><div class="gcard-in"><div class="gface gback">?</div><div class="gface gfront"></div></div></div>
    <div class="tapmsg"><span>상자를 눌러요!</span><div class="tapdots"><i></i><i></i><i></i></div></div>`;
  fx.appendChild(el);
  const c3 = el.querySelector(".chest3d"), lid = el.querySelector(".c-lid"), glow = el.querySelector(".c-glow"), rays = el.querySelector(".rays"), beam = el.querySelector(".beam"),
    card = el.querySelector(".gcard"), cin = el.querySelector(".gcard-in"), front = el.querySelector(".gfront"), msg = el.querySelector(".tapmsg"), dots = [...el.querySelectorAll(".tapdots i")];
  const seam = () => { const r = c3.getBoundingClientRect(), m = fx.getBoundingClientRect(); return [(r.left + r.width / 2 - m.left) / m.width * 100, (r.top + r.height * .44 - m.top) / m.height * 100]; };
  msg.style.opacity = 0;
  await play(el, [{ left: pp.left + "%", top: pp.top + "%", transform: "translate(-50%,-50%) scale(.22) rotate(-12deg)", opacity: .5 },
    { left: "50%", top: "63%", transform: "translate(-50%,-50%) scale(1.08) rotate(3deg)", opacity: 1, offset: .75 }, { left: "50%", top: "63%", transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 }],
    { duration: 700, easing: "cubic-bezier(.3,.8,.35,1)" });
  const [lx, ly] = seam(); burstAt(lx, ly + 9, 18, "spark");
  play(msg, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  const idle = FX.skip ? null : c3.animate([{ transform: "scale(1)" }, { transform: "scale(1.035,.97)" }], { duration: 520, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
  let rewardP = null;
  for (let i = 0; i < 3 && !FX.skip; i++) {
    await waitTap([el], autoMs);
    if (FX.skip) break;
    if (i === 2) rewardP = opener().catch(e => ({ error: e.message || "상자를 열지 못했어요" }));
    dots[i].classList.add("on");
    await play(c3, [{ transform: "none" }, { transform: "scale(1.16,.8)", offset: .18 }, { transform: `translateY(-${10 + i * 5}%) scale(.9,1.14) rotate(${i % 2 ? 5 : -5}deg)`, offset: .5 }, { transform: "scale(1.1,.88)", offset: .82 }, { transform: "none" }], { duration: 420, easing: "ease-out", fill: "none" });
    play(glow, [{ opacity: .25 * i }, { opacity: .3 + .3 * i }], { duration: 200 });
    burstAt(...seam(), 14 + i * 16, "spark");
    play(flash, [{ opacity: .12 + i * .08 }, { opacity: 0 }], { duration: 260, fill: "none" });
  }
  idle?.cancel();
  play(msg, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
  if (FX.skip || !rewardP) { el.remove(); return null; }
  const rw = await rewardP;
  if (rw.error) { msg.querySelector("span").textContent = rw.error; msg.querySelector(".tapdots")?.remove(); play(msg, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); await waitTap([el, dim], 3500); el.remove(); return null; }
  const legend = rw.rarity === "전설";
  el.classList.add(`r-${rw.rarity}`); if (legend) el.classList.add("legend");
  front.innerHTML = `<span class="rar">${esc(rw.rarity)}</span><b>${esc(rw.name)}</b><small>${esc(who)}<br>${stop}칸 보물섬${rw.points ? ` · +${rw.points}P` : ""}</small>`;
  let pre = "none";
  if (legend) {
    fx.classList.add("charging");
    const sp = setInterval(() => burstAt(...seam(), 10, "spark"), 260);
    const kf = legendShake(); pre = kf[kf.length - 1].transform;
    play(glow, [{ opacity: .9 }, { opacity: 1, transform: "scale(1.5,1.2)" }], { duration: 2000 });
    await play(c3, kf, { duration: 2000, easing: "ease-in" });
    clearInterval(sp);
  }
  await play(c3, [{ transform: pre }, { transform: "scale(1.18,.78)" }], { duration: 170, easing: "ease-in" });
  if (!FX.skip) {
    play(c3, [{ transform: "scale(1.18,.78)" }, { transform: "translateY(-6%) scale(.92,1.14)", offset: .35 }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.3,1.4,.5,1)" });
    play(lid, [{ transform: "rotateX(0deg)" }, { transform: "rotateX(84deg) translateY(-6%)" }], { duration: 420, easing: "cubic-bezier(.2,1.7,.45,1)" });
    play(glow, [{ opacity: 1, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.5,1.3)" }], { duration: 400 });
    play(flash, [{ opacity: legend ? .95 : .7 }, { opacity: 0 }], { duration: legend ? 1000 : 520, easing: "ease-out", fill: "none" });
    play(beam, [{ opacity: 0, transform: "scaleY(0) scaleX(.4)" }, { opacity: 1, transform: "scaleY(1.05) scaleX(1.1)", offset: .5 }, { opacity: .85, transform: "scaleY(1) scaleX(1)" }], { duration: 600, easing: "ease-out" });
    play(rays, [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }], { duration: 600, easing: "ease-out" });
    rays.animate([{ rotate: "0deg" }, { rotate: "360deg" }], { duration: legend ? 7000 : 14000, iterations: Infinity });
    const [sx, sy] = seam();
    burstAt(sx, sy, legend ? 180 : 70, legend ? "coin" : "spark");
    if (legend) { setTimeout(() => burstAt(sx, sy, 120, "coin"), 420); setTimeout(() => burstAt(sx, sy, 90, "spark"), 900); setTimeout(() => burstAt(sx, sy, 90, "coin"), 1500); }
    else setTimeout(() => burstAt(sx, sy, 40, "spark"), 350);
    await sleep(120);
    play(card, [{ opacity: 0, transform: "translateY(75%) scale(.15)" }, { opacity: 1, transform: "translateY(-8%) scale(1.12)", offset: .6 }, { opacity: 1, transform: "none" }], { duration: 720, easing: "cubic-bezier(.25,1.1,.4,1)" });
    await play(cin, [{ transform: "rotateY(0deg)" }, { transform: `rotateY(${legend ? 900 : 540}deg)` }], { duration: legend ? 1700 : 1000, easing: "cubic-bezier(.2,.7,.25,1)" });
    if (!FX.skip) { card.classList.add("shine"); burstAt(sx, sy - 22, legend ? 60 : 24, legend ? "coin" : "spark"); play(card, [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 300, fill: "none" }); }
    msg.querySelector("span").textContent = "눌러서 계속"; msg.querySelector(".tapdots")?.remove();
    play(msg, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600 });
    fx.classList.add("catch");
    await waitTap([el, dim], legend ? 12000 : 8000);
    fx.classList.remove("catch", "charging");
    await play(el, [{ opacity: 1 }, { opacity: 0, transform: "translate(-50%,-50%) scale(.9)" }], { duration: 300 });
  }
  fx.classList.remove("catch", "charging");
  el.remove();
  return rw;
}
async function arriveFx(fx, pt, points, who) {
  if (!fx || FX.skip) return;
  const pp = pct(pt), el = document.createElement("div");
  el.className = "fx-pts"; el.style.left = pp.left + "%"; el.style.top = (pp.top - 6) + "%";
  el.innerHTML = `<small>${esc(who)} 도착!</small>+${points}P`;
  fx.appendChild(el);
  play(fx.querySelector(".fx-flash"), [{ opacity: .35 }, { opacity: 0 }], { duration: 450, fill: "none" });
  burstAt(pp.left, pp.top, 130, "coin");
  await play(el, [{ opacity: 0, transform: "translate(-50%,-40%) scale(.3)" }, { opacity: 1, transform: "translate(-50%,-100%) scale(1.12)", offset: .65 }, { opacity: 1, transform: "translate(-50%,-100%) scale(1)" }], { duration: 650, easing: "cubic-bezier(.3,1.3,.5,1)" });
  await sleep(1700);
  await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
  el.remove();
}
/* items: [{studentId, name, b, a, m, title, events:[{u, type:'chest', chestId, stop} | {u, type:'arrive', points}]}]
   opener(chestId): Promise<reward> ; returns list of {name, reward} opened */
async function runVoyage(map, items, season, opener, { banner = true, stage = false } = {}) {
  const fx = map.querySelector(".mapfx"), opened = [];
  if (!fx) return { opened, skipped: false };
  const L = season.routeLen, P = stopPts(L);
  FX.skip = false; FX.wake = []; FX.running = true;
  fx.insertAdjacentHTML("beforeend", `<button class="fx-skip" type="button">건너뛰기</button>${banner ? `<div class="fx-banner"></div>` : ""}`);
  fx.querySelector(".fx-skip").addEventListener("click", skip);
  const bn = fx.querySelector(".fx-banner"), sc = map.closest(".mapscroll");
  fx.classList.add("on"); canvasFor(fx);
  const setPos = (el, pt) => { const q = pct(pt); el.style.left = q.left + "%"; el.style.top = q.top + "%"; };
  for (const it of items) { const el = map.querySelector(`.ship[data-id="${it.studentId}"]`); if (el) setPos(el, P[dpos(it.b, L)]); }
  for (const it of items) {
    if (FX.skip) break;
    const el = map.querySelector(`.ship[data-id="${it.studentId}"]`); if (!el) continue;
    if (bn) bn.textContent = `${it.name} · ${it.title} · ${it.m}칸 전진`;
    el.classList.add("active");
    await sleep(450);
    for (let u = it.b + 1; u <= it.a && !FX.skip; u++) {
      const p = dpos(u, L);
      if (p === 1 && u > 1) setPos(el, P[0]);
      if (sc) { const r = el.getBoundingClientRect(), sr = sc.getBoundingClientRect(); sc.scrollBy({ left: (r.left + r.width / 2) - (sr.left + sr.width / 2), behavior: "smooth" }); }
      const to = pct(P[p]), fl = el.style.left, ft = el.style.top;
      el.classList.toggle("flip", P[p].x < parseFloat(fl) * 10);
      await play(el, [{ left: fl, top: ft }, { left: to.left + "%", top: to.top + "%" }], { duration: 560, easing: "ease-in-out", fill: "none" });
      setPos(el, P[p]);
      const ev = it.events.find(e => e.u === u);
      if (ev && ev.type === "chest" && ev.chestId && ev.status !== "opened" && ev.status !== "delivered") {
        el.classList.remove("active");
        let rw;
        if (stage) { const sg = makeStage(); canvasFor(sg.fx); rw = await chestFx(sg.fx, null, it.name, ev.stop, () => opener(ev.chestId), { autoMs: 0 }); sg.st.remove(); canvasFor(fx); }
        else rw = await chestFx(fx, P[p], it.name, ev.stop, () => opener(ev.chestId));
        if (rw) opened.push({ name: it.name, reward: rw });
        el.classList.add("active");
      } else if (ev && ev.type === "arrive") await arriveFx(fx, P[L], ev.points, it.name);
    }
    el.classList.remove("active");
    await sleep(250);
  }
  const skipped = FX.skip;
  FX.skip = false; FX.running = false; FX.parts = []; FX.ctx = null;
  fx.classList.remove("on", "catch", "charging");
  fx.querySelectorAll(".fx-skip, .fx-banner, .mchest, .fx-pts").forEach(x => x.remove());
  return { opened, skipped };
}
// a full-screen stage for opening chests outside the map (student list of chests)
function makeStage() {
  const st = document.createElement("div");
  st.className = "stage";
  st.innerHTML = `<div class="stage-box"><div class="mapfx on"><div class="fx-dim"></div><canvas class="fx-cv"></canvas><div class="fx-flash"></div></div></div><button class="fx-skip stage-close" type="button">닫기</button>`;
  document.body.appendChild(st);
  st.querySelector(".stage-close").addEventListener("click", skip);
  return { st, fx: st.querySelector(".mapfx") };
}
async function stageChests(list, who, opener) {
  const { st, fx } = makeStage();
  FX.skip = false; FX.wake = []; FX.running = true; canvasFor(fx);
  const opened = [];
  for (const c of list) { if (FX.skip) break; const rw = await chestFx(fx, null, who, c.stop, () => opener(c.id), { autoMs: 0 }); if (rw) opened.push(rw); }
  FX.skip = false; FX.running = false; FX.parts = []; FX.ctx = null;
  st.remove();
  return opened;
}

window.Voyage = { SAILS, sail, esc, dpos, voyageOf, isChest, stopPts, pct, mapHTML, placeShips, runVoyage, stageChests, skip, BOAT, get running() { return !!FX.running; } };
})();
