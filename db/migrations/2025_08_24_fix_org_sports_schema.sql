
-- Fix org_sports table schema to match application expectations
-- This adds the missing contact_user_id column that's causing creation failures

ALTER TABLE org_sports 
ADD COLUMN IF NOT EXISTS contact_user_id UUID REFERENCES users(id);

-- Also ensure we have the contact fields that the UI expects
ALTER TABLE org_sports 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_org_sports_contact_user 
ON org_sports(contact_user_id);

-- Update RLS policies to allow inserts for authenticated users
DROP POLICY IF EXISTS "org_sports_insert_policy" ON org_sports;
CREATE POLICY "org_sports_insert_policy" 
ON org_sports FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow updates for organization members
DROP POLICY IF EXISTS "org_sports_update_policy" ON org_sports;
CREATE POLICY "org_sports_update_policy" 
ON org_sports FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);
