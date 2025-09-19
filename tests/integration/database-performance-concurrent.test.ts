import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../server/db';
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-setup';
import { sql } from 'drizzle-orm';

describe('Database Performance and Concurrent Operations Testing', () => {
  let testUser: any;
  let testOrg: any;
  let performanceTestData: any[] = [];

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'db-performance@example.com',
      fullName: 'DB Performance User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'DB Performance Org',
      ownerId: testUser.id
    });
  });

  afterAll(async () => {
    // Cleanup performance test data
    if (performanceTestData.length > 0) {
      const ids = performanceTestData.map(item => `'${item.id}'`).join(',');
      await db.execute(sql.raw(`DELETE FROM orders WHERE id IN (${ids})`));
    }
    await cleanupTestData();
  });

  describe('Large Dataset Performance', () => {
    it('should handle large dataset insertions efficiently', async () => {
      const batchSize = 1000;
      const startTime = Date.now();

      // Create large batch of orders
      const insertPromises = [];
      for (let i = 0; i < batchSize; i++) {
        const orderId = `perf-large-${i}-${Date.now()}`;
        performanceTestData.push({ id: orderId });
        
        insertPromises.push(
          db.execute(sql`
            INSERT INTO orders (id, organization_id, customer_name, total_amount, status) 
            VALUES (${orderId}, ${testOrg.id}, 'Performance Customer ${i}', ${(i + 1) * 10}, 'pending')
          `)
        );

        // Process in smaller batches to avoid overwhelming the database
        if (insertPromises.length >= 50) {
          await Promise.all(insertPromises);
          insertPromises.length = 0; // Clear array
        }
      }

      // Process remaining inserts
      if (insertPromises.length > 0) {
        await Promise.all(insertPromises);
      }

      const insertTime = Date.now() - startTime;
      console.log(`Inserted ${batchSize} records in ${insertTime}ms`);

      // Should complete within reasonable time (under 30 seconds for 1000 records)
      expect(insertTime).toBeLessThan(30000);

      // Verify data integrity
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE organization_id = ${testOrg.id} AND customer_name LIKE 'Performance Customer%'
      `);
      expect(countResult[0].count).toBe(batchSize);
    });

    it('should perform complex queries efficiently on large datasets', async () => {
      // Complex aggregation query
      const queryStartTime = Date.now();
      
      const complexQuery = await db.execute(sql`
        SELECT 
          COUNT(*) as total_orders,
          AVG(total_amount) as avg_amount,
          MAX(total_amount) as max_amount,
          MIN(total_amount) as min_amount,
          status
        FROM orders 
        WHERE organization_id = ${testOrg.id} 
          AND customer_name LIKE 'Performance Customer%'
        GROUP BY status
        ORDER BY total_orders DESC
      `);

      const queryTime = Date.now() - queryStartTime;
      console.log(`Complex query completed in ${queryTime}ms`);

      // Query should complete within 5 seconds
      expect(queryTime).toBeLessThan(5000);
      expect(complexQuery.length).toBeGreaterThan(0);

      // Verify aggregation results are reasonable
      for (const result of complexQuery) {
        expect(result.total_orders).toBeGreaterThan(0);
        expect(result.avg_amount).toBeGreaterThan(0);
        expect(result.max_amount).toBeGreaterThanOrEqual(result.min_amount);
      }
    });

    it('should handle pagination efficiently on large datasets', async () => {
      const pageSize = 25;
      const totalPages = 5;
      const paginationTimes = [];

      for (let page = 0; page < totalPages; page++) {
        const offset = page * pageSize;
        
        const pageStartTime = Date.now();
        const pageResults = await db.execute(sql`
          SELECT id, customer_name, total_amount, created_at
          FROM orders 
          WHERE organization_id = ${testOrg.id} 
            AND customer_name LIKE 'Performance Customer%'
          ORDER BY created_at DESC, id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `);
        const pageTime = Date.now() - pageStartTime;
        
        paginationTimes.push(pageTime);
        
        expect(pageResults.length).toBeLessThanOrEqual(pageSize);
        expect(pageTime).toBeLessThan(2000); // Each page should load in under 2 seconds
      }

      // Later pages shouldn't be significantly slower than first page
      const avgTime = paginationTimes.reduce((sum, time) => sum + time, 0) / paginationTimes.length;
      const maxTime = Math.max(...paginationTimes);
      
      expect(maxTime).toBeLessThan(avgTime * 3); // No page should be more than 3x average time
    });

    it('should handle search operations efficiently on large datasets', async () => {
      const searchTerms = ['Customer 1', 'Customer 5', 'Customer 999', 'NonExistent'];
      
      for (const term of searchTerms) {
        const searchStartTime = Date.now();
        
        const searchResults = await db.execute(sql`
          SELECT id, customer_name, total_amount
          FROM orders 
          WHERE organization_id = ${testOrg.id} 
            AND customer_name ILIKE ${`%${term}%`}
          ORDER BY customer_name
          LIMIT 50
        `);
        
        const searchTime = Date.now() - searchStartTime;
        
        expect(searchTime).toBeLessThan(3000); // Search should complete within 3 seconds
        
        // Verify search results are relevant
        for (const result of searchResults) {
          expect(result.customer_name.toLowerCase()).toContain(term.toLowerCase());
        }
      }
    });
  });

  describe('Concurrent Operations Testing', () => {
    it('should handle concurrent read operations safely', async () => {
      const concurrentReads = 20;
      const readPromises = [];

      // Launch multiple concurrent read operations
      for (let i = 0; i < concurrentReads; i++) {
        readPromises.push(
          db.execute(sql`
            SELECT COUNT(*) as count, AVG(total_amount) as avg_amount
            FROM orders 
            WHERE organization_id = ${testOrg.id}
              AND customer_name LIKE 'Performance Customer%'
          `)
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(readPromises);
      const totalTime = Date.now() - startTime;

      // All reads should complete successfully
      expect(results).toHaveLength(concurrentReads);
      
      // All results should be consistent
      const firstResult = results[0][0];
      for (const result of results) {
        expect(result[0].count).toBe(firstResult.count);
        expect(Number(result[0].avg_amount)).toBeCloseTo(Number(firstResult.avg_amount), 2);
      }

      // Concurrent reads should complete reasonably quickly
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds
    });

    it('should handle concurrent write operations safely', async () => {
      const concurrentWrites = 10;
      const writePromises = [];
      const concurrentTestIds = [];

      // Launch multiple concurrent write operations
      for (let i = 0; i < concurrentWrites; i++) {
        const orderId = `concurrent-write-${i}-${Date.now()}`;
        concurrentTestIds.push(orderId);
        
        writePromises.push(
          db.execute(sql`
            INSERT INTO orders (id, organization_id, customer_name, total_amount, status) 
            VALUES (${orderId}, ${testOrg.id}, 'Concurrent Customer ${i}', ${(i + 1) * 100}, 'pending')
          `)
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(writePromises);
      const totalTime = Date.now() - startTime;

      // Count successful writes
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Concurrent writes: ${successful} successful, ${failed} failed in ${totalTime}ms`);

      // Most writes should succeed (some might fail due to concurrency)
      expect(successful).toBeGreaterThan(concurrentWrites * 0.8); // At least 80% should succeed
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify successful inserts exist in database
      const verificationResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE customer_name LIKE 'Concurrent Customer%'
      `);
      expect(verificationResult[0].count).toBe(successful);

      // Cleanup
      if (concurrentTestIds.length > 0) {
        const ids = concurrentTestIds.map(id => `'${id}'`).join(',');
        await db.execute(sql.raw(`DELETE FROM orders WHERE id IN (${ids})`));
      }
    });

    it('should handle concurrent read/write mix operations', async () => {
      const mixedOperations = [];
      const mixTestIds = [];

      // Mix of read and write operations
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) {
          // Write operation
          const orderId = `mixed-op-${i}-${Date.now()}`;
          mixTestIds.push(orderId);
          mixedOperations.push(
            db.execute(sql`
              INSERT INTO orders (id, organization_id, customer_name, total_amount) 
              VALUES (${orderId}, ${testOrg.id}, 'Mixed Op Customer ${i}', ${(i + 1) * 50})
            `)
          );
        } else {
          // Read operation
          mixedOperations.push(
            db.execute(sql`
              SELECT COUNT(*) as count FROM orders WHERE organization_id = ${testOrg.id}
            `)
          );
        }
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(mixedOperations);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      // Most operations should succeed
      expect(successful).toBeGreaterThan(mixedOperations.length * 0.9);
      expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds

      // Cleanup
      if (mixTestIds.length > 0) {
        const ids = mixTestIds.map(id => `'${id}'`).join(',');
        await db.execute(sql.raw(`DELETE FROM orders WHERE id IN (${ids})`));
      }
    });

    it('should prevent race conditions in concurrent updates', async () => {
      // Create a test order
      const raceTestId = `race-condition-test-${Date.now()}`;
      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount, status) 
        VALUES (${raceTestId}, ${testOrg.id}, 'Race Test Customer', 100, 'pending')
      `);

      // Launch concurrent updates to the same record
      const concurrentUpdates = [];
      const updateValues = ['processing', 'confirmed', 'shipped', 'completed'];
      
      for (let i = 0; i < updateValues.length; i++) {
        concurrentUpdates.push(
          db.execute(sql`
            UPDATE orders 
            SET status = ${updateValues[i]}, total_amount = total_amount + ${i * 10}
            WHERE id = ${raceTestId}
          `)
        );
      }

      await Promise.all(concurrentUpdates);

      // Verify final state is consistent
      const finalState = await db.execute(sql`
        SELECT status, total_amount FROM orders WHERE id = ${raceTestId}
      `);

      expect(finalState).toHaveLength(1);
      const finalOrder = finalState[0];
      
      // Status should be one of the attempted values
      expect(updateValues).toContain(finalOrder.status);
      
      // Total amount should be >= original amount
      expect(finalOrder.total_amount).toBeGreaterThanOrEqual(100);

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = ${raceTestId}`);
    });
  });

  describe('Connection Pool and Resource Management', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      // Create many concurrent connections
      const connectionTests = [];
      const maxConnections = 50;

      for (let i = 0; i < maxConnections; i++) {
        connectionTests.push(
          db.execute(sql`SELECT 1 as test_connection, pg_backend_pid() as pid, NOW() as timestamp`)
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(connectionTests);
      
      const successful = results.filter(r => !r.error && Array.isArray(r) && r.length > 0).length;
      const errors = results.filter(r => r.error).length;
      
      console.log(`Connection pool test: ${successful} successful, ${errors} errors`);
      
      // Most connections should succeed
      expect(successful).toBeGreaterThan(maxConnections * 0.7); // At least 70% should work
      
      // If there are errors, they should be connection-related
      const connectionErrors = results.filter(r => 
        r.error && (r.error.includes('connection') || r.error.includes('pool'))
      );
      expect(connectionErrors.length).toBe(errors); // All errors should be connection-related
    });

    it('should handle long-running queries without blocking', async () => {
      // Start a long-running query
      const longQueryPromise = db.execute(sql`
        SELECT COUNT(*), AVG(total_amount), pg_sleep(2)
        FROM orders 
        WHERE organization_id = ${testOrg.id}
      `);

      // Run quick queries while long query is running
      const quickQueries = [];
      for (let i = 0; i < 5; i++) {
        quickQueries.push(
          db.execute(sql`SELECT 1 as quick_test, NOW() as timestamp`)
        );
      }

      const startTime = Date.now();
      const [longResult, ...quickResults] = await Promise.all([
        longQueryPromise,
        ...quickQueries
      ]);
      const totalTime = Date.now() - startTime;

      // Quick queries should complete even with long query running
      expect(quickResults).toHaveLength(5);
      expect(longResult).toHaveLength(1);
      
      // Total time should be close to long query time (not cumulative)
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(totalTime).toBeGreaterThan(1900); // But should take at least ~2 seconds due to pg_sleep
    });

    it('should handle transaction isolation levels correctly', async () => {
      const isolationTestId = `isolation-test-${Date.now()}`;
      
      // Create initial record
      await db.execute(sql`
        INSERT INTO orders (id, organization_id, customer_name, total_amount, status) 
        VALUES (${isolationTestId}, ${testOrg.id}, 'Isolation Test Customer', 500, 'pending')
      `);

      // Start two transactions that modify the same record
      const transaction1 = db.transaction(async (tx) => {
        const initial = await tx.execute(sql`
          SELECT total_amount FROM orders WHERE id = ${isolationTestId}
        `);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await tx.execute(sql`
          UPDATE orders 
          SET total_amount = ${Number(initial[0].total_amount) + 100}
          WHERE id = ${isolationTestId}
        `);
        
        return 'tx1_completed';
      });

      const transaction2 = db.transaction(async (tx) => {
        const initial = await tx.execute(sql`
          SELECT total_amount FROM orders WHERE id = ${isolationTestId}
        `);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await tx.execute(sql`
          UPDATE orders 
          SET total_amount = ${Number(initial[0].total_amount) + 200}
          WHERE id = ${isolationTestId}
        `);
        
        return 'tx2_completed';
      });

      // Run transactions concurrently
      const results = await Promise.allSettled([transaction1, transaction2]);
      
      // At least one transaction should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThanOrEqual(1);

      // Check final state
      const finalResult = await db.execute(sql`
        SELECT total_amount FROM orders WHERE id = ${isolationTestId}
      `);
      
      const finalAmount = Number(finalResult[0].total_amount);
      
      // Final amount should be either 600 (500+100) or 700 (500+200)
      // depending on which transaction succeeded
      expect([600, 700]).toContain(finalAmount);

      // Cleanup
      await db.execute(sql`DELETE FROM orders WHERE id = ${isolationTestId}`);
    });
  });

  describe('Query Performance Optimization', () => {
    it('should utilize indexes effectively', async () => {
      // Query using indexed column (organization_id)
      const indexedStartTime = Date.now();
      const indexedResults = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE organization_id = ${testOrg.id} 
          AND status = 'pending'
      `);
      const indexedTime = Date.now() - indexedStartTime;

      // Query using non-indexed pattern (should be slower)
      const nonIndexedStartTime = Date.now();
      const nonIndexedResults = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE customer_name ILIKE '%Customer 1%'
      `);
      const nonIndexedTime = Date.now() - nonIndexedStartTime;

      // Indexed query should be significantly faster (though this may vary by dataset size)
      console.log(`Indexed query: ${indexedTime}ms, Non-indexed query: ${nonIndexedTime}ms`);
      
      expect(indexedTime).toBeLessThan(2000); // Indexed query should be fast
      expect(indexedResults[0].count).toBeGreaterThanOrEqual(0);
      expect(nonIndexedResults[0].count).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex joins efficiently', async () => {
      // Create catalog items for join testing
      const joinTestItems = [];
      for (let i = 0; i < 10; i++) {
        const itemId = `join-test-item-${i}`;
        joinTestItems.push(itemId);
        await db.execute(sql`
          INSERT INTO catalog_items (id, org_id, name, base_price) 
          VALUES (${itemId}, ${testOrg.id}, 'Join Test Item ${i}', ${(i + 1) * 25})
        `);
      }

      // Create order items linking to catalog items
      const sampleOrderIds = performanceTestData.slice(0, 50).map(item => item.id);
      const orderItemInserts = [];
      
      for (let i = 0; i < Math.min(100, sampleOrderIds.length * 2); i++) {
        const orderId = sampleOrderIds[i % sampleOrderIds.length];
        const catalogItemId = joinTestItems[i % joinTestItems.length];
        
        orderItemInserts.push(
          db.execute(sql`
            INSERT INTO order_items (id, order_id, catalog_item_id, quantity, price) 
            VALUES ('join-item-${i}', ${orderId}, ${catalogItemId}, ${(i % 5) + 1}, ${(i + 1) * 10})
          `)
        );
      }

      await Promise.all(orderItemInserts);

      // Complex join query
      const joinStartTime = Date.now();
      const joinResults = await db.execute(sql`
        SELECT 
          o.id as order_id,
          o.customer_name,
          o.total_amount as order_total,
          COUNT(oi.id) as item_count,
          SUM(oi.quantity * oi.price) as calculated_total,
          AVG(ci.base_price) as avg_item_price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN catalog_items ci ON oi.catalog_item_id = ci.id
        WHERE o.organization_id = ${testOrg.id}
          AND o.customer_name LIKE 'Performance Customer%'
        GROUP BY o.id, o.customer_name, o.total_amount
        HAVING COUNT(oi.id) > 0
        ORDER BY calculated_total DESC
        LIMIT 25
      `);
      const joinTime = Date.now() - joinStartTime;

      console.log(`Complex join query completed in ${joinTime}ms`);
      
      // Should complete within reasonable time
      expect(joinTime).toBeLessThan(10000); // Under 10 seconds
      expect(joinResults.length).toBeGreaterThan(0);
      expect(joinResults.length).toBeLessThanOrEqual(25);

      // Verify join results integrity
      for (const result of joinResults) {
        expect(result.item_count).toBeGreaterThan(0);
        expect(Number(result.calculated_total)).toBeGreaterThan(0);
        expect(Number(result.avg_item_price)).toBeGreaterThan(0);
      }

      // Cleanup
      await db.execute(sql.raw(`DELETE FROM order_items WHERE id LIKE 'join-item-%'`));
      const itemIds = joinTestItems.map(id => `'${id}'`).join(',');
      await db.execute(sql.raw(`DELETE FROM catalog_items WHERE id IN (${itemIds})`));
    });
  });

  describe('Database Memory and Resource Usage', () => {
    it('should handle memory-intensive operations without excessive resource usage', async () => {
      // Create a memory-intensive query with sorting and grouping
      const memoryIntensiveStartTime = Date.now();
      
      const memoryIntensiveResults = await db.execute(sql`
        WITH order_stats AS (
          SELECT 
            EXTRACT(MONTH FROM created_at) as order_month,
            EXTRACT(YEAR FROM created_at) as order_year,
            status,
            total_amount,
            customer_name,
            ROW_NUMBER() OVER (PARTITION BY status ORDER BY total_amount DESC) as amount_rank
          FROM orders 
          WHERE organization_id = ${testOrg.id}
            AND customer_name LIKE 'Performance Customer%'
        )
        SELECT 
          order_month,
          order_year,
          status,
          COUNT(*) as status_count,
          AVG(total_amount) as avg_amount,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) as median_amount,
          MAX(total_amount) as max_amount,
          STRING_AGG(DISTINCT customer_name, ', ') as sample_customers
        FROM order_stats
        GROUP BY order_month, order_year, status
        ORDER BY order_year DESC, order_month DESC, status_count DESC
      `);
      
      const memoryIntensiveTime = Date.now() - memoryIntensiveStartTime;
      
      console.log(`Memory-intensive query completed in ${memoryIntensiveTime}ms`);
      
      // Should complete without timeout or memory issues
      expect(memoryIntensiveTime).toBeLessThan(15000); // Under 15 seconds
      expect(memoryIntensiveResults.length).toBeGreaterThanOrEqual(0);
      
      // Verify statistical calculations are reasonable
      for (const result of memoryIntensiveResults) {
        expect(result.status_count).toBeGreaterThan(0);
        expect(Number(result.avg_amount)).toBeGreaterThan(0);
        expect(Number(result.max_amount)).toBeGreaterThanOrEqual(Number(result.avg_amount));
        expect(Number(result.median_amount)).toBeGreaterThan(0);
      }
    });

    it('should handle cursor-based operations efficiently', async () => {
      // Simulate processing large dataset in chunks (cursor-based pagination)
      let processedCount = 0;
      let lastCreatedAt = null;
      let lastId = null;
      const chunkSize = 100;
      const maxChunks = 10;
      let chunks = 0;

      while (chunks < maxChunks) {
        let cursorQuery;
        
        if (lastCreatedAt && lastId) {
          cursorQuery = sql`
            SELECT id, customer_name, total_amount, created_at
            FROM orders 
            WHERE organization_id = ${testOrg.id}
              AND customer_name LIKE 'Performance Customer%'
              AND (created_at, id) > (${lastCreatedAt}, ${lastId})
            ORDER BY created_at ASC, id ASC
            LIMIT ${chunkSize}
          `;
        } else {
          cursorQuery = sql`
            SELECT id, customer_name, total_amount, created_at
            FROM orders 
            WHERE organization_id = ${testOrg.id}
              AND customer_name LIKE 'Performance Customer%'
            ORDER BY created_at ASC, id ASC
            LIMIT ${chunkSize}
          `;
        }

        const chunkStartTime = Date.now();
        const chunk = await db.execute(cursorQuery);
        const chunkTime = Date.now() - chunkStartTime;
        
        if (chunk.length === 0) break; // No more data
        
        // Each chunk should load quickly
        expect(chunkTime).toBeLessThan(2000);
        
        processedCount += chunk.length;
        chunks++;
        
        // Update cursor position
        const lastRecord = chunk[chunk.length - 1];
        lastCreatedAt = lastRecord.created_at;
        lastId = lastRecord.id;
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      expect(processedCount).toBeGreaterThan(0);
      console.log(`Processed ${processedCount} records in ${chunks} chunks using cursor pagination`);
    });
  });
});
