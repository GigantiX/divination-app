-- =====================================================
-- ADD PASSWORD HASH COLUMN TO PROFILES
-- =====================================================
-- Required for Auth.js authentication with Credentials provider
-- Run this migration after initial_schema.sql

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index for faster email lookups during login
CREATE INDEX IF NOT EXISTS idx_profiles_username_password 
ON profiles(username) 
WHERE password_hash IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Note: This column is nullable to allow existing profiles
-- without passwords (e.g., OAuth users in the future)
