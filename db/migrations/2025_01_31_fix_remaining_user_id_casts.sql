
-- Fix remaining user_id column casting issues
-- This migration handles all tables that have user_id columns that need uuid conversion

DO $$
DECLARE
    table_record RECORD;
    sql_cmd TEXT;
BEGIN
    -- Find all tables with user_id column that are not yet uuid
    FOR table_record IN 
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name IN ('user_id', 'salesperson_user_id', 'assigned_salesperson_id', 'contact_user_id', 'actor_user_id', 'created_by_user_id', 'assignee_designer_id', 'uploader_id')
        AND data_type IN ('character varying', 'text', 'varchar')
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
    
    -- Handle specific known problematic tables explicitly
    BEGIN
        -- Fix salespeople.user_id if it exists and is varchar
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
        -- Fix designers.user_id if it exists and is varchar
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
    
    BEGIN
        -- Fix user_roles.user_id if it exists and is varchar
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
        -- Fix organization_favorites.user_id if it exists and is varchar
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
    
    RAISE NOTICE 'User ID UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
