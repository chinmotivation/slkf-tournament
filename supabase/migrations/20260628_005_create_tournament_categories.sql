-- Migration 005: tournament_age_categories and tournament_weight_categories
-- Configured per tournament so future events can have different age/weight rules.

CREATE TABLE tournament_age_categories (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          UUID         NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_code          VARCHAR(30)  NOT NULL,
  category_label         VARCHAR(100) NOT NULL,
  min_age_years          SMALLINT,
  max_age_years          SMALLINT,
  is_individual_eligible BOOLEAN      NOT NULL DEFAULT true,
  is_team_kata_eligible  BOOLEAN      NOT NULL DEFAULT true,
  display_order          SMALLINT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, category_code)
);

COMMENT ON TABLE tournament_age_categories IS 'Age group definitions per tournament. category_code is the machine key used in individual_entries.age_category_code.';
COMMENT ON COLUMN tournament_age_categories.min_age_years IS 'Inclusive lower bound. Null = no lower limit.';
COMMENT ON COLUMN tournament_age_categories.max_age_years IS 'Exclusive upper bound. Null = no upper limit (SENIOR).';

CREATE TABLE tournament_weight_categories (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id      UUID          NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  age_category_id    UUID          NOT NULL REFERENCES tournament_age_categories(id) ON DELETE CASCADE,
  gender             gender_type   NOT NULL,
  weight_class_label VARCHAR(30)   NOT NULL,
  min_weight_kg      NUMERIC(5,2),
  max_weight_kg      NUMERIC(5,2),
  display_order      SMALLINT      NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, age_category_id, gender, weight_class_label)
);

COMMENT ON TABLE tournament_weight_categories IS 'Valid weight classes per age/gender. Populates weight dropdowns in registration form.';
