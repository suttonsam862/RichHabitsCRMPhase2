/**
 * Main server entry point
 * Configures Express app with API routes and Vite integration
 */

import express from 'express';
import { createServer } from 'http';
import { apiRouter } from './routes/api';
import { setupVite, serveStatic } from './vite';
import { errorHandler } from './middleware/error';
import dotenv from 'dotenv';
import organizationsRouter from './routes/organizations.js';
import uploadRouter from './routes/upload.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const isDevelopment = process.env.NODE_ENV === 'development';

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Mount API routes at /api
app.use('/api', apiRouter);

// API Routes
app.use('/api/organizations', organizationsRouter);
app.use('/api/upload', uploadRouter);

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