-- 하이포스 제도 · D1 schema
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  battle INTEGER NOT NULL DEFAULT 1,  -- 0 = battles switched off for this class
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  sail INTEGER NOT NULL DEFAULT 0,
  look TEXT NOT NULL DEFAULT '{}',    -- decorations being worn
  ship TEXT NOT NULL DEFAULT 'dinghy',
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 1,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  kind TEXT NOT NULL,                 -- daily | weekly | challenge
  energy INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  quest_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
-- every change of energy, points or gold; balances are the sums of these columns
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                 -- quest | play | game | battle | deco | ship | exchange | exempt | adjust | start
  title TEXT NOT NULL,
  quest_id INTEGER,
  energy INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_student ON logs(student_id);
-- decorations, weapons and ships a student owns; log_id is the purchase, empty when it dropped from a game
CREATE TABLE IF NOT EXISTS owned (
  student_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  log_id INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (student_id, item)
);
-- one row per mini-game started, so a play can only pay out once
CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  score INTEGER,
  stars INTEGER
);
CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attacker INTEGER NOT NULL,
  defender INTEGER NOT NULL,
  winner INTEGER NOT NULL,
  a_power INTEGER NOT NULL,
  d_power INTEGER NOT NULL,
  delta INTEGER NOT NULL,             -- gold the attacker gained or lost
  date TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_battles_attacker ON battles(attacker, date);
-- homework passes bought with points, handed over by the teacher
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | delivered | canceled
  log_id INTEGER,
  month TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
