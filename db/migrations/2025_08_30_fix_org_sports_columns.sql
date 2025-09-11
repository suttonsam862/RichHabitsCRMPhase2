
-- Add missing columns to org_sports table
ALTER TABLE public.org_sports 
ADD COLUMN IF NOT EXISTS team_name TEXT DEFAULT 'Main Team',
ADD COLUMN IF NOT EXISTS is_primary_contact INTEGER DEFAULT 1;

-- Update existing records to have default values
UPDATE public.org_sports 
SET team_name = 'Main Team' 
WHERE team_name IS NULL;

UPDATE public.org_sports 
SET is_primary_contact = 1 
WHERE is_primary_contact IS NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
