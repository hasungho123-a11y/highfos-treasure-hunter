/* 하이포스 트레저헌터 — screens for students (phone) and teachers (classroom screen) */
const V = window.Voyage;
const { esc, sail, dpos, voyageOf, isChest } = V;
const $ = s => document.querySelector(s);
const app = $("#app");
const KINDS = { daily: "매일", weekly: "매주", challenge: "도전" };
const SUBJECTS = ["영어", "수학", "공통"];
const RARITIES = ["보통", "희귀", "전설"];
const LOGO = "/icons/icon-192.png";
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
const pad = n => String(n).padStart(2, "0");
const fmtTime = ms => { const d = new Date(ms), t = new Date(); return d.toDateString() === t.toDateString() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtPct = r => { const v = r * 100; return (v < 10 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v)) + "%"; };
const posText = (moves, s) => { const p = dpos(moves, s.routeLen); return p === s.routeLen ? "도착 항구" : p === 0 ? "출항 대기" : `${p}/${s.routeLen}칸`; };
function nextText(moves, s) {
  const p = dpos(moves, s.routeLen);
  if (p === s.routeLen) return "도착! 다음 미션부터 새 항해가 시작돼요";
  for (let q = p + 1; q <= s.routeLen; q++) { if (isChest(q, s)) return `다음 보물섬까지 ${q - p}칸`; if (q === s.routeLen) return `도착 항구까지 ${q - p}칸`; }
  return "";
}

async function api(path, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
  let r;
  try { r = await fetch(path, { credentials: "same-origin", ...opt }); } catch (e) { throw new Error("인터넷 연결을 확인해 주세요"); }
  const d = await r.json().catch(() => ({ error: "서버 응답을 읽지 못했어요" }));
  if (r.status === 401 && !/login|setup/.test(path)) { toast("다시 로그인해 주세요"); setTimeout(() => location.reload(), 900); }
  if (!r.ok) throw new Error(d.error || "문제가 생겼어요");
  return d;
}
function toast(msg) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3600);
}
const keepInputs = root => [...root.querySelectorAll("input[id], select[id], textarea[id]")].filter(el => el.dataset.keep !== "no").map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]);
const restoreInputs = list => { for (const [id, v] of list) { const el = document.getElementById(id); if (!el) continue; if (el.type === "checkbox") el.checked = v; else el.value = v; } };
const val = id => (document.getElementById(id)?.value ?? "").trim();

/* ---------- install as an app ---------- */
let installEvt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; document.dispatchEvent(new Event("installable")); });
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installCard() {
  if (standalone() || ls.get("th_install_hide")) return "";
  const how = installEvt ? `<button class="btn primary sm" data-act="install">설치</button>`
    : isIOS() ? `<span>아래 공유 버튼 → <b style="display:inline">홈 화면에 추가</b></span>` : `<span>브라우저 메뉴 → <b style="display:inline">홈 화면에 추가</b></span>`;
  return `<div class="install"><img src="${LOGO}" alt=""><div style="flex:1;min-width:0"><b>바탕화면에 트레저헌터 앱 만들기</b>${installEvt ? `<span>한 번만 설치하면 앱처럼 바로 열려요</span>` : how}</div>
    ${installEvt ? how : ""}<button class="btn ghost sm" data-act="installHide" aria-label="닫기">✕</button></div>`;
}
async function doInstall() { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; }
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

/* =====================================================================
   LOGIN
   ===================================================================== */
