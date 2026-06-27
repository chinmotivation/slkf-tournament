-- Migration 007: applications table
-- Central workflow record. One per association per tournament.
-- All registrations and payment submissions attach to this record.

CREATE TABLE applications (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID               NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  association_id   UUID               NOT NULL REFERENCES associations(id) ON DELETE RESTRICT,
  status           application_status NOT NULL DEFAULT 'DRAFT',
  submitted_at     TIMESTAMPTZ,
  locked_at        TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (tournament_id, association_id)
);

COMMENT ON TABLE applications IS 'One application per association per tournament. Status machine: DRAFT → PENDING_VERIFICATION → APPROVED/REJECTED.';
COMMENT ON COLUMN applications.locked_at IS 'Set when payment slip is uploaded. Entries become read-only after this point.';
COMMENT ON COLUMN applications.rejection_reason IS 'Populated by head_master when status = REJECTED. Cleared on re-submission.';
