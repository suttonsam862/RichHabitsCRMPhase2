-- ========================================================================
-- 2025-09-19: Row-Level Security (RLS) Implementation for Order Tables
-- Task: ORD-2 - Implement Row-Level Security for Orders
-- 
-- This migration implements comprehensive RLS policies for order-related tables:
-- - orders, order_items, order_events, order_item_sizes
-- 
-- Security model:
-- 1. Organization members can access orders within their org
-- 2. Customer users can only access their own orders (customer_id match)
-- 3. Admins have additional privileges for delete operations
-- 4. All policies use existing helper functions for consistency
-- ========================================================================

-- Enable RLS on all order-related tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_sizes ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- ORDERS TABLE POLICIES
-- ========================================================================

-- DROP any existing policies to ensure clean state
DROP POLICY IF EXISTS orders_select ON public.orders;
DROP POLICY IF EXISTS orders_insert ON public.orders;
DROP POLICY IF EXISTS orders_update ON public.orders;
DROP POLICY IF EXISTS orders_delete ON public.orders;

-- SELECT: Organization members OR customers can see their own orders
CREATE POLICY orders_select ON public.orders
  FOR SELECT TO authenticated
  USING (
    -- Organization members can see orders in their org (using org_id as primary)
    public.is_org_member(auth.uid(), org_id::uuid)
    OR
    -- Customer users can see their own orders
    (customer_id = auth.uid())
  );

-- INSERT: Organization members can create orders for their org
CREATE POLICY orders_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be a member of the organization being inserted
    public.is_org_member(auth.uid(), org_id::uuid)
    AND
    -- If customer_id is set, user must either be org member or the customer themselves
    (customer_id IS NULL OR customer_id = auth.uid() OR public.is_org_member(auth.uid(), org_id::uuid))
  );

-- UPDATE: Organization members can update orders, customers can update their own
CREATE POLICY orders_update ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id::uuid)
    OR
    (customer_id = auth.uid())
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id::uuid)
    OR
    (customer_id = auth.uid())
  );

-- DELETE: Only organization admins can delete orders
CREATE POLICY orders_delete ON public.orders
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id::uuid)
  );

-- ========================================================================
-- ORDER_ITEMS TABLE POLICIES
-- ========================================================================

-- DROP any existing policies
DROP POLICY IF EXISTS order_items_select ON public.order_items;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_update ON public.order_items;
DROP POLICY IF EXISTS order_items_delete ON public.order_items;

-- SELECT: Organization members OR customers with access to the parent order
CREATE POLICY order_items_select ON public.order_items
  FOR SELECT TO authenticated
  USING (
    -- Organization members can see order items in their org
    public.is_org_member(auth.uid(), org_id::uuid)
    OR
    -- Customer users can see order items for their own orders
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_items.order_id 
      AND o.customer_id = auth.uid()
    )
  );

-- INSERT: Organization members can create order items for their org
CREATE POLICY order_items_insert ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be a member of the organization
    public.is_org_member(auth.uid(), org_id::uuid)
    AND
    -- The linked order must belong to the same organization
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_items.order_id 
      AND o.org_id = order_items.org_id
    )
  );

-- UPDATE: Organization members can update order items
CREATE POLICY order_items_update ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), org_id::uuid)
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), org_id::uuid)
  );

-- DELETE: Only organization admins can delete order items
CREATE POLICY order_items_delete ON public.order_items
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), org_id::uuid)
  );

-- ========================================================================
-- ORDER_EVENTS TABLE POLICIES
-- Note: order_events links to orders via order_id, inherits org access through orders
-- ========================================================================

-- DROP any existing policies
DROP POLICY IF EXISTS order_events_select ON public.order_events;
DROP POLICY IF EXISTS order_events_insert ON public.order_events;
DROP POLICY IF EXISTS order_events_update ON public.order_events;
DROP POLICY IF EXISTS order_events_delete ON public.order_events;

-- SELECT: Users who can see the parent order
CREATE POLICY order_events_select ON public.order_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_events.order_id 
      AND (
        -- Organization members can see events for orders in their org
        public.is_org_member(auth.uid(), o.org_id::uuid)
        OR
        -- Customers can see events for their own orders
        o.customer_id = auth.uid()
      )
    )
  );

-- INSERT: Organization members can create events for orders in their org
CREATE POLICY order_events_insert ON public.order_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_events.order_id 
      AND public.is_org_member(auth.uid(), o.org_id::uuid)
    )
  );

-- UPDATE: Organization members can update events (rare use case)
CREATE POLICY order_events_update ON public.order_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_events.order_id 
      AND public.is_org_member(auth.uid(), o.org_id::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_events.order_id 
      AND public.is_org_member(auth.uid(), o.org_id::uuid)
    )
  );

-- DELETE: Only organization admins can delete events
CREATE POLICY order_events_delete ON public.order_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_events.order_id 
      AND public.is_org_admin(auth.uid(), o.org_id::uuid)
    )
  );

-- ========================================================================
-- ORDER_ITEM_SIZES TABLE POLICIES
-- Note: order_item_sizes links to order_items via order_item_id, inherits access through order_items
-- ========================================================================

-- DROP any existing policies
DROP POLICY IF EXISTS order_item_sizes_select ON public.order_item_sizes;
DROP POLICY IF EXISTS order_item_sizes_insert ON public.order_item_sizes;
DROP POLICY IF EXISTS order_item_sizes_update ON public.order_item_sizes;
DROP POLICY IF EXISTS order_item_sizes_delete ON public.order_item_sizes;

-- SELECT: Users who can see the parent order item
CREATE POLICY order_item_sizes_select ON public.order_item_sizes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_sizes.order_item_id 
      AND (
        -- Organization members can see sizes for order items in their org
        public.is_org_member(auth.uid(), oi.org_id::uuid)
        OR
        -- Customers can see sizes for their own orders
        o.customer_id = auth.uid()
      )
    )
  );

-- INSERT: Organization members can create sizes for order items in their org
CREATE POLICY order_item_sizes_insert ON public.order_item_sizes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.id = order_item_sizes.order_item_id 
      AND public.is_org_member(auth.uid(), oi.org_id::uuid)
    )
  );

-- UPDATE: Organization members can update sizes
CREATE POLICY order_item_sizes_update ON public.order_item_sizes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.id = order_item_sizes.order_item_id 
      AND public.is_org_member(auth.uid(), oi.org_id::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.id = order_item_sizes.order_item_id 
      AND public.is_org_member(auth.uid(), oi.org_id::uuid)
    )
  );

-- DELETE: Only organization admins can delete sizes
CREATE POLICY order_item_sizes_delete ON public.order_item_sizes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.id = order_item_sizes.order_item_id 
      AND public.is_org_admin(auth.uid(), oi.org_id::uuid)
    )
  );

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify RLS is enabled on all tables
DO $$ 
DECLARE
    _table_name TEXT;
    _rls_enabled BOOLEAN;
BEGIN
    FOR _table_name IN SELECT unnest(ARRAY['orders', 'order_items', 'order_events', 'order_item_sizes']) LOOP
        SELECT INTO _rls_enabled
            rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = _table_name;
        
        IF NOT _rls_enabled THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', _table_name;
        END IF;
        
        RAISE NOTICE 'RLS enabled on table: %', _table_name;
    END LOOP;
    
    RAISE NOTICE 'All order-related tables now have RLS enabled successfully!';
END $$;

-- List all policies created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('orders', 'order_items', 'order_events', 'order_item_sizes')
ORDER BY tablename, cmd;