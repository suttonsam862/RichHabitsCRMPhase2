
import { db } from '../server/db.js';
import { users, salespersonProfiles, salespersonAssignments, orders } from '../shared/schema.js';
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

    // Insert salespeople
    for (const person of salespeople) {
      await db.insert(users).values(person).onConflictDoNothing();
      console.log(`✅ Created salesperson: ${person.fullName}`);
    }

    // Create salesperson profiles
    for (const person of salespeople) {
      await db.insert(salespersonProfiles).values({
        id: randomUUID(),
        userId: person.id,
        employeeId: `EMP-${Math.floor(Math.random() * 1000)}`,
        commissionRate: '0.05',
        territory: ['West Coast', 'East Coast', 'Midwest'][Math.floor(Math.random() * 3)],
        performanceTier: ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).onConflictDoNothing();
      console.log(`✅ Created profile for: ${person.fullName}`);
    }

    // Create some sample assignments
    for (const person of salespeople) {
      await db.insert(salespersonAssignments).values({
        id: randomUUID(),
        salespersonId: person.id,
        organizationId: randomUUID(),
        territory: 'Sample Territory',
        commissionRate: '0.05',
        isActive: true,
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).onConflictDoNothing();
      console.log(`✅ Created assignment for: ${person.fullName}`);
    }

    // Create some sample orders
    for (let i = 0; i < 10; i++) {
      const randomSalesperson = salespeople[Math.floor(Math.random() * salespeople.length)];
      await db.insert(orders).values({
        id: randomUUID(),
        organizationId: randomUUID(),
        orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
        customerName: `Customer ${i + 1}`,
        totalAmount: (Math.random() * 1000 + 100).toFixed(2),
        statusCode: 'confirmed',
        salespersonId: randomSalesperson.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).onConflictDoNothing();
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
