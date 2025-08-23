import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

describe('API Integration Tests', () => {
  const API_BASE = 'http://localhost:5000';
  let serverProcess: any;

  beforeAll(async () => {
    // Note: In a real test, you'd start the server here
    // For now, we assume the dev server is running
  });

  afterAll(async () => {
    // Cleanup after tests
  });

  describe('Health Check', () => {
    it('should return OK status from health endpoint', async () => {
      const response = await fetch(`${API_BASE}/api/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const response = await fetch(`${API_BASE}/api/organizations`);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });

    it('should handle login with invalid credentials', async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
    });
  });

  describe('API Response Format', () => {
    it('should return consistent error format for 404', async () => {
      const response = await fetch(`${API_BASE}/api/nonexistent`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });
});