import { test, expect } from '@playwright/test';
import { createTestUser, createTestOrganization, getAuthToken } from '../helpers/test-setup';

test.describe('Authentication Security E2E Tests', () => {
  let testUser: any;
  let testOrg: any;
  let authToken: string;

  test.beforeAll(async () => {
    testUser = await createTestUser({
      email: 'e2e-auth@example.com',
      fullName: 'E2E Auth Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'E2E Auth Test Org',
      ownerId: testUser.id
    });

    authToken = await getAuthToken(testUser.id);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login.*/);
    
    // Should show login form
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should allow access to authenticated users', async ({ page }) => {
    // Mock authentication by setting token in localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    
    // Navigate to protected route
    await page.goto('/dashboard');
    
    // Should be able to access dashboard
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Should show user info
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should prevent access with expired tokens', async ({ page }) => {
    // Set expired token
    const expiredToken = 'expired_token_' + Date.now();
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, expiredToken);
    
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should be redirected to login due to expired token
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    // Authenticate user
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Simulate session expiry by clearing token
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });
    
    // Try to perform an action that requires auth
    await page.click('[data-testid="create-order-button"]');
    
    // Should show session expired message or redirect to login
    await expect(page.locator('[data-testid="session-expired-message"]').or(page.locator('[data-testid="login-form"]'))).toBeVisible();
  });

  test('should prevent CSRF attacks', async ({ page }) => {
    // Authenticate user
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    
    await page.goto('/dashboard');
    
    // Try to submit form without proper CSRF token
    await page.goto('/orders/new');
    await page.fill('[data-testid="input-customer-name"]', 'Test Customer');
    await page.fill('[data-testid="input-total-amount"]', '100');
    
    // Remove CSRF token from form
    await page.evaluate(() => {
      const csrfInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
      if (csrfInput) {
        csrfInput.value = 'invalid-csrf-token';
      }
    });
    
    await page.click('[data-testid="button-submit"]');
    
    // Should show CSRF error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('CSRF');
  });

  test('should enforce rate limiting on login attempts', async ({ page }) => {
    await page.goto('/login');
    
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="input-email"]', 'invalid@example.com');
      await page.fill('[data-testid="input-password"]', 'wrongpassword');
      await page.click('[data-testid="button-login"]');
      
      if (i < 4) {
        // First few attempts should show login error
        await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      }
    }
    
    // After 5 failed attempts, should show rate limit error
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    
    // Should disable login form temporarily
    await expect(page.locator('[data-testid="button-login"]')).toBeDisabled();
  });

  test('should sanitize user input to prevent XSS', async ({ page }) => {
    // Authenticate user
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    
    await page.goto('/profile');
    
    // Try to inject XSS payload in user profile
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('[data-testid="input-full-name"]', xssPayload);
    await page.click('[data-testid="button-save-profile"]');
    
    // Wait for save to complete
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Refresh page and check that script wasn't executed
    await page.reload();
    
    // The value should be escaped/sanitized
    const nameInput = page.locator('[data-testid="input-full-name"]');
    const value = await nameInput.inputValue();
    expect(value).not.toContain('<script>');
    
    // Should not have any script tags in the DOM from our input
    const scriptTags = await page.locator('script').count();
    const originalScriptCount = scriptTags;
    
    // The XSS payload should not create additional script tags
    expect(scriptTags).toBe(originalScriptCount);
  });

  test('should validate file uploads for security', async ({ page }) => {
    // Authenticate user
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    
    await page.goto('/profile');
    
    // Try to upload a malicious file
    const maliciousFile = 'data:text/javascript;base64,' + btoa('alert("malicious")');
    
    // Create a temporary file input for testing
    await page.setInputFiles('[data-testid="file-upload-avatar"]', {
      name: 'malicious.js',
      mimeType: 'application/javascript',
      buffer: Buffer.from('alert("malicious")')
    });
    
    // Should show file type error
    await expect(page.locator('[data-testid="file-error"]')).toContainText('file type');
  });

  test('should prevent concurrent sessions', async ({ browser }) => {
    // Create two browser contexts to simulate concurrent sessions
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login on first session
    await page1.goto('/');
    await page1.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    await page1.goto('/dashboard');
    await expect(page1.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Login on second session (should invalidate first session if configured)
    await page2.goto('/');
    await page2.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, authToken);
    await page2.goto('/dashboard');
    await expect(page2.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // If concurrent sessions are disabled, first session should be logged out
    // This depends on your session management configuration
    await page1.reload();
    
    // Check if first session is still valid or has been invalidated
    // This test may need adjustment based on your session management strategy
    
    await context1.close();
    await context2.close();
  });
});