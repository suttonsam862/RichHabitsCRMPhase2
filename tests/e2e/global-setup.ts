import { FullConfig } from '@playwright/test';
import { initializeTestDatabase, verifyTestDatabase } from '../helpers/test-db';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');
  
  try {
    // Setup test database
    await verifyTestDatabase();
    await initializeTestDatabase();
    console.log('✅ Test database setup complete');
    
    // Additional global setup can go here
    // e.g., start mock services, setup test data, etc.
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
  
  console.log('✅ E2E test global setup complete');
}

export default globalSetup;