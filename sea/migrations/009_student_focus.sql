-- the units a teacher sets for one child: a JSON list of up to three question kinds, '' for none
ALTER TABLE students ADD COLUMN focus TEXT NOT NULL DEFAULT '';
