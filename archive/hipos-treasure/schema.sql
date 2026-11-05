-- 하이포스 방학 트레저 헌터 DB 스키마 (Cloudflare D1 / SQLite)
-- 실행: npm run db:init  (로컬)  /  npm run db:init:remote  (배포)

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 반(탐험대). code 는 아이들이 로그인할 때 입력하는 반 코드
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

-- 아이 계정: 실명 대신 닉네임 + 숫자 비밀번호(PIN, 해시 저장)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🧭',
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 1,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  UNIQUE (class_id, nickname)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  role TEXT NOT NULL,            -- 'teacher' | 'student'
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- 미션. kind: daily(매일 1회) / weekly(주 1회) / challenge(제한 없음)
CREATE TABLE IF NOT EXISTS quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,         -- 영어 | 수학 | 공통
  kind TEXT NOT NULL,
  xp INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

-- 보물 풀: 보물상자를 열면 weight(뽑힐 가중치) 비율로 1개가 랜덤으로 나온다.
-- stock 이 NULL 이면 무제한, 0 이 되면 더 이상 나오지 않는다. cost 는 예전 교환소용(사용 안 함)
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 실물 | 특권
  cost INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  stock INTEGER,
  active INTEGER NOT NULL DEFAULT 1
);

-- 아이가 연 보물상자. 섬(level)마다 시즌당 한 번
CREATE TABLE IF NOT EXISTS chests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  level INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  reward_name TEXT NOT NULL,
  reward_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'opened',   -- opened(전달 대기) | delivered
  opened_at INTEGER NOT NULL,
  delivered_at INTEGER,
  UNIQUE (student_id, season, level)
);

-- 항해 포인트(xp) 기록. 합계는 여기서 계산한다. coins 는 예전 금화용(사용 안 함)
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  kind TEXT NOT NULL,            -- quest | redeem | tier | adjust
  title TEXT NOT NULL,
  quest_id INTEGER,
  subject TEXT,
  quest_kind TEXT,
  reward_id INTEGER,
  level INTEGER,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  season TEXT NOT NULL,
  date TEXT NOT NULL,            -- 한국 시간 YYYY-MM-DD
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logs_student ON logs(student_id);

-- 아이가 보낸 요청: 미션 완료 / 보상 신청. 선생님이 승인해야 반영
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  type TEXT NOT NULL,            -- quest | reward
  quest_id INTEGER,
  reward_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | canceled
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS requests_status ON requests(status);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 기본 시즌 설정과 기본 미션·보상 (처음 한 번만 들어감)
INSERT OR IGNORE INTO settings (key, value) VALUES ('season', '{"id":"s1","name":"겨울방학 트레저 헌터","xpPerLevel":100,"maxLevel":20,"weeklyClassGoal":1500,"chestLevels":[3,6,9,12,16,20]}');

INSERT INTO quests (title, subject, kind, xp, coins)
SELECT * FROM (VALUES
  ('영어 단어 20개 외우기', '영어', 'daily', 20, 5),
  ('영어 리딩 1편 소리 내어 읽기', '영어', 'daily', 15, 3),
  ('주간 단어 테스트 90점 이상', '영어', 'weekly', 50, 15),
  ('영어 일기 3문장 쓰기', '영어', 'challenge', 40, 10),
  ('연산 학습지 1장', '수학', 'daily', 20, 5),
  ('오답노트 3문제 정리', '수학', 'daily', 25, 5),
  ('단원평가 80점 이상', '수학', 'weekly', 60, 15),
  ('서술형 문제 풀이 발표하기', '수학', 'challenge', 40, 10),
  ('숙제 제출', '공통', 'daily', 10, 3),
  ('지각 없이 일주일 출석', '공통', 'weekly', 40, 10)
) WHERE NOT EXISTS (SELECT 1 FROM quests);

INSERT INTO rewards (name, kind, weight, stock)
SELECT * FROM (VALUES
  ('젤리·사탕 간식', '실물', 5, NULL),
  ('다이소 문구 뽑기', '실물', 4, NULL),
  ('연필·지우개 세트', '실물', 2, 20),
  ('음료·아이스크림', '실물', 1, NULL),
  ('부모님께 칭찬 문자', '특권', 4, NULL),
  ('단어 시험 힌트 1개권', '특권', 3, NULL),
  ('오답노트 1문제 면제권', '특권', 3, NULL),
  ('숙제 절반 면제권', '특권', 2, NULL),
  ('단어 시험 재시험 기회권', '특권', 2, NULL),
  ('숙제 1회 면제권', '특권', 1, NULL)
) WHERE NOT EXISTS (SELECT 1 FROM rewards);
