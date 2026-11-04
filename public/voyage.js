/* 하이포스 트레저헌터 — voyage chart, ships and treasure-chest effects (shared by teacher and student screens) */
(() => {
const ROUTE_D = "M 80 525 C 280 580, 560 470, 860 515 C 990 535, 995 375, 840 360 C 620 335, 420 415, 190 352 C 40 312, 55 190, 225 175 C 440 155, 650 238, 905 118";
// free sail and flag colours: the first ten are the original ones (stored by index), then six pastels
const SAILS = ["#E0573F", "#F2B134", "#2E9C8F", "#7A5CC7", "#3D8BD9", "#D9467A", "#5E9E3E", "#C9702D", "#1F6F8B", "#9B4FB0",
  "#F7A8C4", "#C9B6F2", "#FFD3A8", "#A8E6CF", "#A8D8F7", "#FFF1A8"];
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

/* ---------- ship decorations (names and prices come from the server) ---------- */
// shared gradients and patterns, defined once so every boat can point at them
const decoDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
decoDefs.setAttribute("width", "0"); decoDefs.setAttribute("height", "0"); decoDefs.setAttribute("aria-hidden", "true"); decoDefs.style.position = "absolute";
decoDefs.innerHTML = `<defs>
  <linearGradient id="dk-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0A8"/><stop offset=".45" stop-color="#E9B53A"/><stop offset="1" stop-color="#A9771A"/></linearGradient>
  <linearGradient id="dk-rainbow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0564A"/><stop offset=".2" stop-color="#F59B3A"/><stop offset=".4" stop-color="#F4D03F"/><stop offset=".6" stop-color="#5DBB63"/><stop offset=".8" stop-color="#3D8BD9"/><stop offset="1" stop-color="#8E5CC7"/></linearGradient>
  <linearGradient id="dk-flame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4D03F"/><stop offset=".5" stop-color="#F28A2E"/><stop offset="1" stop-color="#D9402F"/></linearGradient>
  <pattern id="dk-stripe" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.8" fill="#fff" opacity=".6"/></pattern>
  <pattern id="dk-dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".95" fill="#fff" opacity=".8"/></pattern>
  <pattern id="dk-check" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#fff" opacity=".45"/><rect x="2" y="2" width="2" height="2" fill="#fff" opacity=".45"/></pattern>
  <pattern id="dk-hearts" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M2.5 4 C.6 2.8 .9 1 2 1 C2.3 1 2.5 1.4 2.5 1.4 C2.5 1.4 2.7 1 3 1 C4.1 1 4.4 2.8 2.5 4 Z" fill="#fff" opacity=".8"/></pattern>
  <pattern id="dk-flowers" width="5" height="5" patternUnits="userSpaceOnUse"><g fill="#fff" opacity=".85"><circle cx="2.5" cy="1.6" r=".7"/><circle cx="3.4" cy="2.5" r=".7"/><circle cx="2.5" cy="3.4" r=".7"/><circle cx="1.6" cy="2.5" r=".7"/></g><circle cx="2.5" cy="2.5" r=".45" fill="#F4D03F"/></pattern>
  <pattern id="dk-starry" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M1.5 .6 L1.8 1.3 L2.5 1.5 L1.8 1.7 L1.5 2.4 L1.2 1.7 L.5 1.5 L1.2 1.3 Z M4.5 3.6 L4.7 4.2 L5.3 4.4 L4.7 4.6 L4.5 5.2 L4.3 4.6 L3.7 4.4 L4.3 4.2 Z" fill="#FFF6C8"/></pattern></defs>`;
document.body.appendChild(decoDefs);
const starPath = (cx, cy, R, r) => "M" + Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; return `${(cx + k * Math.cos(a)).toFixed(2)} ${(cy + k * Math.sin(a)).toFixed(2)}`; }).join(" L") + " Z";
const circ = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const petals = (n, dist, r) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return circ(+(50 + dist * Math.cos(a)).toFixed(2), +(50 + dist * Math.sin(a)).toFixed(2), r); }).join(" ");
/* Emblems (문양) for sails and flags, in a 100×100 box. d is filled with the emblem colour; cut, when given,
   is painted on top in the cloth colour (eyes, holes). Shared with the 3D ship, which draws the same paths on canvas. */
