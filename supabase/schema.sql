-- ============================================================
-- ZENTRIX 2K26 - Database Schema
-- The Kavery Engineering College (Autonomous)
-- Mecheri, Salem District, Tamil Nadu
--
-- Phase 1: Internal College Event
-- Event Date: 28 September 2026
--
-- Instructions:
--   1. Open your Supabase project → SQL Editor
--   2. Paste and run this entire file (schema.sql)
--   3. Then paste and run policies.sql
--   4. Add your first admin user following the guide in policies.sql
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

-- Enable pgcrypto for gen_random_uuid() (available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABLE: admin_users (Authorized Organizers / Administrators)
--
-- Security Purpose:
--   Differentiates standard authenticated users from authorized
--   symposium administrators. Only users present in this table
--   are granted SELECT / UPDATE / DELETE privileges over registrations.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  -- Primary Key references Supabase Auth user id
  id                  UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Admin College Email (must match auth.users email)
  email               TEXT          UNIQUE NOT NULL,

  -- Administrative Role
  role                TEXT          NOT NULL DEFAULT 'admin'
                                    CHECK (role IN ('admin', 'superadmin', 'coordinator')),

  -- Audit timestamp
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Fast lookup by admin email
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);

COMMENT ON TABLE admin_users IS
  'Directory of authorized symposium coordinators and administrators with elevated dashboard privileges.';


-- ============================================================
-- TABLE: registrations
-- ============================================================

CREATE TABLE IF NOT EXISTS registrations (

  -- Primary Key
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable unique registration ID (e.g. SYM2K26-CSE-0001)
  -- Generated automatically via trigger below.
  registration_id     TEXT          UNIQUE NOT NULL,

  -- Student Details
  full_name           TEXT          NOT NULL,
  register_number     TEXT          NOT NULL,
  department          TEXT          NOT NULL,
  year                TEXT          NOT NULL,
  section             TEXT,                          -- Optional (A / B / etc.)
  institution         TEXT,                          -- Selected Kavery institution

  -- Contact
  email               TEXT          NOT NULL,
  phone               TEXT          NOT NULL,
  payment_transaction_id TEXT        NOT NULL,
  payment_screenshot_url TEXT        NOT NULL,

  -- Events (Single Row stores both Technical and Non-Technical events)
  technical_event_id     TEXT,
  technical_event_name   TEXT,
  non_technical_event_id TEXT,
  non_technical_event_name TEXT,
  amount_paid            NUMERIC       DEFAULT 100,

  -- Primary Event (Backward-Compatible)
  event_id            TEXT          NOT NULL,
  event_name          TEXT          NOT NULL,

  -- Team (NULL for individual events)
  team_name           TEXT,
  team_members        TEXT,                          -- JSON array of member name/register objects

  -- Metadata
  registration_type   TEXT          NOT NULL DEFAULT 'internal',
  status              TEXT          NOT NULL DEFAULT 'registered',
  registration_date   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- ── CHECK CONSTRAINTS ─────────────────────────────────────

  -- Only internal registrations allowed in Phase 1
  CONSTRAINT chk_registration_type
    CHECK (registration_type = 'internal'),

  -- Valid status values
  CONSTRAINT chk_status
    CHECK (status IN ('registered', 'attended', 'disqualified', 'cancelled')),

  -- Department must be a known value
  CONSTRAINT chk_department
    CHECK (department IN ('CSE', 'IT', 'AIDS', 'Other') OR char_length(trim(department)) BETWEEN 2 AND 80),

  -- Year must be a known value
  CONSTRAINT chk_year
    CHECK (year IN ('1st Year', '2nd Year', '3rd Year', 'Final Year')),

  CONSTRAINT chk_institution
    CHECK (institution IS NULL OR institution IN (
      'The Kavery Engineering College (Autonomous)',
      'The Kavery Polytechnic College',
      'The Kavery Arts and Science College'
    )),

  -- Phone: 10-digit Indian mobile number (starts with 6–9)
  CONSTRAINT chk_phone
    CHECK (phone ~ '^[6-9][0-9]{9}$'),

  -- Email: basic format check
  CONSTRAINT chk_email
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  CONSTRAINT chk_payment_transaction_id
    CHECK (char_length(trim(payment_transaction_id)) >= 6),

  -- Register number: 4–20 alphanumeric characters
  CONSTRAINT chk_register_number
    CHECK (register_number ~ '^[A-Za-z0-9]{4,20}$'),

  -- Full name must be at least 3 characters
  CONSTRAINT chk_full_name
    CHECK (char_length(trim(full_name)) >= 3),

  -- ── UNIQUE CONSTRAINT ─────────────────────────────────────

  -- Prevent a student from registering for the same event twice
  CONSTRAINT uq_student_per_event
    UNIQUE (register_number, event_id)

);

