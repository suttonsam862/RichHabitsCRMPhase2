import { v4 as uuidv4 } from 'uuid';
import { db } from '../../server/db';
import { supabaseAdmin } from '../../server/lib/supabaseAdmin';

// Test data storage for cleanup
const testDataRegistry = {
  users: new Set<string>(),
  organizations: new Set<string>(),
  orders: new Set<string>(),
  catalogItems: new Set<string>(),
  files: new Set<string>()
};

export interface CreateTestUserOptions {
  email: string;
  fullName: string;
  role?: 'admin' | 'member' | 'readonly';
  password?: string;
  organizationId?: string;
  isActive?: boolean;
}

export interface CreateTestOrganizationOptions {
  name: string;
  ownerId: string;
  isBusiness?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  setupComplete?: boolean;
}

export interface CreateTestOrderOptions {
  organizationId: string;
  customerName: string;
  totalAmount: number;
  status?: string;
  salespersonId?: string;
}

export async function createTestUser(options: CreateTestUserOptions) {
  const userId = uuidv4();
  const password = options.password || 'TestPassword123!';

  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: options.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: options.fullName,
      role: options.role || 'member'
    }
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  // Create user in database
  const user = await db.execute(
    'INSERT INTO users (id, email, full_name, role, organization_id, is_active) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
    [
      authUser.user.id,
      options.email,
      options.fullName,
      options.role || 'member',
      options.organizationId || null,
      options.isActive ?? true
    ]
  );

  const createdUser = {
    id: authUser.user.id,
    email: options.email,
    fullName: options.fullName,
    role: options.role || 'member',
    organizationId: options.organizationId || null,
    isActive: options.isActive ?? true,
    authUser: authUser.user
  };

  testDataRegistry.users.add(authUser.user.id);
  return createdUser;
}

export async function createTestOrganization(options: CreateTestOrganizationOptions) {
  const orgId = uuidv4();

  const organization = await db.execute(
    'INSERT INTO organizations (id, name, owner_id, is_business, status, setup_complete) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
    [
      orgId,
      options.name,
      options.ownerId,
      options.isBusiness ?? true,
      options.status || 'active',
      options.setupComplete ?? true
    ]
  );

  // Create owner membership
  await db.execute(
    'INSERT INTO organization_memberships (user_id, organization_id, role, is_active) VALUES (?, ?, ?, ?)',
    [options.ownerId, orgId, 'owner', true]
  );

  const createdOrg = {
    id: orgId,
    name: options.name,
    ownerId: options.ownerId,
    isBusiness: options.isBusiness ?? true,
    status: options.status || 'active',
    setupComplete: options.setupComplete ?? true
  };

  testDataRegistry.organizations.add(orgId);
  return createdOrg;
}

export async function createTestOrder(options: CreateTestOrderOptions) {
  const orderId = uuidv4();

  const order = await db.execute(
    'INSERT INTO orders (id, organization_id, customer_name, total_amount, status_code, salesperson_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
    [
      orderId,
      options.organizationId,
      options.customerName,
      options.totalAmount,
      options.status || 'pending',
      options.salespersonId || null
    ]
  );

  const createdOrder = {
    id: orderId,
    organizationId: options.organizationId,
    customerName: options.customerName,
    totalAmount: options.totalAmount,
    status: options.status || 'pending',
    salespersonId: options.salespersonId || null
  };

  testDataRegistry.orders.add(orderId);
  return createdOrder;
}

export async function createTestCatalogItem(orgId: string, name: string, basePrice: number) {
  const itemId = uuidv4();

  const item = await db.execute(
    'INSERT INTO catalog_items (id, org_id, name, base_price) VALUES (?, ?, ?, ?) RETURNING *',
    [itemId, orgId, name, basePrice]
  );

  const createdItem = {
    id: itemId,
    orgId,
    name,
    basePrice
  };

  testDataRegistry.catalogItems.add(itemId);
  return createdItem;
}

export async function getAuthToken(userId: string): Promise<string> {
  // Generate a JWT token for testing
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: `test-${userId}@example.com`
  });

  if (error) {
    throw new Error(`Failed to generate auth token: ${error.message}`);
  }

  // Extract token from the magic link or create a test token
  // In a real implementation, you'd use the actual JWT token
  return `test_token_${userId}`;
}

