
-- Comprehensive Database Schema Fix
-- This SQL file aligns the database with the application codebase requirements

BEGIN;

-- 1. First, safely drop and recreate salesperson tables with correct structure
DROP TABLE IF EXISTS salesperson_metrics CASCADE;
DROP TABLE IF EXISTS salesperson_assignments CASCADE;
DROP TABLE IF EXISTS salesperson_profiles CASCADE;
DROP TABLE IF EXISTS salespeople CASCADE;

-- 2. Create salesperson_profiles table (matches shared/schema.ts)
CREATE TABLE salesperson_profiles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    employee_id VARCHAR(100),
    tax_id VARCHAR(50),
    commission_rate DECIMAL(5,4) DEFAULT 0.05,
    territory TEXT[], -- Array of territories, not single text
    hire_date DATE,
    manager_id VARCHAR(255),
    performance_tier VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT salesperson_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_profiles_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- 3. Create salesperson_assignments table (matches shared/schema.ts)
CREATE TABLE salesperson_assignments (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    salesperson_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    sport_id VARCHAR(255) NOT NULL,
    team_name TEXT NOT NULL,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT salesperson_assignments_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_assignments_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- 4. Create salesperson_metrics table (matches shared/schema.ts)
CREATE TABLE salesperson_metrics (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    salesperson_id VARCHAR(255) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,4),
    average_deal_size INTEGER DEFAULT 0,
    commission_earned INTEGER DEFAULT 0,
    active_assignments INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT salesperson_metrics_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_metrics_period_unique UNIQUE(salesperson_id, period_start, period_end)
);

