
-- Final comprehensive salesperson tables creation
-- This script ensures all tables exist and work with the sales dashboard
-- Run with: psql $DATABASE_URL -f fix_salesperson_tables_final.sql

BEGIN;

-- First check if we have the required parent tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE EXCEPTION 'users table does not exist - cannot create salesperson tables';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        RAISE EXCEPTION 'organizations table does not exist - cannot create salesperson tables';
    END IF;
    
    RAISE NOTICE 'Parent tables verified - proceeding with salesperson table creation';
END $$;

-- Drop existing tables in correct order to avoid FK constraint issues
DROP TABLE IF EXISTS public.salesperson_metrics CASCADE;
DROP TABLE IF EXISTS public.salesperson_assignments CASCADE; 
DROP TABLE IF EXISTS public.salesperson_profiles CASCADE;

-- Create salesperson_profiles table
CREATE TABLE public.salesperson_profiles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    employee_id VARCHAR(100),
    tax_id VARCHAR(50),
    commission_rate DECIMAL(5,4) DEFAULT 0.05,
    territory VARCHAR(255),
    hire_date DATE,
    manager_id VARCHAR(255),
    performance_tier VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT salesperson_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_profiles_manager_id_fkey 
        FOREIGN KEY (manager_id) REFERENCES public.users(id)
);

-- Create salesperson_assignments table
CREATE TABLE public.salesperson_assignments (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    salesperson_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    territory VARCHAR(255),
    commission_rate DECIMAL(5,4) DEFAULT 0.05,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT salesperson_assignments_salesperson_id_fkey 
        FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_assignments_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_assignments_assigned_by_fkey 
        FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);

-- Create salesperson_metrics table
CREATE TABLE public.salesperson_metrics (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    salesperson_id VARCHAR(255) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    commission_earned DECIMAL(12,2) DEFAULT 0,
    target_sales DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT salesperson_metrics_salesperson_id_fkey 
        FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT salesperson_metrics_unique_period 
        UNIQUE(salesperson_id, period_start, period_end)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user_id ON public.salesperson_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_active ON public.salesperson_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson ON public.salesperson_assignments(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization ON public.salesperson_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_active ON public.salesperson_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson ON public.salesperson_metrics(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_period ON public.salesperson_metrics(period_start, period_end);

-- Ensure users table has required columns for salespeople
DO $$ 
BEGIN
    -- Check if users.is_active is integer (0/1) or boolean
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'is_active' AND data_type = 'integer') THEN
        -- Insert sample salesperson user (integer version)
        INSERT INTO public.users (id, email, full_name, role, organization_id, is_active, created_at, updated_at)
        VALUES ('sample-sales-001', 'john.sales@example.com', 'John Sales', 'sales', 'global', 1, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    ELSE
        -- Insert sample salesperson user (boolean version)
        INSERT INTO public.users (id, email, full_name, role, organization_id, is_active, created_at, updated_at)
        VALUES ('sample-sales-001', 'john.sales@example.com', 'John Sales', 'sales', 'global', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Sample salesperson user created/verified';
END $$;

-- Insert sample salesperson profile
INSERT INTO public.salesperson_profiles (id, user_id, employee_id, commission_rate, territory, hire_date, performance_tier, is_active)
VALUES ('profile-001', 'sample-sales-001', 'EMP001', 0.05, 'West Coast', NOW(), 'gold', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample organization if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = 'sample-org-001') THEN
        -- Check organizations table structure for required fields
        INSERT INTO public.organizations (id, name, status, universal_discounts, tags, is_archived, setup_complete, created_at, updated_at)
        VALUES ('sample-org-001', 'Sample Organization', 'active', '{}', '{}', false, true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Sample organization created';
    END IF;
END $$;

-- Insert sample assignment
INSERT INTO public.salesperson_assignments (id, salesperson_id, organization_id, territory, is_active)
VALUES ('assignment-001', 'sample-sales-001', 'sample-org-001', 'West Coast', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample orders for testing
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        INSERT INTO public.orders (id, organization_id, order_number, customer_name, total_amount, status_code, salesperson_id, created_at, updated_at)
        VALUES 
            ('order-001', 'sample-org-001', 'ORD-001', 'Customer One', '1000.00', 'confirmed', 'sample-sales-001', NOW(), NOW()),
            ('order-002', 'sample-org-001', 'ORD-002', 'Customer Two', '2500.00', 'confirmed', 'sample-sales-001', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Sample orders created';
    END IF;
END $$;

-- Verify all tables exist and show record counts
DO $$
DECLARE
    profile_count INTEGER;
    assignment_count INTEGER;  
    metrics_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.salesperson_profiles;
    SELECT COUNT(*) INTO assignment_count FROM public.salesperson_assignments;
    SELECT COUNT(*) INTO metrics_count FROM public.salesperson_metrics;
    
    RAISE NOTICE 'SUCCESS: All salesperson tables created!';
    RAISE NOTICE 'salesperson_profiles: % rows', profile_count;
    RAISE NOTICE 'salesperson_assignments: % rows', assignment_count;
    RAISE NOTICE 'salesperson_metrics: % rows', metrics_count;
    
    IF profile_count = 0 THEN
        RAISE WARNING 'No records in salesperson_profiles - this may indicate a constraint issue';
    END IF;
END $$;

COMMIT;
