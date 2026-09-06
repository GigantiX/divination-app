-- Persist the user's interface theme preference.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_theme_check'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_theme_check CHECK (theme IN ('light', 'dark'));
  END IF;
END $$;
