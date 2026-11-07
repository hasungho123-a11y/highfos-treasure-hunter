/* 하이포스 매쓰아일랜드 — screens for students (phone) and teachers (classroom screen) */
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
  let r; try { r = await fetch(path, { credentials: "same-origin", ...opt }); } catch (e) { throw Object.assign(new Error("인터넷 연결을 확인해 주세요"), { retry: true }); }
  const d = await r.json().catch(() => ({ error: "서버 응답을 읽지 못했어요" }));
  if (r.status === 401 && !/login|setup/.test(path)) { toast("다시 로그인해 주세요"); setTimeout(() => location.reload(), 900); }
  if (!r.ok) throw Object.assign(new Error(d.error || "문제가 생겼어요"), { retry: r.status !== 400 });
  return d;
}
// a second tap while the first is still on its way is ignored, however slow the connection. A request that never answers lets go after 20 seconds.
let acting = 0;
async function oneAtATime(fn) { if (Date.now() - acting < 20000) return; acting = Date.now(); try { return await fn(); } finally { acting = 0; } }
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
// where an approved photo goes on the 2D ship: over the main sail, or painted on the hull side of ships without sails
const PHOTO_SAIL = { dinghy: [31, 12, 14, 19, "M31 12 L31 31 L45 31 Z"], sloop: [20, 18, 15.5, 12, "M20 18 H34 Q36 24 34 30 H20 Z"], brig: [31, 17, 15.5, 13, "M31 17 H45 Q47 23 45 30 H31 Z"] };
const PHOTO_HULL = { ironclad: [20, 31.3, 10.2, 8.5], destroyer: [17, 30.9, 10.8, 9], cruiser: [17, 29.2, 13.8, 11.5], carrier: [20, 28.4, 14.8, 12.3] };
function shipPhoto(id, look) {
  const src = V.photoSrc(look); if (!src) return "";
  if (PHOTO_SAIL[id]) return V.photoSVG(src, ...PHOTO_SAIL[id]);
  const h = PHOTO_HULL[id]; if (!h) return "";
  return V.photoSVG(src, h[0], h[1], h[2], h[3], `M${h[0]} ${h[1]} h${h[2]} v${h[3]} h${-h[2]} Z`) + `<rect x="${h[0]}" y="${h[1]}" width="${h[2]}" height="${h[3]}" fill="none" stroke="#F4EFE6" stroke-width=".4"/>`;
}
// the small sailing ships reuse the galleon's attachments, moved and scaled onto their own hull: [x, y, scale, trim line]
const SMALL_SHIP = { dinghy: [12.2, 13.6, .593, "M16 34.5 H44.4"], sloop: [5.6, 5.2, .815, "M10 33.5 L50.6 32.5"], brig: [1.1, -.4, .98, "M7 33.5 L54 32.5"] };
const STACKS_2D = { ironclad: [[26.5, 12], [35.5, 14]], destroyer: [[34, 20]], cruiser: [[35, 14], [40, 15]], carrier: [[38, 15]] };
const heli2D = (x, y) => `<g transform="translate(${x} ${y})"><ellipse rx="2.6" ry="1.3" fill="#2F4A5F"/><path d="M-2 0 L-6 -.6" stroke="#2F4A5F" stroke-width=".7"/><path d="M0 -1.3 V-1.8 M-4.4 -1.9 H4.4" stroke="#23262B" stroke-width=".4"/></g>`;
const drone2D = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-2.6 0 H2.4 L3 .3 L2 .7 H-2 Z" fill="#6B7884"/><path d="M-.6 .1 L-1.6 -.6 H.4 Z M-2.5 0 L-3.1 -1.1 H-2.2 L-1.8 0 Z" fill="#3E4A55"/></g>`;
const jet2D = (x, y) => `<path transform="translate(${x} ${y})" d="M-3 0 L3 0 L4.2 -.4 L1 -.9 L-1.6 -.9 L-3 -2.4 L-3.6 -2.4 Z" fill="#7F90A0"/>`;
const AIR_2D = {
  cruiser: { heli: () => heli2D(7, 18), drone: () => drone2D(52, 12) },
  carrier: { heli: () => heli2D(24, 19), drone: () => drone2D(52, 9), vtol: () => jet2D(54, 20), fighter: () => jet2D(6, 12) + jet2D(14, 9) + jet2D(14, 15), awacs: () => `<g transform="translate(24 7)"><path d="M-5 .8 H5 L6 0 L1 -.4 L-3.6 -.4 L-5 -2 H-5.6 Z" fill="#AEB8C2"/><ellipse cy="-1.5" rx="2.4" ry=".6" fill="#3E4A55"/></g>` }
};
// what the sailing and steel ships each add to the plain drawing
function shipExtras2D(id, look) {
  const small = SMALL_SHIP[id];
  if (small) { const att = new Set(look.att || []), [x, y, k, line] = small; return `${look.trim ? `<path d="${line}" stroke="${V.TRIMS[look.trim]}" stroke-width=".9" fill="none"/>` : ""}<g transform="translate(${x} ${y}) scale(${k})">${V.attAbove(att)}${V.attOver(att, look)}</g>`; }
  const smoke = V.SMOKE[look.smoke], puffs = smoke ? (STACKS_2D[id] || []).map(([x, y]) => [[0, 0, 1.7], [-1.6, -2.4, 2.1], [-3.8, -4.4, 2.5]].map(([dx, dy, r], i) => `<circle cx="${x + dx}" cy="${y - 1 + dy}" r="${r}" fill="${smoke[(Math.floor(x) + i) % smoke.length]}" opacity="${.9 - i * .2}"/>`).join("")).join("") : "";
  const air = AIR_2D[id] ? (look.att || []).map(k => AIR_2D[id][k]?.() || "").join("") : "";
  return puffs + air;
}
function shipSVG(id, look = {}, sailIdx = 0) {
  if (id === "galleon") return V.boatSVG(look, sailIdx).replace(/<\/g><\/svg>\s*$/, weaponOnShip(id, look) + "</g></svg>");
  const s = sail(sailIdx), camo = V.CAMO[look.camo] ? `url(#dk-c-${look.camo})` : "", wood = HULLS[look.hull] || "#7A4A28", grey = camo || HULLS[look.hull] || "#5F6973", m = "#4E321E", st = "#8A949E", ir = "#23262B";
  const [cloth, overlay] = V.sailPaint(look, s), sl = (d, attrs = "") => `<path d="${d}" fill="${cloth}" ${attrs}/>${overlay ? `<path d="${d}" fill="${overlay}" ${attrs}/>` : ""}`;
  const parts = {
    dinghy: `<path d="M30 33 V11" stroke="${m}" stroke-width="1.3"/>${sl("M31 12 L31 31 L45 31 Z")}<path d="M29 16 L29 31 L18 31 Z" fill="#FFF8EA"/>${flagSVG(30, 7, look, sailIdx)}<path d="M14 32 L46 32 L42 40 Q30 43 18 40 Z" fill="${wood}"/>`,
    sloop: `<path d="M27 32 V6" stroke="${m}" stroke-width="1.4"/>${sl("M21 9 H33 Q35 13 33 17 H21 Z M20 18 H34 Q36 24 34 30 H20 Z")}${sl("M52 25 L28 8 L30 30 Z", `opacity=".85"`)}${flagSVG(27, 2, look, sailIdx)}<path d="M8 31 L52 30 L47 40 Q30 44 12 41 Z" fill="${wood}"/>`,
    brig: `<path d="M21 32 V7 M38 32 V5" stroke="${m}" stroke-width="1.4"/>${sl("M15 10 H27 Q29 13 27 17 H15 Z M14 18 H28 Q30 24 28 30 H14 Z M32 8 H44 Q46 12 44 16 H32 Z M31 17 H45 Q47 23 45 30 H31 Z")}${sl("M57 24 L40 7 L42 28 Z", `opacity=".85"`)}${flagSVG(38, 1, look, sailIdx)}<path d="M4 27 L14 28 L16 31 L50 30 L57 27 L52 39 Q32 44 11 41 Z" fill="${wood}"/>`,
    ironclad: `<path d="M16 31 V10" stroke="${m}" stroke-width="1"/>${flagSVG(16, 6, look, sailIdx)}<rect x="24" y="12" width="5" height="12" fill="${ir}"/><rect x="33" y="14" width="5" height="10" fill="${ir}"/><rect x="19" y="23" width="25" height="8" rx="1" fill="${st}"/><path d="M3 31 L57 30 L53 40 Q30 43 7 40 Z" fill="${camo || HULLS[look.hull] || "#3C3F44"}"/>`,
    destroyer: `<path d="M27 19 V6" stroke="${ir}" stroke-width=".9"/>${flagSVG(27, 3, look, sailIdx)}<rect x="22" y="18" width="9" height="7" fill="${st}"/><rect x="18" y="24" width="18" height="8" fill="${st}"/><rect x="38" y="20" width="4" height="10" fill="${ir}" transform="translate(-6 0)"/><path d="M45 28 h3 v2 h-3 Z M48 28.6 H54 M9 29 h3 v2 h-3 Z M9 29.6 H4" stroke="${ir}" fill="${ir}" stroke-width=".8"/><path d="M2 31 L59 28 L52 40 L7 40 Z" fill="${grey}"/>`,
    cruiser: `<path d="M26 16 V2 M38 18 V7" stroke="${ir}" stroke-width=".9"/>${flagSVG(26, 0, look, sailIdx)}<rect x="20" y="10" width="10" height="7" fill="${st}"/><rect x="16" y="16" width="20" height="8" fill="${st}"/><rect x="11" y="23" width="30" height="7" fill="${st}"/><rect x="33" y="14" width="4" height="9" fill="${ir}"/><rect x="38" y="15" width="4" height="8" fill="${ir}"/><path d="M47 26 h4 v3 h-4 Z M51 27 H57 M6 26 h4 v3 h-4 Z M6 27 H1" stroke="${ir}" fill="${ir}" stroke-width=".9"/><path d="M1 30 L59 27 L53 41 L6 41 Z" fill="${grey}"/>`,
    carrier: `<path d="M37 16 V4" stroke="${ir}" stroke-width=".9"/>${flagSVG(37, 1, look, sailIdx)}<rect x="32" y="15" width="11" height="6" fill="${st}"/><rect x="30" y="20" width="15" height="6" fill="${st}"/><rect x="0" y="26" width="60" height="2.2" fill="#3A4046"/><path d="M6 25.4 l4 -1 l1 1 Z M15 25.4 l4 -1 l1 1 Z M50 25.4 l4 -1 l1 1 Z" fill="${st}"/><path d="M3 28 L58 28 L53 41 L8 41 Z" fill="${camo || HULLS[look.hull] || "#555E67"}"/>`
  };
  return `<svg viewBox="0 0 60 48" aria-hidden="true"><g class="hull">${parts[id] || parts.dinghy}${shipExtras2D(id, look)}${shipPhoto(id, look)}${weaponOnShip(id, look)}</g></svg>`;
}
/* shop cards: a 3D still of the ship wearing that item on its sea's water. The flat ship shows until the still is ready, and stays where 3D can't run. Only cards on screen get one. */
const THUMBS = new Map(); let thumbQ = [], thumbBusy = false, thumbFail = false, thumbIO = null;
// cuts the empty space around a ship, so the card can show it as large as it fits
const trimPic = url => trimBox(url).then(t => t.url);
const trimBox = url => loadImg(url).then(im => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const a = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (a[(y * c.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { url, x: 0, y: 0, w: im.width, h: im.height }; const o = document.createElement("canvas"); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext("2d").drawImage(c, -x0, -y0); return { url: o.toDataURL("image/webp", .9), x: x0, y: y0, w: o.width, h: o.height }; });
function thumbCard(ship, look, sailIdx) { const key = JSON.stringify([ship, look, sailIdx, inDeck() && (K.slot === "hull" || K.slot === "camo")]), pic = THUMBS.get(key), era = K.d.ships.find(s => s.id === ship)?.era ?? 0;
  return `<div class="deco-sea tiny art" style="--pic:url(/maps/sea${Math.min(2, era) + 1}.webp)" ${pic ? "" : `data-thumb="${esc(key)}"`}><div class="ship mine ${pic ? "s3" : ""} ${V.wakeClass(look)}" style="--sail:${sail(sailIdx)}">${pic ? `<img class="hull" src="${pic}" alt="">` : shipSVG(ship, look, sailIdx)}</div></div>`; }
function thumbScan() { thumbIO?.disconnect(); thumbQ = []; if (thumbFail || !window.Ship3D?.available()) return;
  thumbIO = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { thumbIO.unobserve(e.target); if (!thumbQ.includes(e.target.dataset.thumb)) thumbQ.push(e.target.dataset.thumb); } thumbPump(); }, { rootMargin: "200px" });
  document.querySelectorAll("[data-thumb]").forEach(el => thumbIO.observe(el)); }
async function thumbPump() { if (thumbBusy || !thumbQ.length) return; thumbBusy = true;
  try { const v = await Ship3D.thumbs();
    while (thumbQ.length) { const key = thumbQ.shift(), [ship, look, sailIdx, low] = JSON.parse(key);
      if (!THUMBS.has(key)) { const s = sail(sailIdx); THUMBS.set(key, await trimPic((await v.snapshot(look, s, look.fc != null ? sail(look.fc) : s, ship, 384, low ? { ph: 1.3 } : {})).url)); } // hull colours need a low camera: from above a flat-topped ship shows only its deck
      document.querySelectorAll("[data-thumb]").forEach(el => { if (el.dataset.thumb !== key) return; el.removeAttribute("data-thumb"); const box = el.querySelector(".ship"); box.classList.add("s3"); box.innerHTML = `<img class="hull" src="${THUMBS.get(key)}" alt="">`; });
      await sleep(30); }
  } catch (e) { thumbFail = true; thumbQ = []; }
  thumbBusy = false; }
const shipBox = (ship, look, sailIdx, name, cls = "") => cls === "tiny" ? thumbCard(ship, look, sailIdx) : `<div class="deco-sea ${cls}"><div class="ship mine ${V.wakeClass(look)}" style="--sail:${sail(sailIdx)}">${shipSVG(ship, look, sailIdx)}${name ? `<span class="nmtag ${V.tagClass(look)}">${esc(name)}</span>` : ""}</div></div>`;

/* ---------- 3D ---------- */
function show3D(host, look, sailIdx, shipId) {
  if (!host || !window.Ship3D) return;
  Ship3D.get().then(v => { if (!host.isConnected) return; v.setLook(look, sail(sailIdx), look.fc != null ? sail(look.fc) : sail(sailIdx), shipId); v.focusWeapon(inDeck() && K.slot === "weapon"); v.mount(host); host.classList.add("ready"); })
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
  app.innerHTML = `<div class="gate"><div class="card"><div class="logo"><img src="${LOGO}" alt=""><div><h1>하이포스 매쓰아일랜드</h1><small>수학으로 떠나는 섬 모험</small></div></div>${G.err ? `<p class="err">${esc(G.err)}</p>` : ""}${G.mode === "setup" || G.mode === "teacher" ? "" : installCard()}${body}</div></div>`;
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
// the gear and shop screens share one page and one preview ship
function inDeck() { return K.tab === "deco" || K.tab === "shop"; }
// the third value keeps a tab to the ships it can show on
const DECO_TABS = [["ship", "배"], ["upgrade", "배 강화"], ["color", "돛·깃발 색"], ["weapon", "무기"], ["emblem", "문양"], ["photo", "내 사진"], ["camo", "위장 도색", "steel"], ["air", "함재기", "steel"], ["smoke", "연기", "steel"], ["pattern", "돛 무늬", "sail"], ["hull", "배 색"], ["att", "부착물"], ["head", "선수상", "sail"], ["trim", "테두리", "sail"], ["wake", "물결"], ["tag", "이름표"]];
const withItem = (look, x) => x.slot === "att" ? { ...look, att: [...new Set([...(look.att || []), x.id])] } : x.slot === "emblem" ? { ...look, se: x.id } : { ...look, [x.slot]: x.id };
// camo paints over the hull colour, so a hull colour is previewed without it (the shop says so in a note)
const previewItem = (look, x) => x.slot === "hull" ? { ...withItem(look, x), camo: undefined } : withItem(look, x);
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
  document.body.classList.add("kid"); await kidLoad(); kidRender(); flushResults().then(kidNotices); addEventListener("online", flushResults);
  setInterval(async () => { if (document.hidden || K.busy || K.crop || $(".game") || $(".fight") || $(".modal")) return; const a = document.activeElement; if (a && a.matches("input,select")) return; try { await flushResults(); await kidLoad(); kidRender(); kidNotices(); } catch (e) {} }, 30000);
  duelLoop();
}
/* ---------- the class boss ---------- */
// a still of the 3D ship for each state of damage, kept between visits; until it is ready (or where 3D can't run) the flat drawing stands in
const bossStage = (left, hp) => { const r = left / hp; return r > .75 ? 0 : r > .5 ? 1 : r > .25 ? 2 : 3; };
const BOSS_STATE = ["아직 멀쩡해요", "배에 불이 붙었어요", "크게 기울었어요", "곧 가라앉아요!"];
const bossMem = (art, stage) => `hs_boss_v2_${art.ship}_${art.sail.slice(1)}_${stage}`;
// fire and smoke drawn over the still; only these few shapes move, so the card costs a phone almost nothing
let bossFireId = 0;
const BOSS_TONGUES = [[0, 1], [-3.4, .62], [3.2, .7]]; // each fire is a low, uneven cluster, so it reads as a burning deck and not as one icon
function bossFire(stage, W, spots) { if (!stage) return ""; const id = `bf${++bossFireId}`, s = W * .0075;
  const one = ([x, y], i) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})">${[0, 1, 2, 3].map(n => `<circle class="bw-smoke" r="7" cy="-9" fill="url(#${id}s)" style="animation-delay:${-(n * .72 + i * .4).toFixed(2)}s"/>`).join("")}<ellipse rx="9" ry="3.4" fill="url(#${id}g)"/>${BOSS_TONGUES.map(([dx, k], n) => `<path class="bw-flame" style="animation-delay:${-(i * .23 + n * .17).toFixed(2)}s" transform="translate(${dx} 0) scale(${k * .72})" fill="url(#${id}f)" d="M0 1C-5 1-6-4-3.5-8-3-10-1.6-12-1-16 .8-12 4.6-9.6 5-5 5.4-1.6 3.4 1 0 1Z"/>`).join("")}</g>`;
  return `<defs><radialGradient id="${id}s"><stop offset="0" stop-color="#413C3D" stop-opacity=".95"/><stop offset=".62" stop-color="#4E494A" stop-opacity=".62"/><stop offset="1" stop-color="#5C5758" stop-opacity="0"/></radialGradient><radialGradient id="${id}g"><stop offset="0" stop-color="#FF9A2E" stop-opacity=".85"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient><linearGradient id="${id}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFE9A0"/><stop offset=".34" stop-color="#FFA52B"/><stop offset=".74" stop-color="#E8481A"/><stop offset="1" stop-color="#B8200F" stop-opacity=".25"/></linearGradient></defs>${spots.slice(0, stage).map(one).join("")}`; }
function bossShip(art, stage = 0) { let pic = null; try { pic = JSON.parse(ls.get(bossMem(art, stage))); } catch (e) {}
  if (!pic) wantBossPic(art, stage);
  if (pic) return `<svg viewBox="0 0 ${pic.w} ${pic.h}" aria-hidden="true"><image href="${pic.u}" width="${pic.w}" height="${pic.h}"/>${bossFire(stage, pic.w, pic.s)}</svg>`;
  return shipSVG(art.ship, art.look, 0).replace(`<g class="hull">`, `<g class="hull" style="filter:brightness(${[1, .86, .7, .55][stage]});transform:rotate(${stage * 2}deg);transform-origin:center">`).replace(/<\/svg>$/, `${bossFire(stage, 60, [[24, 27], [38, 25], [31, 22]])}</svg>`); }