const EMBLEMS = {
  star: { d: starPath(50, 54, 46, 19) },
  heart: { d: "M50 88 C22 68 6 50 14 30 C21 13 42 12 50 30 C58 12 79 13 86 30 C94 50 78 68 50 88 Z" },
  flower: { d: petals(5, 25, 18) + " " + circ(50, 50, 14), cut: circ(50, 50, 7) },
  ribbon: { d: "M50 47 C38 28 12 24 12 44 C12 62 36 60 50 52 Z M50 47 C62 28 88 24 88 44 C88 62 64 60 50 52 Z M45 54 L32 88 L42 84 L50 60 Z M55 54 L68 88 L58 84 L50 60 Z " + circ(50, 50, 9),
    cut: "M22 44 C22 36 34 38 42 46 C34 50 22 52 22 44 Z M78 44 C78 36 66 38 58 46 C66 50 78 52 78 44 Z" },
  butterfly: { d: "M50 50 C42 24 12 12 10 34 C9 48 30 54 50 53 Z M50 50 C58 24 88 12 90 34 C91 48 70 54 50 53 Z M50 55 C34 56 16 66 24 82 C32 92 46 76 50 57 Z M50 55 C66 56 84 66 76 82 C68 92 54 76 50 57 Z M47 30 C47 26 53 26 53 30 L53 78 C53 82 47 82 47 78 Z M48 30 L40 14 L42.5 13 L50 28 Z M52 30 L60 14 L57.5 13 L50 28 Z",
    cut: circ(28, 36, 6) + " " + circ(72, 36, 6) },
  cat: { d: "M16 44 L20 12 L38 26 Q50 22 62 26 L80 12 L84 44 Q88 84 50 86 Q12 84 16 44 Z",
    cut: circ(37, 52, 6) + " " + circ(63, 52, 6) + " M45 63 L55 63 L50 69 Z M24 64 L38 65.5 L38 67.5 L24 67 Z M24 71 L38 69.5 L38 71.5 L24 74 Z M76 64 L62 65.5 L62 67.5 L76 67 Z M76 71 L62 69.5 L62 71.5 L76 74 Z" },
  rabbit: { d: circ(50, 64, 24) + " M36 46 C26 8 44 2 46 42 Z M64 46 C74 8 56 2 54 42 Z",
    cut: circ(42, 60, 4) + " " + circ(58, 60, 4) + " M46 70 L54 70 L50 75 Z M38 38 C33 16 42 14 43 38 Z M62 38 C67 16 58 14 57 38 Z" },
  moon: { d: circ(46, 52, 38), cut: circ(66, 40, 32) },
  note: { d: "M58 14 L64 14 L64 68 C64 84 36 86 34 72 C32 58 52 54 58 60 Z M64 14 C78 20 86 30 82 46 C80 36 72 30 64 30 Z" },
  clover: { d: circ(36, 36, 15) + " " + circ(64, 36, 15) + " " + circ(36, 62, 15) + " " + circ(64, 62, 15) + " M48 60 L52 60 L60 92 L55 92 Z" },
  anchor: { d: "M46 22 H54 V80 H46 Z M30 32 H70 V39 H30 Z M14 56 L22 52 Q26 76 50 80 Q74 76 78 52 L86 56 Q82 88 50 90 Q18 88 14 56 Z " + circ(50, 16, 9), cut: circ(50, 16, 4.5) },
  compass: { d: circ(50, 50, 42) + " " + circ(50, 50, 36) + " M50 10 L57 50 L50 90 L43 50 Z M10 50 L50 43 L90 50 L50 57 Z", rule: "evenodd" },
  crown: { d: "M14 70 L10 28 L32 48 L50 18 L68 48 L90 28 L86 70 Z M14 75 H86 V86 H14 Z", cut: circ(50, 58, 5) + " " + circ(30, 60, 4) + " " + circ(70, 60, 4) },
  flame: { d: "M50 92 C22 90 18 60 36 44 C36 56 44 60 47 54 C42 38 54 24 52 8 C72 22 84 46 80 64 C78 82 66 92 50 92 Z", cut: "M50 86 C40 84 38 72 45 63 C47 71 53 71 56 66 C62 74 60 85 50 86 Z" },
  skull: { d: "M50 12 C72 12 82 28 80 44 C79 54 72 58 68 60 L68 70 L32 70 L32 60 C28 58 21 54 20 44 C18 28 28 12 50 12 Z M12 78 L18 72 L88 92 L84 98 Z M88 78 L82 72 L12 92 L16 98 Z",
    cut: circ(39, 40, 8) + " " + circ(61, 40, 8) + " M50 48 L45 57 L55 57 Z M40 62 H43 V70 H40 Z M48.5 62 H51.5 V70 H48.5 Z M57 62 H60 V70 H57 Z" },
  shell: { d: "M50 86 L12 46 C18 16 82 16 88 46 Z M42 86 H58 V92 H42 Z", cut: "M50 80 L28 34 L31 33 Z M50 80 L41 27 L44 27 Z M50 80 L56 27 L59 27 Z M50 80 L69 33 L72 34 Z" },
  cherry: { d: circ(34, 70, 15) + " " + circ(66, 66, 15) + " M33 56 Q38 30 58 16 L61 19 Q42 32 37 56 Z M64 52 Q63 32 58 18 L61 17 Q67 32 68 52 Z M58 17 C66 6 84 8 86 17 C78 24 66 25 58 17 Z" }
};
const lum = hex => { const n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
// the emblem colour that reads on a given cloth colour
const inkFor = hex => lum(hex) > .58 ? "#3A2A28" : "#FFFFFF";
function embSVG(id, cx, cy, size, ink, bg) {
  const e = EMBLEMS[id]; if (!e) return "";
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})"><path d="${e.d}" fill="${ink}" ${e.rule ? `fill-rule="${e.rule}"` : ""}/>${e.cut ? `<path d="${e.cut}" fill="${bg}"/>` : ""}</g>`;
}
// a small side-on galleon (bow to the right) that matches the 3D ship in ship3d.js; same ids as DECO in worker.js
const HULLS = { red: "#8E2A22", navy: "#1F3A63", mint: "#2F8C78", pink: "#D97A9A", lavender: "#9A84C9", sky: "#6FA8D6", lemon: "#E8C85A", ebony: "#2A221D", white: "#E8DFC9", gold: "url(#dk-gold)" };
const TRIMS = { silver: "#C9D3DC", rosegold: "#E2A48C", pearl: "#F4EFE6" };
const SAIL_FILL = { rainbow: ["url(#dk-rainbow)", "#F4D03F"], gold: ["url(#dk-gold)", "#E9B53A"] };
const SAIL_OVERLAY = { stripe: "url(#dk-stripe)", dots: "url(#dk-dots)", check: "url(#dk-check)", hearts: "url(#dk-hearts)", flowers: "url(#dk-flowers)", starry: "url(#dk-starry)" };
// a square sail with its free edge bellied toward the bow
const sq = (cx, top, w, h) => `M${cx - w / 2} ${top} L${cx + w / 2} ${top} Q${cx + w / 2 + 1.4} ${top + h / 2} ${cx + w / 2} ${top + h} L${cx - w / 2} ${top + h} Q${cx - w / 2 + 1.4} ${top + h / 2} ${cx - w / 2} ${top} Z`;
const SAIL_SHAPES = [sq(31, 15.5, 12, 10), sq(31, 6, 10, 8.5), sq(41, 17.5, 10, 9), sq(41, 9.5, 8.5, 7), sq(21, 19, 8.5, 8), sq(21, 12, 7.5, 6)];
const BUNT = ["#F7A8C4", "#FFD3A8", "#FFF1A8", "#A8E6CF", "#A8D8F7", "#C9B6F2"];
const HEAD = {
  dragon: `<path d="M53.2 30.5 Q58.6 27.4 57.4 22.6 Q60.6 23.4 59.6 26.8 Q58.6 30.2 54.4 32.2 Z" fill="url(#dk-gold)" stroke="#9C6A22" stroke-width=".4"/><circle cx="58.5" cy="24.3" r=".45" fill="#D9402F"/>`,
  swan: `<path d="M53 31 Q59 30 57.5 24.5 Q56.8 21 59.4 21.4 Q61.2 21.9 59.8 23.2 Q58.6 24.2 59.2 27 Q59.8 31 54 32.8 Z" fill="#FFFFFF" stroke="#C9C2B8" stroke-width=".35"/><path d="M60.6 21.9 L62 22.4 L60.4 22.8 Z" fill="#F28A2E"/><circle cx="59.6" cy="22" r=".3" fill="#222"/>`
};
const ATT = {
  cannon: [22, 28, 34, 40].map((x, i) => `<circle cx="${x}" cy="${36.1 - i * .2}" r="1" fill="#1E2126" stroke="#F1C04B" stroke-width=".3"/>`).join(""),
  nest: `<rect x="29.2" y="13.6" width="3.6" height="1.7" rx=".4" fill="#5A3A22"/><path d="M29.2 13.7 H32.8" stroke="#F1C04B" stroke-width=".4"/>`,
  lantern: `<path d="M5.2 26 V23.4" stroke="#23262B" stroke-width=".5"/><circle cx="5.2" cy="22.6" r="1.25" fill="#FFD27A" stroke="#FFB347" stroke-width=".4"/>`,
  parrot: `<ellipse cx="37.2" cy="14" rx=".9" ry="1.35" fill="#D9402F"/><circle cx="37.5" cy="12.6" r=".7" fill="#D9402F"/><path d="M38.1 12.6 L39 12.9 L38.1 13.1 Z" fill="#F4C430"/>`,
  treasure: `<ellipse cx="26" cy="31.3" rx="2.4" ry="1.1" fill="url(#dk-gold)"/><rect x="24.6" y="29.1" width="2.8" height="1.8" rx=".3" fill="#8A5328" stroke="#F1C04B" stroke-width=".3"/>`,
  anchor: `<path d="M50.5 33.2 V37.6 M48.9 36.4 Q50.5 38.6 52.1 36.4 M49.6 34 H51.4" stroke="#23262B" stroke-width=".7" fill="none" stroke-linecap="round"/>`,
  flowers: [19, 23.5, 28, 32.5, 37, 41.5, 46].map((x, i) => `<circle cx="${x}" cy="${30.6 - i * .08}" r=".95" fill="${["#F7A8C4", "#FFFFFF", "#FFE27A"][i % 3]}"/>`).join(""),
  bunting: `<path d="M21 10 Q26 9 31 3 Q36 8 41 7 Q50 13 58.4 21.9" stroke="#6B5A4A" stroke-width=".3" fill="none"/>` + [[24, 8.6], [28, 6.2], [34, 6.2], [38, 7], [45, 10.4], [50, 14], [54.5, 17.8]].map(([x, y], i) => `<path d="M${x - .9} ${y} L${x + .9} ${y} L${x} ${y + 1.8} Z" fill="${BUNT[i % 6]}"/>`).join(""),
  balloons: `<path d="M6 26 Q5 20 3.6 15 M6 26 Q7.4 19 8.8 13.6" stroke="#8A8A8A" stroke-width=".25" fill="none"/>` + [[3.6, 13.8, "#F28AB0"], [8.8, 12.4, "#C9B6F2"]].map(([x, y, c]) => `<path d="M${x} ${y + 1.6} C${x - 2.1} ${y + .2} ${x - 1.8} ${y - 1.6} ${x - .8} ${y - 1.6} C${x - .3} ${y - 1.6} ${x} ${y - 1.1} ${x} ${y - 1.1} C${x} ${y - 1.1} ${x + .3} ${y - 1.6} ${x + .8} ${y - 1.6} C${x + 1.8} ${y - 1.6} ${x + 2.1} ${y + .2} ${x} ${y + 1.6} Z" fill="${c}"/>`).join(""),
  bowribbon: `<path d="M4.6 30 C2.6 28.4 1.4 30.8 3.2 31.6 Z M4.6 30 C6.6 28.4 7.8 30.8 6 31.6 Z M4.2 30.6 L3.4 33.6 L4.2 33.2 Z M5 30.6 L5.8 33.6 L5 33.2 Z" fill="#F28AB0"/><circle cx="4.6" cy="30.3" r=".6" fill="#E0608F"/>`,
  cat: `<ellipse cx="45.4" cy="29.4" rx="1.5" ry="1.1" fill="#F2A65A"/><circle cx="46.6" cy="28.1" r=".85" fill="#F2A65A"/><path d="M46 27.6 L46.2 26.7 L46.6 27.4 Z M46.8 27.4 L47.3 26.7 L47.4 27.7 Z" fill="#F2A65A"/><path d="M44 29.4 Q43 28.2 43.6 27.4" stroke="#F2A65A" stroke-width=".45" fill="none"/>`,
  fairylights: `<path d="M31 2 Q46 12 58.4 21.9" stroke="#6B5A4A" stroke-width=".25" fill="none"/>` + [[34, 4.6], [37.5, 7], [41, 9.6], [44.5, 12.2], [48, 14.6], [51.5, 17], [55, 19.4]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r=".6" fill="${["#FFE27A", "#F7A8C4", "#A8D8F7", "#A8E6CF"][i % 4]}"/>`).join("")
};
// look: {hull, trim, pattern, se, fe, fc, head, att:[...]} (see parseLook in worker.js); missing parts draw the plain wooden ship
function boatSVG(look = {}, sailIdx = 0) {
  const sailHex = sail(sailIdx), hull = HULLS[look.hull] || "#7A4A28", trim = TRIMS[look.trim] || "#F1C04B";
  const [fill, clothBg] = SAIL_FILL[look.pattern] || [sailHex, sailHex], overlay = SAIL_OVERLAY[look.pattern];
  const flagHex = look.fc != null ? sail(look.fc) : sailHex, att = new Set(look.att || []);
  return `<svg viewBox="0 0 60 48" aria-hidden="true"><g class="hull">
  <path d="M51 30.5 L59 21.5" stroke="#4E321E" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M21 31 V10 M31 31 V1 M41 31 V7" stroke="#4E321E" stroke-width="1.3"/>
  <path d="M58.4 21.9 L41.8 8 L43.2 27 Z" fill="${fill}" opacity=".85"/>
  ${SAIL_SHAPES.map(d => `<path d="${d}" fill="${fill}"/>${overlay ? `<path d="${d}" fill="${overlay}"/>` : ""}`).join("")}
  <path d="M25 15.5 H37 M26 6 H36 M36 17.5 H46 M36.7 9.5 H45.3 M16.7 19 H25.3 M17.2 12 H24.8" stroke="#4E321E" stroke-width=".7"/>
  ${embSVG(look.se, 31.6, 20.6, 8.6, inkFor(clothBg), clothBg)}
  <path d="M31 .4 H38.6 V5.4 H31 Z" fill="${flagHex}"/>${embSVG(look.fe, 34.8, 2.9, 4.4, inkFor(flagHex), flagHex)}
  ${att.has("bunting") ? ATT.bunting : ""}${att.has("fairylights") ? ATT.fairylights : ""}${att.has("nest") ? ATT.nest : ""}${att.has("parrot") ? ATT.parrot : ""}${att.has("treasure") ? ATT.treasure : ""}${att.has("cat") ? ATT.cat : ""}${att.has("flowers") ? ATT.flowers : ""}${att.has("balloons") ? ATT.balloons : ""}
  <path d="M3 25.5 L15.5 26.5 L17.5 31.5 L49 30.6 L57 26.2 L53 38.6 Q33 44.6 12 41.6 L5 34.6 Z" fill="${hull}" ${["white", "lemon"].includes(look.hull) ? `stroke="#B9A47A" stroke-width=".6"` : ""}/>
  <path d="M4.4 28 L15.6 28.8 M6.2 34.6 L50.4 33.6 L55.2 30.4 M8 38 L51.4 37" stroke="${trim}" stroke-width="1.05" fill="none"/>
  <path d="M6 29.6 H8 M9.3 29.8 H11.3 M12.6 30 H14.4" stroke="#FFD27A" stroke-width="1.6"/>
  ${att.has("cannon") ? ATT.cannon : ""}${HEAD[look.head] || ""}${att.has("lantern") ? ATT.lantern : ""}${att.has("anchor") ? ATT.anchor : ""}${att.has("bowribbon") ? ATT.bowribbon : ""}</g></svg>`;
}
const BOAT = boatSVG();
// extra classes on the .ship wrapper for the wake effect and on the name tag
const wakeClass = look => look && look.wake ? `wk-${look.wake}` : "";
const tagClass = look => look && look.tag ? `tg-${look.tag}` : "";

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
    return `<div class="ship ${dx < 0 ? "flip" : ""} ${i === L ? "arrived" : ""} ${s.id === opts.me ? "mine" : ""} ${opts.me && s.id !== opts.me ? "other" : ""} ${wakeClass(s.look)}" data-id="${s.id}" style="--sail:${sail(s.sail)};left:${f.left}%;top:${f.top}%"
      title="${esc(s.nickname)} · ${voyageOf(s.moves, L)}번째 항해 · ${i === L ? "도착 항구" : i + "칸"}">${boatSVG(s.look, s.sail)}<span class="nmtag ${tagClass(s.look)}">${s.id === opts.me ? "나 · " : ""}${esc(s.nickname)}</span></div>`; }).join("");
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

