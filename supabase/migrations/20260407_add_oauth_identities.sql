-- =====================================================
-- OAUTH IDENTITIES (Facebook connect)
-- =====================================================

CREATE TABLE IF NOT EXISTS oauth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  provider_name TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oauth_identities_provider_check CHECK (provider IN ('facebook'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_identities_user_provider
  ON oauth_identities(user_id, provider);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_identities_provider_account
  ON oauth_identities(provider, provider_user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_user_id
  ON oauth_identities(user_id);

-- Reuse existing trigger function from initial schema migration
DROP TRIGGER IF EXISTS set_timestamp_oauth_identities ON oauth_identities;
CREATE TRIGGER set_timestamp_oauth_identities
BEFORE UPDATE ON oauth_identities
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE oauth_identities ENABLE ROW LEVEL SECURITY;