const bossShipBox = (art, stage, cls = "") => `<div class="boss-ship ${cls}" data-boss-ship="${bossMem(art, stage)}">${bossShip(art, stage)}</div>`;
async function wantBossPic(art, stage) { const mem = bossMem(art, stage); K.bossPicBusy ||= new Set(); if (K.bossPicBusy.has(mem) || K.bossPicFail || !window.Ship3D?.available()) return; K.bossPicBusy.add(mem);
  try { const v = await Ship3D.thumbs(), shot = await v.snapshot(art.look, art.sail, art.sail, art.ship, 384, { th: 2.45, ph: 1.2, damage: stage }), t = await trimBox(shot.url);
    ls.set(mem, JSON.stringify({ u: t.url, w: t.w, h: t.h, s: shot.spots.map(([x, y]) => [x - t.x, y - t.y]) }));
    document.querySelectorAll(`[data-boss-ship="${mem}"]`).forEach(el => el.innerHTML = bossShip(art, stage));
  } catch (e) { K.bossPicFail = true; }
  K.bossPicBusy.delete(mem); }
function bossCard() { const b = K.d.boss; if (!b || b.off) return "";
  // before the bar plays out, the ship still looks the way this kid last saw it
  const stage = bossStage(Math.max(b.left, Number(ls.get(`hs_boss_left_${b.id}`) ?? b.hp)), b.hp);
  const pct = b.left / b.hp * 100, feed = b.feed.slice(0, 3).map(f => `<li><b>${esc(f.who)}</b> ${{ quest: "미션", game: "미니게임", teacher: "포격" }[f.src]} <span class="num">-${f.dmg}</span></li>`).join("");
  return `<section class="panel boss ${b.down ? "down" : ""}" id="bossCard"><div class="boss-sea" style="--pic:url(/maps/sea${K.map + 1}.webp)">${bossShipBox(b.art, stage)}<span class="boss-pop" hidden></span></div>
    <div class="boss-body"><span class="small muted">이번 주 우리 반 보스</span><h2>${esc(b.name)}</h2>${b.down ? "" : `<span class="boss-state small" id="bossState">${BOSS_STATE[stage]}</span>`}
      <div class="boss-hp" role="progressbar" aria-label="보스 체력" aria-valuemin="0" aria-valuemax="${b.hp}" aria-valuenow="${b.left}"><i id="bossBar" style="width:${pct}%"></i><b class="num">${b.left} / ${b.hp}</b></div>
      ${b.down ? `<p class="small"><b>우리 반이 격파했어요!</b> 다음 보스는 월요일에 나타나요.</p>` : `<p class="small">미션 확인 1개 <b class="num">-${b.questDmg}</b><br>미니게임 별 1개 <b class="num">-${b.starDmg}</b><br>일요일까지 잡으면 공격한 친구 모두 금화 <b class="num">${b.gold}</b>개!</p>`}
      <p class="small muted">내 공격 <b class="num">${b.mine}</b> · 함께한 친구 <b class="num">${b.joined}</b>/${b.crew}명</p>
      ${feed ? `<ul class="boss-feed small">${feed}</ul>` : ""}</div></section>`; }
function kBoss() { const card = bossCard(); if (!card) return `<section class="panel"><h2>보스</h2><p class="small muted">이번 주에는 나타난 보스가 없어요.</p></section>`;
  return `${card}${K.d.boss.down ? "" : `<div class="row boss-go"><button class="btn primary" data-act="ktab" data-v="missions">미션 하러 가기</button><button class="btn" data-act="ktab" data-v="map">미니게임 하러 가기</button></div>`}`; }
// the bar remembers what this kid last saw, so damage done by anyone since then plays out on arrival
function bossAnim() { const b = K.d.boss, bar = $("#bossBar"); if (!b || b.off || !bar) return; const mem = `hs_boss_left_${b.id}`, seen = Number(ls.get(mem) ?? b.hp); ls.set(mem, b.left);
  if (seen <= b.left) return; bar.style.transition = "none"; bar.style.width = seen / b.hp * 100 + "%"; bar.offsetWidth;
  setTimeout(() => { if (!bar.isConnected) return; bar.style.transition = ""; bar.style.width = b.left / b.hp * 100 + "%"; const card = $("#bossCard"), pop = card.querySelector(".boss-pop"); card.classList.add("hit"); pop.hidden = false; pop.textContent = `-${seen - b.left}`; Sfx.bossHit();
    const now = bossStage(b.left, b.hp); if (now !== bossStage(seen, b.hp)) { const box = card.querySelector(".boss-ship"), say = $("#bossState"); box.dataset.bossShip = bossMem(b.art, now); box.innerHTML = bossShip(b.art, now); if (say) say.textContent = BOSS_STATE[now]; }
    setTimeout(() => { card.classList.remove("hit"); pop.hidden = true; }, 1300); }, 450); }
// the words of a win, the same over the 3D scene and on the flat card
const bossWinBody = w => `<h2>보스 격파!</h2><p><b>${esc(w.name)}</b>을(를) 우리 반이 함께 쓰러뜨렸어요.</p>
  ${w.finisher ? `<p class="small">${w.last ? "마지막 일격은 바로 나! 금화를 더 받았어요." : `마지막 일격: <b>${esc(w.finisher)}</b>`}</p>` : `<p class="small">마지막 일격은 선생님의 포격이었어요.</p>`}<p class="found">${coin(`+${w.gold}`)}</p>
  ${w.top?.length ? `<ol class="boss-top">${w.top.map(t => `<li><b>${esc(t.who)}</b><span class="num">${t.dmg}</span></li>`).join("")}</ol>` : ""}
  ${w.joined ? `<p class="small">내 공격 <b class="num">${w.mine}</b> · 함께한 친구 <b class="num">${w.helpers}</b>/${w.crew}명</p>` : `<p class="small">다음 보스 때 함께 공격하면 금화를 훨씬 많이 받아요.</p>`}<button class="btn primary lg" data-close>확인</button>`;
function bossWin() { const w = K.d.boss?.win, mem = `hs_boss_win_${K.d.me.id}`; if (!w || w.id <= Number(ls.get(mem) || 0)) return false; ls.set(mem, w.id); bossScene(w); return true; }
// the class's win, seen once by each kid when they next come in: their own ship fires the last shots and the boss goes down. Nothing here is decided: the win and the gold are already the server's.
async function bossScene(w) { K.busy = true; const m = document.createElement("div"); m.className = "fight"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.innerHTML = `<p class="f-load">보스를 찾았어요…</p>`; document.body.appendChild(m);
  const done = () => { m.remove(); K.busy = false; kidRender(); kidNotices(); };
  let v3d = null, fx = null, me = K.d.me;
  if (window.Ship3D?.available() && !matchMedia("(prefers-reduced-motion: reduce)").matches) try { v3d = await Promise.race([Ship3D.get(), sleep(6000)]); } catch (e) {}
  if (v3d) { m.className = "fight f3"; m.innerHTML = `<div class="f-view"></div><div class="f-top boss-hud"><div class="f-side"><b>${esc(w.name)}</b><div class="hpbar"><i style="width:14%"></i></div></div></div><span class="f-dmg" hidden></span><div class="f-bottom"><button type="button" class="btn sm" data-skip>건너뛰기</button>${sndBtn()}</div>`;
    try { fx = await v3d.fight(m.querySelector(".f-view"), { look: me.look, sailHex: sail(me.sail), flagHex: me.look.fc != null ? sail(me.look.fc) : sail(me.sail), ship: me.ship }, { look: w.art.look, sailHex: w.art.sail, flagHex: w.art.sail, ship: w.art.ship }); } catch (e) { fx = null; } }
  if (!fx) { m.className = "modal"; m.innerHTML = `<div class="panel reward boss-win"><div class="boss-sea" style="--pic:url(/maps/sea${K.map + 1}.webp)">${bossShipBox(w.art, 3, "sink")}</div>${bossWinBody(w)}</div>`; const b = m.querySelector("[data-close]"); b.focus(); Sfx.bossDown(); b.onclick = done; return; }
  let fast = false; m.querySelector("[data-skip]").onclick = () => fast = true;
  const bar = m.querySelector(".hpbar i"), say = m.querySelector(".f-dmg"), mine = K.d.deco.find(x => x.key === `weapon.${me.look.weapon}`)?.kind || "cannon", theirs = w.art.ship === "galleon" ? "cannon" : "turret";
  fx.wound("b", 3, .08); fx.onSortie = () => Sfx.jet(); fx.onStrafe = () => Sfx.shot("gun"); fx.onBlast = k => Sfx.boom(k);
  if (!fast) await fx.intro();
  for (const [by, hp, word] of [["a", 9, "명중!"], ["b", 9, "빗나감"], ["a", 5, "명중!"], ["a", 0, "격파!"]]) { if (fast) break;
    Sfx.shot(by === "a" ? mine : theirs); await fx.fire(by, by === "a" ? 1 : 0, by === "a" ? mine : theirs); by === "a" ? Sfx.boom() : Sfx.splash();
    bar.style.width = hp + "%"; say.className = `f-dmg pop ${by === "a" ? "to-d" : "to-a miss"}`; say.hidden = false; say.textContent = word; await sleep(620); say.hidden = true; }
  bar.style.width = "0"; m.querySelector("[data-skip]").hidden = true; await fx.finish(true, fast); Sfx.bossDown(); if (!fast) await sleep(2600); // let her go under before the card covers the water
  m.querySelector(".f-bottom").innerHTML = `<div class="f-result win boss-result">${bossWinBody(w)}</div>`;
  await new Promise(res => { const b = m.querySelector("[data-close]"); b.focus(); b.onclick = res; });
  fx.close(); done(); }
const noticeModal = (html, sound) => { const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.innerHTML = `<div class="panel reward">${html}<button class="btn primary lg" data-close>확인</button></div>`; document.body.appendChild(m); const b = m.querySelector("[data-close]"); b.focus(); sound?.(); b.onclick = () => { m.remove(); kidNotices(); }; };
function bossMissed() { const w = K.d.boss?.missed, mem = `hs_boss_miss_${K.d.me.id}`; if (!w || w.id <= Number(ls.get(mem) || 0)) return false; ls.set(mem, w.id); const b = K.d.boss;
  noticeModal(`<div class="boss-sea notice-sea" style="--pic:url(/maps/sea${K.map + 1}.webp)">${bossShipBox(w.art, bossStage(w.left, w.hp))}</div><h2>${esc(w.name)}이(가) 도망갔어요</h2><p>체력 <b class="num">${w.left}</b>이 남아 있었어요.${w.left <= w.hp * .3 ? " 조금만 더 했으면 잡았어요!" : ""}</p>${b.off ? "" : `<p class="small muted">이번 주 보스는 <b>${esc(b.name)}</b>이에요. 다시 힘을 합쳐요.</p>`}`, Sfx.lose); return true; }
// missions the teacher has accepted since this kid last looked; the first visit only sets the mark, so old missions don't pop up
function missionNews() { const list = K.d.approved || [], mem = `hs_seen_quest_${K.d.me.id}`, top = list[0]?.id || 0, raw = ls.get(mem); if (raw === null) { ls.set(mem, top); return false; } const fresh = list.filter(l => l.id > Number(raw)); ls.set(mem, Math.max(top, Number(raw))); if (!fresh.length) return false;
  const energy = fresh.reduce((n, l) => n + l.energy, 0), b = K.d.boss, hit = b && !b.off && !b.down ? fresh.length * b.questDmg : 0;
  noticeModal(`<h2>선생님이 미션을 확인했어요!</h2><ul class="news">${fresh.slice(0, 4).map(l => `<li>${esc(l.title)}</li>`).join("")}${fresh.length > 4 ? `<li class="muted">그리고 ${fresh.length - 4}개 더</li>` : ""}</ul><p class="found">${energy ? `${nrg(`+${energy}`)}` : `<span class="small">행동력이 이미 가득 찼어요</span>`}</p>${hit ? `<p class="small"><b>${esc(b.name)}</b>에게 <b class="num">${hit}</b> 피해를 줬어요!</p>` : ""}`, Sfx.coin); return true; }
function likeNews() { const mem = `hs_seen_likes_${K.d.me.id}`, n = K.d.likes?.counts[K.d.me.id] || 0, raw = ls.get(mem); ls.set(mem, n); if (raw !== null && n > Number(raw)) toast(`내 배에 좋아요가 ${n - Number(raw)}개 늘었어요!`); }
// one message at a time, each opening the next when closed
function kidNotices() { if (!K.d || K.d.me.mustChange || $(".modal") || $(".fight") || $(".game") || K.busy) return; likeNews(); bossWin() || bossMissed() || missionNews(); }
const titleName = look => K.d.titles?.find(t => t.id === look?.ttl)?.name || "";
const sndIcon = () => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9z"/>${Sfx.on ? `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>` : `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m16 10 5 5m0-5-5 5"/>`}</svg>`;
const sndBtn = () => `<button type="button" class="snd" data-act="ksnd" aria-pressed="${Sfx.on}" aria-label="소리 ${Sfx.on ? "끄기" : "켜기"}" title="소리 ${Sfx.on ? "끄기" : "켜기"}">${sndIcon()}</button>`;
function kidRender() {
  const d = K.d, me = d.me, keep = keepInputs(app), strip = $(".tabs")?.scrollLeft || 0;
  const tabs = [["map", "지도"], ["missions", "미션"], ["boss", "보스"], ["deco", "장비"], ["shop", "상점"], ["dex", "도감"], ["crew", "친구"], ["log", "기록"]], openQ = d.quests.filter(q => q.status === "open").length;
  app.innerHTML = `<header class="top"><div class="hwrap"><div class="brand"><img src="${LOGO}" alt=""><div style="min-width:0"><h1>하이포스 매쓰아일랜드</h1><small>${esc(titleName(me.look) || me.className)} · 전투력 ${me.power}</small></div>${sndBtn()}</div>
      <div class="hright wallet"><span title="행동력">${nrg(`${d.bal.energy}/${d.game.energyMax}`)}</span><span title="포인트">${pts(d.bal.points)}</span><span title="금화">${coin(d.bal.gold)}</span></div></div>
      <nav class="tabs" aria-label="화면">${tabs.map(([k, l]) => `<button data-act="ktab" data-v="${k}" aria-current="${K.tab === k}">${l}${k === "missions" && openQ ? `<span class="cnt">${openQ}</span>` : ""}</button>`).join("")}</nav></header>
    <main>${({ map: kMap, missions: kMissions, boss: kBoss, deco: kDeco, shop: kDeco, dex: kDex, crew: kCrew, log: kLog })[K.tab]()}</main>
    ${me.mustChange ? `<div class="modal" role="dialog" aria-modal="true"><div class="panel"><h2>나만의 비밀번호 정하기</h2><p class="small muted">임시 비밀번호 대신 나만 아는 숫자 4개로 바꿔요.</p>
      <form data-form="kpin" class="stack" style="gap:10px"><input type="password" id="kp1" inputmode="numeric" maxlength="4" placeholder="숫자 4개" data-keep="no" required><input type="password" id="kp2" inputmode="numeric" maxlength="4" placeholder="한 번 더" data-keep="no" required><button class="btn primary">정하기</button></form></div></div>` : ""}`;
  restoreInputs(keep);
  if (inDeck()) { const x = K.tryKey && d.deco.find(i => i.key === K.tryKey), base = draftLook(me.look); show3D($("#deco3d"), x ? previewItem(base, x) : base, me.sail, K.tryShip || me.ship); if (K.crop) drawCrop(); thumbScan(); }
  { const bar = $(".tabs"); if (bar) bar.scrollLeft = strip; }
  if (K.tab === "boss") bossAnim();
  if (K.tab === "crew") { const m = d.mates.find(x => x.id === K.mate); if (m) show3D($("#mate3d"), m.look, m.sail, m.ship); thumbScan(); }
}
const tallMap = () => innerWidth < 640;
const mapSize = () => tallMap() ? { w: 640, h: mapArt() ? 800 : 920 } : { w: 1000, h: 620 };
// painted maps, in the image's own pixels: wide/tall = crop [x, y, width]; each island = tap area and the spot in the water where the ship waits
const ART_LAYOUT = { size: 1254, wide: [78, 240, 1097], tall: [245, 110, 760], isles: {
    port: { x: 455, y: 715, rx: 190, ry: 150, dock: [650, 812] },
    cannon: { x: 700, y: 370, rx: 160, ry: 95, dock: [565, 482] },
    reef: { x: 835, y: 565, rx: 135, ry: 65, dock: [690, 600] },
    memory: { x: 395, y: 430, rx: 130, ry: 80, dock: [515, 520] },
    battle: { x: 840, y: 765, rx: 150, ry: 90, dock: [770, 880] }
  }, routes: [["memory", "cannon", 12], ["cannon", "port", 34], ["cannon", "reef", 14], ["reef", "port", 10], ["port", "battle", -16]] };
const MAP_ART = [1, 2, 3].map(n => ({ ...ART_LAYOUT, src: `/maps/sea${n}.webp` })); // the three pictures share one layout
const mapArt = () => MAP_ART[K.map];
const artCrop = a => tallMap() ? a.tall : a.wide;
const artPt = (a, sx, sy) => { const [cx, cy, cw] = artCrop(a), s = mapSize().w / cw; return { x: (sx - cx) * s, y: (sy - cy) * s }; };
const islePos = k => { const a = mapArt(); if (a) return artPt(a, a.isles[k].x, a.isles[k].y); const s = ISLES[k], m = mapSize(), x = tallMap() ? s.px : s.x, y = tallMap() ? s.py : s.y; return { x: K.map === 1 ? m.w - x : x, y }; }; // the middle sea is laid out mirrored
const dockPos = k => { const a = mapArt(); if (a) return artPt(a, ...a.isles[k].dock); const p = islePos(k); return { x: p.x + 66, y: p.y + 24 }; };
const shipAt = k => { const p = dockPos(k), m = mapSize(); return `left:${p.x / m.w * 100}%;top:${p.y / m.h * 100}%`; };
const SEAS = [
  { top: "#3A86BD", bot: "#123E66", land: { port: "#7FAE62", cannon: "#B98A5A", reef: "#8A9AA6", memory: "#C9A25E", battle: "#A8574A" } },
  { top: "#5E8AA3", bot: "#1B3A50", land: { port: "#8C9178", cannon: "#8C7A66", reef: "#D5E5EE", memory: "#A39A82", battle: "#7E5148" } },
  { top: "#2A6FA5", bot: "#0A2740", land: { port: "#7E8B94", cannon: "#6F7B85", reef: "#46525C", memory: "#8E9AA4", battle: "#5A6168" } }
];
const seaOpen = m => K.d.me.power >= m.power;
/* the ship on a painted map is a still of the 3D ship; the flat one shows until that is ready, and stays where 3D can't run */
const SHIP3D_MEM = "hs_ship3d_v1";
const shipPic = me => { const key = JSON.stringify([me.ship, me.look, me.sail]);
  if (!K.ship3d) try { K.ship3d = JSON.parse(ls.get(SHIP3D_MEM) || "null"); } catch (e) {}
  return K.ship3d?.key === key ? K.ship3d : (wantShipPic(me, key), null); };
function wantShipPic(me, key) {
  if (K.ship3dBusy === key || K.ship3dFail || !window.Ship3D?.available() || $(".s3d")) return;
  K.ship3dBusy = key;
  Ship3D.get().then(v => $(".s3d") ? null : v.snapshot(me.look, sail(me.sail), me.look.fc != null ? sail(me.look.fc) : sail(me.sail), me.ship)).then(pic => {
    if (!pic) return; K.ship3d = { key, ...pic }; try { ls.set(SHIP3D_MEM, JSON.stringify(K.ship3d)); } catch (e) {}
    const el = $("#wship"); if (el && mapArt() && K.d.me === me) el.outerHTML = worldShip(me);
  }).catch(() => { K.ship3dFail = true; }).finally(() => { K.ship3dBusy = null; });
}
function worldShip(me) { const pic = mapArt() && shipPic(me), k = pic ? Math.min(1.2, Math.sqrt(pic.r / 8)).toFixed(3) : 1;
  return `<div class="ship mine worldship ${pic ? "s3" : ""} ${V.wakeClass(me.look)}" id="wship" style="--sail:${sail(me.sail)};--k:${k};${shipAt(K.at)}">${pic ? `<img class="hull" src="${pic.url}" alt="">` : shipSVG(me.ship, me.look, me.sail)}</div>`; }
