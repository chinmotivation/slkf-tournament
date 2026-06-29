-- Migration 039: Ensure head_masters have an associations row for dojo settings.
--
-- Root cause: the associations table auto-creates rows only for association_rep
-- users. HMs need their own row to store dojo_code, logo_url, etc.
-- The slkf_registration_number column had NOT NULL + UNIQUE + DEFAULT '' which
-- prevents multiple HM inserts (all would collide on the empty-string default).

-- 1. Relax slkf_registration_number so it can be NULL for HM rows
ALTER TABLE associations
  ALTER COLUMN slkf_registration_number DROP NOT NULL,
  ALTER COLUMN slkf_registration_number DROP DEFAULT;

-- 2. Replace the blanket UNIQUE constraint with a partial index (ignore NULLs and '')
ALTER TABLE associations
  DROP CONSTRAINT IF EXISTS associations_slkf_registration_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_associations_slkf_reg_nonempty
  ON associations(slkf_registration_number)
  WHERE slkf_registration_number IS NOT NULL
    AND slkf_registration_number <> '';

-- 3. Trigger: auto-create an empty associations row when a head_master profile
--    is inserted (mirrors the existing association_rep trigger in migration 003).
CREATE OR REPLACE FUNCTION handle_new_head_master_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'head_master' THEN
    INSERT INTO public.associations (user_id, created_by)
    VALUES (NEW.id, NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_for_hm
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_head_master_profile();

-- 4. Back-fill: seed an associations row for the dev HM user.
--    (safe to run multiple times — ON CONFLICT does nothing)
INSERT INTO associations (user_id, created_by, association_name, instructor_name)
SELECT
  p.id,
  p.id,
  COALESCE(NULLIF(p.full_name, ''), 'ISK Dojo'),
  p.full_name
FROM profiles p
WHERE p.role = 'head_master'
ON CONFLICT (user_id) DO NOTHING;
