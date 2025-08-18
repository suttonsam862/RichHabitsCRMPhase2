import { db } from "./db";
import { organizations } from "../shared/schema";
import { sql } from "drizzle-orm";

async function testDbConnection() {
  console.log("Testing database connection and query...");
  
  try {
    // Test basic connection
    console.log("1. Testing basic SQL query...");
    const basicResult = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ Basic query successful:", basicResult);
    
    // Test organizations table structure
    console.log("\n2. Testing organizations table structure...");
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      ORDER BY ordinal_position
    `);
    console.log("✅ Organization columns:", columnsResult);
    
    // Test count query
    console.log("\n3. Testing count query...");
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM organizations`);
    console.log("✅ Count result:", countResult);
    
    // Test simple select from organizations table
    console.log("\n4. Testing simple select...");
    const selectResult = await db.execute(sql`SELECT id, name FROM organizations LIMIT 2`);
    console.log("✅ Simple select result:", selectResult);
    
    // Test Drizzle select with explicit columns
    console.log("\n5. Testing Drizzle select with explicit columns...");
    const drizzleResult = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        state: organizations.state
      })
      .from(organizations)
      .limit(2);
    console.log("✅ Drizzle explicit select result:", drizzleResult);
    
    // Test Drizzle select all
    console.log("\n6. Testing Drizzle select all...");
    const drizzleAllResult = await db.select().from(organizations).limit(2);
    console.log("✅ Drizzle select all result:", drizzleAllResult);
    
  } catch (error: any) {
    console.error("❌ Database test failed:", {
      message: error.message,
      code: error.code,
      position: error.position,
      file: error.file,
      line: error.line,
      routine: error.routine,
      stack: error.stack
    });
  }
}

testDbConnection().then(() => {
  console.log("\nDatabase test completed.");
  process.exit(0);
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});