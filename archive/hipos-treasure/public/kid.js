// 하이포스 트레저 헌터 - 아이 화면
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KIND = { daily: "매일", weekly: "매주", challenge: "도전" };
const SUBJ_IC = { 영어: "🔤", 수학: "📐", 공통: "⭐" };
let S = null, tab = "map", subj = "전체", prev = null, busy = false;

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({ error: "연결이 끊겼어요" }));
  if (r.status === 401 && !path.includes("login")) { show("login"); throw new Error(d.error); }
  if (!r.ok) throw new Error(d.error || "문제가 생겼어요");
  return d;
}
function show(id) { for (const s of ["login", "setpin", "game"]) $("#" + s).hidden = s !== id; }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; t.style.animation = "none"; t.offsetHeight; t.style.animation = ""; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3000); }
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function celebrate(icons) {
  if (calm()) return;
  const c = $("#celebrate");
  for (let i = 0; i < 26; i++) { const e = document.createElement("i"); e.textContent = icons[i % icons.length]; e.style.left = Math.random() * 100 + "%"; e.style.animationDelay = Math.random() * .6 + "s"; c.appendChild(e); }
  setTimeout(() => c.innerHTML = "", 2600);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- PIN 입력 패드 ---------- */
function pinPad(padEl, dotsEl, onFull) {
  let v = "";
  const draw = () => dotsEl.innerHTML = [0, 1, 2, 3].map(i => `<span class="${i < v.length ? "on" : ""}">${i < v.length ? "●" : ""}</span>`).join("");
  padEl.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, "지우기", 0, "⌫"].map(k => `<button type="button" data-k="${k}" aria-label="${k}">${k === "지우기" ? "↺" : k}</button>`).join("");
  padEl.onclick = e => {
    const k = e.target.closest("button")?.dataset.k; if (k === undefined) return;
    if (k === "⌫") v = v.slice(0, -1); else if (k === "지우기") v = ""; else if (v.length < 4) v += k;
    draw(); if (v.length === 4 && onFull) onFull(v);
  };
  draw();
  return { get: () => v, clear: () => { v = ""; draw(); } };
}

const loginPin = pinPad($("#lg-pad"), $("#lg-pin"));
$("#loginForm").onsubmit = async e => {
  e.preventDefault(); $("#lg-err").textContent = "";
  if (loginPin.get().length !== 4) { $("#lg-err").textContent = "비밀번호 4자리를 눌러 주세요"; return; }
  $("#lg-go").disabled = true;
  try {
    const r = await api("/api/student/login", { classCode: $("#lg-code").value, nickname: $("#lg-nick").value, pin: loginPin.get() });
    try { localStorage.setItem("ht_code", $("#lg-code").value.trim().toUpperCase()); localStorage.setItem("ht_nick", $("#lg-nick").value.trim()); } catch (_) {}
    loginPin.clear();
    r.mustChange ? startSetPin() : boot();
  } catch (err) { $("#lg-err").textContent = err.message; loginPin.clear(); }
  $("#lg-go").disabled = false;
};
try { $("#lg-code").value = localStorage.getItem("ht_code") || ""; $("#lg-nick").value = localStorage.getItem("ht_nick") || ""; } catch (_) {}

function startSetPin() {
  show("setpin"); let first = null; $("#sp-err").textContent = ""; $("#sp-step").textContent = "새 비밀번호를 눌러 주세요";
  const p = pinPad($("#sp-pad"), $("#sp-pin"), async v => {
    if (!first) { first = v; setTimeout(() => { p.clear(); $("#sp-step").textContent = "한 번 더 똑같이 눌러 주세요"; }, 200); return; }
    if (v !== first) { $("#sp-err").textContent = "두 번 누른 숫자가 달라요. 처음부터 다시 해요"; first = null; $("#sp-step").textContent = "새 비밀번호를 눌러 주세요"; setTimeout(p.clear, 200); return; }
    try { await api("/api/kid/pin", { pin: v }); toast("비밀번호를 정했어요! 꼭 기억해요 🔐"); boot(); }
    catch (err) { $("#sp-err").textContent = err.message; first = null; $("#sp-step").textContent = "새 비밀번호를 눌러 주세요"; setTimeout(p.clear, 200); }
  });
}

