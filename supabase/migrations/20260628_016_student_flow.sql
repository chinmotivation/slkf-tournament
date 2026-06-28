-- Migration 016: Student applicant flow
-- Adds student role, student_profiles, student_applications tables, storage bucket and RLS.

-- ─── Extend user_role enum ────────────────────────────────────────────────────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';

-- ─── student_profiles ────────────────────────────────────────────────────────
-- Stores extended registration info for student users.

CREATE TABLE student_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender      gender_type NOT NULL,
  belt_grade  TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_applications ─────────────────────────────────────────────────────
-- One row per student per tournament. Status flows: PENDING → APPROVED | REJECTED.

CREATE TABLE student_applications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id        UUID NOT NULL REFERENCES tournaments(id),

  -- Snapshot of student profile at time of application
  full_name            TEXT NOT NULL,
  date_of_birth        DATE NOT NULL,
  gender               gender_type NOT NULL,
  belt_grade           TEXT NOT NULL,
  age_category_code    TEXT NOT NULL,

  -- Event selection
  kata_entry           BOOLEAN NOT NULL DEFAULT false,
  kata_level           TEXT,
  kumite_entry         BOOLEAN NOT NULL DEFAULT false,
  kumite_weight_class  TEXT,

  -- Payment
  payment_receipt_url  TEXT,
  total_amount_lkr     INTEGER NOT NULL DEFAULT 0 CHECK (total_amount_lkr >= 0),

  -- Workflow
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  student_number       TEXT UNIQUE,
  reviewed_by          UUID REFERENCES auth.users(id),
  reviewed_at          TIMESTAMPTZ,
  review_notes         TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One application per student per tournament
  UNIQUE (user_id, tournament_id),
  -- Must enter at least one event
  CHECK (kata_entry OR kumite_entry)
);

CREATE TRIGGER trg_student_applications_updated_at
  BEFORE UPDATE ON student_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sequence for student numbers: SLK-2026-0001
CREATE SEQUENCE IF NOT EXISTS student_number_seq START 1;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_student_applications_user_id       ON student_applications(user_id);
CREATE INDEX idx_student_applications_tournament_id ON student_applications(tournament_id);
CREATE INDEX idx_student_applications_status        ON student_applications(status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE student_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;

-- student_profiles
CREATE POLICY "student_profiles: own row"
  ON student_profiles FOR ALL
  USING (id = auth.uid());

CREATE POLICY "student_profiles: head_master reads all"
  ON student_profiles FOR SELECT
  USING (current_user_role() = 'head_master');

CREATE POLICY "student_profiles: rep reads all"
  ON student_profiles FOR SELECT
  USING (current_user_role() = 'association_rep');

-- student_applications
CREATE POLICY "student_applications: student reads own"
  ON student_applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "student_applications: student inserts own"
  ON student_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "student_applications: student updates own pending"
  ON student_applications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "student_applications: head_master reads all"
  ON student_applications FOR SELECT
  USING (current_user_role() = 'head_master');

CREATE POLICY "student_applications: rep reads all"
  ON student_applications FOR SELECT
  USING (current_user_role() = 'association_rep');

CREATE POLICY "student_applications: head_master updates"
  ON student_applications FOR UPDATE
  USING (current_user_role() = 'head_master')
  WITH CHECK (current_user_role() = 'head_master');

CREATE POLICY "student_applications: rep updates"
  ON student_applications FOR UPDATE
  USING (current_user_role() = 'association_rep')
  WITH CHECK (current_user_role() = 'association_rep');

-- ─── Storage bucket ──────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "payment-receipts: authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "payment-receipts: owner reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR current_user_role() IN ('head_master', 'association_rep')
    )
  );
