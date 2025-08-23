import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

describe('E2E Application Tests', () => {
  let browser: Browser;
  let page: Page;
  const APP_URL = process.env.APP_URL || 'http://localhost:5000';

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Application Loading', () => {
    it('should load the home page', async () => {
      await page.goto(APP_URL);
      
      // Should redirect to login if not authenticated
      await page.waitForURL(/\/(login|$)/);
      
      const title = await page.title();
      expect(title).toBeTruthy();
    });

    it('should display login page', async () => {
      await page.goto(`${APP_URL}/login`);
      
      // Check for login form elements
      const emailInput = await page.locator('[data-testid="input-email"]');
      const passwordInput = await page.locator('[data-testid="input-password"]');
      const submitButton = await page.locator('[data-testid="button-submit"]');
      
      expect(await emailInput.isVisible()).toBe(true);
      expect(await passwordInput.isVisible()).toBe(true);
      expect(await submitButton.isVisible()).toBe(true);
    });

    it('should navigate to register page', async () => {
      await page.goto(`${APP_URL}/login`);
      
      // Click register link
      const registerLink = await page.locator('[data-testid="link-register"]');
      await registerLink.click();
      
      // Should navigate to register page
      await page.waitForURL(/\/register/);
      
      // Check for register form elements
      const fullNameInput = await page.locator('[data-testid="input-fullname"]');
      expect(await fullNameInput.isVisible()).toBe(true);
    });
  });

  describe('Authentication Flow', () => {
    it('should show error for invalid login', async () => {
      await page.goto(`${APP_URL}/login`);
      
      // Fill in invalid credentials
      await page.fill('[data-testid="input-email"]', 'invalid@example.com');
      await page.fill('[data-testid="input-password"]', 'wrongpassword');
      
      // Submit form
      await page.click('[data-testid="button-submit"]');
      
      // Wait for error message
      await page.waitForSelector('.alert', { timeout: 5000 });
      
      const errorText = await page.textContent('.alert');
      expect(errorText).toContain('Failed to sign in');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route', async () => {
      await page.goto(`${APP_URL}/organizations`);
      
      // Should redirect to login
      await page.waitForURL(/\/login/);
      
      const url = page.url();
      expect(url).toContain('/login');
    });
  });

  describe('404 Page', () => {
    it('should show 404 page for non-existent routes', async () => {
      await page.goto(`${APP_URL}/non-existent-page`);
      
      // Should show 404 page
      await page.waitForURL(/\/404/);
      
      const content = await page.textContent('body');
      expect(content).toContain('not found');
    });
  });
});