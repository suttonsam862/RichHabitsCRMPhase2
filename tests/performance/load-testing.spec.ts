import { test, expect } from '@playwright/test';
import { createTestUser, createTestOrganization, getAuthToken, createBulkTestData } from '../helpers/test-setup';

test.describe('Performance and Load Testing', () => {
  let testUser: any;
  let testOrg: any;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUser({
      email: 'perf-test@example.com',
      fullName: 'Performance Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Performance Test Org',
      ownerId: testUser.id
    });

    authToken = await getAuthToken(testUser.id);

    // Create bulk test data for performance testing
    await createBulkTestData(100, testOrg.id);
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    // Navigate to orders page with large dataset
    const startTime = Date.now();
    await page.goto('/orders');
    
    // Wait for data to load
    await expect(page.locator('[data-testid="orders-list"]')).toBeVisible();
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Should implement pagination for large datasets
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    
    // Check that not all 100 orders are loaded at once
    const orderRows = page.locator('[data-testid^="order-row-"]');
    const orderCount = await orderRows.count();
    expect(orderCount).toBeLessThanOrEqual(25); // Should be paginated
  });

  test('should maintain responsiveness during bulk operations', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    await page.goto('/orders');

    // Select multiple orders for bulk operation
    await page.check('[data-testid="select-all-orders"]');
    
    // Perform bulk update
    const startTime = Date.now();
    await page.click('[data-testid="bulk-actions-menu"]');
    await page.click('[data-testid="bulk-action-update-status"]');
    await page.selectOption('[data-testid="bulk-status-select"]', 'in_progress');
    await page.click('[data-testid="confirm-bulk-update"]');

    // Wait for operation to complete
    await expect(page.locator('[data-testid="bulk-success-message"]')).toBeVisible();
    const operationTime = Date.now() - startTime;

    // Should complete within reasonable time
    expect(operationTime).toBeLessThan(10000);

    // Page should remain responsive during operation
    await page.click('[data-testid="search-input"]');
    await page.type('[data-testid="search-input"]', 'test search');
    // Should be able to type without lag
  });

  test('should handle concurrent users efficiently', async ({ browser }) => {
    const contexts = [];
    const pages = [];

    try {
      // Create multiple browser contexts to simulate concurrent users
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Login each user
        await page.goto('/');
        await page.evaluate((token) => {
          localStorage.setItem('auth_token', token);
        }, authToken);
        
        contexts.push(context);
        pages.push(page);
      }

      // Simulate concurrent activity
      const startTime = Date.now();
      const promises = pages.map(async (page, index) => {
        // Each user performs different actions simultaneously
        switch (index % 3) {
          case 0:
            await page.goto('/orders');
            await page.click('[data-testid="button-new-order"]');
            await page.fill('[data-testid="input-customer-name"]', `Concurrent Customer ${index}`);
            await page.fill('[data-testid="input-total-amount"]', '100');
            await page.click('[data-testid="button-submit"]');
            break;
          case 1:
            await page.goto('/catalog');
            await page.click('[data-testid="search-input"]');
            await page.type('[data-testid="search-input"]', 'test item');
            await page.press('[data-testid="search-input"]', 'Enter');
            break;
          case 2:
            await page.goto('/dashboard');
            await page.click('[data-testid="refresh-data"]');
            break;
        }
      });

      await Promise.all(promises);
      const concurrentTime = Date.now() - startTime;

      // Should handle concurrent users without significant performance degradation
      expect(concurrentTime).toBeLessThan(15000);

    } finally {
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should implement proper caching for static resources', async ({ page }) => {
    await page.goto('/');

    // Check that static assets are properly cached
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css') || response.url().includes('.png')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });

    await page.goto('/dashboard');
    await page.goto('/orders');
    await page.goto('/dashboard'); // Revisit to test cache

    // Check cache headers
    const cachedResponses = responses.filter(r => 
      r.headers['cache-control'] && r.headers['cache-control'].includes('max-age')
    );
    
    expect(cachedResponses.length).toBeGreaterThan(0);
  });

  test('should handle search performance with large datasets', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    await page.goto('/orders');

    // Test search performance
    const searchTerms = ['Customer', 'Test', 'Order', '100', 'pending'];
    
    for (const term of searchTerms) {
      const startTime = Date.now();
      
      await page.fill('[data-testid="search-input"]', term);
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Wait for search results
      await page.waitForLoadState('networkidle');
      const searchTime = Date.now() - startTime;

      // Search should be fast (under 2 seconds)
      expect(searchTime).toBeLessThan(2000);

      // Clear search for next iteration
      await page.fill('[data-testid="search-input"]', '');
    }
  });

  test('should handle memory efficiently during navigation', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    // Navigate through multiple pages to test memory usage
    const pages = ['/dashboard', '/orders', '/catalog', '/users', '/reports'];
    
    for (let i = 0; i < 3; i++) { // Multiple rounds
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Check for memory leaks by monitoring JS heap size
        const heapSize = await page.evaluate(() => {
          if (performance.memory) {
            return performance.memory.usedJSHeapSize;
          }
          return 0;
        });

        // Heap size shouldn't grow excessively (this is a rough check)
        if (heapSize > 0) {
          expect(heapSize).toBeLessThan(100 * 1024 * 1024); // 100MB threshold
        }
      }
    }
  });

  test('should handle file upload performance', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    await page.goto('/profile');

    // Test file upload performance with various file sizes
    const fileSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB
    
    for (const size of fileSizes) {
      const fileBuffer = Buffer.alloc(size, 'x');
      
      const startTime = Date.now();
      
      await page.setInputFiles('[data-testid="file-upload-avatar"]', {
        name: `test-${size}.jpg`,
        mimeType: 'image/jpeg',
        buffer: fileBuffer
      });

      // Wait for upload to complete
      await expect(page.locator('[data-testid="upload-success"]').or(page.locator('[data-testid="upload-progress"]'))).toBeVisible();
      
      const uploadTime = Date.now() - startTime;

      // Upload time should be reasonable (under 5 seconds for test files)
      expect(uploadTime).toBeLessThan(5000);
    }
  });

  test('should handle API rate limiting gracefully', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);

    await page.goto('/orders');

    // Rapidly make requests to test rate limiting
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        page.evaluate(async () => {
          try {
            const response = await fetch('/api/orders', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });
            return {
              status: response.status,
              success: response.ok
            };
          } catch (error) {
            return { error: error.message };
          }
        })
      );
    }

    const results = await Promise.all(requests);
    
    // Some requests should be rate limited (429) but not all
    const rateLimited = results.filter(r => r.status === 429);
    const successful = results.filter(r => r.success);
    
    expect(rateLimited.length).toBeGreaterThan(0); // Rate limiting should kick in
    expect(successful.length).toBeGreaterThan(0); // But some should succeed

    // UI should handle rate limiting gracefully
    await expect(page.locator('[data-testid="rate-limit-warning"]').or(page.locator('[data-testid="orders-list"]'))).toBeVisible();
  });
});