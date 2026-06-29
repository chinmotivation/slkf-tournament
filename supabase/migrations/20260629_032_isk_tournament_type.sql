-- Migration 032: ISK tournament type + team kata columns on student_applications
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add tournament_type to tournaments
--    'SLKF' = standard federation tournament
--    'ISK'  = ISK Sri Lanka tournament (includes T.KATA, ISK age groups, ISK fee schedule)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tournament_type TEXT NOT NULL DEFAULT 'SLKF'
    CHECK (tournament_type IN ('SLKF', 'ISK'));

-- 2. Add team kata fields to student_applications
ALTER TABLE student_applications
  ADD COLUMN IF NOT EXISTS team_kata_entry     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_kata_team_name TEXT;

-- 3. Drop the old CHECK that requires kata OR kumite (team-kata-only must also be valid)
ALTER TABLE student_applications
  DROP CONSTRAINT IF EXISTS student_applications_check;

-- 4. Add the corrected CHECK: at least one of kata, kumite, or team kata must be selected
ALTER TABLE student_applications
  ADD CONSTRAINT student_applications_event_check
    CHECK (kata_entry OR kumite_entry OR team_kata_entry);

-- ─── Mark your ISK tournament ────────────────────────────────────────────────
-- After running this migration, set tournament_type = 'ISK' for ISK tournaments.
-- Example (replace the name with your actual tournament name):
--
--   UPDATE tournaments
--   SET tournament_type = 'ISK'
--   WHERE name = 'OPEN KARATE COMPETITION 2026';
--
-- Or by code if you know the ID:
--   UPDATE tournaments SET tournament_type = 'ISK' WHERE id = '<your-tournament-uuid>';
