
-- Create salesperson_profiles table
CREATE TABLE IF NOT EXISTS salesperson_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
  employee_id TEXT,
  tax_id TEXT,
  commission_rate INTEGER DEFAULT 0,
  territory TEXT[],
  hire_date TIMESTAMP,
  manager_id VARCHAR REFERENCES users(id),
  performance_tier TEXT DEFAULT 'standard',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create salesperson_assignments table
CREATE TABLE IF NOT EXISTS salesperson_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id VARCHAR NOT NULL REFERENCES users(id),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  sport_id VARCHAR NOT NULL REFERENCES sports(id),
  team_name TEXT NOT NULL,
  assigned_by VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create salesperson_metrics table
CREATE TABLE IF NOT EXISTS salesperson_metrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id VARCHAR NOT NULL REFERENCES users(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_sales INTEGER,
  orders_count INTEGER,
  conversion_rate NUMERIC(5,4),
  average_deal_size INTEGER,
  commission_earned INTEGER,
  active_assignments INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user_id ON salesperson_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson_id ON salesperson_assignments(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization_id ON salesperson_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_sport_id ON salesperson_assignments(sport_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson_id ON salesperson_metrics(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_period ON salesperson_metrics(period_start, period_end);

-- Add column to org_sports if it doesn't exist
ALTER TABLE org_sports ADD COLUMN IF NOT EXISTS assigned_salesperson_id VARCHAR REFERENCES users(id);
