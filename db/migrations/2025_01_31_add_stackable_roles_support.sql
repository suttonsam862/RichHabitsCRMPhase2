
-- Migration to support stackable roles (sales, designer, manufacturer as subroles)
-- This allows admin/staff users to have additional specialized access

-- Ensure subrole column exists in users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subrole') THEN
        ALTER TABLE users ADD COLUMN subrole TEXT;
    END IF;
END $$;

-- Update any existing sales-only users to have sales as primary role
UPDATE users 
SET role = 'sales' 
WHERE role = 'sales' AND subrole IS NULL;

-- Create index for performance on subrole queries
CREATE INDEX IF NOT EXISTS idx_users_subrole ON users(subrole) WHERE subrole IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_subrole ON users(role, subrole);

-- Add constraint to ensure valid subrole values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'users' AND constraint_name = 'users_subrole_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_subrole_check 
        CHECK (subrole IS NULL OR subrole IN ('salesperson', 'designer', 'manufacturer'));
    END IF;
END $$;

-- Add constraint to ensure valid role values including new staff role
DO $$ 
BEGIN
    -- Drop existing role constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'users' AND constraint_name = 'users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    
    -- Add updated role constraint
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'staff', 'sales', 'designer', 'manufacturing', 'customer'));
END $$;

-- Update existing admin users who should be staff
UPDATE users 
SET role = 'staff' 
WHERE role = 'admin' AND email NOT LIKE '%@rich-habits.com';

-- Ensure primary admin exists
INSERT INTO users (id, email, full_name, role, organization_id, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@rich-habits.com',
    'System Administrator',
    'admin',
    'global',
    1,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    is_active = 1;