-- Safe migration for databases created before institution selection was added.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS institution TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS technical_event_id TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS technical_event_name TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS non_technical_event_id TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS non_technical_event_name TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 100;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_department'
  ) THEN
    ALTER TABLE registrations DROP CONSTRAINT chk_department;
  END IF;
  ALTER TABLE registrations ADD CONSTRAINT chk_department
    CHECK (department IN ('CSE', 'IT', 'AIDS', 'Other') OR char_length(trim(department)) BETWEEN 2 AND 80);
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_institution'
  ) THEN
    ALTER TABLE registrations
      ADD CONSTRAINT chk_institution CHECK (institution IS NULL OR institution IN (
        'The Kavery Engineering College (Autonomous)',
        'The Kavery Polytechnic College',
        'The Kavery Arts and Science College'
      ));
  END IF;
END $$;


-- ============================================================
-- SEQUENCE: for generating readable registration IDs
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS registration_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;


-- ============================================================
-- FUNCTION + TRIGGER: Auto-generate registration_id
--
-- Format: SYM2K26-<DEPT>-<ZERO_PADDED_SEQ>
-- Example: SYM2K26-CSE-0042
-- ============================================================

CREATE OR REPLACE FUNCTION generate_registration_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val  BIGINT;
  dept_tag TEXT;
BEGIN
  -- Get next sequence value
  seq_val  := nextval('registration_seq');

  -- Abbreviate department (fallback to 'GEN' for 'Other')
  dept_tag := CASE NEW.department
    WHEN 'CSE'   THEN 'CSE'
    WHEN 'IT'    THEN 'IT'
    WHEN 'AIDS'  THEN 'AIDS'
    ELSE              'GEN'
  END;

  -- Set the registration_id on the new row
  NEW.registration_id := 'SYM2K26-' || dept_tag || '-' || LPAD(seq_val::TEXT, 4, '0');

  RETURN NEW;
END;
$$;

-- Attach trigger — fires BEFORE each INSERT so the ID is set immediately
DROP TRIGGER IF EXISTS trg_generate_registration_id ON registrations;
CREATE TRIGGER trg_generate_registration_id
  BEFORE INSERT ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION generate_registration_id();


-- ============================================================
-- INDEXES
-- ============================================================

-- Fast lookup by student register number
CREATE INDEX IF NOT EXISTS idx_registrations_register_number
  ON registrations (register_number);

-- Fast lookup by email (for duplicate / admin search)
CREATE INDEX IF NOT EXISTS idx_registrations_email
  ON registrations (email);

-- Fast filtering/grouping by event
CREATE INDEX IF NOT EXISTS idx_registrations_event_id
  ON registrations (event_id);

-- Chronological ordering / date-range filtering
CREATE INDEX IF NOT EXISTS idx_registrations_date
  ON registrations (registration_date DESC);

-- Compound index: department + year (useful for admin reports)
CREATE INDEX IF NOT EXISTS idx_registrations_dept_year
  ON registrations (department, year);


-- ============================================================
-- COMMENTS (self-documenting schema)
-- ============================================================

COMMENT ON TABLE registrations IS
  'ZENTRIX 2K26 – Phase 1 Internal Student Registrations. One row per student per event.';

COMMENT ON COLUMN registrations.id IS
  'UUID primary key — internal use only.';

COMMENT ON COLUMN registrations.registration_id IS
  'Human-readable ID auto-generated by trigger. Format: SYM2K26-<DEPT>-<SEQ>. Shown on E-Pass.';

COMMENT ON COLUMN registrations.register_number IS
  'College register/roll number. Stored in UPPERCASE. Part of unique constraint with event_id.';

COMMENT ON COLUMN registrations.department IS
  'Department code. Allowed: CSE, IT, AIDS, Other.';

COMMENT ON COLUMN registrations.year IS
  'Year of study at time of registration.';

COMMENT ON COLUMN registrations.section IS
  'Class section (A, B, etc.). Optional.';

COMMENT ON COLUMN registrations.team_members IS
  'JSON array of additional team member register numbers (excludes team leader). NULL for individual events.';

COMMENT ON COLUMN registrations.registration_type IS
  'Always ''internal'' for Phase 1. Constrained by CHECK.';

COMMENT ON COLUMN registrations.status IS
  'Lifecycle status: registered → attended / disqualified / cancelled.';

COMMENT ON COLUMN registrations.registration_date IS
  'UTC timestamp of registration. Stored with timezone offset.';


