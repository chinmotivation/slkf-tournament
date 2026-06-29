-- Migration 027: 4 students per kumite bracket — 2 clean test brackets
--   CADET MALE KUMITE -57  → 4 persons (bracket_size=4, 0 byes, 2 rounds)
--   JUNIOR MALE KUMITE -61 → 4 persons (bracket_size=4, 0 byes, 2 rounds)
--
-- ⚠ BEFORE RUNNING: Verify your tournament_id with this query:
--     SELECT id, code, name FROM tournaments ORDER BY created_at DESC LIMIT 5;
--
-- If your tournament is NOT '00000000-0000-0000-0000-000000000010',
-- change v_tournament_id below to match.
--
-- AFTER RUNNING: Draw Engine → Setup / Refresh Brackets → Generate Draw on either bracket.

DO $$
DECLARE
  v_tournament_id UUID := '00000000-0000-0000-0000-000000000010';
  v_instance_id   UUID := '00000000-0000-0000-0000-000000000000';

  -- CADET MALE KUMITE -57 (4 students)
  v_m1 UUID := '00000000-0000-0000-0000-000000000401';
  v_m2 UUID := '00000000-0000-0000-0000-000000000402';
  v_m3 UUID := '00000000-0000-0000-0000-000000000403';
  v_m4 UUID := '00000000-0000-0000-0000-000000000404';

  -- JUNIOR MALE KUMITE -61 (4 students)
  v_m5 UUID := '00000000-0000-0000-0000-000000000405';
  v_m6 UUID := '00000000-0000-0000-0000-000000000406';
  v_m7 UUID := '00000000-0000-0000-0000-000000000407';
  v_m8 UUID := '00000000-0000-0000-0000-000000000408';

BEGIN

  -- ─── Auth users ─────────────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (v_m1, v_instance_id, 'authenticated', 'authenticated',
     'nimal.silva.k1@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Nimal Silva"}', now(), now()),
    (v_m2, v_instance_id, 'authenticated', 'authenticated',
     'kasun.perera.k2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Kasun Perera"}', now(), now()),
    (v_m3, v_instance_id, 'authenticated', 'authenticated',
     'thilina.jayawardena.k3@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Thilina Jayawardena"}', now(), now()),
    (v_m4, v_instance_id, 'authenticated', 'authenticated',
     'ruwan.bandara.k4@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Ruwan Bandara"}', now(), now()),
    (v_m5, v_instance_id, 'authenticated', 'authenticated',
     'lahiru.fernando.k5@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Lahiru Fernando"}', now(), now()),
    (v_m6, v_instance_id, 'authenticated', 'authenticated',
     'chathura.dissanayake.k6@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Chathura Dissanayake"}', now(), now()),
    (v_m7, v_instance_id, 'authenticated', 'authenticated',
     'supun.rathnayake.k7@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Supun Rathnayake"}', now(), now()),
    (v_m8, v_instance_id, 'authenticated', 'authenticated',
     'dilan.rajapaksa.k8@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Dilan Rajapaksa"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ─── Student profiles ────────────────────────────────────────────────────────
  INSERT INTO student_profiles (id, full_name, date_of_birth, gender, belt_grade, phone)
  VALUES
    (v_m1, 'Nimal Silva',          '2010-03-12', 'MALE', 'Brown Belt',         '0771400001'),
    (v_m2, 'Kasun Perera',         '2011-07-04', 'MALE', 'Blue Belt',          '0771400002'),
    (v_m3, 'Thilina Jayawardena',  '2010-11-28', 'MALE', 'Black Belt 1st Dan', '0771400003'),
    (v_m4, 'Ruwan Bandara',        '2011-02-19', 'MALE', 'Brown Belt',         '0771400004'),
    (v_m5, 'Lahiru Fernando',      '2009-05-23', 'MALE', 'Black Belt 1st Dan', '0771400005'),
    (v_m6, 'Chathura Dissanayake', '2010-01-17', 'MALE', 'Black Belt 1st Dan', '0771400006'),
    (v_m7, 'Supun Rathnayake',     '2009-09-08', 'MALE', 'Black Belt 1st Dan', '0771400007'),
    (v_m8, 'Dilan Rajapaksa',      '2010-04-25', 'MALE', 'Black Belt 1st Dan', '0771400008')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Student applications — all APPROVED ────────────────────────────────────
  INSERT INTO student_applications (
    user_id, tournament_id,
    full_name, date_of_birth, gender, belt_grade, age_category_code,
    kata_entry, kata_level, kumite_entry, kumite_weight_class,
    total_amount_lkr, status, student_number,
    reviewed_at, review_notes
  ) VALUES

    -- CADET MALE KUMITE -57 × 4
    (v_m1, v_tournament_id, 'Nimal Silva',         '2010-03-12', 'MALE', 'Brown Belt',         'CADET',
     false, null, true, '-57', 2000, 'APPROVED', 'SLKF/STU/2026/201', now() - interval '1 day', null),
    (v_m2, v_tournament_id, 'Kasun Perera',        '2011-07-04', 'MALE', 'Blue Belt',          'CADET',
     false, null, true, '-57', 2000, 'APPROVED', 'SLKF/STU/2026/202', now() - interval '1 day', null),
    (v_m3, v_tournament_id, 'Thilina Jayawardena', '2010-11-28', 'MALE', 'Black Belt 1st Dan', 'CADET',
     false, null, true, '-57', 2000, 'APPROVED', 'SLKF/STU/2026/203', now() - interval '1 day', null),
    (v_m4, v_tournament_id, 'Ruwan Bandara',       '2011-02-19', 'MALE', 'Brown Belt',         'CADET',
     false, null, true, '-57', 2000, 'APPROVED', 'SLKF/STU/2026/204', now() - interval '1 day', null),

    -- JUNIOR MALE KUMITE -61 × 4
    (v_m5, v_tournament_id, 'Lahiru Fernando',      '2009-05-23', 'MALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-61', 2000, 'APPROVED', 'SLKF/STU/2026/205', now() - interval '1 day', null),
    (v_m6, v_tournament_id, 'Chathura Dissanayake', '2010-01-17', 'MALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-61', 2000, 'APPROVED', 'SLKF/STU/2026/206', now() - interval '1 day', null),
    (v_m7, v_tournament_id, 'Supun Rathnayake',     '2009-09-08', 'MALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-61', 2000, 'APPROVED', 'SLKF/STU/2026/207', now() - interval '1 day', null),
    (v_m8, v_tournament_id, 'Dilan Rajapaksa',      '2010-04-25', 'MALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-61', 2000, 'APPROVED', 'SLKF/STU/2026/208', now() - interval '1 day', null)

  ON CONFLICT DO NOTHING;

END $$;

-- Verify: kumite bracket groups after insert
SELECT
  sa.age_category_code  AS age,
  sa.gender,
  sa.kumite_weight_class AS weight,
  COUNT(*)               AS approved_count
FROM student_applications sa
WHERE sa.tournament_id = '00000000-0000-0000-0000-000000000010'
  AND sa.kumite_entry  = true
  AND sa.status        = 'APPROVED'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
