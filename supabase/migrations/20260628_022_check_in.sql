-- Migration 022: QR-based check-in
-- Adds a unique check_in_token to individual_entries and student_applications
-- so each athlete can receive a QR code that officials scan on competition day.

-- ─── Individual entries (association athletes) ────────────────────────────────

ALTER TABLE individual_entries
  ADD COLUMN IF NOT EXISTS check_in_token UUID        NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by  UUID        REFERENCES profiles(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_individual_entries_check_in_token
  ON individual_entries (check_in_token);

-- ─── Student applications ─────────────────────────────────────────────────────

ALTER TABLE student_applications
  ADD COLUMN IF NOT EXISTS check_in_token UUID        NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by  UUID        REFERENCES profiles(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_applications_check_in_token
  ON student_applications (check_in_token);
