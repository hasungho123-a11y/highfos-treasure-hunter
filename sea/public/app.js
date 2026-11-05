/* 하이포스 제도 — screens for students (phone) and teachers (classroom screen) */
const V = window.Voyage;
const { esc, sail } = V;
const $ = s => document.querySelector(s);
const app = $("#app");
const KINDS = { daily: "매일", weekly: "매주", challenge: "도전" };
const SUBJECTS = ["영어", "수학", "공통"];
const LOGO = "/icons/icon-192.png";
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const pad = n => String(n).padStart(2, "0");
const fmtTime = ms => { const d = new Date(ms), t = new Date(); return d.toDateString() === t.toDateString() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${d.getMonth() + 1}/${d.getDate()}`; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const val = id => (document.getElementById(id)?.value ?? "").trim();
async function api(path, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
  let r; try { r = await fetch(path, { credentials: "same-origin", ...opt }); } catch (e) { throw new Error("인터넷 연결을 확인해 주세요"); }
  const d = await r.json().catch(() => ({ error: "서버 응답을 읽지 못했어요" }));
  if (r.status === 401 && !/login|setup/.test(path)) { toast("다시 로그인해 주세요"); setTimeout(() => location.reload(), 900); }
  if (!r.ok) throw new Error(d.error || "문제가 생겼어요");
  return d;
}
function toast(msg) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3600); }
const keepInputs = root => [...root.querySelectorAll("input[id], select[id], textarea[id]")].filter(el => el.dataset.keep !== "no").map(el => [el.id, el.value]);
const restoreInputs = list => { for (const [id, v] of list) { const el = document.getElementById(id); if (el) el.value = v; } };
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

/* ---------- install as an app ---------- */
let installEvt = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const inAppBrowser = () => /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent); // these cannot add to the home screen
function installCard() {
  if (standalone() || ls.get("hs_install_hide")) return "";
  const how = inAppBrowser() ? (isIOS() ? "이 화면에서는 안 돼요. 메뉴에서 Safari로 열어 주세요" : "이 화면에서는 안 돼요. 메뉴에서 다른 브라우저로 열어 주세요")
    : installEvt ? "한 번만 설치하면 앱처럼 바로 열려요"
    : isIOS() ? "Safari 공유 버튼 → 홈 화면에 추가" : "브라우저 메뉴 → 홈 화면에 추가 또는 앱 설치";
  return `<div class="install"><img src="${LOGO}" alt=""><div style="flex:1;min-width:0"><b>바탕화면에 앱으로 추가하기</b><span>${how}</span></div>${installEvt ? `<button class="btn primary sm" data-act="install">설치</button>` : ""}<button class="btn ghost sm" data-act="installHide" aria-label="닫기">✕</button></div>`;
}
function installRefresh() { if (ROLE === "student") { if (K.d) kidRender(); } else if (!ROLE && G.shown) renderGate(); }
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; installRefresh(); });
addEventListener("appinstalled", () => { installEvt = null; ls.set("hs_install_hide", "1"); installRefresh(); });

/* ---------- ship pictures: the galleon comes from voyage.js, the other classes are drawn here ---------- */
const HULLS = { red: "#8E2A22", navy: "#1F3A63", mint: "#2F8C78", pink: "#D97A9A", lavender: "#9A84C9", sky: "#6FA8D6", lemon: "#E8C85A", ebony: "#2A221D", white: "#E8DFC9", gold: "url(#dk-gold)" };
const flagSVG = (x, y, look, sailIdx) => { const c = look.fc != null ? sail(look.fc) : sail(sailIdx); return `<path d="M${x} ${y} h7 v4.6 h-7 Z" fill="${c}"/>${V.embSVG(look.fe, x + 3.5, y + 2.3, 4, V.inkFor(c), c)}`; };
/* weapon pictures: 72×36, bow to the right, deck at y = 34. The same picture is the item image and what sits on the 2D ship. */
const WC = { iron: "#2B2F36", steel: "#8A949E", wood: "#7A4A28", dark: "#4B525A", paint: "#EDEDE6", red: "#C9392B", gold: "#D9A93A" };
const artCannon = (bore, x1) => `<path d="M12 23 H${x1 - 12} L${x1 - 16} 30 H12 Z" fill="${WC.wood}"/><circle cx="20" cy="30" r="4.2" fill="${WC.iron}"/><circle cx="${x1 - 22}" cy="30" r="4.2" fill="${WC.iron}"/><path d="M7 ${18 - bore} Q7 ${15 - bore} 12 ${15 - bore} L${x1} ${17 - bore / 2} Q${x1 + 3} ${17 - bore / 2} ${x1 + 3} 18 Q${x1 + 3} ${19 + bore / 2} ${x1} ${19 + bore / 2} L12 ${21 + bore} Q7 ${21 + bore} 7 ${18 - bore} Z" fill="${WC.iron}"/><rect x="22" y="${14 - bore}" width="3.5" height="${8 + bore * 2}" fill="${WC.gold}"/>`;
const artMissile = (x, y, len, r, deg) => `<g transform="rotate(${deg} ${x} ${y})"><path d="M${x + 1} ${y - r} L${x - 3} ${y - r - 3.5} H${x + 4} L${x + 8} ${y - r} Z M${x + 1} ${y + r} L${x - 3} ${y + r + 3.5} H${x + 4} L${x + 8} ${y + r} Z" fill="${WC.dark}"/><rect x="${x}" y="${y - r}" width="${len}" height="${r * 2}" fill="#FBFBF6" stroke="${WC.dark}" stroke-width=".8"/><path d="M${x + len} ${y - r} L${x + len + r * 3} ${y} L${x + len} ${y + r} Z" fill="${WC.red}" stroke="${WC.dark}" stroke-width=".8"/></g>`;
const WEAPON_ART = {
  ballista: `<rect x="12" y="23" width="38" height="5" fill="${WC.wood}"/><path d="M26 28 L20 34 M38 28 L44 34" stroke="${WC.wood}" stroke-width="3"/><path d="M42 5 Q55 16 42 27" stroke="${WC.wood}" stroke-width="3.2" fill="none"/><path d="M42 5 L17 16 L42 27" stroke="${WC.dark}" stroke-width="1" fill="none"/><path d="M12 16 H60" stroke="${WC.wood}" stroke-width="2.6"/><path d="M59 12.5 L69 16 L59 19.5 Z" fill="${WC.iron}"/>`,
  catapult: `<rect x="10" y="25" width="46" height="4.5" fill="${WC.wood}"/><circle cx="18" cy="30.5" r="3.6" fill="${WC.iron}"/><circle cx="48" cy="30.5" r="3.6" fill="${WC.iron}"/><path d="M32 25 L39 11 L46 25" stroke="${WC.wood}" stroke-width="3.2" fill="none"/><path d="M42 16 L13 8" stroke="${WC.wood}" stroke-width="3.5"/><path d="M6 5 Q4 12 13 12 L16 7 Z" fill="${WC.dark}"/><circle cx="10" cy="5" r="4" fill="${WC.steel}"/>`,
  gatling: `<circle cx="24" cy="25" r="8.5" fill="none" stroke="${WC.wood}" stroke-width="2.6"/><circle cx="24" cy="25" r="2.4" fill="${WC.iron}"/><path d="M24 17 V33 M16 25 H32" stroke="${WC.wood}" stroke-width="1.4"/><rect x="14" y="10" width="19" height="10" rx="1" fill="${WC.steel}"/><rect x="33" y="10" width="35" height="2.3" fill="${WC.iron}"/><rect x="33" y="14" width="35" height="2.3" fill="${WC.iron}"/><rect x="33" y="18" width="35" height="2.3" fill="${WC.iron}"/><rect x="50" y="8.5" width="3" height="13" fill="${WC.gold}"/>`,
  triple203: `<path d="M5 34 V29 H50 V34 Z" fill="${WC.dark}"/><path d="M8 29 L11 10 Q12 7 17 7 H38 L47 13 V29 Z" fill="${WC.steel}"/><rect x="46" y="11" width="25" height="3" fill="${WC.iron}"/><rect x="46" y="16.5" width="25" height="3" fill="${WC.iron}"/><rect x="46" y="22" width="25" height="3" fill="${WC.iron}"/><rect x="18" y="3" width="10" height="4" fill="${WC.iron}"/>`,
  ciws: `<rect x="18" y="29" width="26" height="5" fill="${WC.steel}"/><rect x="24" y="23" width="14" height="6" fill="${WC.dark}"/><path d="M15 23 V12 Q15 2 28 2 Q41 2 41 12 V23 Z" fill="#FBFBF6" stroke="${WC.dark}" stroke-width=".9"/><rect x="41" y="13.5" width="28" height="1.7" fill="${WC.iron}"/><rect x="41" y="16.5" width="28" height="1.7" fill="${WC.iron}"/><rect x="41" y="19.5" width="28" height="1.7" fill="${WC.iron}"/><rect x="58" y="12.5" width="2.4" height="9.7" fill="${WC.dark}"/>`,
  swivel: `<rect x="31" y="18" width="5" height="16" fill="${WC.wood}"/><rect x="25" y="31" width="17" height="3" fill="${WC.wood}"/><path d="M12 12 L58 13 Q62 13 62 15.5 Q62 18 58 18 L12 20 Q8 16 12 12 Z" fill="${WC.iron}"/><rect x="2" y="15" width="10" height="2" fill="${WC.wood}"/>`,
  pdr32: artCannon(2, 66),
  ac40: `<path d="M16 34 L19 26 H45 L48 34 Z" fill="${WC.steel}"/><path d="M14 26 V13 Q14 10 18 10 H40 L46 16 V26 Z" fill="${WC.steel}"/><rect x="45" y="11" width="25" height="3.4" fill="${WC.iron}"/><rect x="45" y="18" width="25" height="3.4" fill="${WC.iron}"/><rect x="64" y="10" width="6" height="5.4" fill="${WC.iron}"/><rect x="64" y="17" width="6" height="5.4" fill="${WC.iron}"/><rect x="20" y="14" width="10" height="5" fill="${WC.iron}"/>`,
  torpedo: `<path d="M22 34 L25 28 H41 L44 34 Z" fill="${WC.steel}"/><rect x="6" y="7" width="50" height="6" rx="2" fill="${WC.dark}"/><rect x="6" y="14" width="50" height="6" rx="2" fill="${WC.dark}"/><rect x="6" y="21" width="50" height="6" rx="2" fill="${WC.dark}"/><rect x="54" y="6" width="3" height="22" fill="${WC.steel}"/><path d="M57 14.5 H64 L69 17 L64 19.5 H57 Z" fill="${WC.red}"/>`,
  gun127: `<path d="M8 34 V29 H50 V34 Z" fill="${WC.dark}"/><path d="M12 29 L15 13 Q16 10 20 10 H36 L46 17 V29 Z" fill="${WC.steel}"/><rect x="45" y="17" width="26" height="4.2" fill="${WC.iron}"/><rect x="45" y="15.5" width="6" height="7.2" fill="${WC.dark}"/><rect x="22" y="6" width="8" height="4" fill="${WC.iron}"/>`,
  asm: `<path d="M16 34 L19 25 H46 L50 34 Z" fill="${WC.steel}"/><path d="M12 26 L58 11 L60 15 L14 30 Z" fill="${WC.iron}"/>${artMissile(14, 24, 40, 3, -18)}${artMissile(14, 15, 40, 3, -18)}`,
  cruise: `<path d="M10 34 L13 26 H38 L42 34 Z" fill="${WC.steel}"/><path d="M12 28 L52 8 L54 12 L14 32 Z" fill="${WC.iron}"/><path d="M30 13 L42 2 H47 L40 20 Z" fill="${WC.dark}"/>${artMissile(10, 24, 44, 4, -26)}`
};
const weaponImg = id => WEAPON_ART[id] ? `<svg viewBox="0 0 72 36" aria-hidden="true">${WEAPON_ART[id]}</svg>` : "";
// where the weapon stands on each 2D ship [x at the middle of the picture, deck y, size]
const WEAPON_SPOT = { dinghy: [40, 32.5, .2], sloop: [43, 31, .24], brig: [47, 30.5, .26], galleon: [46, 31, .33], ironclad: [50, 30.5, .3], destroyer: [50, 28.5, .3], cruiser: [50, 27.5, .34], carrier: [23, 26.2, .32] };
const weaponOnShip = (ship, look) => { const art = WEAPON_ART[look.weapon], s = WEAPON_SPOT[ship]; return art && s ? `<g transform="translate(${s[0] - 36 * s[2]} ${s[1] - 34 * s[2]}) scale(${s[2]})">${art}</g>` : ""; };
function shipSVG(id, look = {}, sailIdx = 0) {
  if (id === "galleon") return V.boatSVG(look, sailIdx).replace(/<\/g><\/svg>\s*$/, weaponOnShip(id, look) + "</g></svg>");
  const s = sail(sailIdx), wood = HULLS[look.hull] || "#7A4A28", grey = HULLS[look.hull] || "#5F6973", m = "#4E321E", st = "#8A949E", ir = "#23262B";
  const parts = {
    dinghy: `<path d="M30 33 V11" stroke="${m}" stroke-width="1.3"/><path d="M31 12 L31 31 L45 31 Z" fill="${s}"/><path d="M29 16 L29 31 L18 31 Z" fill="#FFF8EA"/>${flagSVG(30, 7, look, sailIdx)}<path d="M14 32 L46 32 L42 40 Q30 43 18 40 Z" fill="${wood}"/>`,
    sloop: `<path d="M27 32 V6" stroke="${m}" stroke-width="1.4"/><path d="M21 9 H33 Q35 13 33 17 H21 Z M20 18 H34 Q36 24 34 30 H20 Z" fill="${s}"/><path d="M52 25 L28 8 L30 30 Z" fill="${s}" opacity=".85"/>${flagSVG(27, 2, look, sailIdx)}<path d="M8 31 L52 30 L47 40 Q30 44 12 41 Z" fill="${wood}"/>`,
    brig: `<path d="M21 32 V7 M38 32 V5" stroke="${m}" stroke-width="1.4"/><path d="M15 10 H27 Q29 13 27 17 H15 Z M14 18 H28 Q30 24 28 30 H14 Z M32 8 H44 Q46 12 44 16 H32 Z M31 17 H45 Q47 23 45 30 H31 Z" fill="${s}"/><path d="M57 24 L40 7 L42 28 Z" fill="${s}" opacity=".85"/>${flagSVG(38, 1, look, sailIdx)}<path d="M4 27 L14 28 L16 31 L50 30 L57 27 L52 39 Q32 44 11 41 Z" fill="${wood}"/>`,
    ironclad: `<path d="M16 31 V10" stroke="${m}" stroke-width="1"/>${flagSVG(16, 6, look, sailIdx)}<rect x="24" y="12" width="5" height="12" fill="${ir}"/><rect x="33" y="14" width="5" height="10" fill="${ir}"/><rect x="19" y="23" width="25" height="8" rx="1" fill="${st}"/><path d="M3 31 L57 30 L53 40 Q30 43 7 40 Z" fill="${HULLS[look.hull] || "#3C3F44"}"/>`,
    destroyer: `<path d="M27 19 V6" stroke="${ir}" stroke-width=".9"/>${flagSVG(27, 3, look, sailIdx)}<rect x="22" y="18" width="9" height="7" fill="${st}"/><rect x="18" y="24" width="18" height="8" fill="${st}"/><rect x="38" y="20" width="4" height="10" fill="${ir}" transform="translate(-6 0)"/><path d="M45 28 h3 v2 h-3 Z M48 28.6 H54 M9 29 h3 v2 h-3 Z M9 29.6 H4" stroke="${ir}" fill="${ir}" stroke-width=".8"/><path d="M2 31 L59 28 L52 40 L7 40 Z" fill="${grey}"/>`,
    cruiser: `<path d="M26 16 V2 M38 18 V7" stroke="${ir}" stroke-width=".9"/>${flagSVG(26, 0, look, sailIdx)}<rect x="20" y="10" width="10" height="7" fill="${st}"/><rect x="16" y="16" width="20" height="8" fill="${st}"/><rect x="11" y="23" width="30" height="7" fill="${st}"/><rect x="33" y="14" width="4" height="9" fill="${ir}"/><rect x="38" y="15" width="4" height="8" fill="${ir}"/><path d="M47 26 h4 v3 h-4 Z M51 27 H57 M6 26 h4 v3 h-4 Z M6 27 H1" stroke="${ir}" fill="${ir}" stroke-width=".9"/><path d="M1 30 L59 27 L53 41 L6 41 Z" fill="${grey}"/>`,
    carrier: `<path d="M37 16 V4" stroke="${ir}" stroke-width=".9"/>${flagSVG(37, 1, look, sailIdx)}<rect x="32" y="15" width="11" height="6" fill="${st}"/><rect x="30" y="20" width="15" height="6" fill="${st}"/><rect x="0" y="26" width="60" height="2.2" fill="#3A4046"/><path d="M6 25.4 l4 -1 l1 1 Z M15 25.4 l4 -1 l1 1 Z M50 25.4 l4 -1 l1 1 Z" fill="${st}"/><path d="M3 28 L58 28 L53 41 L8 41 Z" fill="${HULLS[look.hull] || "#555E67"}"/>`
  };
  return `<svg viewBox="0 0 60 48" aria-hidden="true"><g class="hull">${parts[id] || parts.dinghy}${weaponOnShip(id, look)}</g></svg>`;
}
const shipBox = (ship, look, sailIdx, name, cls = "") => `<div class="deco-sea ${cls}"><div class="ship mine ${V.wakeClass(look)}" style="--sail:${sail(sailIdx)}">${shipSVG(ship, look, sailIdx)}${name ? `<span class="nmtag ${V.tagClass(look)}">${esc(name)}</span>` : ""}</div></div>`;

