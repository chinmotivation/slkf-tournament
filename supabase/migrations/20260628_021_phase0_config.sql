-- Migration 021: Phase 0 — tournament planning & configuration fields
-- Adds competition rules, event toggles, registration config, draw/match rules,
-- tatami configuration table, and public information fields.

ALTER TABLE tournaments
  -- Unified venue & competition dates (replaces split by age-group columns)
  ADD COLUMN IF NOT EXISTS venue                    VARCHAR(300),
  ADD COLUMN IF NOT EXISTS competition_start_date   DATE,
  ADD COLUMN IF NOT EXISTS competition_end_date     DATE,

  -- Competition rules
  ADD COLUMN IF NOT EXISTS competition_rules        VARCHAR(20)  NOT NULL DEFAULT 'WKF',
  ADD COLUMN IF NOT EXISTS custom_rules_text        TEXT,

  -- Event type toggles
  ADD COLUMN IF NOT EXISTS enable_individual_kata   BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_team_kata         BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_individual_kumite BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_team_kumite       BOOLEAN      NOT NULL DEFAULT false,

  -- Registration window
  ADD COLUMN IF NOT EXISTS registration_open_date   DATE,
  ADD COLUMN IF NOT EXISTS allow_late_registration  BOOLEAN      NOT NULL DEFAULT false,

  -- Entry limits
  ADD COLUMN IF NOT EXISTS max_entries_per_category SMALLINT     NOT NULL DEFAULT 3
    CONSTRAINT chk_max_entries CHECK (max_entries_per_category BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS max_team_kata_teams      SMALLINT     NOT NULL DEFAULT 4
    CONSTRAINT chk_max_team_kata CHECK (max_team_kata_teams BETWEEN 1 AND 20),

  -- Draw configuration
  ADD COLUMN IF NOT EXISTS draw_type                VARCHAR(30)  NOT NULL DEFAULT 'SINGLE_ELIMINATION',
  ADD COLUMN IF NOT EXISTS seeding_method           VARCHAR(30)  NOT NULL DEFAULT 'RANDOM',

  -- Medal rules
  ADD COLUMN IF NOT EXISTS medal_rule               VARCHAR(20)  NOT NULL DEFAULT 'TWO_BRONZE',

  -- Match rules
  ADD COLUMN IF NOT EXISTS match_duration_seconds   SMALLINT     NOT NULL DEFAULT 180
    CONSTRAINT chk_match_duration CHECK (match_duration_seconds BETWEEN 60 AND 600),
  ADD COLUMN IF NOT EXISTS kata_scoring_method      VARCHAR(30)  NOT NULL DEFAULT 'TOTAL_SCORE',
  ADD COLUMN IF NOT EXISTS kumite_scoring_method    VARCHAR(30)  NOT NULL DEFAULT 'POINT_BASED',
  ADD COLUMN IF NOT EXISTS tie_break_rule           VARCHAR(30)  NOT NULL DEFAULT 'SENSHU',

  -- Payment additions
  ADD COLUMN IF NOT EXISTS payment_deadline         DATE,
  ADD COLUMN IF NOT EXISTS payment_instructions     TEXT,

  -- Public information
  ADD COLUMN IF NOT EXISTS tournament_description   TEXT,
  ADD COLUMN IF NOT EXISTS organizer_contact        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rules_pdf_url            TEXT,

  -- Publish tracking
  ADD COLUMN IF NOT EXISTS published_at             TIMESTAMPTZ;

-- ─── Tatami configuration ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_tatamis (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID         NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name           VARCHAR(50)  NOT NULL,
  display_order  SMALLINT     NOT NULL DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tournament_tatamis_tournament
  ON tournament_tatamis (tournament_id, display_order);

ALTER TABLE tournament_tatamis ENABLE ROW LEVEL SECURITY;

-- Head master: full CRUD
CREATE POLICY "hm_manage_tatamis" ON tournament_tatamis
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role::text = 'head_master'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role::text = 'head_master'
    )
  );

-- Super admin: read only
CREATE POLICY "admin_read_tatamis" ON tournament_tatamis
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role::text = 'super_admin'
    )
  );
