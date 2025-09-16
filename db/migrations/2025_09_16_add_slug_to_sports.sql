
BEGIN;

-- Add slug column if it doesn't exist
ALTER TABLE sports ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Create function to generate slug (idempotent)
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Update existing records that don't have slugs
UPDATE sports 
SET slug = generate_slug(name) 
WHERE slug IS NULL OR slug = '';

-- Make slug NOT NULL after populating
ALTER TABLE sports ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint on slug (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sports_slug_unique' 
        AND table_name = 'sports'
    ) THEN
        ALTER TABLE sports ADD CONSTRAINT sports_slug_unique UNIQUE (slug);
    END IF;
END $$;

COMMIT;
