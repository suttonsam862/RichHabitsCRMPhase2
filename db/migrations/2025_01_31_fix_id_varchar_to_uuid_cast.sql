
-- Fix varchar id columns that cannot be cast automatically to uuid
-- This handles the specific error: column "id" cannot be cast automatically to type uuid

DO $$
DECLARE
    table_record RECORD;
    sql_cmd TEXT;
BEGIN
    RAISE NOTICE 'Starting targeted varchar to UUID conversion for id columns';
    
    -- Find all tables with id columns that are varchar/text and need to be uuid
    FOR table_record IN 
        SELECT table_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'id'
        AND data_type IN ('character varying', 'text', 'varchar')
        AND table_name IN (
            'organizations', 'org_sports', 'orders', 'user_roles', 'roles', 
            'sports', 'salesperson_profiles', 'salesperson_assignments', 
            'salesperson_metrics', 'organization_metrics', 'organization_favorites',
            'permissions', 'permission_templates'
        )
    LOOP
        BEGIN
            RAISE NOTICE 'Processing table: %', table_record.table_name;
            
            -- First, clean any invalid UUID values by setting them to NULL
            sql_cmd := format('
                UPDATE %I 
                SET id = NULL 
                WHERE id IS NOT NULL 
                AND id !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''', 
                table_record.table_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Cleaned invalid UUIDs in %.id', table_record.table_name;
            
            -- For tables that should have default UUID generation, add that first
            IF table_record.table_name IN ('user_roles', 'roles', 'sports', 'organization_metrics', 'organization_favorites') THEN
                -- Set NULL ids to generated UUIDs before conversion
                sql_cmd := format('UPDATE %I SET id = gen_random_uuid() WHERE id IS NULL', table_record.table_name);
                EXECUTE sql_cmd;
                RAISE NOTICE 'Generated UUIDs for NULL ids in %', table_record.table_name;
            END IF;
            
            -- Now convert the column type using USING clause
            sql_cmd := format('ALTER TABLE %I ALTER COLUMN id TYPE uuid USING id::uuid', table_record.table_name);
            EXECUTE sql_cmd;
            RAISE NOTICE 'Successfully converted %.id to uuid', table_record.table_name;
            
            -- Add default for tables that should auto-generate UUIDs
            IF table_record.table_name IN ('user_roles', 'roles', 'sports', 'organization_metrics', 'organization_favorites') THEN
                sql_cmd := format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', table_record.table_name);
                EXECUTE sql_cmd;
                RAISE NOTICE 'Set default UUID generation for %.id', table_record.table_name;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to convert %.id: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Targeted varchar to UUID conversion completed';
END $$;
