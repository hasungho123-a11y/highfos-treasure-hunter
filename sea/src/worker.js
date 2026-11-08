// 하이포스 매쓰아일랜드 · Cloudflare Worker (API) — static files are served from ./public
import { duelQuestion } from "./duelq.js";
// Homework gives energy. Energy buys mini-game plays, which pay points and now and then an item.
// Battles pay gold. Gold buys decorations and bigger ships. Points only buy the monthly homework pass (or turn into gold).
const SESSION_DAYS = { teacher: 14, student: 60 };
const PBKDF2_ITER = 60000, MAX_FAILED = 5, LOCK_MS = 10 * 60 * 1000;
const SAILS = 16; // free sail/flag colours, see SAILS in public/voyage.js
const SUBJECTS = ["영어", "수학", "공통"], KINDS = ["daily", "weekly", "challenge"];
const DEFAULT_GAME = { energyMax: 20, playCost: 1, passCost: 200, battlesPerDay: 3, win: 30, lose: 10, defend: 10, startGold: 100, hourFrom: 0, hourTo: 0, bossHp: 60, bossGold: 100, feedbackOn: 1 }; // bossHp is per student; 0 switches the boss off
// the class boss, in the order they arrive. look uses the same names as a kid's ship; sail is a plain colour, darker than any a kid can pick.
const BOSSES = [
  { name: "검은 돛 해적선", ship: "galleon", look: { hull: "ebony", se: "skull", fe: "skull" }, sail: "#23262B" },
  { name: "붉은 철갑 해적선", ship: "ironclad", look: { hull: "red", smoke: "white" }, sail: "#8E2A22" },
  { name: "유령 구축함", ship: "destroyer", look: { camo: "stealth", smoke: "white" }, sail: "#3A4148" },
  { name: "해적왕의 항공모함", ship: "carrier", look: { camo: "splinter", att: ["fighter", "heli"] }, sail: "#8E2A22" }
];
const BATTLE_AIM_MAX = 12; // good aiming before a battle adds this many % at most to the win chance
const BOSS_QUEST_DMG = 10, BOSS_STAR_DMG = 2, BOSS_TEACHER_DMG = 20, BOSS_IDLE_SHARE = .3, BOSS_LAST_HIT_GOLD = 50; // a kid who took no part gets 30% of the reward

// mini-games: the score needed for 1, 2 and 3 stars, the highest believable score, and the shortest believable play
const GAMES = {
  cannon: { name: "포격 섬", stars: [2, 3, 4], max: 10, minMs: 4000 },
  reef: { name: "암초 해협", stars: [6, 15, 24], max: 400, minMs: 3000 },
  memory: { name: "보물 동굴", stars: [6, 14, 18], max: 24, minMs: 4000 },
  port: { name: "포구 마을", stars: [4, 8, 11], max: 20, minMs: 4000 } // keyed "port" so each sea's port name already serves as the game's title
};
const STAR_POINTS = [10, 20, 40, 60], STAR_DROP = [0, 3, 6, 10]; // by stars: points, and % chance of an item
const DROP_GOLD = { 보통: 40, 희귀: 100, 전설: 240 }; // paid instead when the item is already owned
// once a month a kid may turn points into a weapon they lack, for those the mini-game drops have passed by; the price follows that sea's point rate
const BOX_PRICE = 300, boxPrice = map => Math.round(BOX_PRICE * map.mult);

// ship classes, smallest to largest; bought with gold. The look of each is in public/ship3d.js and app.js
const SHIPS = [
  ["dinghy", "작은 돛단배", 0, 0, true, 0], ["sloop", "슬루프", 200, 15, true, 0], ["brig", "브리그 범선", 500, 35, true, 0], ["galleon", "갈레온", 1000, 70, true, 0],
  ["ironclad", "철갑 증기선", 1800, 120, false, 1], ["destroyer", "구축함", 3000, 200, false, 1], ["cruiser", "순양함", 4500, 320, false, 2], ["carrier", "항공모함", 6500, 500, false, 2]
].map(([id, name, price, power, sails, era]) => ({ id, name, price, power, sails, era }));
// three seas, one for each era. Each opens at a battle power, pays more per game, and drops only its own era's weapons.
const MAPS = [
  { id: 0, name: "범선의 바다", era: "중세·범선 시대", power: 0, mult: 1, isles: { port: "포구 마을", cannon: "포격 섬", reef: "암초 해협", memory: "보물 동굴", battle: "대결 해협" } },
  { id: 1, name: "증기의 바다", era: "증기·세계대전 시대", power: 100, mult: 1.5, isles: { port: "증기 항구", cannon: "포대 요새", reef: "빙산 해협", memory: "암호 등대", battle: "해전 해협" } },
  { id: 2, name: "현대의 바다", era: "현대", power: 300, mult: 2, isles: { port: "해군 기지", cannon: "사격 훈련장", reef: "기뢰 해역", memory: "통신 기지", battle: "결전 해역" } }
];
const shipOf = id => SHIPS.find(s => s.id === id) || SHIPS[0];