function kMap() {
  const d = K.d, me = d.me, { w, h } = mapSize(), tall = tallMap(), fs = tall ? 36 : 27, sea = SEAS[K.map], names = d.maps[K.map].isles;
  const art = mapArt();
  const isle = (k, s) => { const { x, y } = islePos(k), head = `<g class="isle ${K.isle === k ? "on" : ""}" data-act="kisle" data-v="${k}" tabindex="0" role="button" aria-label="${names[k]}: ${isleSub(k)}">`;
    if (art) { const i = art.isles[k], z = w / artCrop(art)[2], rx = i.rx * z, ry = i.ry * z;
      return `${head}<ellipse class="hit" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="transparent"/><text x="${x}" y="${y + ry + fs * .75}" text-anchor="middle" class="lbl" font-size="${fs}">${names[k]}</text></g>`; }
    return `${head}
    <ellipse cx="${x}" cy="${y + 10}" rx="${s.r + 8}" ry="${s.r * .46 + 5}" fill="#E9D5A4"/><ellipse cx="${x}" cy="${y}" rx="${s.r}" ry="${s.r * .44}" fill="${sea.land[k]}"/>${(ERA_ART[K.map]?.[k] || ART[k])(x, y)}
    <text x="${x}" y="${y + s.r * .44 + fs + 12}" text-anchor="middle" class="lbl" font-size="${fs}">${names[k]}</text></g>`; };
  const artImg = () => { const [cx, cy, cw] = artCrop(art), ch = cw * h / w; return `<img class="wart" src="${art.src}" alt="" style="width:${art.size / cw * 100}%;left:${-cx / cw * 100}%;top:${-cy / ch * 100}%"><div class="wfx" aria-hidden="true"><i class="wglint"></i><i class="wcloud"></i><i class="wcloud c2"></i><i class="wcloud c3"></i></div>`; };
  const route = (a, b, bend) => { const p = (art ? dockPos : islePos)(a), q = (art ? dockPos : islePos)(b); return `M${p.x} ${p.y} Q${(p.x + q.x) / 2 + bend} ${(p.y + q.y) / 2 - bend} ${q.x} ${q.y}`; };
  const tabs = d.maps.map(m => { const open = seaOpen(m); return `<button class="seatab ${open ? "" : "locked"}" data-act="ksea" data-v="${m.id}" aria-pressed="${K.map === m.id}"><b>${esc(m.name)}</b><small>${open ? esc(m.era) : `전투력 ${m.power}부터`}</small>${open ? "" : `<i class="seabar"><i style="width:${Math.min(100, me.power / m.power * 100)}%"></i></i>`}</button>`; }).join("");
  return `${installCard()}<section class="panel worldhead"><h2>어느 섬으로 갈까요?</h2><p class="small muted">게임 한 판에 행동력 ${d.game.playCost}을 써요. 미션을 끝내면 행동력이 생겨요. (최대 ${d.game.energyMax})</p><div class="seatabs">${tabs}</div></section>
    <div class="world ${art ? "art" : ""}">${art ? artImg() : ""}<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(d.maps[K.map].name)} 지도">
      ${art ? "" : `<defs><linearGradient id="wsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea.top}"/><stop offset="1" stop-color="${sea.bot}"/></linearGradient><pattern id="wwv" width="60" height="34" patternUnits="userSpaceOnUse"><path d="M0 17 q15 -9 30 0 t30 0" fill="none" stroke="#fff" stroke-width="1.6" opacity=".14"/></pattern></defs>
      <rect width="${w}" height="${h}" fill="url(#wsea)"/><rect class="waves" width="${w + 100}" height="${h}" fill="url(#wwv)"/>`}
      <path d="${art ? art.routes.map(r => route(...r)).join(" ") : `${route("port", "memory", 30)} ${route("port", "cannon", 20)} ${route("cannon", "reef", 40)} ${route("reef", "battle", 30)} ${route("port", "battle", -30)}`}" fill="none" stroke="#fff" stroke-width="3.5" stroke-dasharray="2 13" stroke-linecap="round" opacity=".55"/>
      ${Object.entries(ISLES).map(([k, s]) => isle(k, s)).join("")}
    </svg>${worldShip(me)}</div>
    <div id="isleSlot">${K.isle ? kIsle() : `<p class="small muted" style="text-align:center">섬을 눌러 보세요.</p>`}</div>`;
}
const isleSub = k => ({ port: "저울로 짐 무게를 맞추고, 배와 면제권도 챙기는 곳", cannon: ["식을 풀어 안개 속 적함이 있는 칸 쏘기", "빠르기와 시간으로 쏠 거리 계산하기", "조건에 맞는 표적을 계산해 격추하기"][K.map], reef: ["문제를 풀어 정답 통로로 암초 지나기", "안개 속 정답 통로로 빙산 지나기", "기뢰를 피해 정답 통로로 지나기"][K.map], memory: ["값이 같은 카드끼리 짝 맞추기", "수열의 규칙을 찾아 다음 수 누르기", "식을 풀어 기호의 값 알아내기"][K.map], battle: "친구 배와 겨뤄 금화 얻기" })[k];
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
const PRACTICE_NOTE = `<p class="small muted">연습은 행동력이 들지 않아요. 대신 포인트, 아이템, 보스 피해가 없어요.</p>`;
function kIsle() {
  const d = K.d, k = K.isle, s = ISLES[k], g = s.game && d.games[s.game], m = d.maps[K.map], nm = m.isles[k];
  const head = `<div class="row between"><h2>${esc(nm)}</h2><button class="btn ghost sm" data-act="kisle" data-v="">닫기</button></div>`;
  if (g) { const can = d.bal.energy >= d.game.playCost;
    return `<section class="panel" id="islePanel">${head}<p class="small muted">${isleSub(k)}. 별을 많이 받을수록 포인트가 많아요.${m.mult > 1 ? ` 이 바다는 포인트가 ${m.mult}배예요.` : ""} 낮은 확률로 치장품이나 ${esc(m.era)} 무기를 발견해요.</p>
      <div class="row small muted"><span>별 1개 ${g.stars[0]}점</span><span>· 별 2개 ${g.stars[1]}점</span><span>· 별 3개 ${g.stars[2]}점</span></div>
      <div class="row"><button class="btn primary lg" data-act="kplay" data-v="${s.game}" ${can ? "" : "disabled"}>${can ? `행동력 ${d.game.playCost} 쓰고 시작` : "행동력이 모자라요"}</button><button class="btn" data-act="kpractice" data-v="${s.game}|${K.map}|">연습</button><button class="btn" data-act="khow" data-v="${s.game}">게임 방법</button></div>${PRACTICE_NOTE}</section>`; }
  if (k === "port") { const p = d.pass, canPass = !p.bought && d.bal.points >= d.game.passCost, pg = d.games.port, can = d.bal.energy >= d.game.playCost;
    return `<section class="panel" id="islePanel">${head}
      <div class="port-game"><b>${["항구 저울", "석탄 저울", "보급 저울"][K.map]}</b><p class="small muted">짐 무게를 구해 추로 저울을 맞춰요. 별을 많이 받을수록 포인트가 많아요.${m.mult > 1 ? ` 이 바다는 포인트가 ${m.mult}배예요.` : ""} 낮은 확률로 치장품이나 ${esc(m.era)} 무기를 발견해요.</p>
        <div class="row small muted"><span>별 1개 ${pg.stars[0]}점</span><span>· 별 2개 ${pg.stars[1]}점</span><span>· 별 3개 ${pg.stars[2]}점</span></div>
        <div class="row"><button class="btn primary lg" data-act="kplay" data-v="port" ${can ? "" : "disabled"}>${can ? `행동력 ${d.game.playCost} 쓰고 시작` : "행동력이 모자라요"}</button><button class="btn" data-act="kpractice" data-v="port|${K.map}|">연습</button><button class="btn" data-act="khow" data-v="port">게임 방법</button></div>${PRACTICE_NOTE}</div>
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
    <button class="btn" data-act="ktab" data-v="crew">친구 골라서 실시간 대결</button>
    ${b.fights.length ? `<div class="plist">${b.fights.slice(0, 6).map(f => `<div class="prow"><span>${esc(f.opp)} ${f.attacked ? "공격" : "방어"}</span><span class="pill ${f.won ? "ok" : ""}">${f.won ? "승리" : "패배"}</span><span class="small num">${f.gold ? `${f.gold > 0 ? "+" : ""}${f.gold}금화` : "-"}</span></div>`).join("")}</div>` : ""}</section>`;
}
// lesson days are weekday digits, 0 = Sunday, and read from Monday
const DAY_ORDER = [[1, "월"], [2, "화"], [3, "수"], [4, "목"], [5, "금"], [6, "토"], [0, "일"]];
const dayText = days => days.length === 7 ? "매일" : DAY_ORDER.filter(([n]) => days.includes(n)).map(([, l]) => l).join("·");
function kMissions() {
  const qs = K.d.quests, days = K.d.classDays ?? "0123456", everyDay = days.length === 7, closed = qs.some(q => q.status === "off");
  const btn = q => q.status === "off" ? `<span class="small muted">수업 날에 열려요</span>` : q.status === "done" ? `<span class="pill ok">${q.kind === "daily" ? "오늘 완료" : "이번 주 완료"}</span>` : q.status === "pending" ? `<div class="row" style="justify-content:flex-end"><span class="pill wait">확인 기다리는 중</span><button class="btn ghost sm" data-act="kcancel" data-v="${q.requestId}">취소</button></div>` : `<button class="btn primary" data-act="krequest" data-v="${q.id}">다 했어요</button>`;
  return `<section class="panel"><h2>오늘의 미션</h2><p class="small muted">미션을 끝냈으면 "다 했어요"를 눌러요. 선생님이 확인하면 행동력이 생겨요.${K.d.boss && !K.d.boss.off && !K.d.boss.down ? ` 보스에게도 <b class="num">${K.d.boss.questDmg}</b> 피해를 줘요.` : ""}</p>
    ${K.d.bal.energy >= K.d.game.energyMax ? `<div class="notice">행동력이 가득 찼어요. 지금 확인받으면 행동력은 늘지 않아요. 미니게임을 한 뒤에 눌러요.</div>` : ""}
    ${closed ? `<div class="notice">오늘은 수업이 없는 날이에요. 미션은 ${dayText(days)}에 열려요.</div>` : ""}
    ${SUBJECTS.map(sub => { const list = qs.filter(q => q.subject === sub); return list.length ? `<h3>${sub}</h3><div class="mlist">${list.map(q => `<div class="mitem s-${esc(q.subject)}"><span class="bar"></span><span><span class="t">${esc(q.title)}</span><br><span class="tag kind">${q.kind === "daily" && !everyDay ? "수업 날마다" : KINDS[q.kind]}</span> <span class="small">행동력 +${q.energy}</span></span>${btn(q)}</div>`).join("")}</div>` : ""; }).join("") || `<p class="muted">아직 미션이 없어요.</p>`}</section>`;
}
const embTile = (id, cloth) => `<svg class="emb-tile" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="14" fill="${cloth}"/>${V.embSVG(id, 50, 50, 74, V.inkFor(cloth), cloth)}</svg>`;
/* ---------- my photo on the ship ---------- */
const CROP_W = 480, CROP_H = 400;
const draftLook = look => K.photoDraft ? { ...look, photoSrc: K.photoDraft } : look;
function kPhoto(shop) {
  const d = K.d, p = d.photo, L = d.me.look, gold = d.bal.gold, viewShip = d.ships.find(s => s.id === (K.tryShip || d.me.ship));
  const where = viewShip.sails ? "돛" : "선체 옆면";
  const rules = `<p class="small muted">내 사진을 골라 배에 달 수 있어요. 돛이 있는 배는 돛에, 돛이 없는 배는 선체 옆면에 크게 그려져요. 금화 <b class="num">${p.price}</b>개이고, 선생님이 확인한 뒤에 달려요. 신청은 일주일에 3번까지예요.</p><p class="small"><b>내 얼굴이나 친구 얼굴이 나온 사진은 올리지 마세요.</b></p>`;
  if (K.crop) return `${rules}<div class="crop"><canvas id="cropCv" width="${CROP_W}" height="${CROP_H}" aria-label="사진 자르기"></canvas><p class="small muted">사진을 끌어서 위치를 맞춰요.</p><label class="f">크기<input type="range" id="cropZoom" min="1" max="4" step="0.01" value="${K.crop.zoom}" data-keep="no"></label><div class="row"><button class="btn primary" data-act="kcropOk">배에 달아 보기</button><button class="btn" data-act="kcropNo">취소</button></div></div>`;
  if (K.photoDraft) return `${rules}<div class="photo-row"><img class="photo-thumb" src="${K.photoDraft}" alt="고른 사진"><div class="stack" style="gap:8px"><span>위에서 ${where}에 달린 모습을 볼 수 있어요. 금화 ${p.price}개를 내고 신청할까요? 남는 금화 ${gold - p.price}</span><div class="row"><button class="btn primary" data-act="kphotoSend">선생님께 신청</button><button class="btn" data-act="kcropNo">다시 고르기</button></div></div></div>`;
  const current = !shop && L.photo ? `<h3>지금 달린 사진</h3><div class="photo-row"><img class="photo-thumb" src="/api/photo/${L.photo}" alt="지금 달린 사진"><button class="btn sm ghost" data-act="kphotoOff">사진 내리기</button></div>` : shop && L.photo ? `<p class="small muted">새 사진이 확인되면 지금 달린 사진과 바뀌어요. 사진을 내리는 곳은 장비예요.</p>` : "";
  const waiting = p.pending ? `<h3>선생님 확인을 기다려요</h3><div class="photo-row"><img class="photo-thumb" src="/api/photo/${p.pending}" alt="신청한 사진"><div class="stack" style="gap:8px"><span class="pill wait">확인 중</span><button class="btn sm" data-act="kphotoCancel">신청 취소하고 금화 돌려받기</button></div></div>` : "";
  if (!shop) return `${waiting}${current}`;
  if (p.pending) return `${rules}${waiting}${current}`;
  const why = !p.left ? "이번 주 신청을 다 했어요" : gold < p.price ? `금화가 ${p.price - gold}개 모자라요` : "";
  return `${rules}${p.rejected ? `<div class="notice">선생님이 지난 사진을 돌려보냈어요. 금화는 돌려받았어요.</div>` : ""}${current}<div class="row">${why ? `<button class="btn" disabled>${why}</button>` : `<label class="btn primary">사진 고르기<input type="file" id="photoFile" accept="image/*" data-keep="no" hidden></label>`}<span class="small muted">이번 주 ${p.left}번 남음</span></div>`;
}
function drawCrop() {
  const c = K.crop, cv = $("#cropCv"); if (!c || !cv) return;
  const s = Math.max(CROP_W / c.img.naturalWidth, CROP_H / c.img.naturalHeight) * c.zoom, w = c.img.naturalWidth * s, h = c.img.naturalHeight * s;
  c.x = Math.min(0, Math.max(CROP_W - w, c.x ?? (CROP_W - w) / 2)); c.y = Math.min(0, Math.max(CROP_H - h, c.y ?? (CROP_H - h) / 2));
  cv.getContext("2d").drawImage(c.img, c.x, c.y, w, h);
}
function openCrop(file) {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); K.crop = { img, zoom: 1, x: null, y: null }; kidRender(); };
  img.onerror = () => { URL.revokeObjectURL(url); toast("이 사진은 열 수 없어요. 다른 사진을 골라 주세요"); };
  img.src = url;
}
document.addEventListener("change", e => { if (e.target.id === "photoFile" && e.target.files[0]) openCrop(e.target.files[0]); });
document.addEventListener("input", e => { if (e.target.id !== "cropZoom" || !K.crop) return; const c = K.crop, z = Number(e.target.value), r = z / c.zoom; c.x = CROP_W / 2 - (CROP_W / 2 - c.x) * r; c.y = CROP_H / 2 - (CROP_H / 2 - c.y) * r; c.zoom = z; drawCrop(); });
let cropDrag = null;
document.addEventListener("pointerdown", e => { if (e.target.id === "cropCv" && K.crop) { cropDrag = { x: e.clientX, y: e.clientY, k: CROP_W / e.target.getBoundingClientRect().width }; e.preventDefault(); } });
document.addEventListener("pointermove", e => { if (!cropDrag || !K.crop) return; K.crop.x += (e.clientX - cropDrag.x) * cropDrag.k; K.crop.y += (e.clientY - cropDrag.y) * cropDrag.k; cropDrag.x = e.clientX; cropDrag.y = e.clientY; drawCrop(); });
document.addEventListener("pointerup", () => { cropDrag = null; });
document.addEventListener("pointercancel", () => { cropDrag = null; });
function kUpgrade() {
  const d = K.d, gold = d.bal.gold;
  return `<p class="small muted">금화로 배를 강화하면 단계마다 전투력이 올라요. 값은 단계가 오를수록 비싸져요. 배를 바꿔도 강화는 그대로 남아요.</p><div class="up-list">${d.upgrades.map(u => `<div class="up-row"><div class="stack" style="gap:4px"><b>${esc(u.name)} <span class="num">${u.level}</span>/${u.max}단계</b><span class="small muted">${esc(u.desc)}</span><div class="up-pips" aria-hidden="true">${Array.from({ length: u.max }, (_, i) => `<i class="${i < u.level ? "on" : ""}"></i>`).join("")}</div></div>${u.level >= u.max ? `<span class="pill ok">최고 단계</span>` : `<div class="stack" style="gap:4px;align-items:flex-end"><span class="small">전투력 +${u.power} · <span class="gold num">${u.price}</span></span><button class="btn sm ${gold >= u.price ? "primary" : ""}" data-act="kupAsk" data-v="${u.id}" ${gold >= u.price ? "" : "disabled"}>${gold >= u.price ? "강화" : `${u.price - gold}개 모자라요`}</button></div>`}</div>`).join("")}</div>`;
}
function boxRow(m) {
  const d = K.d, b = d.boxes[m.id], can = d.bal.points >= b.price;
  const note = "한 달에 한 번, 아직 없는 이 시대 무기가 하나 나와요. 어느 시대 상자를 열지는 내가 골라요.";
  const ctl = !seaOpen(m) ? `<span class="small muted">전투력 ${m.power}부터</span>` : b.all ? `<span class="pill ok">다 모았어요</span>` : d.boxUsed ? `<span class="small muted">다음 달에 다시 열 수 있어요</span>` : `<button class="btn sm ${can ? "primary" : ""}" data-act="kboxAsk" data-v="${m.id}" ${can ? "" : "disabled"}>${can ? `포인트 ${b.price}으로 열기` : `포인트 ${b.price - d.bal.points} 모자라요`}</button>`;
  return `<div class="box-row"><div class="stack" style="gap:2px"><b>보급 상자</b><span class="small muted">${b.all ? "이 시대 무기를 모두 모았어요." : note}</span></div>${ctl}</div>`;
}
function kDeco() {
  const d = K.d, me = d.me, L = draftLook(me.look), gold = d.bal.gold, owned = new Set(d.owned), curShip = d.ships.find(s => s.id === me.ship), viewShip = d.ships.find(s => s.id === (K.tryShip || me.ship));
  const rank = id => d.ships.findIndex(s => s.id === id), reaches = x => (!x.from || rank(me.ship) >= rank(x.from)) && (!x.upto || rank(me.ship) <= rank(x.upto));
  // gear lists what you own and the shop what you don't, so nothing shows up in both
  const shop = K.tab === "shop", inSlot = (x, k) => k === "air" ? x.group === "air" : x.slot === k && !x.group && (!x.upto || viewShip.sails), mine = x => owned.has(x.key) || isWorn(L, x), hasShip = s => !s.price || owned.has(`ship.${s.id}`);
  const tabs = DECO_TABS.filter(([k, , only]) => (!only || (only === "sail") === viewShip.sails) && (shop ? k !== "color" : k !== "upgrade" && (["ship", "weapon", "color"].includes(k) || (k === "photo" ? L.photo || d.photo.pending : d.deco.some(x => inSlot(x, k) && mine(x)))))); if (!tabs.some(([k]) => k === K.slot)) K.slot = "ship";
  const slot = K.slot;
  const conf = K.confirm && K.confirm.key && d.deco.find(x => x.key === K.confirm.key), shipConf = K.confirm && K.confirm.ship && d.ships.find(s => s.id === K.confirm.ship), upConf = K.confirm && K.confirm.up && d.upgrades.find(u => u.id === K.confirm.up);
  const tryItem = K.tryKey && d.deco.find(x => x.key === K.tryKey);
  const buy = x => { const can = gold >= x.price; return `<button class="btn sm ${can ? "primary" : ""}" data-act="kdecoAsk" data-v="${x.key}" ${can ? "" : "disabled"}>${can ? "사기" : `${x.price - gold}개 모자라요`}</button>`; };
  const card = x => { const has = owned.has(x.key), on = isWorn(L, x);
    const pic = x.slot === "emblem" ? embTile(x.id, sail(me.sail)) : x.slot === "weapon" ? `<div class="wtile r-${x.rarity}">${weaponImg(x.id)}<b class="num">+${x.power}</b></div>` : shipBox(reaches(x) ? me.ship : x.from || x.upto, previewItem(L, x), me.sail, "", "tiny");
    const ctl = !reaches(x) && !isWorn(L, x) ? `<span class="small muted">${x.upto ? "돛이 있는 옛날 배에만 달 수 있어요" : `${esc(d.ships.find(s => s.id === x.from).name)}부터 쓸 수 있어요`}</span>` : x.dropOnly && !has ? `<span class="small muted">${esc(d.maps[x.era].name)}에서 발견해요</span>` : !has ? buy(x)
      : x.slot === "weapon" && x.era > curShip.era ? `<span class="small muted">${esc(d.ships.find(s => s.era === x.era).name)}부터 장착해요</span>`
      : x.slot === "emblem" ? `<div class="row" style="gap:6px"><button class="btn sm" data-act="kwear" data-v="${x.key}|sail" aria-pressed="${L.se === x.id}">돛</button><button class="btn sm" data-act="kwear" data-v="${x.key}|flag" aria-pressed="${L.fe === x.id}">깃발</button></div>`
      : x.slot === "att" ? `<button class="btn sm ${on ? "" : "primary"}" data-act="kwear" data-v="${x.key}">${on ? "떼기" : "달기"}</button>`
      : on ? `<span class="pill ok">${x.slot === "weapon" ? "장착 중" : "쓰는 중"}</span>` : `<button class="btn sm ${x.slot === "weapon" ? "primary" : ""}" data-act="kwear" data-v="${x.key}">${x.slot === "weapon" ? "장착" : "쓰기"}</button>`;
    return `<div class="deco-item ${K.tryKey === x.key ? "sel" : ""}" data-act="ktry" data-v="${x.key}">${pic}<b>${esc(x.name)}</b>${x.slot === "weapon" ? `<span class="rar r-${x.rarity}">${x.rarity}</span>` : has ? "" : `<span class="gold num">${x.price}</span>`}${ctl}</div>`; };
  const shipCard = s => { const has = !s.price || owned.has(`ship.${s.id}`), on = me.ship === s.id, can = gold >= s.price;
    return `<div class="deco-item ${K.tryShip === s.id ? "sel" : ""}" data-act="ktryShip" data-v="${s.id}">${shipBox(s.id, L, me.sail, "", "tiny")}<b>${esc(s.name)}</b><span class="small muted">전투력 +${s.power}${s.sails ? "" : " · 돛 없음"}</span>${has ? "" : `<span class="gold num">${s.price}</span>`}
      ${on ? `<span class="pill ok">타는 중</span>` : has ? `<button class="btn sm" data-act="kshipUse" data-v="${s.id}">타기</button>` : `<button class="btn sm ${can ? "primary" : ""}" data-act="kshipAsk" data-v="${s.id}" ${can ? "" : "disabled"}>${can ? "사기" : `${s.price - gold}개 모자라요`}</button>`}</div>`; };
  const plain = !shop && ["hull", "pattern", "trim", "head", "wake", "tag", "weapon", "camo", "smoke"].includes(slot) ? `<div class="deco-item ${L[slot] ? "" : "sel"}" data-act="ktry" data-v="">${slot === "weapon" ? `<div class="wtile"><b class="small">없음</b></div>` : shipBox(me.ship, { ...L, [slot]: undefined, ...(slot === "hull" ? { camo: undefined } : {}) }, me.sail, "", "tiny")}<b>기본</b>${L[slot] ? `<button class="btn sm" data-act="kwear" data-v="${slot}">기본으로</button>` : `<span class="pill ok">쓰는 중</span>`}</div>` : "";
  const sw = (i, act, on, label) => `<button style="--sail:${V.SAILS[i]}" data-act="${act}" data-v="${i}" aria-pressed="${on}" aria-label="${label} ${i + 1}"></button>`;
  const noSail = !curShip.sails && ["pattern", "emblem", "color"].includes(slot) ? `<p class="small muted">지금 배에는 돛이 없어서 돛 꾸미기는 안 보여요. 깃발 색과 깃발 문양은 보여요.</p>` : "";
  const allDone = `<p class="small muted">이 종류는 모두 모았어요.</p>`, ships = d.ships.filter(s => hasShip(s) !== shop);
  const weaponEras = d.maps.map(m => [m, d.deco.filter(x => x.slot === "weapon" && x.era === m.id && mine(x) !== shop)]);
  const items = d.deco.filter(x => inSlot(x, slot) && mine(x) !== shop);
  const body = slot === "photo" ? kPhoto(shop) : slot === "upgrade" ? kUpgrade() : slot === "ship" ? `<p class="small muted">${shop ? "금화로 더 큰 배를 살 수 있어요. 배를 누르면 위에서 미리 볼 수 있어요." : "가지고 있는 배예요. 타고 싶은 배로 바꿀 수 있어요."}</p>${ships.length ? d.maps.filter(m => ships.some(s => s.era === m.id)).map(m => `<h3>${esc(m.era)}</h3><div class="deco-grid">${ships.filter(s => s.era === m.id).map(shipCard).join("")}</div>`).join("") : allDone}`
    : slot === "color" ? `<p class="small muted">돛 색과 깃발 색은 무료예요.</p><h3>돛 색</h3><div class="sails">${V.SAILS.map((c, i) => sw(i, "ksail", me.sail === i, "돛 색")).join("")}</div>
      <h3>깃발 색</h3><div class="sails"><button class="same" data-act="kflag" data-v="-1" aria-pressed="${L.fc == null}" style="--sail:${sail(me.sail)}">돛과 같게</button>${V.SAILS.map((c, i) => sw(i, "kflag", L.fc === i, "깃발 색")).join("")}</div>`
    : `${slot === "emblem" ? `<p class="small muted">문양은 한 번 사면 돛과 깃발에 따로 달 수 있어요.</p>${!shop && (L.se || L.fe) ? `<div class="row">${L.se ? `<button class="btn sm ghost" data-act="kwear" data-v="emblem|sail">돛 문양 빼기</button>` : ""}${L.fe ? `<button class="btn sm ghost" data-act="kwear" data-v="emblem|flag">깃발 문양 빼기</button>` : ""}</div>` : ""}` : slot === "att" ? `<p class="small muted">여러 개를 같이 달 수 있어요. ${esc(d.deco.filter(x => x.upto).map(x => x.name).join("·"))}${viewShip.sails ? "는 돛이 있는 옛날 배에만 달려요." : "는 돛이 있는 옛날 배 전용이라 여기에는 나오지 않아요."}</p>` : slot === "air" ? `<p class="small muted">여러 대를 같이 띄울 수 있어요. 헬기와 정찰기는 순양함부터, 나머지는 항공모함에서 쓸 수 있어요.</p>` : !shop && slot === "hull" && L.camo && !viewShip.sails ? `<p class="small muted">지금은 위장 도색이 칠해져 있어요. 배 색이 보이려면 위장 도색을 ‘기본으로’ 바꿔 주세요.</p>` : slot === "camo" ? `<p class="small muted">돛이 없는 배의 선체에 칠해요. 칠한 동안에는 배 색 대신 위장이 보여요.</p>` : slot === "smoke" ? `<p class="small muted">굴뚝에서 나오는 연기 색을 바꿔요.</p>` : slot === "weapon" ? `<p class="small muted">${shop ? "시대마다 그 바다의 미니게임에서 낮은 확률로 발견하거나, 포인트로 보급 상자를 열어 얻어요." : "장착은 그 시대의 배부터 할 수 있어요. 장착하면 배 위에 올라가고 전투력도 올라가요."}</p>` : ""}${slot === "weapon" ? shop ? weaponEras.map(([m, list]) => `<h3>${esc(m.era)}</h3>${boxRow(m)}${list.length ? `<div class="deco-grid">${list.map(card).join("")}</div>` : ""}`).join("") : `<div class="deco-grid">${plain}</div>${weaponEras.filter(([, list]) => list.length).map(([m, list]) => `<h3>${esc(m.era)}</h3><div class="deco-grid">${list.map(card).join("")}</div>`).join("")}` : shop && !items.length ? allDone : `<div class="deco-grid">${plain}${items.map(card).join("")}</div>`}`;
  const toShop = shop || slot === "color" ? "" : `<div class="row between deck-more"><span class="small muted">가진 것만 여기에 보여요. 더 모으려면 상점을 둘러봐요.</span><button class="btn sm" data-act="ktab" data-v="shop">상점 가기</button></div>`;
  return `<section class="panel deco-hero"><div class="row between"><h2>${esc(me.nickname)}의 ${esc((d.ships.find(s => s.id === (K.tryShip || me.ship)) || curShip).name)}</h2><span class="small">전투력 <b class="num">${me.power}</b> · ${coin(gold)}</span></div>
      <div class="deco3d" id="deco3d">${shipBox(K.tryShip || me.ship, tryItem ? previewItem(L, tryItem) : L, me.sail, me.nickname, "big")}<p class="s3d-msg">3D 배를 불러오는 중…</p></div>
      ${conf ? `<div class="confirm"><span><b>${esc(conf.name)}</b>을(를) 금화 ${conf.price}개로 살까요? 남는 금화 ${gold - conf.price}</span><button class="btn sm primary" data-act="kdecoBuy" data-v="${conf.key}">사기</button><button class="btn sm" data-act="kno">취소</button></div>` : ""}
      ${shipConf ? `<div class="confirm"><span><b>${esc(shipConf.name)}</b>을(를) 금화 ${shipConf.price}개로 살까요? 남는 금화 ${gold - shipConf.price}</span><button class="btn sm primary" data-act="kshipBuy" data-v="${shipConf.id}">사기</button><button class="btn sm" data-act="kno">취소</button></div>` : ""}
      ${K.confirm && K.confirm.box != null ? `<div class="confirm"><span><b>보급 상자</b>를 포인트 ${d.boxes[K.confirm.box].price}으로 열까요? 남는 포인트 ${d.bal.points - d.boxes[K.confirm.box].price}</span><button class="btn sm primary" data-act="kboxOpen" data-v="${K.confirm.box}">열기</button><button class="btn sm" data-act="kno">취소</button></div>` : ""}
      ${upConf ? `<div class="confirm"><span><b>${esc(upConf.name)}</b> ${upConf.level + 1}단계를 금화 ${upConf.price}개로 올릴까요? 남는 금화 ${gold - upConf.price}</span><button class="btn sm primary" data-act="kupBuy" data-v="${upConf.id}">강화</button><button class="btn sm" data-act="kno">취소</button></div>` : ""}</section>
    <section class="panel"><div class="chips" role="group" aria-label="${shop ? "상점" : "장비"} 종류">${tabs.map(([k, l]) => `<button class="chip" data-act="kslot" data-v="${k}" aria-pressed="${slot === k}">${l}</button>`).join("")}</div>${noSail}${body}${toShop}</section>`;
}
/* ---------- the collection book and titles ---------- */
function kDex() { const d = K.d, has = new Set(d.owned), now = d.me.look.ttl, bar = (a, b) => `<div class="dex-bar"><i style="width:${b ? a / b * 100 : 0}%"></i></div>`;
  const titles = d.titles.map(t => `<div class="dex-title ${t.got ? "got" : ""}"><div><b>${esc(t.name)}</b><span class="small muted">${esc(t.desc)}</span>${t.got ? "" : `${bar(t.cur, t.goal)}<span class="small muted num">${t.cur} / ${t.goal}</span>`}</div>${t.got ? now === t.id ? `<button class="btn sm" data-act="ktitle" data-v="">떼기</button>` : `<button class="btn sm primary" data-act="ktitle" data-v="${t.id}">달기</button>` : ""}</div>`).join("");
  const eras = d.maps.map(m => [`${m.era} 무기`, d.deco.filter(x => x.slot === "weapon" && x.era === m.id)]), slots = [["배 색", x => x.slot === "hull"], ["돛 무늬", x => x.slot === "pattern"], ["문양", x => x.slot === "emblem"], ["부착물", x => x.slot === "att" && !x.group], ["함재기", x => x.group === "air"], ["위장 도색", x => x.slot === "camo"], ["연기", x => x.slot === "smoke"], ["선수상·테두리", x => x.slot === "head" || x.slot === "trim"], ["물결", x => x.slot === "wake"], ["이름표", x => x.slot === "tag"]].map(([n, f]) => [n, d.deco.filter(f)]);
  const tile = x => { const got = has.has(x.key); return x.slot === "weapon" ? `<div class="dex-w ${got ? "got" : ""} r-${x.rarity}">${weaponImg(x.id)}<span class="small">${got ? esc(x.name) : "???"}</span></div>` : `<span class="dex-c ${got ? "got" : ""}">${got ? esc(x.name) : "???"}</span>`; };
  const group = ([n, list]) => { const c = list.filter(x => has.has(x.key)).length; return `<div class="dex-group"><div class="row between"><h3>${esc(n)}</h3><span class="small num ${c === list.length ? "ok" : "muted"}">${c} / ${list.length}</span></div>${bar(c, list.length)}<div class="dex-list">${list.map(tile).join("")}</div></div>`; };
  const ships = d.ships, shipsGot = ships.filter(s => !s.price || has.has(`ship.${s.id}`)).length;
  return `<section class="panel"><h2>칭호</h2><p class="small muted">얻은 칭호를 하나 달면 이름 옆에 보여요.</p><div class="dex-titles">${titles}</div></section>
    <section class="panel"><h2>도감</h2><p class="small muted">모은 배와 무기, 꾸미기가 여기에 채워져요.</p><div class="dex-group"><div class="row between"><h3>배</h3><span class="small num muted">${shipsGot} / ${ships.length}</span></div>${bar(shipsGot, ships.length)}<div class="dex-list">${ships.map(s => { const got = !s.price || has.has(`ship.${s.id}`); return `<span class="dex-c ${got ? "got" : ""}">${got ? esc(s.name) : "???"}</span>`; }).join("")}</div></div>${[...eras, ...slots].map(group).join("")}</section>`; }