const G = { mode: "code", code: "", cls: null, student: null, pin: "", err: "", busy: false, needSetup: false };
function gate(needSetup) {
  G.needSetup = needSetup;
  const qc = new URLSearchParams(location.search).get("c");
  G.code = (qc || ls.get("th_code") || "").toUpperCase();
  G.mode = needSetup ? "setup" : "code";
  if (G.code && !needSetup) loadClass(G.code, true); else renderGate();
}
async function loadClass(code, silent) {
  G.busy = true; G.err = ""; renderGate();
  try {
    G.cls = await api("/api/class", { code }); G.code = code; ls.set("th_code", code); G.mode = "name";
    const last = Number(ls.get("th_sid")); const s = G.cls.students.find(x => x.id === last);
    if (s) { G.student = s; G.mode = "pin"; G.pin = ""; }
  } catch (e) { if (!silent) G.err = e.message; G.mode = "code"; }
  G.busy = false; renderGate();
}
function renderGate() {
  const logo = `<div class="logo"><img src="${LOGO}" alt=""><div><h1>하이포스<br>방학 트레저헌터</h1></div></div>`;
  let body = "";
  if (G.mode === "code") body = `<h2>반 코드를 넣어 주세요</h2><p class="muted small">선생님이 알려 준 5글자 코드예요.</p>
    <form data-form="code" class="stack" style="gap:10px"><input type="text" id="g-code" class="codein" maxlength="5" autocomplete="off" autocapitalize="characters" value="${esc(G.code)}" aria-label="반 코드">
    <button class="btn primary lg" ${G.busy ? "disabled" : ""}>다음</button></form>
    <button class="linkbtn" data-act="gmode" data-v="teacher">선생님이에요</button>`;
  else if (G.mode === "name") body = `<div class="row between"><h2>${esc(G.cls.name)}</h2><button class="btn ghost sm" data-act="gmode" data-v="code">반 바꾸기</button></div>
    <p class="muted small">내 이름을 눌러요.</p>
    <div class="names">${G.cls.students.map(s => `<button data-act="gname" data-v="${s.id}" style="--sail:${sail(s.sail)}"><i class="dot"></i>${esc(s.nickname)}</button>`).join("") || `<p class="muted small">아직 등록된 학생이 없어요.</p>`}</div>`;
  else if (G.mode === "pin") body = `<div class="row between"><h2 style="--sail:${sail(G.student.sail)}"><i class="dot" style="width:14px;height:14px"></i> ${esc(G.student.nickname)}</h2><button class="btn ghost sm" data-act="gmode" data-v="name">내가 아니에요</button></div>
    <p class="muted small">비밀번호 숫자 4개를 눌러요.</p>
    <div class="pindots" aria-label="${G.pin.length}자리 입력됨">${[0, 1, 2, 3].map(i => `<i class="${i < G.pin.length ? "on" : ""}"></i>`).join("")}</div>
    <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-act="pin" data-v="${n}">${n}</button>`).join("")}<button data-act="pin" data-v="clr" aria-label="지우기" style="font-size:1rem">지우기</button><button data-act="pin" data-v="0">0</button><button data-act="pin" data-v="back" aria-label="한 칸 지우기">←</button></div>`;
  else if (G.mode === "teacher") body = `<h2>선생님 로그인</h2>
    <form data-form="teacher" class="stack" style="gap:10px"><label class="f">아이디<input type="text" id="g-user" autocomplete="username"></label>
    <label class="f">비밀번호<input type="password" id="g-pw" autocomplete="current-password"></label><button class="btn primary lg" ${G.busy ? "disabled" : ""}>로그인</button></form>
    <button class="linkbtn" data-act="gmode" data-v="code">학생으로 들어가기</button>`;
  else if (G.mode === "setup") body = `<h2>처음 설정</h2><p class="muted small">선생님 계정을 만들어요. 설정 코드는 배포할 때 정한 값이에요.</p>
    <form data-form="setup" class="stack" style="gap:10px"><label class="f">설정 코드<input type="password" id="s-code"></label>
    <label class="f">선생님 아이디<input type="text" id="s-user" autocomplete="username"></label>
    <label class="f">비밀번호 (8자 이상)<input type="password" id="s-pw" autocomplete="new-password"></label>
    <label class="f">비밀번호 확인<input type="password" id="s-pw2" autocomplete="new-password"></label><button class="btn primary lg" ${G.busy ? "disabled" : ""}>만들기</button></form>`;
  app.innerHTML = `<div class="gate"><div class="card">${logo}${body}${G.err ? `<p class="err" role="alert">${esc(G.err)}</p>` : ""}</div></div>`;
  document.getElementById(G.mode === "code" ? "g-code" : G.mode === "teacher" ? "g-user" : G.mode === "setup" ? "s-code" : "_")?.focus();
}
async function pinPress(v) {
  if (G.busy) return;
  if (v === "clr") G.pin = ""; else if (v === "back") G.pin = G.pin.slice(0, -1); else if (G.pin.length < 4) G.pin += v;
  G.err = ""; renderGate();
  if (G.pin.length === 4) {
    G.busy = true;
    try { await api("/api/student/login", { code: G.code, studentId: G.student.id, pin: G.pin }); ls.set("th_sid", G.student.id); location.replace("/"); }
    catch (e) { G.err = e.message; G.pin = ""; G.busy = false; renderGate(); }
  }
}
const GATE_ACTS = {
  gmode: v => { G.mode = v; G.err = ""; G.pin = ""; renderGate(); },
  gname: v => { G.student = G.cls.students.find(s => s.id === Number(v)); G.mode = "pin"; G.pin = ""; G.err = ""; renderGate(); },
  pin: pinPress
};
const GATE_FORMS = {
  code: () => { const c = val("g-code").toUpperCase(); if (c.length < 5) { G.err = "코드 5글자를 모두 넣어 주세요"; return renderGate(); } loadClass(c); },
  teacher: async () => { G.busy = true; G.err = ""; try { await api("/api/teacher/login", { username: val("g-user"), password: document.getElementById("g-pw").value }); location.replace("/"); } catch (e) { G.err = e.message; G.busy = false; renderGate(); } },
  setup: async () => {
    const pw = document.getElementById("s-pw").value; if (pw !== document.getElementById("s-pw2").value) { G.err = "비밀번호 두 개가 달라요"; return renderGate(); }
    G.busy = true; try { await api("/api/setup", { setupCode: document.getElementById("s-code").value, username: val("s-user"), password: pw }); location.replace("/"); } catch (e) { G.err = e.message; G.busy = false; renderGate(); }
  }
};

/* =====================================================================
   STUDENT
   ===================================================================== */
const K = { d: null, tab: "voyage", confirm: null, busy: false, playing: false };
const CHEST_ICON = `<svg viewBox="0 0 28 24" aria-hidden="true"><path d="M2 11 Q14 0 26 11 Z" fill="#B06B36"/><rect x="2" y="10" width="24" height="13" rx="2" fill="#8A5328"/><rect x="2" y="14" width="24" height="2.6" fill="#F1C04B"/><rect x="12" y="12" width="4" height="6" rx="1" fill="#F1C04B"/></svg>`;
async function kidLoad() { K.d = await api("/api/kid/state"); }
async function kidStart() {
  document.body.classList.add("kid");
  await kidLoad(); kidRender();
  kidVoyageFromSeen();
  setInterval(async () => { if (document.hidden || K.playing || V.running) return; const before = K.d.stats.moves; try { await kidLoad(); } catch (e) { return; } if (K.d.stats.moves !== before && K.tab === "voyage") { kidRender(); kidVoyageFromSeen(); } else kidRender(); }, 20000);
}
function kidRender() {
  const d = K.d, s = d.season, st = d.stats, me = d.me;
  const tabs = [["voyage", "항해"], ["missions", "미션"], ["shop", "상점"], ["me", "내 보물·기록"]];
  const keep = keepInputs(app);
  app.innerHTML = `<header class="top"><div class="hwrap"><div class="brand"><img src="${LOGO}" alt=""><div style="min-width:0"><h1>트레저헌터</h1><small>${esc(me.className)} · ${esc(s.name)}</small></div></div>
      <div class="hright"><span class="pt num" aria-label="내 포인트">${st.points}</span></div></div>
      <nav class="tabs" aria-label="화면">${tabs.map(([k, l]) => `<button data-act="ktab" data-v="${k}" aria-current="${K.tab === k}">${l}${k === "voyage" && st.closed ? `<span class="cnt">${st.closed}</span>` : ""}</button>`).join("")}</nav></header>
    <main>${({ voyage: kVoyage, missions: kMissions, shop: kShop, me: kMe })[K.tab]()}</main>
    ${me.mustChange ? kPinModal(true) : K.confirm?.type === "pin" ? kPinModal(false) : ""}`;
  restoreInputs(keep);
  if (K.tab === "voyage") { const map = $("#kmap"); V.placeShips(map, d.ships, s, { me: me.id }); requestAnimationFrame(() => scrollToMine()); }
}
function scrollToMine() {
  const sc = $(".mapscroll"), el = $(".ship.mine"); if (!sc || !el) return;
  const r = el.getBoundingClientRect(), sr = sc.getBoundingClientRect();
  sc.scrollLeft += (r.left + r.width / 2) - (sr.left + sr.width / 2);
}
function kVoyage() {
  const d = K.d, s = d.season, st = d.stats, p = dpos(st.moves, s.routeLen);
  const tot = d.pool.reduce((a, x) => a + x.weight, 0) || 1;
  return `${installCard()}
    <section class="panel hero"><div class="row between"><div><p class="muted small">${st.voyage}번째 항해</p><h2>${esc(d.me.nickname)}의 배 · ${posText(st.moves, s)}</h2></div></div>
      <div class="mini"><i style="width:${p / s.routeLen * 100}%"></i></div>
      <div class="stat"><span><b class="num">${st.points}</b>포인트</span><span><b class="num">${st.opened}</b>연 상자</span><span><b class="num">${st.arrivals}</b>도착</span></div>
      <p class="small muted">${nextText(st.moves, s)}</p></section>
    ${st.closed ? `<button class="chestbtn pulse" data-act="openChests">${CHEST_ICON}보물 상자 ${st.closed}개 열기!</button>` : ""}
    <div class="mapscroll"><div class="mapwrap">${V.mapHTML(s, "kmap")}</div></div>
    <p class="small muted">미션을 하고 "다 했어요"를 누르면, 선생님이 확인한 뒤 배가 앞으로 가요. 보물섬을 지나면 상자가 생기고, 도착 항구에 닿으면 ${s.arrivalPoints}포인트를 받아요.</p>
    <section class="panel"><h3>보물 상자에서 나올 수 있는 것</h3>
      <div class="odds">${[...d.pool].sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.weight - b.weight).map(x => `<div class="odd r-${esc(x.rarity)}"><div class="row between"><b>${esc(x.name)}</b><span class="rar">${esc(x.rarity)}</span></div><span class="p num">${fmtPct(x.weight / tot)}</span></div>`).join("")}</div></section>`;
}
function kMissions() {
  const qs = K.d.quests;
  const btn = q => q.status === "done" ? `<span class="pill ok">${q.kind === "daily" ? "오늘 완료" : "이번 주 완료"}</span>`
    : q.status === "pending" ? `<div class="row" style="justify-content:flex-end"><span class="pill wait">확인 기다리는 중</span><button class="btn ghost sm" data-act="kcancel" data-v="${q.requestId}">취소</button></div>`
    : `<button class="btn primary" data-act="krequest" data-v="${q.id}" ${K.busy ? "disabled" : ""}>다 했어요</button>`;
  return `<section class="panel"><h2>오늘의 미션</h2><p class="small muted">미션을 끝냈으면 "다 했어요"를 눌러요. 선생님이 확인하면 배가 앞으로 가요.</p>
    ${SUBJECTS.map(sub => { const list = qs.filter(q => q.subject === sub); return list.length ? `<h3>${sub}</h3><div class="mlist">${list.map(q => `<div class="mitem s-${esc(q.subject)}"><span class="bar"></span>
      <span><span class="t">${esc(q.title)}</span><br><span class="tag kind">${KINDS[q.kind]}</span> <span class="mv small">${q.moves}칸 전진</span></span>${btn(q)}</div>`).join("")}</div>` : ""; }).join("") || `<p class="muted">아직 미션이 없어요.</p>`}</section>`;
}
function kShop() {
  const d = K.d, pts = d.stats.points, c = K.confirm?.type === "buy" && d.shop.find(x => x.id === K.confirm.id);
  const card = x => { const out = x.stock !== null && x.stock <= 0, can = pts >= x.cost && !out;
    return `<div class="item ${c && c.id === x.id ? "sel" : ""}"><b>${esc(x.name)}</b><span class="pt num">${x.cost}</span>
      <span class="small muted">${x.stock === null ? "" : `남은 수량 ${x.stock}개`}</span>
      <button class="btn sm ${can ? "primary" : ""}" data-act="kbuyAsk" data-v="${x.id}" ${can ? "" : "disabled"}>${out ? "다 팔렸어요" : can ? "고를래요" : `${x.cost - pts}P 모자라요`}</button></div>`; };
  const orders = d.orders.filter(o => o.status === "pending");
  return `<section class="panel"><div class="row between"><h2>포인트 상점</h2><span class="pt num">${pts}</span></div>
    <p class="small muted">도착 항구에서 받은 포인트로 원하는 걸 골라요. 고르면 선생님이 챙겨 줘요.</p>
    ${c ? `<div class="confirm"><span><b>${esc(c.name)}</b>을(를) <span class="pt">${c.cost}</span>로 고를까요? 남는 포인트 ${pts - c.cost}</span><button class="btn sm primary" data-act="kbuy" data-v="${c.id}">고르기</button><button class="btn sm" data-act="kcancelConfirm">취소</button></div>` : ""}
    <h3>선물</h3><div class="shop">${d.shop.filter(x => x.kind === "선물").map(card).join("") || `<p class="muted small">없어요</p>`}</div>
    <h3>학원 특권</h3><div class="shop">${d.shop.filter(x => x.kind === "특권").map(card).join("") || `<p class="muted small">없어요</p>`}</div></section>
    ${orders.length ? `<section class="panel"><h3>선생님이 챙겨 줄 것</h3><div class="plist">${orders.map(o => `<div class="prow"><span>${esc(o.name)}</span><span class="small muted">${fmtTime(o.created_at)}</span><span class="pill wait">준비 중</span></div>`).join("")}</div></section>` : ""}`;
}
function kMe() {
  const d = K.d, st = d.stats;
  const got = d.chests.filter(c => c.status !== "closed");
  return `<section class="panel"><h2>내 보물</h2>
    ${got.length ? `<div class="plist">${got.map(c => `<div class="prow"><span>${esc(c.reward)} <span class="rar r-${esc(c.rarity)}">${esc(c.rarity)}</span></span><span class="small muted">${c.voyage}번째 항해 ${c.stop}칸</span>
      ${c.status === "opened" ? `<span class="pill wait">받을 차례</span>` : `<span class="pill ok">받음</span>`}</div>`).join("")}</div>` : `<p class="muted small">아직 연 상자가 없어요. 보물섬까지 가 봐요!</p>`}</section>
    <section class="panel"><h3>배지</h3><div class="badges">${d.badges.map(b => `<span class="badge ${st.badges.includes(b.key) ? "" : "off"}" title="${esc(b.desc)}">${esc(b.name)}</span>`).join("")}</div></section>
    <section class="panel feed"><h3>항해 일지</h3>${d.log.length ? `<ul>${d.log.map(l => `<li><time class="num">${fmtTime(l.at)}</time><span>${esc(l.title)}</span><span class="small">${l.moves ? `<span class="mv num">${l.moves > 0 ? "+" : ""}${l.moves}칸</span> ` : ""}${l.points ? `<span class="pt num">${l.points > 0 ? "+" : ""}${l.points}</span>` : ""}</span></li>`).join("")}</ul>` : `<p class="muted small">아직 기록이 없어요.</p>`}</section>
    <section class="panel"><h3>내 배 꾸미기</h3><div class="sails">${V.SAILS.map((c, i) => `<button style="--sail:${c}" data-act="ksail" data-v="${i}" aria-pressed="${d.me.sail === i}" aria-label="돛 색 ${i + 1}"></button>`).join("")}</div>
      <div class="row"><button class="btn" data-act="kpinAsk">비밀번호 바꾸기</button><button class="btn ghost" data-act="logout">로그아웃</button></div></section>`;
}
function kPinModal(forced) {
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pin-h"><div class="panel"><h2 id="pin-h">${forced ? "나만의 비밀번호 정하기" : "비밀번호 바꾸기"}</h2>
    <p class="small muted">${forced ? "선생님이 준 임시 비밀번호 대신 나만 아는 숫자 4개로 바꿔요." : "새 비밀번호 숫자 4개를 넣어요."}</p>
    <form data-form="kpin" class="stack" style="gap:10px"><input type="password" id="kp1" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="숫자 4개" data-keep="no" required>
    <input type="password" id="kp2" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="한 번 더" data-keep="no" required>
    <div class="row"><button class="btn primary">정하기</button>${forced ? "" : `<button type="button" class="btn" data-act="kcancelConfirm">취소</button>`}</div></form></div></div>`;
}
// sail the ship from where this phone last saw it, opening chests on the way
async function kidVoyageFromSeen() {
  const d = K.d, s = d.season, L = s.routeLen, key = "th_seen_" + d.me.id + "_" + s.id, seen = Number(ls.get(key));
  const now = d.stats.moves;
  if (ls.get(key) === null || seen > now) { ls.set(key, now); return; }
  if (seen === now || K.playing) return;
  const closed = d.chests.filter(c => c.status === "closed"), events = [];
  for (let u = seen + 1; u <= now; u++) {
    const p = dpos(u, L), v = voyageOf(u, L);
    if (p === L) events.push({ u, type: "arrive", points: s.arrivalPoints });
    else if (isChest(p, s)) { const c = closed.find(x => x.voyage === v && x.stop === p); if (c) events.push({ u, type: "chest", chestId: c.id, stop: p, status: "closed" }); }
  }
  K.playing = true;
  const map = $("#kmap"); if (!map) { K.playing = false; return; }
  map.scrollIntoView({ block: "center", behavior: "smooth" });
  await new Promise(r => setTimeout(r, 400));
  await V.runVoyage(map, [{ studentId: d.me.id, name: d.me.nickname, b: seen, a: now, m: now - seen, title: "선생님이 확인했어요", events }], s, id => api(`/api/kid/open/${id}`, {}).then(r => r.reward), { banner: false, stage: true });
  ls.set(key, now); K.playing = false;
  await kidLoad(); kidRender();
}
const KID_ACTS = {
  ktab: v => { K.tab = v; K.confirm = null; kidRender(); scrollTo(0, 0); if (v === "voyage") kidVoyageFromSeen(); },
  krequest: async v => { K.busy = true; try { await api("/api/kid/request", { questId: Number(v) }); toast("선생님께 확인을 요청했어요"); await kidLoad(); } catch (e) { toast(e.message); } K.busy = false; kidRender(); },
  kcancel: async v => { try { await api(`/api/kid/cancel/${v}`, {}); await kidLoad(); kidRender(); } catch (e) { toast(e.message); } },
  kbuyAsk: v => { K.confirm = { type: "buy", id: Number(v) }; kidRender(); },
  kbuy: async v => { K.confirm = null; try { await api(`/api/kid/buy/${v}`, {}); toast("골랐어요! 선생님이 챙겨 줄 거예요"); await kidLoad(); } catch (e) { toast(e.message); } kidRender(); },
  kcancelConfirm: () => { K.confirm = null; kidRender(); },
  ksail: async v => { try { await api("/api/kid/sail", { sail: Number(v) }); await kidLoad(); kidRender(); } catch (e) { toast(e.message); } },
  kpinAsk: () => { K.confirm = { type: "pin" }; kidRender(); },
  openChests: async () => {
    const list = K.d.chests.filter(c => c.status === "closed").reverse();
    K.playing = true;
    const got = await V.stageChests(list, K.d.me.nickname, id => api(`/api/kid/open/${id}`, {}).then(r => r.reward));
    K.playing = false;
    await kidLoad(); K.tab = got.length ? "voyage" : K.tab; kidRender();
  }
};
const KID_FORMS = {
  kpin: async () => { const a = val("kp1"), b = val("kp2"); if (!/^\d{4}$/.test(a)) return toast("숫자 4개로 정해 주세요"); if (a !== b) return toast("두 번 넣은 숫자가 달라요");
    try { await api("/api/kid/pin", { pin: a }); K.confirm = null; toast("비밀번호를 정했어요. 꼭 기억해요!"); await kidLoad(); kidRender(); } catch (e) { toast(e.message); } }
};

