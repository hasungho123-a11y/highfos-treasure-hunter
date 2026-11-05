// 하이포스 방학 트레저 헌터 - API (Cloudflare Workers + D1)
// 정적 화면은 public/ 에서, /api/* 는 이 Worker 가 처리한다.
// 구조: 미션 → 항해 포인트 → 보물섬 도착 → 아이가 보물상자를 열면 보물 풀에서 랜덤 1개 → 선생님이 전달

const SESSION_DAYS = { teacher: 7, student: 30 };
const PBKDF2_ITER = 30000;
const MAX_FAILED = 5;
const LOCK_MS = 10 * 60 * 1000;
const AVATARS = ["🧭", "🦜", "🐙", "🐢", "🦈", "🐬", "🦀", "⚓", "🏴‍☠️", "🗺️", "🐳", "🦭"];
const BADGES = [
  { key: "eng", icon: "🔤", name: "영어 항해사", desc: "영어 미션 10회 완료" },
  { key: "math", icon: "📐", name: "수학 지도 제작자", desc: "수학 미션 10회 완료" },
  { key: "chal", icon: "🏔️", name: "용감한 모험가", desc: "도전 미션 첫 완료" },
  { key: "days", icon: "📅", name: "성실한 선원", desc: "서로 다른 10일 미션 완료" },
  { key: "full", icon: "🏆", name: "전설의 보물 사냥꾼", desc: "보물 지도 끝까지 도착" }
];

/* ---------- helpers ---------- */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, message) => json({ error: message }, status);
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = msg => new HttpError(400, msg);

// 한국 시간 기준 날짜
function kstDate(ms = Date.now()) { return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10); }
function kstWeekStart(ms = Date.now()) {
  const d = new Date(ms + 9 * 3600e3); const k = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - k); return d.toISOString().slice(0, 10);
}
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const randHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");
const randInt = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
async function hashSecret(secret, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}
const randomPin = () => String(randInt(10000)).padStart(4, "0");
function classCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const v = crypto.getRandomValues(new Uint8Array(5));
  return [...v].map(x => chars[x % chars.length]).join("");
}
const str = (v, max) => { const s = String(v ?? "").trim(); if (!s) throw bad("빈 칸을 채워 주세요"); if (s.length > max) throw bad(`${max}자 이내로 입력해 주세요`); return s; };
const int = (v, min = 0, max = 100000) => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < min || n > max) throw bad("숫자를 확인해 주세요"); return n; };
const isPin = p => /^\d{4}$/.test(String(p ?? ""));
// 가중치로 희귀도 표시
const rarity = w => w >= 4 ? "흔함" : w >= 2 ? "보통" : "희귀";

