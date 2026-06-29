-- Migration 034: Store intended teammate names on student_applications
-- Team leader enters names of 2 teammates at registration time.
-- Actual team group is confirmed by HM after all 3 are approved.

ALTER TABLE student_applications
  ADD COLUMN IF NOT EXISTS team_kata_member2_name TEXT,
  ADD COLUMN IF NOT EXISTS team_kata_member3_name TEXT;

COMMENT ON COLUMN student_applications.team_kata_member2_name IS 'Name of intended 2nd team member, entered by team leader at registration.';
COMMENT ON COLUMN student_applications.team_kata_member3_name IS 'Name of intended 3rd team member, entered by team leader at registration.';
