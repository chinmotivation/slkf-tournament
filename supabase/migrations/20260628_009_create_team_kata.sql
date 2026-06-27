-- Migration 009: team_kata_entries and team_kata_members
-- team_kata_entries: one row per team. Maps to one 4-row block in the T-Kata Excel sheet.
-- team_kata_members: one row per member (2–4 per team). Maps to Col B rows within the block.

CREATE TABLE team_kata_entries (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID         NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  tournament_id   UUID         NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  association_id  UUID         NOT NULL REFERENCES associations(id) ON DELETE RESTRICT,
  team_number     SMALLINT     NOT NULL CHECK (team_number > 0),
  age_group_code  VARCHAR(30)  NOT NULL,
  gender          gender_type  NOT NULL,
  event_name      VARCHAR(50)  NOT NULL DEFAULT 'TEAM KATA',
  -- Locked at entry time for same reason as individual_entries.entry_fee_lkr
  entry_fee_lkr   INTEGER      NOT NULL DEFAULT 3000 CHECK (entry_fee_lkr > 0),
  -- Which 4-row block this team occupies in the T-Kata sheet (1=rows4-7, 2=rows8-11, ...)
  block_order     SMALLINT     NOT NULL CHECK (block_order BETWEEN 1 AND 15),
  deleted_at      TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (application_id, block_order)
);

COMMENT ON TABLE team_kata_entries IS 'One row per Team Kata team. Maps to one 4-row merged block in T-Kata sheet. block_order=1 → Excel rows 4-7.';
COMMENT ON COLUMN team_kata_entries.block_order IS 'Excel start row = 4 + (block_order - 1) * 4. Max 15 teams per combined export.';

CREATE TABLE team_kata_members (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_entry_id   UUID         NOT NULL REFERENCES team_kata_entries(id) ON DELETE CASCADE,
  full_name       VARCHAR(150) NOT NULL,
  -- 1=top row of block, 4=bottom row. Maps to individual Col B cells in the merged block.
  member_order    SMALLINT     NOT NULL CHECK (member_order BETWEEN 1 AND 4),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (team_entry_id, member_order)
);

COMMENT ON TABLE team_kata_members IS 'One row per team member. member_order 1-4 maps to the 4 Col B rows within the team block in the T-Kata sheet.';
