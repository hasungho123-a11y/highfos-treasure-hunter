-- what children answered in the mini-games, for the teacher's report and for practising weak kinds of question.
-- answers: one row per child, day, kind of question, game and sea. misses: the latest wrong questions, as plain question text.
CREATE TABLE IF NOT EXISTS answers (
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  tag TEXT NOT NULL,
  game TEXT NOT NULL,
  map INTEGER NOT NULL DEFAULT 0,
  tries INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, date, tag, game, map)
);
CREATE INDEX IF NOT EXISTS idx_answers_date ON answers(date);
CREATE TABLE IF NOT EXISTS misses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  lines TEXT NOT NULL,
  answer TEXT NOT NULL,
  how TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_misses_student ON misses(student_id, id);
