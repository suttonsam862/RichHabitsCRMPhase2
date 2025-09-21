-- RLS Policy Preview for Supabase Service Layer
-- DO NOT APPLY - This is for review only
-- These policies enforce auth-aware access using Row Level Security

-- =======================
-- ORGANIZATIONS POLICIES
-- =======================

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only access organizations they are members of
CREATE POLICY "organizations_select_policy" ON organizations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = organizations.id
    AND user_roles.is_active = true
  )
);

-- Organizations: Only admins can create new organizations
CREATE POLICY "organizations_insert_policy" ON organizations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.role_name IN ('admin', 'owner')
    AND user_roles.is_active = true
  )
);

-- Organizations: Only admins/owners can update organizations
CREATE POLICY "organizations_update_policy" ON organizations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = organizations.id
    AND user_roles.role_name IN ('admin', 'owner')
    AND user_roles.is_active = true
  )
);

-- =======================
-- ORDERS POLICIES
-- =======================

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Orders: Users can only see orders for their organizations
CREATE POLICY "orders_select_policy" ON orders
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = orders.org_id
    AND user_roles.is_active = true
  )
);

-- Orders: Users with sales/admin roles can create orders
CREATE POLICY "orders_insert_policy" ON orders
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = orders.org_id
    AND user_roles.role_name IN ('admin', 'sales', 'manager')
    AND user_roles.is_active = true
  )
);

-- Orders: Users with appropriate roles can update orders
CREATE POLICY "orders_update_policy" ON orders
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = orders.org_id
    AND user_roles.role_name IN ('admin', 'sales', 'manager')
    AND user_roles.is_active = true
  )
);

-- =======================
-- ORDER ITEMS POLICIES
-- =======================

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Order Items: Inherit access from parent order
CREATE POLICY "order_items_select_policy" ON order_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    JOIN user_roles ON user_roles.org_id = orders.org_id
    WHERE orders.id = order_items.order_id
    AND user_roles.user_id = auth.uid()::text 
    AND user_roles.is_active = true
  )
);

-- Order Items: Users with sales/admin roles can create order items
CREATE POLICY "order_items_insert_policy" ON order_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    JOIN user_roles ON user_roles.org_id = orders.org_id
    WHERE orders.id = order_items.order_id
    AND user_roles.user_id = auth.uid()::text 
    AND user_roles.role_name IN ('admin', 'sales', 'manager')
    AND user_roles.is_active = true
  )
);

-- Order Items: Users with appropriate roles can update order items
CREATE POLICY "order_items_update_policy" ON order_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    JOIN user_roles ON user_roles.org_id = orders.org_id
    WHERE orders.id = order_items.order_id
    AND user_roles.user_id = auth.uid()::text 
    AND user_roles.role_name IN ('admin', 'sales', 'manager')
    AND user_roles.is_active = true
  )
);

-- =======================
-- DESIGN JOBS POLICIES
-- =======================

-- Enable RLS on design_jobs table
ALTER TABLE design_jobs ENABLE ROW LEVEL SECURITY;

-- Design Jobs: Users can see design jobs for their organizations
CREATE POLICY "design_jobs_select_policy" ON design_jobs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = design_jobs.org_id
    AND user_roles.is_active = true
  )
);

-- Design Jobs: Admins and designers can create design jobs
CREATE POLICY "design_jobs_insert_policy" ON design_jobs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = design_jobs.org_id
    AND user_roles.role_name IN ('admin', 'designer', 'manager')
    AND user_roles.is_active = true
  )
);

-- Design Jobs: Designers can update their assigned jobs, admins can update any
CREATE POLICY "design_jobs_update_policy" ON design_jobs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid()::text 
    AND user_roles.org_id = design_jobs.org_id
    AND user_roles.is_active = true
    AND (
      user_roles.role_name IN ('admin', 'manager')
      OR (
        user_roles.role_name = 'designer' 
        AND design_jobs.assignee_designer_id = auth.uid()::uuid
      )
    )
  )
);

-- =======================
-- ADDITIONAL SECURITY NOTES
-- =======================

/*
IMPORTANT: These policies assume:

1. User authentication via Supabase Auth (auth.uid())
2. user_roles table exists with columns: user_id, org_id, role_name, is_active
3. Proper org_id relationships in all tables
4. UUID vs TEXT ID handling at application layer (see server/lib/id.ts)

NEXT STEPS (after review):
1. Apply policies using supabase CLI or dashboard
2. Test with different user roles
3. Add additional policies for other tables as needed
4. Monitor performance with indexes on org_id, user_id
*/