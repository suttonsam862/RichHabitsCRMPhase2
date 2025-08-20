-- Migration to seed required roles
-- This ensures the roles exist in the database without requiring runtime seeding

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Insert required roles with ON CONFLICT DO NOTHING to prevent duplicates
INSERT INTO roles (slug, name, description) VALUES
  ('owner', 'Owner', 'Organization owner with full administrative privileges'),
  ('admin', 'Administrator', 'Administrative privileges for organization management'),
  ('member', 'Member', 'Standard organization member'),
  ('customer', 'Customer', 'External customer with limited access')
ON CONFLICT (slug) DO NOTHING;

-- Verify roles exist
DO $$
DECLARE
    role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM roles;
    RAISE NOTICE 'Total roles in database: %', role_count;
    
    IF role_count >= 4 THEN
        RAISE NOTICE 'All required roles successfully seeded';
    ELSE
        RAISE WARNING 'Some roles may be missing - expected at least 4 roles';
    END IF;
END $$;