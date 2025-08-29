
-- Add missing tertiary_color column to organizations table
-- This migration can be run multiple times safely

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tertiary_color TEXT;

-- Create index for performance if needed
CREATE INDEX IF NOT EXISTS idx_orgs_tertiary_color ON public.organizations (tertiary_color) WHERE tertiary_color IS NOT NULL;
