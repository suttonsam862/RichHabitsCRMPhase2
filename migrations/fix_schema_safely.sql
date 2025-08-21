
-- Safe migration to align schema without data loss
-- This preserves existing data while adding missing columns/constraints

-- First ensure users table exists
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Add missing columns to roles if they don't exist
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add unique constraint on name only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'roles_name_key'
  ) THEN
    ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END $$;

-- Ensure organizations table has all required columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS title_card_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_secondary TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
