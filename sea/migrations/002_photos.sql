-- photo sails: a kid's photo waits for the teacher before anyone else can see it
ALTER TABLE students ADD COLUMN photo INTEGER NOT NULL DEFAULT 0;
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
