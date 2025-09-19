import { test, expect } from '@playwright/test';
import { createTestUser, createTestOrganization, getAuthToken } from '../helpers/test-setup';

test.describe('Organization Access Control E2E Tests', () => {
  let user1: any, user2: any;
  let org1: any, org2: any;
  let token1: string, token2: string;

  test.beforeAll(async () => {
    // Create two users with their own organizations
    user1 = await createTestUser({
      email: 'e2e-org1@example.com',
      fullName: 'E2E Org1 User',
      role: 'admin'
    });

    user2 = await createTestUser({
      email: 'e2e-org2@example.com',
      fullName: 'E2E Org2 User',
      role: 'admin'
    });

    org1 = await createTestOrganization({
      name: 'E2E Test Org 1',
      ownerId: user1.id
    });

    org2 = await createTestOrganization({
      name: 'E2E Test Org 2',
      ownerId: user2.id
    });

    token1 = await getAuthToken(user1.id);
    token2 = await getAuthToken(user2.id);
  });

  test('should only show user\'s own organization data', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/dashboard');
    
    // Should show org1 name
    await expect(page.locator('[data-testid="org-name"]')).toContainText('E2E Test Org 1');
    
    // Should not show org2 data
    await expect(page.locator('[data-testid="org-name"]')).not.toContainText('E2E Test Org 2');
  });

  test('should prevent cross-organization data access via URL manipulation', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    // Try to access org2's data directly via URL
    await page.goto(`/organizations/${org2.id}/orders`);
    
    // Should show access denied or redirect
    await expect(page.locator('[data-testid="access-denied"]').or(page.locator('[data-testid="not-found"]'))).toBeVisible();
  });

  test('should prevent creating orders in other organizations', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/orders/new');
    
    // Fill out order form
    await page.fill('[data-testid="input-customer-name"]', 'Cross Org Customer');
    await page.fill('[data-testid="input-total-amount"]', '500');
    
    // Try to manipulate organization ID in the form
    await page.evaluate((orgId) => {
      const orgInput = document.querySelector('input[name="organizationId"]') as HTMLInputElement;
      if (orgInput) {
        orgInput.value = orgId;
      }
    }, org2.id);
    
    await page.click('[data-testid="button-submit"]');
    
    // Should show error or validation failure
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should not leak organization data in search results', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/orders');
    
    // Search for something that might exist in org2
    await page.fill('[data-testid="search-input"]', 'E2E Test Org 2');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Should not return any results from org2
    await expect(page.locator('[data-testid="search-results"]')).not.toContainText('E2E Test Org 2');
    
    // Should show "no results" or only org1 results
    await expect(page.locator('[data-testid="no-results"]').or(page.locator('[data-testid="search-results"]'))).toBeVisible();
  });

  test('should enforce organization context in API calls', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/dashboard');
    
    // Monitor network requests
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });
    
    // Perform actions that make API calls
    await page.click('[data-testid="orders-tab"]');
    await page.waitForLoadState('networkidle');
    
    // Check that API calls include proper organization context
    const orderApiCalls = apiCalls.filter(url => url.includes('/orders'));
    expect(orderApiCalls.length).toBeGreaterThan(0);
    
    // Verify organization ID is included in requests
    const hasOrgContext = orderApiCalls.some(url => 
      url.includes(`organizationId=${org1.id}`) || 
      url.includes(`/organizations/${org1.id}/`)
    );
    expect(hasOrgContext).toBe(true);
  });

  test('should handle organization switching securely', async ({ page }) => {
    // This test assumes user might be member of multiple orgs
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/dashboard');
    
    // Try to switch organization context via developer tools
    await page.evaluate((orgId) => {
      // Try to modify organization context in localStorage or sessionStorage
      localStorage.setItem('current_org_id', orgId);
      sessionStorage.setItem('org_context', orgId);
    }, org2.id);
    
    // Reload page to see if context changed
    await page.reload();
    
    // Should still show org1 data, not org2
    await expect(page.locator('[data-testid="org-name"]')).toContainText('E2E Test Org 1');
    await expect(page.locator('[data-testid="org-name"]')).not.toContainText('E2E Test Org 2');
  });

  test('should validate file access across organizations', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/files');
    
    // Try to access a file that might belong to org2
    // This assumes some file structure where files have org-specific paths
    const response = await page.request.get(`/api/files/organizations/${org2.id}/logo.png`, {
      headers: {
        'Authorization': `Bearer ${token1}`
      }
    });
    
    // Should return 403 Forbidden or 404 Not Found
    expect([403, 404]).toContain(response.status());
  });

  test('should prevent bulk operations across organizations', async ({ page }) => {
    // Login as user1
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page.goto('/orders');
    
    // Try to perform bulk operation with mixed organization IDs
    await page.evaluate(async (orgIds) => {
      try {
        const response = await fetch('/api/orders/bulk-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            operations: [
              { organizationId: orgIds.org1, orderId: 'order1', status: 'completed' },
              { organizationId: orgIds.org2, orderId: 'order2', status: 'completed' }
            ]
          })
        });
        
        window.bulkUpdateResponse = {
          status: response.status,
          ok: response.ok
        };
      } catch (error) {
        window.bulkUpdateResponse = { error: error.message };
      }
    }, { org1: org1.id, org2: org2.id });
    
    // Check the response
    const result = await page.evaluate(() => window.bulkUpdateResponse);
    
    // Should fail (403 or 400)
    expect(result.status).toBeGreaterThanOrEqual(400);
  });

  test('should maintain organization isolation in real-time updates', async ({ browser }) => {
    // Create two browser contexts for different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login as different users
    await page1.goto('/');
    await page1.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page2.goto('/');
    await page2.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token2);
    
    // Both go to orders page
    await page1.goto('/orders');
    await page2.goto('/orders');
    
    // User1 creates an order
    await page1.click('[data-testid="button-new-order"]');
    await page1.fill('[data-testid="input-customer-name"]', 'Real-time Test Customer');
    await page1.fill('[data-testid="input-total-amount"]', '250');
    await page1.click('[data-testid="button-submit"]');
    
    // Wait for creation
    await expect(page1.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Wait a bit for any real-time updates
    await page2.waitForTimeout(2000);
    
    // User2 should NOT see user1's order
    await expect(page2.locator('[data-testid="orders-list"]')).not.toContainText('Real-time Test Customer');
    
    await context1.close();
    await context2.close();
  });
});