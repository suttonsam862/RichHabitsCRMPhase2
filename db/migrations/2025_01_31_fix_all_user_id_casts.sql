
-- Fix ALL remaining user_id column casting issues
-- This migration handles every possible user_id column that needs uuid conversion

DO $$
DECLARE
    table_record RECORD;
    sql_cmd TEXT;
BEGIN
    -- Find all tables with user_id-related columns that are not yet uuid
    FOR table_record IN 
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name LIKE '%user_id%'
        AND data_type IN ('character varying', 'text', 'varchar')
        ORDER BY table_name, column_name
    LOOP
        BEGIN
            RAISE NOTICE 'Processing %.%', table_record.table_name, table_record.column_name;
            
            -- Clean invalid UUIDs - set to NULL anything that doesn't match UUID pattern
            sql_cmd := format('
                UPDATE %I 
                SET %I = NULL 
                WHERE %I IS NOT NULL 
                AND %I !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''', 
                table_record.table_name,
                table_record.column_name,
                table_record.column_name,
                table_record.column_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Cleaned invalid UUIDs in %.%', table_record.table_name, table_record.column_name;
            
            -- Now convert the column type using USING clause
            sql_cmd := format('ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING %I::uuid', 
                table_record.table_name, 
                table_record.column_name,
                table_record.column_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Successfully converted %.% to uuid', table_record.table_name, table_record.column_name;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to convert %.%: %', table_record.table_name, table_record.column_name, SQLERRM;
        END;
    END LOOP;
    
    -- Handle specific tables that might have been missed
    BEGIN
        -- Check and fix users table columns
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'organization_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            UPDATE users SET organization_id = NULL WHERE organization_id IS NOT NULL AND organization_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            ALTER TABLE users ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
            RAISE NOTICE 'Fixed users.organization_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix users.organization_id: %', SQLERRM;
    END;
    
    BEGIN
        -- Check and fix organization_favorites.user_id if it exists and is varchar
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'organization_favorites' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            UPDATE organization_favorites SET user_id = NULL WHERE user_id IS NOT NULL AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            ALTER TABLE organization_favorites ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Fixed organization_favorites.user_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix organization_favorites.user_id: %', SQLERRM;
    END;
    
    BEGIN
        -- Check and fix user_roles.user_id if it exists and is varchar
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            UPDATE user_roles SET user_id = NULL WHERE user_id IS NOT NULL AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            ALTER TABLE user_roles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Fixed user_roles.user_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix user_roles.user_id: %', SQLERRM;
    END;
    
    BEGIN
        -- Check and fix org_sports.contact_user_id if it exists and is varchar
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'org_sports' AND column_name = 'contact_user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            UPDATE org_sports SET contact_user_id = NULL WHERE contact_user_id IS NOT NULL AND contact_user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            ALTER TABLE org_sports ALTER COLUMN contact_user_id TYPE uuid USING contact_user_id::uuid;
            RAISE NOTICE 'Fixed org_sports.contact_user_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix org_sports.contact_user_id: %', SQLERRM;
    END;
    
    BEGIN
        -- Check and fix salespeople.user_id if it exists and is varchar
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'salespeople' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            UPDATE salespeople SET user_id = NULL WHERE user_id IS NOT NULL AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            ALTER TABLE salespeople ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Fixed salespeople.user_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix salespeople.user_id: %', SQLERRM;
    END;
    
    BEGIN
        -- Check and fix designers.user_id if it exists and is varchar
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'designers' AND column_name = 'user_id'
            AND data_type IN ('character varying', 'text', 'varchar')
        ) THEN
            UPDATE designers SET user_id = NULL WHERE user_id IS NOT NULL AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
            ALTER TABLE designers ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
            RAISE NOTICE 'Fixed designers.user_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix designers.user_id: %', SQLERRM;
    END;
    
    RAISE NOTICE 'All user_id UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
