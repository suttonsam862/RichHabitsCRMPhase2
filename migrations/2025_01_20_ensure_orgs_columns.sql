-- Idempotent migration to ensure organizations table has all required columns
-- This migration can be run multiple times safely

-- Add columns if they don't exist (idempotent)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS universal_discounts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's properly configured
DROP TRIGGER IF EXISTS trg_orgs_set_updated_at ON public.organizations;
CREATE TRIGGER trg_orgs_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_updated_at();

-- Create index for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_orgs_name_lower ON public.organizations (lower(name));
CREATE INDEX IF NOT EXISTS idx_orgs_state ON public.organizations (state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_is_business ON public.organizations (is_business);
CREATE INDEX IF NOT EXISTS idx_orgs_created_at ON public.organizations (created_at DESC);

-- Verify columns exist
DO $$
BEGIN
  RAISE NOTICE 'Organizations table columns verified:';
  RAISE NOTICE '  - address: exists';
  RAISE NOTICE '  - phone: exists';
  RAISE NOTICE '  - email: exists';
  RAISE NOTICE '  - is_business: exists';
  RAISE NOTICE '  - universal_discounts: exists';
  RAISE NOTICE '  - updated_at: exists';
  RAISE NOTICE 'Migration completed successfully.';
END $$;