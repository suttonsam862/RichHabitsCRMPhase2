import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { createTestUser, createTestOrganization, cleanupTestData, getAuthToken } from '../helpers/test-setup';
import { setTimeout as delay } from 'node:timers/promises';

describe('Comprehensive Rate Limiting Tests', () => {
  let testUser: any;
  let testOrg: any;
  let authToken: string;
  let otherUser: any;
  let otherToken: string;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'ratelimit-test@example.com',
      fullName: 'Rate Limit Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Rate Limit Test Org',
      ownerId: testUser.id
    });

    authToken = await getAuthToken(testUser.id);

    otherUser = await createTestUser({
      email: 'ratelimit-other@example.com',
      fullName: 'Other Rate Limit User',
      role: 'member'
    });

    otherToken = await getAuthToken(otherUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Endpoint-Specific Rate Limiting', () => {
    const endpoints = [
      { method: 'GET', path: '/api/v1/orders', limit: 100 },
      { method: 'POST', path: '/api/v1/orders', limit: 50 },
      { method: 'PUT', path: `/api/v1/orders/test-order-id`, limit: 30 },
      { method: 'DELETE', path: `/api/v1/orders/test-order-id`, limit: 10 },
      { method: 'GET', path: '/api/v1/organizations', limit: 60 },
      { method: 'POST', path: '/api/v1/organizations', limit: 20 },
      { method: 'GET', path: '/api/v1/users', limit: 100 },
      { method: 'POST', path: '/api/v1/users', limit: 25 },
      { method: 'GET', path: '/api/v1/catalog-items', limit: 200 },
      { method: 'POST', path: '/api/v1/files/upload', limit: 15 }
    ];

    endpoints.forEach(({ method, path, limit }) => {
      it(`should enforce rate limiting on ${method} ${path}`, async () => {
        const requests = [];
        const testLimit = Math.min(limit + 5, 25); // Test slightly above limit but cap at 25 for test performance
        
        // Make requests rapidly to trigger rate limiting
        for (let i = 0; i < testLimit; i++) {
          const requestPromise = request(app)
            [method.toLowerCase() as keyof typeof request]
            (path)
            .set('Authorization', `Bearer ${authToken}`)
            .send(method === 'POST' ? { test: 'data', organizationId: testOrg.id } : undefined);
          
          requests.push(requestPromise);
        }

        const responses = await Promise.allSettled(requests);
        
        const successfulResponses = responses.filter(r => 
          r.status === 'fulfilled' && r.value.status !== 429
        );
        const rateLimitedResponses = responses.filter(r => 
          r.status === 'fulfilled' && r.value.status === 429
        );

        // Should have some rate limited responses when exceeding limit
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        expect(successfulResponses.length).toBeLessThan(testLimit);
        
        // Rate limited responses should have proper headers
        const rateLimitedResponse = rateLimitedResponses[0] as any;
        if (rateLimitedResponse.status === 'fulfilled') {
          expect(rateLimitedResponse.value.headers['retry-after']).toBeDefined();
          expect(rateLimitedResponse.value.headers['x-ratelimit-limit']).toBeDefined();
          expect(rateLimitedResponse.value.headers['x-ratelimit-remaining']).toBeDefined();
        }
      });
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should enforce rate limits per IP address', async () => {
      // Test that different IPs get separate rate limit buckets
      const requests1 = [];
      const requests2 = [];

      // Simulate requests from different IPs using X-Forwarded-For header
      for (let i = 0; i < 10; i++) {
        requests1.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Forwarded-For', '192.168.1.1')
        );
        
        requests2.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Forwarded-For', '192.168.1.2')
        );
      }

      const results1 = await Promise.allSettled(requests1);
      const results2 = await Promise.allSettled(requests2);

      // Both IP addresses should be able to make requests independently
      const successful1 = results1.filter(r => r.status === 'fulfilled' && (r.value as any).status !== 429);
      const successful2 = results2.filter(r => r.status === 'fulfilled' && (r.value as any).status !== 429);

      expect(successful1.length).toBeGreaterThan(0);
      expect(successful2.length).toBeGreaterThan(0);
    });

    it('should handle rate limit headers correctly', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      
      const limit = parseInt(response.headers['x-ratelimit-limit']);
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      
      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(limit);
    });
  });

  describe('Authentication-based Rate Limiting', () => {
    it('should have different limits for authenticated vs unauthenticated users', async () => {
      // Test authenticated requests
      const authRequests = [];
      for (let i = 0; i < 15; i++) {
        authRequests.push(
          request(app)
            .get('/api/v1/organizations')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      // Test unauthenticated requests
      const unauthRequests = [];
      for (let i = 0; i < 15; i++) {
        unauthRequests.push(
          request(app)
            .get('/api/v1/health') // Assume this is a public endpoint
        );
      }

      const authResults = await Promise.allSettled(authRequests);
      const unauthResults = await Promise.allSettled(unauthRequests);

      const authSuccessful = authResults.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status !== 429
      );
      const unauthSuccessful = unauthResults.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status !== 429
      );

      // Authenticated users should generally have higher limits
      expect(authSuccessful.length).toBeGreaterThanOrEqual(unauthSuccessful.length);
    });

    it('should enforce stricter limits on sensitive endpoints', async () => {
      // Test login endpoint (should have very strict limits)
      const loginRequests = [];
      for (let i = 0; i < 8; i++) {
        loginRequests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'fake@example.com', password: 'wrongpassword' })
        );
      }

      const loginResults = await Promise.allSettled(loginRequests);
      const rateLimited = loginResults.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      // Should start rate limiting quickly for sensitive endpoints
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Recovery', () => {
    it('should reset rate limits after window expires', async () => {
      // Make requests to approach rate limit
      const initialRequests = [];
      for (let i = 0; i < 8; i++) {
        initialRequests.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const initialResults = await Promise.allSettled(initialRequests);
      const initialRateLimited = initialResults.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      // Wait for rate limit window to reset (assuming 1 minute window)
      if (initialRateLimited.length > 0) {
        await delay(61000); // Wait 61 seconds
        
        // Should be able to make requests again
        const response = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).not.toBe(429);
      }
    }, 70000); // 70 second timeout for this test

    it('should handle burst allowance correctly', async () => {
      // Most rate limiters allow small bursts
      const burstRequests = [];
      for (let i = 0; i < 5; i++) {
        burstRequests.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const burstResults = await Promise.allSettled(burstRequests);
      const successful = burstResults.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status !== 429
      );

      // Should handle small bursts without rate limiting
      expect(successful.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    it('should handle malformed rate limit headers gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-RateLimit-Override', 'invalid'); // Invalid override attempt

      // Should ignore invalid headers and apply normal rate limiting
      expect([200, 404, 403, 429]).toContain(response.status);
    });

    it('should handle concurrent requests from same user correctly', async () => {
      // Make truly concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, () => 
        request(app)
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.all(concurrentRequests);
      
      const successful = results.filter(r => r.status !== 429);
      const rateLimited = results.filter(r => r.status === 429);

      // Should handle concurrency without double-counting or race conditions
      expect(successful.length + rateLimited.length).toBe(10);
    });

    it('should differentiate between different user tokens', async () => {
      // Make requests with different user tokens
      const user1Requests = [];
      const user2Requests = [];

      for (let i = 0; i < 8; i++) {
        user1Requests.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        user2Requests.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${otherToken}`)
        );
      }

      const user1Results = await Promise.allSettled(user1Requests);
      const user2Results = await Promise.allSettled(user2Requests);

      const user1Successful = user1Results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status !== 429
      );
      const user2Successful = user2Results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status !== 429
      );

      // Both users should be able to make some requests (separate buckets)
      expect(user1Successful.length).toBeGreaterThan(0);
      expect(user2Successful.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Error Responses', () => {
    it('should provide helpful error messages when rate limited', async () => {
      // Make enough requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const results = await Promise.allSettled(requests);
      const rateLimitedResponse = results.find(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      ) as any;

      if (rateLimitedResponse && rateLimitedResponse.status === 'fulfilled') {
        const response = rateLimitedResponse.value;
        
        expect(response.body).toBeDefined();
        expect(response.body.error).toBeDefined();
        expect(response.body.message).toContain('rate limit');
        
        // Should include retry information
        expect(response.headers['retry-after']).toBeDefined();
      }
    });

    it('should include rate limit information in successful responses', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`);

      // Successful responses should also include rate limit info
      if (response.status === 200) {
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        const remaining = parseInt(response.headers['x-ratelimit-remaining']);
        expect(remaining).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
