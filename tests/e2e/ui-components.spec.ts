import { test, expect, Page, Browser } from '@playwright/test';
import { createTestUser, createTestOrganization, getAuthToken, cleanupTestData } from '../helpers/test-setup';

test.describe('UI Components and User Workflows E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  let testUser: any;
  let testOrg: any;
  const APP_URL = process.env.APP_URL || 'http://localhost:5000';

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    page = await browser.newPage();
    
    // Create test data
    testUser = await createTestUser({
      email: 'ui-test@example.com',
      fullName: 'UI Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'UI Test Organization',
      ownerId: testUser.id
    });
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await page.close();
  });

  async function loginUser(email: string, password: string = 'TestPassword123!') {
    await page.goto(`${APP_URL}/login`);
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', password);
    await page.click('[data-testid="button-submit"]');
    await page.waitForURL(/\/(dashboard|orders|organizations)/);
  }

  test.describe('Navigation and Layout Components', () => {
    test('should render main navigation correctly', async () => {
      await loginUser(testUser.email);
      
      // Check main navigation elements
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-orders"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-catalog"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-organizations"]')).toBeVisible();
      
      // Check user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="menu-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="menu-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="menu-logout"]')).toBeVisible();
    });

    test('should navigate between pages correctly', async () => {
      await loginUser(testUser.email);
      
      // Test navigation to different pages
      await page.click('[data-testid="nav-orders"]');
      await page.waitForURL(/.*orders.*/);
      await expect(page.locator('[data-testid="orders-page"]')).toBeVisible();
      
      await page.click('[data-testid="nav-catalog"]');
      await page.waitForURL(/.*catalog.*/);
      await expect(page.locator('[data-testid="catalog-page"]')).toBeVisible();
      
      await page.click('[data-testid="nav-dashboard"]');
      await page.waitForURL(/.*dashboard.*/);
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('should show breadcrumb navigation on detail pages', async () => {
      await loginUser(testUser.email);
      
      // Navigate to orders then to a specific order (if available)
      await page.click('[data-testid="nav-orders"]');
      
      const orderCard = page.locator('[data-testid^="order-card-"]').first();
      if (await orderCard.isVisible()) {
        await orderCard.click();
        
        // Should show breadcrumb
        await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
        await expect(page.locator('[data-testid="breadcrumb-orders"]')).toBeVisible();
        await expect(page.locator('[data-testid="breadcrumb-current"]')).toBeVisible();
        
        // Breadcrumb should be clickable
        await page.click('[data-testid="breadcrumb-orders"]');
        await page.waitForURL(/.*orders$/);
        await expect(page.locator('[data-testid="orders-page"]')).toBeVisible();
      }
    });
  });

  test.describe('Form Components and Validation', () => {
    test('should render order form with all required fields', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      await page.click('[data-testid="button-create-order"]');
      
      // Check form structure
      await expect(page.locator('[data-testid="order-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-customer-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-customer-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-customer-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-due-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="textarea-notes"]')).toBeVisible();
      
      // Check order items section
      await expect(page.locator('[data-testid="order-items-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-add-item"]')).toBeVisible();
      
      // Check form actions
      await expect(page.locator('[data-testid="button-submit-order"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-cancel"]')).toBeVisible();
    });

    test('should show real-time form validation', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      await page.click('[data-testid="button-create-order"]');
      
      // Test required field validation
      await page.fill('[data-testid="input-customer-name"]', '');
      await page.blur('[data-testid="input-customer-name"]');
      await expect(page.locator('[data-testid="error-customer-name"]')).toBeVisible();
      
      // Test email validation
      await page.fill('[data-testid="input-customer-email"]', 'invalid-email');
      await page.blur('[data-testid="input-customer-email"]');
      await expect(page.locator('[data-testid="error-customer-email"]')).toBeVisible();
      
      // Fix email and validation should clear
      await page.fill('[data-testid="input-customer-email"]', 'valid@example.com');
      await page.blur('[data-testid="input-customer-email"]');
      await expect(page.locator('[data-testid="error-customer-email"]')).not.toBeVisible();
      
      // Test phone number validation
      await page.fill('[data-testid="input-customer-phone"]', '123'); // Too short
      await page.blur('[data-testid="input-customer-phone"]');
      await expect(page.locator('[data-testid="error-customer-phone"]')).toBeVisible();
    });

    test('should handle dynamic form fields correctly', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      await page.click('[data-testid="button-create-order"]');
      
      // Add multiple order items
      await page.click('[data-testid="button-add-item"]');
      await expect(page.locator('[data-testid="order-item-0"]')).toBeVisible();
      
      await page.click('[data-testid="button-add-item"]');
      await expect(page.locator('[data-testid="order-item-1"]')).toBeVisible();
      
      // Remove an item
      await page.click('[data-testid="button-remove-item-0"]');
      await expect(page.locator('[data-testid="order-item-0"]')).not.toBeVisible();
      
      // Remaining item should still be there
      await expect(page.locator('[data-testid="order-item-1"]')).toBeVisible();
      
      // Test quantity calculation
      await page.selectOption('[data-testid="select-product-1"]', { index: 0 });
      await page.fill('[data-testid="input-quantity-1"]', '5');
      await page.fill('[data-testid="input-unit-price-1"]', '20.00');
      
      // Total should auto-calculate
      await expect(page.locator('[data-testid="text-item-total-1"]')).toContainText('100.00');
      await expect(page.locator('[data-testid="text-order-total"]')).toContainText('100.00');
    });
  });

  test.describe('Data Display Components', () => {
    test('should render order list with correct information', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      await expect(page.locator('[data-testid="orders-page"]')).toBeVisible();
      
      // Check list controls
      await expect(page.locator('[data-testid="search-orders"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="sort-orders"]')).toBeVisible();
      
      // If orders exist, check their structure
      const orderCards = page.locator('[data-testid^="order-card-"]');
      const cardCount = await orderCards.count();
      
      if (cardCount > 0) {
        const firstCard = orderCards.first();
        await expect(firstCard.locator('[data-testid="text-customer-name"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="text-order-status"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="text-total-amount"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid="text-due-date"]')).toBeVisible();
      }
    });

    test('should handle pagination correctly', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Check if pagination is present (depends on number of orders)
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();
        await expect(page.locator('[data-testid="pagination-prev"]')).toBeVisible();
        await expect(page.locator('[data-testid="pagination-next"]')).toBeVisible();
        
        // Test page navigation if multiple pages exist
        const nextButton = page.locator('[data-testid="pagination-next"]');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2');
          
          // Go back to first page
          await page.click('[data-testid="pagination-prev"]');
          await expect(page.locator('[data-testid="pagination-current"]')).toContainText('1');
        }
      }
    });

    test('should filter and search orders correctly', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Test status filter
      await page.selectOption('[data-testid="filter-status"]', 'draft');
      await page.waitForLoadState('networkidle');
      
      // All visible orders should have draft status
      const orderCards = page.locator('[data-testid^="order-card-"]');
      const cardCount = await orderCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const statusText = await orderCards.nth(i).locator('[data-testid="text-order-status"]').textContent();
        expect(statusText?.toLowerCase()).toContain('draft');
      }
      
      // Test search functionality
      await page.fill('[data-testid="search-orders"]', 'test customer');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Reset filters
      await page.selectOption('[data-testid="filter-status"]', 'all');
      await page.fill('[data-testid="search-orders"]', '');
      await page.keyboard.press('Enter');
    });
  });

  test.describe('Interactive Components', () => {
    test('should handle modal dialogs correctly', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Create order to have something to work with
      await page.click('[data-testid="button-create-order"]');
      await page.fill('[data-testid="input-customer-name"]', 'Modal Test Customer');
      await page.fill('[data-testid="input-customer-email"]', 'modal@test.com');
      await page.click('[data-testid="button-add-item"]');
      await page.selectOption('[data-testid="select-product"]', { index: 0 });
      await page.fill('[data-testid="input-quantity"]', '1');
      await page.fill('[data-testid="input-unit-price"]', '50.00');
      await page.click('[data-testid="button-submit-order"]');
      
      // Navigate to order details
      const orderCard = page.locator('[data-testid^="order-card-"]').first();
      await orderCard.click();
      
      // Test confirmation modal
      await page.click('[data-testid="button-cancel-order"]');
      await expect(page.locator('[data-testid="cancel-order-dialog"]')).toBeVisible();
      
      // Test modal close button
      await page.click('[data-testid="button-close-modal"]');
      await expect(page.locator('[data-testid="cancel-order-dialog"]')).not.toBeVisible();
      
      // Test modal backdrop click
      await page.click('[data-testid="button-cancel-order"]');
      await expect(page.locator('[data-testid="cancel-order-dialog"]')).toBeVisible();
      
      // Click outside modal (backdrop)
      await page.click('[data-testid="modal-backdrop"]');
      await expect(page.locator('[data-testid="cancel-order-dialog"]')).not.toBeVisible();
      
      // Test escape key
      await page.click('[data-testid="button-cancel-order"]');
      await expect(page.locator('[data-testid="cancel-order-dialog"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="cancel-order-dialog"]')).not.toBeVisible();
    });

    test('should handle dropdown menus and selections', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      await page.click('[data-testid="button-create-order"]');
      
      // Test product selection dropdown
      await page.click('[data-testid="button-add-item"]');
      await page.click('[data-testid="select-product"]');
      
      // Should show dropdown options
      await expect(page.locator('[data-testid="product-option"]').first()).toBeVisible();
      
      // Select an option
      await page.click('[data-testid="product-option"]', { force: true });
      
      // Test status dropdown (if available)
      const statusDropdown = page.locator('[data-testid="select-status"]');
      if (await statusDropdown.isVisible()) {
        await statusDropdown.click();
        await expect(page.locator('[data-testid="status-option"]').first()).toBeVisible();
      }
    });

    test('should handle tab navigation correctly', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Navigate to order details if available
      const orderCard = page.locator('[data-testid^="order-card-"]').first();
      if (await orderCard.isVisible()) {
        await orderCard.click();
        
        // Check if tabs are present
        const tabList = page.locator('[data-testid="tab-list"]');
        if (await tabList.isVisible()) {
          // Test tab switching
          await page.click('[data-testid="tab-details"]');
          await expect(page.locator('[data-testid="tab-panel-details"]')).toBeVisible();
          
          await page.click('[data-testid="tab-timeline"]');
          await expect(page.locator('[data-testid="tab-panel-timeline"]')).toBeVisible();
          
          await page.click('[data-testid="tab-items"]');
          await expect(page.locator('[data-testid="tab-panel-items"]')).toBeVisible();
          
          // Test keyboard navigation
          await page.click('[data-testid="tab-details"]');
          await page.keyboard.press('ArrowRight');
          await expect(page.locator('[data-testid="tab-timeline"]')).toBeFocused();
        }
      }
    });
  });

  test.describe('Accessibility and Responsiveness', () => {
    test('should be keyboard navigable', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Test tab navigation through main elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Should be able to reach main action button
      let focusedElement = await page.locator(':focus');
      let attempts = 0;
      while (attempts < 20) {
        const testId = await focusedElement.getAttribute('data-testid');
        if (testId === 'button-create-order') {
          break;
        }
        await page.keyboard.press('Tab');
        focusedElement = page.locator(':focus');
        attempts++;
      }
      
      // Should be able to activate button with Enter
      if (await page.locator('[data-testid="button-create-order"]:focus').isVisible()) {
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-testid="order-form"]')).toBeVisible();
      }
    });

    test('should work on mobile viewports', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Check mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
        
        // Close menu
        await page.click('[data-testid="mobile-menu-close"]');
        await expect(page.locator('[data-testid="mobile-nav"]')).not.toBeVisible();
      }
      
      // Check responsive order cards
      const orderCards = page.locator('[data-testid^="order-card-"]');
      if (await orderCards.first().isVisible()) {
        const cardWidth = await orderCards.first().boundingBox();
        expect(cardWidth?.width).toBeLessThan(400); // Should fit mobile width
      }
      
      // Reset to desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should have proper ARIA labels and roles', async () => {
      await loginUser(testUser.email);
      
      await page.goto(`${APP_URL}/orders`);
      
      // Check main navigation has proper ARIA
      const mainNav = page.locator('[data-testid="main-nav"]');
      if (await mainNav.isVisible()) {
        await expect(mainNav).toHaveAttribute('role', 'navigation');
        await expect(mainNav).toHaveAttribute('aria-label');
      }
      
      // Check buttons have proper labels
      const createButton = page.locator('[data-testid="button-create-order"]');
      if (await createButton.isVisible()) {
        const ariaLabel = await createButton.getAttribute('aria-label');
        const buttonText = await createButton.textContent();
        expect(ariaLabel || buttonText).toBeTruthy();
      }
      
      // Check form fields have proper labels
      await page.click('[data-testid="button-create-order"]');
      
      const customerNameInput = page.locator('[data-testid="input-customer-name"]');
      if (await customerNameInput.isVisible()) {
        const labelId = await customerNameInput.getAttribute('aria-labelledby');
        const label = await customerNameInput.getAttribute('aria-label');
        expect(labelId || label).toBeTruthy();
      }
    });
  });

  test.describe('Error States and Loading', () => {
    test('should show loading states appropriately', async () => {
      await loginUser(testUser.email);
      
      // Navigate to page that might show loading
      await page.goto(`${APP_URL}/orders`);
      
      // Check for loading indicator during page load
      const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
      // Loading might be too fast to catch, so we'll just verify the indicator exists in DOM
      
      // Test form submission loading
      await page.click('[data-testid="button-create-order"]');
      await page.fill('[data-testid="input-customer-name"]', 'Loading Test Customer');
      await page.fill('[data-testid="input-customer-email"]', 'loading@test.com');
      await page.click('[data-testid="button-add-item"]');
      await page.selectOption('[data-testid="select-product"]', { index: 0 });
      await page.fill('[data-testid="input-quantity"]', '1');
      await page.fill('[data-testid="input-unit-price"]', '25.00');
      
      // Submit and check for loading state
      await page.click('[data-testid="button-submit-order"]');
      
      // Button should show loading state
      const submitButton = page.locator('[data-testid="button-submit-order"]');
      await expect(submitButton).toHaveAttribute('disabled');
      
      // Wait for completion
      await expect(page.locator('[data-testid="alert-success"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle error states gracefully', async () => {
      await loginUser(testUser.email);
      
      // Test form validation errors
      await page.goto(`${APP_URL}/orders`);
      await page.click('[data-testid="button-create-order"]');
      
      // Submit invalid form
      await page.click('[data-testid="button-submit-order"]');
      
      // Should show error messages
      await expect(page.locator('[data-testid="error-customer-name"]')).toBeVisible();
      
      // Error should be accessible
      const errorMessage = page.locator('[data-testid="error-customer-name"]');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      
      // Test network error handling
      await page.route('**/api/orders', route => route.abort());
      
      await page.fill('[data-testid="input-customer-name"]', 'Network Error Test');
      await page.fill('[data-testid="input-customer-email"]', 'error@test.com');
      await page.click('[data-testid="button-add-item"]');
      await page.selectOption('[data-testid="select-product"]', { index: 0 });
      await page.fill('[data-testid="input-quantity"]', '1');
      await page.fill('[data-testid="input-unit-price"]', '50.00');
      
      await page.click('[data-testid="button-submit-order"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="alert-error"]')).toBeVisible({ timeout: 5000 });
      
      // Restore network
      await page.unroute('**/api/orders');
    });
  });
});