/* ---------- 상태 불러오기 ---------- */
async function load() {
  const d = await api("/api/kid/state");
  if (d.me.mustChange) return startSetPin();
  if (prev) {
    const dx = d.stats.xp - prev.stats.xp;
    const newChest = d.stats.closedChests.some(l => !prev.stats.closedChests.includes(l));
    if (newChest) { toast("🎁 보물섬에 도착했어요! 보물상자를 열어 봐요"); celebrate(["⭐", "🎁", "🎉", "🐚"]); }
    else if (d.stats.level > prev.stats.level) { toast(`⛵ ${d.stats.level}번 섬에 도착했어요!`); celebrate(["⭐", "⛵", "🐚"]); }
    else if (dx > 0) toast(`선생님이 확인했어요! 항해 포인트 +${dx}`);
    const delivered = d.chests.filter(c => c.status === "delivered" && prev.chests.some(p => p.level === c.level && p.status === "opened"));
    if (delivered.length) toast(`"${delivered[0].reward_name}" 받기 완료! ✨`);
  }
  S = d; prev = d; show("game"); render();
}
async function boot() { try { await load(); } catch (e) { show("login"); } }
setInterval(() => { if (S && !document.hidden && !busy && $("#chestModal").hidden) load().catch(() => {}); }, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && S) load().catch(() => {}); });

/* ---------- 화면 ---------- */
const TABS = [{ k: "map", i: "🗺️", t: "보물 지도" }, { k: "quest", i: "📜", t: "미션" }, { k: "chest", i: "🎁", t: "보물함" }, { k: "log", i: "📖", t: "탐험 일지" }];
function render() {
  const st = S.stats, open = S.quests.filter(q => q.status === "open").length, closed = st.closedChests.length;
  $("#hudAva").textContent = S.me.avatar; $("#hudNick").textContent = S.me.nickname; $("#hudClass").textContent = `${S.me.className} 탐험대`;
  $("#hudLv").textContent = `${st.level}/${S.season.maxLevel}`; $("#hudPt").textContent = st.xp;
  const dot = k => k === "quest" && open ? open : k === "chest" && closed ? closed : 0;
  $("#tabs").innerHTML = TABS.map(t => `<button data-go="${t.k}" aria-current="${t.k === tab}"><i>${t.i}</i>${t.t}${dot(t.k) ? `<span class="dot">${dot(t.k)}</span>` : ""}</button>`).join("");
  $("#view").innerHTML = { map: vMap, quest: vQuest, chest: vChest, log: vLog }[tab]();
  if (tab === "map") document.getElementById("me-ship")?.scrollIntoView({ block: "center" });
}

const openBanner = () => S.stats.closedChests.map(l => `<div class="banner"><span class="big">🎁</span><span style="flex:1">${l}번 보물섬의 상자가 기다려요!<br><small>무엇이 나올지 열어 볼까?</small></span><button class="btn sm line open-btn" style="background:#fff8e6" data-open="${l}">열기</button></div>`).join("");

