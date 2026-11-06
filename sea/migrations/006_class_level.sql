-- question level per class: 0 = 초등 고학년, 1 = 중1. Existing classes stay 초등.
ALTER TABLE classes ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE duels ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
