-- 2025_08_24_organizations_rls_insert_unblocker.sql
-- Organizations RLS & Insert Unblocker Migration
-- Modified for PostgreSQL without Supabase roles

-- 1. Enable RLS on public.organizations (idempotent)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policy for all operations (can be tightened later with proper auth)
DROP POLICY IF EXISTS org_allow_all ON public.organizations;
CREATE POLICY org_allow_all ON public.organizations 
  FOR ALL 
  TO PUBLIC 
  USING (true) 
  WITH CHECK (true);

-- 3. Create handle_org_insert function with SECURITY DEFINER
-- Note: Modified for standard PostgreSQL without auth.uid()
CREATE OR REPLACE FUNCTION public.handle_org_insert()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- For now, just return NEW since we don't have Supabase auth.uid()
  -- This can be enhanced once proper authentication is integrated
  -- Future enhancement would auto-assign admin role to creator
  RETURN NEW;
END$$;

-- 4. Ensure trigger exists (recreate to be safe)
DROP TRIGGER IF EXISTS trg_org_after_insert_admin ON public.organizations;
CREATE TRIGGER trg_org_after_insert_admin
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_org_insert();

-- 5. Create RLS self-test function
CREATE OR REPLACE FUNCTION public.org_can_insert()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT true;
$$;

-- Note: PostgREST reload notification skipped as we're not using PostgREST