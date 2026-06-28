-- Migration 023: Test student data — 10 student accounts with applications
-- Run in Supabase SQL editor (service role). Development/testing only.
-- Tournament: OKC-2026 (id = 00000000-0000-0000-0000-000000000010)
-- All passwords: Test1234!

DO $$
DECLARE
  v_tournament_id UUID := '00000000-0000-0000-0000-000000000010';
  v_instance_id   UUID := '00000000-0000-0000-0000-000000000000';

  -- Student user IDs
  v_s1  UUID := '00000000-0000-0000-0000-000000000101'; -- Kavisha Perera
  v_s2  UUID := '00000000-0000-0000-0000-000000000102'; -- Dilshan Fernando
  v_s3  UUID := '00000000-0000-0000-0000-000000000103'; -- Amaya Wickramasinghe
  v_s4  UUID := '00000000-0000-0000-0000-000000000104'; -- Tharaka Silva
  v_s5  UUID := '00000000-0000-0000-0000-000000000105'; -- Nethmi Jayawardena
  v_s6  UUID := '00000000-0000-0000-0000-000000000106'; -- Ravindu Dissanayake
  v_s7  UUID := '00000000-0000-0000-0000-000000000107'; -- Sithumi Bandara
  v_s8  UUID := '00000000-0000-0000-0000-000000000108'; -- Chamith Rajapaksa
  v_s9  UUID := '00000000-0000-0000-0000-000000000109'; -- Piumali Gunasekara
  v_s10 UUID := '00000000-0000-0000-0000-000000000110'; -- Ashen Rathnayake

