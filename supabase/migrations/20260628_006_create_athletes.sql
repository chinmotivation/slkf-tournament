-- Migration 006: athletes master table
-- Optional master athlete records per association.
-- individual_entries.athlete_id FK is nullable for MVP — entry can exist without a master record.

CREATE TABLE athletes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID         NOT NULL REFERENCES associations(id) ON DELETE RESTRICT,
  full_name       VARCHAR(150) NOT NULL,
  date_of_birth   DATE         NOT NULL,
  gender          gender_type  NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE athletes IS 'Optional master athlete identity per association. Enables reuse across future tournaments. individual_entries.athlete_id is nullable so MVP can skip this table.';
