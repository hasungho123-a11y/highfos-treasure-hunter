// 하이포스 방학 트레저헌터 · Cloudflare Worker (API) — static files are served from ./public
const SESSION_DAYS = { teacher: 14, student: 60 };
const PBKDF2_ITER = 60000;
const MAX_FAILED = 5;
const LOCK_MS = 10 * 60 * 1000;
const SAILS = 10;
const SUBJECTS = ["영어", "수학", "공통"];
const KINDS = ["daily", "weekly", "challenge"];
const RARITIES = ["보통", "희귀", "전설"];
const DEFAULT_SEASON = { id: "v1", name: "겨울 방학 항해", routeLen: 20, treasureEvery: 4, arrivalPoints: 100, weeklyClassGoal: 60 };
const DEFAULT_POOL = [
  ["칭찬 스티커 3장", "보통", 28, 0], ["젤리 한 봉지", "보통", 24, 0], ["보너스 10포인트", "보통", 16, 10],
  ["간식 쿠폰", "희귀", 12, 0], ["자리 우선 선택권", "희귀", 9, 0], ["보너스 50포인트", "희귀", 5, 50],
  ["숙제 1회 면제권", "희귀", 5, 0], ["치킨 한 마리", "전설", 1, 0]
];
const DEFAULT_SHOP = [
  ["젤리 한 봉지", "선물", 30], ["아이스크림", "선물", 50], ["예쁜 문구 세트", "선물", 80], ["작은 장난감 뽑기", "선물", 120],
  ["음악 선곡권", "특권", 30], ["자리 우선 선택권", "특권", 40], ["선생님과 미니게임", "특권", 60], ["숙제 1회 면제권", "특권", 100]
];
const BADGES = [
  { key: "eng", name: "영어 항해사", desc: "영어 미션 10회" },
  { key: "math", name: "수학 항해사", desc: "수학 미션 10회" },
  { key: "chest", name: "첫 보물", desc: "보물 상자 첫 개봉" },
  { key: "days", name: "성실 선원", desc: "서로 다른 10일 미션 완료" },
  { key: "arrive", name: "첫 도착", desc: "도착 항구 첫 도착" },
  { key: "legend", name: "전설의 보물", desc: "전설 등급 보물 획득" }
];

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = m => new HttpError(400, m);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const kstDate = (ms = Date.now()) => new Date(ms + 9 * 36e5).toISOString().slice(0, 10);
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
const cookie = (token, days) => `th_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
const readCookie = req => { const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)th_session=([a-f0-9]{64})/); return m ? m[1] : null; };
const dpos = (t, L) => t <= 0 ? 0 : ((t - 1) % L) + 1;
const voyageOf = (t, L) => t <= 0 ? 1 : Math.floor((t - 1) / L) + 1;
const isChest = (p, s) => p > 0 && p < s.routeLen && p % s.treasureEvery === 0;
const grpId = () => "g" + Date.now().toString(36) + randHex(3);

async function getSeason(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key='season'").first();
  return { ...DEFAULT_SEASON, ...(row ? JSON.parse(row.value) : {}) };
}
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
    const st = await db.prepare("SELECT s.*, c.name AS class_name, c.code AS class_code FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND s.active=1 AND c.active=1").bind(s.user_id).first();
    return st ? { role: "student", token: t, student: st } : null;
  }
  const te = await db.prepare("SELECT id, username FROM teachers WHERE id=?").bind(s.user_id).first();
  return te ? { role: "teacher", token: t, teacher: te } : null;
}

/* ---------- derived numbers ---------- */
async function statsFor(db, season, ids) {
  const out = {};
  for (const id of ids) out[id] = { moves: 0, points: 0, weekMoves: 0, eng: 0, math: 0, days: 0, arrivals: 0, opened: 0, legend: 0, closed: 0 };
  if (!ids.length) return out;
  const ws = kstWeekStart();
  for (let i = 0; i < ids.length; i += 80) {
    const part = ids.slice(i, i + 80), ph = part.map(() => "?").join(",");
    const r1 = await db.prepare(`SELECT student_id AS id,
        SUM(CASE WHEN season=? THEN moves ELSE 0 END) AS moves, SUM(points) AS points,
        SUM(CASE WHEN date>=? THEN moves ELSE 0 END) AS weekMoves,
        SUM(CASE WHEN kind='quest' AND subject='영어' THEN 1 ELSE 0 END) AS eng,
        SUM(CASE WHEN kind='quest' AND subject='수학' THEN 1 ELSE 0 END) AS math,
        COUNT(DISTINCT CASE WHEN kind='quest' THEN date END) AS days,
        SUM(CASE WHEN kind='arrive' THEN 1 ELSE 0 END) AS arrivals
      FROM logs WHERE student_id IN (${ph}) GROUP BY student_id`).bind(season.id, ws, ...part).all();
    for (const r of r1.results) Object.assign(out[r.id], { moves: Math.max(0, r.moves || 0), points: r.points || 0, weekMoves: r.weekMoves || 0, eng: r.eng || 0, math: r.math || 0, days: r.days || 0, arrivals: r.arrivals || 0 });
    const r2 = await db.prepare(`SELECT student_id AS id, SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN status<>'closed' THEN 1 ELSE 0 END) AS opened, SUM(CASE WHEN rarity='전설' THEN 1 ELSE 0 END) AS legend
      FROM chests WHERE student_id IN (${ph}) GROUP BY student_id`).bind(...part).all();
    for (const r of r2.results) Object.assign(out[r.id], { closed: r.closed || 0, opened: r.opened || 0, legend: r.legend || 0 });
  }
  for (const id of ids) {
    const s = out[id];
    s.pos = dpos(s.moves, season.routeLen); s.voyage = voyageOf(s.moves, season.routeLen);
    s.badges = BADGES.filter(b => ({ eng: s.eng >= 10, math: s.math >= 10, chest: s.opened >= 1, days: s.days >= 10, arrive: s.arrivals >= 1, legend: s.legend >= 1 })[b.key]).map(b => b.key);
  }
  return out;
}
async function questBlocked(db, studentId, q) {
  if (q.kind === "challenge") return null;
  const since = q.kind === "daily" ? kstDate() : kstWeekStart();
  const done = await db.prepare("SELECT 1 FROM logs WHERE student_id=? AND kind='quest' AND quest_id=? AND date>=? LIMIT 1").bind(studentId, q.id, since).first();
  return done ? (q.kind === "daily" ? "오늘은 이미 완료한 미션이에요" : "이번 주에 이미 완료한 미션이에요") : null;
}
const logStmt = (db, l) => db.prepare("INSERT INTO logs (student_id, kind, title, quest_id, subject, quest_kind, moves, points, season, grp, date, at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
  .bind(l.student_id, l.kind, l.title, l.quest_id ?? null, l.subject ?? null, l.quest_kind ?? null, l.moves || 0, l.points || 0, l.season, l.grp ?? null, kstDate(), Date.now());

// move a ship forward: quest log + one closed chest per treasure island passed + arrival points at the port
function advance(db, season, sid, before, q, grp) {
  const L = season.routeLen, m = q.moves, ops = [], events = [];
  ops.push(logStmt(db, { student_id: sid, kind: "quest", title: q.title, quest_id: q.id ?? null, subject: q.subject, quest_kind: q.kind, moves: m, season: season.id, grp }));
  for (let u = before + 1; u <= before + m; u++) {
    const p = dpos(u, L), v = voyageOf(u, L);
    if (p === L) {
      ops.push(logStmt(db, { student_id: sid, kind: "arrive", title: `${v}번째 항해 도착 항구`, points: season.arrivalPoints, season: season.id, grp }));
      events.push({ u, type: "arrive", points: season.arrivalPoints });
    } else if (isChest(p, season)) {
      ops.push(db.prepare("INSERT OR IGNORE INTO chests (student_id, season, voyage, stop, grp, created_at) VALUES (?,?,?,?,?,?)").bind(sid, season.id, v, p, grp, Date.now()));
      events.push({ u, type: "chest", stop: p, voyage: v });
    }
  }
  return { ops, events, item: { studentId: sid, b: before, a: before + m, m, title: q.title, events } };
}
async function attachChestIds(db, season, items) {
  for (const it of items) for (const e of it.events) if (e.type === "chest") {
    const c = await db.prepare("SELECT id, status FROM chests WHERE student_id=? AND season=? AND voyage=? AND stop=?").bind(it.studentId, season.id, e.voyage, e.stop).first();
    e.chestId = c ? c.id : null; e.status = c ? c.status : null;
  }
  return items;
}
async function openChest(db, chest) {
  if (!chest) throw bad("없는 상자예요");
  if (chest.status !== "closed") throw bad("이미 연 상자예요");
  const pool = (await db.prepare("SELECT * FROM pool WHERE active=1 AND weight>0").all()).results;
  if (!pool.length) throw bad("선생님이 보물을 준비하고 있어요. 조금 뒤에 다시 열어 봐요");
  let roll = randInt(pool.reduce((a, r) => a + r.weight, 0)), pick = pool[0];
  for (const r of pool) { if (roll < r.weight) { pick = r; break; } roll -= r.weight; }
  const done = pick.points > 0;
  const res = await db.prepare(`UPDATE chests SET status=?, reward=?, rarity=?, points=?, opened_at=?, delivered_at=? WHERE id=? AND status='closed'`)
    .bind(done ? "delivered" : "opened", pick.name, pick.rarity, pick.points, Date.now(), done ? Date.now() : null, chest.id).run();
  if (!res.meta.changes) throw bad("이미 연 상자예요");
  if (done) await logStmt(db, { student_id: chest.student_id, kind: "bonus", title: `보물 상자: ${pick.name}`, points: pick.points, season: chest.season, grp: chest.grp }).run();
  return { id: chest.id, name: pick.name, rarity: pick.rarity, points: pick.points, stop: chest.stop };
}
async function shipsOf(db, season, where, binds) {
  const rows = (await db.prepare(`SELECT s.id, s.nickname, s.sail, s.class_id FROM students s WHERE s.active=1 ${where}`).bind(...binds).all()).results;
  const st = await statsFor(db, season, rows.map(r => r.id));
  return rows.map(r => ({ id: r.id, nickname: r.nickname, sail: r.sail, classId: r.class_id, moves: st[r.id].moves, weekMoves: st[r.id].weekMoves }));
}
async function poolList(db) { return (await db.prepare("SELECT id, name, rarity, weight, points FROM pool WHERE active=1 ORDER BY weight DESC, id").all()).results; }
async function shopList(db) { return (await db.prepare("SELECT id, name, kind, cost, stock FROM shop WHERE active=1 ORDER BY cost, id").all()).results; }

async function newStudent(db, classId, nickname, pin, mustChange = 1) {
  const h = await hashSecret(pin);
  const dup = await db.prepare("SELECT 1 FROM students WHERE class_id=? AND nickname=? AND active=1").bind(classId, nickname).first();
  if (dup) throw bad(`이 반에 '${nickname}' 이름이 이미 있어요`);
  return db.prepare("INSERT INTO students (class_id, nickname, sail, pin_hash, salt, must_change, created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(classId, nickname, randInt(SAILS), h.hash, h.salt, mustChange, Date.now()).run();
}

/* ---------- routes ---------- */
const routes = [];
const on = (method, path, role, fn) => routes.push({ method, re: new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>\\d+)") + "$"), role, fn });

on("GET", "/api/me", null, async ({ db, req }) => {
  const me = await auth(req, db);
  const needSetup = !(await db.prepare("SELECT 1 FROM teachers LIMIT 1").first());
  if (!me) return { role: null, needSetup };
  if (me.role === "teacher") return { role: "teacher", username: me.teacher.username };
  return { role: "student", nickname: me.student.nickname, mustChange: !!me.student.must_change };
});
on("POST", "/api/setup", null, async ({ db, body, env }) => {
  if (await db.prepare("SELECT 1 FROM teachers LIMIT 1").first()) throw bad("이미 설정이 끝났어요. 선생님 로그인을 이용해 주세요");
  if (!env.SETUP_CODE || String(body.setupCode || "") !== env.SETUP_CODE) throw new HttpError(403, "설정 코드가 맞지 않아요");
  const username = str(body.username, 30), pw = String(body.password || "");
  if (pw.length < 8) throw bad("비밀번호는 8자 이상으로 정해 주세요");
  const h = await hashSecret(pw);
  const r = await db.prepare("INSERT INTO teachers (username, pass_hash, salt, created_at) VALUES (?,?,?,?)").bind(username, h.hash, h.salt, Date.now()).run();
  const ops = [db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('season', ?)").bind(JSON.stringify(DEFAULT_SEASON))];
  if (!(await db.prepare("SELECT 1 FROM pool LIMIT 1").first())) for (const p of DEFAULT_POOL) ops.push(db.prepare("INSERT INTO pool (name, rarity, weight, points) VALUES (?,?,?,?)").bind(...p));
  if (!(await db.prepare("SELECT 1 FROM shop LIMIT 1").first())) for (const s of DEFAULT_SHOP) ops.push(db.prepare("INSERT INTO shop (name, kind, cost) VALUES (?,?,?)").bind(...s));
  await db.batch(ops);
  return { ok: true, _cookie: await createSession(db, "teacher", r.meta.last_row_id) };
});
on("POST", "/api/teacher/login", null, async ({ db, body }) => {
  const t = await db.prepare("SELECT * FROM teachers WHERE username=?").bind(String(body.username || "").trim()).first();
  if (!t) throw new HttpError(401, "아이디나 비밀번호가 맞지 않아요");
  if (t.locked_until > Date.now()) throw new HttpError(429, "여러 번 틀려서 잠시 잠겼어요. 10분 뒤에 다시 해 주세요");
  const h = await hashSecret(String(body.password || ""), t.salt);
  if (!safeEqual(h.hash, t.pass_hash)) {
    const f = t.failed + 1;
    await db.prepare("UPDATE teachers SET failed=?, locked_until=? WHERE id=?").bind(f >= MAX_FAILED ? 0 : f, f >= MAX_FAILED ? Date.now() + LOCK_MS : 0, t.id).run();
    throw new HttpError(401, "아이디나 비밀번호가 맞지 않아요");
  }
  await db.prepare("UPDATE teachers SET failed=0 WHERE id=?").bind(t.id).run();
  return { ok: true, _cookie: await createSession(db, "teacher", t.id) };
});
on("POST", "/api/class", null, async ({ db, body }) => {
  const c = await db.prepare("SELECT id, name FROM classes WHERE code=? AND active=1").bind(String(body.code || "").trim().toUpperCase()).first();
  if (!c) throw bad("반 코드를 다시 확인해 주세요");
  const st = (await db.prepare("SELECT id, nickname, sail FROM students WHERE class_id=? AND active=1 ORDER BY nickname").bind(c.id).all()).results;
  return { name: c.name, students: st };
});
on("POST", "/api/student/login", null, async ({ db, body }) => {
  const s = await db.prepare("SELECT s.* FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND c.code=? AND s.active=1 AND c.active=1")
    .bind(int(body.studentId, 1), String(body.code || "").trim().toUpperCase()).first();
  if (!s) throw new HttpError(401, "이름을 다시 골라 주세요");
  if (s.locked_until > Date.now()) throw new HttpError(429, "여러 번 틀려서 잠시 잠겼어요. 10분 뒤에 다시 하거나 선생님께 말해 주세요");
  const h = await hashSecret(String(body.pin || ""), s.salt);
  if (!safeEqual(h.hash, s.pin_hash)) {
    const f = s.failed + 1;
    await db.prepare("UPDATE students SET failed=?, locked_until=? WHERE id=?").bind(f >= MAX_FAILED ? 0 : f, f >= MAX_FAILED ? Date.now() + LOCK_MS : 0, s.id).run();
    throw new HttpError(401, f >= MAX_FAILED ? "여러 번 틀려서 10분 동안 잠겼어요" : `비밀번호가 맞지 않아요 (${MAX_FAILED - f}번 남음)`);
  }
  await db.prepare("UPDATE students SET failed=0 WHERE id=?").bind(s.id).run();
  return { ok: true, _cookie: await createSession(db, "student", s.id) };
});
on("POST", "/api/logout", "any", async ({ db, me }) => {
  await db.prepare("DELETE FROM sessions WHERE token=?").bind(me.token).run();
  return { ok: true, _cookie: "th_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" };
});

/* ----- student ----- */
on("POST", "/api/kid/pin", "student", async ({ db, me, body }) => {
  if (!isPin(body.pin)) throw bad("숫자 4개로 정해 주세요");
  const h = await hashSecret(String(body.pin));
  await db.prepare("UPDATE students SET pin_hash=?, salt=?, must_change=0 WHERE id=?").bind(h.hash, h.salt, me.student.id).run();
  return { ok: true };
});
on("POST", "/api/kid/sail", "student", async ({ db, me, body }) => {
  await db.prepare("UPDATE students SET sail=? WHERE id=?").bind(int(body.sail, 0, SAILS - 1), me.student.id).run();
  return { ok: true };
});
on("GET", "/api/kid/state", "student", async ({ db, me }) => {
  const season = await getSeason(db), st = me.student, today = kstDate(), ws = kstWeekStart();
  const stats = (await statsFor(db, season, [st.id]))[st.id];
  const quests = (await db.prepare("SELECT id, title, subject, kind, moves FROM quests WHERE active=1 AND deleted=0 ORDER BY subject, kind, id").all()).results;
  const doneRows = (await db.prepare("SELECT quest_id, date FROM logs WHERE student_id=? AND kind='quest' AND date>=?").bind(st.id, ws).all()).results;
  const pend = (await db.prepare("SELECT id, quest_id FROM requests WHERE student_id=? AND status='pending'").bind(st.id).all()).results;
  for (const q of quests) {
    const done = doneRows.some(r => r.quest_id === q.id && (q.kind === "weekly" || (q.kind === "daily" && r.date === today)));
    const p = pend.find(r => r.quest_id === q.id);
    q.status = q.kind !== "challenge" && done ? "done" : p ? "pending" : "open"; q.requestId = p ? p.id : null;
  }
  const chests = (await db.prepare("SELECT id, voyage, stop, status, reward, rarity, points, opened_at FROM chests WHERE student_id=? ORDER BY id DESC LIMIT 60").bind(st.id).all()).results;
  const orders = (await db.prepare("SELECT id, name, cost, status, created_at FROM orders WHERE student_id=? AND status<>'canceled' ORDER BY id DESC LIMIT 30").bind(st.id).all()).results;
  const log = (await db.prepare("SELECT title, moves, points, kind, at FROM logs WHERE student_id=? ORDER BY id DESC LIMIT 30").bind(st.id).all()).results;
  const ships = await shipsOf(db, season, "AND s.class_id=?", [st.class_id]);
  return { me: { id: st.id, nickname: st.nickname, sail: st.sail, className: st.class_name, mustChange: !!st.must_change }, season, stats, quests, chests, orders, log, ships,
    pool: await poolList(db), shop: await shopList(db), badges: BADGES };
});
on("POST", "/api/kid/request", "student", async ({ db, me, body }) => {
  const q = await db.prepare("SELECT * FROM quests WHERE id=? AND active=1 AND deleted=0").bind(int(body.questId, 1)).first();
  if (!q) throw bad("없는 미션이에요");
  const blocked = await questBlocked(db, me.student.id, q); if (blocked) throw bad(blocked);
  if (await db.prepare("SELECT 1 FROM requests WHERE student_id=? AND quest_id=? AND status='pending'").bind(me.student.id, q.id).first()) throw bad("이미 선생님께 확인을 요청했어요");
  const n = await db.prepare("SELECT COUNT(*) AS n FROM requests WHERE student_id=? AND status='pending'").bind(me.student.id).first();
  if (n.n >= 10) throw bad("확인을 기다리는 미션이 많아요. 선생님이 확인할 때까지 기다려 주세요");
  await db.prepare("INSERT INTO requests (student_id, quest_id, date, created_at) VALUES (?,?,?,?)").bind(me.student.id, q.id, kstDate(), Date.now()).run();
  return { ok: true };
});
on("POST", "/api/kid/cancel/:id", "student", async ({ db, me, params }) => {
  await db.prepare("UPDATE requests SET status='canceled', decided_at=? WHERE id=? AND student_id=? AND status='pending'").bind(Date.now(), params.id, me.student.id).run();
  return { ok: true };
});
on("POST", "/api/kid/open/:id", "student", async ({ db, me, params }) => {
  const c = await db.prepare("SELECT * FROM chests WHERE id=? AND student_id=?").bind(params.id, me.student.id).first();
  return { reward: await openChest(db, c) };
});
on("POST", "/api/kid/buy/:id", "student", async ({ db, me, params }) => {
  const item = await db.prepare("SELECT * FROM shop WHERE id=? AND active=1").bind(params.id).first();
  if (!item) throw bad("없는 상품이에요");
  if (item.stock !== null && item.stock <= 0) throw bad("다 팔렸어요");
  const season = await getSeason(db), s = (await statsFor(db, season, [me.student.id]))[me.student.id];
  if (s.points < item.cost) throw bad(`포인트가 ${item.cost - s.points} 모자라요`);
  if (item.stock !== null) { const r = await db.prepare("UPDATE shop SET stock=stock-1 WHERE id=? AND stock>0").bind(item.id).run(); if (!r.meta.changes) throw bad("다 팔렸어요"); }
  const lg = await logStmt(db, { student_id: me.student.id, kind: "buy", title: `상점: ${item.name}`, points: -item.cost, season: season.id }).run();
  await db.prepare("INSERT INTO orders (student_id, shop_id, name, cost, log_id, created_at) VALUES (?,?,?,?,?,?)").bind(me.student.id, item.id, item.name, item.cost, lg.meta.last_row_id, Date.now()).run();
  return { ok: true };
});

/* ----- teacher ----- */
on("GET", "/api/t/state", "teacher", async ({ db }) => {
  const season = await getSeason(db);
  const classes = (await db.prepare("SELECT id, name, code FROM classes WHERE active=1 ORDER BY name").all()).results;
  const students = (await db.prepare("SELECT id, class_id, nickname, sail, must_change, locked_until FROM students WHERE active=1 ORDER BY nickname").all()).results;
  const stats = await statsFor(db, season, students.map(s => s.id));
  for (const s of students) { s.stats = stats[s.id]; s.locked = s.locked_until > Date.now(); delete s.locked_until; }
  const quests = (await db.prepare("SELECT id, title, subject, kind, moves, active FROM quests WHERE deleted=0 ORDER BY active DESC, subject, kind, id").all()).results;
  const requests = (await db.prepare(`SELECT r.id, r.student_id, r.quest_id, r.created_at, q.title, q.moves, q.subject FROM requests r JOIN quests q ON q.id=r.quest_id JOIN students s ON s.id=r.student_id
      WHERE r.status='pending' AND s.active=1 ORDER BY r.id`).all()).results;
  const chests = (await db.prepare(`SELECT c.id, c.student_id, c.stop, c.voyage, c.status, c.reward, c.rarity, c.points, c.opened_at FROM chests c JOIN students s ON s.id=c.student_id
      WHERE s.active=1 AND (c.status='closed' OR c.status='opened') ORDER BY c.id`).all()).results;
  const orders = (await db.prepare(`SELECT o.id, o.student_id, o.name, o.cost, o.created_at FROM orders o JOIN students s ON s.id=o.student_id WHERE o.status='pending' AND s.active=1 ORDER BY o.id`).all()).results;
  const logs = (await db.prepare(`SELECT l.id, l.student_id, l.kind, l.title, l.moves, l.points, l.grp, l.at FROM logs l WHERE l.date=? ORDER BY l.id DESC LIMIT 80`).bind(kstDate()).all()).results;
  return { season, classes, students, quests, requests, chests, orders, logs, pool: await poolList(db), shop: await shopList(db), badges: BADGES };
});
on("GET", "/api/t/student/:id", "teacher", async ({ db, params }) => {
  const logs = (await db.prepare("SELECT id, kind, title, moves, points, grp, at FROM logs WHERE student_id=? ORDER BY id DESC LIMIT 60").bind(params.id).all()).results;
  const chests = (await db.prepare("SELECT id, voyage, stop, status, reward, rarity, points, opened_at FROM chests WHERE student_id=? ORDER BY id DESC LIMIT 40").bind(params.id).all()).results;
  const orders = (await db.prepare("SELECT id, name, cost, status, created_at FROM orders WHERE student_id=? ORDER BY id DESC LIMIT 40").bind(params.id).all()).results;
  return { logs, chests, orders };
});
async function grantMany(db, season, pairs) { // pairs: [{sid, quest, requestId?}]
  const stats = await statsFor(db, season, [...new Set(pairs.map(p => p.sid))]);
  const ops = [], items = [], skipped = [];
  for (const p of pairs) {
    const why = await questBlocked(db, p.sid, p.quest);
    if (why) { skipped.push({ studentId: p.sid, why }); if (p.requestId) ops.push(db.prepare("UPDATE requests SET status='rejected', decided_at=? WHERE id=?").bind(Date.now(), p.requestId)); continue; }
    const grp = grpId(), r = advance(db, season, p.sid, stats[p.sid].moves, { ...p.quest, moves: p.quest.moves }, grp);
    stats[p.sid].moves += p.quest.moves;
    ops.push(...r.ops); items.push(r.item);
    ops.push(db.prepare("UPDATE requests SET status='approved', decided_at=? WHERE student_id=? AND quest_id=? AND status='pending'").bind(Date.now(), p.sid, p.quest.id));
  }
  for (let i = 0; i < ops.length; i += 90) await db.batch(ops.slice(i, i + 90));
  return { items: await attachChestIds(db, season, items), skipped };
}
on("POST", "/api/t/grant", "teacher", async ({ db, body }) => {
  const season = await getSeason(db), q = await db.prepare("SELECT * FROM quests WHERE id=? AND deleted=0").bind(int(body.questId, 1)).first();
  if (!q) throw bad("미션을 골라 주세요");
  const ids = [...new Set((body.studentIds || []).map(x => int(x, 1)))].slice(0, 200);
  return grantMany(db, season, ids.map(sid => ({ sid, quest: q })));
});
on("POST", "/api/t/requests/approve", "teacher", async ({ db, body }) => {
  const season = await getSeason(db), ids = (body.ids || []).map(x => int(x, 1)).slice(0, 200), pairs = [];
  for (const id of ids) {
    const r = await db.prepare("SELECT * FROM requests WHERE id=? AND status='pending'").bind(id).first(); if (!r) continue;
    const q = await db.prepare("SELECT * FROM quests WHERE id=?").bind(r.quest_id).first(); if (!q) continue;
    if (pairs.some(p => p.sid === r.student_id && p.quest.id === q.id)) continue;
    pairs.push({ sid: r.student_id, quest: q, requestId: r.id });
  }
  return grantMany(db, season, pairs);
});
on("POST", "/api/t/requests/reject", "teacher", async ({ db, body }) => {
  for (const id of (body.ids || []).map(x => int(x, 1)).slice(0, 200)) await db.prepare("UPDATE requests SET status='rejected', decided_at=? WHERE id=? AND status='pending'").bind(Date.now(), id).run();
  return { ok: true };
});
on("POST", "/api/t/open/:id", "teacher", async ({ db, params }) => ({ reward: await openChest(db, await db.prepare("SELECT * FROM chests WHERE id=?").bind(params.id).first()) }));
on("POST", "/api/t/chests/:id/deliver", "teacher", async ({ db, params }) => {
  await db.prepare("UPDATE chests SET status='delivered', delivered_at=? WHERE id=? AND status='opened'").bind(Date.now(), params.id).run(); return { ok: true };
});
on("POST", "/api/t/orders/:id/deliver", "teacher", async ({ db, params }) => {
  await db.prepare("UPDATE orders SET status='delivered', decided_at=? WHERE id=? AND status='pending'").bind(Date.now(), params.id).run(); return { ok: true };
});
on("POST", "/api/t/orders/:id/cancel", "teacher", async ({ db, params }) => {
  const o = await db.prepare("SELECT * FROM orders WHERE id=? AND status='pending'").bind(params.id).first(); if (!o) throw bad("이미 처리된 주문이에요");
  await db.batch([db.prepare("UPDATE orders SET status='canceled', decided_at=? WHERE id=?").bind(Date.now(), o.id), db.prepare("DELETE FROM logs WHERE id=?").bind(o.log_id),
    db.prepare("UPDATE shop SET stock=stock+1 WHERE id=? AND stock IS NOT NULL").bind(o.shop_id)]);
  return { ok: true };
});
on("POST", "/api/t/logs/:id/undo", "teacher", async ({ db, params }) => {
  const l = await db.prepare("SELECT * FROM logs WHERE id=?").bind(params.id).first(); if (!l) throw bad("이미 취소된 기록이에요");
  if (l.kind === "buy") throw bad("상점 기록은 '보물·상점'에서 주문 취소로 되돌려 주세요");
  const ops = [];
  if (l.grp && l.kind === "quest") {
    ops.push(db.prepare("DELETE FROM logs WHERE grp=? AND kind IN ('quest','arrive')").bind(l.grp));
    ops.push(db.prepare("DELETE FROM chests WHERE grp=? AND status='closed'").bind(l.grp));
  } else ops.push(db.prepare("DELETE FROM logs WHERE id=?").bind(l.id));
  await db.batch(ops);
  const kept = l.grp ? (await db.prepare("SELECT COUNT(*) AS n FROM chests WHERE grp=?").bind(l.grp).first()).n : 0;
  return { ok: true, keptChests: kept };
});
on("POST", "/api/t/adjust", "teacher", async ({ db, body }) => {
  const season = await getSeason(db), amt = int(body.amount, -10000, 10000); if (!amt) throw bad("숫자를 넣어 주세요");
  const kind = body.type === "moves" ? "moves" : "points";
  await logStmt(db, { student_id: int(body.studentId, 1), kind: "adjust", title: String(body.title || "선생님 조정").slice(0, 40), [kind]: amt, season: season.id }).run();
  return { ok: true };
});
on("POST", "/api/t/classes", "teacher", async ({ db, body }) => {
  if (body.id) { await db.prepare("UPDATE classes SET name=? WHERE id=?").bind(str(body.name, 20), int(body.id, 1)).run(); return { ok: true }; }
  let code; for (let i = 0; i < 6; i++) { code = classCode(); if (!(await db.prepare("SELECT 1 FROM classes WHERE code=?").bind(code).first())) break; }
  await db.prepare("INSERT INTO classes (name, code, created_at) VALUES (?,?,?)").bind(str(body.name, 20), code, Date.now()).run();
  return { ok: true, code };
});
on("POST", "/api/t/classes/:id/delete", "teacher", async ({ db, params }) => {
  await db.batch([db.prepare("UPDATE classes SET active=0 WHERE id=?").bind(params.id), db.prepare("UPDATE students SET active=0 WHERE class_id=?").bind(params.id),
    db.prepare("DELETE FROM sessions WHERE role='student' AND user_id IN (SELECT id FROM students WHERE class_id=?)").bind(params.id)]);
  return { ok: true };
});
on("POST", "/api/t/students", "teacher", async ({ db, body }) => {
  const classId = int(body.classId, 1);
  if (!(await db.prepare("SELECT 1 FROM classes WHERE id=? AND active=1").bind(classId).first())) throw bad("반을 먼저 골라 주세요");
  const names = String(body.names || "").split(/[\n,]/).map(s => s.trim()).filter(Boolean).slice(0, 60);
  if (!names.length) throw bad("이름을 넣어 주세요");
  const created = [];
  for (const n of names) { const nick = str(n, 12), pin = randomPin(); await newStudent(db, classId, nick, pin); created.push({ nickname: nick, pin }); }
  return { ok: true, created };
});
on("POST", "/api/t/students/:id/rename", "teacher", async ({ db, params, body }) => {
  await db.prepare("UPDATE students SET nickname=? WHERE id=?").bind(str(body.nickname, 12), params.id).run(); return { ok: true };
});
on("POST", "/api/t/students/:id/reset-pin", "teacher", async ({ db, params }) => {
  const pin = randomPin(), h = await hashSecret(pin);
  await db.batch([db.prepare("UPDATE students SET pin_hash=?, salt=?, must_change=1, failed=0, locked_until=0 WHERE id=?").bind(h.hash, h.salt, params.id),
    db.prepare("DELETE FROM sessions WHERE role='student' AND user_id=?").bind(params.id)]);
  return { ok: true, pin };
});
on("POST", "/api/t/students/:id/delete", "teacher", async ({ db, params }) => {
  await db.batch([db.prepare("UPDATE students SET active=0 WHERE id=?").bind(params.id), db.prepare("DELETE FROM sessions WHERE role='student' AND user_id=?").bind(params.id),
    db.prepare("UPDATE requests SET status='canceled' WHERE student_id=? AND status='pending'").bind(params.id)]);
  return { ok: true };
});
on("POST", "/api/t/quests", "teacher", async ({ db, body }) => {
  const d = [str(body.title, 40), SUBJECTS.includes(body.subject) ? body.subject : "공통", KINDS.includes(body.kind) ? body.kind : "daily", int(body.moves, 1, 10)];
  if (body.id) await db.prepare("UPDATE quests SET title=?, subject=?, kind=?, moves=? WHERE id=?").bind(...d, int(body.id, 1)).run();
  else await db.prepare("INSERT INTO quests (title, subject, kind, moves) VALUES (?,?,?,?)").bind(...d).run();
  return { ok: true };
});
on("POST", "/api/t/quests/:id/toggle", "teacher", async ({ db, params }) => { await db.prepare("UPDATE quests SET active=1-active WHERE id=?").bind(params.id).run(); return { ok: true }; });
on("POST", "/api/t/quests/:id/delete", "teacher", async ({ db, params }) => {
  await db.batch([db.prepare("UPDATE quests SET deleted=1, active=0 WHERE id=?").bind(params.id), db.prepare("UPDATE requests SET status='canceled' WHERE quest_id=? AND status='pending'").bind(params.id)]);
  return { ok: true };
});
on("POST", "/api/t/pool", "teacher", async ({ db, body }) => {
  const d = [str(body.name, 30), RARITIES.includes(body.rarity) ? body.rarity : "보통", int(body.weight, 1, 1000), int(body.points || 0, 0, 10000)];
  if (body.id) await db.prepare("UPDATE pool SET name=?, rarity=?, weight=?, points=? WHERE id=?").bind(...d, int(body.id, 1)).run();
  else await db.prepare("INSERT INTO pool (name, rarity, weight, points) VALUES (?,?,?,?)").bind(...d).run();
  return { ok: true };
});
on("POST", "/api/t/pool/:id/delete", "teacher", async ({ db, params }) => { await db.prepare("UPDATE pool SET active=0 WHERE id=?").bind(params.id).run(); return { ok: true }; });
on("POST", "/api/t/shop", "teacher", async ({ db, body }) => {
  const stock = body.stock === "" || body.stock == null ? null : int(body.stock, 0, 10000);
  const d = [str(body.name, 30), body.kind === "특권" ? "특권" : "선물", int(body.cost, 1, 100000), stock];
  if (body.id) await db.prepare("UPDATE shop SET name=?, kind=?, cost=?, stock=? WHERE id=?").bind(...d, int(body.id, 1)).run();
  else await db.prepare("INSERT INTO shop (name, kind, cost, stock) VALUES (?,?,?,?)").bind(...d).run();
  return { ok: true };
});
on("POST", "/api/t/shop/:id/delete", "teacher", async ({ db, params }) => { await db.prepare("UPDATE shop SET active=0 WHERE id=?").bind(params.id).run(); return { ok: true }; });
on("POST", "/api/t/season", "teacher", async ({ db, body }) => {
  const cur = await getSeason(db), routeLen = int(body.routeLen ?? cur.routeLen, 6, 40);
  const next = { ...cur, name: str(body.name ?? cur.name, 30), routeLen, treasureEvery: Math.min(routeLen, int(body.treasureEvery ?? cur.treasureEvery, 2, 40)),
    arrivalPoints: int(body.arrivalPoints ?? cur.arrivalPoints, 0, 100000), weeklyClassGoal: int(body.weeklyClassGoal ?? cur.weeklyClassGoal, 0, 100000) };
  if (body.newVoyage) next.id = "v" + Date.now();
  await db.prepare("INSERT INTO settings (key, value) VALUES ('season', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(next)).run();
  return { ok: true };
});
on("POST", "/api/t/password", "teacher", async ({ db, me, body }) => {
  const pw = String(body.password || ""); if (pw.length < 8) throw bad("비밀번호는 8자 이상으로 정해 주세요");
  const h = await hashSecret(pw);
  await db.prepare("UPDATE teachers SET pass_hash=?, salt=? WHERE id=?").bind(h.hash, h.salt, me.teacher.id).run();
  return { ok: true };
});
// demo class for showing the program to other teachers
on("POST", "/api/t/demo", "teacher", async ({ db }) => {
  const season = await getSeason(db);
  let code; for (let i = 0; i < 6; i++) { code = classCode(); if (!(await db.prepare("SELECT 1 FROM classes WHERE code=?").bind(code).first())) break; }
  const cls = await db.prepare("INSERT INTO classes (name, code, created_at) VALUES (?,?,?)").bind("시연반", code, Date.now()).run();
  const classId = cls.meta.last_row_id;
  const names = ["김하늘", "이서준", "박지우", "최예린", "정도윤", "한소율", "윤시우", "강다은"];
  for (const n of names) await newStudent(db, classId, n, "1234", 0);
  if (!(await db.prepare("SELECT 1 FROM quests WHERE deleted=0 LIMIT 1").first())) {
    const qs = [["영어 단어 20개 외우기", "영어", "daily", 1], ["영어 듣기 숙제 완료", "영어", "daily", 1], ["수학 숙제 다 풀기", "수학", "daily", 1],
      ["수학 오답노트 정리", "수학", "weekly", 3], ["영어 일기 한 편 쓰기", "영어", "weekly", 3], ["단원평가 100점", "수학", "challenge", 5], ["친구 도와주기", "공통", "challenge", 2]];
    await db.batch(qs.map(q => db.prepare("INSERT INTO quests (title, subject, kind, moves) VALUES (?,?,?,?)").bind(...q)));
  }
  const studs = (await db.prepare("SELECT id FROM students WHERE class_id=? ORDER BY id").bind(classId).all()).results;
  const spread = [3, 6, 7, 10, 12, 15, 18, 2];
  const ops = [];
  studs.forEach((s, i) => { const r = advance(db, season, s.id, 0, { title: "방학 시작 보너스", subject: "공통", kind: "challenge", moves: spread[i % spread.length] }, grpId()); ops.push(...r.ops); });
  for (let i = 0; i < ops.length; i += 90) await db.batch(ops.slice(i, i + 90));
  return { ok: true, code, pin: "1234" };
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method === "POST") {
      const origin = req.headers.get("origin");
      if (origin && new URL(origin).host !== url.host) return json({ error: "잘못된 요청이에요" }, 403);
    }
    const route = routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!route) return json({ error: "없는 주소예요" }, 404);
    try {
      const db = env.DB;
      const me = route.role ? await auth(req, db) : null;
      if (route.role && (!me || (route.role !== "any" && me.role !== route.role))) return json({ error: "다시 로그인해 주세요" }, 401);
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const params = url.pathname.match(route.re).groups || {};
      const out = await route.fn({ db, env, me, body, params, url, req });
      const headers = {};
      if (out && out._cookie) { headers["set-cookie"] = out._cookie; delete out._cookie; }
      return json(out, 200, headers);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "잠시 문제가 생겼어요. 다시 시도해 주세요" }, 500);
    }
  }
};
