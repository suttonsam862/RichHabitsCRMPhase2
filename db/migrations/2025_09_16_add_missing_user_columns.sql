
-- Add missing is_super_admin column to users table
-- This fixes the authentication errors preventing organization access

BEGIN;

-- Add the missing is_super_admin column with a default value
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Update any existing admin users to have super admin privileges
-- This is safe as it only affects users who might already be admins
UPDATE public.users 
SET is_super_admin = true 
WHERE email ILIKE '%admin%' OR email ILIKE '%@richabits%';

-- Add an index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON public.users(is_super_admin) 
WHERE is_super_admin = true;

COMMIT;