export async function createAuthenticatedRequest(userId: string) {
  const token = await getAuthToken(userId);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function cleanupTestData() {
  try {
    // Clean up in reverse dependency order
    
    // Clean up order items first
    await db.execute('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE organization_id IN (?))', 
      [Array.from(testDataRegistry.organizations).join(',')]);

    // Clean up orders
    for (const orderId of testDataRegistry.orders) {
      await db.execute('DELETE FROM orders WHERE id = ?', [orderId]);
    }

    // Clean up catalog items
    for (const itemId of testDataRegistry.catalogItems) {
      await db.execute('DELETE FROM catalog_items WHERE id = ?', [itemId]);
    }

    // Clean up organization memberships
    for (const orgId of testDataRegistry.organizations) {
      await db.execute('DELETE FROM organization_memberships WHERE organization_id = ?', [orgId]);
    }

    // Clean up organizations
    for (const orgId of testDataRegistry.organizations) {
      await db.execute('DELETE FROM organizations WHERE id = ?', [orgId]);
    }

    // Clean up database users
    for (const userId of testDataRegistry.users) {
      await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    }

    // Clean up Supabase Auth users
    for (const userId of testDataRegistry.users) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (error) {
        console.warn(`Failed to delete auth user ${userId}:`, error);
      }
    }

    // Clean up files
    for (const fileId of testDataRegistry.files) {
      try {
        // Delete from storage if needed
        console.log(`Cleaning up file: ${fileId}`);
      } catch (error) {
        console.warn(`Failed to delete file ${fileId}:`, error);
      }
    }

    // Clear registries
    testDataRegistry.users.clear();
    testDataRegistry.organizations.clear();
    testDataRegistry.orders.clear();
    testDataRegistry.catalogItems.clear();
    testDataRegistry.files.clear();

  } catch (error) {
    console.error('Error during test cleanup:', error);
    throw error;
  }
}

export async function setupTestDatabase() {
  // Ensure test database is in a clean state
  // This should be called before test suites
  try {
    // Verify database connection
    await db.execute('SELECT 1');
    
    // Clean any existing test data
    await cleanupTestData();
    
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function createTestFile(organizationId: string, fileName: string, content: Buffer) {
  const fileId = uuidv4();
  
  // Simulate file creation
  const file = {
    id: fileId,
    organizationId,
    fileName,
    size: content.length,
    mimeType: 'text/plain',
    url: `/files/${fileId}/${fileName}`
  };

  testDataRegistry.files.add(fileId);
  return file;
}

export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
}

export function generateTestOrgName(prefix: string = 'Test Org'): string {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).substr(2, 5)}`;
}

export async function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createMockMulterFile(options: {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
}): Express.Multer.File {
  return {
    originalname: options.originalname || 'test.jpg',
    mimetype: options.mimetype || 'image/jpeg',
    size: options.size || 1024,
    buffer: options.buffer || Buffer.from('fake-image-data'),
    fieldname: 'file',
    encoding: '7bit',
    destination: '/tmp',
    filename: 'uploaded-file',
    path: '/tmp/uploaded-file',
    stream: null as any,
  };
}

// Test database helpers
export async function truncateTable(tableName: string) {
  await db.execute(`TRUNCATE TABLE ${tableName} CASCADE`);
}

export async function resetSequences() {
  // Reset any auto-increment sequences if needed
  const sequences = await db.execute(`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  `);

  for (const seq of sequences) {
    await db.execute(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
  }
}

// Security test helpers
export function generateSQLInjectionPayloads() {
  return [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users (email) VALUES ('hacked@example.com'); --",
    "' UNION SELECT * FROM users --",
    "'; WAITFOR DELAY '00:00:05'; --",
    "' AND 1=(SELECT COUNT(*) FROM users) --"
  ];
}

export function generateXSSPayloads() {
  return [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    '"><script>alert("xss")</script>',
    "'; alert('xss'); //"
  ];
}

export function generatePathTraversalPayloads() {
  return [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '..%2F..%2F..%2Fetc%2Fpasswd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ];
}

// Performance test helpers
export async function measureQueryTime(query: string, params: any[] = []): Promise<number> {
  const start = process.hrtime.bigint();
  await db.execute(query, params);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1000000; // Convert to milliseconds
}

export async function createBulkTestData(count: number, organizationId: string) {
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(
      createTestOrder({
        organizationId,
        customerName: `Bulk Customer ${i}`,
        totalAmount: Math.floor(Math.random() * 1000) + 10
      })
    );
  }

  return Promise.all(promises);
}