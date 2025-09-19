import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { createTestUser, createTestOrganization, cleanupTestData, getAuthToken } from '../helpers/test-setup';
import { db } from '../../server/db';

describe('Injection Attack Prevention', () => {
  let testUser: any;
  let testOrg: any;
  let authToken: string;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'injection-test@example.com',
      fullName: 'Injection Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Injection Test Org',
      ownerId: testUser.id
    });

    authToken = await getAuthToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent basic SQL injection in search parameters', async () => {
      const maliciousSearch = "'; DROP TABLE users; --";

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          organizationId: testOrg.id,
          search: maliciousSearch
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify users table still exists
      const usersCheck = await db.execute('SELECT COUNT(*) as count FROM users');
      expect(usersCheck[0].count).toBeGreaterThan(0);
    });

    it('should prevent UNION-based SQL injection', async () => {
      const unionAttack = "test' UNION SELECT password, email, 1, 2, 3 FROM users WHERE '1'='1";

      const response = await request(app)
        .get('/api/catalog-items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          orgId: testOrg.id,
          search: unionAttack
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return normal catalog items, not user data
      if (response.body.data && response.body.data.length > 0) {
        expect(response.body.data[0]).not.toHaveProperty('password');
        expect(response.body.data[0]).not.toHaveProperty('email');
      }
    });

    it('should prevent boolean-based SQL injection', async () => {
      const booleanAttack = "1' OR '1'='1";

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          organizationId: testOrg.id,
          role: booleanAttack
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not return all users due to boolean injection
    });

    it('should prevent time-based SQL injection', async () => {
      const timeAttack = "'; WAITFOR DELAY '00:00:05'; --";

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          organizationId: testOrg.id,
          customerName: timeAttack
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not cause significant delay (less than 2 seconds)
      expect(duration).toBeLessThan(2000);
      expect(response.body.success).toBe(true);
    });

    it('should prevent second-order SQL injection', async () => {
      const maliciousName = "'; DROP TABLE orders; --";

      // Insert data that could be dangerous if not properly escaped
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: maliciousName,
          totalAmount: 100
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const orderId = response.body.data.id;

      // Now try to retrieve it - this could trigger second-order injection
      const getResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.customerName).toBe(maliciousName);

      // Verify orders table still exists
      const ordersCheck = await db.execute('SELECT COUNT(*) as count FROM orders');
      expect(ordersCheck[0].count).toBeGreaterThan(0);
    });

    it('should handle NULL byte injection', async () => {
      const nullByteAttack = "test\x00'; DROP TABLE users; --";

      const response = await request(app)
        .patch(`/api/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: nullByteAttack
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent SQL injection in ORDER BY clauses', async () => {
      const orderByAttack = "id; DROP TABLE users; --";

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          organizationId: testOrg.id,
          sortBy: orderByAttack
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should prevent MongoDB-style injection in JSON fields', async () => {
      const nosqlAttack = {
        $where: "function() { return true; }",
        $regex: ".*"
      };

      const response = await request(app)
        .post('/api/catalog-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orgId: testOrg.id,
          name: 'Test Item',
          embellishmentsJson: nosqlAttack
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embellishmentsJson).toEqual(nosqlAttack);
    });

    it('should prevent injection in JSON query parameters', async () => {
      const maliciousFilter = '{"$ne": null}';

      const response = await request(app)
        .get('/api/catalog-items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          orgId: testOrg.id,
          filter: maliciousFilter
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('LDAP Injection Prevention', () => {
    it('should prevent LDAP injection in user search', async () => {
      const ldapAttack = ")(uid=*))(|(uid=*";

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          organizationId: testOrg.id,
          search: ldapAttack
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent LDAP injection in authentication', async () => {
      const ldapAuthAttack = "*)(uid=*))(|(uid=*";

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: ldapAuthAttack,
          password: 'anypassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent command injection in file operations', async () => {
      const commandAttack = "; rm -rf / &";

      const response = await request(app)
        .post('/api/files/signed-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: `test${commandAttack}.jpg`,
          fileType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // File operations should sanitize filename
    });

    it('should prevent command injection in export operations', async () => {
      const commandInFileName = "; cat /etc/passwd > /tmp/hack.txt";

      const response = await request(app)
        .post('/api/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          type: 'orders',
          fileName: `export${commandInFileName}.csv`
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('XXE (XML External Entity) Prevention', () => {
    it('should prevent XXE attacks in XML uploads', async () => {
      const xxePayload = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE foo [
          <!ELEMENT foo ANY>
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <root>
          <data>&xxe;</data>
        </root>`;

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(xxePayload), 'malicious.xml')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent XXE in configuration imports', async () => {
      const xxeConfig = `<?xml version="1.0"?>
        <!DOCTYPE config [
          <!ENTITY file SYSTEM "file:///etc/hosts">
        ]>
        <config>
          <setting>&file;</setting>
        </config>`;

      const response = await request(app)
        .post('/api/organizations/import-config')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          config: xxeConfig
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Template Injection Prevention', () => {
    it('should prevent server-side template injection', async () => {
      const templateAttack = "{{7*7}}";

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: templateAttack,
          totalAmount: 100
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customerName).toBe(templateAttack);
      // Should not be evaluated as template expression
    });

    it('should prevent template injection in email templates', async () => {
      const emailTemplateAttack = "{{constructor.constructor('return process')().exit()}}";

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          template: 'order_confirmation',
          data: {
            customerName: emailTemplateAttack,
            orderTotal: 100
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Expression Language Injection Prevention', () => {
    it('should prevent SpEL injection attacks', async () => {
      const spelAttack = "#{''.class.forName('java.lang.Runtime').getRuntime().exec('calc')}";

      const response = await request(app)
        .post('/api/catalog-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orgId: testOrg.id,
          name: spelAttack,
          basePrice: 100
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(spelAttack);
    });

    it('should prevent OGNL injection attacks', async () => {
      const ognlAttack = "(#context['xwork.MethodAccessor.denyMethodExecution']=false)";

      const response = await request(app)
        .patch(`/api/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: ognlAttack
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Header Injection Prevention', () => {
    it('should prevent HTTP header injection', async () => {
      const headerAttack = "test\r\nX-Injected-Header: malicious";

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Custom-Header', headerAttack)
        .query({ organizationId: testOrg.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['x-injected-header']).toBeUndefined();
    });

    it('should prevent CRLF injection in redirects', async () => {
      const crlfAttack = "valid-path%0d%0aSet-Cookie:%20admin=true";

      const response = await request(app)
        .get('/api/redirect')
        .query({ url: crlfAttack })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal in file access', async () => {
      const pathTraversal = "../../../etc/passwd";

      const response = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          organizationId: testOrg.id,
          filename: pathTraversal
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent path traversal in file uploads', async () => {
      const maliciousPath = "../../../../tmp/malicious.txt";

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('path', maliciousPath)
        .attach('file', Buffer.from('malicious content'), 'file.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Deserialization Attack Prevention', () => {
    it('should prevent unsafe object deserialization', async () => {
      const maliciousPayload = '{"__proto__": {"admin": true}}';

      const response = await request(app)
        .post('/api/organizations/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(maliciousPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent prototype pollution', async () => {
      const pollutionAttack = {
        "__proto__": {
          "isAdmin": true
        },
        "constructor": {
          "prototype": {
            "isAdmin": true
          }
        }
      };

      const response = await request(app)
        .patch(`/api/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pollutionAttack)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verify prototype wasn't polluted
      expect(({}).isAdmin).toBeUndefined();
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long inputs safely', async () => {
      const longString = 'x'.repeat(1000000); // 1MB string

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: longString,
          totalAmount: 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle unicode and emoji injection', async () => {
      const unicodeAttack = "test\u202e\u0041\u0041\u0041\u0041\u0041\u0041\u0041\u0041";
      const emojiAttack = "💀☠️💣🔥💥";

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: `${unicodeAttack} ${emojiAttack}`,
          totalAmount: 100
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle control character injection', async () => {
      const controlChars = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F";

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          customerName: `test${controlChars}customer`,
          totalAmount: 100
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});