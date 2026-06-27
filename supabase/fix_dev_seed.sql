-- Run this in Supabase SQL Editor to fix the dev seed issues.
-- Step 1: Fix the trigger so each auto-created association gets a unique placeholder
--         (the UNIQUE constraint on slkf_registration_number blocked the second user)
CREATE OR REPLACE FUNCTION handle_new_association_rep()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'association_rep' THEN
    INSERT INTO public.associations (user_id, slkf_registration_number, created_by)
    VALUES (NEW.id, 'PENDING-' || gen_random_uuid()::text, NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Fix the head master profile — dashboard created it without metadata so
--         the trigger defaulted the role to 'association_rep'. Correct it.
UPDATE profiles
SET role = 'head_master'
WHERE id = 'd5ea1559-512d-4898-9d7c-588960125090';

-- Step 3: Delete the wrongly-created association record for the head master
DELETE FROM associations
WHERE user_id = 'd5ea1559-512d-4898-9d7c-588960125090';
