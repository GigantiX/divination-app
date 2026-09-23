-- Participant Attendance keeps imported participant data and operational
-- check-ins scoped to an event. OrderOnline credentials and browser state stay
-- on the VPS; this database stores only the participant fields needed onsite.

CREATE TABLE IF NOT EXISTS attendance_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  source TEXT NOT NULL DEFAULT 'orderonline_csv'
    CHECK (source IN ('manual_csv', 'orderonline_csv')),
  filename TEXT NOT NULL,
  source_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows_received INTEGER NOT NULL DEFAULT 0 CHECK (rows_received >= 0),
  rows_imported INTEGER NOT NULL DEFAULT 0 CHECK (rows_imported >= 0),
  rows_skipped INTEGER NOT NULL DEFAULT 0 CHECK (rows_skipped >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_imports_event_created
  ON attendance_imports(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS attendance_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  last_import_id UUID REFERENCES attendance_imports(id) ON DELETE SET NULL,
  source_identity TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 240),
  email TEXT,
  phone TEXT,
  ticket_code TEXT,
  order_number TEXT,
  product_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, source_identity)
);

CREATE INDEX IF NOT EXISTS idx_attendance_participants_event_name
  ON attendance_participants(event_id, display_name);
CREATE INDEX IF NOT EXISTS idx_attendance_participants_event_phone
  ON attendance_participants(event_id, phone)
  WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_participants_event_email
  ON attendance_participants(event_id, email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS attendance_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL UNIQUE REFERENCES attendance_participants(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_checkins_event_time
  ON attendance_checkins(event_id, checked_in_at DESC);

ALTER TABLE attendance_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team can view attendance imports"
  ON attendance_imports FOR SELECT TO authenticated
  USING (has_event_access(event_id));
CREATE POLICY "Event team can manage attendance imports"
  ON attendance_imports FOR ALL TO authenticated
  USING (has_event_access(event_id))
  WITH CHECK (has_event_access(event_id));

CREATE POLICY "Event team can view attendance participants"
  ON attendance_participants FOR SELECT TO authenticated
  USING (has_event_access(event_id));
CREATE POLICY "Event team can manage attendance participants"
  ON attendance_participants FOR ALL TO authenticated
  USING (has_event_access(event_id))
  WITH CHECK (has_event_access(event_id));

CREATE POLICY "Event team can view attendance check-ins"
  ON attendance_checkins FOR SELECT TO authenticated
  USING (has_event_access(event_id));
CREATE POLICY "Event team can manage attendance check-ins"
  ON attendance_checkins FOR ALL TO authenticated
  USING (has_event_access(event_id))
  WITH CHECK (has_event_access(event_id));

CREATE TRIGGER set_timestamp_attendance_participants
BEFORE UPDATE ON attendance_participants
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
