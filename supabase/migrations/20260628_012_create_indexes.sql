-- Migration 012: Performance indexes
-- Covers all high-frequency query patterns identified in Step 03.

-- applications
CREATE INDEX idx_applications_tournament_id        ON applications(tournament_id);
CREATE INDEX idx_applications_association_id       ON applications(association_id);
CREATE INDEX idx_applications_status               ON applications(status);
-- Verification queue: filter by tournament + status
CREATE INDEX idx_applications_tournament_status    ON applications(tournament_id, status);

-- individual_entries — hottest table during Excel generation
CREATE INDEX idx_individual_entries_application_id ON individual_entries(application_id);
CREATE INDEX idx_individual_entries_tournament_id  ON individual_entries(tournament_id);
-- Excel generation query: ordered by row_order per application
CREATE INDEX idx_individual_entries_row_order      ON individual_entries(application_id, row_order);
-- Exclude soft-deleted in most queries
CREATE INDEX idx_individual_entries_active
  ON individual_entries(application_id)
  WHERE deleted_at IS NULL;

-- team_kata_entries
CREATE INDEX idx_team_kata_application_id          ON team_kata_entries(application_id);
CREATE INDEX idx_team_kata_tournament_id           ON team_kata_entries(tournament_id);
-- Excel T-Kata sheet: ordered by block_order per application
CREATE INDEX idx_team_kata_block_order             ON team_kata_entries(application_id, block_order);
CREATE INDEX idx_team_kata_active
  ON team_kata_entries(application_id)
  WHERE deleted_at IS NULL;

-- team_kata_members
CREATE INDEX idx_team_kata_members_team_entry_id   ON team_kata_members(team_entry_id);

-- payment_submissions
CREATE INDEX idx_payment_submissions_application_id ON payment_submissions(application_id);
CREATE INDEX idx_payment_submissions_tournament_id  ON payment_submissions(tournament_id);
-- Verification queue filter
CREATE INDEX idx_payment_submissions_status         ON payment_submissions(status);

-- payment_verification_log
CREATE INDEX idx_payment_log_submission_id          ON payment_verification_log(payment_submission_id);
CREATE INDEX idx_payment_log_application_id         ON payment_verification_log(application_id);

-- excel_export_history
CREATE INDEX idx_excel_export_tournament_id         ON excel_export_history(tournament_id);

-- system_audit_log
CREATE INDEX idx_audit_log_user_id                  ON system_audit_log(user_id);
CREATE INDEX idx_audit_log_action                   ON system_audit_log(action);
CREATE INDEX idx_audit_log_entity                   ON system_audit_log(entity_type, entity_id);
-- Always read newest-first
CREATE INDEX idx_audit_log_created_at               ON system_audit_log(created_at DESC);

-- athletes
CREATE INDEX idx_athletes_association_id            ON athletes(association_id);
