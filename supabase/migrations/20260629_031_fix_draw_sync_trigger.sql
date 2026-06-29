-- Migration 031: Fix draw sync triggers
--
-- Bug 1 (019): fn_sync_draw_on_application_approved referenced v_entry.age_group_code
--   but the SELECT aliased the column as age_category_code → "record has no field age_group_code"
--
-- Bug 2 (019 + 029): fn_add_draw_participant used ON CONFLICT (bracket_id, individual_entry_id)
--   which matched the original UNIQUE constraint, but migration 029 replaced that constraint
--   with a partial index (WHERE individual_entry_id IS NOT NULL). ON CONFLICT must match the
--   partial index predicate exactly, so the WHERE clause is required.
--   Same fix applied to fn_sync_draw_on_student_approved for the student conflict clause.

-- ─── Fix 1: fn_add_draw_participant — partial index ON CONFLICT ───────────────

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
  ON CONFLICT (bracket_id, individual_entry_id)
    WHERE individual_entry_id IS NOT NULL
  DO NOTHING;

  PERFORM fn_refresh_bracket_counts(p_bracket_id);
END;
$$;

-- ─── Fix 2: fn_sync_draw_on_application_approved — wrong field name ──────────

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
    IF v_entry.event IN ('KATA', 'BOTH') THEN
      v_bracket_id := fn_find_or_create_draw_bracket(
        NEW.tournament_id,
        v_entry.age_category_code,   -- fixed: was v_entry.age_group_code
        v_entry.gender,
        'KATA',
        NULL,
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

    IF v_entry.event IN ('KUMITE', 'BOTH') THEN
      v_bracket_id := fn_find_or_create_draw_bracket(
        NEW.tournament_id,
        v_entry.age_category_code,   -- fixed: was v_entry.age_group_code
        v_entry.gender,
        'KUMITE',
        NULL,
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
  END LOOP;

  RETURN NEW;
END;
$$;

-- ─── Fix 3: fn_sync_draw_on_student_approved — partial index ON CONFLICT ─────

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

  IF NEW.kata_entry = true THEN
    v_bracket_id := fn_find_or_create_draw_bracket(
      NEW.tournament_id,
      NEW.age_category_code,
      NEW.gender,
      'KATA',
      NEW.kata_level,
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
      ON CONFLICT (bracket_id, student_application_id)
        WHERE student_application_id IS NOT NULL
      DO NOTHING;
      PERFORM fn_refresh_bracket_counts(v_bracket_id);
    END IF;
  END IF;

  IF NEW.kumite_entry = true THEN
    v_bracket_id := fn_find_or_create_draw_bracket(
      NEW.tournament_id,
      NEW.age_category_code,
      NEW.gender,
      'KUMITE',
      NULL,
      NEW.kumite_weight_class
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
      ON CONFLICT (bracket_id, student_application_id)
        WHERE student_application_id IS NOT NULL
      DO NOTHING;
      PERFORM fn_refresh_bracket_counts(v_bracket_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
