-- =====================================================
-- Lead Database Feature
-- Tables: lead_uploads, leads, lead_events
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Upload history (created first because lead_events references it)
CREATE TABLE lead_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    total_contacts INTEGER NOT NULL DEFAULT 0,
    new_leads INTEGER NOT NULL DEFAULT 0,
    existing_leads INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads (unique contacts by normalized phone number)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    primary_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction: lead ↔ event+batch (many-to-many)
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES lead_uploads(id) ON DELETE SET NULL,
    alias_name TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lead_id, event_id, batch_id)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_primary_name ON leads(primary_name);

CREATE INDEX idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX idx_lead_events_event_id ON lead_events(event_id);
CREATE INDEX idx_lead_events_batch_id ON lead_events(batch_id);
CREATE INDEX idx_lead_events_upload_id ON lead_events(upload_id);

CREATE INDEX idx_lead_uploads_user_id ON lead_uploads(user_id);
CREATE INDEX idx_lead_uploads_event_id ON lead_uploads(event_id);
CREATE INDEX idx_lead_uploads_batch_id ON lead_uploads(batch_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_uploads ENABLE ROW LEVEL SECURITY;

-- leads: admins+ can do everything, users can insert (via upload)
CREATE POLICY "leads_admin_all" ON leads
    FOR ALL
    TO authenticated
    USING (is_admin_or_higher())
    WITH CHECK (is_admin_or_higher());

CREATE POLICY "leads_user_insert" ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "leads_user_select" ON leads
    FOR SELECT
    TO authenticated
    USING (true);

-- lead_events: admins+ can do everything, users can insert and select
CREATE POLICY "lead_events_admin_all" ON lead_events
    FOR ALL
    TO authenticated
    USING (is_admin_or_higher())
    WITH CHECK (is_admin_or_higher());

CREATE POLICY "lead_events_user_insert" ON lead_events
    FOR INSERT
    TO authenticated
    WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "lead_events_user_select" ON lead_events
    FOR SELECT
    TO authenticated
    USING (true);

-- lead_uploads: users see own, admins+ see all
CREATE POLICY "lead_uploads_admin_all" ON lead_uploads
    FOR ALL
    TO authenticated
    USING (is_admin_or_higher())
    WITH CHECK (is_admin_or_higher());

CREATE POLICY "lead_uploads_user_insert" ON lead_uploads
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "lead_uploads_user_select_own" ON lead_uploads
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin_or_higher());

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

CREATE TRIGGER set_timestamp_leads
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
