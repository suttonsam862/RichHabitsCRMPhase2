
-- Fix ID type inconsistencies to resolve casting errors
-- This migration handles the varchar/uuid conflicts systematically

DO $$
DECLARE
    r RECORD;
BEGIN
    -- First, handle organizations table - convert id from varchar to uuid where possible
    -- Check if all organization IDs are valid UUIDs
    PERFORM * FROM organizations WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text LIMIT 1;
    
    IF NOT FOUND THEN
        -- All IDs are valid UUIDs, safe to convert
        ALTER TABLE organizations ALTER COLUMN id TYPE uuid USING id::uuid;
        RAISE NOTICE 'Converted organizations.id to uuid';
    ELSE
        RAISE NOTICE 'Organizations table contains non-UUID IDs, keeping as varchar';
    END IF;

    -- Handle users table - convert id from varchar to uuid where possible
    PERFORM * FROM users WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text LIMIT 1;
    
    IF NOT FOUND THEN
        -- All IDs are valid UUIDs, safe to convert
        ALTER TABLE users ALTER COLUMN id TYPE uuid USING id::uuid;
        RAISE NOTICE 'Converted users.id to uuid';
    ELSE
        RAISE NOTICE 'Users table contains non-UUID IDs, keeping as varchar';
    END IF;

    -- Fix foreign key references to match the primary key types
    -- Update organization_id columns to match organizations.id type
    BEGIN
        ALTER TABLE orders ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert orders.organization_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE org_sports ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert org_sports.organization_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE user_roles ALTER COLUMN org_id TYPE uuid USING org_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert user_roles.org_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE organization_metrics ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert organization_metrics.organization_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE organization_favorites ALTER COLUMN org_id TYPE uuid USING org_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert organization_favorites.org_id: %', SQLERRM;
    END;

    -- Fix user_id references to match users.id type
    BEGIN
        ALTER TABLE organization_favorites ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert organization_favorites.user_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE user_roles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert user_roles.user_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE users ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert users.organization_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE users ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert users.created_by: %', SQLERRM;
    END;

    -- Fix salesperson tables - convert varchar IDs to uuid
    BEGIN
        ALTER TABLE salesperson_profiles ALTER COLUMN id TYPE uuid USING id::uuid;
        ALTER TABLE salesperson_profiles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
        ALTER TABLE salesperson_profiles ALTER COLUMN manager_id TYPE uuid USING manager_id::uuid;
        RAISE NOTICE 'Converted salesperson_profiles columns to uuid';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert salesperson_profiles: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE salesperson_assignments ALTER COLUMN id TYPE uuid USING id::uuid;
        ALTER TABLE salesperson_assignments ALTER COLUMN salesperson_id TYPE uuid USING salesperson_id::uuid;
        ALTER TABLE salesperson_assignments ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
        ALTER TABLE salesperson_assignments ALTER COLUMN assigned_by TYPE uuid USING assigned_by::uuid;
        RAISE NOTICE 'Converted salesperson_assignments columns to uuid';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert salesperson_assignments: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE salesperson_metrics ALTER COLUMN id TYPE uuid USING id::uuid;
        ALTER TABLE salesperson_metrics ALTER COLUMN salesperson_id TYPE uuid USING salesperson_id::uuid;
        RAISE NOTICE 'Converted salesperson_metrics columns to uuid';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert salesperson_metrics: %', SQLERRM;
    END;

    -- Fix org_sports salesperson reference
    BEGIN
        ALTER TABLE org_sports ALTER COLUMN assigned_salesperson_id TYPE uuid USING assigned_salesperson_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert org_sports.assigned_salesperson_id: %', SQLERRM;
    END;

    -- Fix orders salesperson reference
    BEGIN
        ALTER TABLE orders ALTER COLUMN salesperson_id TYPE uuid USING salesperson_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert orders.salesperson_id: %', SQLERRM;
    END;

    -- Fix any remaining varchar sport_id references
    BEGIN
        ALTER TABLE org_sports ALTER COLUMN sport_id TYPE uuid USING sport_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert org_sports.sport_id: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE orders ALTER COLUMN sport_id TYPE uuid USING sport_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert orders.sport_id: %', SQLERRM;
    END;

    -- Fix role and permission tables
    BEGIN
        ALTER TABLE roles ALTER COLUMN id TYPE uuid USING id::uuid;
        ALTER TABLE user_roles ALTER COLUMN role_id TYPE uuid USING role_id::uuid;
        RAISE NOTICE 'Converted role-related columns to uuid';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert role tables: %', SQLERRM;
    END;

    RAISE NOTICE 'Migration completed. Some conversions may have been skipped due to data incompatibility.';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