/* ---------- 3D ---------- */
function show3D(host, look, sailIdx, shipId) {
  if (!host || !window.Ship3D) return;
  Ship3D.get().then(v => { if (!host.isConnected) return; v.setLook(look, sail(sailIdx), look.fc != null ? sail(look.fc) : sail(sailIdx), shipId); v.focusWeapon(K.slot === "weapon"); v.mount(host); host.classList.add("ready"); })
    .catch(e => { host.classList.add("failed"); const m = host.querySelector(".s3d-msg"); if (m) m.textContent = e.message; });
}

/* =====================================================================
   LOGIN
   ===================================================================== */
const G = { mode: "code", code: "", cls: null, student: null, pin: "", err: "", busy: false };
function gate(needSetup) {
  const url = new URLSearchParams(location.search).get("c");
  G.code = url || ls.get("hs_class") || ""; G.mode = needSetup ? "setup" : "code";
  if (G.code && !needSetup) loadClass(G.code); else renderGate();
}
async function loadClass(code) { try { G.cls = await api("/api/class", { code }); G.code = code.toUpperCase(); ls.set("hs_class", G.code); G.mode = "name"; G.err = ""; } catch (e) { G.err = e.message; G.mode = "code"; } renderGate(); }
function renderGate() {
  G.shown = true; let body = "";
  if (G.mode === "setup") body = `<h2>처음 설정</h2><p class="muted small">선생님 계정을 만들어요. 설정 코드는 배포할 때 정한 값이에요.</p>
    <form data-form="setup" class="stack" style="gap:10px"><label class="f">설정 코드<input type="password" id="s-code" autocomplete="off"></label><label class="f">선생님 아이디<input type="text" id="s-user"></label><label class="f">비밀번호 (4자 이상)<input type="password" id="s-pw" autocomplete="new-password"></label><button class="btn primary lg">만들기</button></form>`;
  else if (G.mode === "code") body = `<h2>반 코드를 넣어 주세요</h2><p class="muted small">선생님이 알려 준 5글자 코드예요.</p>
    <form data-form="code" class="stack" style="gap:10px"><input type="text" id="g-code" class="codein" maxlength="5" aria-label="반 코드" autocapitalize="characters" value="${esc(G.code)}"><button class="btn primary lg">다음</button></form><button class="btn ghost sm" data-act="gmode" data-v="teacher">선생님이에요</button>`;
  else if (G.mode === "name") body = `<div class="row between"><h2>${esc(G.cls.name)}</h2><button class="btn ghost sm" data-act="gmode" data-v="code">반 바꾸기</button></div><p class="muted small">내 이름을 눌러요.</p>
    <div class="names">${G.cls.students.map(s => `<button data-act="gname" data-v="${s.id}" style="--sail:${sail(s.sail)}"><i class="dot"></i>${esc(s.nickname)}</button>`).join("") || `<p class="muted small">아직 등록된 학생이 없어요.</p>`}</div>`;
  else if (G.mode === "pin") body = `<div class="row between"><h2 style="--sail:${sail(G.student.sail)}"><i class="dot" style="width:14px;height:14px"></i> ${esc(G.student.nickname)}</h2><button class="btn ghost sm" data-act="gmode" data-v="name">내가 아니에요</button></div>
    <p class="muted small">비밀번호 숫자 4개를 눌러요.</p><div class="pindots">${[0, 1, 2, 3].map(i => `<i class="${i < G.pin.length ? "on" : ""}"></i>`).join("")}</div>
    <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-act="pin" data-v="${n}">${n}</button>`).join("")}<button data-act="pin" data-v="clr" style="font-size:1rem">지우기</button><button data-act="pin" data-v="0">0</button><button data-act="pin" data-v="back" aria-label="한 칸 지우기">←</button></div>`;
  else body = `<h2>선생님 로그인</h2><form data-form="teacher" class="stack" style="gap:10px"><label class="f">아이디<input type="text" id="g-user" autocomplete="username"></label><label class="f">비밀번호<input type="password" id="g-pw" autocomplete="current-password"></label><button class="btn primary lg">로그인</button></form><button class="btn ghost sm" data-act="gmode" data-v="code">학생 화면으로</button>`;
  app.innerHTML = `<div class="gate"><div class="card"><div class="logo"><img src="${LOGO}" alt=""><div><h1>하이포스 제도</h1><small>숙제로 떠나는 섬 모험</small></div></div>${G.err ? `<p class="err">${esc(G.err)}</p>` : ""}${G.mode === "setup" || G.mode === "teacher" ? "" : installCard()}${body}</div></div>`;
}
const GATE_ACTS = {
  gmode: v => { G.mode = v; G.err = ""; G.pin = ""; renderGate(); },
  gname: v => { G.student = G.cls.students.find(s => s.id === Number(v)); G.mode = "pin"; G.pin = ""; G.err = ""; renderGate(); },
  pin: async v => { if (G.busy) return; if (v === "clr") G.pin = ""; else if (v === "back") G.pin = G.pin.slice(0, -1); else if (G.pin.length < 4) G.pin += v;
    if (G.pin.length === 4) { G.busy = true; renderGate(); try { await api("/api/student/login", { code: G.code, studentId: G.student.id, pin: G.pin }); location.replace("/"); return; } catch (e) { G.err = e.message; G.pin = ""; } G.busy = false; } renderGate(); }
};
const GATE_FORMS = {
  code: () => loadClass(val("g-code")),
  teacher: async () => { try { await api("/api/teacher/login", { username: val("g-user"), password: $("#g-pw").value }); location.replace("/"); } catch (e) { G.err = e.message; renderGate(); } },
  setup: async () => { try { await api("/api/setup", { setupCode: $("#s-code").value, username: val("s-user"), password: $("#s-pw").value }); location.replace("/"); } catch (e) { G.err = e.message; renderGate(); } }
};

/* =====================================================================
   STUDENT
   ===================================================================== */
const K = { d: null, tab: "map", isle: null, confirm: null, slot: "ship", tryKey: null, busy: false, at: "port", map: null };
const ISLES = {
  port: { x: 200, y: 450, px: 170, py: 520, r: 92 },
  cannon: { x: 520, y: 170, px: 460, py: 300, r: 78, game: "cannon" },
  reef: { x: 835, y: 300, px: 490, py: 590, r: 66, game: "reef" },
  memory: { x: 180, y: 150, px: 150, py: 170, r: 72, game: "memory" },
  battle: { x: 660, y: 490, px: 320, py: 790, r: 74 }
};
const DECO_TABS = [["ship", "배 종류"], ["color", "돛·깃발 색"], ["weapon", "무기"], ["emblem", "문양"], ["pattern", "돛 무늬"], ["hull", "배 색"], ["att", "부착물"], ["head", "선수상"], ["trim", "테두리"], ["wake", "물결"], ["tag", "이름표"]];
const withItem = (look, x) => x.slot === "att" ? { ...look, att: [...new Set([...(look.att || []), x.id])] } : x.slot === "emblem" ? { ...look, se: x.id } : { ...look, [x.slot]: x.id };
const isWorn = (look, x) => x.slot === "att" ? (look.att || []).includes(x.id) : x.slot === "emblem" ? look.se === x.id || look.fe === x.id : look[x.slot] === x.id;
const coin = n => `<span class="gold num">${n}</span>`;
const pts = n => `<span class="pt num">${n}</span>`;
const nrg = n => `<span class="nrg num">${n}</span>`;
async function kidLoad() { K.d = await api("/api/kid/state");
  const open = K.d.maps.filter(seaOpen).length, mem = `hs_seas_${K.d.me.id}`, seen = Number(ls.get(mem) || 0);
  if (K.map == null) K.map = open - 1;
  if (K.map >= open) { K.map = open - 1; K.isle = null; K.at = "port"; }
  if (seen && open > seen) { K.map = open - 1; K.isle = null; K.at = "port"; toast(`새 바다가 열렸어요! ${K.d.maps[open - 1].name}`); }
  if (open > seen) ls.set(mem, open); }
async function kidStart() {
  document.body.classList.add("kid"); await kidLoad(); kidRender();
  setInterval(async () => { if (document.hidden || K.busy || $(".game") || $(".fight")) return; const a = document.activeElement; if (a && a.matches("input,select")) return; try { await kidLoad(); kidRender(); } catch (e) {} }, 20000);
}
function kidRender() {
  const d = K.d, me = d.me, keep = keepInputs(app);
  const tabs = [["map", "제도 지도"], ["missions", "미션"], ["deco", "내 배"], ["log", "기록"]], openQ = d.quests.filter(q => q.status === "open").length;
  app.innerHTML = `<header class="top"><div class="hwrap"><div class="brand"><img src="${LOGO}" alt=""><div style="min-width:0"><h1>하이포스 제도</h1><small>${esc(me.className)} · 전투력 ${me.power}</small></div></div>
      <div class="hright wallet"><span title="행동력">${nrg(d.bal.energy)}</span><span title="포인트">${pts(d.bal.points)}</span><span title="금화">${coin(d.bal.gold)}</span></div></div>
      <nav class="tabs" aria-label="화면">${tabs.map(([k, l]) => `<button data-act="ktab" data-v="${k}" aria-current="${K.tab === k}">${l}${k === "missions" && openQ ? `<span class="cnt">${openQ}</span>` : ""}</button>`).join("")}</nav></header>
    <main>${({ map: kMap, missions: kMissions, deco: kDeco, log: kLog })[K.tab]()}</main>
    ${me.mustChange ? `<div class="modal" role="dialog" aria-modal="true"><div class="panel"><h2>나만의 비밀번호 정하기</h2><p class="small muted">임시 비밀번호 대신 나만 아는 숫자 4개로 바꿔요.</p>
      <form data-form="kpin" class="stack" style="gap:10px"><input type="password" id="kp1" inputmode="numeric" maxlength="4" placeholder="숫자 4개" data-keep="no" required><input type="password" id="kp2" inputmode="numeric" maxlength="4" placeholder="한 번 더" data-keep="no" required><button class="btn primary">정하기</button></form></div></div>` : ""}`;
  restoreInputs(keep);
  if (K.tab === "deco") { const x = K.tryKey && d.deco.find(i => i.key === K.tryKey); show3D($("#deco3d"), x ? withItem(me.look, x) : me.look, me.sail, K.tryShip || me.ship); }
}
const tallMap = () => innerWidth < 640;
const mapSize = () => tallMap() ? { w: 640, h: 920 } : { w: 1000, h: 620 };
const islePos = k => { const s = ISLES[k], m = mapSize(), x = tallMap() ? s.px : s.x, y = tallMap() ? s.py : s.y; return { x: K.map === 1 ? m.w - x : x, y }; }; // the middle sea is laid out mirrored
const shipAt = k => { const p = islePos(k), m = mapSize(); return `left:${(p.x + 66) / m.w * 100}%;top:${(p.y + 24) / m.h * 100}%`; };
const SEAS = [
  { top: "#3A86BD", bot: "#123E66", land: { port: "#7FAE62", cannon: "#B98A5A", reef: "#8A9AA6", memory: "#C9A25E", battle: "#A8574A" } },
  { top: "#5E8AA3", bot: "#1B3A50", land: { port: "#8C9178", cannon: "#8C7A66", reef: "#D5E5EE", memory: "#A39A82", battle: "#7E5148" } },
  { top: "#2A6FA5", bot: "#0A2740", land: { port: "#7E8B94", cannon: "#6F7B85", reef: "#46525C", memory: "#8E9AA4", battle: "#5A6168" } }
];
const seaOpen = m => K.d.me.power >= m.power;
function kMap() {
  const d = K.d, me = d.me, { w, h } = mapSize(), tall = tallMap(), fs = tall ? 36 : 27, sea = SEAS[K.map], names = d.maps[K.map].isles;
  const isle = (k, s) => { const { x, y } = islePos(k); return `<g class="isle ${K.isle === k ? "on" : ""}" data-act="kisle" data-v="${k}" tabindex="0" role="button" aria-label="${names[k]}: ${isleSub(k)}">
    <ellipse cx="${x}" cy="${y + 10}" rx="${s.r + 8}" ry="${s.r * .46 + 5}" fill="#E9D5A4"/><ellipse cx="${x}" cy="${y}" rx="${s.r}" ry="${s.r * .44}" fill="${sea.land[k]}"/>${(ERA_ART[K.map]?.[k] || ART[k])(x, y)}
    <text x="${x}" y="${y + s.r * .44 + fs + 12}" text-anchor="middle" class="lbl" font-size="${fs}">${names[k]}</text></g>`; };
  const route = (a, b, bend) => { const p = islePos(a), q = islePos(b); return `M${p.x} ${p.y} Q${(p.x + q.x) / 2 + bend} ${(p.y + q.y) / 2 - bend} ${q.x} ${q.y}`; };
  const tabs = d.maps.map(m => { const open = seaOpen(m); return `<button class="seatab ${open ? "" : "locked"}" data-act="ksea" data-v="${m.id}" aria-pressed="${K.map === m.id}"><b>${esc(m.name)}</b><small>${open ? esc(m.era) : `전투력 ${m.power}부터`}</small>${open ? "" : `<i class="seabar"><i style="width:${Math.min(100, me.power / m.power * 100)}%"></i></i>`}</button>`; }).join("");
  return `${installCard()}<section class="panel worldhead"><h2>어느 섬으로 갈까요?</h2><p class="small muted">게임 한 판에 행동력 ${d.game.playCost}을 써요. 미션을 끝내면 행동력이 생겨요. (최대 ${d.game.energyMax})</p><div class="seatabs">${tabs}</div></section>
    <div class="world"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(d.maps[K.map].name)} 지도">
      <defs><linearGradient id="wsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea.top}"/><stop offset="1" stop-color="${sea.bot}"/></linearGradient><pattern id="wwv" width="60" height="34" patternUnits="userSpaceOnUse"><path d="M0 17 q15 -9 30 0 t30 0" fill="none" stroke="#fff" stroke-width="1.6" opacity=".14"/></pattern></defs>
      <rect width="${w}" height="${h}" fill="url(#wsea)"/><rect class="waves" width="${w + 100}" height="${h}" fill="url(#wwv)"/>
      <path d="${route("port", "memory", 30)} ${route("port", "cannon", 20)} ${route("cannon", "reef", 40)} ${route("reef", "battle", 30)} ${route("port", "battle", -30)}" fill="none" stroke="#fff" stroke-width="3.5" stroke-dasharray="2 13" stroke-linecap="round" opacity=".55"/>
      ${Object.entries(ISLES).map(([k, s]) => isle(k, s)).join("")}
    </svg><div class="ship mine worldship ${V.wakeClass(me.look)}" id="wship" style="--sail:${sail(me.sail)};${shipAt(K.at)}">${shipSVG(me.ship, me.look, me.sail)}</div></div>
    ${K.isle ? kIsle() : `<p class="small muted" style="text-align:center">섬을 눌러 보세요.</p>`}`;
}
const isleSub = k => ({ port: "배를 사고 면제권을 받는 곳", cannon: "타이밍 맞춰 표적 맞히기", reef: `${["암초를", "빙산을", "기뢰를"][K.map]} 피해 멀리 가기`, memory: "그림 짝 맞히기", battle: "친구 배와 겨뤄 금화 얻기" })[k];
// little pictures standing on each island
const ART = {
  port: (x, y) => `<rect x="${x - 34}" y="${y - 26}" width="26" height="22" fill="#F3E6C8"/><path d="M${x - 38} ${y - 26} L${x - 21} ${y - 42} L${x - 4} ${y - 26} Z" fill="#C2503A"/><rect x="${x + 6}" y="${y - 20}" width="22" height="18" fill="#F3E6C8"/><path d="M${x + 2} ${y - 20} L${x + 17} ${y - 34} L${x + 32} ${y - 20} Z" fill="#1F6F8B"/>`,
  cannon: (x, y) => `<circle cx="${x}" cy="${y - 4}" r="20" fill="#fff"/><circle cx="${x}" cy="${y - 4}" r="13" fill="#D9402F"/><circle cx="${x}" cy="${y - 4}" r="6" fill="#fff"/><path d="M${x + 22} ${y + 8} L${x + 46} ${y - 8}" stroke="#23262B" stroke-width="9" stroke-linecap="round"/>`,
  reef: (x, y) => `<path d="M${x - 40} ${y + 6} L${x - 22} ${y - 26} L${x - 4} ${y + 6} Z M${x - 8} ${y + 8} L${x + 12} ${y - 34} L${x + 34} ${y + 8} Z" fill="#5A5048"/>`,
  memory: (x, y) => `<path d="M${x - 34} ${y + 6} Q${x} ${y - 52} ${x + 34} ${y + 6} Z" fill="#6B5A44"/><path d="M${x - 14} ${y + 6} Q${x} ${y - 22} ${x + 14} ${y + 6} Z" fill="#241B12"/><circle cx="${x}" cy="${y - 2}" r="4" fill="#F1C04B"/>`,
  battle: (x, y) => `<path d="M${x - 26} ${y + 6} L${x + 16} ${y - 34} M${x + 26} ${y + 6} L${x - 16} ${y - 34}" stroke="#E9EEF2" stroke-width="7" stroke-linecap="round"/><path d="M${x - 24} ${y - 14} L${x - 8} ${y + 2} M${x + 24} ${y - 14} L${x + 8} ${y + 2}" stroke="#F1C04B" stroke-width="6" stroke-linecap="round"/>`
};
const ERA_ART = {
  1: {
    port: (x, y) => `<rect x="${x - 34}" y="${y - 24}" width="34" height="20" fill="#6E5A4C"/><rect x="${x - 28}" y="${y - 42}" width="8" height="18" fill="#3A3633"/><rect x="${x - 14}" y="${y - 38}" width="8" height="14" fill="#3A3633"/><circle cx="${x - 20}" cy="${y - 50}" r="7" fill="#C9CDD1"/><circle cx="${x - 8}" cy="${y - 54}" r="5" fill="#DDE0E3"/><rect x="${x + 8}" y="${y - 18}" width="22" height="14" fill="#8A7A66"/>`,
    cannon: (x, y) => `<path d="M${x - 36} ${y + 4} V${y - 20} H${x - 26} V${y - 12} H${x - 14} V${y - 20} H${x - 4} V${y - 12} H${x + 8} V${y - 20} H${x + 18} V${y + 4} Z" fill="#6E6A62"/><path d="M${x + 16} ${y - 8} L${x + 44} ${y - 16}" stroke="#23262B" stroke-width="7" stroke-linecap="round"/>`,
    reef: (x, y) => `<path d="M${x - 40} ${y + 6} L${x - 18} ${y - 30} L${x - 6} ${y - 10} L${x + 10} ${y - 38} L${x + 36} ${y + 6} Z" fill="#F4FAFC"/><path d="M${x + 10} ${y - 38} L${x + 2} ${y + 6} H${x + 36} Z" fill="#BFDCE9"/>`,
    memory: (x, y) => `<path d="M${x - 11} ${y + 4} L${x - 7} ${y - 40} H${x + 7} L${x + 11} ${y + 4} Z" fill="#FBFBF6"/><rect x="${x - 9}" y="${y - 24}" width="18" height="8" fill="#C2503A"/><rect x="${x - 8}" y="${y - 50}" width="16" height="10" fill="#F1C04B"/><path d="M${x - 10} ${y - 50} L${x} ${y - 60} L${x + 10} ${y - 50} Z" fill="#3A3633"/>`
  },
  2: {
    port: (x, y) => `<rect x="${x - 36}" y="${y - 22}" width="42" height="18" fill="#B8C0C7"/><rect x="${x - 8}" y="${y - 46}" width="12" height="24" fill="#E8ECEF"/><rect x="${x - 12}" y="${y - 54}" width="20" height="8" fill="#2F6E9E"/><path d="M${x + 12} ${y - 2} H${x + 44}" stroke="#F2F2E8" stroke-width="3" stroke-dasharray="6 5"/>`,
    reef: (x, y) => `<circle cx="${x - 18}" cy="${y - 8}" r="11" fill="#23262B"/><circle cx="${x + 16}" cy="${y - 10}" r="13" fill="#23262B"/><path d="M${x - 18} ${y - 24} V${y + 8} M${x - 34} ${y - 8} H${x - 2} M${x + 16} ${y - 28} V${y + 8} M${x - 2} ${y - 10} H${x + 34}" stroke="#23262B" stroke-width="3"/>`,
    memory: (x, y) => `<path d="M${x - 22} ${y + 2} A22 22 0 0 1 ${x + 22} ${y + 2} Z" fill="#F2F2E8"/><path d="M${x + 8} ${y - 12} L${x + 26} ${y - 46} M${x + 18} ${y - 12} L${x + 26} ${y - 46}" stroke="#C9D3DC" stroke-width="3"/><circle cx="${x + 26}" cy="${y - 48}" r="4" fill="#D9402F"/>`
  }
};
function kIsle() {
  const d = K.d, k = K.isle, s = ISLES[k], g = s.game && d.games[s.game], m = d.maps[K.map], nm = m.isles[k];
  const head = `<div class="row between"><h2>${esc(nm)}</h2><button class="btn ghost sm" data-act="kisle" data-v="">닫기</button></div>`;
  if (g) { const can = d.bal.energy >= d.game.playCost;
    return `<section class="panel" id="islePanel">${head}<p class="small muted">${isleSub(k)}. 별을 많이 받을수록 포인트가 많아요.${m.mult > 1 ? ` 이 바다는 포인트가 ${m.mult}배이고 게임이 더 빨라요.` : ""} 낮은 확률로 치장품이나 ${esc(m.era)} 무기를 발견해요.</p>
      <div class="row small muted"><span>별 1개 ${g.stars[0]}점</span><span>· 별 2개 ${g.stars[1]}점</span><span>· 별 3개 ${g.stars[2]}점</span></div>
      <button class="btn primary lg" data-act="kplay" data-v="${s.game}" ${can ? "" : "disabled"}>${can ? `행동력 ${d.game.playCost} 쓰고 시작` : "행동력이 모자라요"}</button></section>`; }
  if (k === "port") { const p = d.pass, canPass = !p.bought && d.bal.points >= d.game.passCost;
    return `<section class="panel" id="islePanel">${head}
      <div class="portrow"><div><b>숙제 면제권</b><p class="small muted">포인트로 한 달에 한 번 살 수 있어요. 산 뒤 선생님이 챙겨 줘요.</p></div>
        ${K.confirm === "pass" ? `<span class="row"><button class="btn sm primary" data-act="kpass">${d.game.passCost}P로 사기</button><button class="btn sm" data-act="kno">취소</button></span>`
        : p.bought ? `<span class="pill ok">이번 달에 받았어요</span>` : `<button class="btn sm ${canPass ? "primary" : ""}" data-act="kpassAsk" ${canPass ? "" : "disabled"}>${canPass ? `${pts(d.game.passCost)} 사기` : `${d.game.passCost - d.bal.points}P 모자라요`}</button>`}</div>
      <div class="portrow"><div><b>포인트를 금화로</b><p class="small muted">1포인트가 금화 1개가 돼요. 다시 되돌릴 수는 없어요.</p></div>
        <form class="row" data-form="kex"><input type="number" id="ex-n" min="10" step="10" max="${d.bal.points}" placeholder="10 이상" style="width:92px"><button class="btn sm" ${d.bal.points >= 10 ? "" : "disabled"}>바꾸기</button></form></div>
      <div class="portrow"><div><b>조선소</b><p class="small muted">금화로 더 큰 배를 사요.</p></div><button class="btn sm primary" data-act="kgoShips">배 보러 가기</button></div></section>`; }
  const b = d.battle, can = b.open && b.left > 0;
  return `<section class="panel" id="islePanel">${head}<p class="small muted">전투력이 비슷한 친구와 자동으로 겨뤄요. 이기면 금화 +${d.game.win}, 지면 최대 -${d.game.lose}. 공격받은 쪽은 금화를 잃지 않아요.</p>
    <div class="row"><span>내 전투력 <b class="num">${d.me.power}</b></span><span class="muted">· 오늘 남은 전투 ${b.left}번</span></div>
    <button class="btn primary lg" data-act="kfight" ${can ? "" : "disabled"}>${b.off ? "선생님이 전투를 쉬게 했어요" : !b.open ? `전투는 ${d.game.hourFrom}~${d.game.hourTo}시에만 해요` : b.left ? "전투 시작!" : "내일 다시 해요"}</button>
    ${b.fights.length ? `<div class="plist">${b.fights.slice(0, 6).map(f => `<div class="prow"><span>${esc(f.opp)} ${f.attacked ? "공격" : "방어"}</span><span class="pill ${f.won ? "ok" : ""}">${f.won ? "승리" : "패배"}</span><span class="small num">${f.gold ? `${f.gold > 0 ? "+" : ""}${f.gold}금화` : "-"}</span></div>`).join("")}</div>` : ""}</section>`;
}
function kMissions() {
  const qs = K.d.quests;
  const btn = q => q.status === "done" ? `<span class="pill ok">${q.kind === "daily" ? "오늘 완료" : "이번 주 완료"}</span>` : q.status === "pending" ? `<div class="row" style="justify-content:flex-end"><span class="pill wait">확인 기다리는 중</span><button class="btn ghost sm" data-act="kcancel" data-v="${q.requestId}">취소</button></div>` : `<button class="btn primary" data-act="krequest" data-v="${q.id}">다 했어요</button>`;
  return `<section class="panel"><h2>오늘의 미션</h2><p class="small muted">미션을 끝냈으면 "다 했어요"를 눌러요. 선생님이 확인하면 행동력이 생겨요.</p>
    ${SUBJECTS.map(sub => { const list = qs.filter(q => q.subject === sub); return list.length ? `<h3>${sub}</h3><div class="mlist">${list.map(q => `<div class="mitem s-${esc(q.subject)}"><span class="bar"></span><span><span class="t">${esc(q.title)}</span><br><span class="tag kind">${KINDS[q.kind]}</span> <span class="small">행동력 +${q.energy}</span></span>${btn(q)}</div>`).join("")}</div>` : ""; }).join("") || `<p class="muted">아직 미션이 없어요.</p>`}</section>`;
}
const embTile = (id, cloth) => `<svg class="emb-tile" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="14" fill="${cloth}"/>${V.embSVG(id, 50, 50, 74, V.inkFor(cloth), cloth)}</svg>`;
function kDeco() {
  const d = K.d, me = d.me, L = me.look, gold = d.bal.gold, owned = new Set(d.owned), slot = K.slot, curShip = d.ships.find(s => s.id === me.ship);
  const conf = K.confirm && K.confirm.key && d.deco.find(x => x.key === K.confirm.key), shipConf = K.confirm && K.confirm.ship && d.ships.find(s => s.id === K.confirm.ship);
  const tryItem = K.tryKey && d.deco.find(x => x.key === K.tryKey);
  const buy = x => { const can = gold >= x.price; return `<button class="btn sm ${can ? "primary" : ""}" data-act="kdecoAsk" data-v="${x.key}" ${can ? "" : "disabled"}>${can ? "사기" : `${x.price - gold}개 모자라요`}</button>`; };
  const card = x => { const has = owned.has(x.key), on = isWorn(L, x);
    const pic = x.slot === "emblem" ? embTile(x.id, sail(me.sail)) : x.slot === "weapon" ? `<div class="wtile r-${x.rarity}">${weaponImg(x.id)}<b class="num">+${x.power}</b></div>` : shipBox(me.ship, withItem(L, x), me.sail, "", "tiny");
    const ctl = x.dropOnly && !has ? `<span class="small muted">${esc(d.maps[x.era].name)}에서 발견해요</span>` : !has ? buy(x)
      : x.slot === "weapon" && x.era > curShip.era ? `<span class="small muted">${esc(d.ships.find(s => s.era === x.era).name)}부터 장착해요</span>`
      : x.slot === "emblem" ? `<div class="row" style="gap:6px"><button class="btn sm" data-act="kwear" data-v="${x.key}|sail" aria-pressed="${L.se === x.id}">돛</button><button class="btn sm" data-act="kwear" data-v="${x.key}|flag" aria-pressed="${L.fe === x.id}">깃발</button></div>`
      : x.slot === "att" ? `<button class="btn sm ${on ? "" : "primary"}" data-act="kwear" data-v="${x.key}">${on ? "떼기" : "달기"}</button>`
      : on ? `<span class="pill ok">${x.slot === "weapon" ? "장착 중" : "쓰는 중"}</span>` : `<button class="btn sm ${x.slot === "weapon" ? "primary" : ""}" data-act="kwear" data-v="${x.key}">${x.slot === "weapon" ? "장착" : "쓰기"}</button>`;
    return `<div class="deco-item ${K.tryKey === x.key ? "sel" : ""}" data-act="ktry" data-v="${x.key}">${pic}<b>${esc(x.name)}</b>${x.slot === "weapon" ? `<span class="rar r-${x.rarity}">${x.rarity}</span>` : has ? "" : `<span class="gold num">${x.price}</span>`}${ctl}</div>`; };
  const shipCard = s => { const has = !s.price || owned.has(`ship.${s.id}`), on = me.ship === s.id, can = gold >= s.price;
    return `<div class="deco-item ${K.tryShip === s.id ? "sel" : ""}" data-act="ktryShip" data-v="${s.id}">${shipBox(s.id, L, me.sail, "", "tiny")}<b>${esc(s.name)}</b><span class="small muted">전투력 +${s.power}${s.sails ? "" : " · 돛 없음"}</span>${has ? "" : `<span class="gold num">${s.price}</span>`}
      ${on ? `<span class="pill ok">타는 중</span>` : has ? `<button class="btn sm" data-act="kshipUse" data-v="${s.id}">타기</button>` : `<button class="btn sm ${can ? "primary" : ""}" data-act="kshipAsk" data-v="${s.id}" ${can ? "" : "disabled"}>${can ? "사기" : `${s.price - gold}개 모자라요`}</button>`}</div>`; };
  const plain = ["hull", "pattern", "trim", "head", "wake", "tag", "weapon"].includes(slot) ? `<div class="deco-item ${L[slot] ? "" : "sel"}" data-act="ktry" data-v="">${slot === "weapon" ? `<div class="wtile"><b class="small">없음</b></div>` : shipBox(me.ship, { ...L, [slot]: undefined }, me.sail, "", "tiny")}<b>기본</b>${L[slot] ? `<button class="btn sm" data-act="kwear" data-v="${slot}">기본으로</button>` : `<span class="pill ok">쓰는 중</span>`}</div>` : "";
  const sw = (i, act, on, label) => `<button style="--sail:${V.SAILS[i]}" data-act="${act}" data-v="${i}" aria-pressed="${on}" aria-label="${label} ${i + 1}"></button>`;
  const noSail = !curShip.sails && ["pattern", "emblem", "color"].includes(slot) ? `<p class="small muted">지금 배에는 돛이 없어서 돛 꾸미기는 안 보여요. 깃발 색과 깃발 문양은 보여요.</p>` : "";
  const body = slot === "ship" ? `<p class="small muted">금화로 더 큰 배를 살 수 있어요. 배를 누르면 위에서 미리 볼 수 있어요.</p>${d.maps.map(m => `<h3>${esc(m.era)}</h3><div class="deco-grid">${d.ships.filter(s => s.era === m.id).map(shipCard).join("")}</div>`).join("")}`
    : slot === "color" ? `<p class="small muted">돛 색과 깃발 색은 무료예요.</p><h3>돛 색</h3><div class="sails">${V.SAILS.map((c, i) => sw(i, "ksail", me.sail === i, "돛 색")).join("")}</div>
      <h3>깃발 색</h3><div class="sails"><button class="same" data-act="kflag" data-v="-1" aria-pressed="${L.fc == null}" style="--sail:${sail(me.sail)}">돛과 같게</button>${V.SAILS.map((c, i) => sw(i, "kflag", L.fc === i, "깃발 색")).join("")}</div>`
    : `${slot === "emblem" ? `<p class="small muted">문양은 한 번 사면 돛과 깃발에 따로 달 수 있어요.</p>${L.se || L.fe ? `<div class="row">${L.se ? `<button class="btn sm ghost" data-act="kwear" data-v="emblem|sail">돛 문양 빼기</button>` : ""}${L.fe ? `<button class="btn sm ghost" data-act="kwear" data-v="emblem|flag">깃발 문양 빼기</button>` : ""}</div>` : ""}` : slot === "att" ? `<p class="small muted">여러 개를 같이 달 수 있어요.</p>` : slot === "weapon" ? `<p class="small muted">시대마다 그 바다의 미니게임에서 낮은 확률로 발견해요. 장착은 그 시대의 배부터 할 수 있어요. 장착하면 배 위에 올라가고 전투력도 올라가요.</p>` : ""}${slot === "weapon" ? `<div class="deco-grid">${plain}</div>${d.maps.map(m => `<h3>${esc(m.era)}</h3><div class="deco-grid">${d.deco.filter(x => x.slot === "weapon" && x.era === m.id).map(card).join("")}</div>`).join("")}` : `<div class="deco-grid">${plain}${d.deco.filter(x => x.slot === slot).map(card).join("")}</div>`}`;
  return `<section class="panel deco-hero"><div class="row between"><h2>${esc(me.nickname)}의 ${esc((d.ships.find(s => s.id === (K.tryShip || me.ship)) || curShip).name)}</h2><span class="small">전투력 <b class="num">${me.power}</b> · ${coin(gold)}</span></div>
      <div class="deco3d" id="deco3d">${shipBox(K.tryShip || me.ship, tryItem ? withItem(L, tryItem) : L, me.sail, me.nickname, "big")}<p class="s3d-msg">3D 배를 불러오는 중…</p></div>
      ${conf ? `<div class="confirm"><span><b>${esc(conf.name)}</b>을(를) 금화 ${conf.price}개로 살까요? 남는 금화 ${gold - conf.price}</span><button class="btn sm primary" data-act="kdecoBuy" data-v="${conf.key}">사기</button><button class="btn sm" data-act="kno">취소</button></div>` : ""}
      ${shipConf ? `<div class="confirm"><span><b>${esc(shipConf.name)}</b>을(를) 금화 ${shipConf.price}개로 살까요? 남는 금화 ${gold - shipConf.price}</span><button class="btn sm primary" data-act="kshipBuy" data-v="${shipConf.id}">사기</button><button class="btn sm" data-act="kno">취소</button></div>` : ""}</section>
    <section class="panel"><div class="chips" role="group" aria-label="꾸미기 종류">${DECO_TABS.map(([k, l]) => `<button class="chip" data-act="kslot" data-v="${k}" aria-pressed="${slot === k}">${l}</button>`).join("")}</div>${noSail}${body}</section>`;
}
function kLog() {
  const d = K.d;
  return `${d.orders.length ? `<section class="panel"><h3>선생님이 챙겨 줄 것</h3><div class="plist">${d.orders.map(o => `<div class="prow"><span>${esc(o.name)}</span><span class="small muted">${fmtTime(o.created_at)}</span><span class="pill wait">준비 중</span></div>`).join("")}</div></section>` : ""}
    <section class="panel feed"><h3>항해 일지</h3>${d.log.length ? `<ul>${d.log.map(l => `<li><time class="num">${fmtTime(l.at)}</time><span>${esc(l.title)}</span><span class="small">${l.energy ? `<span class="nrg num">${l.energy > 0 ? "+" : ""}${l.energy}</span> ` : ""}${l.points ? `<span class="pt num">${l.points > 0 ? "+" : ""}${l.points}</span> ` : ""}${l.gold ? `<span class="gold num">${l.gold > 0 ? "+" : ""}${l.gold}</span>` : ""}</span></li>`).join("")}</ul>` : `<p class="muted small">아직 기록이 없어요.</p>`}</section>
    <section class="panel"><h3>내 계정</h3><div class="row"><button class="btn ghost" data-act="logout">로그아웃</button></div></section>`;
}
async function kDo(fn, msg) { try { const r = await fn(); if (msg) toast(msg); await kidLoad(); kidRender(); return r; } catch (e) { toast(e.message); } }
// a mini-game from the first tap to the reward card
async function playGame(kind) {
  if (K.busy) return; K.busy = true;
  try {
    const { playId } = await api("/api/kid/play/start", { game: kind, map: K.map });
    const score = await Games.run(kind, { map: K.map, title: K.d.maps[K.map].isles[kind] });
    if (score === null) { await api(`/api/kid/play/finish/${playId}`, { score: 0 }).catch(() => {}); toast("다음에 다시 도전해요"); }
    else { const r = await api(`/api/kid/play/finish/${playId}`, { score }); await rewardCard(r); }
    await kidLoad(); kidRender();
  } catch (e) { toast(e.message); }
  K.busy = false;
}
function rewardCard(r) {
  return new Promise(done => {
    const it = r.item, m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="panel reward"><div class="stars" aria-label="별 ${r.stars}개">${[0, 1, 2].map(i => `<i class="${i < r.stars ? "on" : ""}"></i>`).join("")}</div><h2>${r.stars ? "잘했어요!" : "아쉬워요!"}</h2><p class="num">점수 ${r.score} · ${pts(`+${r.points}`)}</p>
      ${it ? `<div class="found r-${esc(it.rarity)}"><span class="rar r-${esc(it.rarity)}">${esc(it.rarity)}</span>${it.slot === "weapon" ? `<div class="found-w">${weaponImg(it.key.split(".")[1])}</div>` : ""}<b>${esc(it.name)} 발견!</b><small>${it.dup ? `이미 있어서 금화 ${it.gold}개로 바꿨어요` : it.slot === "weapon" ? (K.d.deco.find(x => x.key === it.key).era > K.d.ships.find(s => s.id === K.d.me.ship).era ? `${K.d.ships.find(s => s.era === K.d.deco.find(x => x.key === it.key).era).name}부터 장착할 수 있어요` : "내 배 → 무기에서 장착할 수 있어요") : "내 배에서 쓸 수 있어요"}</small></div>` : ""}<button class="btn primary lg" data-close>확인</button></div>`;
    document.body.appendChild(m); const b = m.querySelector("[data-close]"); b.focus(); b.onclick = () => { m.remove(); done(); };
  });
}
// a battle already decided by the server, played out shot by shot
async function playFight() {
  if (K.busy) return; K.busy = true; let r;
  try { r = await api("/api/kid/battle", {}); } catch (e) { toast(e.message); K.busy = false; return; }
  const m = document.createElement("div"); m.className = "fight"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  const side = (p, cls) => `<div class="f-side ${cls}"><b>${esc(p.nickname)}</b><span class="small num">전투력 ${p.power}</span><div class="hpbar"><i style="width:100%"></i></div></div>`;
  const kindOf = p => K.d.deco.find(x => x.key === `weapon.${p.look.weapon}`)?.kind || "cannon";
  m.innerHTML = `<div class="f-top">${side(r.me, "a")}<span class="f-vs">VS</span>${side(r.opp, "d")}</div>
    <div class="f-sea"><div class="f-ship a" style="--sail:${sail(r.me.sail)}">${shipSVG(r.me.ship, r.me.look, r.me.sail)}</div><div class="f-ship d" style="--sail:${sail(r.opp.sail)}">${shipSVG(r.opp.ship, r.opp.look, r.opp.sail)}</div><i class="f-ball" hidden></i><span class="f-dmg" hidden></span></div>
    <div class="f-bottom"><button type="button" class="btn sm" data-skip>건너뛰기</button></div>`;
  document.body.appendChild(m);
  let fast = false; m.querySelector("[data-skip]").onclick = () => fast = true;
  const ball = m.querySelector(".f-ball"), dmgEl = m.querySelector(".f-dmg"), hpA = m.querySelector(".f-side.a .hpbar i"), hpD = m.querySelector(".f-side.d .hpbar i"), shipA = m.querySelector(".f-ship.a"), shipD = m.querySelector(".f-ship.d");
  await sleep(350);
  for (const s of r.rounds) {
    if (!fast) { const fromA = s.by === "a"; ball.className = `f-ball k-${kindOf(fromA ? r.me : r.opp)}${fromA ? "" : " rev"}`; ball.hidden = false; ball.style.transition = "none"; ball.style.left = fromA ? "26%" : "74%"; ball.offsetWidth; ball.style.transition = "left .42s linear"; ball.style.left = fromA ? "74%" : "26%"; await sleep(430); ball.hidden = true;
      const hit = fromA ? shipD : shipA; dmgEl.hidden = false; dmgEl.textContent = s.dmg ? `-${s.dmg}` : "빗나감"; dmgEl.style.left = fromA ? "74%" : "26%"; if (s.dmg) { hit.classList.add("hit"); setTimeout(() => hit.classList.remove("hit"), 260); } }
    hpA.style.width = s.hp.a + "%"; hpD.style.width = s.hp.d + "%";
    if (!fast) { await sleep(420); dmgEl.hidden = true; }
  }
  (r.won ? shipD : shipA).classList.add("sunk");
  await sleep(fast ? 100 : 500);
  m.querySelector(".f-bottom").innerHTML = `<div class="f-result ${r.won ? "win" : "lose"}"><h2>${r.won ? "승리!" : "패배"}</h2><p>${r.delta ? `금화 ${r.delta > 0 ? "+" : ""}${r.delta}개` : "잃은 금화는 없어요"}</p><p class="small">오늘 남은 전투 ${r.left}번</p><button class="btn primary lg" data-close>확인</button></div>`;
  await new Promise(res => { const b = m.querySelector("[data-close]"); b.focus(); b.onclick = res; });
  m.remove(); await kidLoad(); kidRender(); K.busy = false;
}
const KID_ACTS = {
  ktab: v => { K.tab = v; K.confirm = null; K.tryKey = null; K.tryShip = null; kidRender(); scrollTo(0, 0); },
  kisle: v => { K.confirm = null; if (!v) { K.isle = null; return kidRender(); } K.isle = v; const el = $("#wship"); if (el) el.style.cssText += ";" + shipAt(v); K.at = v; setTimeout(() => { kidRender(); $("#islePanel")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, el ? 620 : 0); },
  kplay: playGame, kfight: playFight,
  ksea: v => { const m = K.d.maps[Number(v)]; if (!seaOpen(m)) return toast(`${m.name}는 전투력 ${m.power}부터 열려요. 지금은 ${K.d.me.power}이에요`); K.map = m.id; K.isle = null; K.at = "port"; K.confirm = null; kidRender(); },
  kpassAsk: () => { K.confirm = "pass"; kidRender(); }, kno: () => { K.confirm = null; kidRender(); },
  kpass: () => { K.confirm = null; return kDo(() => api("/api/kid/pass", {}), "숙제 면제권을 샀어요! 선생님이 챙겨 줄 거예요"); },
  kgoShips: () => { K.tab = "deco"; K.slot = "ship"; kidRender(); scrollTo(0, 0); },
  krequest: v => kDo(() => api("/api/kid/request", { questId: Number(v) }), "선생님께 확인을 요청했어요"),
  kcancel: v => kDo(() => api(`/api/kid/cancel/${v}`, {})),
  kslot: v => { K.slot = v; K.tryKey = null; K.tryShip = null; K.confirm = null; kidRender(); },
  ktry: v => { K.tryKey = v && K.tryKey !== v ? v : null; kidRender(); },
  ktryShip: v => { K.tryShip = K.tryShip === v ? null : v; kidRender(); },
  kdecoAsk: v => { K.confirm = { key: v }; K.tryKey = v; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kdecoBuy: v => { K.confirm = null; K.tryKey = null; return kDo(() => api("/api/kid/deco/buy", { key: v }), "새 꾸미기를 달았어요!"); },
  kshipAsk: v => { K.confirm = { ship: v }; K.tryShip = v; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kshipBuy: v => { K.confirm = null; K.tryShip = null; return kDo(() => api("/api/kid/ship/buy", { id: v }), "새 배가 생겼어요!"); },
  kshipUse: v => { K.tryShip = null; return kDo(async () => { const r = await api("/api/kid/ship/use", { id: v }); if (r.removed) toast("이 배에는 달 수 없는 무기라서 내려놓았어요"); return r; }); },
  kwear: v => { const [item, where] = v.split("|"), [slot] = item.split("."); K.tryKey = null; return kDo(() => api("/api/kid/deco/wear", { slot, key: item.includes(".") ? item : null, where })); },
  ksail: v => kDo(() => api("/api/kid/sail", { sail: Number(v) })), kflag: v => kDo(() => api("/api/kid/sail", { flag: Number(v) }))
};
const KID_FORMS = {
  kpin: () => { const a = val("kp1"); if (!/^\d{4}$/.test(a)) return toast("숫자 4개로 정해 주세요"); if (a !== val("kp2")) return toast("두 번 넣은 숫자가 달라요"); return kDo(() => api("/api/kid/pin", { pin: a }), "비밀번호를 정했어요. 꼭 기억해요!"); },
  kex: () => kDo(() => api("/api/kid/exchange", { amount: Number(val("ex-n")) }), "금화로 바꿨어요")
};

/* =====================================================================
   TEACHER
   ===================================================================== */
const T = { d: null, tab: "grant", cls: "all", selQ: null, selS: new Set(), selR: new Set(), created: null, editQ: null, detail: null };
const TTABS = [["grant", "미션 지급"], ["crew", "반·선원"], ["quests", "미션 관리"], ["give", "건네줄 것"], ["battle", "전투·설정"], ["log", "오늘 기록"]];
async function tLoad() { T.d = await api("/api/t/state"); }
async function teacherStart() { await tLoad(); tRender(); setInterval(async () => { if (document.hidden) return; const a = document.activeElement; if (a && a.matches("input,select,textarea")) return; try { await tLoad(); tRender(); } catch (e) {} }, 15000); }
const sname = id => T.d.students.find(s => s.id === id)?.nickname || "삭제된 학생";
const cname = id => T.d.classes.find(c => c.id === id)?.name || "";
const tList = () => T.d.students.filter(s => T.cls === "all" || s.class_id === T.cls);
const tChips = () => T.d.classes.length < 2 ? "" : `<div class="chips">${[["all", "전체"], ...T.d.classes.map(c => [c.id, c.name])].map(([v, n]) => `<button class="chip" data-act="tcls" data-v="${v}" aria-pressed="${T.cls === v}">${esc(n)}</button>`).join("")}</div>`;
function tRender() {
  const d = T.d, keep = keepInputs(app);
  app.innerHTML = `<header class="top"><div class="hwrap"><div class="brand"><img src="${LOGO}" alt=""><div style="min-width:0"><h1>하이포스 제도</h1><small>선생님 · ${esc(d.teacher)}</small></div></div><div class="hright"><button class="btn ghost sm" data-act="logout">로그아웃</button></div></div>
    <nav class="tabs" aria-label="화면">${TTABS.map(([k, l]) => `<button data-act="ttab" data-v="${k}" aria-current="${T.tab === k}">${l}${k === "grant" && d.requests.length ? `<span class="cnt">${d.requests.length}</span>` : ""}${k === "give" && d.orders.length ? `<span class="cnt">${d.orders.length}</span>` : ""}</button>`).join("")}</nav></header>
    <main>${({ grant: tGrant, crew: tCrew, quests: tQuests, give: tGive, battle: tBattle, log: tLog })[T.tab]()}</main>`;
  restoreInputs(keep);
}
function tGrant() {
  const d = T.d, rs = d.requests, q = d.quests.find(x => x.id === T.selQ);
  return `<section class="panel"><h2>아이들이 "다 했어요" 누른 미션</h2>
    ${rs.length ? `<div class="plist">${rs.map(r => `<label class="prow"><span><input type="checkbox" data-act="tselr" data-v="${r.id}" ${T.selR.has(r.id) ? "checked" : ""}> <b>${esc(sname(r.student_id))}</b> · ${esc(r.title)} <span class="small muted">행동력 +${r.energy}</span></span><span class="small muted">${fmtTime(r.created_at)}</span><span></span></label>`).join("")}</div>
      <div class="row"><button class="btn sm" data-act="tselrAll">모두 선택</button><button class="btn primary" data-act="tapprove" ${T.selR.size ? "" : "disabled"}>${T.selR.size}개 승인</button><button class="btn danger" data-act="treject" ${T.selR.size ? "" : "disabled"}>반려</button></div>` : `<p class="muted small">새 요청이 없어요.</p>`}</section>
    <section class="panel"><div class="row between"><h2>직접 지급</h2>${tChips()}</div>
      <div class="chips">${d.quests.filter(x => x.active).map(x => `<button class="chip" data-act="tpickq" data-v="${x.id}" aria-pressed="${x.id === T.selQ}">${esc(x.title)} +${x.energy}</button>`).join("") || `<span class="muted small">미션 관리에서 미션을 만들어 주세요.</span>`}</div>
      <div class="chips">${tList().map(s => `<button class="chip" data-act="tpicks" data-v="${s.id}" aria-pressed="${T.selS.has(s.id)}">${esc(s.nickname)} · 행동력 ${s.bal.energy}</button>`).join("")}</div>
      <div class="row"><button class="btn sm" data-act="tselAll">모두 선택</button><button class="btn primary" data-act="tgrant" ${q && T.selS.size ? "" : "disabled"}>${T.selS.size}명에게 지급</button></div></section>`;
}
function tCrew() {
  const d = T.d, base = location.origin, s = d.students.find(x => x.id === T.detail);
  return `${T.created ? `<div class="notice"><b>임시 비밀번호 · 지금 한 번만 보여요</b><div class="plist">${T.created.map(c => `<div class="prow"><span>${esc(c.nickname)}</span><b class="code">${esc(c.pin)}</b><span></span></div>`).join("")}</div><div><button class="btn sm" data-act="tcloseCreated">다 적었어요</button></div></div>` : ""}
    <section class="panel"><h2>반</h2>${d.classes.length ? `<div class="tablewrap"><table><thead><tr><th>반</th><th>반 코드</th><th>접속 주소</th><th>학생</th><th>전투</th><th></th></tr></thead><tbody>${d.classes.map(c => `<tr><td><b>${esc(c.name)}</b></td><td><span class="code">${esc(c.code)}</span></td><td class="small muted">${esc(base)}/?c=${esc(c.code)}</td><td class="num">${d.students.filter(x => x.class_id === c.id).length}명</td>
      <td><button class="btn sm ${c.battle ? "primary" : ""}" data-act="tbattleOn" data-v="${c.id}">${c.battle ? "켜짐" : "꺼짐"}</button></td><td><button class="btn sm ghost" data-act="tdelClass" data-v="${c.id}">삭제</button></td></tr>`).join("")}</tbody></table></div>` : ""}
      <form class="row" data-form="addClass"><label class="f">새 반 이름<input type="text" id="nc-name" maxlength="20" required></label><button class="btn primary" style="align-self:end">반 만들기</button>${d.classes.length ? "" : `<button type="button" class="btn" style="align-self:end" data-act="tdemo">시연용 예시 반 만들기</button>`}</form></section>
    ${d.classes.length ? `<section class="panel"><h2>선원 등록</h2><form class="stack" style="gap:10px" data-form="addStudents"><label class="f">반<select id="ns-class">${d.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label><label class="f">닉네임 (여러 명이면 줄을 바꿔서)<textarea id="ns-names" rows="3"></textarea></label><div><button class="btn primary">등록하고 임시 비밀번호 만들기</button></div></form></section>` : ""}
    <section class="panel"><div class="row between"><h2>선원 현황</h2>${tChips()}</div>${tList().length ? `<div class="tablewrap"><table><thead><tr><th>이름</th><th>반</th><th>배</th><th>전투력</th><th>행동력</th><th>포인트</th><th>금화</th></tr></thead><tbody>${tList().map(x => `<tr class="click" data-act="tdetail" data-v="${x.id}" aria-selected="${x.id === T.detail}"><td style="--sail:${sail(x.sail)}"><b><i class="dot"></i> ${esc(x.nickname)}</b></td><td class="muted">${esc(cname(x.class_id))}</td><td class="small">${esc(d.ships.find(z => z.id === x.ship)?.name)}</td><td class="num">${x.power}</td><td class="num">${x.bal.energy}</td><td class="num">${x.bal.points}</td><td class="num">${x.bal.gold}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">아직 선원이 없어요.</p>`}</section>
    ${s ? `<section class="panel"><div class="row between"><h2>${esc(s.nickname)}</h2><button class="btn sm ghost" data-act="tdetail" data-v="${s.id}">닫기</button></div>
      <form class="row" data-form="adjust"><label class="f">종류<select id="adj-type"><option value="energy">행동력</option><option value="points">포인트</option><option value="gold">금화</option></select></label><label class="f">양<input type="number" id="adj-amt" placeholder="+5 / -5" required></label><label class="f" style="flex:1 1 150px">사유<input type="text" id="adj-why" maxlength="40"></label><button class="btn" style="align-self:end">반영</button></form>
      <div class="row"><button class="btn" data-act="tresetPin" data-v="${s.id}">비밀번호 새로 발급</button><button class="btn ghost" data-act="tdelStudent" data-v="${s.id}">선원 삭제</button></div></section>` : ""}`;
}
function tQuests() {
  const d = T.d, e = d.quests.find(q => q.id === T.editQ);
  return `<section class="panel"><h2>${e ? "미션 수정" : "새 미션"}</h2><form class="row" data-form="saveQuest"><label class="f" style="flex:1 1 220px">내용<input type="text" id="q-title" maxlength="40" required value="${esc(e?.title || "")}" data-keep="no"></label>
      <label class="f">과목<select id="q-subj" data-keep="no">${SUBJECTS.map(s => `<option ${e?.subject === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label class="f">주기<select id="q-kind" data-keep="no">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${e?.kind === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="f">행동력<input type="number" id="q-en" min="0" max="50" value="${e?.energy ?? 1}" data-keep="no" required></label><button class="btn primary" style="align-self:end">${e ? "저장" : "추가"}</button>${e ? `<button type="button" class="btn ghost" style="align-self:end" data-act="teditQ">취소</button>` : ""}</form></section>
    <section class="panel"><h2>미션 목록</h2>${d.quests.length ? `<div class="tablewrap"><table><thead><tr><th>미션</th><th>과목</th><th>주기</th><th>행동력</th><th></th></tr></thead><tbody>${d.quests.map(q => `<tr><td>${esc(q.title)}</td><td>${esc(q.subject)}</td><td>${KINDS[q.kind]}</td><td class="num">+${q.energy}</td><td class="row"><button class="btn sm ${q.active ? "primary" : ""}" data-act="ttoggleQ" data-v="${q.id}">${q.active ? "보임" : "숨김"}</button><button class="btn sm ghost" data-act="teditQ" data-v="${q.id}">수정</button><button class="btn sm ghost" data-act="tdelQ" data-v="${q.id}">삭제</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">첫 미션을 만들어 주세요.</p>`}</section>`;
}
function tGive() {
  const d = T.d;
  return `<section class="panel"><h2>건네줄 것</h2><p class="small muted">아이들이 포인트로 산 숙제 면제권이에요. 실제로 적용한 뒤 '줬어요'를 눌러요.</p>${d.orders.length ? `<div class="plist">${d.orders.map(o => `<div class="prow"><span><b>${esc(sname(o.student_id))}</b> · ${esc(o.name)} <span class="small muted">${fmtTime(o.created_at)}</span></span><button class="btn sm ghost" data-act="tcancelOrder" data-v="${o.id}">취소(환불)</button><button class="btn sm primary" data-act="tdeliver" data-v="${o.id}">줬어요</button></div>`).join("")}</div>` : `<p class="muted small">지금 건네줄 것이 없어요.</p>`}</section>`;
}
function tBattle() {
  const d = T.d, g = d.game, n = (id, label, v, max = 100000) => `<label class="f">${label}<input type="number" id="${id}" min="0" max="${max}" value="${v}" data-keep="no"></label>`;
  return `<section class="panel"><h2>게임 설정</h2><form class="row" data-form="saveGame">${n("g-max", "행동력 최대", g.energyMax, 200)}${n("g-cost", "한 판 행동력", g.playCost, 20)}${n("g-pass", "면제권 포인트", g.passCost)}${n("g-bat", "하루 전투 횟수", g.battlesPerDay, 20)}${n("g-win", "승리 금화", g.win)}${n("g-lose", "패배 시 잃는 금화", g.lose)}${n("g-def", "방어 성공 금화", g.defend)}${n("g-from", "전투 시작 시각", g.hourFrom, 24)}${n("g-to", "전투 끝 시각", g.hourTo, 24)}<button class="btn primary" style="align-self:end">저장</button></form>
      <p class="small muted">시작과 끝 시각이 같으면 언제든 전투할 수 있어요. 반별로 끄려면 '반·선원'에서 눌러요. 저장하면 바로 적용돼요.</p></section>
    <section class="panel"><h2>오늘 전투</h2>${d.battles.length ? `<div class="plist">${d.battles.map(b => `<div class="prow"><span>${esc(b.a_name)} → ${esc(b.d_name)} <span class="small muted">${fmtTime(b.at)}</span></span><span class="pill ${b.winner === b.attacker ? "ok" : ""}">${b.winner === b.attacker ? "공격 승" : "방어 승"}</span><span class="small num">${b.delta > 0 ? "+" : ""}${b.delta}금화</span></div>`).join("")}</div>` : `<p class="muted small">오늘 전투가 아직 없어요.</p>`}</section>
    <section class="panel"><h3>내 비밀번호 바꾸기</h3><form class="row" data-form="tpw"><input type="password" id="tpw" autocomplete="new-password" placeholder="4자 이상" data-keep="no"><button class="btn">바꾸기</button></form></section>`;
}
function tLog() {
  const d = T.d;
  return `<section class="panel feed"><h2>오늘 기록</h2>${d.logs.length ? `<ul>${d.logs.map(l => `<li><time class="num">${fmtTime(l.at)}</time><span><b>${esc(sname(l.student_id))}</b> · ${esc(l.title)} <span class="small">${l.energy ? `행동력 ${l.energy} ` : ""}${l.points ? `포인트 ${l.points} ` : ""}${l.gold ? `금화 ${l.gold}` : ""}</span></span><button class="btn sm ghost" data-act="tundo" data-v="${l.id}">취소</button></li>`).join("")}</ul>` : `<p class="muted small">오늘 기록이 없어요.</p>`}</section>`;
}
async function tDo(fn, msg) { try { const r = await fn(); if (msg) toast(msg); await tLoad(); tRender(); return r; } catch (e) { toast(e.message); } }
const T_ACTS = {
  ttab: v => { T.tab = v; tRender(); scrollTo(0, 0); }, tcls: v => { T.cls = v === "all" ? "all" : Number(v); tRender(); },
  tselr: v => { const i = Number(v); T.selR.has(i) ? T.selR.delete(i) : T.selR.add(i); tRender(); }, tselrAll: () => { T.d.requests.forEach(r => T.selR.add(r.id)); tRender(); },
  tapprove: async () => { const ids = [...T.selR]; T.selR.clear(); const r = await tDo(() => api("/api/t/requests/approve", { ids })); if (r) toast(`${r.given}개 승인했어요${r.skipped.length ? ` · ${r.skipped.length}개는 이미 받은 미션이에요` : ""}`); },
  treject: () => { const ids = [...T.selR]; T.selR.clear(); return tDo(() => api("/api/t/requests/reject", { ids }), "반려했어요"); },
  tpickq: v => { T.selQ = T.selQ === Number(v) ? null : Number(v); tRender(); }, tpicks: v => { const i = Number(v); T.selS.has(i) ? T.selS.delete(i) : T.selS.add(i); tRender(); }, tselAll: () => { tList().forEach(s => T.selS.add(s.id)); tRender(); },
  tgrant: async () => { const ids = [...T.selS]; T.selS.clear(); const r = await tDo(() => api("/api/t/grant", { questId: T.selQ, studentIds: ids })); if (r) toast(`${r.given}명에게 지급했어요${r.skipped.length ? ` · ${r.skipped.length}명은 이미 받았어요` : ""}`); },
  tcloseCreated: () => { T.created = null; tRender(); }, tdetail: v => { T.detail = T.detail === Number(v) ? null : Number(v); tRender(); },
  tbattleOn: v => { const c = T.d.classes.find(x => x.id === Number(v)); return tDo(() => api(`/api/t/classes/${v}/battle`, { on: !c.battle }), `${c.name}: 전투 ${c.battle ? "껐어요" : "켰어요"}`); },
  tdelClass: v => { const c = T.d.classes.find(x => x.id === Number(v)); if (T.delArm !== v) { T.delArm = v; return toast(`${c.name}의 삭제 버튼을 한 번 더 누르면 반과 학생이 모두 삭제돼요`); } T.delArm = null; return tDo(() => api(`/api/t/classes/${v}/delete`, {}), "반을 삭제했어요"); },
  tdemo: async () => { const r = await tDo(() => api("/api/t/demo", {})); if (r) toast(`시연반 코드 ${r.code} · 비밀번호 모두 ${r.pin}`); },
  tresetPin: async v => { const r = await tDo(() => api(`/api/t/students/${v}/reset-pin`, {})); if (r) { T.created = [{ nickname: sname(Number(v)), pin: r.pin }]; tRender(); scrollTo(0, 0); } },
  tdelStudent: v => { if (T.delS !== v) { T.delS = v; return toast("한 번 더 누르면 선원이 삭제돼요"); } T.delS = null; T.detail = null; return tDo(() => api(`/api/t/students/${v}/delete`, {}), "선원을 삭제했어요"); },
  teditQ: v => { T.editQ = v ? Number(v) : null; tRender(); scrollTo(0, 0); }, ttoggleQ: v => tDo(() => api(`/api/t/quests/${v}/toggle`, {})), tdelQ: v => tDo(() => api(`/api/t/quests/${v}/delete`, {}), "미션을 삭제했어요"),
  tdeliver: v => tDo(() => api(`/api/t/orders/${v}/deliver`, {}), "줬어요로 표시했어요"), tcancelOrder: v => tDo(() => api(`/api/t/orders/${v}/cancel`, {}), "취소하고 포인트를 돌려줬어요"), tundo: v => tDo(() => api(`/api/t/logs/${v}/undo`, {}), "기록을 취소했어요")
};
const T_FORMS = {
  addClass: async () => { const r = await tDo(() => api("/api/t/classes", { name: val("nc-name") })); if (r) { toast(`반 코드 ${r.code}`); const el = $("#nc-name"); if (el) el.value = ""; } },
  addStudents: async () => { const r = await tDo(() => api("/api/t/students", { classId: Number(val("ns-class")), names: $("#ns-names").value })); if (r) { T.created = r.created; $("#ns-names").value = ""; tRender(); scrollTo(0, 0); } },
  adjust: () => tDo(() => api("/api/t/adjust", { studentId: T.detail, type: val("adj-type"), amount: Number(val("adj-amt")), title: val("adj-why") || "선생님 조정" }), "반영했어요"),
  saveQuest: () => { const id = T.editQ; T.editQ = null; return tDo(() => api("/api/t/quests", { id, title: val("q-title"), subject: val("q-subj"), kind: val("q-kind"), energy: Number(val("q-en")) }), "미션을 저장했어요"); },
  saveGame: () => tDo(() => api("/api/t/game", { energyMax: val("g-max"), playCost: val("g-cost"), passCost: val("g-pass"), battlesPerDay: val("g-bat"), win: val("g-win"), lose: val("g-lose"), defend: val("g-def"), hourFrom: val("g-from"), hourTo: val("g-to") }), "저장했어요"),
  tpw: () => tDo(() => api("/api/t/password", { password: $("#tpw").value }), "비밀번호를 바꿨어요")
};

/* ---------- wiring ---------- */
let ROLE = null;
const COMMON = { install: async () => { if (!installEvt) return; const e = installEvt; e.prompt(); try { await e.userChoice; } catch (err) {} installEvt = null; installRefresh(); }, installHide: () => { ls.set("hs_install_hide", "1"); installRefresh(); }, logout: async () => { try { await api("/api/logout", {}); } catch (e) {} location.replace("/"); } };
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const a = b.dataset.act, f = COMMON[a] || (ROLE === "teacher" ? T_ACTS[a] : ROLE === "student" ? KID_ACTS[a] : GATE_ACTS[a]);
  if (f) { if (b.type !== "checkbox") e.preventDefault(); f(b.dataset.v); }
});
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".isle")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
document.addEventListener("submit", e => { const f = (ROLE === "teacher" ? T_FORMS : ROLE === "student" ? KID_FORMS : GATE_FORMS)[e.target.dataset.form]; if (f) { e.preventDefault(); f(e.target); } });
(async function boot() {
  try { const me = await api("/api/me"); ROLE = me.role; if (me.role === "teacher") await teacherStart(); else if (me.role === "student") await kidStart(); else gate(me.needSetup); }
  catch (e) { app.innerHTML = `<div class="gate"><div class="card"><h2>연결하지 못했어요</h2><p class="muted">${esc(e.message)}</p><button class="btn primary" onclick="location.reload()">다시 시도</button></div></div>`; }
})();
