
-- Add unique constraint to org_sports table to support ON CONFLICT upserts
-- This fixes the error: there is no unique or exclusion constraint matching the ON CONFLICT specification

DO $$
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'org_sports_organization_sport_unique' 
    AND table_name = 'org_sports'
    AND table_schema = 'public'
  ) THEN
    -- Add unique constraint on organization_id, sport_id combination
    ALTER TABLE public.org_sports 
    ADD CONSTRAINT org_sports_organization_sport_unique 
    UNIQUE (organization_id, sport_id);
    
    RAISE NOTICE 'Added unique constraint org_sports_organization_sport_unique';
  ELSE
    RAISE NOTICE 'Unique constraint org_sports_organization_sport_unique already exists';
  END IF;
END $$;
