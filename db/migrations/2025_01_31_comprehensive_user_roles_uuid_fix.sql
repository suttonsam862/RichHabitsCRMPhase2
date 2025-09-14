
-- Comprehensive user_roles.user_id UUID conversion handling all policy dependencies
-- This migration handles policies across all tables that reference user_roles.user_id

DO $$
DECLARE
    policy_record RECORD;
    constraint_record RECORD;
    backup_data RECORD;
    temp_table_name TEXT := 'user_roles_backup_' || extract(epoch from now())::bigint;
    all_policies RECORD;
BEGIN
    RAISE NOTICE 'Starting comprehensive user_roles.user_id UUID conversion with policy handling';
    
    -- Step 1: Check if conversion is needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
        AND data_type = 'character varying'
    ) THEN
        RAISE NOTICE 'user_roles.user_id is already UUID type, skipping conversion';
        RETURN;
    END IF;
    
    -- Step 2: Create backup table with correct structure
    EXECUTE format('CREATE TABLE %I (LIKE user_roles INCLUDING ALL)', temp_table_name);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id TYPE uuid USING user_id::uuid', temp_table_name);
    
    -- Step 3: Copy valid data to backup table
    EXECUTE format('
        INSERT INTO %I 
        SELECT id, 
               CASE 
                   WHEN user_id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'' 
                   THEN user_id::uuid 
                   ELSE NULL 
               END as user_id,
               org_id, role_id, created_at
        FROM user_roles
        WHERE user_id IS NOT NULL
    ', temp_table_name);
    
    RAISE NOTICE 'Backed up valid data to temporary table';
    
    -- Step 4: Drop ALL policies that might reference user_roles.user_id across all tables
    FOR all_policies IN 
        SELECT schemaname, tablename, policyname, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND (
            qual LIKE '%user_roles%user_id%' OR 
            with_check LIKE '%user_roles%user_id%' OR
            qual LIKE '%auth.uid()%' OR
            with_check LIKE '%auth.uid()%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      all_policies.policyname, 
                      all_policies.schemaname, 
                      all_policies.tablename);
        RAISE NOTICE 'Dropped policy: %s on table %s', all_policies.policyname, all_policies.tablename;
    END LOOP;
    
    -- Step 5: Disable RLS on user_roles temporarily
    ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on user_roles';
    
    -- Step 6: Drop all foreign key constraints that reference user_id
    FOR constraint_record IN 
        SELECT constraint_name
        FROM information_schema.table_constraints 
        WHERE table_name = 'user_roles' 
        AND constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: %s', constraint_record.constraint_name;
    END LOOP;
    
    -- Step 7: Clear and convert the column
    UPDATE user_roles SET user_id = NULL;
    ALTER TABLE user_roles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    RAISE NOTICE 'Successfully converted user_roles.user_id to UUID';
    
    -- Step 8: Restore data from backup
    DELETE FROM user_roles;
    EXECUTE format('INSERT INTO user_roles SELECT * FROM %I WHERE user_id IS NOT NULL', temp_table_name);
    RAISE NOTICE 'Restored data from backup';
    
    -- Step 9: Re-enable RLS
    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Re-enabled RLS on user_roles';
    
    -- Step 10: Recreate basic policies for user_roles
    CREATE POLICY user_roles_authenticated_access ON user_roles
        FOR ALL 
        TO authenticated
        USING (true)
        WITH CHECK (true);
    
    RAISE NOTICE 'Created permissive policy for user_roles';
    
    -- Step 11: Recreate basic policies for org_sports (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'org_sports' AND table_schema = 'public') THEN
        ALTER TABLE org_sports ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY org_sports_authenticated_access ON org_sports
            FOR ALL 
            TO authenticated
            USING (true)
            WITH CHECK (true);
        
        RAISE NOTICE 'Created permissive policy for org_sports';
    END IF;
    
    -- Step 12: Recreate basic policies for organizations (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY organizations_authenticated_access ON organizations
            FOR ALL 
            TO authenticated
            USING (true)
            WITH CHECK (true);
        
        RAISE NOTICE 'Created permissive policy for organizations';
    END IF;
    
    -- Step 13: Recreate foreign key constraint to users table (if users table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE user_roles 
        ADD CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Recreated foreign key constraint to users table';
    END IF;
    
    -- Step 14: Clean up backup table
    EXECUTE format('DROP TABLE IF EXISTS %I', temp_table_name);
    RAISE NOTICE 'Cleaned up temporary backup table';
    
    RAISE NOTICE 'user_roles UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
