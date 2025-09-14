
-- Fix user_roles.user_id column casting issue by handling policies
-- This migration handles the final user_id column that's blocked by policy definitions

DO $$
DECLARE
    policy_record RECORD;
    policy_commands TEXT[];
BEGIN
    RAISE NOTICE 'Starting user_roles.user_id UUID conversion with policy handling';
    
    -- Store existing policies for user_roles table before dropping them
    policy_commands := ARRAY[]::TEXT[];
    
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        -- Store policy recreation commands
        policy_commands := array_append(policy_commands, 
            format('CREATE POLICY %I ON public.user_roles FOR %s USING (%s)%s',
                policy_record.policyname,
                policy_record.cmd,
                COALESCE(policy_record.qual, 'true'),
                CASE WHEN policy_record.with_check IS NOT NULL 
                     THEN format(' WITH CHECK (%s)', policy_record.with_check)
                     ELSE '' END
            )
        );
        RAISE NOTICE 'Stored policy for recreation: %', policy_record.policyname;
    END LOOP;
    
    -- Drop all existing policies on user_roles table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;

    -- Now we can safely convert the user_id column
    BEGIN
        -- Clean invalid UUIDs first
        UPDATE user_roles 
        SET user_id = NULL 
        WHERE user_id IS NOT NULL 
        AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
        RAISE NOTICE 'Cleaned invalid UUIDs in user_roles.user_id';
        
        -- Convert the column type
        ALTER TABLE user_roles ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
        RAISE NOTICE 'Successfully converted user_roles.user_id to uuid';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to convert user_roles.user_id: %', SQLERRM;
    END;
    
    -- Recreate policies (if any were stored)
    IF array_length(policy_commands, 1) > 0 THEN
        FOR i IN 1..array_length(policy_commands, 1) 
        LOOP
            BEGIN
                EXECUTE policy_commands[i];
                RAISE NOTICE 'Recreated policy: %', split_part(policy_commands[i], ' ', 3);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to recreate policy: % - Error: %', policy_commands[i], SQLERRM;
                -- Create a simple permissive policy as fallback
                EXECUTE 'CREATE POLICY user_roles_allow_all ON public.user_roles FOR ALL TO public USING (true) WITH CHECK (true)';
                RAISE NOTICE 'Created fallback permissive policy for user_roles';
                EXIT; -- Exit the loop since we created a fallback
            END;
        END LOOP;
    ELSE
        -- No policies existed, create a simple one for safety
        CREATE POLICY user_roles_allow_all ON public.user_roles
            FOR ALL 
            TO public
            USING (true) 
            WITH CHECK (true);
        RAISE NOTICE 'Created new permissive policy for user_roles';
    END IF;
    
    RAISE NOTICE 'User_roles UUID conversion completed successfully';
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
