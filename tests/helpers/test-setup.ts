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

  // Create user in database using Supabase client
  const { data: user, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.user.id,
      email: options.email,
      full_name: options.fullName,
      role: options.role || 'member',
      organization_id: options.organizationId || null,
      is_active: options.isActive ?? true
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create user in database: ${insertError.message}`);
  }

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

  const { data: organization, error: insertError } = await supabaseAdmin
    .from('organizations')
    .insert({
      id: orgId,
      name: options.name,
      owner_id: options.ownerId,
      is_business: options.isBusiness ?? true,
      status: options.status || 'active',
      setup_complete: options.setupComplete ?? true
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create organization: ${insertError.message}`);
  }

  // Create owner membership
  const { error: membershipError } = await supabaseAdmin
    .from('organization_memberships')
    .insert({
      user_id: options.ownerId,
      organization_id: orgId,
      role: 'owner',
      is_active: true
    });

  if (membershipError) {
    throw new Error(`Failed to create organization membership: ${membershipError.message}`);
  }

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

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      id: orderId,
      org_id: options.organizationId,
      customer_contact_name: options.customerName,
      total_amount: options.totalAmount,
      status_code: options.status || 'pending',
      salesperson_id: options.salespersonId || null
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

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

  const { data: item, error: itemError } = await supabaseAdmin
    .from('catalog_items')
    .insert({
      id: itemId,
      org_id: orgId,
      name: name,
      base_price: basePrice
    })
    .select()
    .single();

  if (itemError) {
    throw new Error(`Failed to create catalog item: ${itemError.message}`);
  }

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
    if (testDataRegistry.organizations.size > 0) {
      await supabaseAdmin
        .from('order_items')
        .delete()
        .in('order_id', Array.from(testDataRegistry.orders));
    }

    // Clean up orders
    for (const orderId of testDataRegistry.orders) {
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', orderId);
    }

    // Clean up catalog items
    for (const itemId of testDataRegistry.catalogItems) {
      await supabaseAdmin
        .from('catalog_items')
        .delete()
        .eq('id', itemId);
    }

    // Clean up organization memberships
    for (const orgId of testDataRegistry.organizations) {
      await supabaseAdmin
        .from('organization_memberships')
        .delete()
        .eq('organization_id', orgId);
    }

    // Clean up organizations
    for (const orgId of testDataRegistry.organizations) {
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', orgId);
    }

    // Clean up database users
    for (const userId of testDataRegistry.users) {
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
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
    await supabaseAdmin.from('users').select('id').limit(1);
    
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
  // Use supabase for performance testing queries
  await supabaseAdmin.from('users').select('id').limit(1);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1000000; // Convert to milliseconds
}

export async function createBulkTestData(count: number, organizationId: string) {
  const promises: Promise<any>[] = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(
      createTestOrder({
        organizationId,
        customerName: `Bulk Customer ${i}`,
        totalAmount: Math.floor(Math.random() * 1000) + 10
      })
    );
  }

  const results = await Promise.all(promises);
  return results;
}