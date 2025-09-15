
-- Fix salespeople table policies that depend on org_id column
-- This script safely removes policies that prevent column drops

DO $$
BEGIN
    -- Drop policies that depend on org_id column
    DROP POLICY IF EXISTS salespeople_select ON salespeople;
    DROP POLICY IF EXISTS salespeople_write ON salespeople;
    DROP POLICY IF EXISTS salespeople_insert ON salespeople;
    DROP POLICY IF EXISTS salespeople_update ON salespeople;
    DROP POLICY IF EXISTS salespeople_delete ON salespeople;
    
    -- Drop any other policies on salespeople table
    DROP POLICY IF EXISTS salespeople_dev_access ON salespeople;
    
    RAISE NOTICE 'All salespeople policies dropped successfully';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Create a simple permissive policy for development
DO $$
BEGIN
    -- Only create policy if table still exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salespeople') THEN
        CREATE POLICY salespeople_allow_all ON salespeople
            FOR ALL TO PUBLIC
            USING (true)
            WITH CHECK (true);
        
        RAISE NOTICE 'Created permissive policy for salespeople table';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create policy: %', SQLERRM;
END $$;
