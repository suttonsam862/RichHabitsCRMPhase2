-- ========================================================================
-- 2025-09-19: Row-Level Security (RLS) Implementation for Production Tables
-- Task: ORD-7 - Critical security fix for production_events and production_milestones
-- 
-- This migration implements comprehensive RLS policies for manufacturing tables:
-- - production_events, production_milestones
-- 
-- Security model:
-- 1. Organization members can access production data within their org
-- 2. Events and milestones inherit org access through work orders
-- 3. Admins have additional privileges for delete operations
-- 4. All policies use existing helper functions for consistency
-- ========================================================================

-- Enable RLS on manufacturing production tables
ALTER TABLE public.production_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_milestones ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- PRODUCTION_EVENTS TABLE POLICIES
-- Note: production_events links to manufacturing_work_orders via work_order_id
-- ========================================================================

-- DROP any existing policies to ensure clean state
DROP POLICY IF EXISTS production_events_select ON public.production_events;
DROP POLICY IF EXISTS production_events_insert ON public.production_events;
DROP POLICY IF EXISTS production_events_update ON public.production_events;
DROP POLICY IF EXISTS production_events_delete ON public.production_events;

-- SELECT: Organization members can see production events for work orders in their org
CREATE POLICY production_events_select ON public.production_events
  FOR SELECT TO authenticated
  USING (
    -- Organization members can see events for work orders in their org
    public.is_org_member(auth.uid(), org_id::uuid)
    OR
    -- Alternative check through work order relationship (redundant but safer)
    EXISTS (
      SELECT 1 FROM public.manufacturing_work_orders w 
      WHERE w.id = production_events.work_order_id 
      AND public.is_org_member(auth.uid(), w.org_id::uuid)
    )
  );

-- INSERT: Organization members can create production events for work orders in their org
CREATE POLICY production_events_insert ON public.production_events
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be a member of the organization
    public.is_org_member(auth.uid(), org_id::uuid)
    AND
    -- The linked work order must belong to the same organization
    EXISTS (
      SELECT 1 FROM public.manufacturing_work_orders w 
      WHERE w.id = production_events.work_order_id 
      AND w.org_id = production_events.org_id
    )
  );

-- UPDATE: Organization members can update production events (rare use case)
CREATE POLICY production_events_update ON public.production_events
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id::uuid)
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id::uuid)
  );

-- DELETE: Only organization admins can delete production events
CREATE POLICY production_events_delete ON public.production_events
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id::uuid)
  );

-- ========================================================================
-- PRODUCTION_MILESTONES TABLE POLICIES
-- Note: production_milestones links to manufacturing_work_orders via work_order_id
-- ========================================================================

-- DROP any existing policies
DROP POLICY IF EXISTS production_milestones_select ON public.production_milestones;
DROP POLICY IF EXISTS production_milestones_insert ON public.production_milestones;
DROP POLICY IF EXISTS production_milestones_update ON public.production_milestones;
DROP POLICY IF EXISTS production_milestones_delete ON public.production_milestones;

-- SELECT: Organization members can see production milestones for work orders in their org
CREATE POLICY production_milestones_select ON public.production_milestones
  FOR SELECT TO authenticated
  USING (
    -- Organization members can see milestones for work orders in their org
    public.is_org_member(auth.uid(), org_id::uuid)
    OR
    -- Alternative check through work order relationship (redundant but safer)
    EXISTS (
      SELECT 1 FROM public.manufacturing_work_orders w 
      WHERE w.id = production_milestones.work_order_id 
      AND public.is_org_member(auth.uid(), w.org_id::uuid)
    )
  );

-- INSERT: Organization members can create production milestones for work orders in their org
CREATE POLICY production_milestones_insert ON public.production_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be a member of the organization
    public.is_org_member(auth.uid(), org_id::uuid)
    AND
    -- The linked work order must belong to the same organization
    EXISTS (
      SELECT 1 FROM public.manufacturing_work_orders w 
      WHERE w.id = production_milestones.work_order_id 
      AND w.org_id = production_milestones.org_id
    )
  );

-- UPDATE: Organization members can update milestones (common for marking complete, adding notes)
CREATE POLICY production_milestones_update ON public.production_milestones
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id::uuid)
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id::uuid)
  );

-- DELETE: Only organization admins can delete production milestones
CREATE POLICY production_milestones_delete ON public.production_milestones
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id::uuid)
  );

-- ========================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================================================

-- Index for production_events org_id lookups (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_production_events_org_id 
  ON public.production_events(org_id);

-- Index for production_milestones org_id lookups (critical for RLS performance)  
CREATE INDEX IF NOT EXISTS idx_production_milestones_org_id 
  ON public.production_milestones(org_id);

-- Compound index for work_order_id + org_id joins (optimization for policy checks)
CREATE INDEX IF NOT EXISTS idx_production_events_work_order_org 
  ON public.production_events(work_order_id, org_id);

CREATE INDEX IF NOT EXISTS idx_production_milestones_work_order_org 
  ON public.production_milestones(work_order_id, org_id);

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify RLS is enabled on all tables
DO $$ 
DECLARE
    _table_name TEXT;
    _rls_enabled BOOLEAN;
BEGIN
    FOR _table_name IN SELECT unnest(ARRAY['production_events', 'production_milestones']) LOOP
        SELECT INTO _rls_enabled
            rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = _table_name;
        
        IF NOT _rls_enabled THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', _table_name;
        END IF;
        
        RAISE NOTICE 'RLS enabled on table: %', _table_name;
    END LOOP;
    
    RAISE NOTICE 'All production-related tables now have RLS enabled successfully!';
END $$;

-- List all policies created for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as policy_type,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read access'
        WHEN cmd = 'INSERT' THEN 'Create access' 
        WHEN cmd = 'UPDATE' THEN 'Modify access'
        WHEN cmd = 'DELETE' THEN 'Delete access (admin only)'
        ELSE cmd
    END as description
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('production_events', 'production_milestones')
ORDER BY tablename, cmd;

-- Verify critical indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('production_events', 'production_milestones')
    AND indexname LIKE 'idx_%org%'
ORDER BY tablename, indexname;

RAISE NOTICE 'CRITICAL SECURITY FIX COMPLETED: production_events and production_milestones now have proper RLS policies and org_id based tenancy enforcement!';