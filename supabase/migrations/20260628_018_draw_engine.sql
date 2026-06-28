-- Migration 018: Live knockout draw engine
-- Three new tables: draw_brackets · draw_participants · bracket_matches
-- Enums: draw_status · seeding_mode · match_status

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE draw_status AS ENUM (
  'PREVIEW',       -- live, auto-updates as athletes become eligible
  'LOCKED',        -- frozen; match numbers assigned; competition may start
  'IN_PROGRESS',   -- results being recorded
  'COMPLETE'       -- champion determined
);

CREATE TYPE seeding_mode AS ENUM (
  'RANDOM',                 -- fully random placement
  'ASSOCIATION_SEPARATION', -- same-club athletes placed on opposite halves
  'MANUAL'                  -- head master assigns seed positions manually
);

CREATE TYPE match_status AS ENUM (
  'PENDING',    -- waiting; neither participant ready or result not entered
  'BYE_WIN',    -- one slot is a bye; winner advances automatically
  'IN_PROGRESS',-- match in progress (future: live scoring)
  'COMPLETE'    -- result recorded; winner set
);

-- ─── draw_brackets ───────────────────────────────────────────────────────────
-- One row per competition category per tournament.
-- Category = tournament + age_group + gender + event + (kata_level | weight_class)

CREATE TABLE draw_brackets (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Category identifiers
  age_group_code      VARCHAR(20) NOT NULL,   -- e.g. 'U10', 'CADET', 'SENIOR'
  gender              gender_type NOT NULL,
  event               event_type  NOT NULL,   -- KATA or KUMITE (not BOTH)
  kata_level          VARCHAR(20),            -- 'LEVEL_1'/'LEVEL_2'/'LEVEL_3'; NULL for kumite
  weight_class_label  VARCHAR(20),            -- e.g. '-35kg'; NULL for kata

  -- Draw configuration
  seeding_mode        seeding_mode NOT NULL DEFAULT 'ASSOCIATION_SEPARATION',

  -- Computed at generate time; stored for dashboard display
  participant_count   INTEGER     NOT NULL DEFAULT 0,
  bracket_size        INTEGER     NOT NULL DEFAULT 0, -- next power-of-2 ≥ participant_count
  bye_count           INTEGER     NOT NULL DEFAULT 0, -- bracket_size − participant_count

  -- Lifecycle
  status              draw_status NOT NULL DEFAULT 'PREVIEW',
  generated_at        TIMESTAMPTZ,          -- last time positions were (re)generated
  locked_at           TIMESTAMPTZ,
  locked_by           UUID        REFERENCES profiles(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID        REFERENCES profiles(id),
  updated_by          UUID        REFERENCES profiles(id),

  -- One bracket per category per tournament
  UNIQUE (tournament_id, age_group_code, gender, event, kata_level, weight_class_label),

  -- Kata must have kata_level; kumite must have weight_class_label
  CONSTRAINT chk_kata_level   CHECK (event != 'KATA'   OR kata_level         IS NOT NULL),
  CONSTRAINT chk_weight_class CHECK (event != 'KUMITE' OR weight_class_label IS NOT NULL),
  CONSTRAINT chk_event_not_both CHECK (event != 'BOTH')
);

CREATE TRIGGER trg_draw_brackets_updated_at
  BEFORE UPDATE ON draw_brackets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── draw_participants ───────────────────────────────────────────────────────
-- One row per slot in a bracket (athlete or bye).
-- Linked to the source entry for eligibility tracing.

CREATE TABLE draw_participants (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id              UUID        NOT NULL REFERENCES draw_brackets(id) ON DELETE CASCADE,

  -- Source reference: exactly one must be set (or neither for byes)
  individual_entry_id     UUID        REFERENCES individual_entries(id)     ON DELETE SET NULL,
  student_application_id  UUID        REFERENCES student_applications(id)   ON DELETE SET NULL,

  -- Denormalized for fast display (avoids joins in bracket rendering)
  full_name               VARCHAR(200),
  association_id          UUID        REFERENCES associations(id)           ON DELETE SET NULL,
  association_name        VARCHAR(200),

  -- Draw position — set when bracket is generated
  seed_position           INTEGER,    -- 1..bracket_size; NULL until generated

  -- Flags
  is_bye                  BOOLEAN     NOT NULL DEFAULT false,
  is_eligible             BOOLEAN     NOT NULL DEFAULT true, -- false if withdrawn after lock

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate entries in the same bracket
  CONSTRAINT uq_entry_per_bracket
    UNIQUE NULLS NOT DISTINCT (bracket_id, individual_entry_id),
  CONSTRAINT uq_student_per_bracket
    UNIQUE NULLS NOT DISTINCT (bracket_id, student_application_id),

  -- A non-bye participant must have a name
  CONSTRAINT chk_bye_or_name CHECK (is_bye OR full_name IS NOT NULL)
);

CREATE TRIGGER trg_draw_participants_updated_at
  BEFORE UPDATE ON draw_participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── bracket_matches ─────────────────────────────────────────────────────────
-- One row per match in the knockout tree.
-- next_match_id self-reference wired after table creation (deferred FK).

CREATE TABLE bracket_matches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id        UUID        NOT NULL REFERENCES draw_brackets(id) ON DELETE CASCADE,

  -- Position in the bracket tree
  round_number      INTEGER     NOT NULL,  -- 1 = Final, 2 = Semi, 3 = QF, 4 = R16, ...
  round_label       VARCHAR(50) NOT NULL,  -- 'Final', 'Semifinal', 'Quarterfinal', 'Round of 16'
  position          INTEGER     NOT NULL,  -- match slot within the round (1, 2, 3 …)

  -- Sequential match label — assigned only after draw is LOCKED; never changes
  match_number      INTEGER,

  -- Participants (NULL = slot not yet filled / bye)
  participant1_id   UUID        REFERENCES draw_participants(id) ON DELETE SET NULL,
  participant2_id   UUID        REFERENCES draw_participants(id) ON DELETE SET NULL,

  -- Result
  winner_id         UUID        REFERENCES draw_participants(id) ON DELETE SET NULL,
  score_p1          INTEGER,    -- kumite: points scored by participant1
  score_p2          INTEGER,    -- kumite: points scored by participant2

  -- Bracket wiring: where the winner advances to
  -- FK added below (self-reference requires separate ALTER TABLE)
  next_match_id     UUID,
  next_match_slot   SMALLINT    CHECK (next_match_slot IN (1, 2)),  -- 1=top, 2=bottom slot

  status            match_status NOT NULL DEFAULT 'PENDING',
  completed_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (bracket_id, round_number, position)
);

