-- Migration 037: Add class_id to student_applications.
-- Allows students to indicate which training class/location they belong to.

ALTER TABLE student_applications
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES hm_classes(id) ON DELETE SET NULL;
