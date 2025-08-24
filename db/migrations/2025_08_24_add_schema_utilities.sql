
-- Add utility functions for schema cache management
-- This migration is idempotent and safe to run multiple times

-- Function to reload PostgREST schema cache
CREATE OR REPLACE FUNCTION public.notify_schema_reload()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_notify('pgrst', 'reload schema');
$$;

-- Function to get table column information
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = $1
  ORDER BY ordinal_position;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.notify_schema_reload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.notify_schema_reload() IS 'Utility function to reload PostgREST schema cache';
COMMENT ON FUNCTION public.get_table_columns(text) IS 'Utility function to get table column information for diagnostics';
