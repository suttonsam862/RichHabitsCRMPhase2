-- Initialize Work Order Status Lookup Table with Manufacturing Workflow Statuses
-- This migration creates and populates the status_work_orders table with the complete manufacturing workflow

-- Ensure the status_work_orders table exists (it should already be defined in schema)
-- The table structure is defined in shared/schema.ts but we'll initialize it here if needed

-- Insert manufacturing workflow statuses
INSERT INTO public.status_work_orders (code, sort_order, is_terminal) VALUES
  ('pending', 1, false),        -- Work order created but not yet scheduled
  ('queued', 2, false),         -- Scheduled but manufacturing not started  
  ('in_production', 3, false),  -- Currently being manufactured
  ('quality_check', 4, false),  -- In quality control phase
  ('rework', 5, false),         -- Needs to be reworked due to quality issues
  ('packaging', 6, false),      -- Quality passed, being packaged
  ('completed', 7, false),      -- Finished and ready to ship
  ('shipped', 8, true),         -- Shipped to customer (terminal)
  ('cancelled', 9, true),       -- Work order cancelled (terminal)
  ('on_hold', 10, false)        -- Temporarily paused
ON CONFLICT (code) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_terminal = EXCLUDED.is_terminal;

-- Create helper function to validate work order status transitions
CREATE OR REPLACE FUNCTION public.is_valid_work_order_transition(
  from_status text,
  to_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  valid_transitions jsonb;
BEGIN
  -- Define valid status transitions for manufacturing workflow
  valid_transitions := '{
    "pending": ["queued", "cancelled"],
    "queued": ["in_production", "on_hold", "cancelled"],
    "in_production": ["quality_check", "completed", "on_hold", "cancelled"],
    "quality_check": ["packaging", "rework", "completed", "on_hold"],
    "rework": ["quality_check", "in_production", "cancelled"],
    "packaging": ["completed", "shipped"],
    "completed": ["shipped"],
    "shipped": [],
    "cancelled": [],
    "on_hold": ["queued", "in_production", "cancelled"]
  }'::jsonb;
  
  -- Allow staying in same status
  IF from_status = to_status THEN
    RETURN true;
  END IF;
  
  -- Check if transition is valid
  RETURN (valid_transitions->from_status @> to_jsonb(to_status));
END;
$$;

-- Create helper function to get manufacturing workflow stage
CREATE OR REPLACE FUNCTION public.get_work_order_stage(status_code text) 
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN CASE status_code
    WHEN 'pending' THEN 'Planning'
    WHEN 'queued' THEN 'Planning'
    WHEN 'in_production' THEN 'Manufacturing'
    WHEN 'quality_check' THEN 'Quality Control'
    WHEN 'rework' THEN 'Quality Control'
    WHEN 'packaging' THEN 'Fulfillment'
    WHEN 'completed' THEN 'Fulfillment'
    WHEN 'shipped' THEN 'Complete'
    WHEN 'cancelled' THEN 'Cancelled'
    WHEN 'on_hold' THEN 'Paused'
    ELSE 'Unknown'
  END;
END;
$$;

-- Create helper function to calculate work order progress percentage
CREATE OR REPLACE FUNCTION public.get_work_order_progress(status_code text) 
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN CASE status_code
    WHEN 'pending' THEN 0
    WHEN 'queued' THEN 10
    WHEN 'in_production' THEN 50
    WHEN 'quality_check' THEN 80
    WHEN 'rework' THEN 70
    WHEN 'packaging' THEN 90
    WHEN 'completed' THEN 100
    WHEN 'shipped' THEN 100
    WHEN 'cancelled' THEN 0
    WHEN 'on_hold' THEN 0
    ELSE 0
  END;
END;
$$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_valid_work_order_transition(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_work_order_stage(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_work_order_progress(text) TO authenticated;

-- Comment on the functions for documentation
COMMENT ON FUNCTION public.is_valid_work_order_transition(text, text) IS 'Validates if a status transition is allowed in the manufacturing workflow';
COMMENT ON FUNCTION public.get_work_order_stage(text) IS 'Returns the workflow stage name for a given work order status';
COMMENT ON FUNCTION public.get_work_order_progress(text) IS 'Returns the progress percentage (0-100) for a given work order status';

-- Log the migration completion
-- Note: In a real production system, you might want to log this to a migrations table
SELECT 'Work order status initialization completed' AS migration_result;