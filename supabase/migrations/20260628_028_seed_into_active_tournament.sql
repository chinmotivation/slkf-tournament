-- Migration 028: Add 4 students per bracket into WHICHEVER tournament is active
-- Detects the active tournament from draw_brackets (most recently set up tournament).
-- No hardcoded tournament ID — works regardless of which tournament you created via the UI.
--
-- AFTER RUNNING: Draw Engine → Setup / Refresh Brackets
-- Both CADET MALE -57 and JUNIOR MALE -61 will then show 4 participants.

-- ── Step 1: Auth users (uuid range 0x500+, safe to re-run) ───────────────────

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'nimal.silva.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Nimal Silva"}', now(), now()),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'kasun.perera.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Kasun Perera"}', now(), now()),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'thilina.jayawardena.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Thilina Jayawardena"}', now(), now()),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'ruwan.bandara.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Ruwan Bandara"}', now(), now()),
  ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'lahiru.fernando.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Lahiru Fernando"}', now(), now()),
  ('00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'chathura.dissanayake.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Chathura Dissanayake"}', now(), now()),
  ('00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'supun.rathnayake.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Supun Rathnayake"}', now(), now()),
  ('00000000-0000-0000-0000-000000000508', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'dilan.rajapaksa.2@student.test', crypt('Test1234!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"student","full_name":"Dilan Rajapaksa"}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Step 2: Student profiles ─────────────────────────────────────────────────

INSERT INTO student_profiles (id, full_name, date_of_birth, gender, belt_grade, phone)
VALUES
  ('00000000-0000-0000-0000-000000000501', 'Nimal Silva',          '2010-03-12', 'MALE', 'Brown Belt',         '0771500001'),
  ('00000000-0000-0000-0000-000000000502', 'Kasun Perera',         '2011-07-04', 'MALE', 'Blue Belt',          '0771500002'),
  ('00000000-0000-0000-0000-000000000503', 'Thilina Jayawardena',  '2010-11-28', 'MALE', 'Black Belt 1st Dan', '0771500003'),
  ('00000000-0000-0000-0000-000000000504', 'Ruwan Bandara',        '2011-02-19', 'MALE', 'Brown Belt',         '0771500004'),
  ('00000000-0000-0000-0000-000000000505', 'Lahiru Fernando',      '2009-05-23', 'MALE', 'Black Belt 1st Dan', '0771500005'),
  ('00000000-0000-0000-0000-000000000506', 'Chathura Dissanayake', '2010-01-17', 'MALE', 'Black Belt 1st Dan', '0771500006'),
  ('00000000-0000-0000-0000-000000000507', 'Supun Rathnayake',     '2009-09-08', 'MALE', 'Black Belt 1st Dan', '0771500007'),
  ('00000000-0000-0000-0000-000000000508', 'Dilan Rajapaksa',      '2010-04-25', 'MALE', 'Black Belt 1st Dan', '0771500008')
ON CONFLICT (id) DO NOTHING;

-- ── Step 3: Student applications → dynamic tournament from draw_brackets ─────
-- Picks the tournament most recently used with the draw engine (latest bracket).

WITH active_tournament AS (
  SELECT tournament_id AS id
  FROM   draw_brackets
  GROUP  BY tournament_id
  ORDER  BY MAX(created_at) DESC
  LIMIT  1
),
students (uid, full_name, dob, gender, belt, age, kata, kata_level, kumite, weight, sno) AS (
  VALUES
    ('00000000-0000-0000-0000-000000000501'::uuid, 'Nimal Silva',         '2010-03-12'::date, 'MALE'::gender_type, 'Brown Belt',         'CADET',  false, null::text, true,  '-57', 'SLKF/STU/2026/501'),
    ('00000000-0000-0000-0000-000000000502'::uuid, 'Kasun Perera',        '2011-07-04'::date, 'MALE'::gender_type, 'Blue Belt',          'CADET',  false, null::text, true,  '-57', 'SLKF/STU/2026/502'),
    ('00000000-0000-0000-0000-000000000503'::uuid, 'Thilina Jayawardena', '2010-11-28'::date, 'MALE'::gender_type, 'Black Belt 1st Dan', 'CADET',  false, null::text, true,  '-57', 'SLKF/STU/2026/503'),
    ('00000000-0000-0000-0000-000000000504'::uuid, 'Ruwan Bandara',       '2011-02-19'::date, 'MALE'::gender_type, 'Brown Belt',         'CADET',  false, null::text, true,  '-57', 'SLKF/STU/2026/504'),
    ('00000000-0000-0000-0000-000000000505'::uuid, 'Lahiru Fernando',     '2009-05-23'::date, 'MALE'::gender_type, 'Black Belt 1st Dan', 'JUNIOR', false, null::text, true,  '-61', 'SLKF/STU/2026/505'),
    ('00000000-0000-0000-0000-000000000506'::uuid, 'Chathura Dissanayake','2010-01-17'::date, 'MALE'::gender_type, 'Black Belt 1st Dan', 'JUNIOR', false, null::text, true,  '-61', 'SLKF/STU/2026/506'),
    ('00000000-0000-0000-0000-000000000507'::uuid, 'Supun Rathnayake',    '2009-09-08'::date, 'MALE'::gender_type, 'Black Belt 1st Dan', 'JUNIOR', false, null::text, true,  '-61', 'SLKF/STU/2026/507'),
    ('00000000-0000-0000-0000-000000000508'::uuid, 'Dilan Rajapaksa',     '2010-04-25'::date, 'MALE'::gender_type, 'Black Belt 1st Dan', 'JUNIOR', false, null::text, true,  '-61', 'SLKF/STU/2026/508')
)
INSERT INTO student_applications (
  user_id, tournament_id,
  full_name, date_of_birth, gender, belt_grade, age_category_code,
  kata_entry, kata_level, kumite_entry, kumite_weight_class,
  total_amount_lkr, status, student_number,
  reviewed_at, review_notes
)
SELECT
  s.uid,
  at.id,
  s.full_name, s.dob, s.gender, s.belt, s.age,
  s.kata, s.kata_level, s.kumite, s.weight,
  2000, 'APPROVED', s.sno,
  now() - interval '1 day', null
FROM students s
CROSS JOIN active_tournament at
ON CONFLICT DO NOTHING;

-- ── Verify: confirm which tournament was targeted and participant counts ───────
SELECT
  t.code                 AS tournament,
  sa.age_category_code   AS age,
  sa.gender,
  sa.kumite_weight_class AS weight,
  COUNT(*)               AS approved_count
FROM   student_applications sa
JOIN   tournaments t ON t.id = sa.tournament_id
WHERE  sa.kumite_entry = true
  AND  sa.status       = 'APPROVED'
  AND  sa.tournament_id IN (SELECT tournament_id FROM draw_brackets)
GROUP  BY 1, 2, 3, 4
ORDER  BY 2, 3, 4;
