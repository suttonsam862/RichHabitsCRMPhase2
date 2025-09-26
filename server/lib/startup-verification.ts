import { supabaseAdmin } from './supabaseAdmin';
import { getWebSocketManager } from './websocket';

interface VerificationResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class StartupVerification {
  private static results: VerificationResult[] = [];

  /**
   * Run all startup verification checks
   */
  static async runAllChecks(): Promise<{ passed: boolean; results: VerificationResult[] }> {
    console.log('🔍 Running startup verification checks...');
    this.results = [];

    // Database connectivity
    await this.checkDatabaseConnection();
    
    // Required tables
    await this.checkRequiredTables();
    
    // WebSocket readiness
    await this.checkWebSocketReadiness();
    
    // Environment variables
    await this.checkEnvironmentVariables();

    // Notification service readiness
    await this.checkNotificationServiceReadiness();

    const failed = this.results.filter(r => r.status === 'failed');
    const warnings = this.results.filter(r => r.status === 'warning');
    const passed = this.results.filter(r => r.status === 'passed');

    console.log(`\n📊 Verification Summary:`);
    console.log(`   ✅ Passed: ${passed.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Critical failures:');
      failed.forEach(result => {
        console.log(`   - ${result.name}: ${result.message}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(result => {
        console.log(`   - ${result.name}: ${result.message}`);
      });
    }

    return {
      passed: failed.length === 0,
      results: this.results
    };
  }

  /**
   * Check database connectivity
   */
  private static async checkDatabaseConnection(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        this.addResult('Database Connection', 'failed', `Failed to connect: ${error.message}`, { error });
      } else {
        this.addResult('Database Connection', 'passed', 'Successfully connected to database');
      }
    } catch (error) {
      this.addResult('Database Connection', 'failed', `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, { error });
    }
  }

  /**
   * Check required tables exist
   */
  private static async checkRequiredTables(): Promise<void> {
    const requiredTables = [
      'orders',
      'order_items', 
      'notifications',
      'realtime_events',
      'organization_memberships',
      'status_orders',
      'status_order_items'
    ];

    for (const table of requiredTables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          if (error.message.includes('does not exist')) {
            this.addResult(`Table: ${table}`, 'failed', `Table does not exist`, { table, error: error.message });
          } else {
            this.addResult(`Table: ${table}`, 'warning', `Table exists but query failed: ${error.message}`, { table, error: error.message });
          }
        } else {
          this.addResult(`Table: ${table}`, 'passed', `Table exists and accessible`);
        }
      } catch (error) {
        this.addResult(`Table: ${table}`, 'failed', `Error checking table: ${error instanceof Error ? error.message : 'Unknown error'}`, { table, error });
      }
    }
  }

  /**
   * Check WebSocket manager readiness
   */
  private static async checkWebSocketReadiness(): Promise<void> {
    try {
      const wsManager = getWebSocketManager();
      
      if (!wsManager) {
        this.addResult('WebSocket Manager', 'failed', 'WebSocket manager not initialized');
        return;
      }

      // Check if WebSocket manager has required methods
      const requiredMethods = ['broadcastToUser', 'broadcastToOrganization', 'createAndBroadcastEvent', 'shutdown', 'getStats'];
      const missingMethods = requiredMethods.filter(method => typeof wsManager[method] !== 'function');

      if (missingMethods.length > 0) {
        this.addResult('WebSocket Manager', 'failed', `Missing required methods: ${missingMethods.join(', ')}`, { missingMethods });
        return;
      }

      // Get WebSocket stats
      const stats = wsManager.getStats();
      this.addResult('WebSocket Manager', 'passed', `WebSocket manager ready. Connected clients: ${stats.connectedClients}, Active rooms: ${stats.activeRooms}`, stats);

    } catch (error) {
      this.addResult('WebSocket Manager', 'failed', `WebSocket manager error: ${error instanceof Error ? error.message : 'Unknown error'}`, { error });
    }
  }

  /**
   * Check required environment variables
   */
  private static async checkEnvironmentVariables(): Promise<void> {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      this.addResult('Environment Variables', 'failed', `Missing required environment variables: ${missing.join(', ')}`, { missing });
    } else {
      this.addResult('Environment Variables', 'passed', 'All required environment variables present');
    }

    // Check JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      this.addResult('JWT Secret', 'warning', 'JWT_SECRET should be at least 32 characters for security');
    } else {
      this.addResult('JWT Secret', 'passed', 'JWT_SECRET meets security requirements');
    }
  }

  /**
   * Check notification service readiness
   */
  private static async checkNotificationServiceReadiness(): Promise<void> {
    try {
      // Import notification service
      const { notificationService } = await import('../services/notificationService');
      
      if (!notificationService) {
        this.addResult('Notification Service', 'failed', 'Notification service not available');
        return;
      }

      // Check if required methods exist
      const requiredMethods = ['broadcastEvent', 'createNotification', 'mapEntityTypeToMessageType'];
      const missingMethods = requiredMethods.filter(method => typeof notificationService[method] !== 'function');

      if (missingMethods.length > 0) {
        this.addResult('Notification Service', 'failed', `Missing required methods: ${missingMethods.join(', ')}`, { missingMethods });
        return;
      }

      // Test entity type mapping
      const testMappings = [
        { entityType: 'order', expected: 'order_update' },
        { entityType: 'order_item', expected: 'order_item_update' },
        { entityType: 'design_job', expected: 'design_job_update' }
      ];

      const mappingErrors: string[] = [];
      for (const test of testMappings) {
        try {
          const result = (notificationService as any).mapEntityTypeToMessageType(test.entityType);
          if (result !== test.expected) {
            mappingErrors.push(`${test.entityType} maps to ${result}, expected ${test.expected}`);
          }
        } catch (error) {
          mappingErrors.push(`Error mapping ${test.entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (mappingErrors.length > 0) {
        this.addResult('Notification Service', 'failed', `Entity type mapping errors: ${mappingErrors.join('; ')}`, { mappingErrors });
      } else {
        this.addResult('Notification Service', 'passed', 'Notification service ready with correct entity type mappings');
      }

    } catch (error) {
      this.addResult('Notification Service', 'failed', `Error checking notification service: ${error instanceof Error ? error.message : 'Unknown error'}`, { error });
    }
  }

  /**
   * Add verification result
   */
  private static addResult(name: string, status: 'passed' | 'failed' | 'warning', message: string, details?: any): void {
    this.results.push({ name, status, message, details });
    
    const icon = status === 'passed' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${name}: ${message}`);
  }

  /**
   * Health check endpoint handler
   */
  static async healthCheck(): Promise<{ status: string; checks: VerificationResult[]; timestamp: string }> {
    const { passed, results } = await this.runAllChecks();
    
    return {
      status: passed ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * WebSocket-specific health check
   */
  static async wsHealthCheck(): Promise<{ status: string; websocket: any; timestamp: string }> {
    try {
      const wsManager = getWebSocketManager();
      const stats = wsManager.getStats();
      
      return {
        status: 'healthy',
        websocket: {
          manager: 'initialized',
          stats,
          lastCheck: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        websocket: {
          manager: 'not_initialized',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}