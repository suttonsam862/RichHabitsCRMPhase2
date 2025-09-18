// Phase 3 API-3: Idempotency middleware for critical POST operations
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from './supabase';
import { logger } from './log';

interface IdempotencyRecord {
  key: string;
  request_hash: string;
  response_status: number;
  response_body: any;
  created_at: Date;
  expires_at: Date;
}

// Store idempotency records in memory (for development) or database (for production)
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

// In-memory store for development
const idempotencyStore = new Map<string, IdempotencyRecord>();

// Clean up expired records periodically
setInterval(() => {
  const now = new Date();
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.expires_at < now) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

// Generate hash of request body for comparison
function hashRequestBody(body: any): string {
  const normalized = JSON.stringify(body, Object.keys(body).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Store idempotency result
async function storeIdempotencyResult(
  key: string,
  requestHash: string,
  status: number,
  body: any
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL);
  
  const record: IdempotencyRecord = {
    key,
    request_hash: requestHash,
    response_status: status,
    response_body: body,
    created_at: now,
    expires_at: expiresAt
  };
  
  // For production, store in database
  if (process.env.NODE_ENV === 'production') {
    try {
      await supabaseAdmin
        .from('idempotency_keys')
        .insert({
          key,
          request_hash: requestHash,
          response_status: status,
          response_body: body,
          expires_at: expiresAt.toISOString()
        });
    } catch (error) {
      logger.error('Failed to store idempotency key in database:', error);
      // Fall back to in-memory store
      idempotencyStore.set(key, record);
    }
  } else {
    // For development, use in-memory store
    idempotencyStore.set(key, record);
  }
}

// Retrieve idempotency result
async function getIdempotencyResult(key: string): Promise<IdempotencyRecord | null> {
  // For production, check database first
  if (process.env.NODE_ENV === 'production') {
    try {
      const { data, error } = await supabaseAdmin
        .from('idempotency_keys')
        .select('*')
        .eq('key', key)
        .single();
      
      if (!error && data) {
        return {
          key: data.key,
          request_hash: data.request_hash,
          response_status: data.response_status,
          response_body: data.response_body,
          created_at: new Date(data.created_at),
          expires_at: new Date(data.expires_at)
        };
      }
    } catch (error) {
      logger.error('Failed to retrieve idempotency key from database:', error);
    }
  }
  
  // Check in-memory store
  return idempotencyStore.get(key) || null;
}

// Idempotency middleware factory
export function idempotent(options: { ttl?: number } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }
    
    // Check for Idempotency-Key header
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      // No idempotency key provided, proceed normally
      return next();
    }
    
    // Validate idempotency key format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be a valid UUID v4'
        }
      });
    }
    
    // Generate request hash
    const requestHash = hashRequestBody(req.body);
    
    // Check if we've seen this request before
    const existingResult = await getIdempotencyResult(idempotencyKey);
    
    if (existingResult) {
      // Check if request body matches
      if (existingResult.request_hash !== requestHash) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'Idempotency-Key has been used with a different request body'
          }
        });
      }
      
      // Return cached response
      logger.info(`Returning cached response for idempotency key: ${idempotencyKey}`);
      return res.status(existingResult.response_status).json(existingResult.response_body);
    }
    
    // Capture the original response methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let responseStatus = 200;
    
    // Override status to capture status code
    res.status = function(code: number) {
      responseStatus = code;
      return originalStatus(code);
    };
    
    // Override json to capture and store the response
    res.json = async function(body: any) {
      // Store the result for future requests
      await storeIdempotencyResult(idempotencyKey, requestHash, responseStatus, body);
      
      // Send the response
      return originalJson(body);
    };
    
    // Continue with request processing
    next();
  };
}

// Apply idempotency to critical endpoints
export function applyCriticalIdempotency(router: any) {
  // List of critical endpoints that should be idempotent
  const criticalEndpoints = [
    '/orders', // Order creation
    '/payments', // Payment processing
    '/users', // User creation
    '/organizations', // Organization creation
    '/transactions', // Financial transactions
  ];
  
  criticalEndpoints.forEach(endpoint => {
    router.use(endpoint, idempotent());
  });
}

// Create database table for idempotency keys if needed
export async function createIdempotencyTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key VARCHAR(36) PRIMARY KEY,
      request_hash VARCHAR(64) NOT NULL,
      response_status INTEGER NOT NULL,
      response_body JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
  `;
  
  try {
    await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });
    logger.info('Idempotency table created successfully');
  } catch (error) {
    logger.error('Failed to create idempotency table:', error);
  }
}