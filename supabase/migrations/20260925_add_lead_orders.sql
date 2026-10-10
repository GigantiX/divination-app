-- Keep contact identity separate from orders: one phone may own multiple orders
-- with different payment states. This table is additive to the existing leads schema.
CREATE TABLE lead_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES lead_uploads(id) ON DELETE SET NULL,
    imported_by UUID NOT NULL REFERENCES profiles(id),
    source TEXT NOT NULL DEFAULT 'orderonline' CHECK (source = 'orderonline'),
    order_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    address TEXT,
    province TEXT,
    city TEXT,
    subdistrict TEXT,
    zip TEXT,
    product_name TEXT,
    product_code TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    order_status TEXT,
    payment_status TEXT,
    payment_method TEXT,
    product_price NUMERIC(18,2),
    discount NUMERIC(18,2),
    gross_revenue NUMERIC(18,2),
    net_revenue NUMERIC(18,2),
    order_created_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- Reserved for ticket/attendee data; the OrderOnline orders CSV has buyer data only.
    ticket_code TEXT,
    attendee_name TEXT,
    attendee_email TEXT,
    attendee_phone TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lead_orders_source_order_unique UNIQUE (source, order_id)
);

CREATE INDEX idx_lead_orders_lead_id ON lead_orders(lead_id);
CREATE INDEX idx_lead_orders_event_batch ON lead_orders(event_id, batch_id);
CREATE INDEX idx_lead_orders_upload_id ON lead_orders(upload_id);
CREATE INDEX idx_lead_orders_payment_status ON lead_orders(event_id, payment_status);
CREATE UNIQUE INDEX idx_lead_orders_event_ticket_unique
    ON lead_orders(event_id, ticket_code) WHERE ticket_code IS NOT NULL;

ALTER TABLE lead_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_orders_admin_all" ON lead_orders
    FOR ALL TO authenticated
    USING (is_admin_or_higher())
    WITH CHECK (is_admin_or_higher());

CREATE TRIGGER set_timestamp_lead_orders
    BEFORE UPDATE ON lead_orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE lead_uploads
    ADD COLUMN source TEXT NOT NULL DEFAULT 'contacts'
        CHECK (source IN ('contacts', 'orderonline_csv')),
    ADD COLUMN new_orders INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN updated_orders INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN duplicate_rows INTEGER NOT NULL DEFAULT 0;
