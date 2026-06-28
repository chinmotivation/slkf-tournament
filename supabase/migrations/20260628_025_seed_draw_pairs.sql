-- Migration 025: Add paired test students so draw brackets have ≥2 participants
-- Prerequisite: Migration 023 (seed_students) must be run first.
-- These students share bracket categories with the 5 already-APPROVED students,
-- giving the draw engine real brackets to generate.
--
-- Bracket pairs added:
--   U14   | MALE   | KATA    | LEVEL_2  (+1 → total 2)
--   JUNIOR| FEMALE | KATA    | LEVEL_3  (+2 → total 3) — allows quarter-final BYE test
--   JUNIOR| FEMALE | KUMITE  | -53      (+1 → total 2)
--   SENIOR| MALE   | KATA    | LEVEL_3  (+1 → total 2)
--   CADET | FEMALE | KATA    | LEVEL_1  (+2 → total 3)
--   U21   | FEMALE | KATA    | LEVEL_3  (+1 → total 2)

DO $$
DECLARE
  v_tournament_id UUID := '00000000-0000-0000-0000-000000000010';
  v_instance_id   UUID := '00000000-0000-0000-0000-000000000000';

  v_p1  UUID := '00000000-0000-0000-0000-000000000201';
  v_p2  UUID := '00000000-0000-0000-0000-000000000202';
  v_p3  UUID := '00000000-0000-0000-0000-000000000203';
  v_p4  UUID := '00000000-0000-0000-0000-000000000204';
  v_p5  UUID := '00000000-0000-0000-0000-000000000205';
  v_p6  UUID := '00000000-0000-0000-0000-000000000206';
  v_p7  UUID := '00000000-0000-0000-0000-000000000207';
  v_p8  UUID := '00000000-0000-0000-0000-000000000208';