/* ---------- classmates' ships ---------- */
function kCrew() { const d = K.d, me = d.me, friends = d.mates.filter(m => m.id !== me.id), v = friends.find(m => m.id === K.mate), mine = new Set(d.likes.mine), count = id => d.likes.counts[id] || 0;
  const heart = m => mine.has(m.id) ? `<span class="pill ok">좋아요 눌렀어요</span>` : `<button class="btn sm primary" data-act="klike" data-v="${m.id}">좋아요</button>`, shipName = id => d.ships.find(s => s.id === id)?.name || "";
  const hearts = n => n ? `<span class="likes"><i></i><span class="num">${n}</span></span>` : "", online = new Set(K.online || []), canDuel = d.battle.open && d.battle.duelLeft > 0, duelBtn = m => online.has(m.id) && canDuel ? `<button class="btn sm" data-act="kduel" data-v="${m.id}">대결 신청</button>` : "", order = [...friends].sort((p, q) => online.has(q.id) - online.has(p.id));
  return `${v ? `<section class="panel"><div class="row between"><h2>${esc(v.nickname)}의 ${esc(shipName(v.ship))}</h2><button class="btn sm ghost" data-act="kmate" data-v="${v.id}">닫기</button></div>
      <div class="deco3d" id="mate3d">${shipBox(v.ship, v.look, v.sail, v.nickname, "big")}<p class="s3d-msg">3D 배를 불러오는 중…</p></div>
      <div class="row between"><span class="small">전투력 <b class="num">${v.power}</b>${titleName(v.look) ? ` · <b>${esc(titleName(v.look))}</b>` : ""}</span><span class="row">${hearts(count(v.id))}${heart(v)}${duelBtn(v)}</span></div></section>` : ""}
    <section class="panel"><div class="row between"><h2>우리 반 친구 배</h2>${count(me.id) ? `<span class="small">내 배 좋아요 ${hearts(count(me.id))}</span>` : ""}</div><p class="small muted">배를 누르면 3D로 크게 볼 수 있어요. 마음에 드는 배에 좋아요를 눌러요. 친구마다 일주일에 한 번 누를 수 있어요.</p>
      <p class="duel-note small"><b>실시간 대결</b> ${d.battle.off ? "선생님이 전투를 쉬게 했어요." : !d.battle.open ? `전투는 ${d.game.hourFrom}~${d.game.hourTo}시에만 해요.` : `접속 중인 친구에게 신청하면 바로 겨뤄요. 오늘 <b class="num">${d.battle.duelLeft}</b>번 남았어요. 금화 보상은 없어요.`}</p>
      ${friends.length ? `<div class="deco-grid">${order.map(m => `<div class="deco-item ${K.mate === m.id ? "sel" : ""}" data-act="kmate" data-v="${m.id}">${shipBox(m.ship, m.look, m.sail, "", "tiny")}<b>${online.has(m.id) ? `<i class="on-dot" title="접속 중"></i>` : ""}${esc(m.nickname)}</b><span class="small muted">${esc(shipName(m.ship))}${titleName(m.look) ? ` · ${esc(titleName(m.look))}` : ""}</span><span class="row">${hearts(count(m.id))}${heart(m)}${duelBtn(m)}</span></div>`).join("")}</div>` : `<p class="muted small">아직 같은 반 친구가 없어요.</p>`}</section>`; }
