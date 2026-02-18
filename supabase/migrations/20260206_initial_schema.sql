-- =====================================================
-- DIVINATION DASHBOARD - INITIAL SCHEMA MIGRATION
-- =====================================================
-- Creates all tables, enums, policies, functions, and indexes
-- Run this migration in Supabase SQL Editor or via CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- App-level roles
CREATE TYPE user_role AS ENUM ('developer', 'admin', 'user');

-- Event status
CREATE TYPE event_status AS ENUM ('active', 'completed', 'upcoming');

-- Event-specific roles
CREATE TYPE event_role AS ENUM ('pic', 'advertiser');

-- =====================================================
-- TABLES
-- =====================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  status event_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BATCHES
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- 4. EVENT_ASSIGNMENTS
CREATE TABLE event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role event_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 5. REPORTS
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  report_date DATE NOT NULL,
  leads_count INTEGER NOT NULL DEFAULT 0,
  closing_count INTEGER NOT NULL DEFAULT 0,
  ads_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_counts CHECK (leads_count >= 0 AND closing_count >= 0),
  CONSTRAINT valid_ads_spent CHECK (ads_spent >= 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Events
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);

-- Batches
CREATE INDEX idx_batches_event_id ON batches(event_id);
CREATE INDEX idx_batches_dates ON batches(start_date, end_date);

-- Event Assignments
CREATE INDEX idx_event_assignments_event ON event_assignments(event_id);
CREATE INDEX idx_event_assignments_user ON event_assignments(user_id);
CREATE INDEX idx_event_assignments_composite ON event_assignments(event_id, user_id, role);

-- Reports
CREATE INDEX idx_reports_batch_id ON reports(batch_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_date ON reports(report_date);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if current user is developer
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'developer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user is admin or higher (admin/developer)
CREATE OR REPLACE FUNCTION is_admin_or_higher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'developer')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user has access to an event
CREATE OR REPLACE FUNCTION has_event_access(event_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin_or_higher() OR EXISTS (
    SELECT 1 FROM event_assignments
    WHERE event_id = event_uuid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user has access to event via batch
CREATE OR REPLACE FUNCTION has_event_access_via_batch(batch_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM batches b
    WHERE b.id = batch_uuid AND has_event_access(b.event_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user is advertiser in the event (via batch)
CREATE OR REPLACE FUNCTION is_advertiser_in_event(batch_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin_or_higher() OR EXISTS (
    SELECT 1 FROM batches b
    JOIN event_assignments ea ON ea.event_id = b.event_id
    WHERE b.id = batch_uuid 
      AND ea.user_id = auth.uid() 
      AND ea.role = 'advertiser'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user's role in a specific event
CREATE OR REPLACE FUNCTION get_event_role(event_uuid UUID)
RETURNS TEXT AS $$
  SELECT ea.role::TEXT FROM event_assignments ea
  WHERE ea.event_id = event_uuid AND ea.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Developers can promote users to admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_developer())
  WITH CHECK (is_developer());

-- =====================================================
-- EVENTS POLICIES
-- =====================================================

CREATE POLICY "Admins+ can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (is_admin_or_higher());

CREATE POLICY "Assigned users can view their events"
  ON events FOR SELECT
  TO authenticated
  USING (has_event_access(id));

CREATE POLICY "Admins+ can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_higher());

CREATE POLICY "Admins+ can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (is_admin_or_higher())
  WITH CHECK (is_admin_or_higher());

CREATE POLICY "Admins+ can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (is_admin_or_higher());

-- =====================================================
-- BATCHES POLICIES
-- =====================================================

CREATE POLICY "Users can view batches if they have event access"
  ON batches FOR SELECT
  TO authenticated
  USING (has_event_access(event_id));

CREATE POLICY "Admins+ can create batches"
  ON batches FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_higher());

CREATE POLICY "Admins+ can update batches"
  ON batches FOR UPDATE
  TO authenticated
  USING (is_admin_or_higher())
  WITH CHECK (is_admin_or_higher());

CREATE POLICY "Admins+ can delete batches"
  ON batches FOR DELETE
  TO authenticated
  USING (is_admin_or_higher());

-- =====================================================
-- EVENT_ASSIGNMENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view own assignments"
  ON event_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins+ can view all assignments"
  ON event_assignments FOR SELECT
  TO authenticated
  USING (is_admin_or_higher());

CREATE POLICY "Admins+ can create assignments"
  ON event_assignments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_higher());

CREATE POLICY "Admins+ can update assignments"
  ON event_assignments FOR UPDATE
  TO authenticated
  USING (is_admin_or_higher())
  WITH CHECK (is_admin_or_higher());

CREATE POLICY "Admins+ can delete assignments"
  ON event_assignments FOR DELETE
  TO authenticated
  USING (is_admin_or_higher());

-- =====================================================
-- REPORTS POLICIES
-- =====================================================

CREATE POLICY "Users can view reports if they have event access"
  ON reports FOR SELECT
  TO authenticated
  USING (has_event_access_via_batch(batch_id));

CREATE POLICY "Advertisers can create own reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    is_advertiser_in_event(batch_id) 
    AND user_id = auth.uid()
  );

CREATE POLICY "Advertisers can update own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins+ can manage all reports"
  ON reports FOR ALL
  TO authenticated
  USING (is_admin_or_higher())
  WITH CHECK (is_admin_or_higher());

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- =====================================================
-- INITIAL DATA (OPTIONAL - for development)
-- =====================================================

-- Uncomment below to create a developer user
-- INSERT INTO profiles (id, username, full_name, role)
-- VALUES (
--   auth.uid(), -- Replace with actual user ID from auth.users
--   'developer',
--   'Developer User',
--   'developer'
-- );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables are created with: SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- 3. Test RLS policies by creating test users
-- 4. Populate with seed data if needed
