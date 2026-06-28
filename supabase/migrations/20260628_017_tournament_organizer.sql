-- Migration 017: Add organizer/contact fields to tournaments
-- These populate the "PAYMENT & OTHER DETAILS" panel in the Excel export.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS organizer_district          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS organizer_province          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS organizer_association_name  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS organizer_reg_no            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS organizer_instructor_name   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS organizer_whatsapp          VARCHAR(30);