/* =====================================================================
   TEACHER
   ===================================================================== */
const T = { d: null, tab: "map", cls: "all", subj: "전체", selQuest: null, selStudents: new Set(), selReq: new Set(), detail: null, detailData: null, confirm: null, editQuest: null, editPool: null, editShop: null, created: null, shipPrev: null };
const TTABS = [["map", "항해 지도"], ["grant", "미션 지급"], ["crew", "반·선원"], ["treasure", "보물·상점"], ["quests", "미션 관리"], ["season", "항해 설정"]];
async function tLoad() { T.d = await api("/api/t/state"); }
async function teacherStart() {
  await tLoad();
  T.shipPrev = Object.fromEntries(T.d.students.map(s => [s.id, s.stats.moves]));
  tRender();
  setInterval(async () => {
    if (document.hidden || V.running || !["map", "grant", "treasure"].includes(T.tab)) return;
    const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    try { await tLoad(); tRender(); } catch (e) {}
  }, 15000);
}
const tStudents = () => T.d.students.filter(s => T.cls === "all" || s.class_id === Number(T.cls)).sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
const sname = id => T.d.students.find(s => s.id === id)?.nickname || "삭제된 학생";
const cname = id => T.d.classes.find(c => c.id === id)?.name || "";
function tRender() {
  if (V.running) return;
  const d = T.d, reqN = d.requests.length, delN = d.chests.filter(c => c.status === "opened").length + d.orders.length;
  const keep = keepInputs(app), focus = document.activeElement?.id;
  app.innerHTML = `<header class="top"><div class="hwrap"><div class="brand"><img src="${LOGO}" alt=""><div style="min-width:0"><h1>하이포스 트레저헌터</h1><small>${esc(d.season.name)} · 선생님</small></div></div>
      <div class="hright"><button class="btn ghost sm" data-act="logout">로그아웃</button></div></div>
      <nav class="tabs" aria-label="화면">${TTABS.map(([k, l]) => `<button data-act="ttab" data-v="${k}" aria-current="${T.tab === k}">${l}${k === "grant" && reqN ? `<span class="cnt">${reqN}</span>` : ""}${k === "treasure" && delN ? `<span class="cnt">${delN}</span>` : ""}</button>`).join("")}</nav></header>
    <main>${({ map: tMap, grant: tGrant, crew: tCrew, treasure: tTreasure, quests: tQuests, season: tSeason })[T.tab]()}</main>`;
  restoreInputs(keep); if (focus) document.getElementById(focus)?.focus();
  if (T.tab === "map") {
    const ships = tStudents().map(s => ({ id: s.id, nickname: s.nickname, sail: s.sail, moves: s.stats.moves }));
    V.placeShips($("#tmap"), ships, d.season, { prev: T.shipPrev });
    for (const s of d.students) T.shipPrev[s.id] = s.stats.moves;
  }
}
function classChips(withAll = true) {
  if (T.d.classes.length < 2 && withAll) return "";
  return `<div class="chips" role="group" aria-label="반">${withAll ? `<button class="chip" data-act="tcls" data-v="all" aria-pressed="${T.cls === "all"}">전체</button>` : ""}${T.d.classes.map(c => `<button class="chip" data-act="tcls" data-v="${c.id}" aria-pressed="${String(T.cls) === String(c.id)}">${esc(c.name)}</button>`).join("")}</div>`;
}
function demoCard() {
  return `<section class="panel"><div class="empty"><h3>아직 반과 학생이 없어요</h3><p>반을 만들고 학생을 등록하거나, 선생님들께 보여 드릴 시연용 반을 한 번에 만들 수 있어요.</p>
    <div class="row" style="justify-content:center"><button class="btn primary" data-act="demo">시연용 예시 반 만들기</button><button class="btn" data-act="ttab" data-v="crew">직접 반 만들기</button></div></div></section>`;
}
function tMap() {
  const d = T.d, s = d.season, list = tStudents();
  const wk = list.reduce((a, x) => a + x.stats.weekMoves, 0), goal = s.weeklyClassGoal || 0, tot = d.pool.reduce((a, x) => a + x.weight, 0) || 1;
  return `<section class="panel"><div class="row between"><div><h2>${esc(s.name)}</h2><p class="small muted">미션을 하나 끝낼 때마다 배가 나아가요. 보물섬을 지나면 상자를 열고, 도착 항구에 닿으면 ${s.arrivalPoints}포인트를 받아요.</p></div>
      <div class="row">${classChips()}<button class="btn sm" data-act="full">크게 보기</button></div></div>
      ${goal ? `<div class="goal" role="progressbar" aria-label="이번 주 함께 항해한 거리" aria-valuenow="${wk}" aria-valuemax="${goal}"><i style="width:${Math.min(100, wk / goal * 100)}%"></i></div>
      <p class="small"><b class="mv num">${wk}칸</b> <span class="muted">/ 이번 주 목표 ${goal}칸 ${wk >= goal ? "· 목표 달성!" : `· ${goal - wk}칸 남았어요`}</span></p>` : ""}</section>
    <div class="mapscroll"><div class="mapwrap" id="mapwrap">${V.mapHTML(s, "tmap")}</div></div>
    <div class="legend"><span><i style="background:#FFE59A;box-shadow:inset 0 0 0 2px #9C6A22"></i>보물섬: 지나가면 보물 상자</span><span><i style="background:var(--coral)"></i>도착 항구: ${s.arrivalPoints}포인트 받고 다음 항해 출발</span></div>
    ${d.students.length ? "" : demoCard()}
    <section class="panel"><div class="row between"><h3>보물 상자에서 나올 수 있는 것</h3><span class="small muted">보물섬 ${s.treasureEvery}칸마다 · 상자 하나에 하나</span></div>
      <div class="odds">${[...d.pool].sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.weight - b.weight).map(x => `<div class="odd r-${esc(x.rarity)}"><div class="row between"><b>${esc(x.name)}</b><span class="rar">${esc(x.rarity)}</span></div><span class="p num">${fmtPct(x.weight / tot)}</span></div>`).join("")}</div></section>`;
}
function tGrant() {
  const d = T.d, s = d.season;
  if (!d.students.length) return demoCard();
  const reqs = d.requests.filter(r => T.cls === "all" || d.students.find(x => x.id === r.student_id)?.class_id === Number(T.cls));
  const quests = d.quests.filter(q => q.active && (T.subj === "전체" || q.subject === T.subj));
  const q = d.quests.find(x => x.id === T.selQuest), list = tStudents(), n = T.selStudents.size;
  for (const id of [...T.selStudents]) if (!list.some(x => x.id === id)) T.selStudents.delete(id);
  for (const id of [...T.selReq]) if (!reqs.some(r => r.id === id)) T.selReq.delete(id);
  const ahead = (x, m) => { for (let u = x.stats.moves + 1; u <= x.stats.moves + m; u++) { const p = dpos(u, s.routeLen); if (p === s.routeLen) return "도착!"; if (isChest(p, s)) return "보물섬"; } return ""; };
  const recent = d.logs.slice(0, 30);
  const sn = T.selReq.size;
  return `${reqs.length ? `<section class="panel"><div class="row between"><div><h2>학생이 "다 했어요" 누른 미션</h2><p class="small muted">확인하고 승인하면 지도에서 배가 움직이고 보물 상자가 열려요.</p></div>
      <div class="row"><button class="btn sm ghost" data-act="reqAll">모두 선택</button><button class="btn sm ghost" data-act="reqNone">선택 해제</button></div></div>
      ${classChips()}
      <div class="plist">${reqs.map(r => { const st = d.students.find(x => x.id === r.student_id);
        return `<button class="req" data-act="reqPick" data-v="${r.id}" aria-pressed="${T.selReq.has(r.id)}"><input type="checkbox" tabindex="-1" ${T.selReq.has(r.id) ? "checked" : ""} aria-hidden="true">
          <span style="--sail:${sail(st?.sail)}"><b><i class="dot"></i> ${esc(st?.nickname)}</b> <span class="muted small">${esc(cname(st?.class_id))}</span><br>${esc(r.title)} <span class="tag t-${esc(r.subject)}">${esc(r.subject)}</span></span>
          <span class="mv small">${r.moves}칸${st && ahead(st, r.moves) ? ` · ${ahead(st, r.moves)}` : ""}</span></button>`; }).join("")}</div>
      <div class="row"><button class="btn primary" data-act="approve" ${sn ? "" : "disabled"}>${sn ? `${sn}개 승인하고 출항` : "승인할 미션을 고르세요"}</button><button class="btn" data-act="reject" ${sn ? "" : "disabled"}>반려</button></div></section>` : ""}
    <div class="cols">
    <section class="panel"><h2>직접 지급 ① 미션</h2>
      <div class="chips">${["전체", ...SUBJECTS].map(x => `<button class="chip" data-act="tsubj" data-v="${x}" aria-pressed="${T.subj === x}">${x}</button>`).join("")}</div>
      <div class="qlist">${quests.map(x => `<button class="quest s-${esc(x.subject)}" data-act="pickq" data-v="${x.id}" aria-pressed="${x.id === T.selQuest}"><span class="bar"></span>
        <span class="t">${esc(x.title)}<br><span class="tag kind">${KINDS[x.kind]}</span> <span class="tag t-${esc(x.subject)}">${esc(x.subject)}</span></span><span class="mv num">${x.moves}칸</span></button>`).join("") || `<p class="muted small">미션 관리에서 미션을 추가하세요.</p>`}</div></section>
    <div class="stack">
      <section class="panel"><div class="row between"><h2>② 해낸 학생</h2><div class="row"><button class="btn sm ghost" data-act="selall">모두 선택</button><button class="btn sm ghost" data-act="selnone">선택 해제</button></div></div>
        ${classChips()}
        ${q ? `<p class="small muted">고른 학생의 배가 <b class="mv">${q.moves}칸</b> 앞으로 가요.${q.kind !== "challenge" ? ` ${KINDS[q.kind]} 미션은 ${q.kind === "daily" ? "하루" : "한 주"}에 한 번만 받아요.` : ""}</p>` : `<p class="small muted">왼쪽에서 미션을 먼저 고르세요.</p>`}
        <div class="sgrid">${list.map(x => { const a = q ? ahead(x, q.moves) : "";
          return `<button class="spick" style="--sail:${sail(x.sail)}" data-act="picks" data-v="${x.id}" aria-pressed="${T.selStudents.has(x.id)}" ${q ? "" : "disabled"}>
            <span class="nm"><i class="dot"></i>${esc(x.nickname)}</span><span class="small muted">${x.stats.voyage}번째 · ${posText(x.stats.moves, s)}</span>
            <span class="mini"><i style="width:${dpos(x.stats.moves, s.routeLen) / s.routeLen * 100}%"></i></span>${a ? `<span class="small" style="color:var(--gold);font-weight:700">이번에 ${a}</span>` : ""}</button>`; }).join("")}</div>
        <div class="row"><button class="btn primary" data-act="grant" ${q && n ? "" : "disabled"}>${n ? `${n}명 출항시키기` : "학생을 고르세요"}</button></div></section>
      <section class="panel feed"><h3>오늘 기록</h3>${recent.length ? `<ul>${recent.map(l => { const sub = l.kind === "arrive" || l.kind === "bonus";
        return `<li class="${sub ? "sub" : ""}"><time class="num">${sub ? "" : fmtTime(l.at)}</time><span>${sub ? "" : `<b>${esc(sname(l.student_id))}</b> · `}${esc(l.title)}${l.moves ? ` <span class="mv num small">${l.moves > 0 ? "+" : ""}${l.moves}칸</span>` : ""}${l.points ? ` <span class="pt num small">${l.points > 0 ? "+" : ""}${l.points}</span>` : ""}</span>
        ${sub || l.kind === "buy" ? "<span></span>" : `<button class="btn sm ghost" data-act="undo" data-v="${l.id}">취소</button>`}</li>`; }).join("")}</ul>` : `<p class="muted small">오늘 지급한 기록이 여기 쌓여요. 취소하면 그때 생긴 열지 않은 상자와 도착 포인트도 함께 취소돼요.</p>`}</section>
    </div></div>`;
}
function tCrew() {
  const d = T.d, s = d.season, list = tStudents(), base = location.origin;
  const det = T.detail && d.students.find(x => x.id === T.detail);
  return `<section class="panel"><h2>반</h2>
    ${d.classes.length ? `<div class="tablewrap"><table><thead><tr><th>반</th><th>반 코드</th><th>학생 접속 주소</th><th>학생</th><th></th></tr></thead><tbody>
      ${d.classes.map(c => { const cf = T.confirm?.type === "delClass" && T.confirm.id === c.id;
        return `<tr><td><b>${esc(c.name)}</b></td><td><span class="code">${esc(c.code)}</span></td><td class="small"><span class="muted">${esc(base)}/?c=${esc(c.code)}</span> <button class="btn sm ghost" data-act="copy" data-v="${esc(base)}/?c=${esc(c.code)}">복사</button></td>
        <td class="num">${d.students.filter(x => x.class_id === c.id).length}명</td>
        <td>${cf ? `<span class="row"><button class="btn sm danger" data-act="delClass" data-v="${c.id}">반과 학생 모두 삭제</button><button class="btn sm" data-act="tcancel">취소</button></span>` : `<button class="btn sm ghost" data-act="askDelClass" data-v="${c.id}">삭제</button>`}</td></tr>`; }).join("")}
    </tbody></table></div>` : ""}
    <form class="row" data-form="addClass"><label class="f">새 반 이름<input type="text" id="nc-name" maxlength="20" placeholder="예: 초4 수학 A" required></label><button class="btn primary" style="align-self:end">반 만들기</button>
      ${d.classes.length ? "" : `<button type="button" class="btn" style="align-self:end" data-act="demo">시연용 예시 반 만들기</button>`}</form>
    <p class="small muted">학생은 접속 주소를 열거나 반 코드를 넣고, 자기 이름을 누른 뒤 비밀번호 4자리로 들어와요. 처음 들어오면 자기만의 비밀번호로 바꾸게 돼요.</p></section>
    ${d.classes.length ? `<section class="panel"><h2>선원 등록</h2>
      <form class="stack" style="gap:10px" data-form="addStudents"><div class="row"><label class="f">반<select id="ns-class">${d.classes.map(c => `<option value="${c.id}" ${String(T.cls) === String(c.id) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
      <label class="f">이름 (여러 명이면 줄을 바꿔서)<textarea id="ns-names" placeholder="김하늘&#10;이서준&#10;박지우" data-keep="no"></textarea></label>
      <div><button class="btn primary">등록하고 임시 비밀번호 만들기</button></div></form>
      ${T.created ? `<div class="confirm" style="display:grid;gap:8px"><b>임시 비밀번호 — 아이들에게 알려 주세요 (이 화면을 벗어나면 다시 볼 수 없어요)</b>
        <div class="tablewrap"><table><tbody>${T.created.map(c => `<tr><td>${esc(c.nickname)}</td><td><span class="code">${c.pin}</span></td></tr>`).join("")}</tbody></table></div><div><button class="btn sm" data-act="clearCreated">확인했어요</button></div></div>` : ""}
      <p class="small muted">개인정보 보호를 위해 이름 대신 별명을 써도 괜찮아요.</p></section>` : ""}
    ${d.students.length ? `<section class="panel"><div class="row between"><h2>선원 명단</h2>${classChips()}</div>
      <div class="tablewrap"><table><thead><tr><th>이름</th><th>반</th><th>항해</th><th>위치</th><th>포인트</th><th>안 연 상자</th><th>상태</th></tr></thead><tbody>
      ${list.map(x => `<tr class="click" data-act="detail" data-v="${x.id}" aria-selected="${T.detail === x.id}"><td style="--sail:${sail(x.sail)}"><b><i class="dot"></i> ${esc(x.nickname)}</b></td><td class="muted">${esc(cname(x.class_id))}</td>
        <td class="num">${x.stats.voyage}번째</td><td class="num">${posText(x.stats.moves, s)}</td><td><span class="pt num">${x.stats.points}</span></td><td class="num">${x.stats.closed || "-"}</td>
        <td>${x.locked ? `<span class="pill wait">잠김</span>` : x.must_change ? `<span class="pill info">첫 접속 전</span>` : ""}</td></tr>`).join("")}
      </tbody></table></div><p class="small muted">학생을 누르면 기록과 보물을 볼 수 있어요.</p></section>` : ""}
    ${det ? tDetail(det) : ""}`;
}
function tDetail(x) {
  const s = T.d.season, dd = T.detailData, cf = T.confirm?.type === "delStudent" && T.confirm.id === x.id;
  return `<section class="panel" id="detail" style="--sail:${sail(x.sail)}"><div class="row between"><div><h2><i class="dot" style="width:14px;height:14px"></i> ${esc(x.nickname)}</h2><p class="small muted">${esc(cname(x.class_id))} · ${x.stats.voyage}번째 항해 · ${posText(x.stats.moves, s)} · ${nextText(x.stats.moves, s)}</p></div>
      <div class="row"><span class="pt num">${x.stats.points} 포인트</span><button class="btn sm ghost" data-act="closeDetail">닫기</button></div></div>
    <div class="badges">${T.d.badges.map(b => `<span class="badge ${x.stats.badges.includes(b.key) ? "" : "off"}" title="${esc(b.desc)}">${esc(b.name)}</span>`).join("")}</div>
    ${!dd ? `<p class="muted small">불러오는 중…</p>` : `
    <h3>보물 상자</h3>${dd.chests.length ? `<div class="plist">${dd.chests.map(c => `<div class="prow"><span>${c.status === "closed" ? "아직 안 연 상자" : esc(c.reward)} ${c.rarity ? `<span class="rar r-${esc(c.rarity)}">${esc(c.rarity)}</span>` : ""}</span><span class="small muted">${c.voyage}번째 ${c.stop}칸</span>
      ${c.status === "closed" ? `<span class="pill info">닫힘</span>` : c.status === "opened" ? `<button class="btn sm primary" data-act="deliverChest" data-v="${c.id}">줬어요</button>` : `<span class="pill ok">받음</span>`}</div>`).join("")}</div>` : `<p class="muted small">아직 없어요.</p>`}
    <h3>항해 일지</h3><div class="feed">${dd.logs.length ? `<ul>${dd.logs.map(l => `<li><time class="num">${fmtTime(l.at)}</time><span>${esc(l.title)} ${l.moves ? `<span class="mv num small">${l.moves > 0 ? "+" : ""}${l.moves}칸</span>` : ""} ${l.points ? `<span class="pt num small">${l.points > 0 ? "+" : ""}${l.points}</span>` : ""}</span>
      ${["quest", "adjust"].includes(l.kind) ? `<button class="btn sm ghost" data-act="undo" data-v="${l.id}">취소</button>` : "<span></span>"}</li>`).join("")}</ul>` : `<p class="muted small">아직 기록이 없어요.</p>`}</div>`}
    <h3>직접 조정</h3><form class="row" data-form="adjust"><select id="adj-type"><option value="points">포인트</option><option value="moves">칸</option></select>
      <input type="number" id="adj-amt" placeholder="+10 / -5" required><input type="text" id="adj-why" placeholder="사유 (예: 발표 잘함)" maxlength="40" style="flex:1 1 160px"><button class="btn">반영</button></form>
    <p class="small muted">칸을 직접 옮기면 보물섬과 도착 보상은 생기지 않아요. 보상까지 주려면 미션으로 지급하세요.</p>
    <div class="row"><form class="row" data-form="rename"><input type="text" id="rn-name" value="${esc(x.nickname)}" maxlength="12" data-keep="no"><button class="btn sm">이름 바꾸기</button></form>
      <button class="btn sm" data-act="resetPin" data-v="${x.id}">임시 비밀번호 새로 만들기</button>
      ${cf ? `<span class="confirm d"><span>삭제할까요? 지도와 명단에서 사라져요.</span><button class="btn sm danger" data-act="delStudent" data-v="${x.id}">삭제</button><button class="btn sm" data-act="tcancel">취소</button></span>` : `<button class="btn sm ghost" data-act="askDelStudent" data-v="${x.id}">학생 삭제</button>`}</div>
  </section>`;
}
function tTreasure() {
  const d = T.d, opened = d.chests.filter(c => c.status === "opened"), closedN = d.chests.filter(c => c.status === "closed").length;
  const tot = d.pool.reduce((a, x) => a + x.weight, 0) || 1, ep = d.pool.find(x => x.id === T.editPool), es = d.shop.find(x => x.id === T.editShop);
  return `<section class="panel"><div class="row between"><h2>건네줄 것</h2><span class="small muted">실제로 건넨 뒤 '줬어요'를 눌러요</span></div>
    ${opened.length || d.orders.length ? `<div class="plist">
      ${opened.map(c => `<div class="prow"><span><b>${esc(sname(c.student_id))}</b> · ${esc(c.reward)} <span class="rar r-${esc(c.rarity)}">${esc(c.rarity)}</span> <span class="small muted">보물 상자</span></span><span class="small muted">${fmtTime(c.opened_at)}</span><button class="btn sm primary" data-act="deliverChest" data-v="${c.id}">줬어요</button></div>`).join("")}
      ${d.orders.map(o => `<div class="prow"><span><b>${esc(sname(o.student_id))}</b> · ${esc(o.name)} <span class="pt small">${o.cost}</span> <span class="small muted">상점</span></span><button class="btn sm ghost" data-act="cancelOrder" data-v="${o.id}">취소(환불)</button><button class="btn sm primary" data-act="deliverOrder" data-v="${o.id}">줬어요</button></div>`).join("")}</div>`
      : `<p class="muted small">지금 건네줄 것이 없어요.</p>`}
    ${closedN ? `<p class="small muted">아이들이 아직 열지 않은 상자가 ${closedN}개 있어요. 아이 휴대폰이나 지도 화면에서 열 수 있어요.</p>` : ""}</section>
    <section class="panel"><div class="row between"><h2>보물 상자 목록</h2><span class="small muted">비중이 클수록 잘 나와요</span></div>
      <div class="tablewrap"><table><thead><tr><th>보물</th><th>등급</th><th>비중</th><th>확률</th><th>바로 들어가는 포인트</th><th></th></tr></thead><tbody>
      ${d.pool.map(x => `<tr><td><b>${esc(x.name)}</b></td><td><span class="rar r-${esc(x.rarity)}">${esc(x.rarity)}</span></td><td class="num">${x.weight}</td><td class="num">${fmtPct(x.weight / tot)}</td><td>${x.points ? `<span class="pt num">${x.points}</span>` : `<span class="muted">-</span>`}</td>
        <td class="row"><button class="btn sm ghost" data-act="editPool" data-v="${x.id}">수정</button><button class="btn sm ghost" data-act="delPool" data-v="${x.id}">삭제</button></td></tr>`).join("")}</tbody></table></div>
      <form class="row" data-form="savePool"><label class="f" style="flex:1 1 180px">${ep ? "보물 수정" : "보물 이름"}<input type="text" id="np-name" maxlength="30" required placeholder="예: 피자 한 판" value="${esc(ep?.name || "")}" data-keep="no"></label>
        <label class="f">등급<select id="np-rar" data-keep="no">${RARITIES.map(r => `<option ${ep?.rarity === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
        <label class="f">비중<input type="number" id="np-w" min="1" value="${ep?.weight ?? 5}" required data-keep="no"></label>
        <label class="f">바로 포인트<input type="number" id="np-pts" min="0" value="${ep?.points || ""}" placeholder="없음" data-keep="no"></label>
        <button class="btn primary" style="align-self:end">${ep ? "저장" : "추가"}</button>${ep ? `<button type="button" class="btn ghost" style="align-self:end" data-act="cancelEdit">취소</button>` : ""}</form>
      <p class="small muted">'바로 포인트'를 넣은 보물은 상자를 여는 순간 포인트가 들어가요. 전설 등급은 상자가 오래, 세게 흔들리다 열려요.</p></section>
    <section class="panel"><h2>포인트 상점</h2>
      <div class="tablewrap"><table><thead><tr><th>상품</th><th>종류</th><th>포인트</th><th>수량</th><th></th></tr></thead><tbody>
      ${d.shop.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.kind)}</td><td><span class="pt num">${x.cost}</span></td><td class="num">${x.stock === null ? "무제한" : x.stock}</td>
        <td class="row"><button class="btn sm ghost" data-act="editShop" data-v="${x.id}">수정</button><button class="btn sm ghost" data-act="delShop" data-v="${x.id}">삭제</button></td></tr>`).join("")}</tbody></table></div>
      <form class="row" data-form="saveShop"><label class="f" style="flex:1 1 180px">${es ? "상품 수정" : "상품 이름"}<input type="text" id="nr-name" maxlength="30" required placeholder="예: 아이스크림" value="${esc(es?.name || "")}" data-keep="no"></label>
        <label class="f">종류<select id="nr-kind" data-keep="no"><option ${es?.kind === "선물" ? "selected" : ""}>선물</option><option ${es?.kind === "특권" ? "selected" : ""}>특권</option></select></label>
        <label class="f">포인트<input type="number" id="nr-cost" min="1" value="${es?.cost ?? 30}" required data-keep="no"></label>
        <label class="f">수량 (비우면 무제한)<input type="number" id="nr-stock" min="0" value="${es && es.stock !== null ? es.stock : ""}" data-keep="no"></label>
        <button class="btn primary" style="align-self:end">${es ? "저장" : "추가"}</button>${es ? `<button type="button" class="btn ghost" style="align-self:end" data-act="cancelEdit">취소</button>` : ""}</form></section>`;
}
function tQuests() {
  const qs = T.d.quests, e = qs.find(q => q.id === T.editQuest);
  return `<section class="panel"><h2>${e ? "미션 수정" : "새 미션"}</h2>
    <form class="row" data-form="saveQuest"><label class="f" style="flex:1 1 220px">내용<input type="text" id="nq-title" required maxlength="40" placeholder="예: 영어 단어 20개 외우기" value="${esc(e?.title || "")}" data-keep="no"></label>
      <label class="f">과목<select id="nq-subj" data-keep="no">${SUBJECTS.map(x => `<option ${e?.subject === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label class="f">주기<select id="nq-kind" data-keep="no">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${e?.kind === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="f">전진 칸<input type="number" id="nq-mv" min="1" max="10" value="${e?.moves ?? 1}" required data-keep="no"></label>
      <button class="btn primary" style="align-self:end">${e ? "저장" : "추가"}</button>${e ? `<button type="button" class="btn ghost" style="align-self:end" data-act="cancelEdit">취소</button>` : ""}</form>
    <p class="small muted">매일 미션은 하루 한 번, 매주 미션은 한 주(월~일)에 한 번만 받을 수 있어요. 도전 미션은 제한이 없어요.</p></section>
    <section class="panel"><h2>미션 목록</h2>${qs.length ? `<div class="tablewrap"><table><thead><tr><th>내용</th><th>과목</th><th>주기</th><th>전진</th><th>학생에게 보이기</th><th></th></tr></thead><tbody>
      ${qs.map(q => `<tr><td>${esc(q.title)}</td><td><span class="tag t-${esc(q.subject)}">${esc(q.subject)}</span></td><td>${KINDS[q.kind]}</td><td class="mv num">${q.moves}칸</td>
        <td><button class="btn sm ${q.active ? "primary" : ""}" data-act="toggleQuest" data-v="${q.id}">${q.active ? "켜짐" : "꺼짐"}</button></td>
        <td class="row"><button class="btn sm ghost" data-act="editQuest" data-v="${q.id}">수정</button><button class="btn sm ghost" data-act="delQuest" data-v="${q.id}">삭제</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">위에서 첫 미션을 추가하세요.</p>`}</section>`;
}
function tSeason() {
  const s = T.d.season, cf = T.confirm?.type === "newVoyage";
  return `<section class="panel"><h2>항로</h2>
    <form class="row" data-form="saveSeason"><label class="f" style="flex:1 1 200px">항해 이름<input type="text" id="se-name" value="${esc(s.name)}" maxlength="30" required data-keep="no"></label>
      <label class="f">항로 길이 (칸)<input type="number" id="se-len" min="6" max="40" value="${s.routeLen}" required data-keep="no"></label>
      <label class="f">보물섬 간격<input type="number" id="se-every" min="2" max="40" value="${s.treasureEvery}" required data-keep="no"></label>
      <label class="f">도착 포인트<input type="number" id="se-pts" min="0" value="${s.arrivalPoints}" required data-keep="no"></label>
      <label class="f">반 주간 목표 (칸)<input type="number" id="se-goal" min="0" value="${s.weeklyClassGoal}" data-keep="no"></label>
      <button class="btn primary" style="align-self:end">저장</button></form>
    <p class="small muted">${s.routeLen}칸 항로에 보물섬이 ${Math.floor((s.routeLen - 1) / s.treasureEvery)}곳 있어요. 항해 도중 길이를 바꾸면 배 위치가 다시 계산돼요.</p></section>
    <section class="panel"><h2>새 항해 시작</h2><p class="muted">모든 배가 출항 지점으로 돌아가요. 포인트, 받은 보물, 배지는 그대로 남아요.</p>
      ${cf ? `<form class="confirm d" data-form="newVoyage"><input type="text" id="nv-name" required maxlength="30" placeholder="새 항해 이름 (예: 봄방학 항해)" data-keep="no"><button class="btn sm danger">시작하기</button><button type="button" class="btn sm" data-act="tcancel">취소</button></form>`
        : `<div><button class="btn" data-act="askNewVoyage">새 항해 시작…</button></div>`}</section>
    <section class="panel"><h2>시연</h2><p class="muted">선생님들께 보여 드릴 때 쓰는 예시 반이에요. 학생 8명이 항로 곳곳에 떠 있고, 비밀번호는 모두 1234예요. 시연이 끝나면 반·선원에서 반을 삭제하면 돼요.</p>
      <div><button class="btn" data-act="demo">시연용 예시 반 만들기</button></div></section>
    <section class="panel"><h2>선생님 비밀번호</h2><form class="row" data-form="tpw"><input type="password" id="tpw" placeholder="새 비밀번호 (8자 이상)" autocomplete="new-password" data-keep="no"><button class="btn">바꾸기</button></form></section>`;
}
async function tVoyage(res) {
  const items = (res.items || []).map(it => ({ ...it, name: sname(it.studentId) }));
  if (res.skipped?.length) toast(`${res.skipped.length}건은 이미 받은 미션이라 건너뛰었어요`);
  if (!items.length) { await tLoad(); return tRender(); }
  const ids = new Set(items.map(i => i.studentId));
  if (![...ids].every(id => tStudents().some(s => s.id === id))) T.cls = "all";
  T.tab = "map"; T.confirm = null;
  await tLoad();
  for (const it of items) T.shipPrev[it.studentId] = it.a;
  tRender();
  const map = $("#tmap"); $("#mapwrap")?.scrollIntoView({ block: "center" });
  await new Promise(r => setTimeout(r, 300));
  const out = await V.runVoyage(map, items, T.d.season, id => api(`/api/t/open/${id}`, {}).then(r => r.reward));
  if (out.skipped) toast("연출을 건너뛰었어요. 안 연 상자는 아이 휴대폰이나 이 화면에서 열 수 있어요");
  await tLoad(); tRender();
}
async function tDo(fn, msg) { try { const r = await fn(); if (msg) toast(msg); await tLoad(); tRender(); return r; } catch (e) { toast(e.message); } }
const T_ACTS = {
  ttab: v => { T.tab = v; T.confirm = null; T.editQuest = T.editPool = T.editShop = null; tRender(); scrollTo(0, 0); },
  tcls: v => { T.cls = v; tRender(); },
  tsubj: v => { T.subj = v; tRender(); },
  full: () => { const el = $("#mapwrap"); try { const p = el.requestFullscreen?.(); if (p) p.catch(() => toast("이 화면에서는 크게 보기를 쓸 수 없어요")); else toast("이 화면에서는 크게 보기를 쓸 수 없어요"); } catch (e) { toast("이 화면에서는 크게 보기를 쓸 수 없어요"); } },
  pickq: v => { T.selQuest = T.selQuest === Number(v) ? null : Number(v); tRender(); },
  picks: v => { const id = Number(v); T.selStudents.has(id) ? T.selStudents.delete(id) : T.selStudents.add(id); tRender(); },
  selall: () => { tStudents().forEach(s => T.selStudents.add(s.id)); tRender(); },
  selnone: () => { T.selStudents.clear(); tRender(); },
  reqPick: v => { const id = Number(v); T.selReq.has(id) ? T.selReq.delete(id) : T.selReq.add(id); tRender(); },
  reqAll: () => { document.querySelectorAll(".req").forEach(b => T.selReq.add(Number(b.dataset.v))); tRender(); },
  reqNone: () => { T.selReq.clear(); tRender(); },
  grant: async () => { const ids = [...T.selStudents]; T.selStudents.clear(); try { tVoyage(await api("/api/t/grant", { questId: T.selQuest, studentIds: ids })); } catch (e) { toast(e.message); } },
  approve: async () => { const ids = [...T.selReq]; T.selReq.clear(); try { tVoyage(await api("/api/t/requests/approve", { ids })); } catch (e) { toast(e.message); } },
  reject: async () => { const ids = [...T.selReq]; T.selReq.clear(); tDo(() => api("/api/t/requests/reject", { ids }), "반려했어요"); },
  undo: async v => { const r = await tDo(() => api(`/api/t/logs/${v}/undo`, {}), "기록을 취소했어요"); if (r?.keptChests) toast(`이미 연 상자 ${r.keptChests}개는 그대로 남겨 뒀어요`); if (T.detail) loadDetail(); },
  detail: v => { const id = Number(v); T.detail = T.detail === id ? null : id; T.detailData = null; T.confirm = null; tRender(); if (T.detail) { loadDetail(); $("#detail")?.scrollIntoView({ block: "start" }); } },
  closeDetail: () => { T.detail = null; tRender(); },
  deliverChest: v => tDo(() => api(`/api/t/chests/${v}/deliver`, {}), "건넸다고 표시했어요").then(() => T.detail && loadDetail()),
  deliverOrder: v => tDo(() => api(`/api/t/orders/${v}/deliver`, {}), "건넸다고 표시했어요"),
  cancelOrder: v => tDo(() => api(`/api/t/orders/${v}/cancel`, {}), "주문을 취소하고 포인트를 돌려줬어요"),
  askDelClass: v => { T.confirm = { type: "delClass", id: Number(v) }; tRender(); },
  delClass: v => { T.confirm = null; tDo(() => api(`/api/t/classes/${v}/delete`, {}), "반을 삭제했어요"); },
  askDelStudent: v => { T.confirm = { type: "delStudent", id: Number(v) }; tRender(); },
  delStudent: v => { T.confirm = null; T.detail = null; tDo(() => api(`/api/t/students/${v}/delete`, {}), "학생을 삭제했어요"); },
  resetPin: async v => { try { const r = await api(`/api/t/students/${v}/reset-pin`, {}); T.created = [{ nickname: sname(Number(v)), pin: r.pin }]; await tLoad(); tRender(); scrollTo(0, 0); } catch (e) { toast(e.message); } },
  clearCreated: () => { T.created = null; tRender(); },
  tcancel: () => { T.confirm = null; tRender(); },
  copy: async v => { try { await navigator.clipboard.writeText(v); toast("주소를 복사했어요"); } catch (e) { toast(v); } },
  demo: async () => { const r = await tDo(() => api("/api/t/demo", {}), "시연반을 만들었어요"); if (r) { toast(`시연반 코드 ${r.code} · 비밀번호 모두 1234`); T.tab = "map"; tRender(); } },
  toggleQuest: v => tDo(() => api(`/api/t/quests/${v}/toggle`, {})),
  editQuest: v => { T.editQuest = Number(v); tRender(); scrollTo(0, 0); },
  delQuest: v => tDo(() => api(`/api/t/quests/${v}/delete`, {}), "미션을 삭제했어요"),
  editPool: v => { T.editPool = Number(v); tRender(); document.getElementById("np-name")?.focus(); },
  delPool: v => tDo(() => api(`/api/t/pool/${v}/delete`, {}), "보물을 뺐어요"),
  editShop: v => { T.editShop = Number(v); tRender(); document.getElementById("nr-name")?.focus(); },
  delShop: v => tDo(() => api(`/api/t/shop/${v}/delete`, {}), "상품을 뺐어요"),
  cancelEdit: () => { T.editQuest = T.editPool = T.editShop = null; tRender(); },
  askNewVoyage: () => { T.confirm = { type: "newVoyage" }; tRender(); }
};
async function loadDetail() { const id = T.detail; try { const dd = await api(`/api/t/student/${id}`); if (T.detail === id) { T.detailData = dd; tRender(); } } catch (e) { toast(e.message); } }
const T_FORMS = {
  addClass: () => tDo(() => api("/api/t/classes", { name: val("nc-name") }), "반을 만들었어요").then(() => { const el = document.getElementById("nc-name"); if (el) el.value = ""; }),
  addStudents: async () => { try { const r = await api("/api/t/students", { classId: Number(val("ns-class")), names: document.getElementById("ns-names").value }); T.created = r.created; await tLoad(); tRender(); } catch (e) { toast(e.message); } },
  adjust: () => tDo(() => api("/api/t/adjust", { studentId: T.detail, type: val("adj-type"), amount: Number(val("adj-amt")), title: val("adj-why") || "선생님 조정" }), "반영했어요").then(() => { loadDetail(); }),
  rename: () => tDo(() => api(`/api/t/students/${T.detail}/rename`, { nickname: val("rn-name") }), "이름을 바꿨어요"),
  saveQuest: () => { const id = T.editQuest; T.editQuest = null; return tDo(() => api("/api/t/quests", { id, title: val("nq-title"), subject: val("nq-subj"), kind: val("nq-kind"), moves: Number(val("nq-mv")) }), id ? "미션을 저장했어요" : "미션을 추가했어요"); },
  savePool: () => { const id = T.editPool; T.editPool = null; return tDo(() => api("/api/t/pool", { id, name: val("np-name"), rarity: val("np-rar"), weight: Number(val("np-w")), points: Number(val("np-pts") || 0) }), "보물 목록을 저장했어요"); },
  saveShop: () => { const id = T.editShop; T.editShop = null; return tDo(() => api("/api/t/shop", { id, name: val("nr-name"), kind: val("nr-kind"), cost: Number(val("nr-cost")), stock: val("nr-stock") }), "상점을 저장했어요"); },
  saveSeason: () => tDo(() => api("/api/t/season", { name: val("se-name"), routeLen: Number(val("se-len")), treasureEvery: Number(val("se-every")), arrivalPoints: Number(val("se-pts")), weeklyClassGoal: Number(val("se-goal")) }), "항로를 저장했어요"),
  newVoyage: () => { T.confirm = null; return tDo(() => api("/api/t/season", { name: val("nv-name"), newVoyage: true }), "새 항해를 시작했어요"); },
  tpw: () => tDo(() => api("/api/t/password", { password: document.getElementById("tpw").value }), "비밀번호를 바꿨어요")
};

/* ---------- wiring ---------- */
const COMMON = {
  logout: async () => { try { await api("/api/logout", {}); } catch (e) {} location.replace("/"); },
  install: doInstall,
  installHide: () => { ls.set("th_install_hide", "1"); (ROLE === "student" ? kidRender : renderGate)(); }
};
let ROLE = null;
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const a = b.dataset.act, f = COMMON[a] || (ROLE === "teacher" ? T_ACTS[a] : ROLE === "student" ? KID_ACTS[a] : GATE_ACTS[a]);
  if (f) { e.preventDefault(); f(b.dataset.v); }
});
document.addEventListener("submit", e => {
  const name = e.target.dataset.form, f = (ROLE === "teacher" ? T_FORMS : ROLE === "student" ? KID_FORMS : GATE_FORMS)[name];
  if (f) { e.preventDefault(); f(e.target); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && V.running) V.skip(); });
document.addEventListener("installable", () => { if (ROLE === "student" && K.tab === "voyage" && !K.playing) kidRender(); });

(async function boot() {
  try {
    const me = await api("/api/me");
    ROLE = me.role;
    if (me.role === "teacher") await teacherStart();
    else if (me.role === "student") await kidStart();
    else gate(me.needSetup);
  } catch (e) {
    app.innerHTML = `<div class="gate"><div class="card"><h2>연결하지 못했어요</h2><p class="muted">${esc(e.message)}</p><button class="btn primary" onclick="location.reload()">다시 시도</button></div></div>`;
  }
})();
