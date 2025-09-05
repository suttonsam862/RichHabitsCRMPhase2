/**
 * Image load monitoring and metrics collection
 * Tracks success/failure rates for debugging logo display issues
 */

interface ImageLoadMetric {
  url: string;
  organizationId?: string;
  organizationName?: string;
  success: boolean;
  loadTime: number;
  error?: string;
  timestamp: number;
}

class ImageLoadMonitor {
  private metrics: ImageLoadMetric[] = [];
  private maxMetrics = 100; // Keep only last 100 metrics

  recordLoadSuccess(url: string, loadTime: number, organizationId?: string, organizationName?: string) {
    this.addMetric({
      url,
      organizationId,
      organizationName,
      success: true,
      loadTime,
      timestamp: Date.now()
    });
    
    console.log(`📊 Image loaded successfully in ${loadTime}ms:`, {
      url: url.substring(0, 100) + '...',
      organizationName,
      loadTime
    });
  }

  recordLoadError(url: string, error: string, organizationId?: string, organizationName?: string) {
    this.addMetric({
      url,
      organizationId,
      organizationName,
      success: false,
      loadTime: 0,
      error,
      timestamp: Date.now()
    });

    console.error(`📊 Image failed to load:`, {
      url: url.substring(0, 100) + '...',
      organizationName,
      error,
      organizationId
    });
  }

  private addMetric(metric: ImageLoadMetric) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getStats() {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total * 100).toFixed(1) : '0';
    const avgLoadTime = successful > 0 ? 
      (this.metrics.filter(m => m.success).reduce((sum, m) => sum + m.loadTime, 0) / successful).toFixed(0) : 'N/A';

    return {
      total,
      successful,
      failed,
      successRate: `${successRate}%`,
      avgLoadTime: `${avgLoadTime}ms`
    };
  }

  getRecentFailures(limit = 10) {
    return this.metrics
      .filter(m => !m.success)
      .slice(-limit)
      .map(m => ({
        url: m.url.substring(0, 80) + '...',
        organizationName: m.organizationName,
        error: m.error,
        timestamp: new Date(m.timestamp).toISOString()
      }));
  }

  logStats() {
    const stats = this.getStats();
    console.log('📊 Image Load Statistics:', stats);
    
    if (parseInt(stats.successRate) < 80) {
      console.warn('⚠️ Low image success rate detected!');
      const failures = this.getRecentFailures(5);
      console.table(failures);
    }
  }
}

// Global instance
export const imageLoadMonitor = new ImageLoadMonitor();

// Auto-log stats every 30 seconds in development
if (import.meta.env.DEV) {
  setInterval(() => {
    if (imageLoadMonitor.getStats().total > 0) {
      imageLoadMonitor.logStats();
    }
  }, 30000);
}