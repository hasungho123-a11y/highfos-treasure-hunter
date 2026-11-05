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