BEGIN

  -- ─── Auth users ──────────────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (v_p1, v_instance_id, 'authenticated', 'authenticated',
     'dulith.pathirana@student.test',    crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Dulith Pathirana"}',
     now(), now()),
    (v_p2, v_instance_id, 'authenticated', 'authenticated',
     'sachini.weerasinghe@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Sachini Weerasinghe"}',
     now(), now()),
    (v_p3, v_instance_id, 'authenticated', 'authenticated',
     'thisaru.madushanka@student.test',  crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Thisaru Madushanka"}',
     now(), now()),
    (v_p4, v_instance_id, 'authenticated', 'authenticated',
     'malsha.rodrigo@student.test',      crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Malsha Rodrigo"}',
     now(), now()),
    (v_p5, v_instance_id, 'authenticated', 'authenticated',
     'kasun.liyanage@student.test',      crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Kasun Liyanage"}',
     now(), now()),
    (v_p6, v_instance_id, 'authenticated', 'authenticated',
     'hiruni.senanayake@student.test',   crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Hiruni Senanayake"}',
     now(), now()),
    (v_p7, v_instance_id, 'authenticated', 'authenticated',
     'dinusha.kumari@student.test',      crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Dinusha Kumari"}',
     now(), now()),
    (v_p8, v_instance_id, 'authenticated', 'authenticated',
     'shenal.abeywickrama@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Shenal Abeywickrama"}',
     now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ─── Student profiles ─────────────────────────────────────────────────────────
  INSERT INTO student_profiles (id, full_name, date_of_birth, gender, belt_grade, phone)
  VALUES
    (v_p1, 'Dulith Pathirana',    '2013-06-10', 'MALE',   'Brown Belt',         '0771200001'),
    (v_p2, 'Sachini Weerasinghe', '2009-02-28', 'FEMALE', 'Black Belt 1st Dan', '0771200002'),
    (v_p3, 'Thisaru Madushanka',  '2009-09-15', 'FEMALE', 'Black Belt 1st Dan', '0771200003'),
    (v_p4, 'Malsha Rodrigo',      '2009-04-22', 'FEMALE', 'Black Belt 2nd Dan', '0771200004'),
    (v_p5, 'Kasun Liyanage',      '2001-08-05', 'MALE',   'Black Belt 3rd Dan', '0771200005'),
    (v_p6, 'Hiruni Senanayake',   '2010-11-30', 'FEMALE', 'Purple Belt',        '0771200006'),
    (v_p7, 'Dinusha Kumari',      '2010-03-17', 'FEMALE', 'Blue Belt',          '0771200007'),
    (v_p8, 'Shenal Abeywickrama', '2006-07-12', 'FEMALE', 'Black Belt 1st Dan', '0771200008')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Student applications — all APPROVED, paired with existing categories ────
  INSERT INTO student_applications (
    user_id, tournament_id,
    full_name, date_of_birth, gender, belt_grade, age_category_code,
    kata_entry, kata_level, kumite_entry, kumite_weight_class,
    total_amount_lkr, status, student_number,
    reviewed_at, review_notes
  ) VALUES

    -- P1: Dulith Pathirana — U14 MALE KATA LEVEL_2 → pairs with Kavisha Perera
    (v_p1, v_tournament_id,
     'Dulith Pathirana', '2013-06-10', 'MALE', 'Brown Belt', 'U14',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/011',
     now() - interval '1 day', null),

    -- P2: Sachini Weerasinghe — JUNIOR FEMALE KATA LEVEL_3 → pairs with Amaya
    (v_p2, v_tournament_id,
     'Sachini Weerasinghe', '2009-02-28', 'FEMALE', 'Black Belt 1st Dan', 'JUNIOR',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/012',
     now() - interval '1 day', null),

    -- P3: Thisaru Madushanka — JUNIOR FEMALE KUMITE -53 + extra KATA LEVEL_3
    --     KUMITE pairs with Amaya; KATA makes it a 3-person KATA bracket
    (v_p3, v_tournament_id,
     'Thisaru Madushanka', '2009-09-15', 'FEMALE', 'Black Belt 1st Dan', 'JUNIOR',
     true, 'LEVEL_3', true, '-53',
     3000, 'APPROVED', 'SLKF/STU/2026/013',
     now() - interval '1 day', null),

    -- P4: Malsha Rodrigo — JUNIOR FEMALE KATA LEVEL_3 (3rd person in that bracket)
    (v_p4, v_tournament_id,
     'Malsha Rodrigo', '2009-04-22', 'FEMALE', 'Black Belt 2nd Dan', 'JUNIOR',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/014',
     now() - interval '2 days', null),

    -- P5: Kasun Liyanage — SENIOR MALE KATA LEVEL_3 → pairs with Tharaka Silva
    (v_p5, v_tournament_id,
     'Kasun Liyanage', '2001-08-05', 'MALE', 'Black Belt 3rd Dan', 'SENIOR',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/015',
     now() - interval '1 day', null),

    -- P6: Hiruni Senanayake — CADET FEMALE KATA LEVEL_1 → pairs with Sithumi Bandara
    (v_p6, v_tournament_id,
     'Hiruni Senanayake', '2010-11-30', 'FEMALE', 'Purple Belt', 'CADET',
     true, 'LEVEL_1', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/016',
     now() - interval '1 day', null),

    -- P7: Dinusha Kumari — CADET FEMALE KATA LEVEL_1 (3rd person → tests BYE)
    (v_p7, v_tournament_id,
     'Dinusha Kumari', '2010-03-17', 'FEMALE', 'Blue Belt', 'CADET',
     true, 'LEVEL_1', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/017',
     now() - interval '2 days', null),

    -- P8: Shenal Abeywickrama — U21 FEMALE KATA LEVEL_3 → pairs with Piumali
    (v_p8, v_tournament_id,
     'Shenal Abeywickrama', '2006-07-12', 'FEMALE', 'Black Belt 1st Dan', 'U21',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/018',
     now() - interval '1 day', null)

  ON CONFLICT DO NOTHING;

END $$;

-- Verify bracket-ready groups (should all show count ≥ 2)
SELECT
  sa.age_category_code,
  sa.gender,
  CASE WHEN sa.kata_entry AND sa.kumite_entry THEN 'BOTH'
       WHEN sa.kata_entry  THEN 'KATA'
       ELSE 'KUMITE' END AS entry_type,
  sa.kata_level,
  sa.kumite_weight_class,
  COUNT(*)              AS approved_count
FROM student_applications sa
WHERE sa.tournament_id = '00000000-0000-0000-0000-000000000010'
  AND sa.status = 'APPROVED'
GROUP BY 1, 2, 3, 4, 5
ORDER BY 1, 2, 3;
