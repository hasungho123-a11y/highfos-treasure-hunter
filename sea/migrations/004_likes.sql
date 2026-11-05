-- a heart for a classmate's ship: one per friend per week, so the count can grow without being farmed in one sitting
CREATE TABLE IF NOT EXISTS likes (
  liker INTEGER NOT NULL,
  target INTEGER NOT NULL,
  week TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (liker, target, week)
);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target);