function vMap() {
  const c = S.season, st = S.stats, per = c.xpPerLevel, n = c.maxLevel;
  const chestAt = new Set(c.chestLevels), byLevel = Object.fromEntries(S.chests.map(x => [x.level, x]));
  const W = 360, gap = 74, H = 90 + n * gap;
  const pts = Array.from({ length: n + 1 }, (_, i) => [W / 2 + Math.sin(i * 0.95) * 110, 50 + i * gap]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += ` C${x0},${y0 + gap / 2} ${x1},${y1 - gap / 2} ${x1},${y1}`; }
  const done = st.level >= n, toNext = done ? 0 : (st.level + 1) * per - st.xp, pct = done ? 100 : (st.xp % per) / per * 100;
  const nextChest = c.chestLevels.find(l => l > st.level);
  const deco = [["🐙", 40, 0.32], ["🦈", 318, 0.55], ["🐚", 30, 0.78], ["🌴", 330, 0.18], ["🐳", 36, 0.9], ["⛵", 320, 0.86]];
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="보물 지도: ${n}개의 섬 중 ${st.level}번째에 있어요">
    <defs><pattern id="wv" width="40" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 q10 -6 20 0 t20 0" fill="none" stroke="#C9AE77" stroke-width="1.2" opacity=".55"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#wv)"/>
    <g font-size="24">${deco.map(([e, x, f]) => `<text x="${x}" y="${H * f}" text-anchor="middle" opacity=".7">${e}</text>`).join("")}</g>
    <g transform="translate(${W - 44},40)" opacity=".8"><circle r="22" fill="none" stroke="#7A6040" stroke-width="1.5"/><path d="M0 -20 L5 0 L0 20 L-5 0Z" fill="#D9483B"/><text y="-26" text-anchor="middle" font-size="11" fill="#7A6040" font-weight="700">N</text></g>
    <path d="${d}" fill="none" stroke="#9A7A4C" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/>
    ${pts.map(([x, y], i) => {
      const reached = i <= st.level;
      if (i === 0) return `<g><circle cx="${x}" cy="${y}" r="20" fill="#2BA59B"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18">⚓</text><text x="${x}" y="${y + 36}" text-anchor="middle" class="stop-num">출발 항구</text></g>`;
      if (chestAt.has(i)) {
        const ch = byLevel[i], ic = ch ? (ch.status === "delivered" ? "✅" : "📦") : reached ? "🎁" : "🔒";
        const label = ch ? esc(ch.reward_name) : i === n ? "전설의 보물섬" : `${i}번 보물섬`;
        return `<g><ellipse cx="${x}" cy="${y + 2}" rx="${i === n ? 40 : 30}" ry="${i === n ? 21 : 17}" fill="${reached ? "#BFD9A0" : "#D9C08A"}"/>${i === n && !ch ? `<text x="${x - 26}" y="${y + 12}" font-size="26" fill="#D9483B" font-family="Jua">X</text>` : ""}
          <text x="${x + (i === n && !ch ? 10 : 0)}" y="${y + 9}" text-anchor="middle" font-size="22">${ic}</text><text x="${x}" y="${y + 36}" text-anchor="middle" class="stop-num">${label}</text></g>`;
      }
      return `<g><circle cx="${x}" cy="${y}" r="13" fill="${reached ? "#2BA59B" : "#F1DFB6"}" stroke="${reached ? "#1E7F77" : "#9A7A4C"}" stroke-width="2"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" class="stop-num" ${reached ? 'fill="#fff"' : ""}>${i}</text></g>`;
    }).join("")}
    <g id="me-ship"><text class="ship" x="${pts[st.level][0] + 32}" y="${pts[st.level][1] - 10}" text-anchor="middle" font-size="30">${esc(S.me.avatar)}</text></g>
  </svg>`;
  return `${openBanner()}
    <div class="parch next"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><h2 style="font-size:1.3rem">${done ? "전설의 보물섬에 도착했어요! 🏆" : `다음 섬까지 ${toNext} 포인트`}</h2><span class="num" style="color:var(--ink-soft)">⛵ ${st.xp}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <small style="color:var(--ink-soft)">${nextChest ? `다음 보물섬은 ${nextChest}번 섬이에요 (${(nextChest * per - st.xp)} 포인트 남음)` : "모든 보물섬에 도착했어요!"} · 미션을 완료하면 항해 포인트가 쌓여요</small></div>
    <div class="parch mapbox">${svg}</div>`;
}

function vQuest() {
  const qs = S.quests.filter(q => subj === "전체" || q.subject === subj);
  const order = { open: 0, pending: 1, done: 2 };
  qs.sort((a, b) => order[a.status] - order[b.status]);
  return `<div class="sec-h"><h2>📜 오늘의 미션</h2><small>다 하면 "완료했어요"를 눌러요</small></div>
    <div class="chips">${["전체", "영어", "수학", "공통"].map(s => `<button class="chip" data-subj="${s}" aria-pressed="${s === subj}">${s}</button>`).join("")}</div>
    <div class="list">${qs.map(q => `<div class="parch card"><span class="ic">${SUBJ_IC[q.subject] || "⭐"}</span>
      <div><div class="t">${esc(q.title)}</div><div class="m"><span class="subj s-${esc(q.subject)}">${esc(q.subject)}</span><span>${KIND[q.kind]}</span><span>⛵ +${q.xp}</span></div></div>
      ${q.status === "done" ? `<span class="st-done">완료 ✓</span>` : q.status === "pending" ? `<span class="st-wait">선생님 확인 중…<button data-cancel="${q.requestId}">요청 취소</button></span>`
        : `<button class="btn sm" data-req="${q.id}">완료했어요!</button>`}</div>`).join("") || `<div class="parch">이 과목 미션이 아직 없어요.</div>`}</div>`;
}

function vChest() {
  const mine = [...S.chests].sort((a, b) => b.level - a.level);
  const left = S.season.chestLevels.filter(l => l > S.stats.level);
  return `<div class="sec-h"><h2>🎁 내 보물함</h2><small>보물섬에 도착하면 상자가 열려요</small></div>
    ${openBanner()}
    <div class="parch"><h3 style="margin-bottom:6px">찾은 보물</h3>
      ${mine.length ? mine.map(c => `<div class="logrow"><span>${c.reward_kind === "특권" ? "👑" : "🎁"} <b>${esc(c.reward_name)}</b> <small style="color:var(--ink-soft)">${c.level}번 보물섬</small></span>
        <b style="color:${c.status === "delivered" ? "var(--teal)" : "var(--gold-deep)"}">${c.status === "delivered" ? "받았어요" : "선생님께 받기"}</b></div>`).join("") : "<small>아직 연 보물상자가 없어요. 미션을 하고 보물섬까지 가 봐요!</small>"}</div>
    <div class="parch"><h3 style="margin-bottom:6px">남은 보물섬</h3><small style="color:var(--ink-soft)">${left.length ? left.map(l => `${l}번 섬`).join(" · ") : "모든 보물섬에 도착했어요!"}</small></div>
    <div class="parch"><h3 style="margin-bottom:6px">상자에서 나올 수 있는 보물</h3>
      ${S.pool.map(p => `<div class="logrow"><span>${p.kind === "특권" ? "👑" : "🎁"} ${esc(p.name)}</span><span class="rar ${p.rarity}">${p.rarity}</span></div>`).join("") || "<small>선생님이 보물을 준비하고 있어요</small>"}</div>`;
}

function vLog() {
  const st = S.stats, cr = S.crew, pct = cr.goal ? Math.min(100, cr.weekXp / cr.goal * 100) : 0;
  const stName = { pending: "확인 중", approved: "완료", rejected: "다시 해 봐요", canceled: "취소" };
  return `<div class="sec-h"><h2>📖 탐험 일지</h2><button class="btn line sm" style="color:var(--foam);box-shadow:inset 0 0 0 2px var(--foam)" data-logout>나가기</button></div>
    <div class="parch next"><h3>⛵ ${esc(S.me.className)} 탐험대 이번 주 항해</h3>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <small class="num" style="color:var(--ink-soft)">대원 ${cr.size}명이 함께 ${cr.weekXp}${cr.goal ? ` / ${cr.goal}` : ""} 포인트${cr.goal && cr.weekXp >= cr.goal ? " · 이번 주 목표 달성! 🎉" : ""}</small>
      <div class="crew">${cr.members.map(m => `<span>${esc(m.avatar)} ${esc(m.nickname)}</span>`).join("")}</div></div>
    <div class="parch"><h3 style="margin-bottom:10px">🏅 탐험 훈장</h3><div class="badges">${S.badges.map(b => `<div class="badge ${st.badges.includes(b.key) ? "" : "off"}"><span class="i">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join("")}</div></div>
    <div class="parch"><h3 style="margin-bottom:6px">📬 내 요청</h3>${S.requests.length ? S.requests.slice(0, 10).map(r => `<div class="logrow"><span>📜 ${esc(r.title)}</span><b style="color:${r.status === "approved" ? "var(--teal)" : r.status === "rejected" ? "var(--x)" : "var(--ink-soft)"}">${stName[r.status]}</b></div>`).join("") : "<small>아직 보낸 요청이 없어요</small>"}</div>
    <div class="parch"><h3 style="margin-bottom:6px">🧾 항해 포인트 기록</h3>${S.log.length ? S.log.map(l => `<div class="logrow"><span>${esc(l.title)}</span><span class="num ${l.xp > 0 ? "plus" : "minus"}">${l.xp > 0 ? "+" : ""}${l.xp}</span></div>`).join("") : "<small>미션을 완료하면 여기에 쌓여요</small>"}</div>
    <div class="parch"><h3 style="margin-bottom:10px">🎭 내 캐릭터</h3><div class="avatars">${S.avatars.map(a => `<button data-ava="${a}" aria-pressed="${a === S.me.avatar}">${a}</button>`).join("")}</div></div>`;
}

/* ---------- 보물상자 열기 ---------- */
async function openChest(level) {
  if (busy) return; busy = true;
  const m = $("#chestModal"), ic = $("#cm-ic");
  ic.textContent = "🎁"; ic.className = "chest-ic shake"; $("#cm-title").textContent = `${level}번 보물섬의 상자를 여는 중…`; $("#cm-sub").textContent = ""; $("#cm-close").hidden = true; m.hidden = false;
  try {
    const [r] = await Promise.all([api("/api/kid/open-chest", { level }), wait(calm() ? 0 : 1600)]);
    ic.textContent = r.reward.kind === "특권" ? "👑" : "🎉"; ic.className = "chest-ic pop";
    $("#cm-title").textContent = r.reward.name;
    $("#cm-sub").innerHTML = `<span class="rar ${r.reward.rarity}">${r.reward.rarity}</span><br><br>선생님께 보여 주고 보물을 받아요!`;
    celebrate(r.reward.rarity === "희귀" ? ["💎", "✨", "👑", "🌟"] : ["✨", "🎉", "⭐"]);
  } catch (e) {
    ic.className = "chest-ic"; ic.textContent = "🔒"; $("#cm-title").textContent = "상자가 열리지 않았어요"; $("#cm-sub").textContent = e.message;
  }
  $("#cm-close").hidden = false; $("#cm-close").focus();
  busy = false;
}
$("#cm-close").onclick = async () => { $("#chestModal").hidden = true; await load().catch(() => {}); };

/* ---------- 동작 ---------- */
async function act(fn, ok) { if (busy) return; busy = true; try { await fn(); if (ok) toast(ok); busy = false; await load(); } catch (e) { toast(e.message); } busy = false; }
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t || $("#game").hidden) return;
  if (t.dataset.go) { tab = t.dataset.go; render(); scrollTo(0, 0); }
  else if (t.dataset.subj) { subj = t.dataset.subj; render(); }
  else if (t.dataset.open) openChest(+t.dataset.open);
  else if (t.dataset.req) act(() => api("/api/kid/request-quest", { questId: +t.dataset.req }), "선생님께 확인을 요청했어요 📨");
  else if (t.dataset.cancel) act(() => api("/api/kid/cancel/" + t.dataset.cancel, {}), "요청을 취소했어요");
  else if (t.dataset.ava) act(() => api("/api/kid/avatar", { avatar: t.dataset.ava }), "캐릭터를 바꿨어요");
  else if (t.hasAttribute("data-logout")) api("/api/logout", {}).finally(() => { S = prev = null; tab = "map"; show("login"); });
});

boot();
