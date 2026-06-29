-- Migration 029: Fix draw_participants unique constraints
--
-- The original UNIQUE NULLS NOT DISTINCT constraints treat NULL=NULL, which means:
--   - Only ONE student (individual_entry_id=NULL) can exist per bracket — WRONG
--   - Only ONE entry (student_application_id=NULL) can exist per bracket — WRONG
--   - Only ONE bye (both NULL) can exist per bracket — WRONG
--
-- Fix: drop the broken constraints and replace with partial unique indexes
-- that only enforce uniqueness when the column is NOT NULL.

ALTER TABLE draw_participants
  DROP CONSTRAINT IF EXISTS uq_entry_per_bracket,
  DROP CONSTRAINT IF EXISTS uq_student_per_bracket;

-- Each individual_entry can appear at most once per bracket (ignored when null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_entry_per_bracket
  ON draw_participants(bracket_id, individual_entry_id)
  WHERE individual_entry_id IS NOT NULL;

-- Each student_application can appear at most once per bracket (ignored when null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_per_bracket
  ON draw_participants(bracket_id, student_application_id)
  WHERE student_application_id IS NOT NULL;
