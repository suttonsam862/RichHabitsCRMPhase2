/**
 * Test Fixtures - Deterministic test data generators
 * Provides consistent, isolated test data for reliable testing
 */

import type { 
  CreateOrganizationType,
  CreateUserType,
  CreateOrderType,
  CreateDesignJobType
} from '../../shared/dtos';

/**
 * Generate deterministic test organization data
 */
export function createTestOrganization(overrides: Partial<CreateOrganizationType> = {}): CreateOrganizationType {
  const timestamp = new Date().getTime();
  
  return {
    name: `Test Organization ${timestamp}`,
    email: `admin-${timestamp}@test-org.com`,
    contactPhone: '+1-555-0100',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'United States',
    website: `https://test-org-${timestamp}.com`,
    description: 'A test organization for automated testing',
    ...overrides
  };
}

/**
 * Generate deterministic test user data
 */
export function createTestUser(overrides: Partial<CreateUserType> = {}): CreateUserType {
  const timestamp = new Date().getTime();
  
  return {
    email: `test-user-${timestamp}@example.com`,
    fullName: `Test User ${timestamp}`,
    role: 'user',
    phone: '+1-555-0199',
    ...overrides
  };
}

/**
 * Generate deterministic test order data
 */
export function createTestOrder(overrides: Partial<CreateOrderType> = {}): CreateOrderType {
  const timestamp = new Date().getTime();
  
  return {
    orgId: 'test-org-1',
    customerContactName: `Test Customer ${timestamp}`,
    customerContactEmail: `customer-${timestamp}@example.com`,
    customerContactPhone: '+1-555-0150',
    statusCode: 'draft',
    notes: `Test order created at ${new Date().toISOString()}`,
    items: [
      {
        catalogItemId: 'test-catalog-item-1',
        quantity: 2,
        unitPrice: 25.99,
        nameSnapshot: 'Test Product 1',
        statusCode: 'pending'
      }
    ],
    ...overrides
  };
}

/**
 * Generate deterministic test design job data
 */
export function createTestDesignJob(overrides: Partial<CreateDesignJobType> = {}): CreateDesignJobType {
  const timestamp = new Date().getTime();
  
  return {
    orgId: 'test-org-1',
    orderItemId: 'test-order-item-1',
    title: `Test Design Job ${timestamp}`,
    brief: 'Design brief for automated testing',
    priority: 5,
    statusCode: 'queued',
    ...overrides
  };
}

/**
 * Test data factory for creating multiple related entities
 */
export class TestDataFactory {
  private static counter = 0;
  
  /**
   * Get unique identifier for test isolation
   */
  static getUniqueId(): string {
    return `test-${Date.now()}-${++this.counter}`;
  }
  
  /**
   * Create a complete test organization with users
   */
  static async createOrganizationWithUsers(options: {
    organizationData?: Partial<CreateOrganizationType>;
    userCount?: number;
    adminCount?: number;
  } = {}) {
    const { organizationData = {}, userCount = 2, adminCount = 1 } = options;
    
    const org = createTestOrganization(organizationData);
    const users: CreateUserType[] = [];
    
    // Create admin users
    for (let i = 0; i < adminCount; i++) {
      users.push(createTestUser({
        role: 'admin',
        fullName: `Test Admin ${this.getUniqueId()}`
      }));
    }
    
    // Create regular users
    for (let i = 0; i < userCount; i++) {
      users.push(createTestUser({
        role: 'user',
        fullName: `Test User ${this.getUniqueId()}`
      }));
    }
    
    return { organization: org, users };
  }
  
  /**
   * Create a complete test order with items and design jobs
   */
  static createOrderWithDesignJobs(options: {
    orderData?: Partial<CreateOrderType>;
    itemCount?: number;
    createDesignJobs?: boolean;
  } = {}) {
    const { orderData = {}, itemCount = 2, createDesignJobs = true } = options;
    
    const order = createTestOrder(orderData);
    const designJobs: CreateDesignJobType[] = [];
    
    // Ensure order has the right number of items
    order.items = Array.from({ length: itemCount }, (_, index) => ({
      catalogItemId: `test-catalog-item-${index + 1}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      unitPrice: Number((Math.random() * 100 + 10).toFixed(2)),
      nameSnapshot: `Test Product ${index + 1}`,
      statusCode: 'pending'
    }));
    
    // Create design jobs for each item if requested
    if (createDesignJobs) {
      order.items.forEach((item, index) => {
        designJobs.push(createTestDesignJob({
          title: `Design for ${item.nameSnapshot}`,
          brief: `Design brief for order item ${index + 1}`
        }));
      });
    }
    
    return { order, designJobs };
  }
}

/**
 * Mock data generators for external services
 */
export const MockData = {
  /**
   * Generate mock Supabase user data
   */
  supabaseUser: (overrides: any = {}) => ({
    id: TestDataFactory.getUniqueId(),
    email: `test-${TestDataFactory.getUniqueId()}@example.com`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: {},
    app_metadata: {},
    ...overrides
  }),
  
  /**
   * Generate mock Supabase error
   */
  supabaseError: (message = 'Test error', code = 'TEST_ERROR') => ({
    message,
    details: 'Test error details',
    hint: 'Test error hint',
    code
  })
};

/**
 * Test assertion helpers
 */
export const TestAssertions = {
  /**
   * Assert that an object has all required properties
   */
  hasRequiredProperties<T>(obj: any, requiredProps: (keyof T)[]): obj is T {
    return requiredProps.every(prop => obj && typeof obj === 'object' && prop in obj);
  },
  
  /**
   * Assert that a date string is recent (within last minute)
   */
  isRecentDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs >= 0 && diffMs < 60000; // Within 1 minute
  },
  
  /**
   * Assert that a string looks like a UUID
   */
  isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
};