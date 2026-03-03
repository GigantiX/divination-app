-- =====================================================
-- ADD PRICE TO BATCHES
-- =====================================================
-- Adds a price column to the batches table to store
-- the ticket price for each batch in IDR.

ALTER TABLE batches
ADD COLUMN price DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Add constraint to ensure price is non-negative
ALTER TABLE batches
ADD CONSTRAINT valid_price CHECK (price >= 0);