function kLog() {
  const d = K.d;
  return `<div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-act="logout">로그아웃</button></div>${d.weak?.length ? `<section class="panel"><h3>다시 풀어 볼 유형</h3><p class="small muted">최근 2주 동안 틀린 적이 있는 유형이에요. 연습은 행동력이 들지 않아요. 대신 포인트, 아이템, 보스 피해가 없어요.</p><div class="plist">${d.weak.map(w => `<div class="prow"><span><b>${esc(w.tag)}</b></span><span class="small muted num">${w.tries}문제 중 ${w.wrong}개 틀림</span><button class="btn sm primary" data-act="kpractice" data-v="${esc(`${w.game}|${w.map}|${w.tag}`)}">연습</button></div>`).join("")}</div></section>` : ""}
    ${d.orders.length ? `<section class="panel"><h3>선생님이 챙겨 줄 것</h3><div class="plist">${d.orders.map(o => `<div class="prow"><span>${esc(o.name)}</span><span class="small muted">${fmtTime(o.created_at)}</span><span class="pill wait">준비 중</span></div>`).join("")}</div></section>` : ""}
    <section class="panel feed"><h3>항해 일지</h3>${d.log.length ? `<ul>${d.log.map(l => `<li><time class="num">${fmtTime(l.at)}</time><span>${esc(l.title)}</span><span class="small">${l.energy ? `<span class="nrg num">${l.energy > 0 ? "+" : ""}${l.energy}</span> ` : ""}${l.points ? `<span class="pt num">${l.points > 0 ? "+" : ""}${l.points}</span> ` : ""}${l.gold ? `<span class="gold num">${l.gold > 0 ? "+" : ""}${l.gold}</span>` : ""}</span></li>`).join("")}</ul>` : `<p class="muted small">아직 기록이 없어요.</p>`}</section>`;
}
function kDo(fn, msg) { return oneAtATime(async () => { try { const r = await fn(); if (msg) toast(msg); await kidLoad(); kidRender(); return r; } catch (e) { toast(e.message); } }); }
// pictures for a mini-game: the water from this sea's map, plus 3D stills of my ship seen from behind (reef) or the target seen from the side (cannon)
const TARGETS = ["galleon", "ironclad", "destroyer"];
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
const artMade = {};
function gameArt(kind, map = K.map) { const me = K.d.me, key = `${kind}|${map}|${kind === "reef" ? JSON.stringify([me.look, me.sail, me.ship]) : ""}`; return artMade[key] || (artMade[key] = makeArt(kind, map)); }
async function makeArt(kind, map) {
  const me = K.d.me, art = { sea: await loadImg(`/maps/sea${map + 1}.webp`) };
  if (kind === "memory" || kind === "port" || !window.Ship3D?.available()) return art;
  try { const v = await Ship3D.get(), s = sail(me.sail);
    if (kind === "reef") art.me = await loadImg((await v.snapshot(me.look, s, me.look.fc != null ? sail(me.look.fc) : s, me.ship, 384, { th: Math.PI, ph: .62 })).url);
    if (kind === "cannon") art.target = await loadImg((await v.snapshot({ hull: "ebony" }, "#8E2A22", "#23262B", TARGETS[map], 384, { th: Math.PI / 2, ph: 1.12 })).url);
  } catch (e) {}
  return art;
}
// a game seen for the first time explains itself before any energy is spent; false if the child backs out
async function introOnce(kind, map) {
  const seen = `hs_intro5_${kind}_${map}${K.d.level ? "_m" : ""}`; // raise the number when a game's rules change, so everyone sees the new rules once
  if (ls.get(seen)) return true;
  const go = await Games.intro(kind, map, K.d.maps[map].isles[kind], K.d.games[kind].stars, true); if (go) ls.set(seen, "1"); return go;
}
const artSoon = (kind, map) => Promise.race([gameArt(kind, map), sleep(1800).then(() => null)]); // never make a child wait long for pictures: the plain drawings are the fallback
// what was answered goes to the teacher's report, whether the game was finished or not; a lost report never gets in the child's way
function sendAnswers(game, map) { const tally = Games.tally(); if (!Object.keys(tally).length) return Promise.resolve();
  return api("/api/kid/answers", { game, map, tally, missed: (Games.missed() || []).map(m => ({ tag: m.tag, lines: m.plain?.lines || m.lines, answer: m.plain?.answer || m.answer, how: m.how })) }).catch(() => {}); }
// a game's result is written down before it is sent, so a bad connection can't lose it: it goes out again by itself once the app can reach the server. The server takes each game's result only once.
const unsentKey = () => `hs_unsent_${K.d.me.id}`;
const unsent = () => { try { return JSON.parse(ls.get(unsentKey()) || "[]"); } catch (e) { return []; } };
const unsentAdd = (id, body) => ls.set(unsentKey(), JSON.stringify([...unsent().filter(x => x.id !== id), { id, body }]));
const unsentDrop = id => ls.set(unsentKey(), JSON.stringify(unsent().filter(x => x.id !== id)));
// the answer, or null if it still couldn't be sent and stays written down
async function sendResult(id, body) {
  for (let i = 0; ; i++) {
    try { const r = await api(`/api/kid/play/finish/${id}`, body); unsentDrop(id); return r; }
    catch (e) { if (!e.retry) { unsentDrop(id); throw e; } if (i === 2) return null; toast("결과를 보내는 중이에요"); await sleep(1500 * (i + 1)); }
  }
}
async function flushResults() {
  if (K.busy || !K.d || K.d.me.mustChange || $(".modal") || $(".game") || $(".fight")) return; const list = unsent(); if (!list.length) return;
  K.busy = true; let sent = false;
  try {
    for (const x of list) { let r; try { r = await api(`/api/kid/play/finish/${x.id}`, x.body); } catch (e) { if (e.retry) break; unsentDrop(x.id); continue; } unsentDrop(x.id); sent = true;
      if (!x.body.quit) { toast("지난 게임 결과가 도착했어요"); await rewardCard(r, null); } }
    if (sent) { await kidLoad(); kidRender(); }
  } catch (e) {}
  K.busy = false;
}
// a mini-game from the first tap to the reward card
async function playGame(kind) {
  if (K.busy) return; K.busy = true;
  try {
    MathQ.setLevel(K.d.level);
    if (!await introOnce(kind, K.map)) { K.busy = false; return; }
    let playId; const ready = Promise.all([api("/api/kid/play/start", { game: kind, map: K.map }), artSoon(kind, K.map)]).then(([r, art]) => { playId = r.playId; return art; });
    const score = await Games.run(kind, { map: K.map, title: K.d.maps[K.map].isles[kind], ready });
    const body = score === null ? { score: 0, quit: true } : { score }; unsentAdd(playId, body);
    await sendAnswers(kind, K.map);
    const r = await sendResult(playId, body);
    if (score === null) toast("다음에 다시 도전해요");
    else if (r) await rewardCard(r, Games.missed());
    else toast("인터넷이 끊겨 결과를 아직 못 보냈어요. 연결되면 저절로 보내져요");
    if (r) { await kidLoad(); kidRender(); }
  } catch (e) { toast(e.message); }
  K.busy = false; kidNotices();
}
// practice: no energy, and no points, items or boss damage, because the server never hears of it as a play. tag narrows the questions to one kind.
async function practice(v) {
  if (K.busy) return; K.busy = true;
  const [kind, m, tag] = v.split("|"), map = Number(m); let again = false;
  try {
    MathQ.setLevel(K.d.level);
    if (await introOnce(kind, map)) {
      MathQ.setFocus(tag);
      const score = await Games.run(kind, { map, title: `연습 · ${tag || K.d.maps[map].isles[kind]}`, ready: artSoon(kind, map) });
      await sendAnswers(kind, map);
      if (score === null) toast("다음에 또 연습해요"); else again = await practiceCard(score, Games.missed());
      await kidLoad(); kidRender();
    }
  } catch (e) { toast(e.message); }
  MathQ.setFocus(null); K.busy = false;
  if (again) return practice(v);
  kidNotices();
}
function practiceCard(score, miss) {
  return new Promise(done => { const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="panel reward"><h2>연습 끝!</h2><p class="num">점수 ${score}</p><p class="small muted">연습이라 포인트와 보스 피해는 없어요.</p>${missHTML(miss)}<div class="row how-go"><button class="btn primary lg" data-again>한 번 더</button><button class="btn" data-close>닫기</button></div></div>`;
    document.body.appendChild(m); const end = v => { m.remove(); done(v); }; m.querySelector("[data-again]").onclick = () => end(true); m.querySelector("[data-close]").onclick = () => end(false); m.querySelector("[data-again]").focus(); });
}
const foundHTML = it => `<div class="found r-${esc(it.rarity)}"><span class="rar r-${esc(it.rarity)}">${esc(it.rarity)}</span>${it.slot === "weapon" ? `<div class="found-w">${weaponImg(it.key.split(".")[1])}</div>` : ""}<b>${esc(it.name)} 발견!</b><small>${it.dup ? `이미 있어서 금화 ${it.gold}개로 바꿨어요` : it.slot === "weapon" ? (K.d.deco.find(x => x.key === it.key).era > K.d.ships.find(s => s.id === K.d.me.ship).era ? `${K.d.ships.find(s => s.era === K.d.deco.find(x => x.key === it.key).era).name}부터 장착할 수 있어요` : "장비 → 무기에서 장착할 수 있어요") : "장비에서 쓸 수 있어요"}</small></div>`;
async function openBox(mapId) {
  if (K.busy) return; K.busy = true; K.confirm = null;
  try {
    const r = await api("/api/kid/box", { map: Number(mapId) });
    await new Promise(done => { const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
      m.innerHTML = `<div class="panel reward"><h2>보급 상자를 열었어요!</h2>${foundHTML(r.item)}<button class="btn primary lg" data-close>확인</button></div>`;
      document.body.appendChild(m); const b = m.querySelector("[data-close]"); b.focus(); b.onclick = () => { m.remove(); done(); }; });
    await kidLoad(); kidRender();
  } catch (e) { toast(e.message); kidRender(); }
  K.busy = false;
}
// the questions missed in this game, for the card
function missHTML(miss) { if (!miss) return "";
  if (!miss.length) return `<p class="miss-none">틀린 문제가 없어요!</p>`;
  const counts = {}; for (const m of miss) counts[m.tag] = (counts[m.tag] || 0) + 1;
  return `<details class="miss"><summary><span>틀린 문제 다시 보기 <b class="num">${miss.length}</b>개</span><span class="miss-tags">${Object.entries(counts).map(([t, n]) => `<i>${t} ${n}</i>`).join("")}</span></summary><ol>${miss.map(m => `<li><small>${m.tag}</small><div class="miss-q num">${m.lines.map(l => `<div>${MathQ.html(l)}</div>`).join("")}</div><p class="miss-a">정답 <b class="num">${MathQ.html(m.answer)}</b></p>${m.how ? `<p class="miss-how num">${MathQ.html(m.how)}</p>` : ""}</li>`).join("")}</ol></details>`; }
function rewardCard(r, miss) {
  return new Promise(done => {
    const it = r.item, m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="panel reward"><div class="stars" aria-label="별 ${r.stars}개">${[0, 1, 2].map(i => `<i class="${i < r.stars ? "on" : ""}"></i>`).join("")}</div><h2>${r.stars ? "잘했어요!" : "아쉬워요!"}</h2><p class="num">점수 ${r.score} · ${pts(`+${r.points}`)}</p>
      ${r.boss ? `<p class="small">${r.boss.down ? `<b>${esc(r.boss.name)}</b>을(를) 쓰러뜨렸어요!` : `<b>${esc(r.boss.name)}</b>에게 <b class="num">${r.boss.dmg}</b> 피해! 남은 체력 <span class="num">${r.boss.left}</span>`}</p>` : ""}${it ? foundHTML(it) : ""}${missHTML(miss)}<button class="btn primary lg" data-close>확인</button></div>`;
    document.body.appendChild(m); const b = m.querySelector("[data-close]"); b.focus(); Sfx.stars(r.stars); if (it) setTimeout(Sfx.coin, 560); b.onclick = () => { m.remove(); done(); };
  });
}
// three shots at a sliding gauge before the battle; good aim adds up to 12% to the win chance. Leaving here costs nothing.
function aimPhase() { return new Promise(done => { const m = document.createElement("div"); m.className = "fight aim"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="aim-box"><h2>조준!</h2><p>바늘이 초록 칸에 올 때 눌러요. 잘 맞히면 승률이 올라가요.</p><div class="aim-bar"><i class="aim-zone"><b></b></i><i class="aim-needle"></i></div><div class="aim-dots"><i></i><i></i><i></i></div><p class="aim-say" aria-live="polite">&nbsp;</p><button type="button" class="btn primary lg" data-aim>발사!</button><button type="button" class="btn sm ghost" data-out>나가기</button></div>`; document.body.appendChild(m);
    const zone = m.querySelector(".aim-zone"), needle = m.querySelector(".aim-needle"), say = m.querySelector(".aim-say"), dots = [...m.querySelectorAll(".aim-dots i")]; let shot = 0, bonus = 0, center = 50, t = 0, last = performance.now(), live = true, wait = false;
    const place = () => { center = 18 + Math.random() * 64; zone.style.left = center + "%"; }; place();
    const finish = v => { live = false; m.remove(); done(v); };
    const fire = () => { if (wait || !live) return; const pos = 50 - Math.cos(t) * 50, off = Math.abs(pos - center), pt = off <= 5 ? 4 : off <= 12 ? 2 : 0; bonus += pt; dots[shot].className = pt === 4 ? "p" : pt ? "n" : "x"; say.textContent = pt === 4 ? "정확해요!" : pt ? "괜찮아요" : "빗나갔어요"; pt ? Sfx.boom(pt === 4 ? .7 : .45) : Sfx.splash(); shot++; wait = true;
      if (shot === 3) { setTimeout(() => { say.textContent = bonus ? `승률 +${bonus}%` : "그래도 출항!"; setTimeout(() => finish(bonus), 700); }, 450); return; } setTimeout(() => { wait = false; place(); }, 500); };
    m.querySelector("[data-aim]").onclick = fire; m.querySelector("[data-out]").onclick = () => finish(null);
    (function tick(now) { if (!live) return; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!wait) t += dt * (2.4 + shot * .9); needle.style.left = 50 - Math.cos(t) * 50 + "%"; requestAnimationFrame(tick); })(last); }); }
// a battle already decided by the server, played out shot by shot
async function playFight() {
  if (K.busy) return; K.busy = true; let r;
  if (!K.d.battle.open || K.d.battle.left <= 0) { toast(K.d.battle.open ? "오늘 전투를 모두 썼어요. 내일 다시 해요" : "지금은 전투 시간이 아니에요"); K.busy = false; return; } // no aiming for a battle that cannot happen
  const aim = await aimPhase(); if (aim === null) { K.busy = false; return; }
  try { r = await api("/api/kid/battle", { aim }); } catch (e) { toast(e.message); K.busy = false; return; }
  const m = document.createElement("div"); m.className = "fight"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<p class="f-load">출항 준비 중…</p>`; document.body.appendChild(m);
  const kindOf = p => K.d.deco.find(x => x.key === `weapon.${p.look.weapon}`)?.kind || "cannon";
  // 3D first; a device that can't run it (or takes too long to load it) gets the flat battle below
  let fx = null, v3d = null;
  if (window.Ship3D?.available()) try { v3d = await Promise.race([Ship3D.get(), sleep(6000)]); } catch (e) {}
  if (v3d) { const side3 = p => ({ look: p.look, sailHex: sail(p.sail), flagHex: p.look.fc != null ? sail(p.look.fc) : sail(p.sail), ship: p.ship });
    const side = (p, cls, tag) => `<div class="f-side ${cls}"><b>${esc(p.nickname)}</b><span class="small num">${titleName(p.look) ? esc(titleName(p.look)) : tag} · 전투력 ${p.power}</span><div class="hpbar"><i style="width:100%"></i></div></div>`;
    m.className = "fight f3"; m.innerHTML = `<div class="f-view"></div><i class="f-hurt"></i><div class="f-top">${side(r.me, "a", "내 배")}<span class="f-vs">VS</span>${side(r.opp, "d", "상대")}</div><span class="f-dmg" hidden></span><div class="f-bottom"><button type="button" class="btn sm" data-skip>건너뛰기</button>${sndBtn()}</div>`;
    try { fx = await v3d.fight(m.querySelector(".f-view"), side3(r.me), side3(r.opp)); } catch (e) { fx = null; } }
  if (fx) { let fast = false; m.querySelector("[data-skip]").onclick = () => fast = true;
    const dmgEl = m.querySelector(".f-dmg"), hurt = m.querySelector(".f-hurt"), hpA = m.querySelector(".f-side.a .hpbar i"), hpD = m.querySelector(".f-side.d .hpbar i");
    fx.onHurt = () => { hurt.classList.remove("on"); hurt.offsetWidth; hurt.classList.add("on"); }; fx.onSortie = () => Sfx.jet(); fx.onStrafe = () => Sfx.shot("gun"); fx.onBlast = k => Sfx.boom(k);
    if (!fast) await fx.intro();
    for (const s of r.rounds) { const fromA = s.by === "a";
      if (!fast) { Sfx.shot(kindOf(fromA ? r.me : r.opp)); await fx.fire(s.by, s.dmg, kindOf(fromA ? r.me : r.opp));
        if (!s.dmg) Sfx.splash(); else if (fromA) Sfx.boom(); else Sfx.hurt();
        dmgEl.className = `f-dmg pop ${fromA ? "to-d" : "to-a"} ${s.dmg ? "" : "miss"}`; dmgEl.hidden = false; dmgEl.textContent = s.dmg ? `-${s.dmg}` : "빗나감"; }
      hpA.style.width = s.hp.a + "%"; hpD.style.width = s.hp.d + "%";
      if (!fast) { await sleep(s.dmg ? 720 : 560); dmgEl.hidden = true; } }
    dmgEl.hidden = true; m.querySelector("[data-skip]").hidden = true; await fx.finish(r.won, fast); Sfx[r.won ? "win" : "lose"]();
    m.querySelector(".f-bottom").innerHTML = `<div class="f-result ${r.won ? "win" : "lose"}"><h2>${r.won ? "승리!" : "패배"}</h2><p>${r.delta ? `금화 ${r.delta > 0 ? "+" : ""}${r.delta}개` : "잃은 금화는 없어요"}</p><p class="small">${r.aim ? `조준 보너스 승률 +${r.aim}% · ` : ""}오늘 남은 전투 ${r.left}번</p><button class="btn primary lg" data-close>확인</button></div>`;
    await new Promise(res => { const b = m.querySelector("[data-close]"); b.focus(); b.onclick = res; });
    fx.close(); m.remove(); await kidLoad(); kidRender(); K.busy = false; return; }
  m.className = "fight";
  const side = (p, cls) => `<div class="f-side ${cls}"><b>${esc(p.nickname)}</b><span class="small num">전투력 ${p.power}</span><div class="hpbar"><i style="width:100%"></i></div></div>`;
  m.innerHTML = `<div class="f-top">${side(r.me, "a")}<span class="f-vs">VS</span>${side(r.opp, "d")}</div>
    <div class="f-sea"><div class="f-ship a" style="--sail:${sail(r.me.sail)}">${shipSVG(r.me.ship, r.me.look, r.me.sail)}</div><div class="f-ship d" style="--sail:${sail(r.opp.sail)}">${shipSVG(r.opp.ship, r.opp.look, r.opp.sail)}</div><i class="f-ball" hidden></i><span class="f-dmg" hidden></span></div>
    <div class="f-bottom"><button type="button" class="btn sm" data-skip>건너뛰기</button>${sndBtn()}</div>`;
  let fast = false; m.querySelector("[data-skip]").onclick = () => fast = true;
  const ball =m.querySelector(".f-ball"), dmgEl = m.querySelector(".f-dmg"), hpA = m.querySelector(".f-side.a .hpbar i"), hpD = m.querySelector(".f-side.d .hpbar i"), shipA = m.querySelector(".f-ship.a"), shipD = m.querySelector(".f-ship.d");
  await sleep(350);
  for (const s of r.rounds) {
    if (!fast) { const fromA = s.by === "a"; Sfx.shot(kindOf(fromA ? r.me : r.opp)); ball.className = `f-ball k-${kindOf(fromA ? r.me : r.opp)}${fromA ? "" : " rev"}`; ball.hidden = false; ball.style.transition = "none"; ball.style.left = fromA ? "26%" : "74%"; ball.offsetWidth; ball.style.transition = "left .42s linear"; ball.style.left = fromA ? "74%" : "26%"; await sleep(430); ball.hidden = true; if (!s.dmg) Sfx.splash(); else if (fromA) Sfx.boom(); else Sfx.hurt();
      const hit = fromA ? shipD : shipA; dmgEl.hidden = false; dmgEl.textContent = s.dmg ? `-${s.dmg}` : "빗나감"; dmgEl.style.left = fromA ? "74%" : "26%"; if (s.dmg) { hit.classList.add("hit"); setTimeout(() => hit.classList.remove("hit"), 260); } }
    hpA.style.width = s.hp.a + "%"; hpD.style.width = s.hp.d + "%";
    if (!fast) { await sleep(420); dmgEl.hidden = true; }
  }
  (r.won ? shipD : shipA).classList.add("sunk");
  await sleep(fast ? 100 : 500); Sfx[r.won ? "win" : "lose"]();
  m.querySelector(".f-bottom").innerHTML = `<div class="f-result ${r.won ? "win" : "lose"}"><h2>${r.won ? "승리!" : "패배"}</h2><p>${r.delta ? `금화 ${r.delta > 0 ? "+" : ""}${r.delta}개` : "잃은 금화는 없어요"}</p><p class="small">${r.aim ? `조준 보너스 승률 +${r.aim}% · ` : ""}오늘 남은 전투 ${r.left}번</p><button class="btn primary lg" data-close>확인</button></div>`;
  await new Promise(res => { const b = m.querySelector("[data-close]"); b.focus(); b.onclick = res; });
  m.remove(); await kidLoad(); kidRender(); K.busy = false;
}
/* ---------- live duels with a classmate who is online: no gold, and counted apart from ordinary battles ---------- */
const DUEL_END = { declined: "친구가 대결을 거절했어요", expired: "친구가 응답하지 않았어요", cancelled: "신청을 취소했어요" };
// who is online and any invitation: every 3 seconds on the friends' screen or while an invitation is up, otherwise every 8, which still leaves plenty of a 30-second invitation
async function duelLoop() { try { await duelPoll(); } catch (e) {} setTimeout(duelLoop, K.tab === "crew" || K.inviteEl ? 3000 : 8000); }
async function duelPoll() { if (document.hidden || !K.d || K.d.me.mustChange || K.duelOn) return; const free = !(K.busy || K.crop || $(".game") || $(".fight")); let r; try { r = await api(`/api/kid/duel/poll${free ? "?free=1" : ""}`); } catch (e) { return; }
  const before = (K.online || []).join(), now = [...r.online].sort((a, b) => a - b); K.online = now; const el = K.inviteEl;
  if (el && r.invite?.id !== K.inviteId) { el.remove(); K.inviteEl = null; if (K.inviteId) toast("대결 신청이 끝났어요"); K.inviteId = null; }
  if (!free || K.busy || K.duelOn) return;
  if (r.duel?.status === "live") return playDuel(r.duel.id);
  if (before !== now.join() && K.tab === "crew" && !$(".modal")) kidRender();
  if (r.invite && !$(".modal")) duelInvite(r.invite); }
function duelInvite(inv) { const who = K.d.mates.find(m => m.id === inv.from), m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); K.inviteEl = m; K.inviteId = inv.id;
  m.innerHTML = `<div class="panel reward">${who ? shipBox(who.ship, who.look, who.sail, "", "tiny") : ""}<h2>${esc(who?.nickname || "친구")}의 대결 신청!</h2><p class="small muted">같은 수학 문제를 시간 안에 풀어요. 맞혀야 공격할 수 있고, 먼저 맞히면 먼저 쏴요. 금화 보상은 없어요.</p><div class="row"><button class="btn primary lg" data-yes>수락</button><button class="btn" data-no>거절</button></div></div>`; document.body.appendChild(m); thumbScan(); Sfx.lock(); m.querySelector("[data-yes]").focus();
  const close = () => { m.remove(); K.inviteEl = null; K.inviteId = null; };
  m.querySelector("[data-no]").onclick = () => { close(); api(`/api/kid/duel/${inv.id}/answer`, { accept: false }).catch(() => {}); };
  m.querySelector("[data-yes]").onclick = async () => { close(); try { await api(`/api/kid/duel/${inv.id}/answer`, { accept: true }); playDuel(inv.id); } catch (e) { toast(e.message); } }; }
async function duelChallenge(id) { if (K.busy) return; K.busy = true; let duel; try { duel = await api(`/api/kid/duel/challenge/${id}`, {}); } catch (e) { toast(e.message); K.busy = false; return; }
  const who = K.d.mates.find(x => x.id === id), m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.innerHTML = `<div class="panel reward"><h2>${esc(who?.nickname || "친구")}에게 신청했어요</h2><p>대답을 기다리고 있어요… <b class="num" data-left>30</b>초</p><button class="btn" data-no>취소</button></div>`; document.body.appendChild(m); let stop = false; const out = m.querySelector("[data-no]"); out.focus();
  out.onclick = () => { stop = true; api(`/api/kid/duel/${duel.id}/quit`, {}).catch(() => {}); };
  let live = false; while (!stop) { await sleep(1000); let v; try { v = await api(`/api/kid/duel/${duel.id}`); } catch (e) { continue; } m.querySelector("[data-left]").textContent = Math.ceil(v.ms / 1000); if (v.status === "wait") continue; if (v.status === "live") live = true; else toast(DUEL_END[v.status] || "대결이 끝났어요"); break; }
  m.remove(); K.busy = false; if (live) playDuel(duel.id); else kidRender(); }
// the two ships and the shots; the same battle picture as an ordinary fight, or the flat one where 3D can't run
async function duelStage(me, opp) { const m = document.createElement("div"); m.className = "fight"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.innerHTML = `<p class="f-load">출항 준비 중…</p>`; document.body.appendChild(m);
  const kindOf = p => K.d.deco.find(x => x.key === `weapon.${p.look.weapon}`)?.kind || "cannon", side = (p, cls, tag) => `<div class="f-side ${cls}"><b>${esc(p.nickname)}</b><span class="small num">${titleName(p.look) ? esc(titleName(p.look)) : tag} · 전투력 ${p.power}</span><div class="hpbar"><i style="width:100%"></i></div></div>`, top = `<div class="f-top">${side(me, "a", "내 배")}<span class="f-vs">VS</span>${side(opp, "d", "친구")}</div>`, bottom = `<div class="f-bottom"><div class="duel-panel"></div><div class="row"><button type="button" class="btn sm" data-giveup>기권</button>${sndBtn()}</div></div>`;
  let fx = null, v3d = null; if (window.Ship3D?.available()) try { v3d = await Promise.race([Ship3D.get(), sleep(6000)]); } catch (e) {}
  if (v3d) { const side3 = p => ({ look: p.look, sailHex: sail(p.sail), flagHex: p.look.fc != null ? sail(p.look.fc) : sail(p.sail), ship: p.ship }); m.className = "fight f3"; m.innerHTML = `<div class="f-view"></div><i class="f-hurt"></i>${top}<span class="f-dmg" hidden></span>${bottom}`; try { fx = await v3d.fight(m.querySelector(".f-view"), side3(me), side3(opp)); } catch (e) { fx = null; } }
  if (!fx) { m.className = "fight"; m.innerHTML = `${top}<div class="f-sea"><div class="f-ship a" style="--sail:${sail(me.sail)}">${shipSVG(me.ship, me.look, me.sail)}</div><div class="f-ship d" style="--sail:${sail(opp.sail)}">${shipSVG(opp.ship, opp.look, opp.sail)}</div><i class="f-ball" hidden></i><span class="f-dmg" hidden></span></div>${bottom}`; }
  const dmgEl = m.querySelector(".f-dmg"), hpA = m.querySelector(".f-side.a .hpbar i"), hpD = m.querySelector(".f-side.d .hpbar i"), hurt = m.querySelector(".f-hurt"), ball = m.querySelector(".f-ball");
  if (fx) { fx.onHurt = () => { hurt.classList.remove("on"); hurt.offsetWidth; hurt.classList.add("on"); }; fx.onSortie = () => Sfx.jet(); fx.onStrafe = () => Sfx.shot("gun"); fx.onBlast = k => Sfx.boom(k); }
  const hp = (a, d) => { hpA.style.width = a + "%"; hpD.style.width = d + "%"; };
  return { m, panel: m.querySelector(".duel-panel"), hp, intro: () => fx ? fx.intro() : sleep(350), close() { fx?.close(); m.remove(); },
    // a wrong answer fires nothing
    async noShot(fromMe) { Sfx.wrong(); dmgEl.className = `f-dmg pop ${fromMe ? "to-a" : "to-d"} miss`; dmgEl.hidden = false; dmgEl.textContent = "공격 실패"; if (!fx) dmgEl.style.left = fromMe ? "26%" : "74%"; await sleep(800); dmgEl.hidden = true; },
    async shot(fromMe, dmg, a, d) { const p = fromMe ? me : opp, kind = kindOf(p); Sfx.shot(kind);
      if (fx) await fx.fire(fromMe ? "a" : "b", dmg, kind); else { ball.className = `f-ball k-${kind}${fromMe ? "" : " rev"}`; ball.hidden = false; ball.style.transition = "none"; ball.style.left = fromMe ? "26%" : "74%"; ball.offsetWidth; ball.style.transition = "left .42s linear"; ball.style.left = fromMe ? "74%" : "26%"; await sleep(430); ball.hidden = true; }
      if (!dmg) Sfx.splash(); else if (fromMe) Sfx.boom(); else Sfx.hurt();
      dmgEl.className = `f-dmg pop ${fromMe ? "to-d" : "to-a"} ${dmg ? "" : "miss"}`; dmgEl.hidden = false; dmgEl.textContent = dmg ? `-${dmg}` : "빗나감"; if (!fx) dmgEl.style.left = fromMe ? "74%" : "26%"; hp(a, d); await sleep(dmg ? 720 : 560); dmgEl.hidden = true; },
    async end(won) { if (fx) await fx.finish(won, false); else { if (won != null) m.querySelector(won ? ".f-ship.d" : ".f-ship.a").classList.add("sunk"); await sleep(500); } } }; }
// one question, one try, and the server's time limit for this round. Resolves with the choice (-1 when time runs out), or null when the round ended without an answer: the friend left, or the server's time ran out.
const duelQuiz = (panel, id, v, name) => new Promise(done => { const span = Math.min(v.limit, Math.max(0, v.left - 300)), began = Date.now();
  panel.innerHTML = `<div class="duel-q"><p class="duel-head"><b>${v.round}라운드</b><span data-opp>${esc(name)}도 푸는 중</span><b class="num" data-sec>${Math.ceil(span / 1000)}</b></p><div class="duel-time"><i></i></div><p class="duel-ask">${esc(v.q.ask)}</p><div class="duel-expr num">${MathQ.html(esc(v.q.text))}</div><div class="duel-opts">${v.q.opts.map((o, i) => `<button type="button" class="btn duel-opt num" data-pick="${i}">${MathQ.html(esc(o))}</button>`).join("")}</div></div>`; Sfx.lock();
  const bar = panel.querySelector(".duel-time i"), sec = panel.querySelector("[data-sec]"), who = panel.querySelector("[data-opp]"); let live = true, last = 0;
  const end = x => { if (!live) return; live = false; clearInterval(clock); clearInterval(watch); done(x); };
  panel.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => end(Number(b.dataset.pick)));
  const clock = setInterval(() => { const left = span - (Date.now() - began), s = Math.ceil(left / 1000); bar.style.width = Math.max(0, left / v.limit) * 100 + "%"; bar.classList.toggle("low", left < 4000); if (s !== last) { sec.textContent = Math.max(0, s); if (s > 0 && s <= 3) Sfx.tick(); last = s; } if (left <= 0) end(-1); }, 150);
  const watch = setInterval(async () => { let n; try { n = await api(`/api/kid/duel/${id}`); } catch (e) { return; } if (!live) return; if (n.status !== "live" || n.round !== v.round) return end(null); if (n.oppDone) who.textContent = `${name}이(가) 답을 냈어요!`; }, 1300); });
