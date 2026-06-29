-- Migration 030: Security fixes — RLS hardening across draw tables, storage, and audit logs
--
-- Fixes:
--   SEC-1  draw_brackets/draw_participants/bracket_matches have no HM tournament-ownership filter
--   SEC-3  student_applications: rep update policy allows any rep to edit any application
--   SEC-4  payment-receipts storage bucket: association_rep can read every file in the bucket
--   SEC-6  excel_export_history and system_audit_log are not scoped to each HM's own tournament
--   BUG-2  individual_entries: rep UPDATE policy doesn't check parent application status

-- ─── SEC-1: Draw table ownership isolation ────────────────────────────────────
--
-- Previously, any authenticated head_master could read/write draw data for
-- ALL tournaments. Now policies use hm_owns_tournament() added in migration 024.

-- draw_brackets ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "draw_brackets: head_master all" ON draw_brackets;

CREATE POLICY "draw_brackets: hm manages own tournament"
  ON draw_brackets FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  )
  WITH CHECK (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

-- draw_participants ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "draw_participants: head_master all" ON draw_participants;

CREATE POLICY "draw_participants: hm manages own tournament"
  ON draw_participants FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = draw_participants.bracket_id
        AND hm_owns_tournament(db.tournament_id)
    )
  )
  WITH CHECK (
    current_user_role() = 'head_master'
    AND EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = draw_participants.bracket_id
        AND hm_owns_tournament(db.tournament_id)
    )
  );

-- bracket_matches ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bracket_matches: head_master all" ON bracket_matches;

CREATE POLICY "bracket_matches: hm manages own tournament"
  ON bracket_matches FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = bracket_matches.bracket_id
        AND hm_owns_tournament(db.tournament_id)
    )
  )
  WITH CHECK (
    current_user_role() = 'head_master'
    AND EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = bracket_matches.bracket_id
        AND hm_owns_tournament(db.tournament_id)
    )
  );

-- ─── SEC-3: Student application rep update scoping ───────────────────────────
--
-- Old policy allowed ANY association_rep to UPDATE any student application.
-- Fix: rep can only update student_applications for tournaments where their
-- association has a registered application.

DROP POLICY IF EXISTS "student_applications: rep updates" ON student_applications;

CREATE POLICY "student_applications: rep updates own tournament"
  ON student_applications FOR UPDATE
  USING (
    current_user_role() = 'association_rep'
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.tournament_id = student_applications.tournament_id
        AND a.association_id = current_association_id()
    )
  )
  WITH CHECK (
    current_user_role() = 'association_rep'
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.tournament_id = student_applications.tournament_id
        AND a.association_id = current_association_id()
    )
  );

-- ─── SEC-4: Payment receipts storage — remove overly broad rep access ─────────
--
-- Old policy: any association_rep (from ANY association) could read ALL files.
-- Fix: only the file owner (the student who uploaded) can read their own file.
--      Head masters retain read access for payment verification.
--      Reps manage association-path payments (payment_submissions table),
--      not individual student receipts — so rep read access is removed.

DROP POLICY IF EXISTS "payment-receipts: owner reads" ON storage.objects;

CREATE POLICY "payment-receipts: owner reads own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "payment-receipts: hm reads for verification"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND current_user_role() = 'head_master'
  );

-- ─── SEC-6: Audit and export history scoping ─────────────────────────────────
--
-- excel_export_history has tournament_id — scope each HM to their own.
-- system_audit_log has no tournament_id — restrict reads to super_admin only;
-- HMs can read their own audit entries (user_id = auth.uid()).

DROP POLICY IF EXISTS "excel_export: head_master only" ON excel_export_history;

CREATE POLICY "excel_export: hm reads own tournament"
  ON excel_export_history FOR ALL
  USING (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  )
  WITH CHECK (
    current_user_role() = 'head_master'
    AND hm_owns_tournament(tournament_id)
  );

DROP POLICY IF EXISTS "audit_log: head_master reads" ON system_audit_log;

CREATE POLICY "audit_log: super_admin reads all"
  ON system_audit_log FOR SELECT
  USING (current_user_role() = 'super_admin');

CREATE POLICY "audit_log: hm reads own entries"
  ON system_audit_log FOR SELECT
  USING (
    current_user_role() = 'head_master'
    AND user_id = auth.uid()
  );

-- ─── BUG-2: individual_entries — block rep edits after application submitted ──
--
-- Old policy let reps update entries whenever deleted_at IS NULL, regardless
-- of the parent application's status. Submitted/approved applications must be
-- immutable from the rep side.

DROP POLICY IF EXISTS "individual_entries: rep updates (draft only)" ON individual_entries;

CREATE POLICY "individual_entries: rep updates (draft only)"
  ON individual_entries FOR UPDATE
  USING (
    association_id = current_association_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = individual_entries.application_id
        AND a.status IN ('DRAFT', 'REJECTED')
    )
  );
