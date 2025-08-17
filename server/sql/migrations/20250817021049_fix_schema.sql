-- Auto-generated migration to fix schema issues
-- Generated at: 2025-08-17T02:10:49.164Z


-- Add missing column slug to roles
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL;

-- Add missing column description to roles
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing column created_at to roles
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();

-- Add missing column id to user_roles
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();

-- Add missing column created_at to user_roles
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_state ON organizations(state);
CREATE INDEX IF NOT EXISTS idx_organizations_is_business ON organizations(is_business);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON user_roles(org_id);