function cookie(token, days) {
  return `ht_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
}
function readCookie(req) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)ht_session=([a-f0-9]{64})/);
  return m ? m[1] : null;
}

/* ---------- data access ---------- */
async function getSeason(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key='season'").first();
  const s = JSON.parse(row.value);
  // 예전 형식(tiers: [{level, reward}])도 읽는다
  if (!Array.isArray(s.chestLevels)) s.chestLevels = (s.tiers || []).map(t => t.level);
  s.chestLevels = [...new Set(s.chestLevels)].filter(l => l >= 1 && l <= s.maxLevel).sort((a, b) => a - b);
  delete s.tiers;
  return s;
}
async function createSession(db, role, userId) {
  const token = randHex(32), days = SESSION_DAYS[role];
  await db.prepare("INSERT INTO sessions (token, role, user_id, expires_at) VALUES (?,?,?,?)").bind(token, role, userId, Date.now() + days * 86400e3).run();
  return cookie(token, days);
}
async function auth(req, db) {
  const t = readCookie(req); if (!t) return null;
  const s = await db.prepare("SELECT * FROM sessions WHERE token=? AND expires_at>?").bind(t, Date.now()).first();
  if (!s) return null;
  if (s.role === "student") {
    const st = await db.prepare("SELECT s.*, c.name AS class_name, c.code AS class_code FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND s.active=1").bind(s.user_id).first();
    return st ? { role: "student", token: t, student: st } : null;
  }
  const te = await db.prepare("SELECT id, username FROM teachers WHERE id=?").bind(s.user_id).first();
  return te ? { role: "teacher", token: t, teacher: te } : null;
}

// 학생별 합계: 이번 시즌 항해 포인트, 미션 통계, 열 수 있는 보물상자
async function studentStats(db, season, ids) {
  const out = {};
  for (const id of ids) out[id] = { xp: 0, weekXp: 0, eng: 0, math: 0, chal: 0, days: 0, opened: [] };
  if (!ids.length) return out;
  const ph = ids.map(() => "?").join(","), ws = kstWeekStart();
  const { results } = await db.prepare(`SELECT student_id AS id,
      SUM(CASE WHEN season=? THEN xp ELSE 0 END) AS xp,
      SUM(CASE WHEN date>=? THEN xp ELSE 0 END) AS weekXp,
      SUM(CASE WHEN kind='quest' AND subject='영어' THEN 1 ELSE 0 END) AS eng,
      SUM(CASE WHEN kind='quest' AND subject='수학' THEN 1 ELSE 0 END) AS math,
      SUM(CASE WHEN kind='quest' AND quest_kind='challenge' THEN 1 ELSE 0 END) AS chal,
      COUNT(DISTINCT CASE WHEN kind='quest' THEN date END) AS days
    FROM logs WHERE student_id IN (${ph}) GROUP BY student_id`).bind(season.id, ws, ...ids).all();
  for (const r of results) Object.assign(out[r.id], { xp: r.xp || 0, weekXp: r.weekXp || 0, eng: r.eng, math: r.math, chal: r.chal, days: r.days });
  const ch = await db.prepare(`SELECT student_id AS id, level FROM chests WHERE season=? AND student_id IN (${ph})`).bind(season.id, ...ids).all();
  for (const r of ch.results) out[r.id].opened.push(r.level);
  for (const id of ids) {
    const s = out[id];
    s.level = Math.min(season.maxLevel, Math.floor(Math.max(0, s.xp) / season.xpPerLevel));
    s.badges = BADGES.filter(b => ({ eng: s.eng >= 10, math: s.math >= 10, chal: s.chal >= 1, days: s.days >= 10, full: s.level >= season.maxLevel })[b.key]).map(b => b.key);
    s.closedChests = season.chestLevels.filter(l => s.level >= l && !s.opened.includes(l));
  }
  return out;
}

// 이 미션을 지금 받을 수 있는지 (매일/매주 제한)
async function questBlocked(db, studentId, q) {
  if (q.kind === "challenge") return null;
  const since = q.kind === "daily" ? kstDate() : kstWeekStart();
  const done = await db.prepare("SELECT 1 FROM logs WHERE student_id=? AND kind='quest' AND quest_id=? AND date>=? LIMIT 1").bind(studentId, q.id, since).first();
  if (done) return q.kind === "daily" ? "오늘은 이미 완료한 미션이에요" : "이번 주에 이미 완료한 미션이에요";
  return null;
}
function questLog(studentId, q, season) {
  return { student_id: studentId, kind: "quest", title: q.title, quest_id: q.id, subject: q.subject, quest_kind: q.kind, xp: q.xp, season: season.id };
}
function insertLog(db, l) {
  return db.prepare("INSERT INTO logs (student_id, kind, title, quest_id, subject, quest_kind, xp, coins, season, date, at) VALUES (?,?,?,?,?,?,?,0,?,?,?)")
    .bind(l.student_id, l.kind, l.title, l.quest_id ?? null, l.subject ?? null, l.quest_kind ?? null, l.xp || 0, l.season, kstDate(), Date.now());
}
async function rewardPool(db) {
  return (await db.prepare("SELECT * FROM rewards WHERE active=1 AND weight>0 AND (stock IS NULL OR stock>0) ORDER BY weight DESC, id").all()).results;
}

/* ---------- routes ---------- */
const routes = [];
const on = (method, path, role, fn) => routes.push({ method, re: new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>\\d+)") + "$"), role, fn });

// 처음 한 번: 선생님 계정 만들기 (SETUP_CODE 필요)
on("GET", "/api/setup", null, async ({ db }) => {
  const t = await db.prepare("SELECT COUNT(*) AS n FROM teachers").first();
  return { needsSetup: t.n === 0 };
});
on("POST", "/api/setup", null, async ({ db, body, env }) => {
  const t = await db.prepare("SELECT COUNT(*) AS n FROM teachers").first();
  if (t.n > 0) throw bad("이미 선생님 계정이 있어요");
  if (!env.SETUP_CODE || body.setupCode !== env.SETUP_CODE) throw new HttpError(403, "설정 코드가 맞지 않아요");
  const username = str(body.username, 30), pw = String(body.password || "");
  if (pw.length < 4) throw bad("비밀번호는 4자 이상이어야 해요");
  const h = await hashSecret(pw);
  const r = await db.prepare("INSERT INTO teachers (username, pw_hash, pw_salt, created_at) VALUES (?,?,?,?)").bind(username, h.hash, h.salt, Date.now()).run();
  return { ok: true, _cookie: await createSession(db, "teacher", r.meta.last_row_id) };
});
on("POST", "/api/teacher/login", null, async ({ db, body }) => {
  const te = await db.prepare("SELECT * FROM teachers WHERE username=?").bind(String(body.username || "").trim()).first();
  // 짧은 비밀번호를 허용하므로 연속으로 틀리면 잠근다
  if (te && te.locked_until > Date.now()) throw new HttpError(429, `비밀번호를 여러 번 틀렸어요. ${Math.ceil((te.locked_until - Date.now()) / 60000)}분 뒤에 다시 해 보세요`);
  const h = await hashSecret(String(body.password || ""), te ? te.pw_salt : null);
  if (!te || !safeEqual(h.hash, te.pw_hash)) {
    if (te) {
      const failed = te.failed + 1, lock = failed >= MAX_FAILED;
      await db.prepare("UPDATE teachers SET failed=?, locked_until=? WHERE id=?").bind(lock ? 0 : failed, lock ? Date.now() + LOCK_MS : 0, te.id).run();
      if (lock) throw new HttpError(429, "비밀번호를 5번 틀려서 10분 동안 잠겼어요");
    }
    throw new HttpError(401, "아이디나 비밀번호가 맞지 않아요");
  }
  await db.prepare("UPDATE teachers SET failed=0, locked_until=0 WHERE id=?").bind(te.id).run();
  return { ok: true, _cookie: await createSession(db, "teacher", te.id) };
});
on("POST", "/api/student/login", null, async ({ db, body }) => {
  const code = String(body.classCode || "").trim().toUpperCase(), nick = String(body.nickname || "").trim();
  const st = await db.prepare("SELECT s.* FROM students s JOIN classes c ON c.id=s.class_id WHERE c.code=? AND s.nickname=? AND s.active=1").bind(code, nick).first();
  if (!st) throw new HttpError(401, "반 코드나 닉네임을 다시 확인해 주세요");
  if (st.locked_until > Date.now()) throw new HttpError(429, `비밀번호를 여러 번 틀렸어요. ${Math.ceil((st.locked_until - Date.now()) / 60000)}분 뒤에 다시 해 보세요`);
  const h = await hashSecret(String(body.pin || ""), st.pin_salt);
  if (!safeEqual(h.hash, st.pin_hash)) {
    const failed = st.failed + 1, lock = failed >= MAX_FAILED;
    await db.prepare("UPDATE students SET failed=?, locked_until=? WHERE id=?").bind(lock ? 0 : failed, lock ? Date.now() + LOCK_MS : 0, st.id).run();
    throw new HttpError(401, lock ? "비밀번호를 5번 틀려서 10분 동안 잠겼어요" : `비밀번호가 틀렸어요 (${failed}/${MAX_FAILED})`);
  }
  await db.prepare("UPDATE students SET failed=0, locked_until=0 WHERE id=?").bind(st.id).run();
  return { ok: true, mustChange: !!st.must_change, _cookie: await createSession(db, "student", st.id) };
});
on("POST", "/api/logout", "any", async ({ db, me }) => {
  await db.prepare("DELETE FROM sessions WHERE token=?").bind(me.token).run();
  return { ok: true, _cookie: "ht_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" };
});

/* ----- 아이 화면 ----- */
on("POST", "/api/kid/pin", "student", async ({ db, me, body }) => {
  if (!isPin(body.pin)) throw bad("숫자 4자리로 정해 주세요");
  if (/^(\d)\1{3}$/.test(body.pin) || ["1234", "4321", "0123", "9876"].includes(body.pin)) throw bad("너무 쉬운 비밀번호예요. 다른 숫자로 정해 주세요");
  const h = await hashSecret(body.pin);
  await db.prepare("UPDATE students SET pin_hash=?, pin_salt=?, must_change=0 WHERE id=?").bind(h.hash, h.salt, me.student.id).run();
  return { ok: true };
});
on("POST", "/api/kid/avatar", "student", async ({ db, me, body }) => {
  if (!AVATARS.includes(body.avatar)) throw bad("고를 수 없는 캐릭터예요");
  await db.prepare("UPDATE students SET avatar=? WHERE id=?").bind(body.avatar, me.student.id).run();
  return { ok: true };
});
on("GET", "/api/kid/state", "student", async ({ db, me }) => {
  const season = await getSeason(db), st = me.student, today = kstDate(), ws = kstWeekStart();
  const stats = (await studentStats(db, season, [st.id]))[st.id];
  const quests = (await db.prepare("SELECT id, title, subject, kind, xp FROM quests WHERE active=1 ORDER BY subject, kind, id").all()).results;
  const doneRows = (await db.prepare("SELECT quest_id, date FROM logs WHERE student_id=? AND kind='quest' AND date>=?").bind(st.id, ws).all()).results;
  const pend = (await db.prepare("SELECT * FROM requests WHERE student_id=? AND type='quest' AND status='pending'").bind(st.id).all()).results;
  for (const q of quests) {
    const done = doneRows.some(r => r.quest_id === q.id && (q.kind === "weekly" ? r.date >= ws : q.kind === "daily" ? r.date === today : false));
    const p = pend.find(r => r.quest_id === q.id);
    q.status = done ? "done" : p ? "pending" : "open"; q.requestId = p ? p.id : null;
  }
  // 상자에서 나올 수 있는 보물 (확률 대신 희귀도만 보여 준다)
  const pool = (await rewardPool(db)).map(r => ({ name: r.name, kind: r.kind, rarity: rarity(r.weight) }));
  const chests = (await db.prepare("SELECT level, reward_name, reward_kind, status, opened_at FROM chests WHERE student_id=? AND season=? ORDER BY level").bind(st.id, season.id).all()).results;
  const recent = (await db.prepare(`SELECT q.id, q.status, qu.title FROM requests q LEFT JOIN quests qu ON qu.id=q.quest_id
      WHERE q.student_id=? AND q.type='quest' ORDER BY q.id DESC LIMIT 15`).bind(st.id).all()).results;
  const log = (await db.prepare("SELECT title, xp, kind, at FROM logs WHERE student_id=? AND xp<>0 ORDER BY id DESC LIMIT 20").bind(st.id).all()).results;
  // 우리 반 탐험대: 이번 주 함께 모은 포인트와 대원 (순위는 보여 주지 않음)
  const mates = (await db.prepare("SELECT id, nickname, avatar FROM students WHERE class_id=? AND active=1").bind(st.class_id).all()).results;
  const mateStats = await studentStats(db, season, mates.map(m => m.id));
  const crewXp = mates.reduce((a, m) => a + mateStats[m.id].weekXp, 0);
  return {
    me: { nickname: st.nickname, avatar: st.avatar, className: st.class_name, mustChange: !!st.must_change },
    season, stats, quests, pool, chests, requests: recent, log, badges: BADGES, avatars: AVATARS,
    crew: { size: mates.length, weekXp: crewXp, goal: season.weeklyClassGoal, members: mates.map(m => ({ nickname: m.nickname, avatar: m.avatar })) }
  };
});
on("POST", "/api/kid/request-quest", "student", async ({ db, me, body }) => {
  const q = await db.prepare("SELECT * FROM quests WHERE id=? AND active=1").bind(int(body.questId, 1)).first();
  if (!q) throw bad("없는 미션이에요");
  const blocked = await questBlocked(db, me.student.id, q); if (blocked) throw bad(blocked);
  const dup = await db.prepare("SELECT 1 FROM requests WHERE student_id=? AND type='quest' AND quest_id=? AND status='pending'").bind(me.student.id, q.id).first();
  if (dup) throw bad("이미 선생님께 확인을 요청했어요");
  const n = await db.prepare("SELECT COUNT(*) AS n FROM requests WHERE student_id=? AND status='pending'").bind(me.student.id).first();
  if (n.n >= 15) throw bad("확인 기다리는 요청이 너무 많아요. 선생님이 확인할 때까지 기다려 주세요");
  await db.prepare("INSERT INTO requests (student_id, type, quest_id, date, created_at) VALUES (?,?,?,?,?)").bind(me.student.id, "quest", q.id, kstDate(), Date.now()).run();
  return { ok: true };
});
on("POST", "/api/kid/cancel/:id", "student", async ({ db, me, params }) => {
  await db.prepare("UPDATE requests SET status='canceled', decided_at=? WHERE id=? AND student_id=? AND status='pending'").bind(Date.now(), params.id, me.student.id).run();
  return { ok: true };
});
// 보물상자 열기: 서버에서 가중치 랜덤으로 1개를 뽑는다. 한 섬의 상자는 한 번만 열린다
on("POST", "/api/kid/open-chest", "student", async ({ db, me, body }) => {
  const season = await getSeason(db), level = int(body.level, 1, 100), id = me.student.id;
  if (!season.chestLevels.includes(level)) throw bad("이 섬에는 보물상자가 없어요");
  const s = (await studentStats(db, season, [id]))[id];
  if (s.level < level) throw bad("아직 이 섬에 도착하지 않았어요");
  if (s.opened.includes(level)) throw bad("이미 연 보물상자예요");
  const pool = await rewardPool(db);
  if (!pool.length) throw bad("선생님이 보물을 준비하고 있어요. 조금 뒤에 다시 열어 봐요");
  let roll = randInt(pool.reduce((a, r) => a + r.weight, 0)), pick = pool[0];
  for (const r of pool) { if (roll < r.weight) { pick = r; break; } roll -= r.weight; }
  const ops = [db.prepare("INSERT OR IGNORE INTO chests (student_id, season, level, reward_id, reward_name, reward_kind, status, opened_at) VALUES (?,?,?,?,?,?, 'opened', ?)")
    .bind(id, season.id, level, pick.id, pick.name, pick.kind, Date.now())];
  if (pick.stock !== null) ops.push(db.prepare("UPDATE rewards SET stock=stock-1 WHERE id=? AND stock>0 AND changes()>0").bind(pick.id));
  const res = await db.batch(ops);
  if (!res[0].meta.changes) throw bad("이미 연 보물상자예요");
  return { ok: true, reward: { name: pick.name, kind: pick.kind, rarity: rarity(pick.weight) } };
});

/* ----- 선생님 화면 ----- */
on("GET", "/api/t/state", "teacher", async ({ db, me }) => {
  const season = await getSeason(db);
  const classes = (await db.prepare("SELECT * FROM classes ORDER BY name").all()).results;
  const students = (await db.prepare("SELECT id, class_id, nickname, avatar, must_change, locked_until, created_at FROM students WHERE active=1 ORDER BY nickname").all()).results;
  const stats = await studentStats(db, season, students.map(s => s.id));
  for (const s of students) s.stats = stats[s.id];
  const quests = (await db.prepare("SELECT * FROM quests ORDER BY active DESC, subject, kind, id").all()).results;
  const rewards = (await db.prepare("SELECT * FROM rewards WHERE active=1 ORDER BY kind, weight DESC, id").all()).results;
  const requests = (await db.prepare(`SELECT q.*, s.nickname, s.avatar, s.class_id, qu.title AS quest_title, qu.xp, qu.kind AS quest_kind, qu.subject
      FROM requests q JOIN students s ON s.id=q.student_id JOIN quests qu ON qu.id=q.quest_id
      WHERE q.status='pending' AND q.type='quest' AND s.active=1 ORDER BY q.id`).all()).results;
  const chests = (await db.prepare(`SELECT c.*, s.nickname, s.avatar, s.class_id FROM chests c JOIN students s ON s.id=c.student_id
      WHERE s.active=1 AND (c.status='opened' OR c.delivered_at > ?) ORDER BY c.status='delivered', c.opened_at`).bind(Date.now() - 3 * 86400e3).all()).results;
  const logs = (await db.prepare("SELECT l.*, s.nickname FROM logs l JOIN students s ON s.id=l.student_id ORDER BY l.id DESC LIMIT 60").all()).results;
  return { teacher: me.teacher.username, season, classes, students, quests, rewards, requests, chests, logs, badges: BADGES, today: kstDate() };
});
on("POST", "/api/t/classes", "teacher", async ({ db, body }) => {
  const name = str(body.name, 20);
  for (let i = 0; i < 5; i++) {
    const code = classCode();
    const r = await db.prepare("INSERT OR IGNORE INTO classes (name, code, created_at) VALUES (?,?,?)").bind(name, code, Date.now()).run();
    if (r.meta.changes) return { ok: true, code };
  }
  throw new HttpError(500, "반 코드를 만들지 못했어요. 다시 시도해 주세요");
});
on("POST", "/api/t/students", "teacher", async ({ db, body }) => {
  const classId = int(body.classId, 1), nickname = str(body.nickname, 12);
  const cls = await db.prepare("SELECT id FROM classes WHERE id=?").bind(classId).first(); if (!cls) throw bad("반을 먼저 골라 주세요");
  const exists = await db.prepare("SELECT id, active FROM students WHERE class_id=? AND nickname=?").bind(classId, nickname).first();
  if (exists && exists.active) throw bad("이 반에 같은 닉네임이 있어요");
  const pin = randomPin(), h = await hashSecret(pin);
  if (exists) await db.prepare("UPDATE students SET active=1, pin_hash=?, pin_salt=?, must_change=1, failed=0, locked_until=0 WHERE id=?").bind(h.hash, h.salt, exists.id).run();
  else await db.prepare("INSERT INTO students (class_id, nickname, avatar, pin_hash, pin_salt, created_at) VALUES (?,?,?,?,?,?)").bind(classId, nickname, AVATARS[randInt(AVATARS.length)], h.hash, h.salt, Date.now()).run();
  return { ok: true, pin };
});
on("POST", "/api/t/students/:id/reset-pin", "teacher", async ({ db, params }) => {
  const pin = randomPin(), h = await hashSecret(pin);
  await db.prepare("UPDATE students SET pin_hash=?, pin_salt=?, must_change=1, failed=0, locked_until=0 WHERE id=?").bind(h.hash, h.salt, params.id).run();
  await db.prepare("DELETE FROM sessions WHERE role='student' AND user_id=?").bind(params.id).run();
  return { ok: true, pin };
});
on("POST", "/api/t/students/:id/delete", "teacher", async ({ db, params }) => {
  await db.batch([
    db.prepare("UPDATE students SET active=0 WHERE id=?").bind(params.id),
    db.prepare("DELETE FROM sessions WHERE role='student' AND user_id=?").bind(params.id),
    db.prepare("UPDATE requests SET status='canceled', decided_at=? WHERE student_id=? AND status='pending'").bind(Date.now(), params.id)
  ]);
  return { ok: true };
});
async function approve(db, id, season) {
  const q = await db.prepare("SELECT * FROM requests WHERE id=? AND status='pending' AND type='quest'").bind(id).first();
  if (!q) return "이미 처리된 요청이에요";
  const quest = await db.prepare("SELECT * FROM quests WHERE id=?").bind(q.quest_id).first();
  if (!quest) return "삭제된 미션이에요";
  const blocked = await questBlocked(db, q.student_id, quest);
  if (blocked) { await db.prepare("UPDATE requests SET status='rejected', decided_at=? WHERE id=?").bind(Date.now(), id).run(); return blocked; }
  await db.batch([insertLog(db, questLog(q.student_id, quest, season)), db.prepare("UPDATE requests SET status='approved', decided_at=? WHERE id=?").bind(Date.now(), id)]);
  return null;
}
on("POST", "/api/t/requests/approve", "teacher", async ({ db, body }) => {
  const season = await getSeason(db), ids = (body.ids || []).map(x => int(x, 1)).slice(0, 100), problems = [];
  for (const id of ids) { const p = await approve(db, id, season); if (p) problems.push(p); }
  return { ok: true, approved: ids.length - problems.length, problems };
});
on("POST", "/api/t/requests/reject", "teacher", async ({ db, body }) => {
  const ids = (body.ids || []).map(x => int(x, 1)).slice(0, 100);
  for (const id of ids) await db.prepare("UPDATE requests SET status='rejected', decided_at=? WHERE id=? AND status='pending'").bind(Date.now(), id).run();
  return { ok: true };
});
on("POST", "/api/t/grant", "teacher", async ({ db, body }) => {
  const season = await getSeason(db), q = await db.prepare("SELECT * FROM quests WHERE id=?").bind(int(body.questId, 1)).first();
  if (!q) throw bad("미션을 골라 주세요");
  const ids = (body.studentIds || []).map(x => int(x, 1)).slice(0, 200), skipped = [], ops = [];
  for (const id of ids) {
    if (await questBlocked(db, id, q)) { skipped.push(id); continue; }
    ops.push(insertLog(db, questLog(id, q, season)));
    ops.push(db.prepare("UPDATE requests SET status='approved', decided_at=? WHERE student_id=? AND type='quest' AND quest_id=? AND status='pending'").bind(Date.now(), id, q.id));
  }
  if (ops.length) await db.batch(ops);
  return { ok: true, granted: ids.length - skipped.length, skipped: skipped.length };
});
on("POST", "/api/t/adjust", "teacher", async ({ db, body }) => {
  const season = await getSeason(db), xp = int(body.xp, -10000, 10000);
  if (!xp) throw bad("숫자를 입력하세요");
  await insertLog(db, { student_id: int(body.studentId, 1), kind: "adjust", title: str(body.title || "선생님 조정", 40), xp, season: season.id }).run();
  return { ok: true };
});
on("POST", "/api/t/chests/:id/deliver", "teacher", async ({ db, params }) => {
  await db.prepare("UPDATE chests SET status='delivered', delivered_at=? WHERE id=? AND status='opened'").bind(Date.now(), params.id).run();
  return { ok: true };
});
// 상자 되돌리기: 아이가 다시 열 수 있게 하고 재고를 돌려 놓는다
on("POST", "/api/t/chests/:id/reset", "teacher", async ({ db, params }) => {
  const c = await db.prepare("SELECT * FROM chests WHERE id=?").bind(params.id).first(); if (!c) throw bad("이미 되돌린 상자예요");
  await db.batch([db.prepare("DELETE FROM chests WHERE id=?").bind(c.id),
    db.prepare("UPDATE rewards SET stock=stock+1 WHERE id=? AND stock IS NOT NULL").bind(c.reward_id)]);
  return { ok: true };
});
on("POST", "/api/t/logs/:id/undo", "teacher", async ({ db, params }) => {
  const r = await db.prepare("DELETE FROM logs WHERE id=?").bind(params.id).run();
  if (!r.meta.changes) throw bad("이미 취소된 기록이에요");
  return { ok: true };
});
on("POST", "/api/t/quests", "teacher", async ({ db, body }) => {
  const d = [str(body.title, 40), ["영어", "수학", "공통"].includes(body.subject) ? body.subject : "공통", ["daily", "weekly", "challenge"].includes(body.kind) ? body.kind : "daily", int(body.xp, 0, 1000)];
  if (body.id) await db.prepare("UPDATE quests SET title=?, subject=?, kind=?, xp=? WHERE id=?").bind(...d, int(body.id, 1)).run();
  else await db.prepare("INSERT INTO quests (title, subject, kind, xp, coins) VALUES (?,?,?,?,0)").bind(...d).run();
  return { ok: true };
});
on("POST", "/api/t/quests/:id/toggle", "teacher", async ({ db, params }) => {
  await db.prepare("UPDATE quests SET active=1-active WHERE id=?").bind(params.id).run(); return { ok: true };
});
on("POST", "/api/t/rewards", "teacher", async ({ db, body }) => {
  const stock = body.stock === "" || body.stock === null || body.stock === undefined ? null : int(body.stock, 0, 10000);
  const d = [str(body.name, 30), body.kind === "특권" ? "특권" : "실물", int(body.weight, 0, 100), stock];
  if (body.id) await db.prepare("UPDATE rewards SET name=?, kind=?, weight=?, stock=? WHERE id=?").bind(...d, int(body.id, 1)).run();
  else await db.prepare("INSERT INTO rewards (name, kind, weight, stock, cost) VALUES (?,?,?,?,0)").bind(...d).run();
  return { ok: true };
});
on("POST", "/api/t/rewards/:id/delete", "teacher", async ({ db, params }) => {
  await db.prepare("UPDATE rewards SET active=0 WHERE id=?").bind(params.id).run();
  return { ok: true };
});
on("POST", "/api/t/season", "teacher", async ({ db, body }) => {
  const cur = await getSeason(db);
  const maxLevel = int(body.maxLevel ?? cur.maxLevel, 1, 50);
  const chestLevels = [...new Set((Array.isArray(body.chestLevels) ? body.chestLevels : cur.chestLevels).map(l => int(l, 1, 50)))].filter(l => l <= maxLevel).sort((a, b) => a - b);
  const next = { ...cur, name: str(body.name ?? cur.name, 30), xpPerLevel: int(body.xpPerLevel ?? cur.xpPerLevel, 10, 10000), maxLevel, weeklyClassGoal: int(body.weeklyClassGoal ?? cur.weeklyClassGoal, 0, 1000000), chestLevels };
  if (body.newSeason) next.id = "s" + Date.now();
  await db.prepare("UPDATE settings SET value=? WHERE key='season'").bind(JSON.stringify(next)).run();
  return { ok: true };
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    // 다른 사이트에서 보낸 요청 차단
    if (req.method !== "GET") {
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) return fail(403, "허용되지 않은 요청이에요");
    }
    const route = routes.find(r => r.method === req.method && r.re.test(url.pathname));
    if (!route) return fail(404, "없는 주소예요");
    try {
      const db = env.DB;
      const me = route.role ? await auth(req, db) : null;
      if (route.role && (!me || (route.role !== "any" && me.role !== route.role))) return fail(401, "다시 로그인해 주세요");
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const params = url.pathname.match(route.re).groups || {};
      const out = await route.fn({ db, env, me, body, params, url });
      const headers = {};
      if (out && out._cookie) { headers["set-cookie"] = out._cookie; delete out._cookie; }
      return json(out, 200, headers);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error(e);
      return fail(500, "문제가 생겼어요. 잠시 후 다시 시도해 주세요");
    }
  }
};
