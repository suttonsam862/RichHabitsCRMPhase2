
-- Fix users_role_check constraint violation
-- This migration handles existing invalid role values before applying the constraint

DO $$
DECLARE
    invalid_roles RECORD;
BEGIN
    RAISE NOTICE 'Starting users role constraint fix';
    
    -- First, let's see what role values currently exist
    FOR invalid_roles IN 
        SELECT DISTINCT role, COUNT(*) as count
        FROM users 
        WHERE role IS NOT NULL
        AND role NOT IN ('admin', 'staff', 'sales', 'designer', 'manufacturing', 'customer')
        GROUP BY role
    LOOP
        RAISE NOTICE 'Found invalid role: % (count: %)', invalid_roles.role, invalid_roles.count;
    END LOOP;
    
    -- Update any invalid role values to 'customer' as default
    UPDATE users 
    SET role = 'customer'
    WHERE role IS NOT NULL
    AND role NOT IN ('admin', 'staff', 'sales', 'designer', 'manufacturing', 'customer');
    
    RAISE NOTICE 'Updated invalid role values to customer';
    
    -- Handle NULL role values
    UPDATE users 
    SET role = 'customer'
    WHERE role IS NULL;
    
    RAISE NOTICE 'Updated NULL role values to customer';
    
    -- Drop the constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add the constraint
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'staff', 'sales', 'designer', 'manufacturing', 'customer'));
    
    RAISE NOTICE 'Successfully added users_role_check constraint';
    
    -- Show final role distribution
    FOR invalid_roles IN 
        SELECT role, COUNT(*) as count
        FROM users 
        GROUP BY role
        ORDER BY role
    LOOP
        RAISE NOTICE 'Role distribution: % = %', invalid_roles.role, invalid_roles.count;
    END LOOP;
    
END $$;
