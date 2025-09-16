-- Fix organizations table ID generation
-- This migration ensures the organizations table has proper UUID defaults

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the organizations table has proper UUID generation
-- Only modify if the column doesn't already have a default value
DO $$
BEGIN
  -- Check if the id column has a default value and is varchar type
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'id' 
      AND column_default IS NOT NULL
  ) THEN
    -- Add UUID default generation for varchar field
    ALTER TABLE public.organizations ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar;
  END IF;
END$$;

-- Ensure other tables have proper UUID generation as well
DO $$
BEGIN
  -- Check and fix users table
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'id' 
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
  END IF;

  -- Check and fix salespeople table if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'salespeople'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'salespeople' 
        AND column_name = 'id' 
        AND column_default IS NOT NULL
    ) THEN
      ALTER TABLE public.salespeople ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
  END IF;
END$$;

-- Add comment for documentation
COMMENT ON TABLE public.organizations IS 'Organizations table with UUID auto-generation for id column';