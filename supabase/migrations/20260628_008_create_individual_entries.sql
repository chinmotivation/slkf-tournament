-- Migration 008: individual_entries table
-- Each row = one athlete in one tournament. Maps directly to one row in the Individual Excel sheet.

CREATE TABLE individual_entries (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Hierarchy
  application_id    UUID         NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  tournament_id     UUID         NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  association_id    UUID         NOT NULL REFERENCES associations(id) ON DELETE RESTRICT,
  -- Optional link to master athlete record
  athlete_id        UUID         REFERENCES athletes(id) ON DELETE SET NULL,
  -- Athlete data (denormalized for Excel-friendliness and historical accuracy)
  full_name         VARCHAR(150) NOT NULL,
  date_of_birth     DATE         NOT NULL,
  age_category_code VARCHAR(30)  NOT NULL,
  gender            gender_type  NOT NULL,
  event             event_type   NOT NULL,
  weight_kg         NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 200),
  -- Locked at entry time (fee rules may change between tournaments)
  entry_fee_lkr     INTEGER      NOT NULL CHECK (entry_fee_lkr > 0),
  -- Position in the Excel Individual sheet (P.CNT column)
  row_order         SMALLINT     NOT NULL CHECK (row_order BETWEEN 1 AND 100),
  -- Soft delete — preserves history
  deleted_at        TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (application_id, row_order)
);

COMMENT ON TABLE individual_entries IS 'One row per athlete per tournament. Maps to one data row in the Excel Individual sheet. row_order determines Excel row position (1=row4, 100=row103).';
COMMENT ON COLUMN individual_entries.entry_fee_lkr IS 'Locked at entry time. Rs.2000 for KATA or KUMITE, Rs.3000 for BOTH. Not recalculated if tournament fees change.';
COMMENT ON COLUMN individual_entries.age_category_code IS 'References tournament_age_categories.category_code for the associated tournament.';
COMMENT ON COLUMN individual_entries.deleted_at IS 'Soft delete. Rows with deleted_at IS NOT NULL are excluded from Excel export and counts.';
