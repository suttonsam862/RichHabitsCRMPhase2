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
import { apiRouter } from './routes/index';
import { setupVite, serveStatic } from './vite';
import { errorHandler } from './middleware/error';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const isDevelopment = process.env.NODE_ENV === 'development';

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow Vite in development
  contentSecurityPolicy: isDevelopment ? false : undefined
}));

// CORS configuration
const allowedOrigins = process.env.ORIGINS ? process.env.ORIGINS.split(',') : ['http://localhost:5000', 'http://0.0.0.0:5000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: false
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

// Basic middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Mount canonical API router at /api with rate limiting
app.use('/api', apiLimiter, apiRouter);

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