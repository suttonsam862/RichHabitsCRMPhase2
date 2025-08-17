const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { organizations } = require('../shared/schema.ts');

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
const db = drizzle(sql);

// Debug: Check what the organizations schema looks like
console.log('Organizations table columns:');
console.log(Object.keys(organizations));

// Check the actual Drizzle column definitions
for (const [key, column] of Object.entries(organizations)) {
  if (column && typeof column === 'object' && column.name) {
    console.log(`Property: ${key} -> Column: ${column.name}`);
  }
}

sql.end();