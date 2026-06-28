-- Migration 019: Draw eligibility sync
-- When an application is APPROVED, each athlete's individual_entries automatically
-- appear in their draw bracket (PREVIEW status). Bracket is auto-created if needed.
--
-- Also fixes the draw_brackets UNIQUE constraint to treat NULLs as equal
-- (Postgres 15 NULLS NOT DISTINCT) and drops the over-strict CHECK constraints
-- that prevented NULL kata_level / weight_class_label on unclassified brackets.

-- ─── Fix draw_brackets constraints ───────────────────────────────────────────

-- Drop over-strict CHECKs (kata_level / weight_class_label may be NULL when a
-- bracket groups all levels / all weights together)
ALTER TABLE draw_brackets
  DROP CONSTRAINT IF EXISTS chk_kata_level,
  DROP CONSTRAINT IF EXISTS chk_weight_class;

-- Recreate unique constraint so NULL = NULL (Postgres 15+)
ALTER TABLE draw_brackets
  DROP CONSTRAINT IF EXISTS draw_brackets_tournament_id_age_group_code_gender_event_kat_key;

ALTER TABLE draw_brackets
  ADD CONSTRAINT uq_draw_bracket_category
  UNIQUE NULLS NOT DISTINCT
    (tournament_id, age_group_code, gender, event, kata_level, weight_class_label);

