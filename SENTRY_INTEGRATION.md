# Sentry Error Tracking Integration

## Overview

This document outlines the comprehensive Sentry integration implemented for both frontend and backend error tracking and performance monitoring.

## 📦 Installed Packages

### Backend
- `@sentry/node` - Core Sentry SDK for Node.js
- `@sentry/profiling-node` - Performance profiling for Node.js

### Frontend  
- `@sentry/react` - React-specific Sentry SDK
- `@sentry/tracing` - Performance monitoring and tracing

## ⚙️ Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Backend Sentry DSN
SENTRY_DSN=your_backend_sentry_dsn_here

# Frontend Sentry DSN  
VITE_SENTRY_DSN=your_frontend_sentry_dsn_here
```

**Note:** Both DSNs are optional. If not provided, Sentry will be disabled in development mode.

### Backend Configuration (`server/index.ts`)

- **Error Filtering**: Filters out health check endpoints and metrics
- **Performance Monitoring**: 100% sampling in development, 10% in production
- **Profiling**: Automatic Node.js profiling enabled
- **Express Integration**: Automatic middleware for request/response tracking
- **Custom Error Context**: Additional request context for better debugging

### Frontend Configuration (`client/src/main.tsx`)

- **React Error Boundaries**: Automatic error capture for React components  
- **Session Replay**: 100% error sessions, 10% normal sessions in production
- **Performance Monitoring**: Browser performance tracking
- **Error Filtering**: Filters out network errors and chunk loading errors
- **Custom Error Boundary**: User-friendly error pages with retry functionality

## 🔧 Utility Functions

### Frontend (`client/src/lib/sentry.ts`)

```typescript
import { setSentryUser, addNavigationBreadcrumb, addUserActionBreadcrumb } from '@/lib/sentry';

// Set user context
setSentryUser({
  id: user.id,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId
});

// Add navigation breadcrumb
addNavigationBreadcrumb('/dashboard', '/login');

// Add user action breadcrumb
addUserActionBreadcrumb('click', 'save-button', { formData: {...} });

// Capture custom error with context
captureError(new Error('Custom error'), { additionalContext: 'value' });
```

### Backend (`server/lib/sentry.ts`)

```typescript
import { addDatabaseBreadcrumb, captureErrorWithContext } from '../lib/sentry';

// Add database operation breadcrumb
addDatabaseBreadcrumb('SELECT', 'users', userId, 150);

// Capture error with request context
captureErrorWithContext(error, req, { customData: 'value' });
```

## 🎯 Error Boundary Component

A comprehensive React error boundary (`client/src/components/SentryErrorBoundary.tsx`) provides:

- Automatic error capture and Sentry reporting
- User-friendly error UI with retry functionality  
- Development-mode error details
- Graceful error recovery options

Usage:
```tsx
import SentryErrorBoundary from '@/components/SentryErrorBoundary';

function App() {
  return (
    <SentryErrorBoundary>
      <YourAppComponents />
    </SentryErrorBoundary>
  );
}
```

## 🧪 Testing the Integration

### Development Test Endpoints

When running in development mode, the following test endpoints are available:

#### 1. Test Error Capture
```bash
POST /api/v1/test/sentry/test-error
Content-Type: application/json

{
  "type": "sync" // Options: "sync", "async", "unhandled", "custom"
}
```

#### 2. Test Message Capture  
```bash
POST /api/v1/test/sentry/test-message
Content-Type: application/json

{
  "level": "error", // Options: "info", "warning", "error"
  "message": "Test message"
}
```

#### 3. Test Performance Monitoring
```bash
GET /api/v1/test/sentry/test-performance
```

### Frontend Error Testing

To test frontend error capture:

1. **Component Error**: Throw an error in a React component to test the error boundary
2. **Network Error**: Trigger a failed API call to test network error filtering
3. **User Actions**: Perform various user actions to test breadcrumb tracking

## 📊 Monitoring Configuration

### Sampling Rates

| Environment | Error Sampling | Performance Sampling | Session Replay |
|-------------|----------------|---------------------|----------------|
| Development | 100% | 100% | 100% |
| Production | 100% | 10% | 10% normal / 100% error |

### Error Filtering

**Backend Filters:**
- Health check endpoints (`/healthz`, `/metrics`)
- Rate limit errors in development

**Frontend Filters:**
- Network errors from localhost
- Chunk loading errors (code splitting)
- Development mode filtering (unless DSN explicitly provided)

## 🔐 Privacy & Security

- **User Context**: Only captures necessary user identification data
- **Request Filtering**: Sensitive headers and body data can be filtered
- **Development Safety**: Disabled by default in development unless DSN is provided
- **Production Sampling**: Limited sampling rates to reduce noise and costs

## 🚀 Production Deployment

1. **Environment Variables**: Set `SENTRY_DSN` and `VITE_SENTRY_DSN` in production
2. **Release Tracking**: Automatically tracks releases using package.json version
3. **Source Maps**: Consider uploading source maps for better stack traces
4. **Alerts**: Configure Sentry alerts and notifications in your Sentry dashboard

## 📝 Best Practices

1. **User Context**: Set user context after authentication
2. **Breadcrumbs**: Add meaningful breadcrumbs for user actions and navigation
3. **Custom Errors**: Use the provided utility functions for consistent error capture
4. **Performance**: Monitor the provided performance spans and transactions
5. **Testing**: Use the development test endpoints to verify integration

## 🔧 Troubleshooting

### Common Issues

1. **No errors appearing in Sentry**:
   - Verify DSN is correctly set
   - Check if error filtering is too aggressive
   - Ensure errors are being thrown after Sentry initialization

2. **Performance data missing**:
   - Verify tracing is enabled
   - Check sampling rates
   - Ensure performance monitoring is enabled in Sentry project

3. **Frontend errors not captured**:
   - Verify error boundary is wrapping components
   - Check browser console for Sentry initialization logs
   - Ensure DSN is available in the frontend environment

### Debug Mode

Enable debug mode in development by ensuring the `debug: true` flag is set in Sentry configuration.

## 📚 Additional Resources

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Error Boundary Best Practices](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/)