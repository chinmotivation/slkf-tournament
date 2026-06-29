-- ============================================================
-- TEST SEED: Association Entries bulk data for download testing
-- Run in Supabase SQL editor (service role). Safe to re-run.
--
-- Result after running:
--   Application 1 (Western Province) → APPROVED  — 50 athletes — LKR 105,000
--   Application 2 (Southern Province) → SUBMITTED — 1 athlete   — LKR 2,000
--   HM export download will include BOTH applications (51 rows total)
-- ============================================================

DO $$
DECLARE
  -- Existing IDs from migration 015
  v_rep_id         UUID := '6121beb5-424f-489d-9dce-ae827051cc3d';
  v_head_master_id UUID := 'd5ea1559-512d-4898-9d7c-588960125090';
  v_tournament_id  UUID := '00000000-0000-0000-0000-000000000010';
  v_association_id UUID := '00000000-0000-0000-0000-000000000020';
  v_application_id UUID := '00000000-0000-0000-0000-000000000040';

  -- NEW: Second association (Southern Province) for the "pending" slot
  v_rep2_id        UUID := '00000000-0000-0000-0000-000000000061';
  v_assoc2_id      UUID := '00000000-0000-0000-0000-000000000062';
  v_app2_id        UUID := '00000000-0000-0000-0000-000000000063';
  v_instance_id    UUID := '00000000-0000-0000-0000-000000000000';

