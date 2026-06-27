-- Migration 011: excel_export_history and system_audit_log

CREATE TABLE excel_export_history (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id               UUID         NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  exported_by                 UUID         NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Snapshot values at export time (not recomputed later)
  snapshot_individual_count   INTEGER      NOT NULL,
  snapshot_team_count         INTEGER      NOT NULL,
  snapshot_total_payment_lkr  INTEGER      NOT NULL,
  exported_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE excel_export_history IS 'Log of every workbook download. Snapshot counts are frozen at export time.';

CREATE TABLE system_audit_log (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_audit_log IS 'General-purpose append-only action audit trail. Written via service-role key only.';
