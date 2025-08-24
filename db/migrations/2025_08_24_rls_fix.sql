
-- Fix RLS policies for organization creation
-- This migration removes dependency on Supabase auth.uid() and creates permissive policies for development

-- Drop existing problematic policies
DROP POLICY IF EXISTS org_allow_all ON public.organizations;
DROP POLICY IF EXISTS organizations_insert ON public.organizations;
DROP POLICY IF EXISTS org_select ON public.organizations;
DROP POLICY IF EXISTS organizations_update ON public.organizations;
DROP POLICY IF EXISTS organizations_delete ON public.organizations;

-- Create permissive policies that work with standard PostgreSQL
-- Note: These are development-friendly policies. In production, you'd want to tighten these based on your auth system

-- Allow all operations for now (can be restricted later when proper auth is implemented)
CREATE POLICY org_full_access ON public.organizations
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Update the org_can_insert function to work without auth.uid()
CREATE OR REPLACE FUNCTION public.org_can_insert()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT true;
$$;

-- Update handle_org_insert to work without auth.uid()
CREATE OR REPLACE FUNCTION public.handle_org_insert()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE 
  admin_role_id uuid;
BEGIN
  -- For now, just return NEW since we don't have auth.uid()
  -- This can be enhanced once proper authentication is integrated
  
  -- Find admin role for future use
  SELECT id INTO admin_role_id 
  FROM public.roles 
  WHERE slug = 'admin'
  LIMIT 1;
  
  -- Future enhancement: auto-assign admin role to creator when auth is available
  -- IF auth_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
  --   INSERT INTO public.user_roles (user_id, org_id, role_id)
  --   VALUES (auth_user_id, NEW.id, admin_role_id)
  --   ON CONFLICT (user_id, org_id, role_id) DO NOTHING;
  -- END IF;
  
  RETURN NEW;
END$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trg_org_after_insert_admin ON public.organizations;
CREATE TRIGGER trg_org_after_insert_admin
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_org_insert();
