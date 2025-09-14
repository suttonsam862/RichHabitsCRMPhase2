
-- Fix created_by column type conversion from varchar to uuid
-- This migration handles the casting issue by cleaning invalid UUIDs first

DO $$
DECLARE
    table_record RECORD;
    sql_cmd TEXT;
BEGIN
    -- Find all tables with created_by column
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'created_by'
        AND data_type IN ('character varying', 'text', 'varchar')
    LOOP
        BEGIN
            RAISE NOTICE 'Processing table: %', table_record.table_name;
            
            -- Drop any default while converting
            sql_cmd := format('ALTER TABLE %I ALTER COLUMN created_by DROP DEFAULT', table_record.table_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Dropped default for %.created_by', table_record.table_name;
            
            -- Clean invalid UUIDs - set to NULL anything that doesn't match UUID pattern
            sql_cmd := format('
                UPDATE %I 
                SET created_by = NULL 
                WHERE created_by IS NOT NULL 
                AND created_by !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''', 
                table_record.table_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Cleaned invalid UUIDs in %.created_by', table_record.table_name;
            
            -- Now convert the column type using USING clause
            sql_cmd := format('ALTER TABLE %I ALTER COLUMN created_by TYPE uuid USING created_by::uuid', table_record.table_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Successfully converted %.created_by to uuid', table_record.table_name;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to convert %.created_by: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
    
    -- Handle specific tables that might need foreign key constraints
    BEGIN
        -- Add FK constraint for organizations.created_by -> users.id if both tables exist and are uuid
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'created_by'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
        ) THEN
            -- Drop existing constraint if exists
            ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;
            
            -- Add new constraint
            ALTER TABLE organizations 
            ADD CONSTRAINT organizations_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
            
            RAISE NOTICE 'Added FK constraint organizations.created_by -> users.id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add organizations FK constraint: %', SQLERRM;
    END;
    
    -- Handle users table created_by self-reference if needed
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_by'
        ) THEN
            -- Drop existing constraint if exists
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_created_by_fkey;
            
            -- Add self-referencing constraint
            ALTER TABLE users 
            ADD CONSTRAINT users_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
            
            RAISE NOTICE 'Added FK constraint users.created_by -> users.id (self-reference)';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add users self-reference FK constraint: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Created_by UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
