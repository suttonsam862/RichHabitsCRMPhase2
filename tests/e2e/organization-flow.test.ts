import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { organizations, orgSports, sports } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Import main API router
import apiRouter from '../../server/routes/index.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('End-to-End Organization Flow', () => {
  let createdOrgId: string;
  let createdSportId: string;

  afterEach(async () => {
    // Clean up created data
    if (createdOrgId && createdSportId) {
      await db.delete(orgSports)
        .where(eq(orgSports.organizationId, createdOrgId));
    }
    if (createdOrgId) {
      await db.delete(organizations).where(eq(organizations.id, createdOrgId));
    }
    if (createdSportId) {
      await db.delete(sports).where(eq(sports.id, createdSportId));
    }
  });

  it('complete organization creation and management flow', async () => {
    // Step 1: Create a new organization
    const newOrg = {
      name: 'E2E Test School',
      email: 'e2e@testschool.edu',
      phone: '+1234567890',
      state: 'CA',
      city: 'San Francisco',
      status: 'School',
      colorPalette: ['#FF0000', '#0000FF'],
      universalDiscounts: { percentage: 15, minOrder: 500 }
    };

    const createResponse = await request(app)
      .post('/api/organizations')
      .send(newOrg)
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.name).toBe(newOrg.name);
    createdOrgId = createResponse.body.data.id;

    // Step 2: Retrieve the created organization
    const getResponse = await request(app)
      .get(`/api/organizations/${createdOrgId}`)
      .expect(200);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(createdOrgId);
    expect(getResponse.body.data.colorPalette).toEqual(newOrg.colorPalette);

    // Step 3: Update organization details
    const updates = {
      phone: '+9876543210',
      notes: 'Updated during E2E test',
      colorPalette: ['#00FF00', '#FF00FF']
    };

    const updateResponse = await request(app)
      .patch(`/api/organizations/${createdOrgId}`)
      .send(updates)
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.phone).toBe(updates.phone);
    expect(updateResponse.body.data.notes).toBe(updates.notes);

    // Step 4: Create a sport for testing sports association
    const sportResult = await db
      .insert(sports)
      .values({ name: 'E2E Test Basketball' })
      .returning();
    createdSportId = sportResult[0].id;

    // Step 5: Get organization summary (should include the org but no sports yet)
    const summaryResponse = await request(app)
      .get(`/api/organizations/${createdOrgId}/summary`)
      .expect(200);

    expect(summaryResponse.body.success).toBe(true);
    expect(summaryResponse.body.data.organization.id).toBe(createdOrgId);
    expect(summaryResponse.body.data.organization.phone).toBe(updates.phone);
    expect(summaryResponse.body.data.sports).toEqual([]);
    expect(summaryResponse.body.data.users).toEqual([]);
    expect(summaryResponse.body.data.summary.totalSports).toBe(0);

    // Step 6: Test search functionality
    const searchResponse = await request(app)
      .get('/api/organizations?q=E2E Test')
      .expect(200);

    expect(searchResponse.body.success).toBe(true);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
    
    const foundOrg = searchResponse.body.data.find((org: any) => org.id === createdOrgId);
    expect(foundOrg).toBeDefined();
    expect(foundOrg.name).toBe(newOrg.name);
  });

  it('handles organization deletion flow', async () => {
    // Create an organization for deletion testing
    const orgToDelete = {
      name: 'Delete Test Organization',
      email: 'delete@test.com',
      status: 'Business'
    };

    const createResponse = await request(app)
      .post('/api/organizations')
      .send(orgToDelete)
      .expect(201);

    const orgId = createResponse.body.data.id;

    // Verify it exists
    await request(app)
      .get(`/api/organizations/${orgId}`)
      .expect(200);

    // Delete the organization
    const deleteResponse = await request(app)
      .delete(`/api/organizations/${orgId}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);

    // Verify it's gone
    await request(app)
      .get(`/api/organizations/${orgId}`)
      .expect(404);
  });

  it('validates organization data properly', async () => {
    // Test with invalid data
    const invalidOrg = {
      name: '', // Empty name
      email: 'invalid-email', // Invalid email format
      colorPalette: ['invalid-color'] // Invalid color format
    };

    const response = await request(app)
      .post('/api/organizations')
      .send(invalidOrg)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('validation');
  });

  it('handles branding file operations', async () => {
    // Create organization for branding test
    const orgResponse = await request(app)
      .post('/api/organizations')
      .send({
        name: 'Branding Test Org',
        email: 'branding@test.com',
        status: 'School'
      })
      .expect(201);

    createdOrgId = orgResponse.body.data.id;

    // Test branding file listing (should be empty initially)
    const brandingResponse = await request(app)
      .get(`/api/organizations/${createdOrgId}/files/branding`)
      .expect(200);

    expect(brandingResponse.body.success).toBe(true);
    expect(brandingResponse.body.data).toEqual([]);

    // Test signed upload URL generation
    const signRequest = {
      files: [
        { name: 'logo.png', size: 1024 },
        { name: 'banner.jpg', size: 2048 }
      ]
    };

    const signResponse = await request(app)
      .post(`/api/organizations/${createdOrgId}/files/branding/sign`)
      .send(signRequest)
      .expect(200);

    expect(signResponse.body.success).toBe(true);
    expect(signResponse.body.data.files).toHaveLength(2);
    expect(signResponse.body.data.files[0]).toHaveProperty('name', 'logo.png');
    expect(signResponse.body.data.files[0]).toHaveProperty('signedUrl');
  });
});