// Decorations cost gold. Slots hold one item, except att (several) and emblem (on the sail, the flag or both: look.se / look.fe).
const DECO_SLOTS = ["hull", "trim", "pattern", "emblem", "head", "att", "wake", "tag", "weapon", "camo", "smoke"];
// attachments that only make sense on a wooden sailing ship; everything else in att also fits steel ships, and aircraft (from) only steel ones
const OLD_ONLY_ATT = ["anchor", "cannon", "nest", "parrot", "treasure"];
const DECO = [
  ["hull", "red", "진홍 배", 30], ["hull", "navy", "남색 배", 30], ["hull", "mint", "민트 배", 30], ["hull", "pink", "분홍 배", 30], ["hull", "lavender", "라벤더 배", 30], ["hull", "sky", "하늘 배", 30], ["hull", "lemon", "레몬 배", 30],
  ["hull", "ebony", "흑단 배", 60], ["hull", "white", "상아 배", 80], ["hull", "gold", "황금 배", 250],
  ["trim", "silver", "은테", 40], ["trim", "rosegold", "로즈골드 테", 40], ["trim", "pearl", "진주 테", 60],
  ["pattern", "stripe", "줄무늬", 30], ["pattern", "dots", "물방울", 30], ["pattern", "check", "체크", 40], ["pattern", "hearts", "하트 무늬", 40], ["pattern", "flowers", "꽃무늬", 60], ["pattern", "starry", "별빛 무늬", 60], ["pattern", "rainbow", "무지개 돛", 150], ["pattern", "gold", "황금 돛", 250],
  ["emblem", "star", "별", 40], ["emblem", "heart", "하트", 40], ["emblem", "flower", "꽃", 40], ["emblem", "clover", "네잎클로버", 40], ["emblem", "note", "음표", 40], ["emblem", "cherry", "체리", 40], ["emblem", "anchor", "닻", 40],
  ["emblem", "ribbon", "리본", 60], ["emblem", "butterfly", "나비", 60], ["emblem", "cat", "고양이", 60], ["emblem", "rabbit", "토끼", 60], ["emblem", "moon", "달", 60], ["emblem", "shell", "조개", 60], ["emblem", "compass", "나침반", 60],
  ["emblem", "crown", "왕관", 100], ["emblem", "flame", "불꽃", 100], ["emblem", "skull", "해골", 100],
  ["head", "swan", "백조 선수상", 200], ["head", "dragon", "용 선수상", 250],
  ["att", "anchor", "닻", 40], ["att", "lantern", "랜턴", 50], ["att", "bunting", "가랜드 깃발", 50], ["att", "bowribbon", "리본 장식", 50], ["att", "flowers", "꽃 장식", 60],
  ["att", "cannon", "대포", 80], ["att", "nest", "망루", 80], ["att", "balloons", "하트 풍선", 80], ["att", "fairylights", "요정 전구", 80],
  ["att", "parrot", "앵무새", 100], ["att", "cat", "고양이 선원", 100], ["att", "treasure", "보물 더미", 150],
  ["wake", "splash", "물보라", 50], ["wake", "sparkle", "반짝이 물결", 100], ["wake", "bubble", "비눗방울", 100], ["wake", "hearts", "하트 물결", 100], ["wake", "petals", "꽃잎 물결", 100], ["wake", "rainbow", "무지개 물결", 200],
  ["tag", "pink", "분홍 이름표", 60], ["tag", "lavender", "라벤더 이름표", 60], ["tag", "gold", "금빛 이름표", 60], ["tag", "rainbow", "무지개 이름표", 150],
  // for ships without sails; the fifth value is the smallest ship that can use the item, the sixth groups aircraft inside the att slot
  ["camo", "ocean", "바다 위장", 100, "ironclad"], ["camo", "splinter", "분할 위장", 120, "ironclad"], ["camo", "dazzle", "다즐 위장", 200, "ironclad"], ["camo", "digital", "디지털 위장", 200, "ironclad"], ["camo", "pink", "분홍 위장", 200, "ironclad"], ["camo", "pastel", "파스텔 위장", 200, "ironclad"], ["camo", "stealth", "스텔스 회색", 250, "ironclad"],
  ["smoke", "white", "흰 연기", 60, "ironclad"], ["smoke", "pink", "분홍 연기", 100, "ironclad"], ["smoke", "lavender", "보라 연기", 100, "ironclad"], ["smoke", "sky", "하늘 연기", 100, "ironclad"], ["smoke", "mint", "민트 연기", 100, "ironclad"], ["smoke", "rainbow", "무지개 연기", 250, "ironclad"],
  ["att", "drone", "무인 정찰기", 250, "cruiser", "air"], ["att", "heli", "해상작전 헬기", 300, "cruiser", "air"], ["att", "vtol", "수직이착륙기", 450, "carrier", "air"], ["att", "fighter", "전투기 편대", 500, "carrier", "air"], ["att", "awacs", "조기경보기", 600, "carrier", "air"]
].map(([slot, id, name, price, from, group]) => ({ key: `${slot}.${id}`, slot, id, name, price, rarity: price <= 40 ? "보통" : price <= 100 ? "희귀" : "전설", ...(from ? { from } : {}), ...(group ? { group } : {}), ...(slot === "att" && OLD_ONLY_ATT.includes(id) ? { upto: "galleon" } : {}) }));
const shipRank = id => SHIPS.findIndex(s => s.id === id);
const shipReaches = (shipId, d) => (!d.from || shipRank(shipId) >= shipRank(d.from)) && (!d.upto || shipRank(shipId) <= shipRank(d.upto));
const reachNote = d => d.upto ? "돛이 있는 옛날 배에만 달 수 있어요" : `${SHIPS.find(s => s.id === d.from).name}부터 쓸 수 있어요`;
// upgrades are the gold sink with no end in sight: dearer each level, the same small power gain, kept when changing ships
const UPGRADES = [["engine", "기관 강화", "엔진을 손봐서 힘을 키워요"], ["armor", "장갑 강화", "선체를 더 튼튼하게 덧대요"], ["gunnery", "포술 훈련", "선원들의 사격 솜씨를 키워요"]].map(([id, name, desc]) => ({ id, name, desc }));
const UP_MAX = 10, UP_POWER = 10, upPrice = level => level * 100;
// camouflage, smoke and aircraft are mostly for looks: a small flat gain, unlike older decorations (price / 5)
const STEEL_ITEM_POWER = 5;
// Weapons only come from mini-games. One is mounted at a time and adds to battle power; kind picks the shot seen in battle.
const WEAPONS = [
  ["ballista", "대형 쇠뇌", "보통", 5, "bolt", 0], ["catapult", "투석기", "보통", 7, "stone", 0], ["swivel", "선회포", "희귀", 12, "cannon", 0], ["pdr32", "32파운드 함포", "전설", 18, "cannon", 0],
  ["gatling", "개틀링 기관총", "보통", 28, "gun", 1], ["ac40", "40mm 기관포", "보통", 32, "gun", 1], ["torpedo", "어뢰 발사관", "희귀", 45, "torpedo", 1], ["triple203", "203mm 3연장 함포", "전설", 65, "turret", 1],
  ["ciws", "근접 방어 기관포", "보통", 60, "gun", 2], ["gun127", "127mm 자동 함포", "보통", 70, "turret", 2], ["asm", "대함 미사일", "희귀", 90, "missile", 2], ["cruise", "순항 미사일", "전설", 120, "missile", 2]
].map(([id, name, rarity, power, kind, era]) => ({ key: `weapon.${id}`, slot: "weapon", id, name, price: 0, rarity, power, kind, era, dropOnly: true }));
const ITEMS = [...DECO, ...WEAPONS];
// titles are earned, then shown beside a kid's name; cur and goal also draw the progress bars in the collection book
const TITLES = [["sail", "범선 제독", "범선 시대 무기 모두 모으기"], ["steam", "증기 제독", "증기 시대 무기 모두 모으기"], ["modern", "현대 제독", "현대 무기 모두 모으기"], ["fleet", "함대 사령관", "살 수 있는 배 모두 갖기"], ["stylist", "꾸미기 달인", "꾸미기 30개 모으기"], ["hunter", "보스 사냥꾼", "보스 격파에 3번 함께하기"], ["finisher", "마지막 일격", "보스에게 마지막 일격 넣기"], ["popular", "인기 선장", "친구에게 좋아요 10개 받기"]].map(([id, name, desc]) => ({ id, name, desc }));
const itemOf = k => ITEMS.find(d => d.key === k);
function parseLook(s) {
  let o = {}; try { o = JSON.parse(s || "{}") || {}; } catch (e) {}
  const out = {};
  for (const slot of DECO_SLOTS) {
    if (slot === "att") { const a = (Array.isArray(o.att) ? o.att : []).filter(id => itemOf(`att.${id}`)); if (a.length) out.att = [...new Set(a)]; }
    else if (slot === "emblem") { for (const k of ["se", "fe"]) if (o[k] && itemOf(`emblem.${o[k]}`)) out[k] = o[k]; }
    else if (o[slot] && itemOf(`${slot}.${o[slot]}`)) out[slot] = o[slot];
  }
  if (Number.isInteger(o.fc) && o.fc >= 0 && o.fc < SAILS) out.fc = o.fc;
  if (TITLES.some(t => t.id === o.ttl)) out.ttl = o.ttl;
  return out;
}
// the approved photo travels with the look, so every ship drawing gets it from one place
const lookOf = row => { const look = parseLook(row.look); if (row.photo) look.photo = row.photo; return look; };
const PHOTO_PRICE = 150, PHOTO_PER_WEEK = 3, PHOTO_MAX_CHARS = 200000;
function wearItem(look, d, on = true, where = "sail") {
  if (d.slot === "att") { const a = new Set(look.att || []); on ? a.add(d.id) : a.delete(d.id); if (a.size) look.att = [...a]; else delete look.att; }
  else if (d.slot === "emblem") {
    if (on) look[where === "flag" ? "fe" : "se"] = d.id;
    else for (const k of where === "both" ? ["se", "fe"] : [where === "flag" ? "fe" : "se"]) if (look[k] === d.id) delete look[k];
  }
  else if (on) look[d.slot] = d.id; else if (look[d.slot] === d.id) delete look[d.slot];
  return look;
}

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = m => new HttpError(400, m);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const kstDate = (ms = Date.now()) => new Date(ms + 9 * 36e5).toISOString().slice(0, 10);
const kstHour = (ms = Date.now()) => new Date(ms + 9 * 36e5).getUTCHours();
// a class's lesson days are stored as weekday digits, 0 = Sunday; kids can only hand in missions on these
const isClassDay = (days, ms = Date.now()) => String(days ?? "0123456").includes(String(new Date(ms + 9 * 36e5).getUTCDay()));
const kstMin = (ms = Date.now()) => { const d = new Date(ms + 9 * 36e5); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
// a class's battle windows: '16:50-17:00,18:20-18:30' -> [[1010, 1020], [1100, 1110]] in minutes of the day
const parseTimes = s => String(s || "").split(",").filter(Boolean).map(w => w.split("-").map(t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; }));
const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const daysKo = days => { const d = String(days ?? "0123456"); return d.length === 7 ? "매일" : [1, 2, 3, 4, 5, 6, 0].filter(n => d.includes(String(n))).map(n => DAY_KO[n]).join("·"); };
// why a child can't battle right now, or null when it can; the class's own windows win over the game-wide hours
function battleNo(st, game, ms = Date.now()) {
  if (!st.class_battle) return "지금은 선생님이 전투를 쉬게 했어요";
  const wins = parseTimes(st.class_btimes);
  if (wins.length) { const m = kstMin(ms); return isClassDay(st.class_days, ms) && wins.some(([a, b]) => m >= a && m < b) ? null : `전투는 ${daysKo(st.class_days)} ${wins.map(([a, b]) => `${hhmm(a)}~${hhmm(b)}`).join(", ")}에 할 수 있어요`; }
  const h = kstHour(ms); return game.hourFrom === game.hourTo || (h >= game.hourFrom && h < game.hourTo) ? null : `전투는 ${game.hourFrom}시부터 ${game.hourTo}시까지 할 수 있어요`;
}
// the teacher's text, '16:50-17:00, 18:20~18:30', checked and stored in one shape
function normTimes(text) {
  const s = String(text || "").trim(); if (!s) return "";
  const parts = s.split(/[,\s]+/).filter(Boolean), out = [];
  for (const p of parts) { const m = p.match(/^(\d{1,2}):(\d{2})[-~](\d{1,2}):(\d{2})$/); if (!m) throw bad("16:50-17:00 처럼 시작과 끝을 적어 주세요. 여러 개는 쉼표로 나눠요");
    const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4]; if (+m[2] > 59 || +m[4] > 59 || b > 24 * 60) throw bad(`${p}: 없는 시각이에요`); if (a >= b) throw bad(`${p}: 시작이 끝보다 빨라야 해요`); out.push([a, b]); }
  if (out.length > 8) throw bad("전투 시간은 8개까지 정할 수 있어요");
  return out.sort((x, y) => x[0] - y[0]).map(([a, b]) => `${hhmm(a)}-${hhmm(b)}`).join(",");
}
function kstWeekStart(ms = Date.now()) { const d = new Date(ms + 9 * 36e5); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); }
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const randHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");
const randInt = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
async function hashSecret(secret, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const randomPin = () => String(randInt(10000)).padStart(4, "0");
function classCode() { const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return [...crypto.getRandomValues(new Uint8Array(5))].map(x => ch[x % ch.length]).join(""); }
const str = (v, max) => { const s = String(v ?? "").trim(); if (!s) throw bad("빈 칸을 채워 주세요"); if (s.length > max) throw bad(`${max}자 이내로 입력해 주세요`); return s; };
const int = (v, min = 0, max = 1e6) => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < min || n > max) throw bad("숫자를 확인해 주세요"); return n; };
const isPin = p => /^\d{4}$/.test(String(p ?? ""));
const cookie = (token, days) => `hs_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
const readCookie = req => { const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)hs_session=([a-f0-9]{64})/); return m ? m[1] : null; };
const logStmt = (db, l) => db.prepare("INSERT INTO logs (student_id, kind, title, quest_id, energy, points, gold, date, at) VALUES (?,?,?,?,?,?,?,?,?)")
  .bind(l.student_id, l.kind, l.title, l.quest_id ?? null, l.energy || 0, l.points || 0, l.gold || 0, kstDate(), Date.now());

async function getGame(db) { const row = await db.prepare("SELECT value FROM settings WHERE key='game'").first(); return { ...DEFAULT_GAME, ...(row ? JSON.parse(row.value) : {}) }; }
async function createSession(db, role, userId) {
  const token = randHex(32), days = SESSION_DAYS[role];
  await db.prepare("DELETE FROM sessions WHERE expires_at<?").bind(Date.now()).run();
  await db.prepare("INSERT INTO sessions (token, role, user_id, expires_at) VALUES (?,?,?,?)").bind(token, role, userId, Date.now() + days * 864e5).run();
  return cookie(token, days);
}
async function auth(req, db) {
  const t = readCookie(req); if (!t) return null;
  const s = await db.prepare("SELECT * FROM sessions WHERE token=? AND expires_at>?").bind(t, Date.now()).first();
  if (!s) return null;
  if (s.role === "student") {
    const st = await db.prepare("SELECT s.*, c.name AS class_name, c.battle AS class_battle, c.battle_times AS class_btimes, c.days AS class_days, c.daily_bonus AS class_bonus, c.level AS class_level FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND s.active=1 AND c.active=1").bind(s.user_id).first();
    return st ? { role: "student", token: t, student: st } : null;
  }
  const te = await db.prepare("SELECT id, username FROM teachers WHERE id=?").bind(s.user_id).first();
  return te ? { role: "teacher", token: t, teacher: te } : null;
}
async function balances(db, ids) {
  const out = {}; for (const id of ids) out[id] = { energy: 0, points: 0, gold: 0 };
  for (let i = 0; i < ids.length; i += 80) { const part = ids.slice(i, i + 80);
    const r = await db.prepare(`SELECT student_id AS id, SUM(energy) AS energy, SUM(points) AS points, SUM(gold) AS gold FROM logs WHERE student_id IN (${part.map(() => "?").join(",")}) GROUP BY student_id`).bind(...part).all();
    for (const x of r.results) out[x.id] = { energy: x.energy || 0, points: x.points || 0, gold: x.gold || 0 }; }
  return out;
}
// battle power: base + ship class + a fifth of the gold value of decorations owned + mounted weapon
async function powers(db, rows) {
  const out = {}, sum = {}, ups = {}; if (!rows.length) return out;
  for (let i = 0; i < rows.length; i += 80) { const part = rows.slice(i, i + 80).map(r => r.id);
    const r = await db.prepare(`SELECT student_id AS id, item FROM owned WHERE student_id IN (${part.map(() => "?").join(",")})`).bind(...part).all();
    for (const x of r.results) { const d = itemOf(x.item); if (d && d.from) ups[x.id] = (ups[x.id] || 0) + STEEL_ITEM_POWER; else if (d) sum[x.id] = (sum[x.id] || 0) + d.price; else if (x.item.startsWith("up.")) ups[x.id] = (ups[x.id] || 0) + UP_POWER; } }
  for (const r of rows) { const w = itemOf(`weapon.${parseLook(r.look).weapon}`); out[r.id] = 20 + shipOf(r.ship).power + Math.floor((sum[r.id] || 0) / 5) + (ups[r.id] || 0) + (w ? w.power : 0); }
  return out;
}
async function questBlocked(db, sid, q) {
  if (q.kind === "challenge") return null;
  const since = q.kind === "daily" ? kstDate() : kstWeekStart();
  if (await db.prepare("SELECT 1 FROM logs WHERE student_id=? AND kind='quest' AND quest_id=? AND date>=? LIMIT 1").bind(sid, q.id, since).first()) return q.kind === "daily" ? "오늘은 이미 완료한 미션이에요" : "이번 주에 이미 완료한 미션이에요";
  return null;
}
/* ---------- the class boss ---------- */
// a class meets this week's boss the first time anyone looks; its hp is fixed then, so settings changed later apply to next week's
async function currentBoss(db, classId, game) {
  if (!game.bossHp) return null;
  const find = () => db.prepare("SELECT * FROM bosses WHERE class_id=? AND week=?").bind(classId, kstWeekStart()).first();
  const b = await find(); if (b) return b;
  const n = (await db.prepare("SELECT COUNT(*) AS n FROM students WHERE class_id=? AND active=1").bind(classId).first()).n; if (!n) return null;
  const made = (await db.prepare("SELECT COUNT(*) AS n FROM bosses WHERE class_id=?").bind(classId).first()).n;
  await db.prepare("INSERT OR IGNORE INTO bosses (class_id, week, kind, hp, gold, created_at) VALUES (?,?,?,?,?,?)").bind(classId, kstWeekStart(), made % BOSSES.length, n * game.bossHp, game.bossGold, Date.now()).run();
  return find();
}
const bossLeft = async (db, b) => Math.max(0, b.hp - (await db.prepare("SELECT COALESCE(SUM(dmg), 0) AS n FROM boss_hits WHERE boss_id=?").bind(b.id).first()).n);
// pays the whole class once; the update only succeeds for the first caller, so two last hits at once can't pay twice
async function defeatBoss(db, b, finisher) {
  const r = await db.prepare("UPDATE bosses SET defeated_at=?, finisher=? WHERE id=? AND defeated_at=0").bind(Date.now(), finisher, b.id).run(); if (!r.meta.changes) return;
  const kids = (await db.prepare("SELECT id FROM students WHERE class_id=? AND active=1").bind(b.class_id).all()).results;
  const joined = new Set((await db.prepare("SELECT DISTINCT student_id AS id FROM boss_hits WHERE boss_id=?").bind(b.id).all()).results.map(x => x.id)), name = BOSSES[b.kind].name, ops = [];
  for (const k of kids) { const gold = bossGoldFor(b, joined.has(k.id), k.id === finisher); if (gold) ops.push(logStmt(db, { student_id: k.id, kind: "boss", title: `${name} 격파 보상`, gold })); }
  for (let i = 0; i < ops.length; i += 90) await db.batch(ops.slice(i, i + 90));
}
const bossGoldFor = (b, joined, last) => (joined ? b.gold : Math.round(b.gold * BOSS_IDLE_SHARE)) + (last ? BOSS_LAST_HIT_GOLD : 0);
// hits: [{ sid, cls, dmg, src }]; several classes at once when a teacher approves a pile of missions. Returns each class's boss after the hits.
async function hitBosses(db, game, hits) {
  const out = {};
  for (const cls of new Set(hits.map(h => h.cls))) {
    const mine = hits.filter(h => h.cls === cls && h.dmg > 0); if (!mine.length) continue;
    const b = await currentBoss(db, cls, game); if (!b || b.defeated_at) continue;
    const ops = mine.map(h => db.prepare("INSERT INTO boss_hits (boss_id, student_id, dmg, src, at) VALUES (?,?,?,?,?)").bind(b.id, h.sid, h.dmg, h.src, Date.now()));
    for (let i = 0; i < ops.length; i += 90) await db.batch(ops.slice(i, i + 90));
    const left = await bossLeft(db, b); if (!left) await defeatBoss(db, b, mine[mine.length - 1].sid);
    out[cls] = { name: BOSSES[b.kind].name, left, hp: b.hp, down: !left };
  }
  return out;
}
// what a kid sees: this week's boss, and the last win if it is recent enough to still celebrate
async function bossView(db, st, game, mates) {
  const b = await currentBoss(db, st.class_id, game), nameOf = id => mates.find(m => m.id === id)?.nickname || "";
  // last week's boss, if the class fought it and it got away
  const prev = await db.prepare("SELECT * FROM bosses WHERE class_id=? AND week=? AND defeated_at=0").bind(st.class_id, kstWeekStart(Date.now() - 7 * 864e5)).first(); let missed = null;
  if (prev) { const left = await bossLeft(db, prev); if (left < prev.hp) missed = { id: prev.id, name: BOSSES[prev.kind].name, art: BOSSES[prev.kind], left, hp: prev.hp }; }
  const lastWin = await db.prepare("SELECT * FROM bosses WHERE class_id=? AND defeated_at>? ORDER BY id DESC LIMIT 1").bind(st.class_id, Date.now() - 8 * 864e5).first();
  let win = null;
  if (lastWin) { const tally = (await db.prepare("SELECT student_id AS id, SUM(dmg) AS dmg FROM boss_hits WHERE boss_id=? AND student_id>0 GROUP BY student_id").bind(lastWin.id).all()).results, mine = tally.find(x => x.id === st.id), joined = !!mine;
    win = { id: lastWin.id, name: BOSSES[lastWin.kind].name, art: BOSSES[lastWin.kind], gold: bossGoldFor(lastWin, joined, lastWin.finisher === st.id), last: lastWin.finisher === st.id, finisher: nameOf(lastWin.finisher), joined, mine: mine?.dmg || 0, helpers: tally.length, crew: mates.length,
      top: tally.filter(x => nameOf(x.id)).sort((x, y) => y.dmg - x.dmg).slice(0, 3).map(x => ({ who: nameOf(x.id), dmg: x.dmg })) }; }
  if (!b) return { off: true, win, missed };
  const tot = (await db.prepare("SELECT student_id AS id, SUM(dmg) AS dmg FROM boss_hits WHERE boss_id=? GROUP BY student_id").bind(b.id).all()).results, sum = tot.reduce((n, x) => n + x.dmg, 0);
  const feed = (await db.prepare("SELECT student_id AS id, dmg, src FROM boss_hits WHERE boss_id=? ORDER BY id DESC LIMIT 4").bind(b.id).all()).results.map(x => ({ who: x.id ? nameOf(x.id) : "선생님", dmg: x.dmg, src: x.src })).filter(x => x.who);
  return { id: b.id, name: BOSSES[b.kind].name, art: BOSSES[b.kind], hp: b.hp, left: Math.max(0, b.hp - sum), down: !!b.defeated_at, gold: b.gold, mine: tot.find(x => x.id === st.id)?.dmg || 0, joined: tot.filter(x => x.id).length, crew: mates.length, feed, questDmg: BOSS_QUEST_DMG, starDmg: BOSS_STAR_DMG, win, missed };
}
async function titlesFor(db, sid, owned) {
  const has = k => owned.includes(k), era = n => { const w = WEAPONS.filter(x => x.era === n); return [w.filter(x => has(x.key)).length, w.length]; }, buyable = SHIPS.filter(s => s.price);
  const hunts = (await db.prepare("SELECT COUNT(DISTINCT h.boss_id) AS n FROM boss_hits h JOIN bosses b ON b.id=h.boss_id WHERE h.student_id=? AND b.defeated_at>0").bind(sid).first()).n;
  const lasts = (await db.prepare("SELECT COUNT(*) AS n FROM bosses WHERE finisher=?").bind(sid).first()).n, likes = (await db.prepare("SELECT COUNT(*) AS n FROM likes WHERE target=?").bind(sid).first()).n;
  const prog = { sail: era(0), steam: era(1), modern: era(2), fleet: [buyable.filter(s => has(`ship.${s.id}`)).length, buyable.length], stylist: [Math.min(30, DECO.filter(d => has(d.key)).length), 30], hunter: [Math.min(3, hunts), 3], finisher: [Math.min(1, lasts), 1], popular: [Math.min(10, likes), 10] };
  return TITLES.map(t => ({ ...t, cur: prog[t.id][0], goal: prog[t.id][1], got: prog[t.id][0] >= prog[t.id][1] }));
}
// energy from homework, stopping at the cap
async function giveEnergy(db, game, pairs) {
  const who = [...new Set(pairs.map(p => p.sid))], bal = await balances(db, who), ops = [], skipped = [], bonus = {}, clsOf = {}; let short = 0;
  // a class with fewer lessons a week can earn more from each daily mission
  for (let i = 0; i < who.length; i += 80) { const part = who.slice(i, i + 80); for (const r of (await db.prepare(`SELECT s.id, s.class_id, c.daily_bonus FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id IN (${part.map(() => "?").join(",")})`).bind(...part).all()).results) { bonus[r.id] = r.daily_bonus; clsOf[r.id] = r.class_id; } }
  for (const p of pairs) {
    const why = p.quest.class_id && clsOf[p.sid] !== p.quest.class_id ? "다른 반 미션이에요" : await questBlocked(db, p.sid, p.quest);
    if (why) { p.blocked = true; skipped.push({ studentId: p.sid, why }); if (p.requestId) ops.push(db.prepare("UPDATE requests SET status='rejected', decided_at=? WHERE id=?").bind(Date.now(), p.requestId)); continue; }
    const want = p.quest.energy + (p.quest.kind === "daily" ? bonus[p.sid] || 0 : 0), give = Math.max(0, Math.min(want, game.energyMax - bal[p.sid].energy)); bal[p.sid].energy += give; if (give < want) short++;
    ops.push(logStmt(db, { student_id: p.sid, kind: "quest", title: p.quest.title, quest_id: p.quest.id, energy: give }));
    ops.push(db.prepare("UPDATE requests SET status='approved', decided_at=? WHERE student_id=? AND quest_id=? AND status='pending'").bind(Date.now(), p.sid, p.quest.id));
  }
  for (let i = 0; i < ops.length; i += 90) await db.batch(ops.slice(i, i + 90));
  // every mission the teacher accepted is a shot at the class boss, even when the kid's energy is already full
  const shot = pairs.filter(p => !p.blocked), ids = [...new Set(shot.map(p => p.sid))], classOf = {};
  for (let i = 0; i < ids.length; i += 80) { const part = ids.slice(i, i + 80); for (const r of (await db.prepare(`SELECT id, class_id FROM students WHERE id IN (${part.map(() => "?").join(",")})`).bind(...part).all()).results) classOf[r.id] = r.class_id; }
  await hitBosses(db, game, shot.filter(p => classOf[p.sid]).map(p => ({ sid: p.sid, cls: classOf[p.sid], dmg: BOSS_QUEST_DMG, src: "quest" })));
  return { given: pairs.length - skipped.length, skipped, short };
}
// a random item for a good mini-game; one already owned pays gold instead
const rollRarity = () => { const r = randInt(100); return r < 65 ? "보통" : r < 93 ? "희귀" : "전설"; };
// decorations the kid's ship cannot use yet stay out of the draw; weapons stay in, because the mini-games are the only way to get them
async function rollItem(db, sid, map, shipId) {
  const rarity = rollRarity(), list = randInt(100) < 60 ? DECO.filter(d => shipReaches(shipId, d)) : WEAPONS.filter(d => d.era === map), pool = list.filter(d => d.rarity === rarity), d = pool[randInt(pool.length)];
  const has = await db.prepare("SELECT 1 FROM owned WHERE student_id=? AND item=?").bind(sid, d.key).first();
  if (has) { const gold = DROP_GOLD[rarity]; await logStmt(db, { student_id: sid, kind: "game", title: `${d.name} (이미 있어서 금화로)`, gold }).run(); return { key: d.key, name: d.name, rarity, slot: d.slot, dup: true, gold }; }
  await db.prepare("INSERT OR IGNORE INTO owned (student_id, item, created_at) VALUES (?,?,?)").bind(sid, d.key, Date.now()).run();
  await logStmt(db, { student_id: sid, kind: "game", title: `발견: ${d.name}` }).run();
  return { key: d.key, name: d.name, rarity, slot: d.slot, dup: false };
}
// the shots of a battle whose winner is already decided; the loser is the one who sinks
function simulate(attackerWins) {
  const hp = { a: 100, d: 100 }, rounds = []; let turn = "a"; const win = attackerWins ? "a" : "d", lose = attackerWins ? "d" : "a";
  while (hp[lose] > 0) { const other = turn === "a" ? "d" : "a", miss = rounds.length < 10 && randInt(100) < 14;
    let dmg = miss ? 0 : turn === win ? 18 + randInt(21) : 10 + randInt(17);
    if (other === win) dmg = Math.min(dmg, Math.max(0, hp[win] - 6));
    hp[other] = Math.max(0, hp[other] - dmg); rounds.push({ by: turn, dmg, hp: { ...hp } }); turn = other; }
  return rounds;
}

/* ---------- routes ---------- */
const routes = [];
const on = (method, path, role, fn) => routes.push({ method, re: new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>\\d+)") + "$"), role, fn });

on("GET", "/api/me", null, async ({ db, req }) => {
  const me = await auth(req, db), needSetup = !(await db.prepare("SELECT 1 FROM teachers LIMIT 1").first());
  if (!me) return { role: null, needSetup };
  return me.role === "teacher" ? { role: "teacher", username: me.teacher.username } : { role: "student", nickname: me.student.nickname };
});
on("POST", "/api/setup", null, async ({ db, body, env }) => {
  if (await db.prepare("SELECT 1 FROM teachers LIMIT 1").first()) throw bad("이미 설정이 끝났어요. 선생님 로그인을 이용해 주세요");
  if (!env.SETUP_CODE || String(body.setupCode || "") !== env.SETUP_CODE) throw new HttpError(403, "설정 코드가 맞지 않아요");
  const username = str(body.username, 30), pw = String(body.password || ""); if (pw.length < 4) throw bad("비밀번호는 4자 이상으로 정해 주세요");
  const h = await hashSecret(pw), r = await db.prepare("INSERT INTO teachers (username, pass_hash, salt, created_at) VALUES (?,?,?,?)").bind(username, h.hash, h.salt, Date.now()).run();
  return { ok: true, _cookie: await createSession(db, "teacher", r.meta.last_row_id) };
});
on("POST", "/api/teacher/login", null, async ({ db, body }) => {
  const t = await db.prepare("SELECT * FROM teachers WHERE username=?").bind(String(body.username || "").trim()).first();
  if (!t) throw new HttpError(401, "아이디나 비밀번호가 맞지 않아요");
  if (t.locked_until > Date.now()) throw new HttpError(429, "여러 번 틀려서 잠시 잠겼어요. 10분 뒤에 다시 해 주세요");
  const h = await hashSecret(String(body.password || ""), t.salt);
  if (!safeEqual(h.hash, t.pass_hash)) { const f = t.failed + 1; await db.prepare("UPDATE teachers SET failed=?, locked_until=? WHERE id=?").bind(f >= MAX_FAILED ? 0 : f, f >= MAX_FAILED ? Date.now() + LOCK_MS : 0, t.id).run(); throw new HttpError(401, "아이디나 비밀번호가 맞지 않아요"); }
  await db.prepare("UPDATE teachers SET failed=0 WHERE id=?").bind(t.id).run();
  return { ok: true, _cookie: await createSession(db, "teacher", t.id) };
});
on("POST", "/api/class", null, async ({ db, body }) => {
  const c = await db.prepare("SELECT id, name FROM classes WHERE code=? AND active=1").bind(String(body.code || "").trim().toUpperCase()).first();
  if (!c) throw bad("반 코드를 다시 확인해 주세요");
  return { name: c.name, students: (await db.prepare("SELECT id, nickname, sail FROM students WHERE class_id=? AND active=1 ORDER BY nickname").bind(c.id).all()).results };
});
on("POST", "/api/student/login", null, async ({ db, body }) => {
  const s = await db.prepare("SELECT s.* FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND c.code=? AND s.active=1 AND c.active=1").bind(int(body.studentId, 1), String(body.code || "").trim().toUpperCase()).first();
  if (!s) throw new HttpError(401, "이름을 다시 골라 주세요");
  if (s.locked_until > Date.now()) throw new HttpError(429, "여러 번 틀려서 잠시 잠겼어요. 10분 뒤에 다시 하거나 선생님께 말해 주세요");
  const h = await hashSecret(String(body.pin || ""), s.salt);
  if (!safeEqual(h.hash, s.pin_hash)) { const f = s.failed + 1; await db.prepare("UPDATE students SET failed=?, locked_until=? WHERE id=?").bind(f >= MAX_FAILED ? 0 : f, f >= MAX_FAILED ? Date.now() + LOCK_MS : 0, s.id).run();
    throw new HttpError(401, f >= MAX_FAILED ? "여러 번 틀려서 10분 동안 잠겼어요" : `비밀번호가 맞지 않아요 (${MAX_FAILED - f}번 남음)`); }
  await db.prepare("UPDATE students SET failed=0 WHERE id=?").bind(s.id).run();
  return { ok: true, _cookie: await createSession(db, "student", s.id) };
});
on("POST", "/api/logout", "any", async ({ db, me }) => { await db.prepare("DELETE FROM sessions WHERE token=?").bind(me.token).run(); return { ok: true, _cookie: "hs_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" }; });

/* ----- students ----- */
on("POST", "/api/kid/pin", "student", async ({ db, me, body }) => {
  if (!isPin(body.pin)) throw bad("숫자 4개로 정해 주세요");
  const h = await hashSecret(String(body.pin)); await db.prepare("UPDATE students SET pin_hash=?, salt=?, must_change=0 WHERE id=?").bind(h.hash, h.salt, me.student.id).run(); return { ok: true };
});
on("POST", "/api/kid/sail", "student", async ({ db, me, body }) => {
  if (body.sail != null) await db.prepare("UPDATE students SET sail=? WHERE id=?").bind(int(body.sail, 0, SAILS - 1), me.student.id).run();
  if (body.flag != null) { const look = parseLook(me.student.look), f = int(body.flag, -1, SAILS - 1); if (f < 0) delete look.fc; else look.fc = f; await db.prepare("UPDATE students SET look=? WHERE id=?").bind(JSON.stringify(look), me.student.id).run(); }
  return { ok: true };
});
on("GET", "/api/kid/state", "student", async ({ db, me }) => {
  const st = me.student, game = await getGame(db), today = kstDate(), ws = kstWeekStart(), month = today.slice(0, 7);
  const bal = (await balances(db, [st.id]))[st.id];
  const mates = (await db.prepare("SELECT id, nickname, sail, look, ship, photo FROM students WHERE class_id=? AND active=1 ORDER BY nickname").bind(st.class_id).all()).results;
  const lastPhoto = await db.prepare("SELECT id, status, decided_at FROM photos WHERE student_id=? ORDER BY id DESC LIMIT 1").bind(st.id).first();
  const photosThisWeek = (await db.prepare("SELECT COUNT(*) AS n FROM photos WHERE student_id=? AND date>=?").bind(st.id, ws).first()).n;
  const photo = { price: PHOTO_PRICE, left: Math.max(0, PHOTO_PER_WEEK - photosThisWeek), pending: lastPhoto?.status === "pending" ? lastPhoto.id : null, rejected: lastPhoto?.status === "rejected" && Date.now() - lastPhoto.decided_at < 3 * 864e5 };
  const pw = await powers(db, mates);
  const quests = (await db.prepare("SELECT id, title, subject, kind, energy FROM quests WHERE active=1 AND deleted=0 AND class_id IN (0, ?) ORDER BY subject, kind, id").bind(st.class_id).all()).results;
  const done = (await db.prepare("SELECT quest_id, date FROM logs WHERE student_id=? AND kind='quest' AND date>=?").bind(st.id, ws).all()).results;
  const pend = (await db.prepare("SELECT id, quest_id FROM requests WHERE student_id=? AND status='pending'").bind(st.id).all()).results;
  for (const q of quests) { const d = done.some(r => r.quest_id === q.id && (q.kind === "weekly" || (q.kind === "daily" && r.date === today))), p = pend.find(r => r.quest_id === q.id);
    q.status = q.kind !== "challenge" && d ? "done" : p ? "pending" : !isClassDay(st.class_days) ? "off" : "open"; if (q.kind === "daily") q.energy += st.class_bonus || 0; q.requestId = p ? p.id : null; }
  const owned = (await db.prepare("SELECT item FROM owned WHERE student_id=?").bind(st.id).all()).results.map(r => r.item);
  const log = (await db.prepare("SELECT title, energy, points, gold, at FROM logs WHERE student_id=? ORDER BY id DESC LIMIT 30").bind(st.id).all()).results;
  const boxUsed = !!(await db.prepare("SELECT 1 FROM logs WHERE student_id=? AND kind='box' AND date LIKE ? LIMIT 1").bind(st.id, `${month}%`).first());
  const used = (await db.prepare("SELECT COUNT(*) AS n FROM battles WHERE attacker=? AND date=?").bind(st.id, today).first()).n;
  const fights = (await db.prepare(`SELECT b.*, a.nickname AS a_name, d.nickname AS d_name FROM battles b JOIN students a ON a.id=b.attacker JOIN students d ON d.id=b.defender WHERE b.attacker=? OR b.defender=? ORDER BY b.id DESC LIMIT 12`).bind(st.id, st.id).all()).results
    .map(b => ({ id: b.id, attacked: b.attacker === st.id, opp: b.attacker === st.id ? b.d_name : b.a_name, won: b.winner === st.id, gold: b.attacker === st.id ? b.delta : (b.winner === st.id ? game.defend : 0), at: b.at }));
  const pass = await db.prepare("SELECT status FROM orders WHERE student_id=? AND month=? AND status<>'canceled' LIMIT 1").bind(st.id, month).first();
  const orders = (await db.prepare("SELECT id, name, status, created_at FROM orders WHERE student_id=? AND status='pending'").bind(st.id).all()).results;
  const closed = battleNo(st, game), open = !closed;
  return { me: { id: st.id, nickname: st.nickname, sail: st.sail, look: lookOf(st), ship: st.ship, className: st.class_name, mustChange: !!st.must_change, power: pw[st.id], focus: focusOf(st) },
    boxUsed, boxes: MAPS.map(m => ({ map: m.id, price: boxPrice(m), all: WEAPONS.filter(w => w.era === m.id).every(w => owned.includes(w.key)) })),
    upgrades: UPGRADES.map(u => { const level = owned.filter(k => k.startsWith(`up.${u.id}.`)).length; return { ...u, level, max: UP_MAX, power: UP_POWER, price: level < UP_MAX ? upPrice(level + 1) : 0 }; }),
    bal, game, quests, classDays: st.class_days, level: st.class_level || 0, owned, log, photo, deco: ITEMS, ships: SHIPS, games: GAMES, maps: MAPS,
    mates: mates.map(m => ({ id: m.id, nickname: m.nickname, sail: m.sail, look: lookOf(m), ship: m.ship, power: pw[m.id] })),
    battle: { open, closed, off: !st.class_battle, left: Math.max(0, game.battlesPerDay - used), duelLeft: await duelLeft(db, st.id, game, today), fights }, pass: { bought: !!pass, status: pass?.status || null }, orders, boss: await bossView(db, st, game, mates), titles: await titlesFor(db, st.id, owned),
    approved: (await db.prepare("SELECT id, title, energy FROM logs WHERE student_id=? AND kind='quest' ORDER BY id DESC LIMIT 20").bind(st.id).all()).results,
    weak: await weakOf(db, st.id, st.class_level || 0),
    likes: { counts: Object.fromEntries((await db.prepare("SELECT l.target AS id, COUNT(*) AS n FROM likes l JOIN students s ON s.id=l.target WHERE s.class_id=? GROUP BY l.target").bind(st.class_id).all()).results.map(r => [r.id, r.n])), mine: (await db.prepare("SELECT target FROM likes WHERE liker=? AND week=?").bind(st.id, ws).all()).results.map(r => r.target) } };
});
on("POST", "/api/kid/title", "student", async ({ db, me, body }) => {
  const look = parseLook(me.student.look), id = String(body.id || "");
  if (id) { const owned = (await db.prepare("SELECT item FROM owned WHERE student_id=?").bind(me.student.id).all()).results.map(r => r.item), t = (await titlesFor(db, me.student.id, owned)).find(x => x.id === id); if (!t) throw bad("없는 칭호예요"); if (!t.got) throw bad("아직 얻지 못한 칭호예요"); look.ttl = id; } else delete look.ttl;
  await db.prepare("UPDATE students SET look=? WHERE id=?").bind(JSON.stringify(look), me.student.id).run(); return { ok: true };
});
on("POST", "/api/kid/like/:id", "student", async ({ db, me, params }) => {
  const target = Number(params.id); if (target === me.student.id) throw bad("내 배에는 누를 수 없어요");
  if (!(await db.prepare("SELECT 1 FROM students WHERE id=? AND class_id=? AND active=1").bind(target, me.student.class_id).first())) throw bad("같은 반 친구에게만 누를 수 있어요");
  const r = await db.prepare("INSERT OR IGNORE INTO likes (liker, target, week, at) VALUES (?,?,?,?)").bind(me.student.id, target, kstWeekStart(), Date.now()).run(); if (!r.meta.changes) throw bad("이번 주에는 이미 눌렀어요"); return { ok: true };
});
on("POST", "/api/kid/request", "student", async ({ db, me, body }) => {
  const q = await db.prepare("SELECT * FROM quests WHERE id=? AND active=1 AND deleted=0").bind(int(body.questId, 1)).first(); if (!q || (q.class_id && q.class_id !== me.student.class_id)) throw bad("없는 미션이에요");
  if (!isClassDay(me.student.class_days)) throw bad("오늘은 수업이 없는 날이라 미션이 쉬어요");
  const why = await questBlocked(db, me.student.id, q); if (why) throw bad(why);
  if (await db.prepare("SELECT 1 FROM requests WHERE student_id=? AND quest_id=? AND status='pending'").bind(me.student.id, q.id).first()) throw bad("이미 선생님께 확인을 요청했어요");
  if ((await db.prepare("SELECT COUNT(*) AS n FROM requests WHERE student_id=? AND status='pending'").bind(me.student.id).first()).n >= 10) throw bad("확인을 기다리는 미션이 많아요. 선생님이 확인할 때까지 기다려 주세요");
  await db.prepare("INSERT INTO requests (student_id, quest_id, date, created_at) VALUES (?,?,?,?)").bind(me.student.id, q.id, kstDate(), Date.now()).run(); return { ok: true };
});
on("POST", "/api/kid/cancel/:id", "student", async ({ db, me, params }) => { await db.prepare("UPDATE requests SET status='canceled', decided_at=? WHERE id=? AND student_id=? AND status='pending'").bind(Date.now(), params.id, me.student.id).run(); return { ok: true }; });

// mini-games: starting one costs energy, finishing it pays once
on("POST", "/api/kid/play/start", "student", async ({ db, me, body }) => {
  const g = GAMES[body.game]; if (!g) throw bad("없는 게임이에요");
  const game = await getGame(db), sid = me.student.id, bal = (await balances(db, [sid]))[sid];
  if (bal.energy < game.playCost) throw bad("행동력이 모자라요. 미션을 하고 선생님께 확인받으면 생겨요");
  const map = MAPS[int(body.map || 0, 0, MAPS.length - 1)], power = (await powers(db, [me.student]))[sid];
  if (power < map.power) throw bad(`${map.name}는 전투력 ${map.power}부터 열려요`);
  const r = await db.prepare("INSERT INTO plays (student_id, game, map, started_at) VALUES (?,?,?,?)").bind(sid, body.game, map.id, Date.now()).run();
  await logStmt(db, { student_id: sid, kind: "play", title: `${map.isles[body.game]} 출항`, energy: -game.playCost }).run();
  return { ok: true, playId: r.meta.last_row_id };
});
on("POST", "/api/kid/play/finish/:id", "student", async ({ db, me, params, body }) => {
  const sid = me.student.id, p = await db.prepare("SELECT * FROM plays WHERE id=? AND student_id=?").bind(params.id, sid).first();
  if (!p) throw bad("없는 게임이에요"); if (p.finished_at) throw bad("이미 끝난 게임이에요");
  const g = GAMES[p.game], fast = Date.now() - p.started_at < g.minMs, score = fast ? 0 : int(body.score || 0, 0, g.max);
  const stars = g.stars.filter(n => score >= n).length, map = MAPS[p.map] || MAPS[0], gaveUp = !!body.quit || fast, points = gaveUp ? 0 : Math.round(STAR_POINTS[stars] * map.mult);
  const r = await db.prepare("UPDATE plays SET finished_at=?, score=?, stars=? WHERE id=? AND finished_at IS NULL").bind(Date.now(), score, stars, p.id).run();
  if (!r.meta.changes) throw bad("이미 끝난 게임이에요");
  await logStmt(db, { student_id: sid, kind: "game", title: gaveUp ? `${map.isles[p.game]} 그만둠` : `${map.isles[p.game]} 별 ${stars}개`, points }).run();
  const item = randInt(100) < STAR_DROP[stars] ? await rollItem(db, sid, map.id, me.student.ship) : null;
  // a game played to the end always scratches the boss; a game left at once does nothing
  const dmg = gaveUp ? 0 : Math.max(1, stars * BOSS_STAR_DMG), cls = me.student.class_id, hit = (await hitBosses(db, await getGame(db), [{ sid, cls, dmg, src: "game" }]))[cls];
  return { ok: true, stars, score, points, item, boss: hit ? { ...hit, dmg } : null };
});
// what was answered in a game or a practice, for the teacher's report. Only the kind of question, the counts and the wrong questions' own text are kept.
const MISS_KEEP = 40, ANSWER_DAYS = 180, WEAK_DAYS = 14, clip = (v, n) => String(v ?? "").slice(0, n);
on("POST", "/api/kid/answers", "student", async ({ db, me, body }) => {
  const sid = me.student.id, game = String(body.game || ""), now = Date.now(), date = kstDate(now), st = []; if (!GAMES[game]) throw bad("없는 게임이에요");
  const map = int(body.map || 0, 0, MAPS.length - 1), level = me.student.class_level || 0;
  for (const [t, v] of Object.entries(body.tally || {}).slice(0, 20)) { const tries = int(v?.[0], 1, 200), wrong = int(v?.[1], 0, tries);
    st.push(db.prepare("INSERT INTO answers (student_id, date, tag, game, map, level, tries, wrong) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(student_id, date, tag, game, map, level) DO UPDATE SET tries=tries+excluded.tries, wrong=wrong+excluded.wrong").bind(sid, date, clip(t, 20), game, map, level, tries, wrong)); }
  for (const m of [].concat(body.missed || []).slice(0, 20)) st.push(db.prepare("INSERT INTO misses (student_id, level, tag, lines, answer, how, at) VALUES (?,?,?,?,?,?,?)").bind(sid, level, clip(m?.tag, 20), JSON.stringify([].concat(m?.lines || []).slice(0, 4).map(l => clip(l, 200))), clip(m?.answer, 120), clip(m?.how, 200), now));
  if (!st.length) return { ok: true };
  st.push(db.prepare("DELETE FROM misses WHERE student_id=? AND id NOT IN (SELECT id FROM misses WHERE student_id=? ORDER BY id DESC LIMIT ?)").bind(sid, sid, MISS_KEEP), db.prepare("DELETE FROM answers WHERE student_id=? AND date<?").bind(sid, kstDate(now - ANSWER_DAYS * 864e5)));
  await db.batch(st); return { ok: true };
});
// the kinds of question a child has been missing lately, and which game asked them, so they can be practised
// the units a teacher set for a child; anything unreadable counts as none
function focusOf(s) { try { const a = JSON.parse(s.focus || "[]"); return Array.isArray(a) ? a.slice(0, 3).map(String) : []; } catch (e) { return []; } }
async function weakOf(db, sid, level) { const by = {};
  for (const r of (await db.prepare("SELECT tag, game, map, tries, wrong FROM answers WHERE student_id=? AND level=? AND date>=? ORDER BY date").bind(sid, level, kstDate(Date.now() - WEAK_DAYS * 864e5)).all()).results) { const b = by[r.tag] || (by[r.tag] = { tag: r.tag, tries: 0, wrong: 0 }); b.tries += r.tries; b.wrong += r.wrong; b.game = r.game; b.map = r.map; }
  return Object.values(by).filter(b => b.wrong).sort((a, b) => b.wrong / b.tries - a.wrong / a.tries || b.wrong - a.wrong).slice(0, 6); }
// gold shop
on("POST", "/api/kid/deco/buy", "student", async ({ db, me, body }) => {
  const d = itemOf(String(body.key || "")); if (!d || d.dropOnly) throw bad("살 수 없는 꾸미기예요");
  if (!shipReaches(me.student.ship, d)) throw bad(reachNote(d));
  const sid = me.student.id, bal = (await balances(db, [sid]))[sid]; if (bal.gold < d.price) throw bad(`금화가 ${d.price - bal.gold}개 모자라요`);
  const r = await db.prepare("INSERT OR IGNORE INTO owned (student_id, item, created_at) VALUES (?,?,?)").bind(sid, d.key, Date.now()).run(); if (!r.meta.changes) throw bad("이미 가지고 있어요");
  const lg = await logStmt(db, { student_id: sid, kind: "deco", title: `꾸미기: ${d.name}`, gold: -d.price }).run(), old = parseLook(me.student.look);
  const look = wearItem(old, d, true, d.slot === "emblem" && old.se && !old.fe ? "flag" : "sail");
  await db.batch([db.prepare("UPDATE owned SET log_id=? WHERE student_id=? AND item=?").bind(lg.meta.last_row_id, sid, d.key), db.prepare("UPDATE students SET look=? WHERE id=?").bind(JSON.stringify(look), sid)]);
  return { ok: true };
});
on("POST", "/api/kid/deco/wear", "student", async ({ db, me, body }) => {
  const slot = String(body.slot || ""); if (!DECO_SLOTS.includes(slot)) throw bad("없는 꾸미기 자리예요");
  const where = body.where === "flag" ? "flag" : "sail", look = parseLook(me.student.look);
  if (body.key) { const d = itemOf(String(body.key)); if (!d || d.slot !== slot) throw bad("없는 꾸미기예요");
    if (!(await db.prepare("SELECT 1 FROM owned WHERE student_id=? AND item=?").bind(me.student.id, d.key).first())) throw bad("아직 없는 꾸미기예요");
    if (slot === "weapon" && d.era > shipOf(me.student.ship).era) throw bad(`${SHIPS.find(s => s.era === d.era).name}부터 장착할 수 있어요`);
    const worn = slot === "att" ? (look.att || []).includes(d.id) : slot === "emblem" ? look[where === "flag" ? "fe" : "se"] === d.id : false;
    if (!worn && !shipReaches(me.student.ship, d)) throw bad(reachNote(d));
    wearItem(look, d, slot === "att" || slot === "emblem" ? !worn : true, where);
  } else if (slot === "emblem") delete look[where === "flag" ? "fe" : "se"]; else delete look[slot];
  await db.prepare("UPDATE students SET look=? WHERE id=?").bind(JSON.stringify(look), me.student.id).run(); return { ok: true };
});
on("POST", "/api/kid/box", "student", async ({ db, me, body }) => {
  const st = me.student, sid = st.id, map = MAPS[int(body.map, 0, MAPS.length - 1)];
  if (await db.prepare("SELECT 1 FROM logs WHERE student_id=? AND kind='box' AND date LIKE ? LIMIT 1").bind(sid, `${kstDate().slice(0, 7)}%`).first()) throw bad("이번 달 상자는 이미 열었어요. 다음 달에 다시 도전해요");
  if ((await powers(db, [st]))[sid] < map.power) throw bad(`${map.name}는 전투력 ${map.power}부터 열려요`);
  const price = boxPrice(map), bal = (await balances(db, [sid]))[sid]; if (bal.points < price) throw bad(`포인트가 ${price - bal.points} 모자라요`);
  const era = WEAPONS.filter(w => w.era === map.id), owned = new Set((await db.prepare("SELECT item FROM owned WHERE student_id=?").bind(sid).all()).results.map(r => r.item));
  const missing = era.filter(w => !owned.has(w.key)); if (!missing.length) throw bad("이 시대 무기를 모두 모았어요");
  // never a duplicate: if the rarity that came up is complete, any weapon still missing takes its place
  const rarity = rollRarity(), fresh = missing.filter(w => w.rarity === rarity), from = fresh.length ? fresh : missing, d = from[randInt(from.length)];
  const lg = await logStmt(db, { student_id: sid, kind: "box", title: `보급 상자(${map.name}): ${d.name}`, points: -price }).run();
  await db.prepare("INSERT OR IGNORE INTO owned (student_id, item, log_id, created_at) VALUES (?,?,?,?)").bind(sid, d.key, lg.meta.last_row_id, Date.now()).run();
  return { ok: true, item: { key: d.key, name: d.name, rarity: d.rarity, slot: "weapon", dup: false, gold: 0 } };
});
on("POST", "/api/kid/upgrade", "student", async ({ db, me, body }) => {
  const u = UPGRADES.find(x => x.id === body.id); if (!u) throw bad("없는 강화예요");
  const sid = me.student.id, have = new Set((await db.prepare("SELECT item FROM owned WHERE student_id=? AND item LIKE ?").bind(sid, `up.${u.id}.%`).all()).results.map(r => r.item));
  if (have.size >= UP_MAX) throw bad("이미 최고 단계예요");
  // the first free level, so a level the teacher cancelled can be bought again
  let level = 1; while (have.has(`up.${u.id}.${level}`)) level++;
  const key = `up.${u.id}.${level}`, price = upPrice(have.size + 1), bal = (await balances(db, [sid]))[sid]; if (bal.gold < price) throw bad(`금화가 ${price - bal.gold}개 모자라요`);
  const r = await db.prepare("INSERT OR IGNORE INTO owned (student_id, item, created_at) VALUES (?,?,?)").bind(sid, key, Date.now()).run(); if (!r.meta.changes) throw bad("이미 강화했어요");
  const lg = await logStmt(db, { student_id: sid, kind: "upgrade", title: `${u.name} ${have.size + 1}단계`, gold: -price }).run();
  await db.prepare("UPDATE owned SET log_id=? WHERE student_id=? AND item=?").bind(lg.meta.last_row_id, sid, key).run();
  return { ok: true };
});
// a ship from an earlier era cannot carry a later weapon, so it comes off when changing ships
function lookForShip(lookText, ship) { const look = parseLook(lookText), w = itemOf(`weapon.${look.weapon}`), removed = !!w && w.era > ship.era; if (removed) delete look.weapon; return { look: JSON.stringify(look), removed }; }
on("POST", "/api/kid/ship/buy", "student", async ({ db, me, body }) => {
  const s = SHIPS.find(x => x.id === body.id); if (!s || !s.price) throw bad("살 수 없는 배예요");
  const sid = me.student.id, key = `ship.${s.id}`, bal = (await balances(db, [sid]))[sid]; if (bal.gold < s.price) throw bad(`금화가 ${s.price - bal.gold}개 모자라요`);
  const r = await db.prepare("INSERT OR IGNORE INTO owned (student_id, item, created_at) VALUES (?,?,?)").bind(sid, key, Date.now()).run(); if (!r.meta.changes) throw bad("이미 가지고 있어요");
  const lg = await logStmt(db, { student_id: sid, kind: "ship", title: `새 배: ${s.name}`, gold: -s.price }).run(), fit = lookForShip(me.student.look, s);
  await db.batch([db.prepare("UPDATE owned SET log_id=? WHERE student_id=? AND item=?").bind(lg.meta.last_row_id, sid, key), db.prepare("UPDATE students SET ship=?, look=? WHERE id=?").bind(s.id, fit.look, sid)]);
  return { ok: true, removed: fit.removed };
});
on("POST", "/api/kid/ship/use", "student", async ({ db, me, body }) => {
  const s = SHIPS.find(x => x.id === body.id); if (!s) throw bad("없는 배예요");
  if (s.price && !(await db.prepare("SELECT 1 FROM owned WHERE student_id=? AND item=?").bind(me.student.id, `ship.${s.id}`).first())) throw bad("아직 없는 배예요");
  const fit = lookForShip(me.student.look, s);
  await db.prepare("UPDATE students SET ship=?, look=? WHERE id=?").bind(s.id, fit.look, me.student.id).run(); return { ok: true, removed: fit.removed };
});
// points turn into gold one to one; there is no way back
on("POST", "/api/kid/exchange", "student", async ({ db, me, body }) => {
  const sid = me.student.id, n = int(body.amount, 10, 100000), bal = (await balances(db, [sid]))[sid]; if (n > bal.points) throw bad("포인트가 모자라요");
  await logStmt(db, { student_id: sid, kind: "exchange", title: "포인트를 금화로", points: -n, gold: n }).run(); return { ok: true };
});
// the homework pass: bought with points, once per calendar month
on("POST", "/api/kid/pass", "student", async ({ db, me }) => {
  const sid = me.student.id, game = await getGame(db), month = kstDate().slice(0, 7), bal = (await balances(db, [sid]))[sid];
  if (await db.prepare("SELECT 1 FROM orders WHERE student_id=? AND month=? AND status<>'canceled' LIMIT 1").bind(sid, month).first()) throw bad("숙제 면제권은 한 달에 한 번만 살 수 있어요");
  if (bal.points < game.passCost) throw bad(`포인트가 ${game.passCost - bal.points} 모자라요`);
  const lg = await logStmt(db, { student_id: sid, kind: "exempt", title: "숙제 면제권", points: -game.passCost }).run();
  await db.prepare("INSERT INTO orders (student_id, name, cost, log_id, month, created_at) VALUES (?,?,?,?,?,?)").bind(sid, "숙제 면제권", game.passCost, lg.meta.last_row_id, month, Date.now()).run();
  return { ok: true };
});
// a battle: the opponent is picked for the attacker, close in power and not yet fought today. Only the attacker can lose gold.
on("POST", "/api/kid/battle", "student", async ({ db, me, body }) => {
  const st = me.student, game = await getGame(db), today = kstDate(), no = battleNo(st, game);
  if (no) throw bad(no);
  const fought = (await db.prepare("SELECT defender FROM battles WHERE attacker=? AND date=?").bind(st.id, today).all()).results.map(r => r.defender);
  if (fought.length >= game.battlesPerDay) throw bad("오늘 전투를 모두 했어요. 내일 다시 해요");
  const mates = (await db.prepare("SELECT id, nickname, sail, look, ship, photo FROM students WHERE class_id=? AND active=1").bind(st.class_id).all()).results, pw = await powers(db, mates);
  const near = mates.filter(m => m.id !== st.id && !fought.includes(m.id)).sort((a, b) => Math.abs(pw[a.id] - pw[st.id]) - Math.abs(pw[b.id] - pw[st.id])).slice(0, 3);
  if (!near.length) throw bad("오늘 겨룰 수 있는 친구가 없어요");
  const opp = near[randInt(near.length)], A = pw[st.id], B = pw[opp.id], aim = int(body.aim ?? 0, 0, BATTLE_AIM_MAX), chance = Math.min(75, Math.max(25, Math.round(A / (A + B) * 100))) + aim, won = randInt(100) < chance;
  if (!(await db.prepare("SELECT 1 FROM logs WHERE student_id=? AND kind='start' LIMIT 1").bind(st.id).first()) && game.startGold) await logStmt(db, { student_id: st.id, kind: "start", title: "첫 전투 준비 금화", gold: game.startGold }).run();
  const bal = (await balances(db, [st.id]))[st.id], delta = won ? game.win : -Math.min(game.lose, bal.gold);
  const ops = [db.prepare("INSERT INTO battles (attacker, defender, winner, a_power, d_power, delta, date, at) VALUES (?,?,?,?,?,?,?,?)").bind(st.id, opp.id, won ? st.id : opp.id, A, B, delta, today, Date.now()),
    logStmt(db, { student_id: st.id, kind: "battle", title: `${opp.nickname}와 전투 ${won ? "승리" : "패배"}`, gold: delta })];
  if (!won && game.defend) ops.push(logStmt(db, { student_id: opp.id, kind: "battle", title: `${st.nickname}의 공격을 막았어요`, gold: game.defend }));
  await db.batch(ops);
  return { ok: true, won, delta, chance, aim, left: game.battlesPerDay - fought.length - 1, rounds: simulate(won),
    me: { nickname: st.nickname, sail: st.sail, look: lookOf(st), ship: st.ship, power: A }, opp: { nickname: opp.nickname, sail: opp.sail, look: lookOf(opp), ship: opp.ship, power: B } };
});

/* ----- live duels: two classmates online at once. Each round both get the same question, with one try and a time limit that grows with the difficulty. A right answer fires, a wrong one doesn't; if both are right the quicker fires first. The server sets and marks the questions. No gold moves; the daily count is separate from ordinary battles. ----- */
// a round lasts longer on the server than the time on screen, because the shots of the last round play first; the first round also waits for the 3D to load
const DUEL_WAIT = 30000, DUEL_FIRST = 45000, DUEL_ONLINE = 25000, DUEL_MAX_ROUNDS = 8;
const duelLimit = round => [10000, 15000, 20000, 20000][Math.min(3, Math.floor((round - 1) / 2))], duelTurn = round => duelLimit(round) + 8000; // changes every two rounds, as the questions in duelq.js do
const duelQ = (d, round) => duelQuestion(`${d.id}:${d.created_at}`, round, d.level);
const duelLeft = async (db, id, game, today = kstDate()) => Math.max(0, game.battlesPerDay - (await db.prepare("SELECT COUNT(*) AS n FROM duels WHERE (a=? OR b=?) AND date=?").bind(id, id, today).first()).n);
const duelRow = (db, id) => db.prepare("SELECT * FROM duels WHERE id=?").bind(id).first();
const duelOpenOf = (db, id) => db.prepare("SELECT * FROM duels WHERE (a=? OR b=?) AND status IN ('wait','live') ORDER BY id DESC LIMIT 1").bind(id, id).first();
async function duelEnd(db, d, winner, forfeit, extra = {}) { const names = (await db.prepare("SELECT id, nickname FROM students WHERE id IN (?,?)").bind(d.a, d.b).all()).results, nick = id => names.find(n => n.id === id)?.nickname || "친구";
  const r = await db.prepare("UPDATE duels SET status='done', winner=?, forfeit=?, round=?, hp_a=?, hp_b=?, log=? WHERE id=? AND status='live' AND round=?").bind(winner, forfeit ? 1 : 0, d.round, extra.hp_a ?? d.hp_a, extra.hp_b ?? d.hp_b, extra.log ?? d.log, d.id, d.round).run(); if (!r.meta.changes) return false;
  const line = (id, opp) => logStmt(db, { student_id: id, kind: "duel", title: `${nick(opp)}${(nick(opp).charCodeAt(nick(opp).length - 1) - 44032) % 28 ? "과" : "와"} 실시간 대결 ${!winner ? "무승부" : winner === id ? "승리" : "패배"}` }); await db.batch([line(d.a, d.b), line(d.b, d.a)]); return true; }
// moves a duel on when both have answered or time is up; safe to call from either player at any moment
async function duelStep(db, d) { const now = Date.now();
  if (d.status === "wait" && now - d.created_at > DUEL_WAIT) { await db.prepare("UPDATE duels SET status='expired' WHERE id=? AND status='wait'").bind(d.id).run(); return duelRow(db, d.id); }
  if (d.status !== "live" || ((d.aim_a == null || d.aim_b == null) && now < d.deadline)) return d;
  const missA = d.aim_a == null ? d.miss_a + 1 : 0, missB = d.aim_b == null ? d.miss_b + 1 : 0, hp = { a: d.hp_a, b: d.hp_b }, shots = [], bothRight = d.aim_a > 0 && d.aim_b > 0, order = bothRight ? (d.aim_a <= d.aim_b ? ["a", "b"] : ["b", "a"]) : ["a", "b"], log = JSON.parse(d.log);
  const edge = (m, o) => Math.max(.8, Math.min(1.2, 1 + (m - o) / (m + o) * .6)); // the stronger ship hits up to 20% harder; a wrong answer still doesn't fire at all
  for (const by of order) { const right = (by === "a" ? d.aim_a : d.aim_b) > 0, to = by === "a" ? "b" : "a", dmg = right ? Math.round((24 + randInt(7)) * (by === "a" ? edge(d.pa, d.pb) : edge(d.pb, d.pa))) : 0; hp[to] = Math.max(0, hp[to] - dmg); shots.push({ by, dmg, hp: { ...hp }, first: bothRight && !shots.length }); if (!hp[to]) break; }
  log.push(shots); const text = JSON.stringify(log); let winner = null, forfeit = false;
  if (!hp.a || !hp.b) winner = hp.a ? d.a : d.b; else if (missA >= 2 && missB >= 2) winner = 0; else if (missA >= 2) { winner = d.b; forfeit = true; } else if (missB >= 2) { winner = d.a; forfeit = true; } else if (d.round >= DUEL_MAX_ROUNDS) winner = hp.a === hp.b ? 0 : hp.a > hp.b ? d.a : d.b;
  if (winner !== null) await duelEnd(db, d, winner, forfeit, { hp_a: hp.a, hp_b: hp.b, log: text });
  else await db.prepare("UPDATE duels SET round=round+1, hp_a=?, hp_b=?, aim_a=NULL, aim_b=NULL, miss_a=?, miss_b=?, deadline=?, log=? WHERE id=? AND round=? AND status='live'").bind(hp.a, hp.b, missA, missB, now + duelTurn(d.round + 1), text, d.id, d.round).run();
  return duelRow(db, d.id); }
// never carries the right answer of a round still being played; "prev" gives it once that round is over
const duelView = (d, sid) => { const mine = d.a === sid ? "a" : "b", now = Date.now(), live = d.status === "live", q = live ? duelQ(d, d.round) : null, past = live ? d.round - 1 : d.round, old = past >= 1 ? duelQ(d, past) : null;
  return { id: d.id, status: d.status, mine, oppId: mine === "a" ? d.b : d.a, round: d.round, hp: { a: d.hp_a, b: d.hp_b }, log: JSON.parse(d.log), winner: d.winner, forfeit: !!d.forfeit, iAimed: (mine === "a" ? d.aim_a : d.aim_b) != null, oppDone: (mine === "a" ? d.aim_b : d.aim_a) != null, ms: Math.max(0, DUEL_WAIT - (now - d.created_at)), left: live ? Math.max(0, d.deadline - now) : 0, limit: live ? duelLimit(d.round) : 0, q: q && { ask: q.ask, text: q.text, opts: q.opts }, prev: old && { text: old.text, real: old.real } }; };
async function duelMine(db, sid, id) { const d = await duelRow(db, id); if (!d || (d.a !== sid && d.b !== sid)) throw new HttpError(404, "없는 대결이에요"); return d; }
const duelGate = (st, game) => { const no = battleNo(st, game); if (no) throw bad(no); };
// asked every few seconds by every open app; "free" means not in the middle of a game, so a kid who is busy doesn't show as ready to duel
on("GET", "/api/kid/duel/poll", "student", async ({ db, me, req }) => { const st = me.student, now = Date.now();
  if (new URL(req.url).searchParams.get("free") === "1" && now - st.seen_at > 10000) await db.prepare("UPDATE students SET seen_at=? WHERE id=?").bind(now, st.id).run();
  const online = (await db.prepare("SELECT id FROM students WHERE class_id=? AND active=1 AND seen_at>? AND id<>?").bind(st.class_id, now - DUEL_ONLINE, st.id).all()).results.map(r => r.id);
  let d = await duelOpenOf(db, st.id); if (d) d = await duelStep(db, d); const open = d && (d.status === "wait" || d.status === "live");
  return { online, invite: open && d.status === "wait" && d.b === st.id ? { id: d.id, from: d.a, ms: Math.max(0, DUEL_WAIT - (now - d.created_at)) } : null, duel: open && (d.status === "live" || d.a === st.id) ? duelView(d, st.id) : null }; });
on("GET", "/api/kid/duel/:id", "student", async ({ db, me, params }) => duelView(await duelStep(db, await duelMine(db, me.student.id, Number(params.id))), me.student.id));
on("POST", "/api/kid/duel/challenge/:id", "student", async ({ db, me, params }) => { const st = me.student, target = Number(params.id), game = await getGame(db); duelGate(st, game);
  if (target === st.id) throw bad("나와는 대결할 수 없어요"); const t = await db.prepare("SELECT id, seen_at FROM students WHERE id=? AND class_id=? AND active=1").bind(target, st.class_id).first(); if (!t) throw bad("같은 반 친구에게만 신청할 수 있어요"); if (Date.now() - t.seen_at > DUEL_ONLINE) throw bad("친구가 지금 접속해 있지 않아요");
  if (await duelLeft(db, st.id, game) <= 0) throw bad("오늘 실시간 대결을 모두 했어요. 내일 다시 해요"); if (await duelLeft(db, target, game) <= 0) throw bad("친구가 오늘 실시간 대결을 모두 했어요");
  for (const id of [st.id, target]) { let o = await duelOpenOf(db, id); if (o) o = await duelStep(db, o); if (o && (o.status === "wait" || o.status === "live")) throw bad(id === st.id ? "이미 진행 중인 대결이 있어요" : "친구가 지금 다른 대결 중이에요"); }
  const r = await db.prepare("INSERT INTO duels (class_id, a, b, level, created_at) VALUES (?,?,?,?,?)").bind(st.class_id, st.id, target, st.class_level || 0, Date.now()).run(); return { id: r.meta.last_row_id }; });
on("POST", "/api/kid/duel/:id/answer", "student", async ({ db, me, params, body }) => { const st = me.student, game = await getGame(db); let d = await duelStep(db, await duelMine(db, st.id, Number(params.id))); if (d.b !== st.id) throw bad("받은 신청이 아니에요"); if (d.status !== "wait") throw bad("이미 끝난 신청이에요");
  if (!body.accept) { await db.prepare("UPDATE duels SET status='declined' WHERE id=? AND status='wait'").bind(d.id).run(); return { ok: true }; } duelGate(st, game);
  if (await duelLeft(db, d.a, game) <= 0 || await duelLeft(db, d.b, game) <= 0) { await db.prepare("UPDATE duels SET status='expired' WHERE id=?").bind(d.id).run(); throw bad("오늘 실시간 대결을 모두 했어요"); }
  const rows = (await db.prepare("SELECT id, ship, look, photo FROM students WHERE id IN (?,?)").bind(d.a, d.b).all()).results, pw = await powers(db, rows);
  const r = await db.prepare("UPDATE duels SET status='live', date=?, round=1, pa=?, pb=?, deadline=? WHERE id=? AND status='wait'").bind(kstDate(), pw[d.a], pw[d.b], Date.now() + DUEL_FIRST, d.id).run(); if (!r.meta.changes) throw bad("이미 끝난 신청이에요"); return { ok: true }; });
// one try per round: what is stored is 0 for wrong, otherwise how long the right answer took. The screen sends pick -1 when its time runs out, so a child still there isn't counted as gone.
on("POST", "/api/kid/duel/:id/aim", "student", async ({ db, me, params, body }) => { const sid = me.student.id; let d = await duelMine(db, sid, Number(params.id)), col = d.a === sid ? "aim_a" : "aim_b"; const round = int(body.round, 1, DUEL_MAX_ROUNDS), pick = int(body.pick, -1, 3), now = Date.now(), right = d.status === "live" && round === d.round && now <= d.deadline && pick === duelQ(d, round).realIdx, took = right ? Math.max(1, duelTurn(round) - (d.deadline - now)) : 0;
  const r = await db.prepare(`UPDATE duels SET ${col}=? WHERE id=? AND round=? AND status='live' AND ${col} IS NULL AND deadline>=?`).bind(took, d.id, round, now).run(); return { ...duelView(await duelStep(db, await duelRow(db, d.id)), sid), right: right && !!r.meta.changes }; });
on("POST", "/api/kid/duel/:id/quit", "student", async ({ db, me, params }) => { const sid = me.student.id, d = await duelMine(db, sid, Number(params.id));
  if (d.status === "wait") await db.prepare("UPDATE duels SET status=? WHERE id=? AND status='wait'").bind(d.a === sid ? "cancelled" : "declined", d.id).run(); else if (d.status === "live") await duelEnd(db, d, d.a === sid ? d.b : d.a, true); return { ok: true }; });

/* ----- photo sails ----- */
// gold is paid when asking and handed back if the photo is turned down, so approval can never fail for lack of gold
on("POST", "/api/kid/photo", "student", async ({ db, me, body }) => {
  const sid = me.student.id, m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+=*)$/.exec(String(body.data || ""));
  if (!m || m[1].length > PHOTO_MAX_CHARS) throw bad("사진을 다시 골라 주세요");
  if (!atob(m[1].slice(0, 8)).startsWith("\xFF\xD8\xFF")) throw bad("사진을 다시 골라 주세요");
  const used = (await db.prepare("SELECT COUNT(*) AS n FROM photos WHERE student_id=? AND date>=?").bind(sid, kstWeekStart()).first()).n;
  if (used >= PHOTO_PER_WEEK) throw bad(`사진 신청은 일주일에 ${PHOTO_PER_WEEK}번까지 할 수 있어요`);
  const gold = (await balances(db, [sid]))[sid].gold; if (gold < PHOTO_PRICE) throw bad(`금화가 ${PHOTO_PRICE - gold}개 모자라요`);
  const r = await db.prepare("INSERT OR IGNORE INTO photos (student_id, data, date, created_at) VALUES (?,?,?,?)").bind(sid, m[1], kstDate(), Date.now()).run();
  if (!r.meta.changes) throw bad("이미 선생님께 확인을 요청한 사진이 있어요");
  const lg = await logStmt(db, { student_id: sid, kind: "photo", title: "사진 돛 신청", gold: -PHOTO_PRICE }).run();
  await db.prepare("UPDATE photos SET log_id=? WHERE id=?").bind(lg.meta.last_row_id, r.meta.last_row_id).run();
  return { ok: true };
});
// a photo that is not used any more loses its picture data for good; turned down or cancelled ones also get their gold back
const refundPhoto = (db, p, status) => [db.prepare("UPDATE photos SET status=?, data='', decided_at=? WHERE id=?").bind(status, Date.now(), p.id), db.prepare("DELETE FROM logs WHERE id=?").bind(p.log_id)];
on("POST", "/api/kid/photo/cancel", "student", async ({ db, me }) => {
  const p = await db.prepare("SELECT id, log_id FROM photos WHERE student_id=? AND status='pending'").bind(me.student.id).first(); if (!p) throw bad("이미 선생님이 확인한 사진이에요");
  await db.batch(refundPhoto(db, p, "canceled")); return { ok: true };
});
const takeDownPhoto = (db, photoId) => [db.prepare("UPDATE photos SET status='removed', data='', decided_at=? WHERE id=? AND status='approved'").bind(Date.now(), photoId), db.prepare("UPDATE students SET photo=0 WHERE photo=?").bind(photoId)];
on("POST", "/api/kid/photo/remove", "student", async ({ db, me }) => {
  if (!me.student.photo) throw bad("달려 있는 사진이 없어요");
  await db.batch(takeDownPhoto(db, me.student.photo)); return { ok: true };
});
// an approved photo is seen only by its own class; a waiting one only by its owner and the teacher
on("GET", "/api/photo/:id", "any", async ({ db, me, params }) => {
  const p = await db.prepare("SELECT p.data, p.status, p.student_id, s.class_id FROM photos p JOIN students s ON s.id=p.student_id WHERE p.id=?").bind(params.id).first();
  const allowed = p && p.data && (me.role === "teacher" || p.student_id === me.student.id || (p.status === "approved" && p.class_id === me.student.class_id));
  if (!allowed) throw new HttpError(404, "없는 사진이에요");
  return new Response(Uint8Array.from(atob(p.data), c => c.charCodeAt(0)), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff" } });
});
on("POST", "/api/t/photos/:id/approve", "teacher", async ({ db, params }) => {
  const p = await db.prepare("SELECT p.id, p.student_id, s.photo AS old FROM photos p JOIN students s ON s.id=p.student_id WHERE p.id=? AND p.status='pending'").bind(params.id).first(); if (!p) throw bad("이미 처리된 사진이에요");
  const ops = [db.prepare("UPDATE photos SET status='approved', decided_at=? WHERE id=?").bind(Date.now(), p.id), db.prepare("UPDATE students SET photo=? WHERE id=?").bind(p.id, p.student_id)];
  if (p.old) ops.push(db.prepare("UPDATE photos SET status='replaced', data='', decided_at=? WHERE id=?").bind(Date.now(), p.old));
  await db.batch(ops); return { ok: true };
});
on("POST", "/api/t/photos/:id/reject", "teacher", async ({ db, params }) => {
  const p = await db.prepare("SELECT id, log_id FROM photos WHERE id=? AND status='pending'").bind(params.id).first(); if (!p) throw bad("이미 처리된 사진이에요");
  await db.batch(refundPhoto(db, p, "rejected")); return { ok: true };
});
on("POST", "/api/t/photos/:id/remove", "teacher", async ({ db, params }) => { await db.batch(takeDownPhoto(db, Number(params.id))); return { ok: true }; });

/* ----- teacher ----- */
on("GET", "/api/t/state", "teacher", async ({ db, me }) => {
  const today = kstDate(), game = await getGame(db);
  const classes = (await db.prepare("SELECT id, name, code, battle, battle_times, days, daily_bonus, level FROM classes WHERE active=1 ORDER BY name").all()).results;
  const students = (await db.prepare("SELECT id, class_id, nickname, sail, look, ship, photo, must_change, locked_until, focus FROM students WHERE active=1 ORDER BY nickname").all()).results;
  const bal = await balances(db, students.map(s => s.id)), pw = await powers(db, students);
  for (const s of students) { s.bal = bal[s.id]; s.power = pw[s.id]; s.look = lookOf(s); s.locked = s.locked_until > Date.now(); delete s.locked_until; s.focus = focusOf(s); }
  const quests = (await db.prepare("SELECT id, title, subject, kind, energy, active, class_id FROM quests WHERE deleted=0 ORDER BY active DESC, subject, kind, id").all()).results;
  const requests = (await db.prepare(`SELECT r.id, r.student_id, r.quest_id, r.created_at, q.title, q.energy + CASE WHEN q.kind='daily' THEN c.daily_bonus ELSE 0 END AS energy, q.subject FROM requests r JOIN quests q ON q.id=r.quest_id JOIN students s ON s.id=r.student_id JOIN classes c ON c.id=s.class_id WHERE r.status='pending' AND s.active=1 ORDER BY r.id`).all()).results;
  const orders = (await db.prepare("SELECT o.id, o.student_id, o.name, o.cost, o.created_at FROM orders o JOIN students s ON s.id=o.student_id WHERE o.status='pending' AND s.active=1 ORDER BY o.id").all()).results;
  const battles = (await db.prepare("SELECT b.id, b.winner, b.attacker, b.delta, b.at, a.nickname AS a_name, d.nickname AS d_name FROM battles b JOIN students a ON a.id=b.attacker JOIN students d ON d.id=b.defender WHERE b.date=? ORDER BY b.id DESC LIMIT 60").bind(today).all()).results;
  const photos = (await db.prepare("SELECT p.id, p.student_id, p.created_at FROM photos p JOIN students s ON s.id=p.student_id WHERE p.status='pending' AND s.active=1 ORDER BY p.id").all()).results;
  const feedback = (await db.prepare("SELECT f.id, f.student_id, f.text, f.at, f.seen FROM feedback f JOIN students s ON s.id=f.student_id WHERE s.active=1 ORDER BY f.id DESC LIMIT 60").all()).results;
  const bosses = [];
  for (const c of classes) { const b = await currentBoss(db, c.id, game); if (!b) continue;
    const tot = (await db.prepare("SELECT student_id AS id, SUM(dmg) AS dmg FROM boss_hits WHERE boss_id=? GROUP BY student_id").bind(b.id).all()).results;
    bosses.push({ classId: c.id, name: BOSSES[b.kind].name, hp: b.hp, left: Math.max(0, b.hp - tot.reduce((n, x) => n + x.dmg, 0)), down: !!b.defeated_at, gold: b.gold, hits: tot.filter(x => x.id).sort((x, y) => y.dmg - x.dmg) }); }
  return { teacher: me.teacher.username, game, classes, students, quests, requests, orders, photos, feedback, battles, bosses, teacherDmg: BOSS_TEACHER_DMG, seas: MAPS.map(m => ({ name: m.name, power: m.power })), ships: SHIPS, kinds: KINDS, subjects: SUBJECTS };
});
// the wrong-answer report: every child's counts per kind of question over the last few days; the page adds them up by class
on("GET", "/api/t/report/:days", "teacher", async ({ db, params }) => {
  const days = int(params.days, 1, ANSWER_DAYS);
  return { days, rows: (await db.prepare("SELECT a.student_id AS id, a.level, a.tag, SUM(a.tries) AS tries, SUM(a.wrong) AS wrong FROM answers a JOIN students s ON s.id=a.student_id WHERE s.active=1 AND a.date>=? GROUP BY a.student_id, a.level, a.tag").bind(kstDate(Date.now() - (days - 1) * 864e5)).all()).results };
});
on("GET", "/api/t/report/student/:id", "teacher", async ({ db, params }) => ({ misses: (await db.prepare("SELECT tag, level, lines, answer, how, at FROM misses WHERE student_id=? ORDER BY id DESC LIMIT 20").bind(params.id).all()).results.map(m => ({ ...m, lines: JSON.parse(m.lines) })) }));
// the teacher's own shot, for a class that did well in the lesson or a boss set too strong
on("POST", "/api/t/classes/:id/bossfire", "teacher", async ({ db, params }) => {
  const cls = Number(params.id), hit = (await hitBosses(db, await getGame(db), [{ sid: 0, cls, dmg: BOSS_TEACHER_DMG, src: "teacher" }]))[cls];
  if (!hit) throw bad("이번 주 보스가 없거나 이미 격파했어요"); return { ok: true, ...hit };
});
on("POST", "/api/t/grant", "teacher", async ({ db, body }) => {
  const q = await db.prepare("SELECT * FROM quests WHERE id=? AND deleted=0").bind(int(body.questId, 1)).first(); if (!q) throw bad("미션을 골라 주세요");
  return giveEnergy(db, await getGame(db), [...new Set((body.studentIds || []).map(x => int(x, 1)))].slice(0, 200).map(sid => ({ sid, quest: q })));
});
on("POST", "/api/t/requests/approve", "teacher", async ({ db, body }) => {
  const pairs = []; for (const id of (body.ids || []).map(x => int(x, 1)).slice(0, 100)) { const r = await db.prepare("SELECT * FROM requests WHERE id=? AND status='pending'").bind(id).first(); if (!r) continue;
    const q = await db.prepare("SELECT * FROM quests WHERE id=?").bind(r.quest_id).first(); if (q) pairs.push({ sid: r.student_id, quest: q, requestId: r.id }); }
  return giveEnergy(db, await getGame(db), pairs);
});
on("POST", "/api/t/requests/reject", "teacher", async ({ db, body }) => { for (const id of (body.ids || []).map(x => int(x, 1)).slice(0, 100)) await db.prepare("UPDATE requests SET status='rejected', decided_at=? WHERE id=? AND status='pending'").bind(Date.now(), id).run(); return { ok: true }; });
on("POST", "/api/t/orders/:id/deliver", "teacher", async ({ db, params }) => { await db.prepare("UPDATE orders SET status='delivered', decided_at=? WHERE id=? AND status='pending'").bind(Date.now(), params.id).run(); return { ok: true }; });
on("POST", "/api/t/orders/:id/cancel", "teacher", async ({ db, params }) => {
  const o = await db.prepare("SELECT * FROM orders WHERE id=? AND status='pending'").bind(params.id).first(); if (!o) throw bad("이미 처리된 면제권이에요");
  await db.batch([db.prepare("UPDATE orders SET status='canceled', decided_at=? WHERE id=?").bind(Date.now(), o.id), db.prepare("DELETE FROM logs WHERE id=?").bind(o.log_id)]); return { ok: true };
});
on("POST", "/api/t/focus", "teacher", async ({ db, body }) => {
  const ids = [...new Set([].concat(body.studentIds || []).map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 300), tags = [...new Set([].concat(body.tags || []).map(t => clip(t, 20)).filter(Boolean))].slice(0, 3);
  if (!ids.length) throw bad("학생을 골라 주세요");
  await db.batch(ids.map(id => db.prepare("UPDATE students SET focus=? WHERE id=? AND active=1").bind(tags.length ? JSON.stringify(tags) : "", id))); return { ok: true, count: ids.length };
});
const FEEDBACK_PER_DAY = 5;
on("POST", "/api/kid/feedback", "student", async ({ db, me, body }) => {
  if (!(await getGame(db)).feedbackOn) throw bad("지금은 의견을 받지 않아요");
  const sid = me.student.id, date = kstDate(), text = clip(String(body.text ?? "").trim(), 300); if (text.length < 2) throw bad("두 글자 이상 적어 주세요");
  if ((await db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE student_id=? AND date=?").bind(sid, date).first()).n >= FEEDBACK_PER_DAY) throw bad(`의견은 하루에 ${FEEDBACK_PER_DAY}번까지 보낼 수 있어요`);
  await db.prepare("INSERT INTO feedback (student_id, text, date, at) VALUES (?,?,?,?)").bind(sid, text, date, Date.now()).run(); return { ok: true };
});
on("POST", "/api/t/feedback/seen", "teacher", async ({ db, body }) => { const ids = [].concat(body.ids || []).map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 100); if (ids.length) await db.batch(ids.map(id => db.prepare("UPDATE feedback SET seen=1 WHERE id=?").bind(id))); return { ok: true }; });
on("POST", "/api/t/feedback/switch", "teacher", async ({ db }) => { const cur = await getGame(db), on = cur.feedbackOn ? 0 : 1; await db.prepare("INSERT INTO settings (key, value) VALUES ('game', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({ ...cur, feedbackOn: on })).run(); return { ok: true, on: !!on }; });
const LOG_DAY_MAX = 1000;
on("GET", "/api/t/logs/:date", "teacher", async ({ db, params }) => {
  const today = kstDate(), date = params.date === "0" ? today : String(params.date).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw bad("날짜를 확인해 주세요");
  const rows = (await db.prepare("SELECT id, student_id, kind, title, energy, points, gold, at FROM logs WHERE date=? ORDER BY id DESC LIMIT ?").bind(date, LOG_DAY_MAX + 1).all()).results;
  return { date, today, logs: rows.slice(0, LOG_DAY_MAX), more: rows.length > LOG_DAY_MAX };
});
on("POST", "/api/t/logs/:id/undo", "teacher", async ({ db, params }) => {
  const l = await db.prepare("SELECT * FROM logs WHERE id=?").bind(params.id).first(); if (!l) throw bad("이미 취소된 기록이에요");
  if (l.kind === "exempt") throw bad("면제권은 '확인할 것'에서 취소해 주세요");
  if (l.kind === "photo") throw bad("사진 돛은 '확인할 것'에서 처리해 주세요");
  const ops = [db.prepare("DELETE FROM logs WHERE id=?").bind(l.id)];
  // a mission or game taken back also takes back its shot, unless the boss has already gone down
  if (l.kind === "quest" || (l.kind === "game" && /별 \d개$/.test(l.title))) ops.push(db.prepare("DELETE FROM boss_hits WHERE id=(SELECT h.id FROM boss_hits h JOIN bosses b ON b.id=h.boss_id WHERE h.student_id=? AND h.src=? AND b.defeated_at=0 ORDER BY h.id DESC LIMIT 1)").bind(l.student_id, l.kind));
  if (l.kind === "deco" || l.kind === "ship" || l.kind === "upgrade" || l.kind === "box") { const o = await db.prepare("SELECT item FROM owned WHERE log_id=?").bind(l.id).first(), st = await db.prepare("SELECT look, ship FROM students WHERE id=?").bind(l.student_id).first();
    if (o && st) { ops.push(db.prepare("DELETE FROM owned WHERE log_id=?").bind(l.id));
      if (l.kind === "deco" || l.kind === "box") { const d = itemOf(o.item); if (d) ops.push(db.prepare("UPDATE students SET look=? WHERE id=?").bind(JSON.stringify(wearItem(parseLook(st.look), d, false, "both")), l.student_id)); }
      else if (`ship.${st.ship}` === o.item) ops.push(db.prepare("UPDATE students SET ship='dinghy' WHERE id=?").bind(l.student_id)); } }
  await db.batch(ops); return { ok: true };
});
on("POST", "/api/t/adjust", "teacher", async ({ db, body }) => {
  const amt = int(body.amount, -100000, 100000); if (!amt) throw bad("숫자를 넣어 주세요");
  const type = ["energy", "points", "gold"].includes(body.type) ? body.type : "points";
  await logStmt(db, { student_id: int(body.studentId, 1), kind: "adjust", title: String(body.title || "선생님 조정").slice(0, 40), [type]: amt }).run(); return { ok: true };
});
on("POST", "/api/t/classes", "teacher", async ({ db, body }) => {
  let code; for (let i = 0; i < 6; i++) { code = classCode(); if (!(await db.prepare("SELECT 1 FROM classes WHERE code=?").bind(code).first())) break; }
  await db.prepare("INSERT INTO classes (name, code, level, created_at) VALUES (?,?,?,?)").bind(str(body.name, 20), code, body.level ? 1 : 0, Date.now()).run(); return { ok: true, code };
});
on("POST", "/api/t/classes/:id/battle", "teacher", async ({ db, params, body }) => { await db.prepare("UPDATE classes SET battle=? WHERE id=?").bind(body.on ? 1 : 0, params.id).run(); return { ok: true }; });
on("POST", "/api/t/classes/:id/btimes", "teacher", async ({ db, params, body }) => { const times = normTimes(body.times); await db.prepare("UPDATE classes SET battle_times=? WHERE id=?").bind(times, params.id).run(); return { ok: true, times }; });
on("POST", "/api/t/classes/:id/days", "teacher", async ({ db, params, body }) => { const days = [...new Set(String(body.days || "").replace(/[^0-6]/g, ""))].sort().join(""); if (!days) throw bad("수업 요일을 하루 이상 골라 주세요"); await db.prepare("UPDATE classes SET days=? WHERE id=?").bind(days, params.id).run(); return { ok: true }; });
on("POST", "/api/t/classes/:id/bonus", "teacher", async ({ db, params, body }) => { await db.prepare("UPDATE classes SET daily_bonus=? WHERE id=?").bind(int(body.bonus, 0, 10), params.id).run(); return { ok: true }; });
on("POST", "/api/t/classes/:id/level", "teacher", async ({ db, params, body }) => { await db.prepare("UPDATE classes SET level=? WHERE id=?").bind(body.level ? 1 : 0, params.id).run(); return { ok: true }; });
on("POST", "/api/t/classes/:id/delete", "teacher", async ({ db, params }) => {
  await db.batch([db.prepare("DELETE FROM answers WHERE student_id IN (SELECT id FROM students WHERE class_id=?)").bind(params.id), db.prepare("DELETE FROM misses WHERE student_id IN (SELECT id FROM students WHERE class_id=?)").bind(params.id),
    db.prepare("DELETE FROM sessions WHERE role='student' AND user_id IN (SELECT id FROM students WHERE class_id=?)").bind(params.id), db.prepare("UPDATE classes SET active=0 WHERE id=?").bind(params.id),
    db.prepare("UPDATE photos SET status='removed', data='' WHERE student_id IN (SELECT id FROM students WHERE class_id=?)").bind(params.id), db.prepare("UPDATE students SET active=0, photo=0 WHERE class_id=?").bind(params.id)]); return { ok: true };
});
async function newStudent(db, classId, nickname, pin, mustChange) {
  if (await db.prepare("SELECT 1 FROM students WHERE class_id=? AND nickname=? AND active=1").bind(classId, nickname).first()) throw bad(`이 반에 '${nickname}' 이름이 이미 있어요`);
  const h = await hashSecret(pin);
  return db.prepare("INSERT INTO students (class_id, nickname, sail, pin_hash, salt, must_change, created_at) VALUES (?,?,?,?,?,?,?)").bind(classId, nickname, randInt(SAILS), h.hash, h.salt, mustChange, Date.now()).run();
}
on("POST", "/api/t/students", "teacher", async ({ db, body }) => {
  const classId = int(body.classId, 1); if (!(await db.prepare("SELECT 1 FROM classes WHERE id=? AND active=1").bind(classId).first())) throw bad("반을 먼저 골라 주세요");
  const names = String(body.names || "").split(/\n|,/).map(s => s.trim()).filter(Boolean); if (!names.length) throw bad("이름을 넣어 주세요");
  if (names.length > 60) throw bad("한 번에 60명까지 등록할 수 있어요");
  const nicks = names.map(n => str(n, 12)), taken = new Set((await db.prepare("SELECT nickname FROM students WHERE class_id=? AND active=1").bind(classId).all()).results.map(r => r.nickname));
  const inClass = [...new Set(nicks.filter(n => taken.has(n)))], twice = [...new Set(nicks.filter((n, i) => nicks.indexOf(n) !== i))].filter(n => !taken.has(n));
  if (inClass.length || twice.length) throw bad(`아무도 등록하지 않았어요. ${inClass.length ? `이 반에 이미 있는 이름: ${inClass.join(", ")}. ` : ""}${twice.length ? `두 번 적은 이름: ${twice.join(", ")}. ` : ""}고친 뒤 다시 눌러 주세요`);
  const created = [], rows = [], now = Date.now();
  for (const nick of nicks) { const pin = randomPin(), h = await hashSecret(pin); rows.push(db.prepare("INSERT INTO students (class_id, nickname, sail, pin_hash, salt, must_change, created_at) VALUES (?,?,?,?,?,1,?)").bind(classId, nick, randInt(SAILS), h.hash, h.salt, now)); created.push({ nickname: nick, pin }); }
  await db.batch(rows);
  return { ok: true, created };
});
on("POST", "/api/t/students/:id/reset-pin", "teacher", async ({ db, params }) => {
  const pin = randomPin(), h = await hashSecret(pin);
  await db.batch([db.prepare("UPDATE students SET pin_hash=?, salt=?, must_change=1, failed=0, locked_until=0 WHERE id=?").bind(h.hash, h.salt, params.id), db.prepare("DELETE FROM sessions WHERE role='student' AND user_id=?").bind(params.id)]); return { ok: true, pin };
});
on("POST", "/api/t/students/:id/delete", "teacher", async ({ db, params }) => { await db.batch([db.prepare("DELETE FROM answers WHERE student_id=?").bind(params.id), db.prepare("DELETE FROM misses WHERE student_id=?").bind(params.id), db.prepare("UPDATE photos SET status='removed', data='' WHERE student_id=?").bind(params.id), db.prepare("UPDATE students SET active=0, photo=0 WHERE id=?").bind(params.id), db.prepare("DELETE FROM sessions WHERE role='student' AND user_id=?").bind(params.id)]); return { ok: true }; });
on("POST", "/api/t/quests", "teacher", async ({ db, body }) => {
  const cls = int(body.classId || 0, 0, 1e9), d = [str(body.title, 40), SUBJECTS.includes(body.subject) ? body.subject : "공통", KINDS.includes(body.kind) ? body.kind : "daily", int(body.energy, 0, 50), cls];
  if (cls && !(await db.prepare("SELECT 1 FROM classes WHERE id=? AND active=1").bind(cls).first())) throw bad("없는 반이에요");
  if (body.id) await db.prepare("UPDATE quests SET title=?, subject=?, kind=?, energy=?, class_id=? WHERE id=?").bind(...d, int(body.id, 1)).run();
  else await db.prepare("INSERT INTO quests (title, subject, kind, energy, class_id) VALUES (?,?,?,?,?)").bind(...d).run(); return { ok: true };
});
on("POST", "/api/t/quests/:id/toggle", "teacher", async ({ db, params }) => { await db.prepare("UPDATE quests SET active=1-active WHERE id=?").bind(params.id).run(); return { ok: true }; });
on("POST", "/api/t/quests/:id/delete", "teacher", async ({ db, params }) => { await db.batch([db.prepare("UPDATE quests SET deleted=1, active=0 WHERE id=?").bind(params.id), db.prepare("UPDATE requests SET status='canceled' WHERE quest_id=? AND status='pending'").bind(params.id)]); return { ok: true }; });
on("POST", "/api/t/game", "teacher", async ({ db, body }) => {
  const cur = await getGame(db), n = (k, lo, hi) => int(body[k] ?? cur[k], lo, hi);
  const next = { ...cur, energyMax: n("energyMax", 1, 200), playCost: n("playCost", 0, 20), passCost: n("passCost", 1, 100000), battlesPerDay: n("battlesPerDay", 0, 20), win: n("win", 0, 10000), lose: n("lose", 0, 10000), defend: n("defend", 0, 10000), hourFrom: n("hourFrom", 0, 24), hourTo: n("hourTo", 0, 24), bossHp: n("bossHp", 0, 1000), bossGold: n("bossGold", 0, 10000) };
  await db.prepare("INSERT INTO settings (key, value) VALUES ('game', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(next)).run(); return { ok: true };
});
on("POST", "/api/t/password", "teacher", async ({ db, me, body }) => {
  const pw = String(body.password || ""); if (pw.length < 4) throw bad("비밀번호는 4자 이상으로 정해 주세요");
  const h = await hashSecret(pw); await db.prepare("UPDATE teachers SET pass_hash=?, salt=? WHERE id=?").bind(h.hash, h.salt, me.teacher.id).run(); return { ok: true };
});
// demo class for showing the program to other teachers
on("POST", "/api/t/demo", "teacher", async ({ db }) => {
  let code; for (let i = 0; i < 6; i++) { code = classCode(); if (!(await db.prepare("SELECT 1 FROM classes WHERE code=?").bind(code).first())) break; }
  const cls = await db.prepare("INSERT INTO classes (name, code, created_at) VALUES (?,?,?)").bind("시연반", code, Date.now()).run(), classId = cls.meta.last_row_id;
  for (const n of ["김하늘", "이서준", "박지우", "최예린", "정도윤", "한소율", "윤시우", "강다은"]) await newStudent(db, classId, n, "1234", 0);
  if (!(await db.prepare("SELECT 1 FROM quests WHERE deleted=0 LIMIT 1").first())) await db.batch([["영어 단어 20개 외우기", "영어", "daily", 1], ["영어 듣기 숙제 완료", "영어", "daily", 1], ["수학 숙제 다 풀기", "수학", "daily", 2], ["수학 오답노트 정리", "수학", "weekly", 3], ["영어 일기 한 편 쓰기", "영어", "weekly", 3], ["단원평가 100점", "수학", "challenge", 5], ["친구 도와주기", "공통", "challenge", 2]].map(q => db.prepare("INSERT INTO quests (title, subject, kind, energy) VALUES (?,?,?,?)").bind(...q)));
  const studs = (await db.prepare("SELECT id FROM students WHERE class_id=?").bind(classId).all()).results;
  await db.batch(studs.map(s => logStmt(db, { student_id: s.id, kind: "adjust", title: "시연용 행동력", energy: 5 })));
  return { ok: true, code, pin: "1234" };
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method === "POST") { const origin = req.headers.get("origin"); if (origin && new URL(origin).host !== url.host) return json({ error: "잘못된 요청이에요" }, 403); }
    const route = routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!route) return json({ error: "없는 주소예요" }, 404);
    try {
      const db = env.DB, me = route.role ? await auth(req, db) : null;
      if (route.role && (!me || (route.role !== "any" && me.role !== route.role))) return json({ error: "다시 로그인해 주세요" }, 401);
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const out = await route.fn({ db, env, me, body, params: url.pathname.match(route.re).groups || {}, url, req });
      if (out instanceof Response) return out;
      const headers = {}; if (out && out._cookie) { headers["set-cookie"] = out._cookie; delete out._cookie; }
      return json(out, 200, headers);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e); return json({ error: "잠시 문제가 생겼어요. 다시 시도해 주세요" }, 500);
    }
  }
};
