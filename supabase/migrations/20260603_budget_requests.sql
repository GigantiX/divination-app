-- =====================================================
-- BUDGET REQUESTS SCHEMA MIGRATION
-- =====================================================

CREATE TYPE budget_request_status AS ENUM ('process', 'approved', 'rejected');

CREATE TABLE budget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  status budget_request_status NOT NULL DEFAULT 'process',
  proof_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_amount CHECK (amount > 0)
);

CREATE INDEX idx_budget_requests_user_id ON budget_requests(user_id);
CREATE INDEX idx_budget_requests_event_id ON budget_requests(event_id);
CREATE INDEX idx_budget_requests_status ON budget_requests(status);

ALTER TABLE budget_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
  ON budget_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins+ can view all requests"
  ON budget_requests FOR SELECT
  TO authenticated
  USING (is_admin_or_higher());

CREATE POLICY "Users can insert their own requests"
  ON budget_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins+ can update requests"
  ON budget_requests FOR UPDATE
  TO authenticated
  USING (is_admin_or_higher())
  WITH CHECK (is_admin_or_higher());

CREATE TRIGGER set_timestamp_budget_requests
BEFORE UPDATE ON budget_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
