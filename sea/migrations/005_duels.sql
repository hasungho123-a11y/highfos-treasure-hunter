-- live duels between two classmates who are online at the same time; no gold changes hands
ALTER TABLE students ADD COLUMN seen_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS duels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  a INTEGER NOT NULL,                 -- who asked
  b INTEGER NOT NULL,                 -- who was asked
  status TEXT NOT NULL DEFAULT 'wait', -- wait | live | done | declined | cancelled | expired
  date TEXT NOT NULL DEFAULT '',      -- set when the duel starts; this is what counts towards the daily limit
  round INTEGER NOT NULL DEFAULT 0,
  hp_a INTEGER NOT NULL DEFAULT 100,
  hp_b INTEGER NOT NULL DEFAULT 100,
  pa INTEGER NOT NULL DEFAULT 0,      -- battle power, fixed when the duel starts
  pb INTEGER NOT NULL DEFAULT 0,
  aim_a INTEGER,                      -- this round's shot: 0 miss, 1 near, 2 perfect; NULL until sent
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
