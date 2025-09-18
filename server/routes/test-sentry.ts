import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { addApiRequestBreadcrumb, captureErrorWithContext } from '../lib/sentry.js';

const router = Router();

/**
 * Test endpoint to verify Sentry error tracking
 * Only available in development mode
 */
router.post('/test-error', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  addApiRequestBreadcrumb('POST', '/api/v1/test/sentry/test-error', req.user?.id);

  const errorType = req.body.type || 'generic';
  
  try {
    switch (errorType) {
      case 'sync':
        throw new Error('Test synchronous error from Sentry integration');
      
      case 'async':
        setTimeout(() => {
          throw new Error('Test asynchronous error from Sentry integration');
        }, 100);
        break;
      
      case 'unhandled':
        // This will cause an unhandled promise rejection
        Promise.reject(new Error('Test unhandled promise rejection'));
        break;
      
      case 'custom':
        const customError = new Error('Test custom error with context');
        captureErrorWithContext(customError, req, {
          testData: 'This is test context data',
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
        });
        throw customError;
      
      default:
        throw new Error('Test generic error from Sentry integration');
    }
    
    res.json({
      success: true,
      message: `Test ${errorType} error triggered successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // This error will be caught by Sentry's error handler
    throw error;
  }
});

/**
 * Test endpoint to verify Sentry message capture
 */
router.post('/test-message', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  const level = req.body.level || 'info';
  const message = req.body.message || 'Test message from Sentry integration';

  addApiRequestBreadcrumb('POST', '/api/v1/test/sentry/test-message', req.user?.id);

  Sentry.withScope((scope) => {
    scope.setTag('test', 'message-capture');
    scope.setLevel(level as any);
    scope.setContext('testContext', {
      endpoint: '/test/sentry/test-message',
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      body: req.body,
    });
    
    Sentry.captureMessage(message);
  });

  res.json({
    success: true,
    message: `Test message captured with level: ${level}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * Test endpoint to verify performance monitoring
 */
router.get('/test-performance', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  const transaction = Sentry.startInactiveSpan({
    name: 'test-performance-endpoint',
    op: 'http.server'
  });

  addApiRequestBreadcrumb('GET', '/api/v1/test/sentry/test-performance', req.user?.id);

  try {
    // Simulate some work with nested spans
    const dbSpan = Sentry.startInactiveSpan({
      name: 'database-query-simulation',
      op: 'db.query'
    });

    // Simulate database work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    const apiSpan = Sentry.startInactiveSpan({
      name: 'external-api-simulation',
      op: 'http.client'
    });

    // Simulate external API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

    res.json({
      success: true,
      message: 'Performance test completed',
      timestamp: new Date().toISOString(),
      simulatedWork: {
        database: 'simulated',
        externalApi: 'simulated'
      }
    });

  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
});

export default router;