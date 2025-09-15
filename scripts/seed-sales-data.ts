import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { users, salespersonProfiles } from '../shared/schema.js';

async function seedSalesData() {
  try {
    console.log('🌱 Seeding sales data...');

    // Create a few test salespeople (insert into users first)
    const salespeople = [
      {
        id: randomUUID(), // This id is not used in the modified code, as the script uses the generated user id instead.
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
    // Create users for salespeople (handle duplicates)
    for (const person of salespeople) {
      try {
        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, person.email)).limit(1);

        let userId: string;
        if (existingUser.length > 0) {
          userId = existingUser[0].id;
          console.log(`✅ Using existing user: ${person.fullName} (${person.email})`);
        } else {
          const user = await db.insert(users).values({
            id: randomUUID(),
            email: person.email,
            full_name: person.fullName,
            role: 'sales',
            organization_id: 'global'
          }).returning({ id: users.id });
          userId = user[0].id;
          console.log(`✅ Created salesperson: ${person.fullName}`);
        }

        // Create salesperson profile (check for duplicates)
        const existingProfile = await db.select().from(salespersonProfiles).where(eq(salespersonProfiles.user_id, userId)).limit(1);

        if (existingProfile.length === 0) {
          await db.insert(salespersonProfiles).values({
            id: randomUUID(),
            user_id: userId,
            employee_id: `EMP-${Math.floor(Math.random() * 1000)}`,
            commission_rate: 0.05,
            territory: ['West Coast', 'East Coast', 'Midwest'][Math.floor(Math.random() * 3)],
            hire_date: new Date().toISOString(),
            performance_tier: ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)]
          });
        }
      } catch (err: any) {
        console.log(`⚠️ Skipping ${person.fullName}: ${err.message}`);
      }
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