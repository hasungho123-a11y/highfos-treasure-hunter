-- when a class may battle: windows like '16:50-17:00,18:20-18:30' on its lesson days; '' = the game-wide hours
ALTER TABLE classes ADD COLUMN battle_times TEXT NOT NULL DEFAULT '';
