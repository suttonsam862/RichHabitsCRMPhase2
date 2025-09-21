/**
 * Main server entry point
 * Configures Express app with API routes and Vite integration
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

// Sentry must be imported and initialized as early as possible
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/index.js';
import { setupVite, serveStatic } from './vite';
import { errorHandler } from './middleware/error';
// slim request logger (1 line/req; ignores vite/assets)
import { requestLog } from './middleware/requestLog.js';
import { devAuthBypass } from './middleware/devAuth';
import { env } from './lib/env';
// Metrics middleware and service
import { metricsMiddleware, rateLimitMetricsMiddleware, corsMetricsMiddleware, errorMetricsMiddleware } from './middleware/metrics';
import { getMetrics, getMetricsContentType, healthCheckStatus, healthCheckDuration } from './lib/metrics';

// Initialize Sentry for error tracking and performance monitoring
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    integrations: [
      // Enable HTTP calls tracing
      Sentry.httpIntegration(),
      // Enable Express.js middleware tracing
      Sentry.expressIntegration(),
      // Enable automatic Node.js profiling
      nodeProfilingIntegration(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
    
    // Enhanced data scrubbing and privacy protection
    beforeSend(event) {
      // Don't send health check errors
      if (event.request?.url?.includes('/healthz') || event.request?.url?.includes('/metrics')) {
        return null;
      }
      
      // Scrub sensitive data from request context
      if (event.contexts?.request) {
        const request = event.contexts.request as any;
        
        // Remove sensitive headers
        if (request.headers && typeof request.headers === 'object') {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-session-token'];
          sensitiveHeaders.forEach(header => {
            if (request.headers[header]) {
              request.headers[header] = '[Filtered]';
            }
            if (request.headers[header.toUpperCase()]) {
              request.headers[header.toUpperCase()] = '[Filtered]';
            }
          });
        }
        
        // Remove request body entirely
        if (request.data) {
          request.data = '[Filtered]';
        }
        
        // Remove query parameters that might contain sensitive data
        if (request.query_string && typeof request.query_string === 'string') {
          // Filter out common sensitive query params
          const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'session'];
          let queryString = request.query_string;
          sensitiveParams.forEach(param => {
            const regex = new RegExp(`[?&]${param}=[^&]*`, 'gi');
            queryString = queryString.replace(regex, `&${param}=[Filtered]`);
          });
          request.query_string = queryString;
        }
      }
      
      // Scrub sensitive data from extra context
      if (event.extra && typeof event.extra === 'object') {
        Object.keys(event.extra).forEach(key => {
          if (key.toLowerCase().includes('password') || 
              key.toLowerCase().includes('secret') || 
              key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('key')) {
            (event.extra as any)[key] = '[Filtered]';
          }
        });
      }
      
      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data && typeof breadcrumb.data === 'object') {
            Object.keys(breadcrumb.data).forEach(key => {
              if (key.toLowerCase().includes('password') || 
                  key.toLowerCase().includes('secret') || 
                  key.toLowerCase().includes('token') || 
                  key.toLowerCase().includes('key')) {
                (breadcrumb.data as any)[key] = '[Filtered]';
              }
            });
          }
          return breadcrumb;
        });
      }
      
      return event;
    },
    
    // Additional options
    maxBreadcrumbs: 50,
    debug: env.NODE_ENV === 'development',
    
    // Disable in development to reduce noise
    enabled: env.NODE_ENV !== 'development' || !!env.SENTRY_DSN,
  });
  
  console.log('🔍 Sentry error tracking initialized');
}

const app = express();
const server = createServer(app);

const PORT = parseInt(env.PORT || '3000', 10);
const isDevelopment = env.NODE_ENV === 'development';

// Security middleware - Phase 0 SEC-4: Enhanced security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow Vite in development
  contentSecurityPolicy: isDevelopment ? false : undefined,
  hsts: isDevelopment ? false : {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  hidePoweredBy: true,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Trust proxy setting to prevent X-Forwarded-For warnings
app.set('trust proxy', 1);

// Sentry Express integration is automatic with expressIntegration()

// CORS configuration
const allowedOrigins = env.ORIGINS.split(',').map(o => o.trim());
console.log('Allowed CORS origins:', allowedOrigins);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Add CORS metrics tracking after CORS middleware
app.use(corsMetricsMiddleware as any);

// Compression middleware
app.use(compression());

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Basic middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Add metrics collection middleware first - before CORS for proper ordering
app.use(metricsMiddleware as any);

app.use(requestLog);

// Add Sentry request handler for proper request scoping
if (env.SENTRY_DSN) {
  // This middleware creates isolated scopes for each request
  // Using built-in Express integration which handles request scoping automatically
}

// Health check endpoint with metrics tracking
app.get('/healthz', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const uptime = process.uptime();
    
    // Update health check metrics
    healthCheckStatus.labels('api').set(1);
    healthCheckDuration.labels('api').observe((Date.now() - startTime) / 1000);
    
    res.status(200).json({
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
      uptimeSec: Math.floor(uptime),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    healthCheckStatus.labels('api').set(0);
    healthCheckDuration.labels('api').observe((Date.now() - startTime) / 1000);
    
    res.status(503).json({
      status: 'error',
      error: 'Health check failed'
    });
  }
});

// Additional health endpoint at /api/health for compatibility
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const uptime = process.uptime();
    
    // Update health check metrics
    healthCheckStatus.labels('api').set(1);
    healthCheckDuration.labels('api').observe((Date.now() - startTime) / 1000);
    
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        version: process.env.npm_package_version || '1.0.0',
        uptimeSec: Math.floor(uptime),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    healthCheckStatus.labels('api').set(0);
    healthCheckDuration.labels('api').observe((Date.now() - startTime) / 1000);
    
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      }
    });
  }
});

// Verification endpoint for real-time system health
app.get('/api/verification', async (req, res) => {
  try {
    const { StartupVerification } = await import('./lib/startup-verification');
    const verificationResult = await StartupVerification.healthCheck();
    const statusCode = verificationResult.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(verificationResult);
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      message: 'Verification check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// WebSocket-specific health check
app.get('/api/verification/websocket', async (req, res) => {
  try {
    const { StartupVerification } = await import('./lib/startup-verification');
    const wsHealth = await StartupVerification.wsHealthCheck();
    const statusCode = wsHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(wsHealth);
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      message: 'WebSocket health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced metrics endpoint with comprehensive Prometheus metrics
app.get('/metrics', async (req, res) => {
  try {
    // Security: Basic IP-based access control (can be enhanced as needed)
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Allow localhost and private networks by default
    // In production, this should be configured properly
    const allowedIps = (process.env.METRICS_ALLOWED_IPS || '127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16').split(',');
    
    // Simple IP check (basic implementation - enhance as needed)
    const isAllowed = allowedIps.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation - simplified check
        return clientIp?.startsWith(ip.split('/')[0]);
      }
      return clientIp === ip || ip === '0.0.0.0';
    });
    
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      res.status(403).json({
        error: 'Access denied',
        message: 'Metrics endpoint access restricted'
      });
      return;
    }
    
    // Get comprehensive metrics
    const metrics = await getMetrics();
    
    res.set('Content-Type', getMetricsContentType());
    res.send(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate metrics'
    });
  }
});

// Mount auth routes with stricter rate limiting
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Add rate limit metrics tracking after rate limiters
app.use(rateLimitMetricsMiddleware as any);

// Development auth bypass middleware
app.use(devAuthBypass);

// Mount canonical API router at /api/v1 with rate limiting
app.use('/api/v1', apiLimiter, apiRouter);

// Sentry error handler is handled automatically by expressIntegration

// Error metrics middleware (should come before the final error handler)
app.use(errorMetricsMiddleware as any);

// Centralized error handler (last middleware)
app.use((err:any, req:any, res:any, next:any)=>{
  const dev = (process.env.DEBUG_LEVEL ?? '1') !== '0';
  const status = err?.status || err?.statusCode || 500;
  const code = err?.code || 'ERR_UNEXPECTED';
  const msg = err?.message || 'Unhandled error';

  // Log the error (without sensitive data)
  console.error({
    rid: res.locals?.rid,
    error: err?.message || 'Unknown error',
    stack: err?.stack,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Send error response
  const responseBody = {
    success: false,
    error: dev ? 'Internal server error' : 'Internal server error',
    message: dev ? msg : 'An unexpected error occurred',
    ...(dev && err?.stack && { stack: err.stack })
  };

  return res.status(status).json(responseBody);
});

// Error handling middleware
app.use(errorHandler);

// Setup Vite in development or static serving in production
if (isDevelopment) {
  setupVite(app, server).then(() => {
    console.log('✅ Vite dev server configured');
  }).catch(err => {
    console.error('❌ Failed to setup Vite:', err);
    process.exit(1);
  });
} else {
  try {
    serveStatic(app);
    console.log('✅ Static file serving configured');
  } catch (err) {
    console.error('❌ Failed to setup static serving:', err);
    process.exit(1);
  }
}

// Initialize WebSocket server
import { initializeWebSocket } from './lib/websocket';
import { StartupVerification } from './lib/startup-verification';
let wsManager: any = null;

// Initialize database monitoring
import { metricsDB } from './lib/db-metrics';
metricsDB.startConnectionPoolMonitoring();

// Export app for testing
export { app };

// Start server with startup verification
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 API routes available at: http://0.0.0.0:${PORT}/api`);
  console.log(`📊 Prometheus metrics available at: http://0.0.0.0:${PORT}/metrics`);
  
  // Initialize WebSocket server after HTTP server is listening
  try {
    wsManager = initializeWebSocket(server);
    console.log(`🔌 WebSocket server running on ws://0.0.0.0:${PORT}/ws`);
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket server:', error);
  }

  // Run startup verification checks
  try {
    const { passed, results } = await StartupVerification.runAllChecks();
    
    if (!passed) {
      console.error('\n❌ Startup verification failed! Some critical components are not ready.');
      const criticalFailures = results.filter(r => r.status === 'failed');
      if (criticalFailures.some(f => f.name.includes('Database') || f.name.includes('WebSocket'))) {
        console.error('🚨 Critical infrastructure failure detected. Real-time features may not work properly.');
      }
    } else {
      console.log('\n✅ All startup verification checks passed! Server is ready for real-time operations.');
    }
  } catch (verificationError) {
    console.error('❌ Error running startup verification:', verificationError);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (wsManager) {
    wsManager.shutdown();
  }
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  if (wsManager) {
    wsManager.shutdown();
  }
  server.close(() => {
    console.log('Process terminated');
  });
});
