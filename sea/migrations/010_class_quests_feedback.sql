-- a mission can belong to one class; 0 = every class
ALTER TABLE quests ADD COLUMN class_id INTEGER NOT NULL DEFAULT 0;
-- what children write to the teacher from their log tab
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  at INTEGER NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback(student_id, date);