BEGIN

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 1. Promote the existing DRAFT application to APPROVED
  -- ─────────────────────────────────────────────────────────────────────────────
  UPDATE applications
  SET
    status       = 'APPROVED',
    submitted_at = now() - interval '5 days',
    locked_at    = now() - interval '5 days',
    updated_at   = now()
  WHERE id = v_application_id;

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 2. Fill individual_entries to 50 athletes (rows 4-50; rows 1-3 already exist)
  --    Fee mix: rows 4-46 → KATA/KUMITE at LKR 2,000 each (43 entries = LKR 86,000)
  --             rows 47-50 → BOTH at LKR 3,000 each       ( 4 entries = LKR 12,000)
  --    Existing rows 1-3:  2,000 + 3,000 + 2,000          = LKR  7,000
  --    Grand total:        7,000 + 86,000 + 12,000         = LKR 105,000 ✓
  -- ─────────────────────────────────────────────────────────────────────────────
  INSERT INTO individual_entries (
    application_id, tournament_id, association_id,
    full_name, date_of_birth, age_category_code,
    gender, event, weight_kg, entry_fee_lkr, row_order, created_by
  ) VALUES
    -- Row 4 — U14_8_10 MALE KATA
    (v_application_id, v_tournament_id, v_association_id, 'Akila Bandara',       '2017-04-12', 'U14_8_10',  'MALE',   'KATA',   28.0, 2000,  4, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Sanduni Herath',      '2017-08-05', 'U14_8_10',  'FEMALE', 'KATA',   26.5, 2000,  5, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Hashan Liyanage',     '2016-11-20', 'U14_8_10',  'MALE',   'KUMITE', 30.0, 2000,  6, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Thilini Rathnayake',  '2016-06-14', 'U14_8_10',  'FEMALE', 'KUMITE', 27.0, 2000,  7, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Dasun Wickramasinghe','2017-01-30', 'U14_8_10',  'MALE',   'KATA',   29.5, 2000,  8, v_rep_id),
    -- Row 9 — U14_10_12
    (v_application_id, v_tournament_id, v_association_id, 'Nadeesha Kumari',     '2015-03-22', 'U14_10_12', 'FEMALE', 'KATA',   35.0, 2000,  9, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Lahiru Jayasuriya',   '2014-07-11', 'U14_10_12', 'MALE',   'KUMITE', 38.5, 2000, 10, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Sachini Rodrigo',     '2015-09-08', 'U14_10_12', 'FEMALE', 'KUMITE', 34.0, 2000, 11, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Chanaka Aluthge',     '2014-12-03', 'U14_10_12', 'MALE',   'KATA',   40.0, 2000, 12, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Imesha Gunawardena',  '2015-05-17', 'U14_10_12', 'FEMALE', 'KATA',   33.5, 2000, 13, v_rep_id),
    -- Row 14 — U14_12_14
    (v_application_id, v_tournament_id, v_association_id, 'Thisaru Senanayake',  '2013-02-28', 'U14_12_14', 'MALE',   'KUMITE', 47.5, 2000, 14, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Malsha Peiris',       '2012-10-15', 'U14_12_14', 'FEMALE', 'KATA',   43.0, 2000, 15, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Nishan Abeysekara',   '2013-06-04', 'U14_12_14', 'MALE',   'KATA',   50.0, 2000, 16, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Dulani Weerasinghe',  '2012-04-19', 'U14_12_14', 'FEMALE', 'KUMITE', 44.5, 2000, 17, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Pradeep Madushan',    '2013-11-27', 'U14_12_14', 'MALE',   'KUMITE', 49.0, 2000, 18, v_rep_id),
    -- Row 19 — CADET
    (v_application_id, v_tournament_id, v_association_id, 'Dinusha Samarawickrama','2010-07-09','CADET',    'FEMALE', 'KATA',   52.0, 2000, 19, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Kasun Madushanka',    '2011-03-16', 'CADET',     'MALE',   'KUMITE', 58.0, 2000, 20, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Hiruni Dissanayake',  '2010-11-02', 'CADET',     'FEMALE', 'KUMITE', 50.5, 2000, 21, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Supun Chamara',       '2011-05-24', 'CADET',     'MALE',   'KATA',   61.0, 2000, 22, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Yasoda Jayawardena',  '2010-09-13', 'CADET',     'FEMALE', 'KATA',   53.5, 2000, 23, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Rasika Pathirana',    '2011-01-08', 'CADET',     'MALE',   'KUMITE', 55.0, 2000, 24, v_rep_id),
    -- Row 25 — JUNIOR
    (v_application_id, v_tournament_id, v_association_id, 'Amali Gunasekara',    '2008-06-20', 'JUNIOR',    'FEMALE', 'KUMITE', 55.0, 2000, 25, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Thilak Jayasinghe',   '2009-03-12', 'JUNIOR',    'MALE',   'KATA',   65.0, 2000, 26, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Samanthi Balasuriya', '2008-10-05', 'JUNIOR',    'FEMALE', 'KATA',   57.0, 2000, 27, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Nuwan Rathnasiri',    '2009-07-29', 'JUNIOR',    'MALE',   'KUMITE', 68.0, 2000, 28, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Ishara Wickramaratne','2008-02-14', 'JUNIOR',    'FEMALE', 'KUMITE', 53.0, 2000, 29, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Chamara Nandasena',   '2009-11-18', 'JUNIOR',    'MALE',   'KATA',   70.0, 2000, 30, v_rep_id),
    -- Row 31 — U21
    (v_application_id, v_tournament_id, v_association_id, 'Dilhani Ranatunga',   '2006-04-03', 'U21',       'FEMALE', 'KATA',   58.5, 2000, 31, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Thusitha Mahanama',   '2005-09-21', 'U21',       'MALE',   'KUMITE', 73.0, 2000, 32, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Hasini Perera',       '2006-12-10', 'U21',       'FEMALE', 'KUMITE', 60.0, 2000, 33, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Saman Kumara',        '2005-06-15', 'U21',       'MALE',   'KATA',   76.0, 2000, 34, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Nimesha Karunarathna','2006-03-27', 'U21',       'FEMALE', 'KATA',   62.0, 2000, 35, v_rep_id),
    -- Row 36 — SENIOR
    (v_application_id, v_tournament_id, v_association_id, 'Priyantha Abeyratne', '2000-08-11', 'SENIOR',    'MALE',   'KATA',   78.0, 2000, 36, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Kalyani Mendis',      '2002-01-25', 'SENIOR',    'FEMALE', 'KUMITE', 65.0, 2000, 37, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Ruwan Peiris',        '1999-05-14', 'SENIOR',    'MALE',   'KUMITE', 80.0, 2000, 38, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Sujatha Wimalasena',  '2001-11-09', 'SENIOR',    'FEMALE', 'KATA',   63.5, 2000, 39, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Manoj Rajapaksha',    '2000-03-06', 'SENIOR',    'MALE',   'KATA',   75.0, 2000, 40, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Deepika Jayakody',    '2002-07-22', 'SENIOR',    'FEMALE', 'KUMITE', 66.0, 2000, 41, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Buddhika Liyanage',   '1998-10-18', 'SENIOR',    'MALE',   'KUMITE', 82.0, 2000, 42, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Nirosha Gunaratne',   '2001-04-30', 'SENIOR',    'FEMALE', 'KATA',   61.0, 2000, 43, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Lasith Malinga Jr',   '2003-09-05', 'SENIOR',    'MALE',   'KATA',   71.0, 2000, 44, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Vindya Senanayake',   '2002-12-17', 'SENIOR',    'FEMALE', 'KUMITE', 64.0, 2000, 45, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Asanka Kodippili',    '1999-07-08', 'SENIOR',    'MALE',   'KUMITE', 85.0, 2000, 46, v_rep_id),
    -- Rows 47-50 — BOTH events at LKR 3,000 (5 total including existing row 2)
    (v_application_id, v_tournament_id, v_association_id, 'Chathurika Wijesekara','2009-05-19','JUNIOR',    'FEMALE', 'BOTH',   56.0, 3000, 47, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Dulitha Gnanasiri',   '2006-08-04', 'U21',       'MALE',   'BOTH',   74.0, 3000, 48, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Hashini Amarasinghe', '2010-02-28', 'CADET',     'FEMALE', 'BOTH',   51.0, 3000, 49, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id, 'Sachithra Perera',    '2001-06-13', 'SENIOR',    'MALE',   'BOTH',   79.0, 3000, 50, v_rep_id)
  ON CONFLICT (application_id, row_order) DO NOTHING;

  -- ─────────────────────────────────────────────────────────────────────────────
  -- 3. Second association: Southern Province Karate Association
  --    Application status = SUBMITTED (shows in export as "pending")
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Auth user for second rep
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_rep2_id, v_instance_id, 'authenticated', 'authenticated',
    'rep2.southern@test.slkf',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"association_rep","full_name":"Bandula Rajapaksa"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Profile for second rep
  INSERT INTO profiles (id, role, full_name)
  VALUES (v_rep2_id, 'association_rep', 'Bandula Rajapaksa')
  ON CONFLICT (id) DO NOTHING;

  -- Second association — upsert then re-read the actual id (handles re-runs)
  INSERT INTO associations (
    id, user_id, district, province, association_name,
    slkf_registration_number, instructor_name, whatsapp_number,
    is_profile_complete, created_by
  ) VALUES (
    v_assoc2_id, v_rep2_id, 'Galle', 'Southern',
    'Southern Province Karate Association', 'SLKF/AFF/SP/002',
    'Bandula Rajapaksa', '0779876543', true, v_rep2_id
  ) ON CONFLICT (user_id) DO UPDATE SET
      association_name         = 'Southern Province Karate Association',
      district                 = 'Galle',
      province                 = 'Southern',
      slkf_registration_number = 'SLKF/AFF/SP/002',
      instructor_name          = 'Bandula Rajapaksa',
      is_profile_complete      = true;

  -- Re-read the real association id (may differ from v_assoc2_id on re-runs)
  SELECT id INTO v_assoc2_id FROM associations WHERE user_id = v_rep2_id;

  -- Also re-read the real application id for this association (if it already existed)
  SELECT id INTO v_app2_id
  FROM applications
  WHERE tournament_id = v_tournament_id AND association_id = v_assoc2_id;

  IF v_app2_id IS NULL THEN
    v_app2_id := '00000000-0000-0000-0000-000000000063';
    INSERT INTO applications (
      id, tournament_id, association_id, status, submitted_at, created_by
    ) VALUES (
      v_app2_id, v_tournament_id, v_assoc2_id, 'SUBMITTED',
      now() - interval '1 day', v_rep2_id
    );
  ELSE
    UPDATE applications
    SET status = 'SUBMITTED', submitted_at = now() - interval '1 day'
    WHERE id = v_app2_id;
  END IF;

  -- 1 individual entry (pending review)
  INSERT INTO individual_entries (
    application_id, tournament_id, association_id,
    full_name, date_of_birth, age_category_code,
    gender, event, weight_kg, entry_fee_lkr, row_order, created_by
  ) VALUES (
    v_app2_id, v_tournament_id, v_assoc2_id,
    'Roshan Dhammika', '2009-06-11', 'JUNIOR',
    'MALE', 'KUMITE', 63.0, 2000, 1, v_rep2_id
  ) ON CONFLICT (application_id, row_order) DO NOTHING;

END $$;

-- ── Verification queries ─────────────────────────────────────────────────────
SELECT
  a.id AS app_id,
  ass.association_name,
  a.status,
  COUNT(ie.id)         AS athlete_count,
  SUM(ie.entry_fee_lkr) AS total_fees_lkr
FROM applications a
JOIN associations ass  ON ass.id = a.association_id
JOIN individual_entries ie ON ie.application_id = a.id AND ie.deleted_at IS NULL
WHERE a.tournament_id = '00000000-0000-0000-0000-000000000010'
GROUP BY a.id, ass.association_name, a.status
ORDER BY a.status;
