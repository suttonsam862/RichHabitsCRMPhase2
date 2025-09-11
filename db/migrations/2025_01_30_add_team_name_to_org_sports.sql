
-- Add team_name column to org_sports table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'org_sports' 
        AND column_name = 'team_name'
    ) THEN
        ALTER TABLE org_sports ADD COLUMN team_name TEXT DEFAULT 'Main Team';
    END IF;
END $$;

-- Update existing records to have a default team name if they don't have one
UPDATE org_sports 
SET team_name = 'Main Team' 
WHERE team_name IS NULL OR team_name = '';
