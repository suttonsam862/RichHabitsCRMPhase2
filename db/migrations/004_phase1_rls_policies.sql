-- Phase 1 RLS-1: Drop permissive policies and add membership-based policies for tenant isolation

-- First, ensure RLS is enabled on all critical tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper functions for membership and role checks
CREATE OR REPLACE FUNCTION public.is_org_member(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.user_id = $1
      AND m.organization_id = $2
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.user_id = $1
      AND m.organization_id = $2
      AND m.role IN ('admin', 'owner')
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships m
    WHERE m.user_id = $1
      AND m.organization_id = $2
      AND m.role = 'owner'
      AND m.is_active = true
  );
$$;

-- ===================================
-- ORGANIZATIONS TABLE POLICIES
-- ===================================

-- Drop any existing permissive policies
DROP POLICY IF EXISTS org_full_access ON public.organizations;
DROP POLICY IF EXISTS organizations_all ON public.organizations;

-- SELECT: Only members can see their organizations
CREATE POLICY org_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), id)
  );

-- INSERT: Authenticated users can create organizations (they become owner)
CREATE POLICY org_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: Only admins and owners can update
CREATE POLICY org_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id))
  WITH CHECK (public.is_org_admin(auth.uid(), id));

-- DELETE: Only owners can delete
CREATE POLICY org_delete ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_org_owner(auth.uid(), id));

-- ===================================
-- ORGANIZATION_MEMBERSHIPS TABLE POLICIES
-- ===================================

-- SELECT: Users can see memberships for orgs they belong to
CREATE POLICY membership_select ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
  );

-- INSERT: Only org admins can add new members
CREATE POLICY membership_insert ON public.organization_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
  );

-- UPDATE: Only org admins can update memberships
CREATE POLICY membership_update ON public.organization_memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- DELETE: Only org admins can remove members
CREATE POLICY membership_delete ON public.organization_memberships
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- ===================================
-- ORDERS TABLE POLICIES
-- ===================================

-- SELECT: Members can see orders for their organization
CREATE POLICY orders_select ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id)
  );

-- INSERT: Members can create orders
CREATE POLICY orders_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id)
  );

-- UPDATE: Members can update orders
CREATE POLICY orders_update ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- DELETE: Only admins can delete orders
CREATE POLICY orders_delete ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- ===================================
-- CUSTOMERS TABLE POLICIES
-- ===================================

-- SELECT: Members can see customers for their organization
CREATE POLICY customers_select ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id)
  );

-- INSERT: Members can create customers
CREATE POLICY customers_insert ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id)
  );

-- UPDATE: Members can update customers
CREATE POLICY customers_update ON public.customers
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- DELETE: Only admins can delete customers
CREATE POLICY customers_delete ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- ===================================
-- CATALOG_ITEMS TABLE POLICIES
-- ===================================

-- SELECT: Members can see catalog items for their organization
CREATE POLICY catalog_select ON public.catalog_items
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id)
  );

-- INSERT: Members with appropriate role can create catalog items
CREATE POLICY catalog_insert ON public.catalog_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id)
  );

-- UPDATE: Members with appropriate role can update catalog items
CREATE POLICY catalog_update ON public.catalog_items
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- DELETE: Only admins can delete catalog items
CREATE POLICY catalog_delete ON public.catalog_items
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- ===================================
-- ORG_SPORTS TABLE POLICIES
-- ===================================

-- SELECT: Members can see org sports
CREATE POLICY org_sports_select ON public.org_sports
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id)
  );

-- INSERT: Only admins can add sports
CREATE POLICY org_sports_insert ON public.org_sports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), org_id)
  );

-- UPDATE: Only admins can update sports
CREATE POLICY org_sports_update ON public.org_sports
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

-- DELETE: Only admins can delete sports
CREATE POLICY org_sports_delete ON public.org_sports
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- ===================================
-- USER_ROLES TABLE POLICIES (for legacy compatibility)
-- ===================================

-- SELECT: Users can see their own roles
CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
  );

-- INSERT: Only system admins can insert (handled by service role)
-- No INSERT policy for authenticated users

-- UPDATE: Only system admins can update (handled by service role)
-- No UPDATE policy for authenticated users

-- DELETE: Only system admins can delete (handled by service role)
-- No DELETE policy for authenticated users

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_org 
  ON public.organization_memberships(user_id, organization_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_org_memberships_org 
  ON public.organization_memberships(organization_id) 
  WHERE is_active = true;

-- Audit log for this migration
INSERT INTO public.audit_logs (action, actor, metadata, success)
VALUES (
  'RLS_POLICIES_APPLIED',
  'migration',
  jsonb_build_object(
    'phase', '1',
    'tables', ARRAY['organizations', 'organization_memberships', 'orders', 'customers', 'catalog_items', 'org_sports', 'user_roles'],
    'timestamp', NOW()
  ),
  true
);