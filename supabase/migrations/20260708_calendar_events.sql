-- Personal calendar events (custom events added by users)
-- Visible only to the creator, shown in Event Calendar alongside batch events

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    start_date DATE NOT NULL,
    end_date DATE,                  -- NULL = single day event
    start_time TIME,                -- NULL = full day
    end_time TIME,                  -- NULL = full day
    location TEXT,                  -- optional, may contain a Google Maps URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX calendar_events_user_date_idx ON calendar_events(user_id, start_date);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Consistent with all other tables in this project.
-- Note: the app uses the service-role admin client which bypasses RLS.
-- These policies protect against direct anon/authenticated key access.

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own events
CREATE POLICY "Users can view own calendar events"
    ON calendar_events FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert events for themselves
CREATE POLICY "Users can create own calendar events"
    ON calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own events
CREATE POLICY "Users can delete own calendar events"
    ON calendar_events FOR DELETE
    USING (auth.uid() = user_id);
