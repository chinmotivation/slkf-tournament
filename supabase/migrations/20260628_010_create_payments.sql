-- Migration 010: payment_submissions and payment_verification_log
-- payment_submissions: the uploaded payment slip file. One per application (UPSERT on re-upload).
-- payment_verification_log: immutable audit trail of every approve/reject action.

CREATE TABLE payment_submissions (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE enforces one active submission per application
  application_id        UUID              NOT NULL UNIQUE REFERENCES applications(id) ON DELETE RESTRICT,
  tournament_id         UUID              NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  association_id        UUID              NOT NULL REFERENCES associations(id) ON DELETE RESTRICT,
  -- Supabase Storage path: {tournament_id}/{association_id}/{uuid}.{ext}
  storage_path          VARCHAR(500)      NOT NULL,
  -- Original filename stored for Head Master reference only (never used as storage path)
  original_filename     VARCHAR(255)      NOT NULL,
  mime_type             allowed_mime_type NOT NULL,
  file_size_bytes       INTEGER           NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  bank_reference_number VARCHAR(100),
  status                payment_status    NOT NULL DEFAULT 'PENDING',
  submitted_at          TIMESTAMPTZ       NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE payment_submissions IS 'Uploaded payment slip. UNIQUE on application_id: re-upload replaces the record (UPSERT). storage_path uses UUID filename, never the original name.';
COMMENT ON COLUMN payment_submissions.file_size_bytes IS 'Max 5 MB (5,242,880 bytes). Enforced at client and Storage bucket policy.';

-- Immutable audit trail. Never UPDATE or DELETE rows in this table.
CREATE TABLE payment_verification_log (
  id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id UUID                NOT NULL REFERENCES payment_submissions(id) ON DELETE RESTRICT,
  application_id        UUID                NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  -- Denormalized for reporting without joins
  tournament_id         UUID                NOT NULL,
  association_id        UUID                NOT NULL,
  verified_by           UUID                NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action                verification_action NOT NULL,
  reason                TEXT,
  verified_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_verification_log IS 'Append-only audit trail. One row per approve/reject action. Never updated or deleted. reason is required when action=REJECTED.';
