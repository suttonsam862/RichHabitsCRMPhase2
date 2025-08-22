import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock fetch for API requests
global.fetch = vi.fn();

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});