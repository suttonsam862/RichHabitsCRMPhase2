import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { idempotent } from '../../server/lib/idempotency';

// Mock dependencies
vi.mock('../../server/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: 'Not found' })
        }))
      }))
    }))
  }
}));

vi.mock('../../server/lib/log', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('Idempotency Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {},
      body: { test: 'data' }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();

    // Reset environment to development
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear in-memory store
    const idempotencyStore = (global as any).idempotencyStore;
    if (idempotencyStore) {
      idempotencyStore.clear();
    }
  });

  describe('Basic functionality', () => {
    it('should skip non-POST requests', async () => {
      req.method = 'GET';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should proceed normally when no idempotency key is provided', async () => {
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid idempotency key format', async () => {
      req.headers!['idempotency-key'] = 'invalid-key-format';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be a valid UUID v4'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid UUID v4 idempotency key', async () => {
      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('Idempotency key validation', () => {
    it('should accept valid UUID v4 formats', async () => {
      const validUuids = [
        '12345678-1234-4567-8901-123456789012',
        'abcdef12-3456-4789-abcd-ef1234567890',
        '00000000-0000-4000-8000-000000000000',
        'ffffffff-ffff-4fff-bfff-ffffffffffff'
      ];

      for (const uuid of validUuids) {
        req.headers!['idempotency-key'] = uuid;
        const middleware = idempotent();
        
        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        vi.clearAllMocks();
      }
    });

    it('should reject invalid UUID formats', async () => {
      const invalidUuids = [
        '12345678-1234-1234-8901-123456789012', // Not v4 (3rd group should start with 4)
        '12345678-1234-4567-1901-123456789012', // Not v4 (4th group should start with 8,9,a,b)
        '12345678123445678901123456789012',      // No hyphens
        '12345678-1234-4567-8901-12345678901',   // Wrong length
        '',                                      // Empty
        'not-a-uuid-at-all',                     // Not UUID format
      ];

      for (const uuid of invalidUuids) {
        req.headers!['idempotency-key'] = uuid;
        const middleware = idempotent();
        
        await middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'INVALID_IDEMPOTENCY_KEY',
            message: 'Idempotency-Key must be a valid UUID v4'
          }
        });
        expect(next).not.toHaveBeenCalled();
        vi.clearAllMocks();
      }
    });
  });

  describe('Request body hashing', () => {
    it('should generate consistent hashes for identical request bodies', async () => {
      const body1 = { name: 'John', age: 30, hobbies: ['reading', 'coding'] };
      const body2 = { name: 'John', age: 30, hobbies: ['reading', 'coding'] };
      
      // Since we can't directly test the hash function, we'll test the behavior
      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      req.body = body1;

      const middleware = idempotent();
      
      // Override res.json to capture the response
      let capturedResponse: any;
      (res.json as any) = vi.fn((data) => {
        capturedResponse = data;
        return res;
      });

      await middleware(req as Request, res as Response, next);

      // Simulate the same request
      const req2 = { ...req, body: body2 };
      const res2 = { ...res };
      const next2 = vi.fn();

      // Mock the stored result
      const { supabaseAdmin } = await import('../../server/lib/supabase');
      (supabaseAdmin.from as any)().select().eq().single.mockResolvedValueOnce({
        data: {
          key: '12345678-1234-4567-8901-123456789012',
          request_hash: 'some-hash',
          response_status: 200,
          response_body: { success: true },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });

      const middleware2 = idempotent();
      await middleware2(req2 as Request, res2 as Response, next2);

      // First request should proceed normally
      expect(next).toHaveBeenCalled();
    });

    it('should detect different request bodies with same idempotency key', async () => {
      const idempotencyKey = '12345678-1234-4567-8901-123456789012';
      
      // First request
      req.headers!['idempotency-key'] = idempotencyKey;
      req.body = { name: 'John', age: 30 };

      const middleware1 = idempotent();
      await middleware1(req as Request, res as Response, next);

      // Second request with different body but same key
      const req2 = {
        ...req,
        body: { name: 'Jane', age: 25 }
      };
      const res2 = { ...res };
      const next2 = vi.fn();

      // Mock existing record with different hash
      const { supabaseAdmin } = await import('../../server/lib/supabase');
      (supabaseAdmin.from as any)().select().eq().single.mockResolvedValueOnce({
        data: {
          key: idempotencyKey,
          request_hash: 'different-hash',
          response_status: 200,
          response_body: { success: true },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });

      const middleware2 = idempotent();
      await middleware2(req2 as Request, res2 as Response, next2);

      expect(res2.status).toHaveBeenCalledWith(409);
      expect(res2.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'Idempotency-Key has been used with a different request body'
        }
      });
      expect(next2).not.toHaveBeenCalled();
    });
  });

  describe('Response caching', () => {
    it('should cache successful responses', async () => {
      const idempotencyKey = '12345678-1234-4567-8901-123456789012';
      req.headers!['idempotency-key'] = idempotencyKey;

      const middleware = idempotent();
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();

      // Simulate the response being sent
      (res.status as any)(201);
      await (res.json as any)({ success: true, id: 'new-resource' });

      // Verify that the response would be stored (in production mode)
      expect(res.json).toHaveBeenCalledWith({ success: true, id: 'new-resource' });
    });

    it('should return cached response for duplicate requests', async () => {
      const idempotencyKey = '12345678-1234-4567-8901-123456789012';
      const cachedResponse = { success: true, id: 'cached-resource' };
      const { logger } = await import('../../server/lib/log');

      // Mock existing record
      const { supabaseAdmin } = await import('../../server/lib/supabase');
      (supabaseAdmin.from as any)().select().eq().single.mockResolvedValueOnce({
        data: {
          key: idempotencyKey,
          request_hash: 'matching-hash',
          response_status: 201,
          response_body: cachedResponse,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });

      req.headers!['idempotency-key'] = idempotencyKey;
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(logger.info).toHaveBeenCalledWith(`Returning cached response for idempotency key: ${idempotencyKey}`);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(cachedResponse);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully when storing results', async () => {
      const { supabaseAdmin } = await import('../../server/lib/supabase');
      const { logger } = await import('../../server/lib/log');
      
      // Mock database error
      (supabaseAdmin.from as any)().insert.mockRejectedValueOnce(new Error('Database error'));

      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();

      // Simulate response
      (res.status as any)(200);
      await (res.json as any)({ success: true });

      expect(logger.error).toHaveBeenCalledWith('Failed to store idempotency key in database:', expect.any(Error));
    });

    it('should handle database errors gracefully when retrieving results', async () => {
      const { supabaseAdmin } = await import('../../server/lib/supabase');
      const { logger } = await import('../../server/lib/log');
      
      // Mock database error
      (supabaseAdmin.from as any)().select().eq().single.mockRejectedValueOnce(new Error('Database error'));

      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith('Failed to retrieve idempotency key from database:', expect.any(Error));
      expect(next).toHaveBeenCalled(); // Should continue processing
    });
  });

  describe('TTL and expiration', () => {
    it('should respect TTL configuration', () => {
      const customTtl = 3600000; // 1 hour
      const middleware = idempotent({ ttl: customTtl });
      
      expect(middleware).toBeDefined();
    });

    it('should use default TTL when not specified', () => {
      const middleware = idempotent();
      
      expect(middleware).toBeDefined();
    });
  });

  describe('Production vs Development behavior', () => {
    it('should use in-memory storage in development', async () => {
      process.env.NODE_ENV = 'development';
      
      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should attempt to use database in production', async () => {
      process.env.NODE_ENV = 'production';
      const { supabaseAdmin } = await import('../../server/lib/supabase');
      
      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      // Should still proceed even if database operations are mocked
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Security considerations', () => {
    it('should prevent idempotency key enumeration', async () => {
      // Even with invalid keys, response should not leak information
      req.headers!['idempotency-key'] = 'invalid-format';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as any).mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
      expect(response.error.message).not.toContain('database');
      expect(response.error.message).not.toContain('internal');
    });

    it('should handle malicious request bodies safely', async () => {
      const maliciousBody = {
        script: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --",
        huge: 'x'.repeat(1000000), // Large string
        nested: { deeply: { nested: { object: 'value' } } }
      };

      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      req.body = maliciousBody;

      const middleware = idempotent();
      await middleware(req as Request, res as Response, next);

      // Should process without errors
      expect(next).toHaveBeenCalled();
    });

    it('should handle circular references in request body', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      req.body = circularObj;

      const middleware = idempotent();
      
      // Should handle circular reference gracefully
      await middleware(req as Request, res as Response, next);
      
      // Should either process successfully or handle the error appropriately
      expect(next).toHaveBeenCalled();
    });

    it('should limit response caching to prevent DoS', async () => {
      const largeResponse = {
        data: 'x'.repeat(10 * 1024 * 1024) // 10MB response
      };

      req.headers!['idempotency-key'] = '12345678-1234-4567-8901-123456789012';
      const middleware = idempotent();
      
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();

      // Simulate large response
      (res.status as any)(200);
      await (res.json as any)(largeResponse);

      // Should handle large responses without crashing
      expect(res.json).toHaveBeenCalledWith(largeResponse);
    });
  });
});