-- Self-referencing FK added after table exists
ALTER TABLE bracket_matches
  ADD CONSTRAINT fk_next_match
  FOREIGN KEY (next_match_id) REFERENCES bracket_matches(id) ON DELETE SET NULL;

CREATE TRIGGER trg_bracket_matches_updated_at
  BEFORE UPDATE ON bracket_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Dashboard: list brackets for a tournament
CREATE INDEX idx_draw_brackets_tournament ON draw_brackets(tournament_id);
-- Fast lookup of participants in a bracket, ordered for rendering
CREATE INDEX idx_draw_participants_bracket ON draw_participants(bracket_id, seed_position);
-- Participant traceability
CREATE INDEX idx_draw_participants_entry    ON draw_participants(individual_entry_id)    WHERE individual_entry_id    IS NOT NULL;
CREATE INDEX idx_draw_participants_student  ON draw_participants(student_application_id) WHERE student_application_id IS NOT NULL;
-- Match tree traversal
CREATE INDEX idx_bracket_matches_bracket   ON bracket_matches(bracket_id, round_number, position);
CREATE INDEX idx_bracket_matches_next      ON bracket_matches(next_match_id) WHERE next_match_id IS NOT NULL;

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE draw_brackets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_matches   ENABLE ROW LEVEL SECURITY;

-- draw_brackets ───────────────────────────────────────────────────────────────

-- Head master: full control
CREATE POLICY "draw_brackets: head_master all" ON draw_brackets
  FOR ALL
  USING (current_user_role() = 'head_master');

-- Association rep: read brackets for tournaments they have an application in
CREATE POLICY "draw_brackets: rep reads relevant" ON draw_brackets
  FOR SELECT
  USING (
    current_user_role() = 'association_rep'
    AND status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETE')
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.tournament_id = draw_brackets.tournament_id
        AND a.association_id = current_association_id()
        AND a.status IN ('APPROVED', 'PENDING_VERIFICATION')
    )
  );

-- draw_participants ───────────────────────────────────────────────────────────

CREATE POLICY "draw_participants: head_master all" ON draw_participants
  FOR ALL
  USING (current_user_role() = 'head_master');

-- Reps can see locked/active participants so coaches can view the bracket
CREATE POLICY "draw_participants: rep reads locked" ON draw_participants
  FOR SELECT
  USING (
    current_user_role() = 'association_rep'
    AND EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = draw_participants.bracket_id
        AND db.status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETE')
    )
  );

-- bracket_matches ─────────────────────────────────────────────────────────────

CREATE POLICY "bracket_matches: head_master all" ON bracket_matches
  FOR ALL
  USING (current_user_role() = 'head_master');

CREATE POLICY "bracket_matches: rep reads locked" ON bracket_matches
  FOR SELECT
  USING (
    current_user_role() = 'association_rep'
    AND EXISTS (
      SELECT 1 FROM draw_brackets db
      WHERE db.id = bracket_matches.bracket_id
        AND db.status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETE')
    )
  );
