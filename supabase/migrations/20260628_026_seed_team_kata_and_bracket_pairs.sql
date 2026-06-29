-- Migration 026: 16 test students
--   · 8 "Team Kata" branded students  → SENIOR | FEMALE | KATA | LEVEL_2 (8-person bracket, 0 byes)
--   · 5 KUMITE bracket pairs          → one per each single-participant KUMITE bracket
--   · 3 KATA bracket pairs            → CADET F LEVEL_1 · JUNIOR F LEVEL_3 · SENIOR M LEVEL_1
--
-- Tournament: OKC-2026 (id = 00000000-0000-0000-0000-000000000010)
-- All passwords: Test1234!
--
-- Team Kata naming convention: "Team [Alpha/Bravo] | <Full Name>"
-- This label appears in the bracket viewer so the HM can see team grouping.

DO $$
DECLARE
  v_tournament_id UUID := '00000000-0000-0000-0000-000000000010';
  v_instance_id   UUID := '00000000-0000-0000-0000-000000000000';

  -- Team Kata Alpha (4 members — SENIOR FEMALE KATA LEVEL_2)
  v_ta1 UUID := '00000000-0000-0000-0000-000000000301';
  v_ta2 UUID := '00000000-0000-0000-0000-000000000302';
  v_ta3 UUID := '00000000-0000-0000-0000-000000000303';
  v_ta4 UUID := '00000000-0000-0000-0000-000000000304';

  -- Team Kata Bravo (4 members — SENIOR FEMALE KATA LEVEL_2)
  v_tb1 UUID := '00000000-0000-0000-0000-000000000305';
  v_tb2 UUID := '00000000-0000-0000-0000-000000000306';
  v_tb3 UUID := '00000000-0000-0000-0000-000000000307';
  v_tb4 UUID := '00000000-0000-0000-0000-000000000308';

  -- KUMITE bracket pairs (5 students)
  v_k1  UUID := '00000000-0000-0000-0000-000000000311'; -- CADET   MALE   -57
  v_k2  UUID := '00000000-0000-0000-0000-000000000312'; -- JUNIOR  MALE   -61
  v_k3  UUID := '00000000-0000-0000-0000-000000000313'; -- JUNIOR  FEMALE -53
  v_k4  UUID := '00000000-0000-0000-0000-000000000314'; -- SENIOR  MALE   -50
  v_k5  UUID := '00000000-0000-0000-0000-000000000315'; -- U12     MALE   -35

  -- KATA bracket pairs (3 students)
  v_c1  UUID := '00000000-0000-0000-0000-000000000321'; -- CADET  FEMALE KATA LEVEL_1
  v_c2  UUID := '00000000-0000-0000-0000-000000000322'; -- JUNIOR FEMALE KATA LEVEL_3
  v_c3  UUID := '00000000-0000-0000-0000-000000000323'; -- SENIOR MALE   KATA LEVEL_1

