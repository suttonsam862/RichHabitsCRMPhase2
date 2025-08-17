#!/usr/bin/env tsx
/**
 * Test script for organization creation flow
 * Tests various scenarios including:
 * - Creating org with null universalDiscounts
 * - Creating org without JWT/user auth
 * - Field mapping and normalization
 * - Role assignment
 */

import { db } from "../db";
import { organizations } from "../../shared/schema";
import { sql } from "drizzle-orm";

const API_URL = process.env.API_URL || "http://localhost:5000";

async function apiRequest(path: string, options: any = {}) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function runTest(name: string, test: () => Promise<void>) {
  try {
    await test();
    console.log(`✅ ${name}`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function cleanupTestOrgs() {
  // Clean up test organizations
  await db.execute(sql`
    DELETE FROM organizations 
    WHERE name LIKE 'Test Org %'
  `);
}

async function main() {
  console.log("🧪 Testing Organization Creation Flow\n");
  
  let passCount = 0;
  let failCount = 0;
  const createdOrgIds: string[] = [];

  try {
    // Test 1: Create org with universalDiscounts: null
    const test1 = await runTest("Create org with universalDiscounts: null", async () => {
      const response = await apiRequest("/api/organizations", {
        method: "POST",
        body: {
          name: `Test Org Null Discounts ${Date.now()}`,
          universalDiscounts: null, // This should be normalized to {}
        },
      });
      
      if (!response.id) {
        throw new Error("No ID returned");
      }
      createdOrgIds.push(response.id);
      
      // Verify the discount was normalized to empty object
      const [org] = await db
        .select({ universal_discounts: organizations.universal_discounts })
        .from(organizations)
        .where(sql`id = ${response.id}`)
        .limit(1);
      
      if (org.universal_discounts === null) {
        throw new Error("universalDiscounts was not normalized to empty object");
      }
      
      if (JSON.stringify(org.universal_discounts) !== "{}") {
        throw new Error(`Expected {}, got ${JSON.stringify(org.universal_discounts)}`);
      }
    });
    test1 ? passCount++ : failCount++;

    // Test 2: Create org with only address field (not address_line1)
    const test2 = await runTest("Create org with address field mapping", async () => {
      const response = await apiRequest("/api/organizations", {
        method: "POST",
        body: {
          name: `Test Org Address Mapping ${Date.now()}`,
          address: "123 Test Street",
        },
      });
      
      if (!response.id) {
        throw new Error("No ID returned");
      }
      createdOrgIds.push(response.id);
      
      // Verify address was stored correctly
      const [org] = await db
        .select({ address: organizations.address })
        .from(organizations)
        .where(sql`id = ${response.id}`)
        .limit(1);
      
      if (org.address !== "123 Test Street") {
        throw new Error(`Address not stored correctly: ${org.address}`);
      }
    });
    test2 ? passCount++ : failCount++;

    // Test 3: Create org without user authentication
    const test3 = await runTest("Create org without JWT/user auth", async () => {
      const response = await apiRequest("/api/organizations", {
        method: "POST",
        body: {
          name: `Test Org No Auth ${Date.now()}`,
        },
      });
      
      if (!response.id) {
        throw new Error("Organization creation failed without auth");
      }
      createdOrgIds.push(response.id);
      
      // Verify no user_roles entry was created
      const userRoles = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM user_roles 
        WHERE org_id = ${response.id}::uuid
      `);
      
      const count = (userRoles as any)[0]?.count || 0;
      if (count > 0) {
        throw new Error("User role was created when it shouldn't have been");
      }
    });
    test3 ? passCount++ : failCount++;

    // Test 4: Create org with user ID header
    const test4 = await runTest("Create org with x-user-id header", async () => {
      // First ensure we have a test user
      const testUserId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID v4
      
      const response = await apiRequest("/api/organizations", {
        method: "POST",
        headers: {
          "x-user-id": testUserId,
        },
        body: {
          name: `Test Org With User ${Date.now()}`,
        },
      });
      
      if (!response.id) {
        throw new Error("Organization creation failed");
      }
      createdOrgIds.push(response.id);
      
      // Note: User role assignment might fail if user doesn't exist in DB
      // This is expected behavior - org creation should still succeed
    });
    test4 ? passCount++ : failCount++;

    // Test 5: Create org with camelCase fields
    const test5 = await runTest("Create org with camelCase field mapping", async () => {
      const response = await apiRequest("/api/organizations", {
        method: "POST",
        body: {
          name: `Test Org CamelCase ${Date.now()}`,
          logoUrl: "https://example.com/logo.png",
          isBusiness: true,
          universalDiscounts: { bulk: 10 },
        },
      });
      
      if (!response.id) {
        throw new Error("Organization creation failed");
      }
      createdOrgIds.push(response.id);
      
      // Verify fields were mapped correctly
      const [org] = await db
        .select({
          logo_url: organizations.logo_url,
          is_business: organizations.is_business,
          universal_discounts: organizations.universal_discounts,
        })
        .from(organizations)
        .where(sql`id = ${response.id}`)
        .limit(1);
      
      if (org.logo_url !== "https://example.com/logo.png") {
        throw new Error(`logoUrl not mapped correctly: ${org.logo_url}`);
      }
      if (!org.is_business) {
        throw new Error("isBusiness not mapped correctly");
      }
      if (!org.universal_discounts || (org.universal_discounts as any).bulk !== 10) {
        throw new Error(`universalDiscounts not mapped correctly: ${JSON.stringify(org.universal_discounts)}`);
      }
    });
    test5 ? passCount++ : failCount++;

    // Test 6: Verify roles are seeded
    const test6 = await runTest("Verify roles are properly seeded", async () => {
      const roles = await db.execute(sql`
        SELECT slug, name 
        FROM roles 
        WHERE slug IN ('owner', 'admin', 'member')
        ORDER BY slug
      `);
      
      const roleRows = roles as any[];
      if (roleRows.length !== 3) {
        throw new Error(`Expected 3 roles, found ${roleRows.length}`);
      }
      
      const slugs = roleRows.map((r: any) => r.slug).sort();
      if (JSON.stringify(slugs) !== JSON.stringify(['admin', 'member', 'owner'])) {
        throw new Error(`Missing required roles: ${JSON.stringify(slugs)}`);
      }
    });
    test6 ? passCount++ : failCount++;

    // Test 7: Duplicate name rejection
    const test7 = await runTest("Reject duplicate organization names", async () => {
      const uniqueName = `Test Org Duplicate ${Date.now()}`;
      
      // First creation should succeed
      const response1 = await apiRequest("/api/organizations", {
        method: "POST",
        body: { name: uniqueName },
      });
      
      if (!response1.id) {
        throw new Error("First org creation failed");
      }
      createdOrgIds.push(response1.id);
      
      // Second creation with same name should fail
      try {
        await apiRequest("/api/organizations", {
          method: "POST",
          body: { name: uniqueName },
        });
        throw new Error("Duplicate name was not rejected");
      } catch (error: any) {
        // This is expected - duplicate should fail
        if (!error.message.includes("409") && !error.message.includes("unique")) {
          throw new Error(`Unexpected error: ${error.message}`);
        }
      }
    });
    test7 ? passCount++ : failCount++;

  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up test organizations...");
    await cleanupTestOrgs();
  }

  // Summary
  const totalTests = passCount + failCount;
  console.log("\n📊 Test Results:");
  console.log(`   ✅ Passed: ${passCount}/${totalTests}`);
  console.log(`   ❌ Failed: ${failCount}/${totalTests}`);
  console.log(`   Success Rate: ${((passCount / totalTests) * 100).toFixed(1)}%`);
  
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(console.error);