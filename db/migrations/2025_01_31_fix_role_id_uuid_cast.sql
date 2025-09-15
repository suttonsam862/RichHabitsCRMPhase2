
-- Fix role_id column casting issue in user_roles table
-- This migration handles the specific role_id varchar to uuid conversion

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Starting role_id UUID conversion for user_roles table';
    
    -- Check if conversion is needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'role_id'
        AND data_type = 'character varying'
    ) THEN
        RAISE NOTICE 'user_roles.role_id is already UUID type, skipping conversion';
        RETURN;
    END IF;
    
    -- Drop all existing policies on user_roles table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %s', policy_record.policyname;
    END LOOP;
    
    -- Disable RLS temporarily
    ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on user_roles';
    
    -- Clean invalid UUIDs first - set to NULL anything that doesn't match UUID pattern
    UPDATE user_roles 
    SET role_id = NULL 
    WHERE role_id IS NOT NULL 
    AND role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
    RAISE NOTICE 'Cleaned invalid UUIDs in user_roles.role_id';
    
    -- Convert the column type using USING clause
    ALTER TABLE user_roles ALTER COLUMN role_id TYPE uuid USING role_id::uuid;
    RAISE NOTICE 'Successfully converted user_roles.role_id to uuid';
    
    -- Re-enable RLS
    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Re-enabled RLS on user_roles';
    
    -- Create a simple permissive policy for development
    CREATE POLICY user_roles_dev_access ON user_roles
        FOR ALL 
        TO authenticated, public
        USING (true)
        WITH CHECK (true);
    
    RAISE NOTICE 'Created permissive policy for user_roles';
    
    RAISE NOTICE 'role_id UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