BEGIN

  -- ─── 1. Auth users ─────────────────────────────────────────────────────────

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    -- Team Alpha
    (v_ta1, v_instance_id, 'authenticated', 'authenticated',
     'dilrukshi.perera@student.test',    crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Alpha | Dilrukshi Perera"}', now(), now()),
    (v_ta2, v_instance_id, 'authenticated', 'authenticated',
     'chamari.silva@student.test',       crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Alpha | Chamari Silva"}', now(), now()),
    (v_ta3, v_instance_id, 'authenticated', 'authenticated',
     'kavindya.ranatunga@student.test',  crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Alpha | Kavindya Ranatunga"}', now(), now()),
    (v_ta4, v_instance_id, 'authenticated', 'authenticated',
     'tharindi.attanayake@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Alpha | Tharindi Attanayake"}', now(), now()),
    -- Team Bravo
    (v_tb1, v_instance_id, 'authenticated', 'authenticated',
     'minusha.wickrama@student.test',    crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Bravo | Minusha Wickrama"}', now(), now()),
    (v_tb2, v_instance_id, 'authenticated', 'authenticated',
     'seneli.dhananjani@student.test',   crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Bravo | Seneli Dhananjani"}', now(), now()),
    (v_tb3, v_instance_id, 'authenticated', 'authenticated',
     'ransima.hathurusinghe@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Bravo | Ransima Hathurusinghe"}', now(), now()),
    (v_tb4, v_instance_id, 'authenticated', 'authenticated',
     'dewni.jayawickrama@student.test',  crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Team Bravo | Dewni Jayawickrama"}', now(), now()),
    -- Kumite pairs
    (v_k1, v_instance_id, 'authenticated', 'authenticated',
     'roshan.kumara@student.test',       crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Roshan Kumara"}', now(), now()),
    (v_k2, v_instance_id, 'authenticated', 'authenticated',
     'pathum.deshappriya@student.test',  crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Pathum Deshappriya"}', now(), now()),
    (v_k3, v_instance_id, 'authenticated', 'authenticated',
     'anusha.wimalasiri@student.test',   crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Anusha Wimalasiri"}', now(), now()),
    (v_k4, v_instance_id, 'authenticated', 'authenticated',
     'buddhika.jayasinghe@student.test', crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Buddhika Jayasinghe"}', now(), now()),
    (v_k5, v_instance_id, 'authenticated', 'authenticated',
     'sandun.gamage@student.test',       crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Sandun Gamage"}', now(), now()),
    -- Kata bracket pairs
    (v_c1, v_instance_id, 'authenticated', 'authenticated',
     'lashari.jayalath@student.test',    crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Lashari Jayalath"}', now(), now()),
    (v_c2, v_instance_id, 'authenticated', 'authenticated',
     'nimasha.bandara@student.test',     crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Nimasha Bandara"}', now(), now()),
    (v_c3, v_instance_id, 'authenticated', 'authenticated',
     'ayesh.maduranga@student.test',     crypt('Test1234!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"student","full_name":"Ayesh Maduranga"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ─── 2. Student profiles ────────────────────────────────────────────────────

  INSERT INTO student_profiles (id, full_name, date_of_birth, gender, belt_grade, phone)
  VALUES
    -- Team Alpha (SENIOR FEMALE — born ~2000-2003)
    (v_ta1, 'Team Alpha | Dilrukshi Perera',    '2000-04-15', 'FEMALE', 'Black Belt 1st Dan', '0771300001'),
    (v_ta2, 'Team Alpha | Chamari Silva',        '2001-09-22', 'FEMALE', 'Black Belt 1st Dan', '0771300002'),
    (v_ta3, 'Team Alpha | Kavindya Ranatunga',   '2002-02-08', 'FEMALE', 'Black Belt 1st Dan', '0771300003'),
    (v_ta4, 'Team Alpha | Tharindi Attanayake',  '2003-07-30', 'FEMALE', 'Black Belt 1st Dan', '0771300004'),
    -- Team Bravo (SENIOR FEMALE — born ~1998-2002)
    (v_tb1, 'Team Bravo | Minusha Wickrama',     '1999-11-12', 'FEMALE', 'Black Belt 2nd Dan', '0771300005'),
    (v_tb2, 'Team Bravo | Seneli Dhananjani',    '2000-06-25', 'FEMALE', 'Black Belt 1st Dan', '0771300006'),
    (v_tb3, 'Team Bravo | Ransima Hathurusinghe','1998-03-17', 'FEMALE', 'Black Belt 2nd Dan', '0771300007'),
    (v_tb4, 'Team Bravo | Dewni Jayawickrama',   '2001-12-04', 'FEMALE', 'Black Belt 1st Dan', '0771300008'),
    -- Kumite pairs
    (v_k1,  'Roshan Kumara',     '2011-05-20', 'MALE',   'Brown Belt',         '0771300011'),
    (v_k2,  'Pathum Deshappriya','2009-08-14', 'MALE',   'Black Belt 1st Dan', '0771300012'),
    (v_k3,  'Anusha Wimalasiri', '2009-03-27', 'FEMALE', 'Black Belt 1st Dan', '0771300013'),
    (v_k4,  'Buddhika Jayasinghe','2001-01-09','MALE',   'Black Belt 2nd Dan', '0771300014'),
    (v_k5,  'Sandun Gamage',     '2015-06-30', 'MALE',   'Yellow Belt',        '0771300015'),
    -- Kata bracket pairs
    (v_c1,  'Lashari Jayalath',  '2011-10-05', 'FEMALE', 'Blue Belt',          '0771300021'),
    (v_c2,  'Nimasha Bandara',   '2009-04-18', 'FEMALE', 'Black Belt 1st Dan', '0771300022'),
    (v_c3,  'Ayesh Maduranga',   '2002-07-23', 'MALE',   'Black Belt 1st Dan', '0771300023')
  ON CONFLICT (id) DO NOTHING;

  -- ─── 3. Student applications — all APPROVED ─────────────────────────────────

  INSERT INTO student_applications (
    user_id, tournament_id,
    full_name, date_of_birth, gender, belt_grade, age_category_code,
    kata_entry, kata_level, kumite_entry, kumite_weight_class,
    total_amount_lkr, status, student_number,
    reviewed_at, review_notes
  ) VALUES

    -- ── Team Kata Alpha (4 members — SENIOR FEMALE KATA LEVEL_2) ────────────
    (v_ta1, v_tournament_id,
     'Team Alpha | Dilrukshi Perera', '2000-04-15', 'FEMALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/101',
     now() - interval '1 day', null),

    (v_ta2, v_tournament_id,
     'Team Alpha | Chamari Silva', '2001-09-22', 'FEMALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/102',
     now() - interval '1 day', null),

    (v_ta3, v_tournament_id,
     'Team Alpha | Kavindya Ranatunga', '2002-02-08', 'FEMALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/103',
     now() - interval '1 day', null),

    (v_ta4, v_tournament_id,
     'Team Alpha | Tharindi Attanayake', '2003-07-30', 'FEMALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/104',
     now() - interval '1 day', null),

    -- ── Team Kata Bravo (4 members — SENIOR FEMALE KATA LEVEL_2) ────────────
    (v_tb1, v_tournament_id,
     'Team Bravo | Minusha Wickrama', '1999-11-12', 'FEMALE', 'Black Belt 2nd Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/105',
     now() - interval '2 days', null),

    (v_tb2, v_tournament_id,
     'Team Bravo | Seneli Dhananjani', '2000-06-25', 'FEMALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/106',
     now() - interval '2 days', null),

    (v_tb3, v_tournament_id,
     'Team Bravo | Ransima Hathurusinghe', '1998-03-17', 'FEMALE', 'Black Belt 2nd Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/107',
     now() - interval '2 days', null),

    (v_tb4, v_tournament_id,
     'Team Bravo | Dewni Jayawickrama', '2001-12-04', 'FEMALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_2', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/108',
     now() - interval '2 days', null),

    -- ── Kumite bracket pairs ─────────────────────────────────────────────────

    -- CADET MALE KUMITE -57
    (v_k1, v_tournament_id,
     'Roshan Kumara', '2011-05-20', 'MALE', 'Brown Belt', 'CADET',
     false, null, true, '-57',
     2000, 'APPROVED', 'SLKF/STU/2026/111',
     now() - interval '1 day', null),

    -- JUNIOR MALE KUMITE -61
    (v_k2, v_tournament_id,
     'Pathum Deshappriya', '2009-08-14', 'MALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-61',
     2000, 'APPROVED', 'SLKF/STU/2026/112',
     now() - interval '1 day', null),

    -- JUNIOR FEMALE KUMITE -53
    (v_k3, v_tournament_id,
     'Anusha Wimalasiri', '2009-03-27', 'FEMALE', 'Black Belt 1st Dan', 'JUNIOR',
     false, null, true, '-53',
     2000, 'APPROVED', 'SLKF/STU/2026/113',
     now() - interval '1 day', null),

    -- SENIOR MALE KUMITE -50
    (v_k4, v_tournament_id,
     'Buddhika Jayasinghe', '2001-01-09', 'MALE', 'Black Belt 2nd Dan', 'SENIOR',
     false, null, true, '-50',
     2000, 'APPROVED', 'SLKF/STU/2026/114',
     now() - interval '1 day', null),

    -- U12 MALE KUMITE -35
    (v_k5, v_tournament_id,
     'Sandun Gamage', '2015-06-30', 'MALE', 'Yellow Belt', 'U12',
     false, null, true, '-35',
     2000, 'APPROVED', 'SLKF/STU/2026/115',
     now() - interval '1 day', null),

    -- ── Kata bracket pairs ───────────────────────────────────────────────────

    -- CADET FEMALE KATA LEVEL_1
    (v_c1, v_tournament_id,
     'Lashari Jayalath', '2011-10-05', 'FEMALE', 'Blue Belt', 'CADET',
     true, 'LEVEL_1', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/121',
     now() - interval '1 day', null),

    -- JUNIOR FEMALE KATA LEVEL_3
    (v_c2, v_tournament_id,
     'Nimasha Bandara', '2009-04-18', 'FEMALE', 'Black Belt 1st Dan', 'JUNIOR',
     true, 'LEVEL_3', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/122',
     now() - interval '1 day', null),

    -- SENIOR MALE KATA LEVEL_1
    (v_c3, v_tournament_id,
     'Ayesh Maduranga', '2002-07-23', 'MALE', 'Black Belt 1st Dan', 'SENIOR',
     true, 'LEVEL_1', false, null,
     2000, 'APPROVED', 'SLKF/STU/2026/123',
     now() - interval '1 day', null)

  ON CONFLICT DO NOTHING;

END $$;

-- ─── Verification queries ────────────────────────────────────────────────────

-- Show all approved participants grouped by bracket category
SELECT
  sa.age_category_code AS age,
  sa.gender,
  CASE WHEN sa.kata_entry  AND sa.kumite_entry THEN 'BOTH'
       WHEN sa.kata_entry  THEN 'KATA'
       ELSE 'KUMITE' END AS event,
  COALESCE(sa.kata_level, sa.kumite_weight_class) AS sub,
  COUNT(*)                                         AS approved_count,
  STRING_AGG(sa.full_name, ' · ' ORDER BY sa.full_name) AS names
FROM student_applications sa
WHERE sa.tournament_id = '00000000-0000-0000-0000-000000000010'
  AND sa.status = 'APPROVED'
GROUP BY 1, 2, 3, 4
ORDER BY event, age, gender, sub;
