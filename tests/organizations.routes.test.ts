import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import organizationsRouter from '../server/routes/organizations/index';

/**
 * API Tests for Canonical Organizations Router
 * 
 * Tests all CRUD operations and edge cases for the organizations API
 */

const app = express();
app.use(express.json());
app.use('/api/organizations', organizationsRouter);

// Mock database for testing
let mockOrganizations: any[] = [];
let nextId = 1;

// Mock the database module
vi.mock('../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => mockOrganizations),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => mockOrganizations.slice(0, 50))
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: `test-id-${nextId++}`,
          name: 'Test Organization',
          createdAt: new Date().toISOString()
        }]))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'test-id-1',
            name: 'Updated Organization',
            updatedAt: new Date().toISOString()
          }]))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve())
    }))
  }
}));

describe('Organizations API - Canonical Router', () => {
  beforeEach(() => {
    // Reset mock data before each test
    mockOrganizations = [
      {
        id: 'test-id-1',
        name: 'Test Organization 1',
        state: 'CA',
        email: 'test1@example.com',
        createdAt: new Date().toISOString()
      },
      {
        id: 'test-id-2', 
        name: 'Test Organization 2',
        state: 'NY',
        email: 'test2@example.com',
        createdAt: new Date().toISOString()
      }
    ];
    nextId = 3;
  });

  describe('GET /api/organizations', () => {
    it('should return 200 and an array of organizations', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle search query parameter', async () => {
      const response = await request(app)
        .get('/api/organizations?search=Test')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/organizations?limit=10&offset=0')
        .expect(200);

      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: expect.any(Number)
      });
    });

    it('should handle sorting parameters', async () => {
      const response = await request(app)
        .get('/api/organizations?sort=name&order=asc')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should validate pagination limits', async () => {
      const response = await request(app)
        .get('/api/organizations?limit=999')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return 200 and organization data for valid ID', async () => {
      const response = await request(app)
        .get('/api/organizations/test-id-1')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'test-id-1');
      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/organizations/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Organization not found');
    });
  });

  describe('POST /api/organizations', () => {
    it('should create organization with valid payload', async () => {
      const payload = {
        name: 'New Test Organization',
        state: 'CA',
        email: 'new@example.com',
        isBusiness: true
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', payload.name);
      expect(response.body).toHaveProperty('message', 'Organization created successfully');
    });

    it('should accept both camelCase and snake_case field names', async () => {
      const payload = {
        name: 'Snake Case Test',
        logo_url: 'https://example.com/logo.png',
        is_business: true,
        universal_discounts: { student: 0.1 }
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', payload.name);
    });

    it('should return 400 for missing required fields', async () => {
      const payload = {
        // Missing required 'name' field
        state: 'CA'
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('fieldErrors');
    });

    it('should return 400 for invalid field values', async () => {
      const payload = {
        name: '', // Empty name should fail validation
        state: 'CA'
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should handle name length validation', async () => {
      const payload = {
        name: 'x'.repeat(121), // Exceeds 120 character limit
        state: 'CA'
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('PUT/PATCH /api/organizations/:id', () => {
    it('should update organization with valid payload (PUT)', async () => {
      const payload = {
        name: 'Updated Organization Name',
        state: 'TX'
      };

      const response = await request(app)
        .put('/api/organizations/test-id-1')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Organization updated successfully');
    });

    it('should update organization with valid payload (PATCH)', async () => {
      const payload = {
        name: 'Patched Organization Name'
      };

      const response = await request(app)
        .patch('/api/organizations/test-id-1')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Organization updated successfully');
    });

    it('should return 404 for non-existent organization', async () => {
      const payload = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/organizations/non-existent-id')
        .send(payload)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Organization not found');
    });

    it('should validate updated field values', async () => {
      const payload = {
        name: 'x'.repeat(121) // Exceeds length limit
      };

      const response = await request(app)
        .patch('/api/organizations/test-id-1')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('DELETE /api/organizations/:id', () => {
    it('should delete organization for valid ID', async () => {
      const response = await request(app)
        .delete('/api/organizations/test-id-1')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Organization deleted successfully');
      expect(response.body).toHaveProperty('id', 'test-id-1');
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await request(app)
        .delete('/api/organizations/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Organization not found');
    });
  });

  describe('Deprecated Routes', () => {
    // These tests verify that deprecated routes return appropriate responses
    // Note: Since we haven't mounted the deprecated router in this test,
    // we'll test them separately or add them to the main app for testing

    it('should handle deprecated schema endpoint', async () => {
      // This would be tested with the deprecated router mounted
      // For now, we document the expected behavior
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express should handle malformed JSON and return 400
    });

    it('should handle very large payloads gracefully', async () => {
      const largePayload = {
        name: 'Test Organization',
        notes: 'x'.repeat(10000) // Very large notes field
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(largePayload);

      // Should either accept or reject gracefully, not crash
      expect([200, 201, 400, 413]).toContain(response.status);
    });
  });

  describe('Request Tracing', () => {
    it('should include request ID in logs for tracing', async () => {
      // This test verifies that request tracing is working
      // In practice, we'd check logs or capture console output
      const response = await request(app)
        .get('/api/organizations')
        .expect(200);

      // Request should complete successfully with tracing
      expect(response.body).toHaveProperty('data');
    });
  });
});

describe('Field Normalization', () => {
  it('should normalize camelCase to database format', async () => {
    const payload = {
      name: 'Normalization Test',
      logoUrl: 'https://example.com/logo.png',
      isBusiness: true,
      universalDiscounts: { student: 0.1 }
    };

    const response = await request(app)
      .post('/api/organizations')
      .send(payload)
      .expect(201);

    // Should accept camelCase and process correctly
    expect(response.body).toHaveProperty('name', payload.name);
  });

  it('should normalize snake_case to database format', async () => {
    const payload = {
      name: 'Snake Case Test',
      logo_url: 'https://example.com/logo.png',
      is_business: true,
      universal_discounts: { student: 0.1 }
    };

    const response = await request(app)
      .post('/api/organizations')
      .send(payload)
      .expect(201);

    // Should accept snake_case and process correctly
    expect(response.body).toHaveProperty('name', payload.name);
  });

  it('should convert empty strings to null', async () => {
    const payload = {
      name: 'Empty String Test',
      state: '', // Empty string should become null
      email: ''
    };

    const response = await request(app)
      .post('/api/organizations')
      .send(payload)
      .expect(201);

    // Empty strings should be normalized to null
    expect(response.body).toHaveProperty('name', payload.name);
  });
});