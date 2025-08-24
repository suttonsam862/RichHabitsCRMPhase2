
-- Run this directly in your Supabase SQL Editor dashboard
-- This will completely disable RLS for organizations table during development

-- First, disable RLS entirely on the organizations table
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (in case some weren't caught)
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', policy_name);
    END LOOP;
END $$;

-- Verify no policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'organizations' AND schemaname = 'public';

-- Re-enable RLS with a completely permissive policy
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_allow_everything ON public.organizations
  FOR ALL 
  TO public, authenticated, anon
  USING (true) 
  WITH CHECK (true);

-- Verify the policy was created
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'organizations' AND schemaname = 'public';

-- Test that inserts work
INSERT INTO public.organizations (name, is_business) 
VALUES ('Test Org RLS Fix', false) 
RETURNING id, name;
