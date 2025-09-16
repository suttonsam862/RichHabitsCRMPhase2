
-- Fix setup_complete column to have proper defaults
-- This prevents NOT NULL constraint violations

BEGIN;

-- Set default value for setup_complete column
ALTER TABLE public.organizations 
ALTER COLUMN setup_complete SET DEFAULT false;

-- Update any existing NULL values to false
UPDATE public.organizations 
SET setup_complete = false 
WHERE setup_complete IS NULL;

-- Ensure the column remains NOT NULL with the default
ALTER TABLE public.organizations 
ALTER COLUMN setup_complete SET NOT NULL;

COMMIT;
