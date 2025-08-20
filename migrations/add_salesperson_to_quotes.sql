
-- Add salesperson column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS salesperson TEXT;
