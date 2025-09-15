
-- Create missing salesperson tables that match the schema.ts structure
-- This ensures all salesperson functionality works correctly

DO $$
BEGIN
    RAISE NOTICE 'Creating missing salesperson tables...';
    
    -- Create salesperson_profiles table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'salesperson_profiles') THEN
        
        CREATE TABLE salesperson_profiles (
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
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT salesperson_profiles_manager_id_fkey 
                FOREIGN KEY (manager_id) REFERENCES users(id)
        );
        
        RAISE NOTICE 'Created salesperson_profiles table';
    ELSE
        RAISE NOTICE 'salesperson_profiles table already exists';
    END IF;
    
    -- Create salesperson_assignments table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'salesperson_assignments') THEN
        
        CREATE TABLE salesperson_assignments (
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
                FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT salesperson_assignments_organization_id_fkey 
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
            CONSTRAINT salesperson_assignments_assigned_by_fkey 
                FOREIGN KEY (assigned_by) REFERENCES users(id)
        );
        
        RAISE NOTICE 'Created salesperson_assignments table';
    ELSE
        RAISE NOTICE 'salesperson_assignments table already exists';
    END IF;
    
    -- Create salesperson_metrics table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'salesperson_metrics') THEN
        
        CREATE TABLE salesperson_metrics (
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
                FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT salesperson_metrics_unique_period 
                UNIQUE(salesperson_id, period_start, period_end)
        );
        
        RAISE NOTICE 'Created salesperson_metrics table';
    ELSE
        RAISE NOTICE 'salesperson_metrics table already exists';
    END IF;
    
    -- Create performance indexes
    CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user_id 
        ON salesperson_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_active 
        ON salesperson_profiles(is_active);
    
    CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson 
        ON salesperson_assignments(salesperson_id);
    CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization 
        ON salesperson_assignments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_active 
        ON salesperson_assignments(is_active);
    
    CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson 
        ON salesperson_metrics(salesperson_id);
    CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_period 
        ON salesperson_metrics(period_start, period_end);
    
    RAISE NOTICE 'Created performance indexes';
    RAISE NOTICE 'Salesperson tables setup completed successfully!';
END $$;
