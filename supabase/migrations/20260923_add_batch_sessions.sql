-- =====================================================
-- BATCH CITY / SESSION SUPPORT
-- =====================================================
-- A batch can optionally have multiple named locations or sessions. Reports
-- keep a nullable reference so existing data and batches without sessions
-- continue to work unchanged.

CREATE TABLE batch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT batch_sessions_name_not_blank CHECK (char_length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX idx_batch_sessions_unique_name
    ON batch_sessions (batch_id, lower(name));

CREATE INDEX idx_batch_sessions_batch_id
    ON batch_sessions (batch_id);

ALTER TABLE batch_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batch sessions if they have event access"
    ON batch_sessions FOR SELECT
    TO authenticated
    USING (has_event_access_via_batch(batch_id));

CREATE POLICY "Admins and PICs can manage batch sessions"
    ON batch_sessions FOR ALL
    TO authenticated
    USING (
        is_admin_or_higher() OR EXISTS (
            SELECT 1
            FROM batches
            JOIN event_assignments ON event_assignments.event_id = batches.event_id
            WHERE batches.id = batch_sessions.batch_id
              AND event_assignments.user_id = auth.uid()
              AND event_assignments.role = 'pic'
        )
    )
    WITH CHECK (
        is_admin_or_higher() OR EXISTS (
            SELECT 1
            FROM batches
            JOIN event_assignments ON event_assignments.event_id = batches.event_id
            WHERE batches.id = batch_sessions.batch_id
              AND event_assignments.user_id = auth.uid()
              AND event_assignments.role = 'pic'
        )
    );

ALTER TABLE reports
    ADD COLUMN batch_session_id UUID REFERENCES batch_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_reports_batch_session_id
    ON reports (batch_session_id);
