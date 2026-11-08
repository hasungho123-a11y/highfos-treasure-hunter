-- 하이포스 매쓰아일랜드 · D1 schema
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
  days TEXT NOT NULL DEFAULT '0123456', -- lesson days as weekday digits, 0 = Sunday; kids can only hand in missions on these
  daily_bonus INTEGER NOT NULL DEFAULT 0, -- extra energy on each daily mission, for classes with fewer lessons a week
  level INTEGER NOT NULL DEFAULT 0,   -- question level: 0 = 초등 고학년, 1 = 중1
  battle_times TEXT NOT NULL DEFAULT '', -- battle windows on lesson days, '16:50-17:00,18:20-18:30'; '' = the game-wide hours
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  seen_at INTEGER NOT NULL DEFAULT 0,
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  sail INTEGER NOT NULL DEFAULT 0,
  look TEXT NOT NULL DEFAULT '{}',    -- decorations being worn
  ship TEXT NOT NULL DEFAULT 'dinghy',
  photo INTEGER NOT NULL DEFAULT 0,   -- the approved photo on the sail or hull (photos.id)
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 1,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  focus TEXT NOT NULL DEFAULT '',     -- units the teacher set: JSON list of up to three question kinds
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
  deleted INTEGER NOT NULL DEFAULT 0,
  class_id INTEGER NOT NULL DEFAULT 0  -- 0 = every class
);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  at INTEGER NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(student_id, date);
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
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
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
  map INTEGER NOT NULL DEFAULT 0,
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

-- photo sails: a kid's photo waits for the teacher before anyone else can see it
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  data TEXT NOT NULL DEFAULT '',      -- base64 JPEG, emptied as soon as the photo is no longer in use
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | canceled | replaced | removed
  log_id INTEGER,                     -- the gold payment, deleted to refund on reject or cancel
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  decided_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_student ON photos(student_id, date);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_one_pending ON photos(student_id) WHERE status='pending';

-- the class boss: one a week per class, worn down together by missions and mini-games
CREATE TABLE IF NOT EXISTS bosses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  week TEXT NOT NULL,                 -- Monday of its week; an undefeated boss simply leaves when the week ends
  kind INTEGER NOT NULL,              -- index into BOSSES in src/worker.js
  hp INTEGER NOT NULL,
  gold INTEGER NOT NULL,              -- reward, fixed when the boss arrives
  finisher INTEGER NOT NULL DEFAULT 0, -- student who landed the last hit, 0 if the teacher did
  defeated_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (class_id, week)
);
CREATE TABLE IF NOT EXISTS boss_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,        -- 0 = the teacher's shot
  dmg INTEGER NOT NULL,
  src TEXT NOT NULL,                  -- quest | game | teacher
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boss_hits_boss ON boss_hits(boss_id);

-- a heart for a classmate's ship: one per friend per week, so the count can grow without being farmed in one sitting
CREATE TABLE IF NOT EXISTS likes (
  liker INTEGER NOT NULL,
  target INTEGER NOT NULL,
  week TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (liker, target, week)
);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target);

-- live duels between two classmates who are online at the same time; no gold changes hands
CREATE TABLE IF NOT EXISTS duels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  a INTEGER NOT NULL,                 -- who asked
  b INTEGER NOT NULL,                 -- who was asked
  level INTEGER NOT NULL DEFAULT 0,   -- the class's question level when the duel was asked for
  status TEXT NOT NULL DEFAULT 'wait', -- wait | live | done | declined | cancelled | expired
  date TEXT NOT NULL DEFAULT '',      -- set when the duel starts; this is what counts towards the daily limit
  round INTEGER NOT NULL DEFAULT 0,
  hp_a INTEGER NOT NULL DEFAULT 100,
  hp_b INTEGER NOT NULL DEFAULT 100,
  pa INTEGER NOT NULL DEFAULT 0,      -- battle power, fixed when the duel starts
  pb INTEGER NOT NULL DEFAULT 0,
  aim_a INTEGER,                      -- this round's answer: 0 wrong, otherwise ms taken; NULL until sent
  aim_b INTEGER,
  miss_a INTEGER NOT NULL DEFAULT 0,  -- rounds in a row with no answer at all
  miss_b INTEGER NOT NULL DEFAULT 0,
  deadline INTEGER NOT NULL DEFAULT 0,
  log TEXT NOT NULL DEFAULT '[]',     -- the shots of every finished round
  winner INTEGER,                     -- student id; 0 is a draw
  forfeit INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_duels_a ON duels(a, status);
CREATE INDEX IF NOT EXISTS idx_duels_b ON duels(b, status);

-- what children answered in the mini-games, for the teacher's report and for practising weak kinds of question.
-- answers: one row per child, day, kind of question, game and sea. misses: the latest wrong questions, as plain question text.
CREATE TABLE IF NOT EXISTS answers (
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  tag TEXT NOT NULL,
  game TEXT NOT NULL,
  map INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  tries INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, date, tag, game, map, level)
);
CREATE INDEX IF NOT EXISTS idx_answers_date ON answers(date);
CREATE TABLE IF NOT EXISTS misses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  lines TEXT NOT NULL,
  answer TEXT NOT NULL,
  how TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL,
  level INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_misses_student ON misses(student_id, id);
