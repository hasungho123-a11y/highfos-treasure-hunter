-- 금화·교환소 구조 → 항해 포인트 + 랜덤 보물상자 구조로 바꾸는 마이그레이션 (이미 배포된 DB용)
ALTER TABLE rewards ADD COLUMN weight INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS chests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  level INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  reward_name TEXT NOT NULL,
  reward_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'opened',
  opened_at INTEGER NOT NULL,
  delivered_at INTEGER,
  UNIQUE (student_id, season, level)
);

UPDATE rewards SET weight = CASE name
  WHEN '칭찬 스티커' THEN 6 WHEN '젤리·사탕 간식' THEN 5 WHEN '연필·지우개 세트' THEN 2 WHEN '하이포스 탐험 노트' THEN 1
  WHEN '자리 우선 선택권' THEN 3 WHEN '수업 끝 보드게임 10분' THEN 2 ELSE 1 END;

UPDATE settings SET value = '{"id":"s1","name":"겨울방학 트레저 헌터","xpPerLevel":100,"maxLevel":20,"weeklyClassGoal":1500,"chestLevels":[3,6,9,12,16,20]}' WHERE key = 'season';

UPDATE requests SET status = 'canceled' WHERE type = 'reward' AND status = 'pending';