-- ─── Helper: next power of two ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_next_power_of_two(n INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  p INTEGER := 1;
BEGIN
  IF n <= 1 THEN RETURN 1; END IF;
  WHILE p < n LOOP
    p := p * 2;
  END LOOP;
  RETURN p;
END;
$$;

-- ─── Helper: upsert a draw_bracket and return its id ─────────────────────────

CREATE OR REPLACE FUNCTION fn_find_or_create_draw_bracket(
  p_tournament_id      UUID,
  p_age_group_code     VARCHAR,
  p_gender             gender_type,
  p_event              event_type,
  p_kata_level         VARCHAR,   -- NULL = all levels
  p_weight_class_label VARCHAR    -- NULL = all weights
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to find an existing PREVIEW bracket for this exact category
  SELECT id INTO v_id
  FROM draw_brackets
  WHERE tournament_id      = p_tournament_id
    AND age_group_code     = p_age_group_code
    AND gender             = p_gender
    AND event              = p_event
    AND (kata_level         IS NOT DISTINCT FROM p_kata_level)
    AND (weight_class_label IS NOT DISTINCT FROM p_weight_class_label);

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Create if it does not exist yet
  INSERT INTO draw_brackets (
    tournament_id, age_group_code, gender, event,
    kata_level, weight_class_label, seeding_mode,
    participant_count, bracket_size, bye_count, status
  )
  VALUES (
    p_tournament_id, p_age_group_code, p_gender, p_event,
    p_kata_level, p_weight_class_label, 'ASSOCIATION_SEPARATION',
    0, 0, 0, 'PREVIEW'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── Helper: refresh bracket counts after participant change ──────────────────

CREATE OR REPLACE FUNCTION fn_refresh_bracket_counts(p_bracket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count   INTEGER;
  v_bracket INTEGER;
  v_byes    INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM draw_participants
  WHERE bracket_id = p_bracket_id AND is_bye = false AND is_eligible = true;

  v_bracket := fn_next_power_of_two(v_count);
  IF v_bracket < 2 THEN v_bracket := 2; END IF;
  v_byes := v_bracket - v_count;

  UPDATE draw_brackets
  SET participant_count = v_count,
      bracket_size      = v_bracket,
      bye_count         = v_byes,
      updated_at        = now()
  WHERE id = p_bracket_id;
END;
$$;

-- ─── Helper: add association participant and refresh counts ───────────────────

CREATE OR REPLACE FUNCTION fn_add_draw_participant(
  p_bracket_id           UUID,
  p_individual_entry_id  UUID,
  p_full_name            VARCHAR,
  p_association_id       UUID,
  p_association_name     VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only add to brackets still in PREVIEW (not yet locked)
  IF NOT EXISTS (
    SELECT 1 FROM draw_brackets WHERE id = p_bracket_id AND status = 'PREVIEW'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO draw_participants (
    bracket_id, individual_entry_id, full_name,
    association_id, association_name, is_bye, is_eligible
  )
  VALUES (
    p_bracket_id, p_individual_entry_id, p_full_name,
    p_association_id, p_association_name, false, true
  )
  ON CONFLICT (bracket_id, individual_entry_id) DO NOTHING;

  PERFORM fn_refresh_bracket_counts(p_bracket_id);
END;
$$;

-- ─── Sync trigger: association application approved ───────────────────────────
-- Fires when applications.status transitions to APPROVED.
-- For each individual_entry in the application, creates a draw_participant
-- in the matching bracket (auto-created if this is the first athlete in that category).

CREATE OR REPLACE FUNCTION fn_sync_draw_on_application_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry      RECORD;
  v_bracket_id UUID;
BEGIN
  -- Only act on transitions INTO 'APPROVED'
  IF NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  FOR v_entry IN
    SELECT
      ie.id                AS entry_id,
      ie.full_name,
      ie.age_category_code,
      ie.gender,
      ie.event,
      ie.association_id,
      a.association_name
    FROM individual_entries ie
    JOIN associations       a  ON a.id = ie.association_id
    WHERE ie.application_id = NEW.id
      AND ie.deleted_at IS NULL
  LOOP
    -- ── Kata bracket ──────────────────────────────────────────────────────────
    IF v_entry.event IN ('KATA', 'BOTH') THEN
      v_bracket_id := fn_find_or_create_draw_bracket(
        NEW.tournament_id,
        v_entry.age_group_code,
        v_entry.gender,
        'KATA',
        NULL,   -- kata_level: NULL = all levels together until head master sub-divides
        NULL
      );
      PERFORM fn_add_draw_participant(
        v_bracket_id,
        v_entry.entry_id,
        v_entry.full_name,
        v_entry.association_id,
        v_entry.association_name
      );
    END IF;

    -- ── Kumite bracket ────────────────────────────────────────────────────────
    IF v_entry.event IN ('KUMITE', 'BOTH') THEN
      v_bracket_id := fn_find_or_create_draw_bracket(
        NEW.tournament_id,
        v_entry.age_group_code,
        v_entry.gender,
        'KUMITE',
        NULL,
        NULL    -- weight_class_label: NULL = open weight until head master sub-divides
      );
      PERFORM fn_add_draw_participant(
        v_bracket_id,
        v_entry.entry_id,
        v_entry.full_name,
        v_entry.association_id,
        v_entry.association_name
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_draw_on_application_approved
  AFTER UPDATE OF status ON applications
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_draw_on_application_approved();

-- ─── Sync trigger: student application approved ───────────────────────────────
-- Student applications carry explicit kata_level and kumite_weight_class,
-- so they land in the specific sub-bracket (not the catch-all NULL bracket).

CREATE OR REPLACE FUNCTION fn_sync_draw_on_student_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bracket_id UUID;
BEGIN
  IF NEW.status <> 'APPROVED' OR OLD.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  -- ── Kata entry ────────────────────────────────────────────────────────────
  IF NEW.kata_entry = true THEN
    v_bracket_id := fn_find_or_create_draw_bracket(
      NEW.tournament_id,
      NEW.age_category_code,
      NEW.gender,
      'KATA',
      NEW.kata_level,   -- specific level e.g. 'LEVEL_1'
      NULL
    );
    IF EXISTS (SELECT 1 FROM draw_brackets WHERE id = v_bracket_id AND status = 'PREVIEW') THEN
      INSERT INTO draw_participants (
        bracket_id, student_application_id, full_name,
        association_id, association_name, is_bye, is_eligible
      )
      VALUES (
        v_bracket_id, NEW.id, NEW.full_name,
        NULL, NULL, false, true
      )
      ON CONFLICT (bracket_id, student_application_id) DO NOTHING;
      PERFORM fn_refresh_bracket_counts(v_bracket_id);
    END IF;
  END IF;

  -- ── Kumite entry ──────────────────────────────────────────────────────────
  IF NEW.kumite_entry = true THEN
    v_bracket_id := fn_find_or_create_draw_bracket(
      NEW.tournament_id,
      NEW.age_category_code,
      NEW.gender,
      'KUMITE',
      NULL,
      NEW.kumite_weight_class   -- specific class e.g. '-35kg'
    );
    IF EXISTS (SELECT 1 FROM draw_brackets WHERE id = v_bracket_id AND status = 'PREVIEW') THEN
      INSERT INTO draw_participants (
        bracket_id, student_application_id, full_name,
        association_id, association_name, is_bye, is_eligible
      )
      VALUES (
        v_bracket_id, NEW.id, NEW.full_name,
        NULL, NULL, false, true
      )
      ON CONFLICT (bracket_id, student_application_id) DO NOTHING;
      PERFORM fn_refresh_bracket_counts(v_bracket_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_draw_on_student_approved
  AFTER UPDATE OF status ON student_applications
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_draw_on_student_approved();
