
import postgres from 'postgres';

const connectionString = "postgresql://postgres.qkampkccsdiebvkcfuby:Arlodog2013!@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

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

    // Insert sample data if users/organizations tables exist
    try {
      await client`
        INSERT INTO public.users (id, email, full_name, role, organization_id, is_active, created_at, updated_at)
        VALUES ('sample-sales-001', 'john.sales@example.com', 'John Sales', 'sales', 'global', 1, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;

      await client`
        INSERT INTO public.salesperson_profiles (id, user_id, employee_id, commission_rate, territory, performance_tier, is_active)
        VALUES ('profile-001', 'sample-sales-001', 'EMP001', 0.05, 'West Coast', 'gold', true)
        ON CONFLICT (id) DO NOTHING;
      `;

      console.log('✅ Sample data inserted');
    } catch (error) {
      console.log('⚠️ Could not insert sample data (users table may not exist)');
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
