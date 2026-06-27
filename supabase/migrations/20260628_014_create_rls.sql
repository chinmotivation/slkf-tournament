-- Migration 014: Row Level Security policies
-- RLS is enabled on all tables. Default deny. Policies are additive.

-- ─── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION current_association_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM associations WHERE user_id = auth.uid()
$$;

-- ─── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE associations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_age_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_weight_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_kata_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_kata_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verification_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_export_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log          ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "profiles: own row" ON profiles
  FOR ALL
  USING (id = auth.uid());

CREATE POLICY "profiles: head_master reads all" ON profiles
  FOR SELECT
  USING (current_user_role() = 'head_master');

-- ─── associations ─────────────────────────────────────────────────────────────

CREATE POLICY "associations: rep owns their row" ON associations
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "associations: head_master reads all" ON associations
  FOR SELECT
  USING (current_user_role() = 'head_master');

CREATE POLICY "associations: head_master updates all" ON associations
  FOR UPDATE
  USING (current_user_role() = 'head_master');

-- ─── tournaments ──────────────────────────────────────────────────────────────

-- All authenticated users can read tournaments (associations need fee/date info)
CREATE POLICY "tournaments: all authenticated read" ON tournaments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tournaments: head_master writes" ON tournaments
  FOR INSERT
  WITH CHECK (current_user_role() = 'head_master');

CREATE POLICY "tournaments: head_master updates" ON tournaments
  FOR UPDATE
  USING (current_user_role() = 'head_master');

-- ─── tournament_age_categories ────────────────────────────────────────────────

CREATE POLICY "age_categories: all authenticated read" ON tournament_age_categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "age_categories: head_master writes" ON tournament_age_categories
  FOR ALL
  USING (current_user_role() = 'head_master');

-- ─── tournament_weight_categories ─────────────────────────────────────────────

CREATE POLICY "weight_categories: all authenticated read" ON tournament_weight_categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "weight_categories: head_master writes" ON tournament_weight_categories
  FOR ALL
  USING (current_user_role() = 'head_master');

-- ─── athletes ────────────────────────────────────────────────────────────────

CREATE POLICY "athletes: rep owns their association" ON athletes
  FOR ALL
  USING (association_id = current_association_id());

CREATE POLICY "athletes: head_master reads all" ON athletes
  FOR SELECT
  USING (current_user_role() = 'head_master');

-- ─── applications ─────────────────────────────────────────────────────────────

CREATE POLICY "applications: rep owns their applications" ON applications
  FOR SELECT
  USING (association_id = current_association_id());

CREATE POLICY "applications: rep creates draft" ON applications
  FOR INSERT
  WITH CHECK (
    current_user_role() = 'association_rep'
    AND association_id = current_association_id()
  );

CREATE POLICY "applications: rep updates draft" ON applications
  FOR UPDATE
  USING (
    association_id = current_association_id()
    AND status IN ('DRAFT', 'REJECTED')
  );

CREATE POLICY "applications: head_master reads all" ON applications
  FOR SELECT
  USING (current_user_role() = 'head_master');

CREATE POLICY "applications: head_master updates all" ON applications
  FOR UPDATE
  USING (current_user_role() = 'head_master');

-- ─── individual_entries ───────────────────────────────────────────────────────

CREATE POLICY "individual_entries: rep reads own" ON individual_entries
  FOR SELECT
  USING (association_id = current_association_id());

CREATE POLICY "individual_entries: rep inserts (draft only)" ON individual_entries
  FOR INSERT
  WITH CHECK (
    current_user_role() = 'association_rep'
    AND association_id = current_association_id()
  );

CREATE POLICY "individual_entries: rep updates (draft only)" ON individual_entries
  FOR UPDATE
  USING (
    association_id = current_association_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "individual_entries: head_master reads all" ON individual_entries
  FOR SELECT
  USING (current_user_role() = 'head_master');

-- ─── team_kata_entries ────────────────────────────────────────────────────────

CREATE POLICY "team_kata_entries: rep reads own" ON team_kata_entries
  FOR SELECT
  USING (association_id = current_association_id());

CREATE POLICY "team_kata_entries: rep inserts (draft only)" ON team_kata_entries
  FOR INSERT
  WITH CHECK (
    current_user_role() = 'association_rep'
    AND association_id = current_association_id()
  );

CREATE POLICY "team_kata_entries: rep updates own" ON team_kata_entries
  FOR UPDATE
  USING (
    association_id = current_association_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "team_kata_entries: head_master reads all" ON team_kata_entries
  FOR SELECT
  USING (current_user_role() = 'head_master');

-- ─── team_kata_members ────────────────────────────────────────────────────────

CREATE POLICY "team_kata_members: rep manages via parent" ON team_kata_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_kata_entries te
      WHERE te.id = team_entry_id
        AND te.association_id = current_association_id()
    )
  );

CREATE POLICY "team_kata_members: head_master reads all" ON team_kata_members
  FOR SELECT
  USING (current_user_role() = 'head_master');

-- ─── payment_submissions ──────────────────────────────────────────────────────

CREATE POLICY "payment_submissions: rep reads own" ON payment_submissions
  FOR SELECT
  USING (association_id = current_association_id());

CREATE POLICY "payment_submissions: rep inserts" ON payment_submissions
  FOR INSERT
  WITH CHECK (
    current_user_role() = 'association_rep'
    AND association_id = current_association_id()
  );

CREATE POLICY "payment_submissions: rep updates own (pre-verify)" ON payment_submissions
  FOR UPDATE
  USING (
    association_id = current_association_id()
    AND status = 'PENDING'
  );

CREATE POLICY "payment_submissions: head_master reads all" ON payment_submissions
  FOR SELECT
  USING (current_user_role() = 'head_master');

CREATE POLICY "payment_submissions: head_master updates status" ON payment_submissions
  FOR UPDATE
  USING (current_user_role() = 'head_master');

-- ─── payment_verification_log ─────────────────────────────────────────────────

-- Append-only for head_master; association can read their own log
CREATE POLICY "verification_log: rep reads own" ON payment_verification_log
  FOR SELECT
  USING (association_id = current_association_id());

CREATE POLICY "verification_log: head_master reads all" ON payment_verification_log
  FOR SELECT
  USING (current_user_role() = 'head_master');

CREATE POLICY "verification_log: head_master inserts" ON payment_verification_log
  FOR INSERT
  WITH CHECK (current_user_role() = 'head_master');

-- No UPDATE or DELETE policies — table is immutable by design.

-- ─── excel_export_history ─────────────────────────────────────────────────────

CREATE POLICY "excel_export: head_master only" ON excel_export_history
  FOR ALL
  USING (current_user_role() = 'head_master');

-- ─── system_audit_log ─────────────────────────────────────────────────────────

-- Only head_master can read; writes happen via service-role (bypasses RLS)
CREATE POLICY "audit_log: head_master reads" ON system_audit_log
  FOR SELECT
  USING (current_user_role() = 'head_master');
