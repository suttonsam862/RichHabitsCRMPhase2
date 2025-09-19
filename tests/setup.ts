import '@testing-library/jest-dom';
import { vi, afterEach, beforeAll, afterAll } from 'vitest';
import { initializeTestDatabase, cleanTestDatabase, verifyTestDatabase } from './helpers/test-db';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
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
  try {
    await verifyTestDatabase();
    await initializeTestDatabase();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    process.exit(1);
  }
}, 30000);

// Cleanup after all tests
afterAll(async () => {
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