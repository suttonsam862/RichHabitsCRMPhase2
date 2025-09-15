
-- Fix salesperson tables and ensure they work with the dashboard
-- Run this locally with: psql $DATABASE_URL -f fix_salesperson_tables.sql

-- First, let's check if tables exist and drop/recreate if needed
DROP TABLE IF EXISTS public.salesperson_metrics CASCADE;
DROP TABLE IF EXISTS public.salesperson_assignments CASCADE; 
DROP TABLE IF EXISTS public.salesperson_profiles CASCADE;

-- Create salesperson_profiles table
CREATE TABLE public.salesperson_profiles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    user_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100),
    tax_id VARCHAR(50),
    commission_rate DECIMAL(5,4) DEFAULT 0.05,
    territory VARCHAR(255),
    hire_date DATE,
    manager_id VARCHAR(255),
    performance_tier VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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
    updated_at TIMESTAMP DEFAULT NOW()
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
    UNIQUE(salesperson_id, period_start, period_end)
);

-- Add foreign key constraints (only if referenced tables exist)
DO $$ 
BEGIN
    -- Add foreign key to users table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.salesperson_profiles 
        ADD CONSTRAINT salesperson_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        ALTER TABLE public.salesperson_profiles 
        ADD CONSTRAINT salesperson_profiles_manager_id_fkey 
        FOREIGN KEY (manager_id) REFERENCES public.users(id);
        
        ALTER TABLE public.salesperson_assignments 
        ADD CONSTRAINT salesperson_assignments_salesperson_id_fkey 
        FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        ALTER TABLE public.salesperson_assignments 
        ADD CONSTRAINT salesperson_assignments_assigned_by_fkey 
        FOREIGN KEY (assigned_by) REFERENCES public.users(id);
        
        ALTER TABLE public.salesperson_metrics 
        ADD CONSTRAINT salesperson_metrics_salesperson_id_fkey 
        FOREIGN KEY (salesperson_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key to organizations table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        ALTER TABLE public.salesperson_assignments 
        ADD CONSTRAINT salesperson_assignments_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user_id ON public.salesperson_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_active ON public.salesperson_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson ON public.salesperson_assignments(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization ON public.salesperson_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_active ON public.salesperson_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson ON public.salesperson_metrics(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_period ON public.salesperson_metrics(period_start, period_end);

-- Insert some sample data to test the dashboard
-- First create a sample user if users table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Insert a sample salesperson user
        INSERT INTO public.users (id, email, full_name, role, organization_id, created_at, updated_at)
        VALUES ('sample-sales-001', 'john.sales@example.com', 'John Sales', 'sales', 'global', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- Insert salesperson profile
        INSERT INTO public.salesperson_profiles (id, user_id, employee_id, commission_rate, territory, hire_date, performance_tier, is_active)
        VALUES ('profile-001', 'sample-sales-001', 'EMP001', 0.05, 'West Coast', NOW(), 'gold', true)
        ON CONFLICT (id) DO NOTHING;
        
    END IF;
END $$;

-- Insert sample organization if organizations table exists  
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        INSERT INTO public.organizations (id, name, created_at, updated_at)
        VALUES ('sample-org-001', 'Sample Organization', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- Insert assignment
        INSERT INTO public.salesperson_assignments (id, salesperson_id, organization_id, territory, is_active)
        VALUES ('assignment-001', 'sample-sales-001', 'sample-org-001', 'West Coast', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Insert sample orders if orders table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        INSERT INTO public.orders (id, organization_id, order_number, customer_name, total_amount, status_code, salesperson_id, created_at, updated_at)
        VALUES 
            ('order-001', 'sample-org-001', 'ORD-001', 'Customer One', '1000.00', 'confirmed', 'sample-sales-001', NOW(), NOW()),
            ('order-002', 'sample-org-001', 'ORD-002', 'Customer Two', '2500.00', 'confirmed', 'sample-sales-001', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON public.salesperson_profiles TO postgres;
GRANT ALL PRIVILEGES ON public.salesperson_assignments TO postgres;
GRANT ALL PRIVILEGES ON public.salesperson_metrics TO postgres;

-- Verify tables were created successfully
DO $$
BEGIN
    RAISE NOTICE 'Tables created successfully!';
    RAISE NOTICE 'salesperson_profiles: % rows', (SELECT COUNT(*) FROM public.salesperson_profiles);
    RAISE NOTICE 'salesperson_assignments: % rows', (SELECT COUNT(*) FROM public.salesperson_assignments);
    RAISE NOTICE 'salesperson_metrics: % rows', (SELECT COUNT(*) FROM public.salesperson_metrics);
END $$;
