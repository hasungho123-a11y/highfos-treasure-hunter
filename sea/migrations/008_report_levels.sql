-- the report keeps primary and middle school questions apart, so each answer remembers the level it was asked at.
-- answers needs a new primary key, which SQLite can only do by rebuilding the table. Run once.
CREATE TABLE answers_new (
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
INSERT INTO answers_new (student_id, date, tag, game, map, level, tries, wrong)
  SELECT a.student_id, a.date, a.tag, a.game, a.map, COALESCE((SELECT c.level FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=a.student_id), 0), a.tries, a.wrong FROM answers a;
DROP TABLE answers;
ALTER TABLE answers_new RENAME TO answers;
CREATE INDEX IF NOT EXISTS idx_answers_date ON answers(date);
ALTER TABLE misses ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
UPDATE misses SET level=COALESCE((SELECT c.level FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=misses.student_id), 0);
-- the teacher's record of any one day
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
