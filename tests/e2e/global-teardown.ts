import { FullConfig } from '@playwright/test';
import { cleanupTestData } from '../helpers/test-setup';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');
  
  try {
    // Cleanup test data
    await cleanupTestData();
    console.log('✅ Test data cleanup complete');
    
    // Additional global teardown can go here
    // e.g., stop mock services, cleanup files, etc.
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - we don't want teardown failures to fail the test run
  }
  
  console.log('✅ E2E test global teardown complete');
}

export default globalTeardown;