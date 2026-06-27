-- Migration 004: tournaments table
-- Master tournament record. All fee and limit configuration stored here.

CREATE TABLE tournaments (
  id                                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name                                    VARCHAR(200)   NOT NULL,
  code                                    VARCHAR(30)    NOT NULL UNIQUE,
  year                                    SMALLINT       NOT NULL,
  subtitle                                VARCHAR(200),
  registration_deadline                   DATE           NOT NULL,
  age_eligibility_cutoff_date             DATE           NOT NULL,
  status                                  tournament_status NOT NULL DEFAULT 'DRAFT',
  -- Venue and schedule
  venue_u14                               VARCHAR(300),
  venue_cadet_junior                      VARCHAR(300),
  venue_u21_senior                        VARCHAR(300),
  date_u14_start                          DATE,
  date_u14_end                            DATE,
  date_cadet_junior                       DATE,
  date_u21_senior_start                   DATE,
  date_u21_senior_end                     DATE,
  -- Bank payment details
  bank_account_name                       VARCHAR(200)   NOT NULL DEFAULT '',
  bank_account_number                     VARCHAR(50)    NOT NULL DEFAULT '',
  bank_name                               VARCHAR(100)   NOT NULL DEFAULT '',
  bank_branch                             VARCHAR(100)   NOT NULL DEFAULT '',
  -- Fee structure (stored in LKR, no decimals)
  fee_individual_one_event_lkr            INTEGER        NOT NULL DEFAULT 2000 CHECK (fee_individual_one_event_lkr > 0),
  fee_individual_both_events_lkr          INTEGER        NOT NULL DEFAULT 3000 CHECK (fee_individual_both_events_lkr > 0),
  fee_team_kata_lkr                       INTEGER        NOT NULL DEFAULT 3000 CHECK (fee_team_kata_lkr > 0),
  -- Limits
  max_team_members                        SMALLINT       NOT NULL DEFAULT 4,
  max_u14_teams_per_gender                SMALLINT       NOT NULL DEFAULT 2,
  max_individual_athletes_per_application SMALLINT       NOT NULL DEFAULT 100,
  -- Internal notes
  notes                                   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE tournaments IS 'Master tournament. All configuration lives here so future events need no code changes.';
COMMENT ON COLUMN tournaments.code IS 'Short identifier, e.g. OKC-2026. Used in filenames and URLs.';
COMMENT ON COLUMN tournaments.age_eligibility_cutoff_date IS 'Athlete ages are calculated as of this date. OKC-2026: 2026-07-17.';
