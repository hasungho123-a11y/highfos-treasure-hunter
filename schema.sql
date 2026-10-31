-- 하이포스 방학 트레저헌터 · D1 schema
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
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  sail INTEGER NOT NULL DEFAULT 0,
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
  kind TEXT NOT NULL,
  moves INTEGER NOT NULL DEFAULT 1,
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
-- every movement / point change; points = SUM(points), moves in a voyage season = SUM(moves WHERE season=?)
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  kind TEXT NOT NULL,            -- quest | adjust | arrive | bonus | buy | refund
  title TEXT NOT NULL,
  quest_id INTEGER,
  subject TEXT,
  quest_kind TEXT,
  moves INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  season TEXT NOT NULL,
  grp TEXT,
  date TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_student ON logs(student_id);
CREATE INDEX IF NOT EXISTS idx_logs_grp ON logs(grp);
-- treasure pool for chests
CREATE TABLE IF NOT EXISTS pool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,          -- 보통 | 희귀 | 전설
  weight INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
-- one chest per (student, season, voyage, stop); prize is drawn when it is opened
CREATE TABLE IF NOT EXISTS chests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  voyage INTEGER NOT NULL,
  stop INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed',   -- closed | opened | delivered
  reward TEXT,
  rarity TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  grp TEXT,
  created_at INTEGER NOT NULL,
  opened_at INTEGER,
  delivered_at INTEGER,
  UNIQUE (student_id, season, voyage, stop)
);
CREATE TABLE IF NOT EXISTS shop (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 선물 | 특권
  cost INTEGER NOT NULL,
  stock INTEGER,                 -- NULL = unlimited
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  shop_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | delivered | canceled
  log_id INTEGER,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
