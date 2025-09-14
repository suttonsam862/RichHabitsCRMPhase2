
-- Convert users.id to UUID first, then user_roles.user_id can reference it
-- This must run before the user_roles UUID conversion

DO $$
DECLARE
    policy_record RECORD;
    constraint_record RECORD;
    temp_table_name TEXT := 'users_backup_' || extract(epoch from now())::bigint;
BEGIN
    RAISE NOTICE 'Starting users.id UUID conversion';
    
    -- Step 1: Check if conversion is needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'id'
        AND data_type = 'character varying'
    ) THEN
        RAISE NOTICE 'users.id is already UUID type, skipping conversion';
        RETURN;
    END IF;
    
    -- Step 2: Drop all foreign key constraints that reference users.id
    FOR constraint_record IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
        AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                      constraint_record.table_name, 
                      constraint_record.constraint_name);
        RAISE NOTICE 'Dropped FK constraint: %s from table %s', 
                     constraint_record.constraint_name, 
                     constraint_record.table_name;
    END LOOP;
    
    -- Step 3: Create backup table with correct UUID structure
    EXECUTE format('CREATE TABLE %I (LIKE users INCLUDING ALL)', temp_table_name);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE uuid USING id::uuid', temp_table_name);
    
    -- Step 4: Copy valid data to backup table (using actual column names)
    EXECUTE format('
        INSERT INTO %I 
        SELECT 
               CASE 
                   WHEN id::text ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'' 
                   THEN id::uuid 
                   ELSE gen_random_uuid()
               END as id,
               email, password_hash, full_name, phone, role, is_active, 
               organization_id, avatar_url, address_line1, address_line2, 
               city, state, postal_code, country, last_login, 
               password_reset_token, password_reset_expires, email_verified, 
               notes, created_at, updated_at, initial_temp_password, 
               subrole, job_title, department,
               CASE 
                   WHEN created_by IS NOT NULL AND created_by::text ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'' 
                   THEN created_by::uuid 
                   ELSE NULL 
               END as created_by
        FROM users
    ', temp_table_name);
    
    RAISE NOTICE 'Backed up valid data to temporary table';
    
    -- Step 5: Drop all policies on users table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %s', policy_record.policyname;
    END LOOP;
    
    -- Step 6: Disable RLS temporarily
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on users';
    
    -- Step 7: Clear and convert the column
    DELETE FROM users;
    ALTER TABLE users ALTER COLUMN id TYPE uuid USING id::uuid;
    ALTER TABLE users ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
    RAISE NOTICE 'Successfully converted users.id and users.created_by to UUID';
    
    -- Step 8: Restore data from backup
    EXECUTE format('INSERT INTO users SELECT * FROM %I', temp_table_name);
    RAISE NOTICE 'Restored data from backup';
    
    -- Step 9: Re-enable RLS
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Re-enabled RLS on users';
    
    -- Step 10: Create basic policy for users
    CREATE POLICY users_authenticated_access ON users
        FOR ALL 
        TO authenticated
        USING (true)
        WITH CHECK (true);
    
    RAISE NOTICE 'Created permissive policy for users';
    
    -- Step 11: Add self-referencing constraint back
    ALTER TABLE users 
    ADD CONSTRAINT users_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Recreated self-referencing FK constraint';
    
    -- Step 12: Clean up backup table
    EXECUTE format('DROP TABLE IF EXISTS %I', temp_table_name);
    RAISE NOTICE 'Cleaned up temporary backup table';
    
    RAISE NOTICE 'users UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
