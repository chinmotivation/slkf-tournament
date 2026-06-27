-- Migration 003: associations table
-- One row per karate association/institution. 1:1 with an association_rep auth user.

CREATE TABLE associations (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID         NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  district                  VARCHAR(100) NOT NULL DEFAULT '',
  province                  VARCHAR(100) NOT NULL DEFAULT '',
  association_name          VARCHAR(200) NOT NULL DEFAULT '',
  slkf_registration_number  VARCHAR(50)  NOT NULL UNIQUE DEFAULT '',
  instructor_name           VARCHAR(150) NOT NULL DEFAULT '',
  whatsapp_number           VARCHAR(20)  NOT NULL DEFAULT '',
  email                     VARCHAR(150),
  is_profile_complete       BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE associations IS 'Karate association/institution that submits athletes. Maps to Excel right-panel association details.';
COMMENT ON COLUMN associations.slkf_registration_number IS 'Format: SLKF/AFF/... — must be unique across all associations.';
COMMENT ON COLUMN associations.is_profile_complete IS 'Set true once all required fields are filled. Blocks submission until true.';

-- Auto-create an empty association record when an association_rep registers.
CREATE OR REPLACE FUNCTION handle_new_association_rep()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'association_rep' THEN
    INSERT INTO public.associations (user_id, created_by)
    VALUES (NEW.id, NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_for_rep
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_association_rep();
