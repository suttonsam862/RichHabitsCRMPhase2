/**
 * Test environment safety helpers
 * Prevents accidental connections to production databases during testing
 */

/**
 * Get database URL with production safety checks
 * If DATABASE_URL contains "supabase.co" and TEST_DATABASE_URL is set, 
 * auto-switch to TEST_DATABASE_URL for tests.
 * Otherwise, skip DB init with a clear warning.
 */
export function getDbUrl(): { url: string | null; shouldSkip: boolean; reason?: string } {
  const databaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  
  // If no DATABASE_URL set, skip tests
  if (!databaseUrl) {
    return {
      url: null,
      shouldSkip: true,
      reason: 'No DATABASE_URL environment variable set'
    };
  }
  
  // Check if DATABASE_URL contains production indicators
  const isProductionDb = databaseUrl.includes('supabase.co');
  
  if (isProductionDb) {
    if (testDatabaseUrl) {
      console.warn('⚠️  Production database detected, switching to TEST_DATABASE_URL for safety');
      return {
        url: testDatabaseUrl,
        shouldSkip: false
      };
    } else {
      console.warn('⚠️  Production database detected but no TEST_DATABASE_URL set - skipping database tests');
      return {
        url: null,
        shouldSkip: true,
        reason: 'Production database detected but no TEST_DATABASE_URL configured. Set TEST_DATABASE_URL to run database tests safely.'
      };
    }
  }
  
  // Safe to use DATABASE_URL (not production)
  return {
    url: databaseUrl,
    shouldSkip: false
  };
}

/**
 * Get database connection for tests with safety checks
 * Returns null if tests should be skipped
 */
export function getTestDbConnection(): string | null {
  const { url, shouldSkip, reason } = getDbUrl();
  
  if (shouldSkip) {
    if (reason) {
      console.warn(`Skipping database tests: ${reason}`);
    }
    return null;
  }
  
  return url;
}

/**
 * Check if database tests should be skipped
 */
export function shouldSkipDbTests(): boolean {
  return getDbUrl().shouldSkip;
}