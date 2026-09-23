-- Browser profiles remain only on the private VPS. This table stores ownership
-- and connection state, never OrderOnline credentials, cookies, or tokens.

CREATE TABLE IF NOT EXISTS orderonline_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (status IN ('not_connected', 'login_required', 'connected', 'unreachable')),
  last_checked_at TIMESTAMPTZ,
  last_authenticated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orderonline_connections_user
  ON orderonline_connections(user_id);

ALTER TABLE orderonline_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OrderOnline connection"
  ON orderonline_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all OrderOnline connections"
  ON orderonline_connections FOR SELECT
  TO authenticated
  USING (is_admin_or_higher());

CREATE TRIGGER set_timestamp_orderonline_connections
BEFORE UPDATE ON orderonline_connections
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
