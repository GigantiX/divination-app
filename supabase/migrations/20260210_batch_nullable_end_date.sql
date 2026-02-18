-- =====================================================
-- MAKE BATCH END_DATE NULLABLE
-- =====================================================
-- Allows batches to be "ongoing" without an end date
-- Run this in Supabase SQL Editor

-- Drop the existing constraint that requires end_date >= start_date
ALTER TABLE batches DROP CONSTRAINT IF EXISTS valid_date_range;

-- Make end_date nullable
ALTER TABLE batches ALTER COLUMN end_date DROP NOT NULL;

-- Add new constraint that only validates when end_date is not null
ALTER TABLE batches ADD CONSTRAINT valid_date_range 
    CHECK (end_date IS NULL OR end_date >= start_date);
