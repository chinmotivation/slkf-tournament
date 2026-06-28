-- Migration 024: Head Master tournament ownership + isolated RLS
-- Each HM owns their own tournament(s). HMs can only see/manage their own data.
-- Super Admin and service-role bypass RLS as before.

-- ─── 1. Add owner_id to tournaments ──────────────────────────────────────────
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: use created_by as owner for existing rows
UPDATE tournaments SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

COMMENT ON COLUMN tournaments.owner_id IS 'Head Master who owns and manages this tournament. NULL = legacy/unassigned (super_admin manages).';

-- ─── 2. Helper: does the current HM own a given tournament? ──────────────────
CREATE OR REPLACE FUNCTION hm_owns_tournament(p_tournament_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = p_tournament_id AND owner_id = auth.uid()
  );
$$;

-- ─── 3. Drop old permissive HM tournament policies ────────────────────────────
DROP POLICY IF EXISTS "tournaments: head_master writes"  ON tournaments;
DROP POLICY IF EXISTS "tournaments: head_master updates" ON tournaments;

-- ─── 4. Tournaments — HM sees and manages only their own ──────────────────────

-- HM can read their own tournaments (super_admin uses service-role, bypasses RLS)
CREATE POLICY "tournaments: hm reads own"
  ON tournaments FOR SELECT
  USING (
    current_user_role() = 'head_master' AND owner_id = auth.uid()
    OR current_user_role() = 'super_admin'
  );

-- HM can create a tournament (owner_id must be set to themselves)
CREATE POLICY "tournaments: hm inserts own"
  ON tournaments FOR INSERT
  WITH CHECK (
    current_user_role() = 'head_master'
    AND owner_id = auth.uid()
  );

-- HM can update only their own tournaments
CREATE POLICY "tournaments: hm updates own"
  ON tournaments FOR UPDATE
  USING (
    current_user_role() = 'head_master'
    AND owner_id = auth.uid()
  );

-- ─── 5. student_applications — HM sees only their own tournament's data ───────
DROP POLICY IF EXISTS "student_applications: head_master reads all"  ON student_applications;
DROP POLICY IF EXISTS "student_applications: head_master updates"    ON student_applications;

CREATE POLICY "student_applications: hm reads own tournament"
  ON student_applications FOR SELECT
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

CREATE POLICY "student_applications: hm updates own tournament"
  ON student_applications FOR UPDATE
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  )
  WITH CHECK (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

-- ─── 6. applications (association path) — HM sees only their tournament ───────
DROP POLICY IF EXISTS "applications: head_master reads all"   ON applications;
DROP POLICY IF EXISTS "applications: head_master updates all" ON applications;

CREATE POLICY "applications: hm reads own tournament"
  ON applications FOR SELECT
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

CREATE POLICY "applications: hm updates own tournament"
  ON applications FOR UPDATE
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

-- ─── 7. athletes — HM sees only athletes in their tournament ──────────────────
DROP POLICY IF EXISTS "athletes: head_master reads all" ON athletes;

CREATE POLICY "athletes: hm reads own tournament"
  ON athletes FOR SELECT
  USING (
    current_user_role() = 'head_master'
    AND EXISTS (
      SELECT 1 FROM individual_entries ie
      WHERE ie.athlete_id = athletes.id
        AND hm_owns_tournament(ie.tournament_id)
    )
  );

-- ─── 8. student_profiles — HM sees profiles for their tournament's students ───
DROP POLICY IF EXISTS "student_profiles: head_master reads all" ON student_profiles;

CREATE POLICY "student_profiles: hm reads own tournament students"
  ON student_profiles FOR SELECT
  USING (
    current_user_role() = 'head_master'
    AND EXISTS (
      SELECT 1 FROM student_applications sa
      WHERE sa.user_id = student_profiles.id
        AND hm_owns_tournament(sa.tournament_id)
    )
  );

-- ─── 9. payment_submissions — HM sees only their tournament's payments ─────────
DROP POLICY IF EXISTS "payment_submissions: head_master reads all"     ON payment_submissions;
DROP POLICY IF EXISTS "payment_submissions: head_master updates status" ON payment_submissions;

CREATE POLICY "payment_submissions: hm reads own tournament"
  ON payment_submissions FOR SELECT
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

CREATE POLICY "payment_submissions: hm updates own tournament"
  ON payment_submissions FOR UPDATE
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

-- ─── 10. tournament_age_categories / weight_categories — HM owns their own ────
DROP POLICY IF EXISTS "age_categories: head_master writes"    ON tournament_age_categories;
DROP POLICY IF EXISTS "weight_categories: head_master writes" ON tournament_weight_categories;

CREATE POLICY "age_categories: hm manages own tournament"
  ON tournament_age_categories FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

CREATE POLICY "weight_categories: hm manages own tournament"
  ON tournament_weight_categories FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

-- ─── 11. Associations read policy — keep existing (they still see OPEN tournaments)
-- Note: association_rep still reads all OPEN tournaments for registration.
-- They do NOT need to see which HM owns it.

-- ─── 12. SLKF student_number sequence (per-tournament local numbering) ─────────
-- Each tournament uses its own sequence via a local counter stored in tournaments.
-- We add a column to track the last assigned local student number per tournament.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS last_student_number INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN tournaments.last_student_number IS 'Auto-incrementing counter for local student numbers within this tournament. Use nextval-style UPDATE RETURNING.';

-- Function to assign next student number for a tournament (HM calls this on approval)
CREATE OR REPLACE FUNCTION assign_student_number(p_tournament_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next  INTEGER;
  v_year  SMALLINT;
  v_code  TEXT;
BEGIN
  -- Increment and return in one atomic step
  UPDATE tournaments
  SET last_student_number = last_student_number + 1
  WHERE id = p_tournament_id
  RETURNING last_student_number, year INTO v_next, v_year;

  -- Format: SLKF/STU/2026/001
  RETURN 'SLKF/STU/' || v_year || '/' || LPAD(v_next::TEXT, 3, '0');
END;
$$;

COMMENT ON FUNCTION assign_student_number IS 'Atomically increments the per-tournament student counter and returns a formatted SLKF/STU/YYYY/NNN student number.';
