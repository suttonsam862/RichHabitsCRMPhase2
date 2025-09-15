
import postgres from 'postgres';

// Load environment variables
import { config } from 'dotenv';
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Verify we're using Supabase
if (!connectionString.includes('supabase.co') && !connectionString.includes('supabase.com')) {
  console.error('❌ DATABASE_URL must point to Supabase database');
  console.error('Current URL:', connectionString.replace(/:[^:@]*@/, ':***@'));
  process.exit(1);
}

const client = postgres(connectionString, { 
  max: 20, 
  ssl: 'require'
});

async function createTables() {
  try {
    console.log('🚀 Creating salesperson tables...');

    // Create salesperson_profiles table
    await client`
      CREATE TABLE IF NOT EXISTS public.salesperson_profiles (
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
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create salesperson_assignments table
    await client`
      CREATE TABLE IF NOT EXISTS public.salesperson_assignments (
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
    `;

    // Create salesperson_metrics table
    await client`
      CREATE TABLE IF NOT EXISTS public.salesperson_metrics (
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
    `;

    // Create indexes
    await client`CREATE INDEX IF NOT EXISTS idx_salesperson_profiles_user_id ON public.salesperson_profiles(user_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson ON public.salesperson_assignments(salesperson_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_organization ON public.salesperson_assignments(organization_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_salesperson_metrics_salesperson ON public.salesperson_metrics(salesperson_id);`;

    // Insert sample data directly into salesperson tables (without users dependency)
    try {
      // Insert directly into salesperson_profiles
      await client`
        INSERT INTO public.salesperson_profiles (id, user_id, employee_id, commission_rate, territory, performance_tier, is_active, created_at, updated_at)
        VALUES 
          ('profile-001', 'sample-sales-001', 'EMP001', 0.05, 'West Coast', 'gold', true, NOW(), NOW()),
          ('profile-002', 'sample-sales-002', 'EMP002', 0.06, 'East Coast', 'silver', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;

      // Insert sample assignments
      await client`
        INSERT INTO public.salesperson_assignments (id, salesperson_id, organization_id, territory, commission_rate, is_active, created_at, updated_at)
        VALUES 
          ('assignment-001', 'sample-sales-001', 'org-001', 'West Coast', 0.05, true, NOW(), NOW()),
          ('assignment-002', 'sample-sales-002', 'org-002', 'East Coast', 0.06, true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;

      // Insert sample metrics for current month
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      await client`
        INSERT INTO public.salesperson_metrics (id, salesperson_id, period_start, period_end, total_sales, total_orders, commission_earned, target_sales, created_at, updated_at)
        VALUES 
          ('metrics-001', 'sample-sales-001', ${startOfMonth.toISOString().split('T')[0]}, ${endOfMonth.toISOString().split('T')[0]}, 15000.00, 25, 750.00, 20000.00, NOW(), NOW()),
          ('metrics-002', 'sample-sales-002', ${startOfMonth.toISOString().split('T')[0]}, ${endOfMonth.toISOString().split('T')[0]}, 12500.00, 18, 750.00, 18000.00, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;

      console.log('✅ Sample salesperson data inserted successfully');
    } catch (error) {
      console.log('⚠️ Could not insert sample data:', error.message);
    }

    console.log('✅ Salesperson tables created successfully!');

    // Test the tables
    const profileCount = await client`SELECT COUNT(*) as count FROM public.salesperson_profiles`;
    const assignmentCount = await client`SELECT COUNT(*) as count FROM public.salesperson_assignments`;
    const metricsCount = await client`SELECT COUNT(*) as count FROM public.salesperson_metrics`;

    console.log('📊 Table counts:');
    console.log(`  salesperson_profiles: ${profileCount[0].count}`);
    console.log(`  salesperson_assignments: ${assignmentCount[0].count}`);  
    console.log(`  salesperson_metrics: ${metricsCount[0].count}`);

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await client.end();
  }
}

createTables();
