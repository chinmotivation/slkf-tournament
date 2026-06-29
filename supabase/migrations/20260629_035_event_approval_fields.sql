-- Add per-event approval flags to student_applications.
-- Head masters can approve individual events (kata, kumite, team kata) independently.
ALTER TABLE student_applications
  ADD COLUMN IF NOT EXISTS kata_approved       BOOLEAN,
  ADD COLUMN IF NOT EXISTS kumite_approved     BOOLEAN,
  ADD COLUMN IF NOT EXISTS team_kata_approved  BOOLEAN;