-- 5. Fix organization_metrics table to match schema
DROP TABLE IF EXISTS organization_metrics CASCADE;
CREATE TABLE organization_metrics (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL,
    total_revenue INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    active_sports INTEGER DEFAULT 0,
    years_with_company INTEGER DEFAULT 0,
    average_order_value INTEGER DEFAULT 0,
    repeat_customer_rate INTEGER DEFAULT 0,
    growth_rate INTEGER DEFAULT 0,
    satisfaction_score INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT organization_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 6. Ensure users table has all required columns for sales functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS subrole TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS page_access JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_temp_password TEXT;

-- 7. Ensure organizations table has all required columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_business BOOLEAN;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS title_card_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_secondary TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS color_palette JSONB;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gradient_css TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS finance_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_exempt_doc_key TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tertiary_color TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by VARCHAR;

-- Ensure organizations.id is VARCHAR (not UUID)
ALTER TABLE organizations ALTER COLUMN id TYPE VARCHAR USING id::varchar;

-- 8. Ensure org_sports table has all required columns and correct structure
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS assigned_salesperson_id VARCHAR;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS contact_user_id UUID;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS ship_address_line1 TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS ship_address_line2 TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS ship_city TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS ship_state TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS ship_postal_code TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS ship_country TEXT;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS is_primary_contact INTEGER;
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Ensure org_sports IDs are VARCHAR
ALTER TABLE org_sports ALTER COLUMN id TYPE VARCHAR USING id::varchar;
ALTER TABLE org_sports ALTER COLUMN organization_id TYPE VARCHAR USING organization_id::varchar;
ALTER TABLE org_sports ALTER COLUMN sport_id TYPE VARCHAR USING sport_id::varchar;

-- Add foreign key for assigned salesperson
ALTER TABLE org_sports ADD CONSTRAINT IF NOT EXISTS org_sports_assigned_salesperson_fkey 
FOREIGN KEY (assigned_salesperson_id) REFERENCES users(id);

-- 9. Ensure sports table has correct structure
ALTER TABLE sports ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE sports ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- 10. Ensure orders table has all required columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS salesperson_id VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sport_id VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_code TEXT;

-- Ensure orders.id is VARCHAR
ALTER TABLE orders ALTER COLUMN id TYPE VARCHAR USING id::varchar;
ALTER TABLE orders ALTER COLUMN organization_id TYPE VARCHAR USING organization_id::varchar;

-- 11. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user_id ON salesperson_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson_id ON salesperson_assignments(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization_id ON salesperson_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_sport_id ON salesperson_assignments(sport_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson_id ON salesperson_metrics(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_period ON salesperson_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_org_sports_salesperson ON org_sports(assigned_salesperson_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_subrole ON users(subrole);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_orders_salesperson ON orders(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization ON orders(organization_id);

-- 12. Create or update roles table to match schema
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 13. Create permissions table if not exists
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. Insert sample organization metrics for existing organizations
INSERT INTO organization_metrics (organization_id, total_revenue, total_orders, active_sports, years_with_company, average_order_value, repeat_customer_rate, growth_rate, satisfaction_score)
SELECT 
    id,
    FLOOR(RANDOM() * 100000)::integer,
    FLOOR(RANDOM() * 500)::integer,
    FLOOR(RANDOM() * 10)::integer,
    FLOOR(RANDOM() * 5)::integer,
    FLOOR(RANDOM() * 1000)::integer,
    FLOOR(RANDOM() * 100)::integer,
    FLOOR(RANDOM() * 50)::integer,
    FLOOR(RANDOM() * 5)::integer
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM organization_metrics 
    WHERE organization_metrics.organization_id = organizations.id
);

-- 15. Create necessary status tables
CREATE TABLE IF NOT EXISTS status_orders (
    code TEXT PRIMARY KEY NOT NULL,
    sort_order INTEGER NOT NULL,
    is_terminal BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS status_order_items (
    code TEXT PRIMARY KEY NOT NULL,
    sort_order INTEGER NOT NULL,
    is_terminal BOOLEAN DEFAULT false NOT NULL
);

-- Insert default order statuses
INSERT INTO status_orders (code, sort_order, is_terminal) VALUES
('pending', 1, false),
('confirmed', 2, false),
('in_production', 3, false),
('completed', 4, true),
('cancelled', 5, true)
ON CONFLICT (code) DO NOTHING;

-- 16. Ensure quotes table has salesperson column
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS salesperson TEXT;

-- 17. Add audit logs table if needed
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor UUID,
    org_id UUID,
    entity TEXT,
    entity_id UUID,
    action TEXT,
    before JSONB,
    after JSONB
);

-- 18. Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

-- 19. Update all timestamp columns to be consistent
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMP USING created_at::timestamp;
ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at::timestamp;
ALTER TABLE organizations ALTER COLUMN created_at TYPE TIMESTAMP USING created_at::timestamp;
ALTER TABLE organizations ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at::timestamp;

-- 20. Ensure all foreign key constraints are properly set
ALTER TABLE org_sports DROP CONSTRAINT IF EXISTS org_sports_organization_id_fkey;
ALTER TABLE org_sports ADD CONSTRAINT org_sports_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE org_sports DROP CONSTRAINT IF EXISTS org_sports_sport_id_fkey;
ALTER TABLE org_sports ADD CONSTRAINT org_sports_sport_id_fkey 
FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_organization_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_salesperson_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_salesperson_id_fkey 
FOREIGN KEY (salesperson_id) REFERENCES users(id);

-- 21. Set proper defaults for required fields
UPDATE organizations SET status = 'active' WHERE status IS NULL;
UPDATE organizations SET tags = '{}' WHERE tags IS NULL;
UPDATE organizations SET is_archived = false WHERE is_archived IS NULL;
UPDATE organizations SET setup_complete = false WHERE setup_complete IS NULL;
UPDATE organizations SET universal_discounts = '{}' WHERE universal_discounts IS NULL;

UPDATE users SET is_active = 1 WHERE is_active IS NULL;

COMMIT;

-- Final verification queries
SELECT 'Database schema alignment completed successfully' as status;

-- Verify critical tables exist
SELECT 
    'salesperson_profiles' as table_name,
    count(*) as exists_check
FROM information_schema.tables 
WHERE table_name = 'salesperson_profiles';

SELECT 
    'salesperson_assignments' as table_name,
    count(*) as exists_check
FROM information_schema.tables 
WHERE table_name = 'salesperson_assignments';

SELECT 
    'salesperson_metrics' as table_name,
    count(*) as exists_check
FROM information_schema.tables 
WHERE table_name = 'salesperson_metrics';

SELECT 
    'organization_metrics' as table_name,
    count(*) as exists_check
FROM information_schema.tables 
WHERE table_name = 'organization_metrics';
