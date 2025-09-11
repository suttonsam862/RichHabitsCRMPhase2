
-- Create salesperson tables
CREATE TABLE IF NOT EXISTS salesperson_assignments (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    salesperson_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    territory VARCHAR(255),
    commission_rate DECIMAL(5,4) DEFAULT 0.05,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by VARCHAR(255) REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salesperson_profiles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    employee_id VARCHAR(100),
    tax_id VARCHAR(50),
    commission_rate DECIMAL(5,4) DEFAULT 0.05,
    territory VARCHAR(255),
    hire_date DATE,
    manager_id VARCHAR(255) REFERENCES users(id),
    performance_tier VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salesperson_metrics (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    salesperson_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson ON salesperson_assignments(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization ON salesperson_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_active ON salesperson_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user ON salesperson_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson ON salesperson_metrics(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_period ON salesperson_metrics(period_start, period_end);
