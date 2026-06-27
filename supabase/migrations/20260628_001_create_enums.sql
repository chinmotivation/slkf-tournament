-- Migration 001: PostgreSQL enum types
-- All domain enums defined once here, referenced by all tables.

CREATE TYPE user_role AS ENUM (
  'head_master',
  'association_rep',
  'super_admin'
);

CREATE TYPE tournament_status AS ENUM (
  'DRAFT',
  'OPEN',
  'CLOSED',
  'ARCHIVED'
);

CREATE TYPE application_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'PENDING_VERIFICATION',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE verification_action AS ENUM (
  'APPROVED',
  'REJECTED'
);

CREATE TYPE gender_type AS ENUM (
  'MALE',
  'FEMALE'
);

CREATE TYPE event_type AS ENUM (
  'KATA',
  'KUMITE',
  'BOTH'
);

CREATE TYPE allowed_mime_type AS ENUM (
  'image/jpeg',
  'image/png',
  'application/pdf'
);
