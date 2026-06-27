-- Migration 015: Development seed data
-- WARNING: Run only in local/development environment. NEVER in production.
-- Seed users are created via Supabase Auth — use supabase/seed_auth.sh for that step.
-- This file only seeds non-auth tables using placeholder UUIDs.

-- These placeholder UUIDs must match the auth.users rows created by seed_auth.sh
-- Replace with actual UUIDs after running seed_auth.sh
DO $$
DECLARE
  v_head_master_id    UUID := 'd5ea1559-512d-4898-9d7c-588960125090';
  v_rep_id            UUID := '6121beb5-424f-489d-9dce-ae827051cc3d';
  v_tournament_id     UUID := '00000000-0000-0000-0000-000000000010';
  v_association_id    UUID := '00000000-0000-0000-0000-000000000020';
  v_cat_u14_8_10_id   UUID := '00000000-0000-0000-0000-000000000031';
  v_cat_u14_10_12_id  UUID := '00000000-0000-0000-0000-000000000032';
  v_cat_u14_12_14_id  UUID := '00000000-0000-0000-0000-000000000033';
  v_cat_cadet_id      UUID := '00000000-0000-0000-0000-000000000034';
  v_cat_junior_id     UUID := '00000000-0000-0000-0000-000000000035';
  v_cat_u21_id        UUID := '00000000-0000-0000-0000-000000000036';
  v_cat_senior_id     UUID := '00000000-0000-0000-0000-000000000037';
  v_application_id    UUID := '00000000-0000-0000-0000-000000000040';
BEGIN

  -- Profiles (auth users must already exist)
  INSERT INTO profiles (id, role, full_name)
  VALUES
    (v_head_master_id, 'head_master', 'Dhammika Kasturi Mudali'),
    (v_rep_id, 'association_rep', 'Test Sensei')
  ON CONFLICT (id) DO NOTHING;

  -- Association
  INSERT INTO associations (
    id, user_id, district, province, association_name,
    slkf_registration_number, instructor_name, whatsapp_number,
    is_profile_complete, created_by
  ) VALUES (
    v_association_id, v_rep_id, 'Colombo', 'Western',
    'Western Province Karate Association', 'SLKF/AFF/WP/001',
    'Test Sensei', '0771234567', true, v_rep_id
  ) ON CONFLICT (user_id) DO UPDATE SET
      id                       = v_association_id,
      district                 = 'Colombo',
      province                 = 'Western',
      association_name         = 'Western Province Karate Association',
      slkf_registration_number = 'SLKF/AFF/WP/001',
      instructor_name          = 'Test Sensei',
      whatsapp_number          = '0771234567',
      is_profile_complete      = true;

  -- Tournament: OKC-2026
  INSERT INTO tournaments (
    id, name, code, year, subtitle,
    registration_deadline, age_eligibility_cutoff_date, status,
    venue_u14, venue_cadet_junior, venue_u21_senior,
    date_u14_start, date_u14_end, date_cadet_junior,
    date_u21_senior_start, date_u21_senior_end,
    bank_account_name, bank_account_number, bank_name, bank_branch,
    fee_individual_one_event_lkr, fee_individual_both_events_lkr, fee_team_kata_lkr,
    max_team_members, max_u14_teams_per_gender, max_individual_athletes_per_application,
    created_by
  ) VALUES (
    v_tournament_id,
    'OPEN KARATE COMPETITION 2026',
    'OKC-2026',
    2026,
    'U 14/Cadet/Junior/U 21 and Senior',
    '2026-05-21',
    '2026-07-17',
    'OPEN',
    'Sugathadasa Indoor Stadium, Colombo',
    'New Town Hall Indoor Stadium, Ratnapura',
    'Kotawila Sports Complex',
    '2026-06-07', '2026-06-14',
    '2026-05-31',
    '2026-06-06', '2026-06-07',
    'Sri Lanka Karatedo Federation',
    '046-1-001-6-0387279',
    'People''s Bank',
    'First City',
    2000, 3000, 3000,
    4, 2, 100,
    v_head_master_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Age categories for OKC-2026
  INSERT INTO tournament_age_categories (
    id, tournament_id, category_code, category_label,
    min_age_years, max_age_years,
    is_individual_eligible, is_team_kata_eligible, display_order
  ) VALUES
    (v_cat_u14_8_10_id,  v_tournament_id, 'U14_8_10',  '8 yrs & above, below 10 yrs',  8,  10, true, true,  1),
    (v_cat_u14_10_12_id, v_tournament_id, 'U14_10_12', '10 yrs & above, below 12 yrs', 10, 12, true, true,  2),
    (v_cat_u14_12_14_id, v_tournament_id, 'U14_12_14', '12 yrs & above, below 14 yrs', 12, 14, true, true,  3),
    (v_cat_cadet_id,     v_tournament_id, 'CADET',      'Cadet',                        14, 16, true, true,  4),
    (v_cat_junior_id,    v_tournament_id, 'JUNIOR',     'Junior',                       16, 18, true, true,  5),
    (v_cat_u21_id,       v_tournament_id, 'U21',        'Under 21',                     18, 21, true, false, 6),
    (v_cat_senior_id,    v_tournament_id, 'SENIOR',     'Senior',                       18, NULL, true, false, 7)
  ON CONFLICT (tournament_id, category_code) DO NOTHING;

  -- Draft application
  INSERT INTO applications (
    id, tournament_id, association_id, status, created_by
  ) VALUES (
    v_application_id, v_tournament_id, v_association_id, 'DRAFT', v_rep_id
  ) ON CONFLICT (tournament_id, association_id) DO NOTHING;

  -- Sample individual athletes
  INSERT INTO individual_entries (
    application_id, tournament_id, association_id,
    full_name, date_of_birth, age_category_code,
    gender, event, weight_kg, entry_fee_lkr, row_order, created_by
  ) VALUES
    (v_application_id, v_tournament_id, v_association_id,
     'Nimal Perera', '2016-03-15', 'U14_8_10', 'MALE', 'KATA', 32.5, 2000, 1, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id,
     'Kamala Fernando', '2013-08-22', 'U14_12_14', 'FEMALE', 'BOTH', 41.0, 3000, 2, v_rep_id),
    (v_application_id, v_tournament_id, v_association_id,
     'Sunil Silva', '2011-11-10', 'U14_10_12', 'MALE', 'KUMITE', 48.0, 2000, 3, v_rep_id)
  ON CONFLICT (application_id, row_order) DO NOTHING;

  -- Sample Team Kata entry (3 members)
  INSERT INTO team_kata_entries (
    id, application_id, tournament_id, association_id,
    team_number, age_group_code, gender, event_name,
    entry_fee_lkr, block_order, created_by
  ) VALUES (
    '00000000-0000-0000-0000-000000000050',
    v_application_id, v_tournament_id, v_association_id,
    1, 'U14_12_14', 'MALE', 'TEAM KATA', 3000, 1, v_rep_id
  ) ON CONFLICT (application_id, block_order) DO NOTHING;

  INSERT INTO team_kata_members (team_entry_id, full_name, member_order)
  VALUES
    ('00000000-0000-0000-0000-000000000050', 'Kasun Bandara',  1),
    ('00000000-0000-0000-0000-000000000050', 'Tharaka Silva',  2),
    ('00000000-0000-0000-0000-000000000050', 'Malith Perera',  3)
  ON CONFLICT (team_entry_id, member_order) DO NOTHING;

END $$;