async function playDuel(id) { if (K.duelOn) return; K.duelOn = true; K.busy = true; let st = null;
  try { const first = await api(`/api/kid/duel/${id}`), opp = K.d.mates.find(x => x.id === first.oppId); if (!opp) throw new Error("친구를 찾을 수 없어요"); const mine = first.mine;
    st = await duelStage({ ...K.d.me }, opp); const hpOf = h => [h[mine], h[mine === "a" ? "b" : "a"]]; st.hp(...hpOf(first.hp)); st.panel.innerHTML = `<p class="duel-msg">곧 시작해요!</p>`;
    let sure = false, giveUp = false; st.m.querySelector("[data-giveup]").onclick = async e => { if (!sure) { sure = true; e.target.textContent = "정말 기권할까요?"; setTimeout(() => { sure = false; if (e.target.isConnected) e.target.textContent = "기권"; }, 3000); return; } giveUp = true; e.target.disabled = true; try { await api(`/api/kid/duel/${id}/quit`, {}); } catch (err) {} };
    await st.intro(); let played = first.log.length, aimed = 0, fails = 0, v, wrong = false; const miss = [];
    for (;;) { try { v = await api(`/api/kid/duel/${id}`); fails = 0; } catch (e) { if (++fails > 15) { toast("연결이 끊겼어요"); v = null; break; } await sleep(1000); continue; }
      if (played < v.log.length) { const say = text => st.panel.innerHTML = `<p class="duel-msg">${text}</p>`, answer = v.prev ? `<span class="num duel-answer">${MathQ.html(esc(v.prev.text))} = ${MathQ.html(esc(v.prev.real))}</span>` : "";
        if (wrong && v.prev) miss.push({ tag: "대결 문제", lines: [v.prev.text], answer: v.prev.real }); wrong = false; say(answer);
        for (; played < v.log.length; played++) for (const s of v.log[played]) { const fromMe = s.by === mine, [a, d] = hpOf(s.hp); if (s.first) say(`${answer}<br>${fromMe ? "내가" : `${esc(opp.nickname)}이(가)`} 먼저 맞혔어요!`); if (s.dmg) await st.shot(fromMe, s.dmg, a, d); else await st.noShot(fromMe); } continue; }
      if (v.status !== "live") break;
      if (!v.iAimed && v.round > aimed && !giveUp) { aimed = v.round; const pick = await duelQuiz(st.panel, id, v, opp.nickname); wrong = true; if (pick === null) continue; st.panel.innerHTML = `<p class="duel-msg">답을 보내는 중…</p>`; let res = null; try { res = await api(`/api/kid/duel/${id}/aim`, { round: v.round, pick }); } catch (e) {} if (res?.right) { wrong = false; Sfx.match(); } else Sfx.wrong();
        st.panel.innerHTML = `<p class="duel-msg">${res?.right ? "맞혔어요! 공격 준비 완료." : pick < 0 ? "시간이 다 됐어요. 이번에는 공격하지 못해요." : "틀렸어요. 이번에는 공격하지 못해요."} ${esc(opp.nickname)}을(를) 기다려요…</p>`; continue; }
      await sleep(700); }
    if (v) { st.m.querySelector("[data-giveup]").hidden = true; st.panel.innerHTML = ""; const won = v.winner ? v.winner === K.d.me.id : null; st.hp(...hpOf(v.hp)); await st.end(won); if (won != null) Sfx[won ? "win" : "lose"](); await kidLoad();
      st.panel.innerHTML = `<div class="f-result ${won ? "win" : won === false ? "lose" : ""}"><h2>${won ? "승리!" : won === false ? "패배" : "무승부"}</h2>${v.forfeit ? `<p>${won ? "친구가 대결을 나갔어요" : "대결을 나왔어요"}</p>` : ""}<p class="small">친선 대결이라 금화는 오가지 않아요 · 오늘 남은 대결 ${K.d.battle.duelLeft}번</p>${missHTML(miss)}<button class="btn primary lg" data-close>확인</button></div>`;
      await new Promise(res => { const b = st.panel.querySelector("[data-close]"); b.focus(); b.onclick = res; }); }
  } catch (e) { toast(e.message); }
  st?.close(); K.duelOn = false; K.busy = false; try { await kidLoad(); kidRender(); } catch (e) {} kidNotices(); }
