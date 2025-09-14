
-- Final fix for user_roles.user_id UUID conversion
-- This migration completely handles the table restructuring

DO $$
DECLARE
    policy_record RECORD;
    constraint_record RECORD;
    backup_data RECORD;
    temp_table_name TEXT := 'user_roles_backup_' || extract(epoch from now())::bigint;
BEGIN
    RAISE NOTICE 'Starting comprehensive user_roles.user_id UUID conversion';
    
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
    ', temp_table_name);
    
    RAISE NOTICE 'Backed up valid data to temporary table';
    
    -- Step 4: Disable RLS temporarily
    ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on user_roles';
    
    -- Step 5: Drop all policies
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %s', policy_record.policyname;
    END LOOP;
    
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
    EXECUTE format('INSERT INTO user_roles SELECT * FROM %I', temp_table_name);
    RAISE NOTICE 'Restored data from backup';
    
    -- Step 9: Re-enable RLS
    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Re-enabled RLS on user_roles';
    
    -- Step 10: Create basic policies
    CREATE POLICY user_roles_own_data ON user_roles
        FOR ALL 
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY user_roles_admin_access ON user_roles
        FOR ALL 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM user_roles ur 
                WHERE ur.user_id = auth.uid() 
                AND ur.role = 'admin'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM user_roles ur 
                WHERE ur.user_id = auth.uid() 
                AND ur.role = 'admin'
            )
        );
    
    RAISE NOTICE 'Created new RLS policies for user_roles';
    
    -- Step 11: Recreate foreign key constraint to users table
    ALTER TABLE user_roles 
    ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Recreated foreign key constraint';
    
    -- Step 12: Clean up backup table
    EXECUTE format('DROP TABLE IF EXISTS %I', temp_table_name);
    RAISE NOTICE 'Cleaned up temporary backup table';
    
    RAISE NOTICE 'user_roles UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
