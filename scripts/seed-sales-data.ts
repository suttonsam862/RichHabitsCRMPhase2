
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function seedSalesData() {
  try {
    console.log('🌱 Seeding sales data...');

    // Create a few test salespeople (insert into users first)
    const salespeople = [
      {
        id: randomUUID(),
        email: 'john.sales@example.com',
        fullName: 'John Smith',
        role: 'sales',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        email: 'jane.sales@example.com', 
        fullName: 'Jane Doe',
        role: 'sales',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        email: 'mike.sales@example.com',
        fullName: 'Mike Johnson', 
        role: 'sales',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Insert salespeople using raw SQL
    for (const person of salespeople) {
      await db.execute(sql`
        INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (${person.id}, ${person.email}, ${person.fullName}, ${person.role}, ${person.isActive}, ${person.createdAt}, ${person.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `);
      console.log(`✅ Created salesperson: ${person.fullName}`);
    }

    // Create salesperson profiles using raw SQL
    for (const person of salespeople) {
      const profileId = randomUUID();
      const employeeId = `EMP-${Math.floor(Math.random() * 1000)}`;
      const territory = ['West Coast', 'East Coast', 'Midwest'][Math.floor(Math.random() * 3)];
      const performanceTier = ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)];
      
      await db.execute(sql`
        INSERT INTO public.salesperson_profiles (id, user_id, employee_id, commission_rate, territory, performance_tier, is_active, created_at, updated_at)
        VALUES (${profileId}, ${person.id}, ${employeeId}, 0.05, ${territory}, ${performanceTier}, true, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `);
      console.log(`✅ Created profile for: ${person.fullName}`);
    }

    // Create some sample assignments using raw SQL
    for (const person of salespeople) {
      const assignmentId = randomUUID();
      const orgId = randomUUID();
      
      await db.execute(sql`
        INSERT INTO public.salesperson_assignments (id, salesperson_id, organization_id, territory, commission_rate, is_active, assigned_at, created_at, updated_at)
        VALUES (${assignmentId}, ${person.id}, ${orgId}, 'Sample Territory', 0.05, true, NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
      console.log(`✅ Created assignment for: ${person.fullName}`);
    }

    // Create some sample orders using raw SQL
    for (let i = 0; i < 10; i++) {
      const randomSalesperson = salespeople[Math.floor(Math.random() * salespeople.length)];
      const orderId = randomUUID();
      const orderNumber = `ORD-${Math.floor(Math.random() * 10000)}`;
      const totalAmount = (Math.random() * 1000 + 100).toFixed(2);
      
      await db.execute(sql`
        INSERT INTO public.orders (id, organization_id, order_number, customer_name, total_amount, status_code, salesperson_id, created_at, updated_at)
        VALUES (${orderId}, ${randomUUID()}, ${orderNumber}, ${'Customer ' + (i + 1)}, ${totalAmount}, 'confirmed', ${randomSalesperson.id}, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
    }
    console.log(`✅ Created 10 sample orders`);

    console.log('🎉 Sales data seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding sales data:', error);
    throw error;
  }
}

seedSalesData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