-- ============================================================
-- RPC FUNCTION: register_student (SECURITY DEFINER)
--
-- Secure registration submission endpoint. Allows unauthenticated
-- students to submit a registration and receive their unique
-- registration_id without granting public SELECT access on the
-- entire registrations table.
-- ============================================================

-- Drop any previous overloaded versions of register_student
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE proname = 'register_student'
      AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION register_student(
  p_full_name         TEXT,
  p_register_number   TEXT,
  p_department        TEXT,
  p_year              TEXT,
  p_institution       TEXT DEFAULT NULL,
  p_section           TEXT DEFAULT NULL,
  p_email             TEXT DEFAULT NULL,
  p_phone             TEXT DEFAULT NULL,
  p_payment_transaction_id TEXT DEFAULT NULL,
  p_payment_screenshot_url TEXT DEFAULT NULL,
  p_technical_event_id TEXT DEFAULT NULL,
  p_technical_event_name TEXT DEFAULT NULL,
  p_non_technical_event_id TEXT DEFAULT NULL,
  p_non_technical_event_name TEXT DEFAULT NULL,
  p_amount_paid       NUMERIC DEFAULT 100,
  p_team_name         TEXT DEFAULT NULL,
  p_team_members      TEXT DEFAULT NULL,
  p_event_id          TEXT DEFAULT NULL,
  p_event_name        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id          UUID;
  v_registration_id TEXT;
  v_event_id        TEXT;
  v_event_name      TEXT;
BEGIN
  -- Compute primary event identifier & readable compound name
  IF trim(COALESCE(p_technical_event_id, '')) = 'only-non-technical' THEN
    v_event_id := COALESCE(NULLIF(trim(p_non_technical_event_id), ''), NULLIF(trim(p_event_id), ''), 'zentrix-2026');
    v_event_name := COALESCE(NULLIF(trim(p_non_technical_event_name), ''), NULLIF(trim(p_event_name), ''), 'ZENTRIX 2K26');
  ELSIF trim(COALESCE(p_non_technical_event_id, '')) = 'only-technical' THEN
    v_event_id := COALESCE(NULLIF(trim(p_technical_event_id), ''), NULLIF(trim(p_event_id), ''), 'zentrix-2026');
    v_event_name := COALESCE(NULLIF(trim(p_technical_event_name), ''), NULLIF(trim(p_event_name), ''), 'ZENTRIX 2K26');
  ELSIF NULLIF(trim(p_technical_event_name), '') IS NOT NULL AND NULLIF(trim(p_non_technical_event_name), '') IS NOT NULL THEN
    v_event_id := COALESCE(NULLIF(trim(p_technical_event_id), ''), NULLIF(trim(p_event_id), ''), 'zentrix-2026');
    v_event_name := trim(p_technical_event_name) || ' & ' || trim(p_non_technical_event_name);
  ELSE
    v_event_id := COALESCE(NULLIF(trim(p_technical_event_id), ''), NULLIF(trim(p_event_id), ''), 'zentrix-2026');
    v_event_name := COALESCE(NULLIF(trim(p_technical_event_name), ''), NULLIF(trim(p_event_name), ''), 'ZENTRIX 2K26');
  END IF;

  INSERT INTO registrations (
    full_name,
    register_number,
    department,
    year,
    institution,
    section,
    email,
    phone,
    payment_transaction_id,
    payment_screenshot_url,
    technical_event_id,
    technical_event_name,
    non_technical_event_id,
    non_technical_event_name,
    amount_paid,
    event_id,
    event_name,
    team_name,
    team_members,
    registration_type,
    status
  ) VALUES (
    trim(p_full_name),
    upper(trim(p_register_number)),
    trim(p_department),
    trim(p_year),
    NULLIF(trim(p_institution), ''),
    NULLIF(trim(p_section), ''),
    lower(trim(p_email)),
    trim(p_phone),
    trim(p_payment_transaction_id),
    trim(p_payment_screenshot_url),
    NULLIF(trim(p_technical_event_id), ''),
    NULLIF(trim(p_technical_event_name), ''),
    NULLIF(trim(p_non_technical_event_id), ''),
    NULLIF(trim(p_non_technical_event_name), ''),
    COALESCE(p_amount_paid, 100),
    v_event_id,
    v_event_name,
    NULLIF(trim(p_team_name), ''),
    NULLIF(trim(p_team_members), ''),
    'internal',
    'registered'
  )
  RETURNING id, registration_id INTO v_new_id, v_registration_id;

  RETURN jsonb_build_object(
    'id', v_new_id,
    'registration_id', v_registration_id,
    'status', 'registered'
  );
END;
$$;

-- Grant execution permission to anonymous students and authenticated users
GRANT EXECUTE ON FUNCTION register_student(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

