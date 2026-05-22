-- =====================================================
-- Add Facebook access token storage for Meta Ads API
-- =====================================================

ALTER TABLE oauth_identities
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Index for quick token lookup by user
CREATE INDEX IF NOT EXISTS idx_oauth_identities_token_expires
  ON oauth_identities(user_id, provider, token_expires_at);
