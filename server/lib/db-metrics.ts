/**
 * Database Metrics Wrapper
 * Provides metrics collection for database operations
 */

import { supabaseAdmin } from './supabase';
import { 
  dbQueryDuration, 
  dbQueryTotal, 
  trackDbQuery, 
  trackDbQueryError,
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolTotal
} from './metrics';

/**
 * Wrapper for Supabase queries with metrics tracking
 */
export class MetricsDB {
  private static instance: MetricsDB;
  
  public static getInstance(): MetricsDB {
    if (!MetricsDB.instance) {
      MetricsDB.instance = new MetricsDB();
    }
    return MetricsDB.instance;
  }

  /**
   * Execute a SELECT query with metrics tracking
   */
  async select(table: string, query: any, organizationId?: string): Promise<any> {
    const endTimer = trackDbQuery('SELECT', table, organizationId);
    
    try {
      const result = await supabaseAdmin.from(table).select(query.select, query.options || {});
      endTimer();
      
      if (result.error) {
        trackDbQueryError('SELECT', table, organizationId);
        throw result.error;
      }
      
      return result;
    } catch (error) {
      trackDbQueryError('SELECT', table, organizationId);
      throw error;
    }
  }

  /**
   * Execute an INSERT query with metrics tracking
   */
  async insert(table: string, data: any, organizationId?: string): Promise<any> {
    const endTimer = trackDbQuery('INSERT', table, organizationId);
    
    try {
      const result = await supabaseAdmin.from(table).insert(data);
      endTimer();
      
      if (result.error) {
        trackDbQueryError('INSERT', table, organizationId);
        throw result.error;
      }
      
      return result;
    } catch (error) {
      trackDbQueryError('INSERT', table, organizationId);
      throw error;
    }
  }

  /**
   * Execute an UPDATE query with metrics tracking
   */
  async update(table: string, data: any, filter: any, organizationId?: string): Promise<any> {
    const endTimer = trackDbQuery('UPDATE', table, organizationId);
    
    try {
      let query = supabaseAdmin.from(table).update(data);
      
      // Apply filters
      if (filter.eq) {
        query = query.eq(filter.eq.column, filter.eq.value);
      }
      
      const result = await query;
      endTimer();
      
      if (result.error) {
        trackDbQueryError('UPDATE', table, organizationId);
        throw result.error;
      }
      
      return result;
    } catch (error) {
      trackDbQueryError('UPDATE', table, organizationId);
      throw error;
    }
  }

  /**
   * Execute a DELETE query with metrics tracking
   */
  async delete(table: string, filter: any, organizationId?: string): Promise<any> {
    const endTimer = trackDbQuery('DELETE', table, organizationId);
    
    try {
      let query = supabaseAdmin.from(table);
      
      // Apply filters
      if (filter.eq) {
        query = query.delete().eq(filter.eq.column, filter.eq.value);
      }
      
      const result = await query;
      endTimer();
      
      if (result.error) {
        trackDbQueryError('DELETE', table, organizationId);
        throw result.error;
      }
      
      return result;
    } catch (error) {
      trackDbQueryError('DELETE', table, organizationId);
      throw error;
    }
  }

  /**
   * Execute a raw SQL query with metrics tracking
   */
  async rpc(functionName: string, params: any = {}, organizationId?: string): Promise<any> {
    const endTimer = trackDbQuery('RPC', functionName, organizationId);
    
    try {
      const result = await supabaseAdmin.rpc(functionName, params);
      endTimer();
      
      if (result.error) {
        trackDbQueryError('RPC', functionName, organizationId);
        throw result.error;
      }
      
      return result;
    } catch (error) {
      trackDbQueryError('RPC', functionName, organizationId);
      throw error;
    }
  }

  /**
   * Update connection pool metrics with real Supabase connection tracking
   * Since Supabase manages connections transparently, we track query activity instead
   */
  updateConnectionPoolMetrics() {
    try {
      // For Supabase, we don't have direct access to connection pool stats
      // Instead, we track meaningful metrics: active queries and connection health
      
      // Check if Supabase is reachable with a lightweight query
      this.checkDatabaseHealth().then(isHealthy => {
        // Set connection status (1 = healthy, 0 = unhealthy)
        dbConnectionPoolActive.set(isHealthy ? 1 : 0);
        
        // For Supabase, total connections is essentially always available
        dbConnectionPoolTotal.set(isHealthy ? 1 : 0);
        
        // Idle connections don't apply to Supabase's managed model
        dbConnectionPoolIdle.set(0);
      }).catch(error => {
        console.error('Database health check failed:', error);
        dbConnectionPoolActive.set(0);
        dbConnectionPoolTotal.set(0);
        dbConnectionPoolIdle.set(0);
      });
      
    } catch (error) {
      console.error('Error updating connection pool metrics:', error);
      // Set all metrics to 0 on error
      dbConnectionPoolActive.set(0);
      dbConnectionPoolTotal.set(0);
      dbConnectionPoolIdle.set(0);
    }
  }

  /**
   * Lightweight database health check
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Use a simple query to check if the database is responsive
      const { error } = await supabaseAdmin.from('organizations').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start periodic connection pool metrics updates
   */
  startConnectionPoolMonitoring() {
    // Update connection pool metrics every 30 seconds
    setInterval(() => {
      this.updateConnectionPoolMetrics();
    }, 30000);
    
    // Initial update
    this.updateConnectionPoolMetrics();
  }
}

// Export singleton instance
export const metricsDB = MetricsDB.getInstance();