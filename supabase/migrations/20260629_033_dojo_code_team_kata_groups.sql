-- Migration 033: Dojo code for HMs + Student Team Kata Groups for ISK
-- ─────────────────────────────────────────────────────────────────────

-- 1. Add dojo_code + per-dojo student counter to associations
ALTER TABLE associations
  ADD COLUMN IF NOT EXISTS dojo_code           TEXT,
  ADD COLUMN IF NOT EXISTS last_student_number INTEGER NOT NULL DEFAULT 0;

-- Dojo codes are globally unique (each dojo has a unique identifier)
CREATE UNIQUE INDEX IF NOT EXISTS idx_associations_dojo_code
  ON associations(dojo_code)
  WHERE dojo_code IS NOT NULL;

COMMENT ON COLUMN associations.dojo_code IS 'Short dojo identifier e.g. WAT, COL, GAL. Used in student numbers: ISK-WAT-0001.';
COMMENT ON COLUMN associations.last_student_number IS 'Atomically incremented counter for student numbers within this dojo.';

-- 2. Student-proposed Team Kata groups (ISK tournaments)
--    Students propose a team of 3; the HM approves or rejects.
--    Drop and recreate so we get the correct status values and proposed_by column.
DROP TABLE IF EXISTS student_team_kata_groups CASCADE;

CREATE TABLE student_team_kata_groups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name      TEXT NOT NULL,
  -- Who created this record (student proposer or HM who created directly)
  proposed_by    UUID NOT NULL REFERENCES auth.users(id),
  member1_app_id UUID NOT NULL REFERENCES student_applications(id),
  member2_app_id UUID NOT NULL REFERENCES student_applications(id),
  member3_app_id UUID NOT NULL REFERENCES student_applications(id),
  -- PENDING = student proposed, awaiting HM. CONFIRMED = HM approved. REJECTED = HM rejected.
  status         TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Team name unique per tournament
  UNIQUE (tournament_id, team_name),
  -- All 3 members must be different
  CHECK (
    member1_app_id <> member2_app_id AND
    member2_app_id <> member3_app_id AND
    member1_app_id <> member3_app_id
  )
);

CREATE TRIGGER trg_student_team_kata_groups_updated_at
  BEFORE UPDATE ON student_team_kata_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE student_team_kata_groups ENABLE ROW LEVEL SECURITY;

-- HM can read, approve/reject, and delete groups for their own tournament
CREATE POLICY "team_kata_groups: hm manages own"
  ON student_team_kata_groups FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  )
  WITH CHECK (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

-- Students can propose (INSERT) a team where they are one of the 3 members
CREATE POLICY "team_kata_groups: student propose"
  ON student_team_kata_groups FOR INSERT
  WITH CHECK (
    current_user_role() = 'student'
    AND proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM student_applications sa
      WHERE sa.id IN (member1_app_id, member2_app_id, member3_app_id)
        AND sa.user_id = auth.uid()
    )
  );

-- Students can read their own team assignments
CREATE POLICY "team_kata_groups: student reads own"
  ON student_team_kata_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_applications sa
      WHERE sa.id IN (member1_app_id, member2_app_id, member3_app_id)
        AND sa.user_id = auth.uid()
    )
  );

-- 3. Replace assign_student_number — now produces ISK-[DOJO_CODE]-NNNN
CREATE OR REPLACE FUNCTION assign_student_number(p_tournament_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next      INTEGER;
  v_dojo_code TEXT;
  v_owner_id  UUID;
BEGIN
  -- Find the HM who owns this tournament
  SELECT owner_id INTO v_owner_id
  FROM tournaments WHERE id = p_tournament_id;

  -- Atomically increment the dojo's student counter
  UPDATE associations
  SET last_student_number = last_student_number + 1
  WHERE user_id = v_owner_id
  RETURNING last_student_number, dojo_code INTO v_next, v_dojo_code;

  IF NOT FOUND OR v_next IS NULL THEN
    -- Fallback: no association row found — use tournament counter
    UPDATE tournaments
    SET last_student_number = last_student_number + 1
    WHERE id = p_tournament_id
    RETURNING last_student_number INTO v_next;
    RETURN 'ISK-HM-' || LPAD(v_next::TEXT, 4, '0');
  END IF;

  -- ISK-WAT-0001 format
  RETURN 'ISK-' || COALESCE(UPPER(v_dojo_code), 'HM') || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION assign_student_number IS 'Atomically assigns the next student number for a dojo. Format: ISK-[DOJO_CODE]-NNNN.';
