-- Migration 020: Add referee role
--
-- IMPORTANT: Run this in TWO separate steps in the Supabase SQL Editor.
-- PostgreSQL requires ALTER TYPE ADD VALUE to be committed before the new
-- enum value can be referenced in the same session.
--
-- ════════════════════════════════════════════════════════════════
-- STEP 1 — Run this block first, then click Run.
-- ════════════════════════════════════════════════════════════════

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'referee';

-- ════════════════════════════════════════════════════════════════
-- STEP 2 — After Step 1 succeeds, clear the editor, paste only
--           the lines below, and click Run again.
-- ════════════════════════════════════════════════════════════════

-- Allow referees to read draw_brackets that are LOCKED/IN_PROGRESS/COMPLETE
CREATE POLICY "referee_read_active_brackets"
  ON draw_brackets FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'referee'
    AND status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETE')
  );

-- Allow referees to read bracket_matches for active brackets
CREATE POLICY "referee_read_bracket_matches"
  ON bracket_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = bracket_matches.bracket_id
        AND db.status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETE')
        AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'referee'
    )
  );

-- Allow referees to read draw_participants (athlete names in the score table)
CREATE POLICY "referee_read_draw_participants"
  ON draw_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = draw_participants.bracket_id
        AND db.status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETE')
        AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'referee'
    )
  );

-- Allow referees to read tournaments (for dashboard tournament name/code)
CREATE POLICY "referee_read_tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (
    (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'referee'
  );
