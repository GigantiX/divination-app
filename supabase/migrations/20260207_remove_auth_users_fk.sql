-- =====================================================
-- REMOVE AUTH.USERS FK CONSTRAINT FROM PROFILES
-- =====================================================
-- Since we're using Auth.js instead of Supabase Auth,
-- profiles table does not need to reference auth.users
-- Run this migration after initial_schema.sql

-- Drop the FK constraint on profiles.id
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure id column still has PRIMARY KEY but without FK
-- (No action needed - PK constraint remains)

-- Add a policy to allow service role to insert profiles
-- (This is for the registration flow using admin client)
-- Service role already bypasses RLS, so no explicit policy needed

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Note: After running this, users can register without
-- needing an auth.users entry first.