// Taps needed to open a chest, picked at random per rarity. The count is never shown to the child.
const TAPS = { 보통: [1, 3], 희귀: [3, 5], 전설: [5, 7] };
const tapsFor = r => { const [lo, hi] = TAPS[r] || TAPS["보통"]; return lo + Math.floor(Math.random() * (hi - lo + 1)); };

// opener(): Promise<{name, rarity, points}> — called on the first tap, so the rarity decides how many taps follow;
// from: map point or null (centre)
async function chestFx(fx, from, who, stop, opener, { autoMs = 6000 } = {}) {
  if (!fx || FX.skip) return null;
  const pp = from ? pct(from) : { left: 50, top: 110 }, dim = fx.querySelector(".fx-dim"), flash = fx.querySelector(".fx-flash");
  const el = document.createElement("div");
  el.className = "mchest";
  el.innerHTML = `<div class="rays"></div><div class="beam"></div>
    <div class="chest3d"><div class="c-shadow"></div><div class="c-lid">${C_LID}</div><div class="c-body">${C_BODY}</div><div class="c-glow"></div></div>
    <div class="gcard"><div class="gcard-in"><div class="gface gback">?</div><div class="gface gfront"></div></div></div>
    <div class="tapmsg"><span>상자를 눌러요!</span></div>`;
  fx.appendChild(el);
  const c3 = el.querySelector(".chest3d"), lid = el.querySelector(".c-lid"), glow = el.querySelector(".c-glow"), rays = el.querySelector(".rays"), beam = el.querySelector(".beam"),
    card = el.querySelector(".gcard"), cin = el.querySelector(".gcard-in"), front = el.querySelector(".gfront"), msg = el.querySelector(".tapmsg");
  const seam = () => { const r = c3.getBoundingClientRect(), m = fx.getBoundingClientRect(); return [(r.left + r.width / 2 - m.left) / m.width * 100, (r.top + r.height * .44 - m.top) / m.height * 100]; };
  msg.style.opacity = 0;
  await play(el, [{ left: pp.left + "%", top: pp.top + "%", transform: "translate(-50%,-50%) scale(.22) rotate(-12deg)", opacity: .5 },
    { left: "50%", top: "63%", transform: "translate(-50%,-50%) scale(1.08) rotate(3deg)", opacity: 1, offset: .75 }, { left: "50%", top: "63%", transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 }],
    { duration: 700, easing: "cubic-bezier(.3,.8,.35,1)" });
  const [lx, ly] = seam(); burstAt(lx, ly + 9, 18, "spark");
  play(msg, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  const idle = FX.skip ? null : c3.animate([{ transform: "scale(1)" }, { transform: "scale(1.035,.97)" }], { duration: 520, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
  let rewardP = null, need = Infinity;
  for (let i = 0; i < need && !FX.skip; i++) {
    await waitTap([el], autoMs);
    if (FX.skip) break;
    if (i === 0) rewardP = opener().catch(e => ({ error: e.message || "상자를 열지 못했어요" }));
    // s grows 0 → 2 over the taps, so the last tap always bounces and glows the hardest
    const s = need === Infinity || need < 2 ? 0 : 2 * i / (need - 1);
    await play(c3, [{ transform: "none" }, { transform: "scale(1.16,.8)", offset: .18 }, { transform: `translateY(-${10 + s * 5}%) scale(.9,1.14) rotate(${i % 2 ? 5 : -5}deg)`, offset: .5 }, { transform: "scale(1.1,.88)", offset: .82 }, { transform: "none" }], { duration: 420, easing: "ease-out", fill: "none" });
    play(glow, [{ opacity: .25 * s }, { opacity: .3 + .3 * s }], { duration: 200 });
    burstAt(...seam(), 14 + s * 16, "spark");
    play(flash, [{ opacity: .12 + s * .08 }, { opacity: 0 }], { duration: 260, fill: "none" });
    if (i === 0) { const rw = await rewardP; need = rw.error ? 1 : tapsFor(rw.rarity); }
  }
  idle?.cancel();
  play(msg, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
  if (FX.skip || !rewardP) { el.remove(); return null; }
  const rw = await rewardP;
  if (rw.error) { msg.querySelector("span").textContent = rw.error; play(msg, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); await waitTap([el, dim], 3500); el.remove(); return null; }
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
    msg.querySelector("span").textContent = "눌러서 계속";
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

window.Voyage = { SAILS, sail, esc, dpos, voyageOf, isChest, stopPts, pct, mapHTML, placeShips, runVoyage, stageChests, skip, BOAT, boatSVG, wakeClass, tagClass, EMBLEMS, inkFor, embSVG, get running() { return !!FX.running; } };
})();
