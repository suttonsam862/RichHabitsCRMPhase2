import '@testing-library/jest-dom';
import { vi, afterEach, beforeAll, afterAll } from 'vitest';
import { initializeTestDatabase, cleanTestDatabase, verifyTestDatabase } from './helpers/test-db';
import { getTestDbConnection, shouldSkipDbTests } from './helpers/test-env';

// Set test environment
process.env.NODE_ENV = 'test';

// Apply database safety logic
const safeDbUrl = getTestDbConnection();
if (safeDbUrl) {
  process.env.DATABASE_URL = safeDbUrl;
} else {
  // Keep original for non-DB tests, but mark that DB tests should be skipped
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
}
process.env.JWT_SECRET = 'test-jwt-secret-for-tests';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock fetch for API requests
global.fetch = vi.fn();

// Mock console to reduce noise in tests but keep errors visible
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  // Keep error for debugging test issues
};

// Mock file system operations for security tests
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
}));

// Mock crypto for consistent test results
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('test-random-bytes')),
    createHash: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('test-hash')
    })
  };
});

// Setup global test database connection
beforeAll(async () => {
  if (shouldSkipDbTests()) {
    console.warn('Skipping database initialization for safety - integration tests will be skipped');
    return;
  }
  
  try {
    await verifyTestDatabase();
    await initializeTestDatabase();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    // Don't exit(1) - just warn and let tests skip DB operations
    console.warn('Database tests will be skipped due to setup failure');
  }
}, 30000);

// Cleanup after all tests
afterAll(async () => {
  if (shouldSkipDbTests()) {
    return;
  }
  
  try {
    await cleanTestDatabase();
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
  }
}, 30000);

// Setup cleanup after each test
afterEach(async () => {
  vi.clearAllMocks();
  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as any).mockReset();
  }
});