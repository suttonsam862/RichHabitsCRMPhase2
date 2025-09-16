
-- Fix sports table by ensuring slug column exists and has proper defaults
BEGIN;

-- Add slug column if it doesn't exist
ALTER TABLE public.sports 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Update existing records to have slug values
UPDATE public.sports 
SET slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '&', 'and'), '.', ''))
WHERE slug IS NULL OR slug = '';

-- Make slug required going forward
ALTER TABLE public.sports 
ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint on slug
ALTER TABLE public.sports 
ADD CONSTRAINT IF NOT EXISTS sports_slug_unique UNIQUE (slug);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sports_slug ON public.sports(slug);

COMMIT;
