-- Add tax_percentage column to reports table
-- Stores the Meta Ads tax rate applied to each report's ad spend
-- Default 11% which is the current standard PPN rate in Indonesia

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 11;

-- Add constraint to ensure tax is non-negative
ALTER TABLE reports
ADD CONSTRAINT valid_tax_percentage CHECK (tax_percentage >= 0 AND tax_percentage <= 100);
