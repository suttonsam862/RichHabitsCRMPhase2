-- Security Test Script: Verify Organization Authorization Fixes
-- This script tests the new organization membership system

-- First, check if the organization_memberships table was created successfully
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'organization_memberships'
ORDER BY ordinal_position;

-- Check if we have any existing organizations and users to work with
SELECT COUNT(*) as org_count FROM organizations;
SELECT COUNT(*) as user_count FROM users;

-- If we have data, show sample organization and user IDs for testing
SELECT id, name FROM organizations LIMIT 3;
SELECT id, email FROM users LIMIT 3;