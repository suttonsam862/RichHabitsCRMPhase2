import { test, expect, Page, Browser } from '@playwright/test';
import { createTestUser, createTestOrganization, getAuthToken, cleanupTestData } from '../helpers/test-setup';

test.describe('Complete Order Lifecycle E2E Tests', () => {
  let browser: Browser;
  let adminPage: Page;
  let memberPage: Page;
  let readonlyPage: Page;
  let testUser: any;
  let testOrg: any;
  let adminToken: string;
  const APP_URL = process.env.APP_URL || 'http://localhost:5000';

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    
    // Create test data
    testUser = await createTestUser({
      email: 'e2e-admin@example.com',
      fullName: 'E2E Admin User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'E2E Test Organization',
      ownerId: testUser.id
    });

    adminToken = await getAuthToken(testUser.id);

    // Setup pages for different user roles
    adminPage = await browser.newPage();
    memberPage = await browser.newPage();
    readonlyPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await adminPage.close();
    await memberPage.close();
    await readonlyPage.close();
  });

  async function loginUser(page: Page, email: string, password: string = 'TestPassword123!') {
    await page.goto(`${APP_URL}/login`);
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', password);
    await page.click('[data-testid="button-submit"]');
    
    // Wait for successful login and redirect
    await page.waitForURL(/\/(dashboard|orders|organizations)/);
  }

  test.describe('Complete Order Creation to Fulfillment Journey', () => {
    test('should complete full order lifecycle as admin user', async () => {
      // Step 1: Login as admin
      await loginUser(adminPage, testUser.email);
      
      // Verify dashboard loads
      await expect(adminPage.locator('[data-testid="dashboard-content"]')).toBeVisible();

      // Step 2: Navigate to orders page
      await adminPage.click('[data-testid="nav-orders"]');
      await adminPage.waitForURL(/.*orders.*/);
      await expect(adminPage.locator('[data-testid="orders-page"]')).toBeVisible();

      // Step 3: Create new order
      await adminPage.click('[data-testid="button-create-order"]');
      await expect(adminPage.locator('[data-testid="order-form"]')).toBeVisible();

      // Fill order form
      await adminPage.fill('[data-testid="input-customer-name"]', 'E2E Test Customer');
      await adminPage.fill('[data-testid="input-customer-email"]', 'customer@e2e-test.com');
      await adminPage.fill('[data-testid="input-customer-phone"]', '+1234567890');
      
      // Add order items
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { label: 'Test Product' });
      await adminPage.fill('[data-testid="input-quantity"]', '5');
      await adminPage.fill('[data-testid="input-unit-price"]', '50.00');

      // Set due date
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await adminPage.fill('[data-testid="input-due-date"]', dueDate.toISOString().split('T')[0]);

      // Add notes
      await adminPage.fill('[data-testid="textarea-notes"]', 'E2E test order - complete lifecycle');

      // Submit order
      await adminPage.click('[data-testid="button-submit-order"]');
      
      // Wait for success message and order creation
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="alert-success"]')).toContainText('Order created successfully');

      // Step 4: Verify order appears in list
      await adminPage.goto(`${APP_URL}/orders`);
      await expect(adminPage.locator('[data-testid="order-list"]')).toBeVisible();
      
      const orderCard = adminPage.locator('[data-testid^="order-card-"]').first();
      await expect(orderCard).toBeVisible();
      await expect(orderCard.locator('[data-testid="text-customer-name"]')).toContainText('E2E Test Customer');

      // Get order ID for subsequent steps
      const orderId = await orderCard.getAttribute('data-testid');
      const extractedOrderId = orderId?.replace('order-card-', '') || '';

      // Step 5: View order details
      await orderCard.click();
      await adminPage.waitForURL(/.*orders\/.*$/);
      await expect(adminPage.locator('[data-testid="order-detail-page"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="text-order-status"]')).toContainText('Draft');

      // Step 6: Progress order through statuses
      // Move to pending
      await adminPage.click('[data-testid="button-update-status"]');
      await adminPage.selectOption('[data-testid="select-status"]', 'pending');
      await adminPage.fill('[data-testid="textarea-status-notes"]', 'Moving to pending for review');
      await adminPage.click('[data-testid="button-confirm-status-update"]');
      
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="text-order-status"]')).toContainText('Pending');

      // Move to confirmed
      await adminPage.click('[data-testid="button-update-status"]');
      await adminPage.selectOption('[data-testid="select-status"]', 'confirmed');
      await adminPage.fill('[data-testid="textarea-status-notes"]', 'Order confirmed, ready for design');
      await adminPage.click('[data-testid="button-confirm-status-update"]');
      
      await expect(adminPage.locator('[data-testid="text-order-status"]')).toContainText('Confirmed');

      // Step 7: Create design job
      await adminPage.click('[data-testid="button-create-design-job"]');
      await expect(adminPage.locator('[data-testid="design-job-form"]')).toBeVisible();

      await adminPage.selectOption('[data-testid="select-designer"]', { index: 0 }); // Select first available designer
      await adminPage.selectOption('[data-testid="select-design-type"]', 'logo_placement');
      await adminPage.fill('[data-testid="textarea-design-requirements"]', 'Place company logo on front chest area');
      await adminPage.fill('[data-testid="input-design-due-date"]', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      await adminPage.selectOption('[data-testid="select-priority"]', 'high');

      await adminPage.click('[data-testid="button-submit-design-job"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toContainText('Design job created');

      // Step 8: Progress design job
      const designJobCard = adminPage.locator('[data-testid^="design-job-card-"]').first();
      await expect(designJobCard).toBeVisible();
      
      await designJobCard.click();
      await expect(adminPage.locator('[data-testid="design-job-detail-page"]')).toBeVisible();

      // Start design work
      await adminPage.click('[data-testid="button-start-design"]');
      await adminPage.fill('[data-testid="textarea-design-notes"]', 'Starting logo placement design');
      await adminPage.click('[data-testid="button-confirm-start"]');
      
      await expect(adminPage.locator('[data-testid="text-design-status"]')).toContainText('In Progress');

      // Complete design and submit for approval
      await adminPage.click('[data-testid="button-submit-for-approval"]');
      
      // Upload design file (mock)
      const fileInput = adminPage.locator('[data-testid="input-design-file"]');
      // In a real test, you would upload an actual file
      // await fileInput.setInputFiles('path/to/test-design.pdf');
      
      await adminPage.fill('[data-testid="textarea-submission-notes"]', 'Design completed - ready for client review');
      await adminPage.click('[data-testid="button-confirm-submission"]');
      
      await expect(adminPage.locator('[data-testid="text-design-status"]')).toContainText('Pending Approval');

      // Approve design (as admin)
      await adminPage.click('[data-testid="button-approve-design"]');
      await adminPage.fill('[data-testid="textarea-approval-notes"]', 'Design approved - proceed to manufacturing');
      await adminPage.click('[data-testid="button-confirm-approval"]');
      
      await expect(adminPage.locator('[data-testid="text-design-status"]')).toContainText('Approved');

      // Step 9: Create work order for manufacturing
      await adminPage.goto(`${APP_URL}/orders/${extractedOrderId}`);
      await adminPage.click('[data-testid="button-create-work-order"]');
      await expect(adminPage.locator('[data-testid="work-order-form"]')).toBeVisible();

      await adminPage.selectOption('[data-testid="select-manufacturer"]', { index: 0 });
      await adminPage.selectOption('[data-testid="select-production-technique"]', 'embroidery');
      await adminPage.fill('[data-testid="input-target-quantity"]', '5');
      await adminPage.fill('[data-testid="input-unit-cost"]', '25.00');
      await adminPage.fill('[data-testid="textarea-production-notes"]', 'Use high-quality embroidery thread');
      
      const manufacturingDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await adminPage.fill('[data-testid="input-manufacturing-due-date"]', manufacturingDueDate.toISOString().split('T')[0]);

      await adminPage.click('[data-testid="button-submit-work-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toContainText('Work order created');

      // Step 10: Progress work order through manufacturing
      const workOrderCard = adminPage.locator('[data-testid^="work-order-card-"]').first();
      await workOrderCard.click();
      await expect(adminPage.locator('[data-testid="work-order-detail-page"]')).toBeVisible();

      // Start production
      await adminPage.click('[data-testid="button-start-production"]');
      await adminPage.fill('[data-testid="textarea-production-start-notes"]', 'Production started - embroidery in progress');
      await adminPage.click('[data-testid="button-confirm-start-production"]');
      
      await expect(adminPage.locator('[data-testid="text-work-order-status"]')).toContainText('In Progress');

      // Complete production
      await adminPage.click('[data-testid="button-complete-production"]');
      await adminPage.fill('[data-testid="input-actual-quantity"]', '5');
      await adminPage.fill('[data-testid="input-actual-cost"]', '125.00');
      await adminPage.check('[data-testid="checkbox-quality-check-passed"]');
      await adminPage.fill('[data-testid="textarea-completion-notes"]', 'Production completed successfully - quality check passed');
      await adminPage.click('[data-testid="button-confirm-completion"]');
      
      await expect(adminPage.locator('[data-testid="text-work-order-status"]')).toContainText('Completed');

      // Step 11: Create fulfillment record
      await adminPage.goto(`${APP_URL}/orders/${extractedOrderId}`);
      await adminPage.click('[data-testid="button-create-fulfillment"]');
      await expect(adminPage.locator('[data-testid="fulfillment-form"]')).toBeVisible();

      // Fill shipping address
      await adminPage.fill('[data-testid="input-shipping-name"]', 'E2E Test Customer');
      await adminPage.fill('[data-testid="input-shipping-address1"]', '123 Test Street');
      await adminPage.fill('[data-testid="input-shipping-city"]', 'Test City');
      await adminPage.selectOption('[data-testid="select-shipping-state"]', 'CA');
      await adminPage.fill('[data-testid="input-shipping-zip"]', '90210');
      await adminPage.selectOption('[data-testid="select-shipping-country"]', 'US');

      // Select shipping method
      await adminPage.selectOption('[data-testid="select-shipping-method"]', 'priority');
      
      await adminPage.fill('[data-testid="textarea-fulfillment-notes"]', 'Rush order - handle with care');

      await adminPage.click('[data-testid="button-submit-fulfillment"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toContainText('Fulfillment record created');

      // Step 12: Progress fulfillment to completion
      const fulfillmentCard = adminPage.locator('[data-testid^="fulfillment-card-"]').first();
      await fulfillmentCard.click();
      await expect(adminPage.locator('[data-testid="fulfillment-detail-page"]')).toBeVisible();

      // Package items
      await adminPage.click('[data-testid="button-start-packaging"]');
      await adminPage.fill('[data-testid="textarea-packaging-notes"]', 'Items carefully packaged with protective materials');
      await adminPage.click('[data-testid="button-confirm-packaging"]');
      
      await expect(adminPage.locator('[data-testid="text-fulfillment-status"]')).toContainText('Packaging');

      // Mark ready to ship
      await adminPage.click('[data-testid="button-ready-to-ship"]');
      await adminPage.fill('[data-testid="input-tracking-number"]', 'TRK123456789');
      await adminPage.selectOption('[data-testid="select-carrier"]', 'FedEx');
      await adminPage.click('[data-testid="button-confirm-ready-to-ship"]');
      
      await expect(adminPage.locator('[data-testid="text-fulfillment-status"]')).toContainText('Ready to Ship');

      // Ship package
      await adminPage.click('[data-testid="button-ship-package"]');
      await adminPage.fill('[data-testid="input-tracking-url"]', 'https://fedex.com/track/TRK123456789');
      await adminPage.fill('[data-testid="textarea-shipping-notes"]', 'Package shipped via FedEx Priority');
      await adminPage.click('[data-testid="button-confirm-shipment"]');
      
      await expect(adminPage.locator('[data-testid="text-fulfillment-status"]')).toContainText('Shipped');

      // Mark as delivered
      await adminPage.click('[data-testid="button-mark-delivered"]');
      await adminPage.selectOption('[data-testid="select-delivery-confirmation"]', 'SIGNED');
      await adminPage.fill('[data-testid="textarea-delivery-notes"]', 'Package delivered and signed for by recipient');
      await adminPage.click('[data-testid="button-confirm-delivery"]');
      
      await expect(adminPage.locator('[data-testid="text-fulfillment-status"]')).toContainText('Delivered');

      // Step 13: Complete order
      await adminPage.goto(`${APP_URL}/orders/${extractedOrderId}`);
      await adminPage.click('[data-testid="button-complete-order"]');
      await adminPage.fill('[data-testid="textarea-completion-notes"]', 'Order successfully completed - customer satisfied');
      await adminPage.click('[data-testid="button-confirm-order-completion"]');
      
      await expect(adminPage.locator('[data-testid="text-order-status"]')).toContainText('Completed');

      // Step 14: Verify order timeline shows complete journey
      await adminPage.click('[data-testid="tab-order-timeline"]');
      await expect(adminPage.locator('[data-testid="order-timeline"]')).toBeVisible();
      
      // Check that all major milestones are present
      const timelineEvents = adminPage.locator('[data-testid^="timeline-event-"]');
      await expect(timelineEvents).toHaveCount(8); // Draft, Pending, Confirmed, Design, Manufacturing, Packaging, Shipped, Completed

      // Verify final order summary
      await adminPage.click('[data-testid="tab-order-summary"]');
      await expect(adminPage.locator('[data-testid="summary-customer-name"]')).toContainText('E2E Test Customer');
      await expect(adminPage.locator('[data-testid="summary-total-amount"]')).toContainText('250.00');
      await expect(adminPage.locator('[data-testid="summary-status"]')).toContainText('Completed');
    });

    test('should handle order cancellation workflow', async () => {
      // Login and create a test order
      await loginUser(adminPage, testUser.email);
      
      await adminPage.goto(`${APP_URL}/orders`);
      await adminPage.click('[data-testid="button-create-order"]');
      
      await adminPage.fill('[data-testid="input-customer-name"]', 'Cancellation Test Customer');
      await adminPage.fill('[data-testid="input-customer-email"]', 'cancel@test.com');
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await adminPage.fill('[data-testid="input-quantity"]', '2');
      await adminPage.fill('[data-testid="input-unit-price"]', '75.00');
      
      await adminPage.click('[data-testid="button-submit-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();

      // Navigate to order details
      const orderCard = adminPage.locator('[data-testid^="order-card-"]').first();
      await orderCard.click();

      // Cancel order
      await adminPage.click('[data-testid="button-cancel-order"]');
      await expect(adminPage.locator('[data-testid="cancel-order-dialog"]')).toBeVisible();
      
      await adminPage.selectOption('[data-testid="select-cancellation-reason"]', 'customer_request');
      await adminPage.fill('[data-testid="textarea-cancellation-notes"]', 'Customer requested cancellation');
      await adminPage.click('[data-testid="button-confirm-cancellation"]');
      
      await expect(adminPage.locator('[data-testid="alert-success"]')).toContainText('Order cancelled successfully');
      await expect(adminPage.locator('[data-testid="text-order-status"]')).toContainText('Cancelled');
    });

    test('should handle order modification workflow', async () => {
      // Login and create a test order
      await loginUser(adminPage, testUser.email);
      
      await adminPage.goto(`${APP_URL}/orders`);
      await adminPage.click('[data-testid="button-create-order"]');
      
      await adminPage.fill('[data-testid="input-customer-name"]', 'Modification Test Customer');
      await adminPage.fill('[data-testid="input-customer-email"]', 'modify@test.com');
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await adminPage.fill('[data-testid="input-quantity"]', '3');
      await adminPage.fill('[data-testid="input-unit-price"]', '60.00');
      
      await adminPage.click('[data-testid="button-submit-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();

      // Navigate to order details and modify
      const orderCard = adminPage.locator('[data-testid^="order-card-"]').first();
      await orderCard.click();

      // Edit order details
      await adminPage.click('[data-testid="button-edit-order"]');
      await expect(adminPage.locator('[data-testid="order-edit-form"]')).toBeVisible();
      
      await adminPage.fill('[data-testid="input-customer-phone"]', '+1987654321');
      await adminPage.fill('[data-testid="textarea-notes"]', 'Updated order with phone number');
      
      // Modify order items
      await adminPage.click('[data-testid="button-edit-item-0"]');
      await adminPage.fill('[data-testid="input-quantity-0"]', '5'); // Increase quantity
      await adminPage.click('[data-testid="button-save-item-0"]');
      
      await adminPage.click('[data-testid="button-save-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toContainText('Order updated successfully');
      
      // Verify changes
      await expect(adminPage.locator('[data-testid="text-customer-phone"]')).toContainText('+1987654321');
      await expect(adminPage.locator('[data-testid="text-item-quantity-0"]')).toContainText('5');
    });
  });

  test.describe('Permission-based Access Control', () => {
    test('should restrict readonly users from making changes', async () => {
      // Create readonly user
      const readonlyUser = await createTestUser({
        email: 'e2e-readonly@example.com',
        fullName: 'E2E Readonly User',
        role: 'readonly',
        organizationId: testOrg.id
      });

      await loginUser(readonlyPage, readonlyUser.email);

      // Navigate to orders page
      await readonlyPage.goto(`${APP_URL}/orders`);
      await expect(readonlyPage.locator('[data-testid="orders-page"]')).toBeVisible();

      // Should not see create order button
      await expect(readonlyPage.locator('[data-testid="button-create-order"]')).not.toBeVisible();

      // Should be able to view order details but not edit
      const orderCard = readonlyPage.locator('[data-testid^="order-card-"]').first();
      if (await orderCard.isVisible()) {
        await orderCard.click();
        await expect(readonlyPage.locator('[data-testid="order-detail-page"]')).toBeVisible();
        
        // Should not see edit buttons
        await expect(readonlyPage.locator('[data-testid="button-edit-order"]')).not.toBeVisible();
        await expect(readonlyPage.locator('[data-testid="button-update-status"]')).not.toBeVisible();
        await expect(readonlyPage.locator('[data-testid="button-cancel-order"]')).not.toBeVisible();
      }
    });

    test('should allow member users basic order operations', async () => {
      // Create member user
      const memberUser = await createTestUser({
        email: 'e2e-member@example.com',
        fullName: 'E2E Member User',
        role: 'member',
        organizationId: testOrg.id
      });

      await loginUser(memberPage, memberUser.email);

      // Navigate to orders page
      await memberPage.goto(`${APP_URL}/orders`);
      
      // Should see create order button
      await expect(memberPage.locator('[data-testid="button-create-order"]')).toBeVisible();

      // Should be able to create basic orders
      await memberPage.click('[data-testid="button-create-order"]');
      await expect(memberPage.locator('[data-testid="order-form"]')).toBeVisible();
      
      await memberPage.fill('[data-testid="input-customer-name"]', 'Member Test Customer');
      await memberPage.fill('[data-testid="input-customer-email"]', 'member@test.com');
      await memberPage.click('[data-testid="button-add-item"]');
      await memberPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await memberPage.fill('[data-testid="input-quantity"]', '1');
      await memberPage.fill('[data-testid="input-unit-price"]', '100.00');
      
      await memberPage.click('[data-testid="button-submit-order"]');
      await expect(memberPage.locator('[data-testid="alert-success"]')).toBeVisible();

      // Should be able to edit their own orders
      const orderCard = memberPage.locator('[data-testid^="order-card-"]').first();
      await orderCard.click();
      await expect(memberPage.locator('[data-testid="button-edit-order"]')).toBeVisible();

      // But should not see admin-only functions
      await expect(memberPage.locator('[data-testid="button-delete-order"]')).not.toBeVisible();
      await expect(memberPage.locator('[data-testid="button-bulk-operations"]')).not.toBeVisible();
    });

    test('should prevent cross-organization access', async () => {
      // Create user from different organization
      const otherOrgUser = await createTestUser({
        email: 'e2e-other-org@example.com',
        fullName: 'E2E Other Org User',
        role: 'admin'
      });

      const otherOrg = await createTestOrganization({
        name: 'E2E Other Organization',
        ownerId: otherOrgUser.id
      });

      const otherOrgPage = await browser.newPage();
      await loginUser(otherOrgPage, otherOrgUser.email);

      // Should only see their organization's data
      await otherOrgPage.goto(`${APP_URL}/orders`);
      await expect(otherOrgPage.locator('[data-testid="orders-page"]')).toBeVisible();

      // Should not see orders from testOrg
      const orderCards = otherOrgPage.locator('[data-testid^="order-card-"]');
      const cardCount = await orderCards.count();
      
      // If there are cards, verify they don't contain testOrg customer names
      for (let i = 0; i < cardCount; i++) {
        const card = orderCards.nth(i);
        const customerName = await card.locator('[data-testid="text-customer-name"]').textContent();
        expect(customerName).not.toContain('E2E Test Customer');
      }

      await otherOrgPage.close();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      await loginUser(adminPage, testUser.email);
      
      // Simulate network failure by going offline
      await adminPage.context().setOffline(true);
      
      await adminPage.goto(`${APP_URL}/orders`);
      
      // Should show appropriate error message
      await expect(adminPage.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });
      
      // Re-enable network
      await adminPage.context().setOffline(false);
      
      // Should recover when network is restored
      await adminPage.reload();
      await expect(adminPage.locator('[data-testid="orders-page"]')).toBeVisible();
    });

    test('should validate form inputs and show appropriate errors', async () => {
      await loginUser(adminPage, testUser.email);
      
      await adminPage.goto(`${APP_URL}/orders`);
      await adminPage.click('[data-testid="button-create-order"]');
      
      // Try to submit empty form
      await adminPage.click('[data-testid="button-submit-order"]');
      
      // Should show validation errors
      await expect(adminPage.locator('[data-testid="error-customer-name"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="error-customer-name"]')).toContainText('required');

      // Test invalid email format
      await adminPage.fill('[data-testid="input-customer-name"]', 'Test Customer');
      await adminPage.fill('[data-testid="input-customer-email"]', 'invalid-email');
      await adminPage.click('[data-testid="button-submit-order"]');
      
      await expect(adminPage.locator('[data-testid="error-customer-email"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="error-customer-email"]')).toContainText('valid email');

      // Test negative quantities
      await adminPage.fill('[data-testid="input-customer-email"]', 'valid@test.com');
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await adminPage.fill('[data-testid="input-quantity"]', '-1');
      await adminPage.click('[data-testid="button-submit-order"]');
      
      await expect(adminPage.locator('[data-testid="error-quantity"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="error-quantity"]')).toContainText('positive number');
    });

    test('should handle concurrent user interactions', async () => {
      await loginUser(adminPage, testUser.email);
      
      // Create order
      await adminPage.goto(`${APP_URL}/orders`);
      await adminPage.click('[data-testid="button-create-order"]');
      
      await adminPage.fill('[data-testid="input-customer-name"]', 'Concurrent Test Customer');
      await adminPage.fill('[data-testid="input-customer-email"]', 'concurrent@test.com');
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await adminPage.fill('[data-testid="input-quantity"]', '1');
      await adminPage.fill('[data-testid="input-unit-price"]', '50.00');
      
      await adminPage.click('[data-testid="button-submit-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();

      // Open same order in multiple tabs/pages
      const secondPage = await browser.newPage();
      await loginUser(secondPage, testUser.email);
      
      const orderCard = adminPage.locator('[data-testid^="order-card-"]').first();
      const orderId = await orderCard.getAttribute('data-testid');
      const extractedOrderId = orderId?.replace('order-card-', '') || '';
      
      // Both pages navigate to same order
      await adminPage.goto(`${APP_URL}/orders/${extractedOrderId}`);
      await secondPage.goto(`${APP_URL}/orders/${extractedOrderId}`);

      // Try to update status from both pages simultaneously
      await Promise.all([
        adminPage.click('[data-testid="button-update-status"]'),
        secondPage.click('[data-testid="button-update-status"]')
      ]);

      // One should succeed, the other should handle the conflict
      await adminPage.selectOption('[data-testid="select-status"]', 'pending');
      await adminPage.click('[data-testid="button-confirm-status-update"]');
      
      // Second page should show conflict or refresh with new status
      await expect(secondPage.locator('[data-testid="text-order-status"]')).toContainText('Pending', { timeout: 5000 });

      await secondPage.close();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show real-time order updates across browser sessions', async () => {
      await loginUser(adminPage, testUser.email);
      
      // Create second browser session
      const secondPage = await browser.newPage();
      await loginUser(secondPage, testUser.email);

      // Create order in first session
      await adminPage.goto(`${APP_URL}/orders`);
      await adminPage.click('[data-testid="button-create-order"]');
      
      await adminPage.fill('[data-testid="input-customer-name"]', 'Realtime Test Customer');
      await adminPage.fill('[data-testid="input-customer-email"]', 'realtime@test.com');
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await adminPage.fill('[data-testid="input-quantity"]', '1');
      await adminPage.fill('[data-testid="input-unit-price"]', '75.00');
      
      await adminPage.click('[data-testid="button-submit-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();

      // Second session should see the new order appear
      await secondPage.goto(`${APP_URL}/orders`);
      await expect(secondPage.locator('[data-testid="orders-page"]')).toBeVisible();
      
      // Wait for real-time update (may take a moment)
      await expect(secondPage.locator('[data-testid^="order-card-"]')).toBeVisible({ timeout: 10000 });
      
      const orderCards = secondPage.locator('[data-testid^="order-card-"]');
      let foundOrder = false;
      
      const cardCount = await orderCards.count();
      for (let i = 0; i < cardCount; i++) {
        const card = orderCards.nth(i);
        const customerName = await card.locator('[data-testid="text-customer-name"]').textContent();
        if (customerName?.includes('Realtime Test Customer')) {
          foundOrder = true;
          break;
        }
      }
      
      expect(foundOrder).toBe(true);

      await secondPage.close();
    });

    test('should show real-time status updates', async () => {
      await loginUser(adminPage, testUser.email);
      
      // Create order and get its ID
      await adminPage.goto(`${APP_URL}/orders`);
      await adminPage.click('[data-testid="button-create-order"]');
      
      await adminPage.fill('[data-testid="input-customer-name"]', 'Status Update Test');
      await adminPage.fill('[data-testid="input-customer-email"]', 'status@test.com');
      await adminPage.click('[data-testid="button-add-item"]');
      await adminPage.selectOption('[data-testid="select-product"]', { index: 0 });
      await adminPage.fill('[data-testid="input-quantity"]', '1');
      await adminPage.fill('[data-testid="input-unit-price"]', '25.00');
      
      await adminPage.click('[data-testid="button-submit-order"]');
      await expect(adminPage.locator('[data-testid="alert-success"]')).toBeVisible();

      const orderCard = adminPage.locator('[data-testid^="order-card-"]').first();
      const orderId = await orderCard.getAttribute('data-testid');
      const extractedOrderId = orderId?.replace('order-card-', '') || '';

      // Open order details in second page
      const secondPage = await browser.newPage();
      await loginUser(secondPage, testUser.email);
      await secondPage.goto(`${APP_URL}/orders/${extractedOrderId}`);

      // Update status in first page
      await orderCard.click();
      await adminPage.click('[data-testid="button-update-status"]');
      await adminPage.selectOption('[data-testid="select-status"]', 'pending');
      await adminPage.click('[data-testid="button-confirm-status-update"]');
      
      await expect(adminPage.locator('[data-testid="text-order-status"]')).toContainText('Pending');

      // Second page should receive real-time update
      await expect(secondPage.locator('[data-testid="text-order-status"]')).toContainText('Pending', { timeout: 10000 });

      await secondPage.close();
    });
  });
});