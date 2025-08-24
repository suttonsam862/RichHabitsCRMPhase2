-- OrgSports Column + RLS + Cache Reload + Handler Hardening Patch (FIXED)
-- Idempotent migration to fix schema cache issues permanently

-- =============================================================================
-- PART A: Add missing columns to org_sports table
-- =============================================================================

ALTER TABLE public.org_sports
  ADD COLUMN IF NOT EXISTS contact_user_id varchar NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================================================  
-- PART B: Ensure org table extras exist (safety check)
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS color_palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gradient_css  text,
  ADD COLUMN IF NOT EXISTS tags          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_archived   boolean NOT NULL DEFAULT false;

-- =============================================================================
-- PART C: Create missing helper functions
-- =============================================================================

-- Helper function for org admin check
CREATE OR REPLACE FUNCTION public.is_org_admin(user_id_param varchar, org_id_param varchar)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id_param 
      AND ur.org_id = org_id_param
      AND r.slug = 'admin'
  );
$$;

-- =============================================================================
-- PART D: RLS for org_sports (idempotent setup with fixed types)
-- =============================================================================

-- Enable RLS on org_sports
ALTER TABLE public.org_sports ENABLE ROW LEVEL SECURITY;

-- INSERT Policy: any authenticated member of the org may insert
DROP POLICY IF EXISTS org_sports_insert ON public.org_sports;
CREATE POLICY org_sports_insert
ON public.org_sports FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id::varchar = (auth.uid())::varchar
      AND ur.org_id = org_sports.organization_id
  )
);

-- SELECT Policy: org members only
DROP POLICY IF EXISTS org_sports_select ON public.org_sports;
CREATE POLICY org_sports_select
ON public.org_sports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id::varchar = (auth.uid())::varchar
      AND ur.org_id = org_sports.organization_id
  )
);

-- UPDATE Policy: admins of that org only
DROP POLICY IF EXISTS org_sports_update ON public.org_sports;
CREATE POLICY org_sports_update
ON public.org_sports FOR UPDATE TO authenticated
USING (public.is_org_admin((auth.uid())::varchar, org_sports.organization_id))
WITH CHECK (public.is_org_admin((auth.uid())::varchar, org_sports.organization_id));

-- DELETE Policy: admins of that org only
DROP POLICY IF EXISTS org_sports_delete ON public.org_sports;
CREATE POLICY org_sports_delete
ON public.org_sports FOR DELETE TO authenticated
USING (public.is_org_admin((auth.uid())::varchar, org_sports.organization_id));

-- =============================================================================
-- PART E: PostgREST schema reload RPC and immediate call
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pgrst_reload()
RETURNS void LANGUAGE sql AS $$ 
  SELECT pg_notify('pgrst','reload schema'); 
$$;

-- Force immediate schema reload
SELECT public.pgrst_reload();

-- =============================================================================
-- PART F: RLS self-tests RPC (Boolean probes) for future checks (FIXED)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.org_can_insert() 
RETURNS boolean
LANGUAGE sql SECURITY INVOKER AS $$ 
  SELECT (auth.uid()) IS NOT NULL; 
$$;

CREATE OR REPLACE FUNCTION public.org_sports_can_insert(p_org varchar) 
RETURNS boolean
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id::varchar = (auth.uid())::varchar AND org_id = p_org
  );
$$;

-- =============================================================================
-- VERIFICATION QUERIES (for debugging)
-- =============================================================================

-- Check if contact_user_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'org_sports' 
  AND column_name = 'contact_user_id';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'org_sports';

-- Final schema reload to ensure everything is cached
SELECT public.pgrst_reload();

-- Migration completed successfully
SELECT 'OrgSports RLS Hardening Migration Completed Successfully' as status;