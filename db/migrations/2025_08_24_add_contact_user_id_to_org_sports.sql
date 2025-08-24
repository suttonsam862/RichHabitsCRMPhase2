
-- Add contact_user_id column to org_sports table
-- This column is needed to link sports contacts to their user accounts

ALTER TABLE org_sports 
ADD COLUMN IF NOT EXISTS contact_user_id UUID REFERENCES auth.users(id);

-- Create index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_org_sports_contact_user_id ON org_sports(contact_user_id);

-- Update any existing rows to have NULL for the new column (they'll be updated when contacts are re-created)
