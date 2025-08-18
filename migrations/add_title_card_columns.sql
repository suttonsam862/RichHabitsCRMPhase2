-- Add title_card_url and brand color columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS title_card_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_secondary TEXT;