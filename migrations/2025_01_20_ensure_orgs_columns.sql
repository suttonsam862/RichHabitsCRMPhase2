-- Idempotent migration to ensure organizations table has all required columns
-- This migration can be run multiple times safely
-- Executed on: 2025-01-20

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

-- Create performance indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_orgs_name_lower ON public.organizations (lower(name));
CREATE INDEX IF NOT EXISTS idx_orgs_state ON public.organizations (state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_is_business ON public.organizations (is_business);
CREATE INDEX IF NOT EXISTS idx_orgs_created_at ON public.organizations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orgs_updated_at ON public.organizations (updated_at DESC);

-- Verification: Show final table structure
DO $$
DECLARE
  col_record RECORD;
  idx_record RECORD;
  trigger_record RECORD;
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Organizations table columns:';
  
  FOR col_record IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'organizations'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - %: % (nullable: %, default: %)', 
      col_record.column_name, 
      col_record.data_type,
      col_record.is_nullable,
      COALESCE(col_record.column_default, 'none');
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Performance indexes created:';
  FOR idx_record IN 
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'organizations' AND schemaname = 'public' 
    AND indexname LIKE 'idx_orgs_%'
    ORDER BY indexname
  LOOP
    RAISE NOTICE '  - %', idx_record.indexname;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers configured:';
  FOR trigger_record IN
    SELECT trigger_name, action_timing, event_manipulation
    FROM information_schema.triggers 
    WHERE event_object_table = 'organizations' AND event_object_schema = 'public'
  LOOP
    RAISE NOTICE '  - %: % %', trigger_record.trigger_name, trigger_record.action_timing, trigger_record.event_manipulation;
  END LOOP;
END $$;