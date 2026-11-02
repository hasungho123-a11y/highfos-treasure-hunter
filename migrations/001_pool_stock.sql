-- 보물에 재고(개수 제한) 추가. NULL = 무제한, 0 = 더 이상 안 나옴.
-- 이미 배포된 DB에 한 번만 실행: npx wrangler d1 execute highfos-treasure-hunter-db --remote --file=./migrations/001_pool_stock.sql
ALTER TABLE pool ADD COLUMN stock INTEGER;
