-- 반별 선물 포함/미포함과 보물의 선물 표시. 기존 반은 선물 포함으로 유지돼요.
-- 이미 배포된 DB에 한 번만 실행: npx wrangler d1 execute highfos-treasure-hunter-db --remote --file=./migrations/003_class_gifts.sql
ALTER TABLE classes ADD COLUMN gifts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pool ADD COLUMN gift INTEGER NOT NULL DEFAULT 1;
UPDATE pool SET gift=0 WHERE points>0 OR name LIKE '%면제권%' OR name LIKE '%선택권%' OR name LIKE '%힌트%' OR name LIKE '%재시험%';
