-- ============================================================
-- ZENTRIX 2026 - Row Level Security (RLS) & Authorization
-- The Kavery Engineering College (Autonomous)
-- Mecheri, Salem District, Tamil Nadu
--
-- Run this file AFTER running schema.sql.
--
-- Security Model:
--   1. Anonymous Students:
--      - INSERT only into `registrations` (submit registration)
--      - CANNOT SELECT, UPDATE, or DELETE any registration records
--   2. Authenticated Normal Users (e.g. standard accounts):
--      - CANNOT SELECT, UPDATE, or DELETE registrations unless listed
--        in the `admin_users` table
--   3. Authenticated Authorized Administrators (in `admin_users`):
--      - Full SELECT access across all participant registrations
--      - UPDATE access to modify registration status (attendance)
--      - DELETE access for administrative record cleanup
-- ============================================================


-- ============================================================
-- 1. AUTHORIZATION FUNCTION (SECURITY DEFINER)
--
-- Returns TRUE if the current caller's auth.uid() is registered
-- in the admin_users directory table.
--
-- Using SECURITY DEFINER and search_path = public prevents
-- recursive RLS evaluation loops and privilege escalation.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_admin() IS
  'Returns true if the authenticated user (auth.uid()) exists in the admin_users table.';


-- ============================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================

-- Force RLS on registrations
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations FORCE ROW LEVEL SECURITY;

-- Force RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users FORCE ROW LEVEL SECURITY;


-- ============================================================
-- 3. DROP EXISTING POLICIES (Idempotent re-run safety)
-- ============================================================

DROP POLICY IF EXISTS policy_anon_insert          ON registrations;
DROP POLICY IF EXISTS policy_admin_select        ON registrations;
DROP POLICY IF EXISTS policy_admin_update        ON registrations;
DROP POLICY IF EXISTS policy_admin_delete        ON registrations;

DROP POLICY IF EXISTS policy_admin_users_read    ON admin_users;
DROP POLICY IF EXISTS policy_admin_users_manage  ON admin_users;


-- ============================================================
-- 4. POLICIES FOR `admin_users`
-- ============================================================

-- Authenticated users can check their own admin status
-- (Required for the frontend auth guard to verify role upon login)
CREATE POLICY policy_admin_users_read
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR is_admin()
  );

-- Only existing admins can add/update other admins
CREATE POLICY policy_admin_users_manage
  ON admin_users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================================
-- 5. POLICIES FOR `registrations`
-- ============================================================

-- Payment screenshot storage used by the public registration form.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS policy_anon_payment_upload ON storage.objects;
CREATE POLICY policy_anon_payment_upload
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS policy_admin_payment_read ON storage.objects;
CREATE POLICY policy_admin_payment_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-screenshots' AND is_admin());

-- 5a. Student Registration Submission:
--     Allows unauthenticated visitors to submit their own registration.
--     Guards that only 'internal' registrations can be submitted.
CREATE POLICY policy_anon_insert
  ON registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    registration_type = 'internal'
  );

-- 5b. Administrator SELECT:
--     ONLY authenticated users verified by is_admin() can read rows.
--     A normal student or non-admin authenticated user receives 0 rows.
CREATE POLICY policy_admin_select
  ON registrations
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- 5c. Administrator UPDATE:
--     Only verified administrators can update attendance or record status.
CREATE POLICY policy_admin_update
  ON registrations
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (
    is_admin() AND registration_type = 'internal'
  );

-- 5d. Administrator DELETE:
--     Only verified administrators can remove a registration.
CREATE POLICY policy_admin_delete
  ON registrations
  FOR DELETE
  TO authenticated
  USING (is_admin());


-- ============================================================
-- 6. HOW TO ADD THE FIRST ADMIN USER IN SUPABASE
--
-- Since admin_users is protected and references auth.users,
-- follow these 3 simple steps in your Supabase Dashboard:
--
-- STEP 1: CREATE THE AUTH USER
--   1. Open Supabase Dashboard → Authentication → Users
--   2. Click "Add user" → "Create user"
--   3. Enter organizer email: e.g. coordinator@kavery.edu.in
--   4. Enter a strong password
--   5. Toggle "Auto Confirm User" to ON → Click "Create user"
--   6. Copy the generated "User UID" (UUID format)
--
-- STEP 2: REGISTER IN `admin_users` TABLE
--   Open Supabase Dashboard → SQL Editor → Run:
--
--   INSERT INTO admin_users (id, email, role)
--   VALUES (
--     '<PASTE_THE_COPIED_USER_UID_HERE>',
--     'coordinator@kavery.edu.in',
--     'admin'
--   );
--
-- ─────────────────────────────────────────────────────────────
-- ALTERNATIVE (ALL-IN-ONE SQL SCRIPT):
-- If you know the email and user already exists in auth.users:
--
--   INSERT INTO admin_users (id, email, role)
--   SELECT id, email, 'admin'
--   FROM auth.users
--   WHERE email = 'coordinator@kavery.edu.in'
--   ON CONFLICT (id) DO NOTHING;
-- ============================================================
