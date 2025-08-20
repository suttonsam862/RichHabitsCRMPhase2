
import { db } from "../db";
import { sql } from "drizzle-orm";

async function ensureRolesExist() {
  console.log("🔍 Checking if required roles exist...");
  
  try {
    // Check if roles table exists and has data
    const rolesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM roles WHERE slug = 'owner'
    `);
    
    const roleCount = Array.isArray(rolesResult) ? rolesResult[0]?.count : (rolesResult as any).rows?.[0]?.count;
    
    if (!roleCount || roleCount === 0) {
      console.log("🔧 Creating owner role...");
      
      // Insert owner role
      await db.execute(sql`
        INSERT INTO roles (id, slug, name, description, created_at)
        VALUES (
          gen_random_uuid(),
          'owner',
          'Owner',
          'Organization owner with full administrative privileges',
          now()
        )
        ON CONFLICT (slug) DO NOTHING
      `);
      
      console.log("✅ Owner role created successfully");
    } else {
      console.log("✅ Owner role already exists");
    }
    
    // Verify the role exists
    const verifyResult = await db.execute(sql`
      SELECT id, slug, name FROM roles WHERE slug = 'owner'
    `);
    
    const ownerRole = Array.isArray(verifyResult) ? verifyResult[0] : (verifyResult as any).rows?.[0];
    
    if (ownerRole) {
      console.log("✅ Owner role verified:", ownerRole);
      return ownerRole.id;
    } else {
      throw new Error("Failed to create or verify owner role");
    }
    
  } catch (error: any) {
    console.error("❌ Error ensuring roles exist:", error.message);
    
    // If roles table doesn't exist, create it
    if (error.code === '42P01') {
      console.log("🔧 Creating roles table...");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      
      // Create the owner role
      await db.execute(sql`
        INSERT INTO roles (slug, name, description)
        VALUES ('owner', 'Owner', 'Organization owner with full administrative privileges')
      `);
      
      console.log("✅ Roles table and owner role created");
    } else {
      throw error;
    }
  }
}

// Run if called directly (ESM compatible check)
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureRolesExist()
    .then(() => {
      console.log("🎉 Role setup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Role setup failed:", error);
      process.exit(1);
    });
}

export { ensureRolesExist };
