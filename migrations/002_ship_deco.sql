-- 배 꾸미기: 학생이 착용 중인 꾸미기(look)와 산 꾸미기 목록(deco_owned).
-- 이미 배포된 DB에 한 번만 실행: npx wrangler d1 execute highfos-treasure-hunter-db --remote --file=./migrations/002_ship_deco.sql
ALTER TABLE students ADD COLUMN look TEXT NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS deco_owned (
  student_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  log_id INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (student_id, item)
);