BEGIN

  -- ─── 1. Auth users ─────────────────────────────────────────────────────────
  -- The on_auth_user_created trigger auto-inserts into profiles using raw_user_meta_data.
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (v_s1,  v_instance_id, 'authenticated', 'authenticated',
     'kavisha.perera@student.test',       crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Kavisha Perera"}',
     now(), now()),
    (v_s2,  v_instance_id, 'authenticated', 'authenticated',
     'dilshan.fernando@student.test',     crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Dilshan Fernando"}',
     now(), now()),
    (v_s3,  v_instance_id, 'authenticated', 'authenticated',
     'amaya.wickramasinghe@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Amaya Wickramasinghe"}',
     now(), now()),
    (v_s4,  v_instance_id, 'authenticated', 'authenticated',
     'tharaka.silva@student.test',        crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Tharaka Silva"}',
     now(), now()),
    (v_s5,  v_instance_id, 'authenticated', 'authenticated',
     'nethmi.jayawardena@student.test',   crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Nethmi Jayawardena"}',
     now(), now()),
    (v_s6,  v_instance_id, 'authenticated', 'authenticated',
     'ravindu.dissanayake@student.test',  crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Ravindu Dissanayake"}',
     now(), now()),
    (v_s7,  v_instance_id, 'authenticated', 'authenticated',
     'sithumi.bandara@student.test',      crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Sithumi Bandara"}',
     now(), now()),
    (v_s8,  v_instance_id, 'authenticated', 'authenticated',
     'chamith.rajapaksa@student.test',    crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Chamith Rajapaksa"}',
     now(), now()),
    (v_s9,  v_instance_id, 'authenticated', 'authenticated',
     'piumali.gunasekara@student.test',   crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Piumali Gunasekara"}',
     now(), now()),
    (v_s10, v_instance_id, 'authenticated', 'authenticated',
     'ashen.rathnayake@student.test',     crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Ashen Rathnayake"}',
     now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ─── 2. Student profiles (extended info) ───────────────────────────────────
  INSERT INTO student_profiles (id, full_name, date_of_birth, gender, belt_grade, phone)
  VALUES
    -- Kavisha Perera: age 13 → U14, MALE, Brown Belt
    (v_s1,  'Kavisha Perera',        '2013-03-15', 'MALE',   'Brown Belt',      '0771100001'),
    -- Dilshan Fernando: age 15 → CADET, MALE, Blue Belt
    (v_s2,  'Dilshan Fernando',      '2011-07-22', 'MALE',   'Blue Belt',       '0771100002'),
    -- Amaya Wickramasinghe: age 17 → JUNIOR, FEMALE, Black Belt 1st Dan
    (v_s3,  'Amaya Wickramasinghe',  '2009-11-05', 'FEMALE', 'Black Belt 1st Dan', '0771100003'),
    -- Tharaka Silva: age 25 → SENIOR, MALE, Black Belt 2nd Dan
    (v_s4,  'Tharaka Silva',         '2001-04-18', 'MALE',   'Black Belt 2nd Dan', '0771100004'),
    -- Nethmi Jayawardena: age 13 → U14, FEMALE, Brown Belt
    (v_s5,  'Nethmi Jayawardena',    '2012-09-30', 'FEMALE', 'Brown Belt',      '0771100005'),
    -- Ravindu Dissanayake: age 20 → U21, MALE, Black Belt 1st Dan
    (v_s6,  'Ravindu Dissanayake',   '2006-02-14', 'MALE',   'Black Belt 1st Dan', '0771100006'),
    -- Sithumi Bandara: age 15 → CADET, FEMALE, Purple Belt
    (v_s7,  'Sithumi Bandara',       '2010-08-20', 'FEMALE', 'Purple Belt',     '0771100007'),
    -- Chamith Rajapaksa: age 17 → JUNIOR, MALE, Black Belt 1st Dan
    (v_s8,  'Chamith Rajapaksa',     '2008-12-25', 'MALE',   'Black Belt 1st Dan', '0771100008'),
    -- Piumali Gunasekara: age 19 → U21, FEMALE, Black Belt 1st Dan
    (v_s9,  'Piumali Gunasekara',    '2006-08-17', 'FEMALE', 'Black Belt 1st Dan', '0771100009'),
    -- Ashen Rathnayake: age 11 → U12, MALE, Green Belt
    (v_s10, 'Ashen Rathnayake',      '2015-01-10', 'MALE',   'Green Belt',      '0771100010')
  ON CONFLICT (id) DO NOTHING;

  -- ─── 3. Student applications ────────────────────────────────────────────────
  -- Fees: 2000 LKR (1 event), 3000 LKR (both events)
  INSERT INTO student_applications (
    user_id, tournament_id,
    full_name, date_of_birth, gender, belt_grade, age_category_code,
    kata_entry, kata_level, kumite_entry, kumite_weight_class,
    total_amount_lkr, status, student_number,
    reviewed_at, review_notes
  ) VALUES

    -- 1. Kavisha Perera — U14 MALE — KATA LEVEL_2 — APPROVED
    (v_s1, v_tournament_id,
     'Kavisha Perera', '2013-03-15', 'MALE', 'Brown Belt', 'U14',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/001',
     now() - interval '3 days', null),

    -- 2. Dilshan Fernando — CADET MALE — KUMITE -57 — PENDING
    (v_s2, v_tournament_id,
     'Dilshan Fernando', '2011-07-22', 'MALE', 'Blue Belt', 'CADET',
     false, null, true, '-57',
     2000, 'PENDING', null,
     null, null),

    -- 3. Amaya Wickramasinghe — JUNIOR FEMALE — BOTH (KATA LEVEL_3 + KUMITE -53) — APPROVED
    (v_s3, v_tournament_id,
     'Amaya Wickramasinghe', '2009-11-05', 'FEMALE', 'Black Belt 1st Dan', 'JUNIOR',
     true, 'LEVEL_3', true, '-53',
     3000, 'APPROVED', 'SLKF/STU/2026/002',
     now() - interval '2 days', null),

    -- 4. Tharaka Silva — SENIOR MALE — KATA LEVEL_3 — APPROVED
    (v_s4, v_tournament_id,
     'Tharaka Silva', '2001-04-18', 'MALE', 'Black Belt 2nd Dan', 'SENIOR',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/003',
     now() - interval '4 days', null),

    -- 5. Nethmi Jayawardena — U14 FEMALE — KUMITE -45 — REJECTED (bad payment proof)
    (v_s5, v_tournament_id,
     'Nethmi Jayawardena', '2012-09-30', 'FEMALE', 'Brown Belt', 'U14',
     false, null, true, '-45',
     2000, 'REJECTED', null,
     now() - interval '1 day', 'Payment proof is unclear. Please resubmit with a legible bank deposit slip.'),

    -- 6. Ravindu Dissanayake — U21 MALE — BOTH (KATA LEVEL_2 + KUMITE -60) — PENDING
    (v_s6, v_tournament_id,
     'Ravindu Dissanayake', '2006-02-14', 'MALE', 'Black Belt 1st Dan', 'U21',
     true, 'LEVEL_2', true, '-60',
     3000, 'PENDING', null,
     null, null),

    -- 7. Sithumi Bandara — CADET FEMALE — KATA LEVEL_1 — APPROVED
    (v_s7, v_tournament_id,
     'Sithumi Bandara', '2010-08-20', 'FEMALE', 'Purple Belt', 'CADET',
     true, 'LEVEL_1', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/004',
     now() - interval '2 days', null),

    -- 8. Chamith Rajapaksa — JUNIOR MALE — KUMITE -61 — PENDING
    (v_s8, v_tournament_id,
     'Chamith Rajapaksa', '2008-12-25', 'MALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-61',
     2000, 'PENDING', null,
     null, null),

    -- 9. Piumali Gunasekara — U21 FEMALE — KATA LEVEL_3 — APPROVED
    (v_s9, v_tournament_id,
     'Piumali Gunasekara', '2006-08-17', 'FEMALE', 'Black Belt 1st Dan', 'U21',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/005',
     now() - interval '1 day', null),

    -- 10. Ashen Rathnayake — U12 MALE — BOTH (KATA LEVEL_1 + KUMITE -35) — PENDING
    (v_s10, v_tournament_id,
     'Ashen Rathnayake', '2015-01-10', 'MALE', 'Green Belt', 'U12',
     true, 'LEVEL_1', true, '-35',
     3000, 'PENDING', null,
     null, null)
  ON CONFLICT DO NOTHING;

END $$;

-- Quick verification
SELECT
  sa.full_name,
  sa.gender,
  sa.age_category_code,
  CASE WHEN sa.kata_entry AND sa.kumite_entry THEN 'BOTH'
       WHEN sa.kata_entry  THEN 'KATA'
       ELSE 'KUMITE' END AS events,
  sa.total_amount_lkr    AS fee_lkr,
  sa.status,
  sa.student_number
FROM student_applications sa
WHERE sa.tournament_id = '00000000-0000-0000-0000-000000000010'
ORDER BY sa.created_at DESC
LIMIT 15;