const KID_ACTS = {
  kduel: v => duelChallenge(Number(v)),
  ksnd: () => { Sfx.toggle(); document.querySelectorAll(".snd").forEach(el => el.outerHTML = sndBtn()); },
  kmate: v => { K.mate = K.mate === Number(v) ? null : Number(v); kidRender(); if (K.mate) scrollTo({ top: 0, behavior: "smooth" }); },
  klike: v => { Sfx.coin(); return kDo(() => api(`/api/kid/like/${v}`, {})); },
  ktitle: v => kDo(() => api("/api/kid/title", { id: v }), v ? "칭호를 달았어요!" : "칭호를 뗐어요"),
  khow: v => (MathQ.setLevel(K.d.level), Games.intro)(v, K.map, K.d.maps[K.map].isles[v], K.d.games[v].stars, false),
  ktab: v => { K.tab = v; K.mate = null; K.confirm = null; K.tryKey = null; K.tryShip = null; K.crop = null; K.photoDraft = null; kidRender(); tabIntoView(); scrollTo(0, 0); },
  kisle: v => { K.confirm = null; if (!v) { K.isle = null; return kidRender(); } K.isle = v; const el = $("#wship"); if (el) el.style.cssText += ";" + shipAt(v); K.at = v; const slot = $("#isleSlot"); if (!slot) return kidRender(); slot.innerHTML = kIsle(); document.querySelectorAll(".isle").forEach(g => g.classList.toggle("on", g.dataset.v === v));
    const game = ISLES[v]?.game || (v === "port" ? "port" : null); setTimeout(() => { if (K.isle === v) $("#islePanel")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, el ? 400 : 0); setTimeout(() => { if (K.isle === v && game) gameArt(game); }, 1100); },
  kplay: playGame, kpractice: practice, kfight: playFight,
  ksea: v => { const m = K.d.maps[Number(v)]; if (!seaOpen(m)) return toast(`${m.name}는 전투력 ${m.power}부터 열려요. 지금은 ${K.d.me.power}이에요`); K.map = m.id; K.isle = null; K.at = "port"; K.confirm = null; kidRender(); },
  kpassAsk: () => { K.confirm = "pass"; kidRender(); }, kno: () => { K.confirm = null; kidRender(); },
  kpass: () => { K.confirm = null; return kDo(() => api("/api/kid/pass", {}), "숙제 면제권을 샀어요! 선생님이 챙겨 줄 거예요"); },
  kgoShips: () => { K.tab = "shop"; K.slot = "ship"; kidRender(); scrollTo(0, 0); },
  krequest: v => kDo(() => api("/api/kid/request", { questId: Number(v) }), "선생님께 확인을 요청했어요"),
  kcancel: v => kDo(() => api(`/api/kid/cancel/${v}`, {})),
  kslot: v => { K.slot = v; K.tryKey = null; K.tryShip = null; K.confirm = null; K.crop = null; K.photoDraft = null; kidRender(); },
  kboxAsk: v => { K.confirm = { box: Number(v) }; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kboxOpen: openBox,
  kupAsk: v => { K.confirm = { up: v }; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kupBuy: v => { K.confirm = null; return kDo(() => api("/api/kid/upgrade", { id: v }), "배를 강화했어요! 전투력이 올랐어요"); },
  kcropNo: () => { K.crop = null; K.photoDraft = null; kidRender(); },
  // the canvas re-encodes the picture, which also drops the location and other data a phone stores inside photos
  kcropOk: () => { const cv = $("#cropCv"); if (!cv) return; let data = ""; for (const q of [.8, .65, .5, .35]) { data = cv.toDataURL("image/jpeg", q); if (data.length < 190000) break; } K.photoDraft = data; K.crop = null; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kphotoSend: async () => { const data = K.photoDraft; K.photoDraft = null; await kDo(() => api("/api/kid/photo", { data }), "선생님께 신청했어요. 확인하면 배에 달려요"); },
  kphotoCancel: () => kDo(() => api("/api/kid/photo/cancel", {}), "신청을 취소하고 금화를 돌려받았어요"),
  kphotoOff: () => { if (!K.photoOffArm) { K.photoOffArm = Date.now(); setTimeout(() => { K.photoOffArm = 0; }, 5000); return toast("한 번 더 누르면 사진을 내려요. 금화는 돌아오지 않아요"); } if (Date.now() - K.photoOffArm < 500) return; K.photoOffArm = 0; return kDo(() => api("/api/kid/photo/remove", {}), "사진을 내렸어요"); },
  ktry: v => { K.tryKey = v && K.tryKey !== v ? v : null; kidRender(); },
  ktryShip: v => { K.tryShip = K.tryShip === v ? null : v; kidRender(); },
  kdecoAsk: v => { K.confirm = { key: v }; K.tryKey = v; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kdecoBuy: v => { K.confirm = null; K.tryKey = null; Sfx.coin(); return kDo(() => api("/api/kid/deco/buy", { key: v }), "새 꾸미기를 달았어요! 장비에서 바꿀 수 있어요"); },
  kshipAsk: v => { K.confirm = { ship: v }; K.tryShip = v; kidRender(); scrollTo({ top: 0, behavior: "smooth" }); },
  kshipBuy: v => { K.confirm = null; K.tryShip = null; Sfx.coin(); return kDo(() => api("/api/kid/ship/buy", { id: v }), "새 배로 갈아탔어요! 장비에서 다른 배로 바꿀 수 있어요"); },
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
const T = { d: null, tab: "grant", cls: "all", selQ: null, selS: new Set(), selR: new Set(), created: null, editQ: null, detail: null, rep: null, repDays: 7, repKid: null, repMiss: null, repLevel: null, drafts: {}, log: null, logDay: null };
const TTABS = [["grant", "미션 지급"], ["photo", "사진 승인"], ["crew", "반·선원"], ["quests", "미션 관리"], ["give", "건네줄 것"], ["report", "오답 리포트"], ["battle", "전투·설정"], ["log", "기록"]];
async function tLoad() { T.d = await api("/api/t/state"); }
async function tLogFetch() { T.log = await api(`/api/t/logs/${T.logDay ? T.logDay.replace(/-/g, "") : 0}`); }
async function tLogLoad() { try { await tLogFetch(); } catch (e) { toast(e.message); } if (T.tab === "log") tRender(); }
async function teacherStart() { await tLoad(); tRender(); setInterval(async () => { if (document.hidden) return; const a = document.activeElement; if (a && a.matches("input,select,textarea")) return; try { await tLoad(); if (T.tab === "log" && !T.logDay) await tLogFetch(); tRender(); } catch (e) {} }, 15000); }
// two classes can have a child of the same name; only then does the name carry its class
const sname = id => { const s = T.d.students.find(x => x.id === id); if (!s) return "삭제된 학생"; return T.d.students.some(x => x.id !== id && x.nickname === s.nickname) ? `${s.nickname}(${cname(s.class_id)})` : s.nickname; };
const cname = id => T.d.classes.find(c => c.id === id)?.name || "";
const tList = () => T.d.students.filter(s => T.cls === "all" || s.class_id === T.cls);
const tChips = () => T.d.classes.length < 2 ? "" : `<div class="chips">${[["all", "전체"], ...T.d.classes.map(c => [c.id, c.name])].map(([v, n]) => `<button class="chip" data-act="tcls" data-v="${v}" aria-pressed="${T.cls === v}">${esc(n)}</button>`).join("")}</div>`;
// what the teacher has typed but not saved: it lives through the 15-second refresh and any other button, until T.fresh says the form should start over
const editedInputs = root => [...root.querySelectorAll("[data-keep=no][id]")].filter(el => el.value !== (el.tagName === "SELECT" ? ([...el.options].find(o => o.defaultSelected) || el.options[0])?.value : el.defaultValue)).map(el => [el.id, el.value]);
function tRender() {
  const d = T.d, keep = keepInputs(app), edited = T.fresh ? [] : editedInputs(app), moved = T.tab !== T.shownTab, wide = moved ? [] : [...app.querySelectorAll(".tablewrap")].map(w => w.scrollLeft), strip = $(".tabs")?.scrollLeft || 0;
  if (moved && T.shownTab) T.drafts[T.shownTab] = [...keep, ...edited]; if (T.fresh) T.drafts[T.tab] = null; const back = moved ? T.drafts[T.tab] || [] : []; T.fresh = false; T.shownTab = T.tab;
  app.innerHTML = `<header class="top"><div class="hwrap"><div class="brand"><img src="${LOGO}" alt=""><div style="min-width:0"><h1>하이포스 매쓰아일랜드</h1><small>선생님 · ${esc(d.teacher)}</small></div></div><div class="hright"><button class="btn ghost sm" data-act="logout">로그아웃</button></div></div>
    <nav class="tabs" aria-label="화면">${TTABS.map(([k, l]) => `<button data-act="ttab" data-v="${k}" aria-current="${T.tab === k}">${l}${k === "grant" && d.requests.length ? `<span class="cnt">${d.requests.length}</span>` : ""}${k === "give" && d.orders.length ? `<span class="cnt">${d.orders.length}</span>` : ""}${k === "photo" && d.photos.length ? `<span class="cnt">${d.photos.length}</span>` : ""}</button>`).join("")}</nav></header>
    <main>${({ grant: tGrant, photo: tPhoto, crew: tCrew, quests: tQuests, give: tGive, report: tReport, battle: tBattle, log: tLog })[T.tab]()}</main>`;
  restoreInputs(keep); restoreInputs(edited); restoreInputs(back); app.querySelectorAll(".tablewrap").forEach((w, i) => { w.scrollLeft = wide[i] || 0; }); const bar = $(".tabs"); if (bar) bar.scrollLeft = strip;
}
function tabIntoView() { const bar = $(".tabs"), on = bar?.querySelector("[aria-current=true]"); if (!on) return; const b = bar.getBoundingClientRect(), r = on.getBoundingClientRect(); bar.scrollLeft += r.left - b.left - (b.width - r.width) / 2; }
function tGrant() {
  const d = T.d, rs = d.requests, q = d.quests.find(x => x.id === T.selQ);
  return `<section class="panel"><h2>아이들이 "다 했어요" 누른 미션</h2>
    ${rs.length ? `<div class="plist">${rs.map(r => `<label class="prow"><span><input type="checkbox" data-act="tselr" data-v="${r.id}" ${T.selR.has(r.id) ? "checked" : ""}> <b>${esc(sname(r.student_id))}</b> · ${esc(r.title)} <span class="small muted">행동력 +${r.energy}</span>${(d.students.find(s => s.id === r.student_id)?.bal.energy ?? 0) >= d.game.energyMax ? ` <span class="pill wait">행동력 가득</span>` : ""}</span><span class="small muted">${fmtTime(r.created_at)}</span><span></span></label>`).join("")}</div>
      <div class="row"><button class="btn sm" data-act="tselrAll">모두 선택</button><button class="btn primary" data-act="tapprove" ${T.selR.size ? "" : "disabled"}>${T.selR.size}개 승인</button>${armBtn(rejectKey(), "treject", "", "반려", "btn danger", T.selR.size ? "" : "disabled")}</div>` : `<p class="muted small">새 요청이 없어요.</p>`}</section>
    <section class="panel"><div class="row between"><h2>직접 지급</h2>${tChips()}</div>
      <div class="chips">${d.quests.filter(x => x.active).map(x => `<button class="chip" data-act="tpickq" data-v="${x.id}" aria-pressed="${x.id === T.selQ}">${esc(x.title)} +${x.energy}</button>`).join("") || `<span class="muted small">미션 관리에서 미션을 만들어 주세요.</span>`}</div>
      <div class="chips">${tList().map(s => `<button class="chip" data-act="tpicks" data-v="${s.id}" aria-pressed="${T.selS.has(s.id)}">${esc(sname(s.id))} · 행동력 ${s.bal.energy}</button>`).join("")}</div>
      <div class="row"><button class="btn sm" data-act="tselAll">모두 선택</button><button class="btn primary" data-act="tgrant" ${q && T.selS.size ? "" : "disabled"}>${T.selS.size}명에게 지급</button></div></section>`;
}
function tPhoto() {
  const d = T.d, onShips = d.students.filter(s => s.photo), who = id => { const s = d.students.find(x => x.id === id); return `<b>${esc(sname(id))}</b> <span class="small muted">${esc(cname(s?.class_id))}</span>`; };
  return `<section class="panel"><h2>확인을 기다리는 사진</h2><p class="small muted">승인하면 같은 반 친구들에게 보여요. 반려하면 사진은 지워지고 금화 150개는 아이에게 돌아가요.</p>
    ${d.photos.length ? `<div class="photo-grid">${d.photos.map(p => `<div class="photo-card"><img src="/api/photo/${p.id}" alt="신청한 사진"><div>${who(p.student_id)}</div><span class="small muted">${fmtTime(p.created_at)}</span><div class="row"><button class="btn sm primary" data-act="tphotoOk" data-v="${p.id}">승인</button>${armBtn(`photoNo${p.id}`, "tphotoNo", p.id, "반려", "btn sm danger")}</div></div>`).join("")}</div>` : `<p class="muted small">새 신청이 없어요.</p>`}</section>
    <section class="panel"><h2>지금 배에 달린 사진</h2><p class="small muted">내리면 사진이 지워져요. 금화는 돌아가지 않아요.</p>
    ${onShips.length ? `<div class="photo-grid">${onShips.map(s => `<div class="photo-card"><img src="/api/photo/${s.photo}" alt="달려 있는 사진"><div>${who(s.id)}</div><div class="row">${armBtn(`photo${s.photo}`, "tphotoOff", s.photo, "내리기")}</div></div>`).join("")}</div>` : `<p class="muted small">달려 있는 사진이 없어요.</p>`}</section>`;
}
function tCrew() {
  const d = T.d, base = location.origin, s = d.students.find(x => x.id === T.detail);
  return `${T.created ? `<div class="notice"><b>임시 비밀번호 · 지금 한 번만 보여요</b><div class="plist">${T.created.map(c => `<div class="prow"><span>${esc(c.nickname)}</span><b class="code">${esc(c.pin)}</b><span></span></div>`).join("")}</div><div><button class="btn sm" data-act="tcloseCreated">다 적었어요</button></div></div>` : ""}
    <section class="panel"><h2>반</h2>${d.classes.length ? `<div class="tablewrap"><table class="class-table"><thead><tr><th>반</th><th>문제 난이도</th><th>수업 요일</th><th>매일 미션 추가</th><th>학생</th><th>전투</th><th>반 코드</th><th>접속 주소</th><th></th></tr></thead><tbody>${d.classes.map(c => `<tr><td><b>${esc(c.name)}</b></td>
      <td><div class="day-pick level-pick" role="group" aria-label="${esc(c.name)} 문제 난이도">${[[0, "초등"], [1, "중등"]].map(([n, l]) => `<button data-act="tlevel" data-v="${c.id}|${n}" aria-pressed="${(c.level || 0) === n}">${l}</button>`).join("")}</div></td>
      <td><div class="day-pick" role="group" aria-label="${esc(c.name)} 수업 요일">${DAY_ORDER.map(([n, l]) => `<button data-act="tdayFlip" data-v="${c.id}|${n}" aria-pressed="${(c.days ?? "").includes(n)}">${l}</button>`).join("")}</div><div class="day-set">${[["135", "월수금"], ["24", "화목"], ["0123456", "매일"]].map(([v, l]) => `<button class="btn sm ghost" data-act="tdaySet" data-v="${c.id}|${v}">${l}</button>`).join("")}</div></td>
      <td><div class="bonus-step" role="group" aria-label="${esc(c.name)} 매일 미션 추가 행동력"><button class="btn sm" data-act="tbonus" data-v="${c.id}|-1" aria-label="1 줄이기" ${c.daily_bonus > 0 ? "" : "disabled"}>-</button><b class="num">+${c.daily_bonus}</b><button class="btn sm" data-act="tbonus" data-v="${c.id}|1" aria-label="1 늘리기" ${c.daily_bonus < 10 ? "" : "disabled"}>+</button></div></td>
      <td class="num">${d.students.filter(x => x.class_id === c.id).length}명</td><td><button class="btn sm ${c.battle ? "primary" : ""}" data-act="tbattleOn" data-v="${c.id}">${c.battle ? "켜짐" : "꺼짐"}</button></td><td><span class="code">${esc(c.code)}</span></td><td class="small muted">${esc(base)}/?c=${esc(c.code)}</td><td>${armBtn(`class${c.id}`, "tdelClass", c.id, "삭제")}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${d.classes.length ? `<p class="small muted">아이들은 수업 요일에만 미션을 신청할 수 있어요. 선생님의 승인과 직접 지급은 요일과 상관없어요. 추가 행동력은 그 반의 매일 미션 하나마다 더 주며, 승인과 직접 지급에 모두 붙어요.</p>` : ""}
      <form class="row" data-form="addClass"><label class="f">새 반 이름<input type="text" id="nc-name" maxlength="20" required></label><label class="f">문제 난이도<select id="nc-level"><option value="0">초등</option><option value="1">중등</option></select></label><button class="btn primary" style="align-self:end">반 만들기</button>${d.classes.length ? "" : `<button type="button" class="btn" style="align-self:end" data-act="tdemo">시연용 예시 반 만들기</button>`}</form></section>
    ${d.classes.length ? `<section class="panel"><h2>선원 등록</h2><form class="stack" style="gap:10px" data-form="addStudents"><label class="f">반<select id="ns-class">${d.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label><label class="f">닉네임 (여러 명이면 줄을 바꿔서)<textarea id="ns-names" rows="3"></textarea></label><div><button class="btn primary">등록하고 임시 비밀번호 만들기</button></div></form></section>` : ""}
    <section class="panel"><div class="row between"><h2>선원 현황</h2>${tChips()}</div>${tList().length ? `<div class="tablewrap"><table class="crew-table"><thead><tr><th>이름</th><th>반</th><th>배</th><th>전투력</th><th>행동력</th><th>포인트</th><th>금화</th></tr></thead><tbody>${tList().map(x => `<tr class="click" data-act="tdetail" data-v="${x.id}" aria-selected="${x.id === T.detail}"><td style="--sail:${sail(x.sail)}"><b><i class="dot"></i> ${esc(x.nickname)}</b>${x.locked ? ` <span class="pill wait">잠김</span>` : ""}</td><td class="muted">${esc(cname(x.class_id))}</td><td class="small">${esc(d.ships.find(z => z.id === x.ship)?.name)}</td><td class="num">${x.power}</td><td class="num">${x.bal.energy}</td><td class="num">${x.bal.points}</td><td class="num">${x.bal.gold}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">아직 선원이 없어요.</p>`}</section>
    ${s ? `<section class="panel" id="kidDetail"><div class="row between"><h2>${esc(s.nickname)}</h2><button class="btn sm ghost" data-act="tdetail" data-v="${s.id}">닫기</button></div>
      <form class="row" data-form="adjust"><label class="f">종류<select id="adj-type" data-keep="no"><option value="energy">행동력</option><option value="points">포인트</option><option value="gold">금화</option></select></label><label class="f">양<input type="number" id="adj-amt" placeholder="+5 / -5" required data-keep="no"></label><label class="f" style="flex:1 1 150px">사유<input type="text" id="adj-why" maxlength="40" data-keep="no"></label><button class="btn" style="align-self:end">반영</button></form>
      ${s.locked ? `<p class="small">비밀번호를 여러 번 틀려서 잠겼어요. 10분 뒤에 풀려요. 바로 풀려면 비밀번호를 새로 발급해요.</p>` : ""}<div class="row"><button class="btn" data-act="tresetPin" data-v="${s.id}">비밀번호 새로 발급</button>${armBtn(`student${s.id}`, "tdelStudent", s.id, "선원 삭제")}</div></section>` : ""}`;
}
function tQuests() {
  const d = T.d, e = d.quests.find(q => q.id === T.editQ);
  return `<section class="panel"><h2>${e ? "미션 수정" : "새 미션"}</h2><form class="row" data-form="saveQuest"><label class="f" style="flex:1 1 220px">내용<input type="text" id="q-title" maxlength="40" required value="${esc(e?.title || "")}" data-keep="no"></label>
      <label class="f">과목<select id="q-subj" data-keep="no">${SUBJECTS.map(s => `<option ${e?.subject === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label class="f">주기<select id="q-kind" data-keep="no">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${e?.kind === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="f">행동력<input type="number" id="q-en" min="0" max="50" value="${e?.energy ?? 1}" data-keep="no" required></label><button class="btn primary" style="align-self:end">${e ? "저장" : "추가"}</button>${e ? `<button type="button" class="btn ghost" style="align-self:end" data-act="teditQ">취소</button>` : ""}</form></section>
    <section class="panel"><h2>미션 목록</h2>${d.quests.length ? `<div class="tablewrap"><table><thead><tr><th>미션</th><th>과목</th><th>주기</th><th>행동력</th><th></th></tr></thead><tbody>${d.quests.map(q => `<tr><td>${esc(q.title)}</td><td>${esc(q.subject)}</td><td>${KINDS[q.kind]}</td><td class="num">+${q.energy}</td><td class="row"><button class="btn sm ${q.active ? "primary" : ""}" data-act="ttoggleQ" data-v="${q.id}">${q.active ? "보임" : "숨김"}</button><button class="btn sm ghost" data-act="teditQ" data-v="${q.id}">수정</button>${armBtn(`quest${q.id}`, "tdelQ", q.id, "삭제")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">첫 미션을 만들어 주세요.</p>`}</section>`;
}
function tGive() {
  const d = T.d;
  return `<section class="panel"><h2>건네줄 것</h2><p class="small muted">아이들이 포인트로 산 숙제 면제권이에요. 실제로 적용한 뒤 '줬어요'를 눌러요.</p>${d.orders.length ? `<div class="plist">${d.orders.map(o => `<div class="prow"><span><b>${esc(sname(o.student_id))}</b> · ${esc(o.name)} <span class="small muted">${fmtTime(o.created_at)}</span></span>${armBtn(`order${o.id}`, "tcancelOrder", o.id, "취소(환불)")}<button class="btn sm primary" data-act="tdeliver" data-v="${o.id}">줬어요</button></div>`).join("")}</div>` : `<p class="muted small">지금 건네줄 것이 없어요.</p>`}</section>`;
}
// the wrong-answer report: which kinds of question a class misses most, then each child. The bars and the counts beside them say the same thing, so a kind asked only once or twice doesn't look alarming.
const rateOf = x => x.tries ? Math.round(x.wrong / x.tries * 100) : 0;
const rateBar = x => `<span class="rate"><i class="rate-bar"><i style="width:${rateOf(x)}%"></i></i><b class="num">${rateOf(x)}%</b></span>`;
async function tReportLoad() { try { T.rep = await api(`/api/t/report/${T.repDays}`); } catch (e) { toast(e.message); } if (T.tab === "report") tRender(); }
function tReport() {
  const levelOf = s => T.d.classes.find(c => c.id === s.class_id)?.level || 0, shown = tList(), shownIds = new Set(shown.map(s => s.id)), all = (T.rep?.rows || []).filter(r => shownIds.has(r.id));
  const levels = [...new Set([...all.map(r => r.level), ...shown.map(levelOf)])].sort(), lv = levels.includes(T.repLevel) ? T.repLevel : T.cls === "all" ? levels[0] ?? 0 : T.d.classes.find(c => c.id === T.cls)?.level || 0;
  const rows = all.filter(r => r.level === lv), list = shown.filter(s => levelOf(s) === lv || rows.some(r => r.id === s.id)), tags = {}, kids = {};
  for (const r of rows) {
    const t = tags[r.tag] || (tags[r.tag] = { tag: r.tag, tries: 0, wrong: 0, who: 0 }), k = kids[r.id] || (kids[r.id] = { id: r.id, tries: 0, wrong: 0, tags: [] });
    t.tries += r.tries; t.wrong += r.wrong; if (r.wrong) t.who++; k.tries += r.tries; k.wrong += r.wrong; k.tags.push(r); }
  const worst = (a, b) => b.wrong - a.wrong || rateOf(b) - rateOf(a), tagRows = Object.values(tags).sort(worst), kidRows = Object.values(kids).sort(worst), idle = list.filter(s => !kids[s.id]), open = kids[T.repKid];
  const weakText = k => k.tags.filter(t => t.wrong).sort(worst).slice(0, 3).map(t => `${esc(t.tag)} <span class="num">${t.wrong}/${t.tries}</span>`).join(" · ") || "틀린 문제 없음";
  const head = `<div class="row between"><h2>오답 리포트</h2><div class="chips">${[[7, "최근 7일"], [30, "최근 30일"]].map(([n, l]) => `<button class="chip" data-act="trepDays" data-v="${n}" aria-pressed="${T.repDays === n}">${l}</button>`).join("")}</div></div>${tChips()}${levels.length > 1 ? `<div class="chips">${[[0, "초등"], [1, "중등"]].map(([n, l]) => `<button class="chip" data-act="trepLevel" data-v="${n}" aria-pressed="${lv === n}">${l}</button>`).join("")}</div>` : ""}<p class="small muted">미니게임과 연습에서 푼 문제를 함께 세요. 초등과 중등은 따로 봐요. 범선의 바다 보물 동굴(짝 맞추기)과 친구 대결은 빠져 있어요.</p>`;
  if (!T.rep) return `<section class="panel">${head}<p class="muted small">불러오는 중…</p></section>`;
  if (!tagRows.length) return `<section class="panel">${head}<p class="muted small">이 기간에 쌓인 기록이 없어요. 아이들이 미니게임을 하면 여기에 쌓여요.</p></section>`;
  return `<section class="panel">${head}<h3>많이 틀린 유형</h3><div class="tablewrap"><table class="rep-table"><thead><tr><th>유형</th><th>틀린 비율</th><th>틀림 / 푼 문제</th><th>틀린 학생</th></tr></thead><tbody>${tagRows.map(t => `<tr><td><b>${esc(t.tag)}</b></td><td>${rateBar(t)}</td><td class="num">${t.wrong} / ${t.tries}</td><td class="num">${t.who}명</td></tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><h2>학생별</h2><p class="small muted">이름을 누르면 최근에 틀린 문제를 볼 수 있어요. 틀린 수가 많은 학생부터 보여요.</p><div class="tablewrap"><table class="rep-table"><thead><tr><th>이름</th><th>틀린 비율</th><th>틀림 / 푼 문제</th><th>많이 틀린 유형</th></tr></thead><tbody>${kidRows.map(k => `<tr class="click" data-act="trepKid" data-v="${k.id}" aria-selected="${k.id === T.repKid}"><td><b>${esc(sname(k.id))}</b></td><td>${rateBar(k)}</td><td class="num">${k.wrong} / ${k.tries}</td><td class="small">${weakText(k)}</td></tr>`).join("")}</tbody></table></div>
      ${idle.length ? `<p class="small muted">이 기간에 문제를 풀지 않은 학생: ${idle.map(s => esc(sname(s.id))).join(", ")}</p>` : ""}</section>
    ${open ? `<section class="panel"><div class="row between"><h2>${esc(sname(open.id))}의 최근 틀린 문제</h2><button class="btn sm ghost" data-act="trepKid" data-v="${open.id}">닫기</button></div>${T.repMiss === null ? `<p class="muted small">불러오는 중…</p>` : T.repMiss.some(m => m.level === lv) ? `<ol class="rep-miss">${T.repMiss.filter(m => m.level === lv).map(m => `<li><small>${esc(m.tag)} · ${fmtTime(m.at)}</small><div class="miss-q num">${m.lines.map(l => `<div>${MathQ.html(esc(l))}</div>`).join("")}</div><p class="miss-a">정답 <b class="num">${MathQ.html(esc(m.answer))}</b></p>${m.how ? `<p class="miss-how num">${MathQ.html(esc(m.how))}</p>` : ""}</li>`).join("")}</ol>` : `<p class="muted small">저장된 틀린 문제가 없어요.</p>`}</section>` : ""}`;
}
function tBattle() {
  const d = T.d, g = d.game, n = (id, label, v, max = 100000) => `<label class="f">${label}<input type="number" id="${id}" min="0" max="${max}" value="${v}" data-keep="no"></label>`;
  const bossRow = b => `<div class="t-boss"><div class="row between"><span><b>${esc(cname(b.classId))}</b> · ${esc(b.name)}</span>${b.down ? `<span class="pill ok">격파</span>` : `${armBtn(`fire${b.classId}`, "tbossfire", b.classId, `선생님 포격 -${d.teacherDmg}`, "btn sm")}`}</div><div class="boss-hp"><i style="width:${b.left / b.hp * 100}%"></i><b class="num">${b.left} / ${b.hp}</b></div><p class="small muted">공격한 학생 ${b.hits.length}명 / ${d.students.filter(s => s.class_id === b.classId).length}명${b.hits.length ? ` · ${b.hits.slice(0, 8).map(h => `${esc(sname(h.id))} ${h.dmg}`).join(", ")}` : ""}</p></div>`;
  return `<section class="panel"><h2>이번 주 반 보스</h2><p class="small muted">승인한 미션 1개당 10, 미니게임 별 1개당 2씩 체력이 줄어요. 격파하면 공격한 학생은 보상 금화 전부, 공격하지 않은 학생은 30%를 받고, 마지막 일격을 넣은 학생은 50개를 더 받아요. 일요일까지 못 잡으면 보상 없이 다음 보스로 바뀌어요.</p>${d.bosses.length ? d.bosses.map(bossRow).join("") : `<p class="muted small">진행 중인 보스가 없어요.</p>`}</section>
    <section class="panel"><h2>게임 설정</h2><form class="row" data-form="saveGame">${n("g-max", "행동력 최대", g.energyMax, 200)}${n("g-cost", "한 판 행동력", g.playCost, 20)}${n("g-pass", "면제권 포인트", g.passCost)}${n("g-bat", "하루 전투 횟수", g.battlesPerDay, 20)}${n("g-win", "승리 금화", g.win)}${n("g-lose", "패배 시 잃는 금화", g.lose)}${n("g-def", "방어 성공 금화", g.defend)}${n("g-from", "전투 시작 시각", g.hourFrom, 24)}${n("g-to", "전투 끝 시각", g.hourTo, 24)}${n("g-bosshp", "보스 체력(학생 1명당)", g.bossHp, 1000)}${n("g-bossgold", "보스 보상 금화", g.bossGold)}<button class="btn primary" style="align-self:end">저장</button></form>
      <p class="small muted">시작과 끝 시각이 같으면 언제든 전투할 수 있어요. 반별로 끄려면 '반·선원'에서 눌러요. 저장하면 바로 적용돼요. 보스 체력과 보상은 다음 주 보스부터 적용되고, 체력을 0으로 하면 보스가 바로 꺼져요.</p></section>
    <section class="panel"><h2>오늘 전투</h2>${d.battles.length ? `<div class="plist">${d.battles.map(b => `<div class="prow"><span>${esc(b.a_name)} → ${esc(b.d_name)} <span class="small muted">${fmtTime(b.at)}</span></span><span class="pill ${b.winner === b.attacker ? "ok" : ""}">${b.winner === b.attacker ? "공격 승" : "방어 승"}</span><span class="small num">${b.delta > 0 ? "+" : ""}${b.delta}금화</span></div>`).join("")}</div>` : `<p class="muted small">오늘 전투가 아직 없어요.</p>`}</section>
    <section class="panel"><h3>내 비밀번호 바꾸기</h3><form class="row" data-form="tpw"><input type="password" id="tpw" autocomplete="new-password" placeholder="4자 이상" data-keep="no"><button class="btn">바꾸기</button></form></section>`;
}
function tLog() {
  const L = T.log, ids = new Set(tList().map(s => s.id)), logs = !L ? [] : T.cls === "all" ? L.logs : L.logs.filter(l => ids.has(l.student_id)), clock = ms => { const t = new Date(ms); return `${pad(t.getHours())}:${pad(t.getMinutes())}`; };
  const nav = L ? `<div class="row"><button class="btn sm" data-act="tlogDay" data-v="-1">이전 날</button><input type="date" id="log-day" value="${L.date}" max="${L.today}" data-keep="no" aria-label="기록 날짜" onchange="T_ACTS.tlogPick(this.value)"><button class="btn sm" data-act="tlogDay" data-v="1" ${L.date >= L.today ? "disabled" : ""}>다음 날</button>${L.date < L.today ? `<button class="btn sm ghost" data-act="tlogDay" data-v="0">오늘로</button>` : ""}</div>` : "";
  if (!L) return `<section class="panel feed"><h2>기록</h2><p class="muted small">불러오는 중…</p></section>`;
  return `<section class="panel feed"><div class="row between"><h2>${L.date === L.today ? "오늘 기록" : `${Number(L.date.slice(5, 7))}월 ${Number(L.date.slice(8))}일 기록`}</h2><span class="small muted num">${logs.length}건</span></div>${tChips()}${nav}${L.more ? `<p class="small muted">이 날은 기록이 많아 최근 1,000건만 보여요.</p>` : ""}${logs.length ? `<ul>${logs.map(l => `<li><time class="num">${clock(l.at)}</time><span><b>${esc(sname(l.student_id))}</b> · ${esc(l.title)} <span class="small">${l.energy ? `행동력 ${l.energy} ` : ""}${l.points ? `포인트 ${l.points} ` : ""}${l.gold ? `금화 ${l.gold}` : ""}</span></span>${armBtn(`undo${l.id}`, "tundo", l.id, "취소")}</li>`).join("")}</ul>` : `<p class="muted small">이 날 기록이 없어요.</p>`}</section>`;
}
const ARM_MS = 5000, ARM_GAP = 500, armed = (key, msg) => { if (T.arm === key) { if (Date.now() - T.armAt < ARM_GAP) return false; clearTimeout(T.armH); T.arm = null; return true; } clearTimeout(T.armH); T.arm = key; T.armAt = Date.now(); T.armH = setTimeout(() => { T.arm = null; const a = document.activeElement; if (!(a && a.matches("input,select,textarea"))) tRender(); }, ARM_MS); toast(msg); tRender(); return false; };
const armBtn = (key, act, v, plain, cls = "btn sm ghost", attrs = "") => `<button class="${cls}${T.arm === key ? " armed" : ""}" data-act="${act}" data-v="${v}" ${attrs}>${T.arm === key ? plain + " 확인" : plain}</button>`;
const rejectKey = () => `reject${[...T.selR].join()}`; // choosing other requests asks again
function tDo(fn, msg) { return oneAtATime(async () => { try { const r = await fn(); if (msg) toast(msg); await tLoad(); tRender(); return r; } catch (e) { toast(e.message); } }); }
const shortText = r => r.short ? ` · ${r.short}명은 행동력이 가득 차서 다 받지 못했어요` : "";
const T_ACTS = {
  tbossfire: v => armed(`fire${v}`, "한 번 더 누르면 보스를 포격해요") && tDo(() => api(`/api/t/classes/${v}/bossfire`, {}), "포격했어요! 아이들 화면에서 체력이 줄어요"),
  tphotoOk: v => tDo(() => api(`/api/t/photos/${v}/approve`, {}), "승인했어요. 아이의 배에 달렸어요"),
  tphotoNo: v => armed(`photoNo${v}`, "한 번 더 누르면 사진을 지우고 금화를 돌려줘요") && tDo(() => api(`/api/t/photos/${v}/reject`, {}), "반려했어요. 사진을 지우고 금화를 돌려줬어요"),
  tphotoOff: v => { if (!armed(`photo${v}`, "한 번 더 누르면 사진을 내리고 지워요")) return; return tDo(() => api(`/api/t/photos/${v}/remove`, {}), "사진을 내렸어요"); },
  ttab: v => { T.tab = v; tRender(); tabIntoView(); scrollTo(0, 0); if (v === "report") tReportLoad(); if (v === "log") { T.log = null; tRender(); tabIntoView(); tLogLoad(); } },
  tlogDay: v => { const base = T.log?.date, today = T.log?.today; if (!base) return; const next = v === "0" ? today : new Date(Date.parse(`${base}T00:00:00Z`) + Number(v) * 864e5).toISOString().slice(0, 10); T.logDay = next >= today ? null : next; T.log = null; T.fresh = true; tRender(); return tLogLoad(); },
  tlogPick: v => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !T.log) return; T.logDay = v >= T.log.today ? null : v; T.log = null; T.fresh = true; tRender(); return tLogLoad(); },
  trepLevel: v => { T.repLevel = Number(v); T.repKid = null; T.repMiss = null; tRender(); },
  trepDays: v => { T.repDays = Number(v); T.rep = null; tRender(); return tReportLoad(); },
  trepKid: async v => { const id = Number(v); if (T.repKid === id) { T.repKid = null; return tRender(); } T.repKid = id; T.repMiss = null; tRender(); try { const r = await api(`/api/t/report/student/${id}`); if (T.repKid === id) { T.repMiss = r.misses; tRender(); } } catch (e) { toast(e.message); } },
  tcls: v => { T.cls = v === "all" ? "all" : Number(v); T.repLevel = null; const shown = new Set(tList().map(s => s.id)); T.selS = new Set([...T.selS].filter(i => shown.has(i))); tRender(); },
  tselr: v => { const i = Number(v); T.selR.has(i) ? T.selR.delete(i) : T.selR.add(i); tRender(); }, tselrAll: () => { T.d.requests.forEach(r => T.selR.add(r.id)); tRender(); },
  tapprove: async () => { const r = await tDo(async () => { const x = await api("/api/t/requests/approve", { ids: [...T.selR] }); T.selR.clear(); return x; }); if (r) toast(`${r.given}개 승인했어요${r.skipped.length ? ` · ${r.skipped.length}개는 이미 받은 미션이에요` : ""}${shortText(r)}`); },
  treject: () => { if (!armed(rejectKey(), `한 번 더 누르면 ${T.selR.size}개를 반려해요`)) return; return tDo(async () => { const x = await api("/api/t/requests/reject", { ids: [...T.selR] }); T.selR.clear(); return x; }, "반려했어요"); },
  tpickq: v => { T.selQ = T.selQ === Number(v) ? null : Number(v); tRender(); }, tpicks: v => { const i = Number(v); T.selS.has(i) ? T.selS.delete(i) : T.selS.add(i); tRender(); }, tselAll: () => { tList().forEach(s => T.selS.add(s.id)); tRender(); },
  tgrant: async () => { const r = await tDo(async () => { const x = await api("/api/t/grant", { questId: T.selQ, studentIds: [...T.selS] }); T.selS.clear(); return x; }); if (r) toast(`${r.given}명에게 지급했어요${r.skipped.length ? ` · ${r.skipped.length}명은 이미 받았어요` : ""}${shortText(r)}`); },
  tcloseCreated: () => { T.created = null; tRender(); }, tdetail: v => { T.detail = T.detail === Number(v) ? null : Number(v); T.fresh = true; tRender(); (T.detail ? $("#kidDetail") : $(`tr[data-act="tdetail"][data-v="${v}"]`))?.scrollIntoView({ behavior: "smooth", block: T.detail ? "start" : "center" }); },
  tdayFlip: v => { const [id, n] = v.split("|"), c = T.d.classes.find(x => x.id === Number(id)), days = c.days.includes(n) ? c.days.replace(n, "") : c.days + n; if (!days) return toast("수업 요일을 하루 이상 골라 주세요"); return tDo(() => api(`/api/t/classes/${id}/days`, { days }), `${c.name}: 수업 요일은 ${dayText([...days].sort().join(""))}이에요`); },
  tlevel: v => { const [id, n] = v.split("|"), c = T.d.classes.find(x => x.id === Number(id)), level = Number(n); if ((c.level || 0) === level) return; return tDo(() => api(`/api/t/classes/${id}/level`, { level }), `${c.name}: 미니게임과 대결 문제가 ${level ? "중등" : "초등"} 난이도로 나와요`); },
  tbonus: v => { const [id, step] = v.split("|"), c = T.d.classes.find(x => x.id === Number(id)), bonus = c.daily_bonus + Number(step); return tDo(() => api(`/api/t/classes/${id}/bonus`, { bonus }), `${c.name}: 매일 미션 행동력 +${bonus} 추가`); },
  tdaySet: v => { const [id, days] = v.split("|"), c = T.d.classes.find(x => x.id === Number(id)); return tDo(() => api(`/api/t/classes/${id}/days`, { days }), `${c.name}: 수업 요일은 ${dayText(days)}이에요`); },
  tbattleOn: v => { const c = T.d.classes.find(x => x.id === Number(v)); return tDo(() => api(`/api/t/classes/${v}/battle`, { on: !c.battle }), `${c.name}: 전투 ${c.battle ? "껐어요" : "켰어요"}`); },
  tdelClass: v => { const c = T.d.classes.find(x => x.id === Number(v)); if (!armed(`class${v}`, `${c.name}의 삭제 버튼을 한 번 더 누르면 반과 학생이 모두 삭제돼요`)) return; return tDo(() => api(`/api/t/classes/${v}/delete`, {}), "반을 삭제했어요"); },
  tdemo: async () => { const r = await tDo(() => api("/api/t/demo", {})); if (r) toast(`시연반 코드 ${r.code} · 비밀번호 모두 ${r.pin}`); },
  tresetPin: async v => { const r = await tDo(() => api(`/api/t/students/${v}/reset-pin`, {})); if (r) { T.created = [{ nickname: sname(Number(v)), pin: r.pin }]; tRender(); scrollTo(0, 0); } },
  tdelStudent: v => { if (!armed(`student${v}`, "한 번 더 누르면 선원이 삭제돼요")) return; T.detail = null; return tDo(() => api(`/api/t/students/${v}/delete`, {}), "선원을 삭제했어요"); },
  teditQ: v => { T.editQ = v ? Number(v) : null; T.fresh = true; tRender(); scrollTo(0, 0); }, ttoggleQ: v => tDo(() => api(`/api/t/quests/${v}/toggle`, {})), tdelQ: v => armed(`quest${v}`, "한 번 더 누르면 미션이 삭제돼요") && tDo(() => api(`/api/t/quests/${v}/delete`, {}), "미션을 삭제했어요"),
  tdeliver: v => tDo(() => api(`/api/t/orders/${v}/deliver`, {}), "줬어요로 표시했어요"), tcancelOrder: v => armed(`order${v}`, "한 번 더 누르면 취소하고 포인트를 돌려줘요") && tDo(() => api(`/api/t/orders/${v}/cancel`, {}), "취소하고 포인트를 돌려줬어요"), tundo: v => armed(`undo${v}`, "한 번 더 누르면 이 기록을 취소해요") && tDo(async () => { const r = await api(`/api/t/logs/${v}/undo`, {}); await tLogFetch(); return r; }, "기록을 취소했어요")
};
const saved = fn => async () => { const r = await fn(); T.fresh = true; return r; };
const T_FORMS = {
  addClass: async () => { const r = await tDo(() => api("/api/t/classes", { name: val("nc-name"), level: Number(val("nc-level")) })); if (r) { toast(`반 코드 ${r.code}`); const el = $("#nc-name"); if (el) el.value = ""; } },
  addStudents: async () => { const r = await tDo(() => api("/api/t/students", { classId: Number(val("ns-class")), names: $("#ns-names").value })); if (r) { T.created = r.created; $("#ns-names").value = ""; tRender(); scrollTo(0, 0); } },
  adjust: () => tDo(saved(() => api("/api/t/adjust", { studentId: T.detail, type: val("adj-type"), amount: Number(val("adj-amt")), title: val("adj-why") || "선생님 조정" })), "반영했어요"),
  saveQuest: () => tDo(saved(async () => { const r = await api("/api/t/quests", { id: T.editQ, title: val("q-title"), subject: val("q-subj"), kind: val("q-kind"), energy: Number(val("q-en")) }); T.editQ = null; return r; }), "미션을 저장했어요"),
  saveGame: () => tDo(saved(() => api("/api/t/game", { energyMax: val("g-max"), playCost: val("g-cost"), passCost: val("g-pass"), battlesPerDay: val("g-bat"), win: val("g-win"), lose: val("g-lose"), defend: val("g-def"), hourFrom: val("g-from"), hourTo: val("g-to"), bossHp: val("g-bosshp"), bossGold: val("g-bossgold") })), "저장했어요"),
  tpw: () => tDo(saved(() => api("/api/t/password", { password: $("#tpw").value })), "비밀번호를 바꿨어요")
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
