-- =====================================================
-- REPLACE AVATAR_URL WITH EMOJI
-- =====================================================
-- Removes profile pictures, adds emoji avatars
-- Run this migration after initial_schema.sql

-- Drop the avatar_url column
ALTER TABLE profiles
DROP COLUMN IF EXISTS avatar_url;

-- Add emoji column with default
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '😀';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Note: Existing profiles will get '😀' as default emoji
-- New registrations will get a random emoji from the app
