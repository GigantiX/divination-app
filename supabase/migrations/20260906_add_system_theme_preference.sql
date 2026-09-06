-- Forward-only follow-up to 20260901_profile_theme.sql.
-- Preserve all existing light/dark selections while allowing users to follow
-- their current device preference on every signed-in device.
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_theme_check;

ALTER TABLE profiles
ALTER COLUMN theme SET DEFAULT 'system';

ALTER TABLE profiles
ADD CONSTRAINT profiles_theme_check CHECK (theme IN ('light', 'dark', 'system'));
