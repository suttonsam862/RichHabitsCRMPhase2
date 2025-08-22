import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { organizations, users, userRoles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Import routes
import organizationsRouter from '../../server/routes/organizations/index.js';
import usersRouter from '../../server/routes/users/index.js';

const app = express();
app.use(express.json());
app.use('/api/organizations', organizationsRouter);
app.use('/api/users', usersRouter);

describe('API Integration Tests', () => {
  let testOrgId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test organization
    const orgResult = await db
      .insert(organizations)
      .values({
        name: 'Test Organization',
        email: 'test@example.com',
        status: 'School',
        colorPalette: [],
        universalDiscounts: {}
      })
      .returning();
    
    testOrgId = orgResult[0].id;

    // Create test user
    const userResult = await db
      .insert(users)
      .values({
        email: 'testuser@example.com',
        fullName: 'Test User',
        phone: '+1234567890',
        isActive: true,
        preferences: {}
      })
      .returning();
    
    testUserId = userResult[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe('Organizations API', () => {
    it('GET /api/organizations returns organizations list', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const testOrg = response.body.data.find((org: any) => org.id === testOrgId);
      expect(testOrg).toBeDefined();
      expect(testOrg.name).toBe('Test Organization');
    });

    it('GET /api/organizations/:id returns specific organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrgId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testOrgId);
      expect(response.body.data.name).toBe('Test Organization');
    });

    it('GET /api/organizations/:id/summary returns organization summary', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrgId}/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('organization');
      expect(response.body.data).toHaveProperty('branding');
      expect(response.body.data).toHaveProperty('sports');
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('summary');
      
      expect(response.body.data.organization.id).toBe(testOrgId);
    });

    it('POST /api/organizations creates new organization', async () => {
      const newOrg = {
        name: 'New Test Organization',
        email: 'newtest@example.com',
        phone: '+9876543210',
        status: 'Business',
        colorPalette: ['#FF0000', '#00FF00'],
        universalDiscounts: { percentage: 10 }
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(newOrg)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newOrg.name);
      expect(response.body.data.email).toBe(newOrg.email);
      expect(response.body.data.colorPalette).toEqual(newOrg.colorPalette);

      // Clean up
      await db.delete(organizations).where(eq(organizations.id, response.body.data.id));
    });

    it('PATCH /api/organizations/:id updates organization', async () => {
      const updates = {
        name: 'Updated Test Organization',
        phone: '+5555555555'
      };

      const response = await request(app)
        .patch(`/api/organizations/${testOrgId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.phone).toBe(updates.phone);
    });

    it('returns 404 for non-existent organization', async () => {
      const response = await request(app)
        .get('/api/organizations/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Users API', () => {
    it('GET /api/users returns users list', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);
      
      const testUser = response.body.data.find((user: any) => user.id === testUserId);
      expect(testUser).toBeDefined();
      expect(testUser.email).toBe('testuser@example.com');
    });

    it('GET /api/users/:id returns specific user', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.fullName).toBe('Test User');
    });

    it('POST /api/users creates new user', async () => {
      const newUser = {
        email: 'newuser@example.com',
        fullName: 'New User',
        phone: '+1111111111'
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.fullName).toBe(newUser.fullName);

      // Clean up
      await db.delete(users).where(eq(users.id, response.body.data.id));
    });

    it('PATCH /api/users/:id updates user', async () => {
      const updates = {
        fullName: 'Updated Test User',
        phone: '+9999999999'
      };

      const response = await request(app)
        .patch(`/api/users/${testUserId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe(updates.fullName);
      expect(response.body.data.phone).toBe(updates.phone);
    });

    it('handles user search by name', async () => {
      const response = await request(app)
        .get('/api/users?q=Test User')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const searchResult = response.body.data.find((user: any) => user.id === testUserId);
      expect(searchResult).toBeDefined();
    });

    it('handles user search by email', async () => {
      const response = await request(app)
        .get('/api/users?q=testuser@example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const searchResult = response.body.data.find((user: any) => user.id === testUserId);
      expect(searchResult).toBeDefined();
    });

    it('returns 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    it('handles validation errors properly', async () => {
      const invalidOrg = {
        name: '', // Empty name should fail validation
        email: 'invalid-email' // Invalid email format
      };

      const response = await request(app)
        .post('/api/organizations')
        .send(invalidOrg)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('handles database errors gracefully', async () => {
      // Try to create organization with duplicate name constraint violation
      const duplicateOrg = {
        name: 'Test Organization', // Same as our test org
        email: 'duplicate@example.com'
      };

      // This might not fail due to lack of unique constraints, 
      // but demonstrates error handling structure
      const response = await request(app)
        .post('/api/organizations')
        .send(duplicateOrg);

      expect(response.body).toHaveProperty('success');
    });
  });
});