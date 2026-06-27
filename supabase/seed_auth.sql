-- Run this in Supabase SQL Editor BEFORE running 015_seed_data.sql
-- Creates two development auth users with the placeholder UUIDs used in the seed.
-- DEVELOPMENT ONLY — never run in production.

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  -- Head Master
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'headmaster@slkf.lk',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"head_master","full_name":"Dhammika Kasturi Mudali"}',
    now(),
    now(),
    '', '', '', ''
  ),
  -- Association Rep
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rep@western.lk',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"association_rep","full_name":"Test Sensei"}',
    now(),
    now(),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;
