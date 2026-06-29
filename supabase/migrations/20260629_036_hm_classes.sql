-- Migration 036: Training location / class management for Head Masters.
-- Each HM can define classes (training locations) their students belong to.
-- Students select their class when applying for a tournament.

CREATE TABLE IF NOT EXISTS hm_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hm_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hm_user_id, name)
);

CREATE INDEX idx_hm_classes_hm_user_id ON hm_classes(hm_user_id);

ALTER TABLE hm_classes ENABLE ROW LEVEL SECURITY;

-- HM manages their own classes
CREATE POLICY "hm_classes: hm manages own"
  ON hm_classes FOR ALL
  USING (hm_user_id = auth.uid())
  WITH CHECK (hm_user_id = auth.uid());

-- Any authenticated user can read classes (needed when student applies)
CREATE POLICY "hm_classes: authenticated read"
  ON hm_classes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed ISK HQ classes for the ISK head master (Dhammika Kasturi Mudali)
INSERT INTO hm_classes (hm_user_id, name) VALUES
  ('d5ea1559-512d-4898-9d7c-588960125090', 'ISK Headquarters Mahbage'),
  ('d5ea1559-512d-4898-9d7c-588960125090', 'Royal Mass Arena'),
  ('d5ea1559-512d-4898-9d7c-588960125090', 'Meegoda Dojo'),
  ('d5ea1559-512d-4898-9d7c-588960125090', 'Colombo Dojo'),
  ('d5ea1559-512d-4898-9d7c-588960125090', 'St. Anne''s Girls Dojo')
ON CONFLICT (hm_user_id, name) DO NOTHING;
