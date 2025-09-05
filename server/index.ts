/**
 * Main server entry point
 * Configures Express app with API routes and Vite integration
 */

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
import { env } from './lib/env';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

const PORT = parseInt(env.PORT || '3000', 10);
const isDevelopment = env.NODE_ENV === 'development';

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow Vite in development
  contentSecurityPolicy: isDevelopment ? false : undefined
}));

// Trust proxy setting to prevent X-Forwarded-For warnings
app.set('trust proxy', 1);

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

app.use(requestLog);

// Health check endpoint
app.get('/healthz', (req, res) => {
  const uptime = process.uptime();
  res.status(200).json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    uptimeSec: Math.floor(uptime),
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint (basic stub)
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Prometheus-style metrics (basic)
  const metrics = [
    `# HELP process_uptime_seconds Process uptime in seconds`,
    `# TYPE process_uptime_seconds gauge`,
    `process_uptime_seconds ${uptime}`,
    `# HELP nodejs_heap_size_used_bytes Process heap size used`,
    `# TYPE nodejs_heap_size_used_bytes gauge`,
    `nodejs_heap_size_used_bytes ${memoryUsage.heapUsed}`,
    `# HELP nodejs_heap_size_total_bytes Process heap size total`,
    `# TYPE nodejs_heap_size_total_bytes gauge`,
    `nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}`
  ].join('\n');

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Mount auth routes with stricter rate limiting
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Mount canonical API router at /api/v1 with rate limiting
app.use('/api/v1', apiLimiter, apiRouter);

// Centralized error handler (last middleware)
app.use((err:any, req:any, res:any, next:any)=>{
  const dev = (process.env.DEBUG_LEVEL ?? '1') !== '0';
  const status = err?.status || err?.statusCode || 500;
  const code = err?.code || 'ERR_UNEXPECTED';
  const msg = err?.message || 'Unhandled error';

  // Log the error
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

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 API routes available at: http://0.0.0.0:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});