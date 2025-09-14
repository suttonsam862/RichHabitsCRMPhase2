
-- Fix the final remaining user_id column casting issues
-- This migration handles organization_favorites, salesperson_profiles, and user_roles tables

DO $$
DECLARE
    table_record RECORD;
    sql_cmd TEXT;
BEGIN
    RAISE NOTICE 'Starting final user_id UUID conversion for remaining tables';
    
    -- Handle organization_favorites.user_id
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'organization_favorites' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            RAISE NOTICE 'Processing organization_favorites.user_id';
            
            -- Clean invalid UUIDs first
            UPDATE organization_favorites 
            SET user_id = NULL 
            WHERE user_id IS NOT NULL 
            AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            RAISE NOTICE 'Cleaned invalid UUIDs in organization_favorites.user_id';
            
            -- Convert the column type
            ALTER TABLE organization_favorites ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Successfully converted organization_favorites.user_id to uuid';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert organization_favorites.user_id: %', SQLERRM;
    END;
    
    -- Handle salesperson_profiles.user_id
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'salesperson_profiles' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            RAISE NOTICE 'Processing salesperson_profiles.user_id';
            
            -- Clean invalid UUIDs first
            UPDATE salesperson_profiles 
            SET user_id = NULL 
            WHERE user_id IS NOT NULL 
            AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            RAISE NOTICE 'Cleaned invalid UUIDs in salesperson_profiles.user_id';
            
            -- Convert the column type
            ALTER TABLE salesperson_profiles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Successfully converted salesperson_profiles.user_id to uuid';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert salesperson_profiles.user_id: %', SQLERRM;
    END;
    
    -- Handle user_roles.user_id
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            RAISE NOTICE 'Processing user_roles.user_id';
            
            -- Clean invalid UUIDs first
            UPDATE user_roles 
            SET user_id = NULL 
            WHERE user_id IS NOT NULL 
            AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            RAISE NOTICE 'Cleaned invalid UUIDs in user_roles.user_id';
            
            -- Convert the column type
            ALTER TABLE user_roles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Successfully converted user_roles.user_id to uuid';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert user_roles.user_id: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Final user_id UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
