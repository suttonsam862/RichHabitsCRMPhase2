import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

// Initialize Sentry for error tracking and performance monitoring
const sentryDsn = (import.meta as any).env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration({
        // Don't trace sensitive user interactions
        shouldCreateSpanForRequest: (url) => {
          // Don't trace auth or sensitive endpoints
          if (url.includes('/auth/') || url.includes('/login') || url.includes('/register')) {
            return false;
          }
          return true;
        },
      }),
      Sentry.replayIntegration({
        // Enhanced privacy protection for session replay
        maskAllText: true, // Mask all text content
        blockAllMedia: true, // Block all media (images, videos, etc.)
        maskAllInputs: true, // Mask all form inputs
        
        // Capture 10% of all sessions, plus 100% of sessions with an error
        // sessionSampleRate: (import.meta as any).env.MODE === 'production' ? 0.1 : 1.0,
        // errorSampleRate: 1.0,
        
        // Additional privacy settings - commenting out unsupported options
        // blockClass: 'sentry-block',
        // maskClass: 'sentry-mask',
        // ignoreClass: 'sentry-ignore',
        
        // Block specific selectors that might contain sensitive data
        // blockSelector: [
        //   '[data-sensitive]',
        //   '.sensitive',
        //   'input[type="password"]',
        //   'input[type="email"]',
        //   '.auth-form',
        //   '.payment-form',
        // ],
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: (import.meta as any).env.MODE === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: (import.meta as any).env.MODE === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Release information
    release: (import.meta as any).env.VITE_APP_VERSION || '1.0.0',
    environment: (import.meta as any).env.MODE,
    
    // Enhanced data scrubbing and privacy protection
    beforeSend(event) {
      // Don't send events in development mode unless explicitly enabled
      if ((import.meta as any).env.MODE === 'development' && !sentryDsn) {
        return null;
      }
      
      // Filter out network errors from localhost
      if (event.exception?.values?.some(ex => 
        ex.value?.includes('Failed to fetch') || 
        ex.value?.includes('NetworkError')
      )) {
        return null;
      }
      
      // Don't send chunk load errors
      if (event.exception?.values?.some(ex => 
        ex.value?.includes('ChunkLoadError') ||
        ex.value?.includes('Loading chunk')
      )) {
        return null;
      }
      
      // Scrub sensitive data from request context
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers && typeof event.request.headers === 'object') {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-session-token'];
          sensitiveHeaders.forEach(header => {
            if ((event.request as any).headers[header]) {
              (event.request as any).headers[header] = '[Filtered]';
            }
          });
        }
        
        // Remove request body entirely
        if ((event.request as any).data) {
          (event.request as any).data = '[Filtered]';
        }
        
        // Remove sensitive query parameters
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'session'];
          let queryString = event.request.query_string;
          sensitiveParams.forEach(param => {
            const regex = new RegExp(`[?&]${param}=[^&]*`, 'gi');
            queryString = queryString.replace(regex, `&${param}=[Filtered]`);
          });
          event.request.query_string = queryString;
        }
      }
      
      // Scrub sensitive data from extra context
      if (event.extra && typeof event.extra === 'object') {
        Object.keys(event.extra).forEach(key => {
          if (key.toLowerCase().includes('password') || 
              key.toLowerCase().includes('secret') || 
              key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('auth')) {
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
                  key.toLowerCase().includes('key') ||
                  key.toLowerCase().includes('auth')) {
                (breadcrumb.data as any)[key] = '[Filtered]';
              }
            });
          }
          
          // Filter sensitive messages
          if (breadcrumb.message && typeof breadcrumb.message === 'string') {
            const sensitivePatterns = [/password/gi, /secret/gi, /token/gi, /key/gi, /auth/gi];
            sensitivePatterns.forEach(pattern => {
              breadcrumb.message = (breadcrumb.message as string).replace(pattern, '[Filtered]');
            });
          }
          
          return breadcrumb;
        });
      }
      
      // Remove sensitive user data
      if (event.user) {
        // Keep only safe user identifiers
        const safeUser = {
          id: event.user.id,
          username: event.user.username,
        };
        event.user = safeUser;
      }
      
      return event;
    },
    
    // Additional privacy and security options
    maxBreadcrumbs: 50,
    debug: (import.meta as any).env.MODE === 'development',
    
    // Enable in production or when DSN is provided
    enabled: (import.meta as any).env.MODE !== 'development' || !!sentryDsn,
    
    // Additional security measures
    sendDefaultPii: false, // Don't send personally identifiable information
  });
  
  console.log('🔍 Sentry error tracking initialized in frontend');
}

createRoot(document.getElementById("root")!).render(<App />);
