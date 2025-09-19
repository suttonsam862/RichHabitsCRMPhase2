import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import request from 'supertest';
import express from 'express';
import { 
  createTestUser, 
  createTestOrganization, 
  createTestOrder,
  cleanupTestData,
  getAuthToken 
} from '../helpers/test-setup';

// Import routes and services
import ordersRouter from '../../server/routes/orders/index';
import notificationsRouter from '../../server/routes/notifications';
import { notificationService } from '../../server/services/notificationService';

// Mock WebSocket manager for testing
const mockConnections = new Map<string, WebSocket>();
const mockBroadcastHistory: any[] = [];

const mockWebSocketManager = {
  broadcastToUser: (userId: string, orgId: string, message: any) => {
    mockBroadcastHistory.push({ userId, orgId, message, timestamp: new Date().toISOString() });
    const connection = mockConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  },
  broadcastToOrganization: (orgId: string, message: any) => {
    mockBroadcastHistory.push({ orgId, message, timestamp: new Date().toISOString(), type: 'org_broadcast' });
    // Broadcast to all users in organization
    for (const [userId, connection] of mockConnections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(message));
      }
    }
  },
  broadcastToRoom: (roomName: string, message: any) => {
    mockBroadcastHistory.push({ roomName, message, timestamp: new Date().toISOString(), type: 'room_broadcast' });
  }
};

// Mock the WebSocket manager
vi.mock('../../server/lib/websocket', () => ({
  getWebSocketManager: () => mockWebSocketManager
}));

describe('Real-time Updates Integration Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testOrg: any;
  let otherUser: any;
  let otherOrg: any;
  let authToken: string;
  let otherAuthToken: string;
  let testOrder: any;
  let wsServer: WebSocket.Server;
  let wsPort: number;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Add auth middleware mock
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        if (token === authToken && testUser) {
          (req as any).user = {
            id: testUser.id,
            email: testUser.email,
            organization_id: testOrg.id,
            role: testUser.role,
            is_super_admin: false
          };
        } else if (token === otherAuthToken && otherUser) {
          (req as any).user = {
            id: otherUser.id,
            email: otherUser.email,
            organization_id: otherOrg.id,
            role: otherUser.role,
            is_super_admin: false
          };
        }
      }
      next();
    });

    // Mount routes
    app.use('/api/orders', ordersRouter);
    app.use('/api/notifications', notificationsRouter);

    // Create test data
    testUser = await createTestUser({
      email: 'realtime-test@example.com',
      fullName: 'Realtime Test User',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Realtime Test Org',
      ownerId: testUser.id
    });

    otherUser = await createTestUser({
      email: 'other-realtime@example.com',
      fullName: 'Other Realtime User',
      role: 'member'
    });

    otherOrg = await createTestOrganization({
      name: 'Other Realtime Org',
      ownerId: otherUser.id
    });

    authToken = await getAuthToken(testUser.id);
    otherAuthToken = await getAuthToken(otherUser.id);

    // Create test order
    testOrder = await createTestOrder({
      organizationId: testOrg.id,
      customerName: 'Realtime Test Customer',
      totalAmount: 299.99,
      status: 'draft'
    });

    // Setup WebSocket test server
    wsPort = 9001;
    wsServer = new WebSocket.Server({ port: wsPort });
    
    wsServer.on('connection', (ws, req) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle authentication
          if (message.type === 'authenticate') {
            const { token, orgId } = message.payload;
            if (token === authToken) {
              mockConnections.set(testUser.id, ws);
              ws.send(JSON.stringify({
                type: 'auth_success',
                payload: { userId: testUser.id, orgId: testOrg.id }
              }));
            } else if (token === otherAuthToken) {
              mockConnections.set(otherUser.id, ws);
              ws.send(JSON.stringify({
                type: 'auth_success',
                payload: { userId: otherUser.id, orgId: otherOrg.id }
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'auth_error',
                payload: { error: 'Invalid token' }
              }));
            }
          }
          
          // Handle room joining
          if (message.type === 'join_room') {
            ws.send(JSON.stringify({
              type: 'room_joined',
              payload: { roomName: message.payload.roomName }
            }));
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        // Remove connection from mock connections
        for (const [userId, connection] of mockConnections) {
          if (connection === ws) {
            mockConnections.delete(userId);
            break;
          }
        }
      });
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    if (wsServer) {
      wsServer.close();
    }
  });

  beforeEach(() => {
    mockBroadcastHistory.length = 0; // Clear broadcast history
  });

  afterEach(() => {
    // Close all WebSocket connections
    for (const [userId, connection] of mockConnections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close();
      }
    }
    mockConnections.clear();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish authenticated WebSocket connection', async () => {
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Send authentication message
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: authToken, orgId: testOrg.id }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            expect(message.payload.userId).toBe(testUser.id);
            expect(message.payload.orgId).toBe(testOrg.id);
            resolve(true);
          } else if (message.type === 'auth_error') {
            reject(new Error(message.payload.error));
          }
        });

        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      ws.close();
    });

    it('should reject invalid authentication tokens', async () => {
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: 'invalid-token', orgId: testOrg.id }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_error') {
            expect(message.payload.error).toBe('Invalid token');
            resolve(true);
          } else {
            reject(new Error('Expected auth error'));
          }
        });

        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      ws.close();
    });

    it('should handle room joining and leaving', async () => {
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      
      await new Promise((resolve, reject) => {
        let authComplete = false;

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: authToken, orgId: testOrg.id }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'auth_success' && !authComplete) {
            authComplete = true;
            // Join order-specific room
            ws.send(JSON.stringify({
              type: 'join_room',
              payload: { roomName: `order_${testOrder.id}` }
            }));
          } else if (message.type === 'room_joined') {
            expect(message.payload.roomName).toBe(`order_${testOrder.id}`);
            resolve(true);
          }
        });

        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('Room join timeout')), 5000);
      });

      ws.close();
    });
  });

  describe('Real-time Order Updates', () => {
    it('should broadcast order status updates in real-time', async () => {
      // Setup WebSocket connection
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      const receivedMessages: any[] = [];
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: authToken, orgId: testOrg.id }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          receivedMessages.push(message);
          
          if (message.type === 'auth_success') {
            resolve(true);
          }
        });

        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('Auth timeout')), 5000);
      });

      // Update order status via API
      const updateResponse = await request(app)
        .patch(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'pending' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Wait for real-time broadcast
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that broadcast was sent
      expect(mockBroadcastHistory.length).toBeGreaterThan(0);
      
      const orderUpdateBroadcast = mockBroadcastHistory.find(
        broadcast => broadcast.message?.type === 'order_update'
      );
      
      expect(orderUpdateBroadcast).toBeDefined();
      expect(orderUpdateBroadcast.userId).toBe(testUser.id);
      expect(orderUpdateBroadcast.message.payload.orderId).toBe(testOrder.id);
      expect(orderUpdateBroadcast.message.payload.status).toBe('pending');

      ws.close();
    });

    it('should not broadcast updates to users from other organizations', async () => {
      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Update order using other user's token (should fail)
      await request(app)
        .patch(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ status: 'confirmed' })
        .expect(403);

      // Should not have any broadcasts for the other user
      const otherUserBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.userId === otherUser.id
      );
      
      expect(otherUserBroadcasts).toHaveLength(0);
    });

    it('should broadcast bulk order updates', async () => {
      // Create additional orders for bulk testing
      const order1 = await createTestOrder({
        organizationId: testOrg.id,
        customerName: 'Bulk Test 1',
        totalAmount: 100,
        status: 'draft'
      });

      const order2 = await createTestOrder({
        organizationId: testOrg.id,
        customerName: 'Bulk Test 2',
        totalAmount: 200,
        status: 'draft'
      });

      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Perform bulk status update
      const bulkUpdate = {
        orderIds: [order1.id, order2.id],
        status: 'pending',
        notes: 'Bulk update test'
      };

      await request(app)
        .post('/api/orders/bulk/status-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkUpdate)
        .expect(200);

      // Wait for broadcasts
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have broadcasts for both orders
      const orderUpdateBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.message?.type === 'order_update'
      );

      expect(orderUpdateBroadcasts.length).toBeGreaterThanOrEqual(2);
      
      // Check that both orders were included in broadcasts
      const broadcastOrderIds = orderUpdateBroadcasts.map(
        broadcast => broadcast.message.payload.orderId
      );
      
      expect(broadcastOrderIds).toContain(order1.id);
      expect(broadcastOrderIds).toContain(order2.id);
    });
  });

  describe('Notification System Integration', () => {
    it('should create and broadcast notifications in real-time', async () => {
      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Create notification via API
      const notificationData = {
        orgId: testOrg.id,
        userId: testUser.id,
        type: 'order_status_change',
        title: 'Order Status Updated',
        message: 'Your order status has been updated to pending',
        category: 'order',
        priority: 'normal',
        actionUrl: `/orders/${testOrder.id}`,
        data: {
          orderId: testOrder.id,
          newStatus: 'pending',
          customerName: 'Realtime Test Customer'
        }
      };

      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(notificationData.title);

      // Wait for real-time broadcast
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that notification was broadcast
      const notificationBroadcast = mockBroadcastHistory.find(
        broadcast => broadcast.message?.type === 'notification'
      );

      expect(notificationBroadcast).toBeDefined();
      expect(notificationBroadcast.userId).toBe(testUser.id);
      expect(notificationBroadcast.orgId).toBe(testOrg.id);
      expect(notificationBroadcast.message.payload.notification.title).toBe(notificationData.title);
    });

    it('should handle notification system batch operations', async () => {
      // Create multiple notifications via service
      const notifications = [
        {
          orgId: testOrg.id,
          userId: testUser.id,
          type: 'system_alert',
          title: 'System Maintenance',
          message: 'Scheduled maintenance in 1 hour',
          category: 'system',
          priority: 'high'
        },
        {
          orgId: testOrg.id,
          userId: testUser.id,
          type: 'order_reminder',
          title: 'Order Due Soon',
          message: 'Order due date approaching',
          category: 'order',
          priority: 'normal'
        }
      ];

      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Create notifications via service (bypassing API for batch testing)
      for (const notificationData of notifications) {
        await notificationService.createNotification(notificationData);
      }

      // Wait for broadcasts
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have broadcasts for all notifications
      const notificationBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.message?.type === 'notification'
      );

      expect(notificationBroadcasts.length).toBe(2);
      
      const broadcastTitles = notificationBroadcasts.map(
        broadcast => broadcast.message.payload.notification.title
      );
      
      expect(broadcastTitles).toContain('System Maintenance');
      expect(broadcastTitles).toContain('Order Due Soon');
    });

    it('should enforce organization isolation in notifications', async () => {
      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Try to create notification for other organization
      const invalidNotificationData = {
        orgId: otherOrg.id, // Different org
        userId: otherUser.id,
        type: 'test_notification',
        title: 'Cross-org test',
        message: 'This should not work',
        category: 'general',
        priority: 'normal'
      };

      await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`) // testUser trying to create for otherOrg
        .send(invalidNotificationData)
        .expect(403);

      // Should not have any broadcasts
      expect(mockBroadcastHistory).toHaveLength(0);
    });
  });

  describe('Cross-service Real-time Integration', () => {
    it('should trigger notifications when order workflow progresses', async () => {
      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Progress order through multiple status changes
      const statusProgression = ['pending', 'confirmed', 'in_production'];

      for (const status of statusProgression) {
        await request(app)
          .patch(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status })
          .expect(200);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should have multiple order update broadcasts
      const orderUpdateBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.message?.type === 'order_update'
      );

      expect(orderUpdateBroadcasts.length).toBe(3);

      // Verify status progression in broadcasts
      const statuses = orderUpdateBroadcasts.map(
        broadcast => broadcast.message.payload.status
      );

      expect(statuses).toEqual(statusProgression);
    });

    it('should handle real-time updates during concurrent operations', async () => {
      // Create multiple orders for concurrent testing
      const concurrentOrders = await Promise.all([
        createTestOrder({ organizationId: testOrg.id, customerName: 'Concurrent 1', totalAmount: 100 }),
        createTestOrder({ organizationId: testOrg.id, customerName: 'Concurrent 2', totalAmount: 200 }),
        createTestOrder({ organizationId: testOrg.id, customerName: 'Concurrent 3', totalAmount: 300 })
      ]);

      // Clear broadcast history
      mockBroadcastHistory.length = 0;

      // Update all orders concurrently
      const updatePromises = concurrentOrders.map(order =>
        request(app)
          .patch(`/api/orders/${order.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'pending' })
      );

      const responses = await Promise.all(updatePromises);

      // All updates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Wait for all broadcasts
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have broadcasts for all concurrent updates
      const orderUpdateBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.message?.type === 'order_update'
      );

      expect(orderUpdateBroadcasts.length).toBe(3);

      // All broadcasts should be for the test user's organization
      orderUpdateBroadcasts.forEach(broadcast => {
        expect(broadcast.orgId).toBe(testOrg.id);
        expect(broadcast.userId).toBe(testUser.id);
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-frequency real-time updates', async () => {
      const startTime = Date.now();
      mockBroadcastHistory.length = 0;

      // Create 20 rapid order updates
      const rapidUpdates = Array(20).fill(null).map((_, index) =>
        request(app)
          .patch(`/api/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            notes: `Rapid update ${index}`,
            priority: index % 2 === 0 ? 'high' : 'normal'
          })
      );

      await Promise.all(rapidUpdates);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All updates should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds

      // Wait for all broadcasts
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have broadcast for each update
      const orderUpdateBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.message?.type === 'order_update'
      );

      expect(orderUpdateBroadcasts.length).toBe(20);
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      const ws1 = new WebSocket(`ws://localhost:${wsPort}`);
      const ws2 = new WebSocket(`ws://localhost:${wsPort}`);

      // Setup first connection
      await new Promise((resolve, reject) => {
        ws1.on('open', () => {
          ws1.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: authToken, orgId: testOrg.id }
          }));
        });

        ws1.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            resolve(true);
          }
        });

        ws1.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Setup second connection
      await new Promise((resolve, reject) => {
        ws2.on('open', () => {
          ws2.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: authToken, orgId: testOrg.id }
          }));
        });

        ws2.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            resolve(true);
          }
        });

        ws2.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Force close first connection
      ws1.close();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Perform order update - should still work with remaining connection
      mockBroadcastHistory.length = 0;

      await request(app)
        .patch(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(200);

      // Should still broadcast despite first connection being closed
      await new Promise(resolve => setTimeout(resolve, 100));

      const orderUpdateBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.message?.type === 'order_update'
      );

      expect(orderUpdateBroadcasts.length).toBeGreaterThan(0);

      ws2.close();
    });

    it('should properly clean up resources on disconnection', async () => {
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      
      // Authenticate and get connection established
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: authToken, orgId: testOrg.id }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            resolve(true);
          }
        });

        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Verify connection is in mock connections
      expect(mockConnections.has(testUser.id)).toBe(true);

      // Close connection
      ws.close();

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Connection should be removed from mock connections
      expect(mockConnections.has(testUser.id)).toBe(false);
    });
  });

  describe('Message Broadcasting Patterns', () => {
    it('should support user-specific broadcasts', async () => {
      mockBroadcastHistory.length = 0;

      // Send user-specific message
      const userMessage = {
        type: 'user_notification',
        payload: { message: 'Personal message', userId: testUser.id },
        timestamp: new Date().toISOString(),
        orgId: testOrg.id,
        userId: testUser.id
      };

      mockWebSocketManager.broadcastToUser(testUser.id, testOrg.id, userMessage);

      // Should have exactly one broadcast for the specific user
      const userBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.userId === testUser.id
      );

      expect(userBroadcasts).toHaveLength(1);
      expect(userBroadcasts[0].message.type).toBe('user_notification');
    });

    it('should support organization-wide broadcasts', async () => {
      mockBroadcastHistory.length = 0;

      // Send organization-wide message
      const orgMessage = {
        type: 'org_announcement',
        payload: { message: 'Organization-wide announcement', importance: 'high' },
        timestamp: new Date().toISOString(),
        orgId: testOrg.id
      };

      mockWebSocketManager.broadcastToOrganization(testOrg.id, orgMessage);

      // Should have organization broadcast
      const orgBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.type === 'org_broadcast'
      );

      expect(orgBroadcasts).toHaveLength(1);
      expect(orgBroadcasts[0].orgId).toBe(testOrg.id);
      expect(orgBroadcasts[0].message.type).toBe('org_announcement');
    });

    it('should support room-based broadcasts', async () => {
      mockBroadcastHistory.length = 0;

      // Send room-specific message
      const roomMessage = {
        type: 'room_update',
        payload: { message: 'Room-specific update', roomData: { active: true } },
        timestamp: new Date().toISOString()
      };

      const roomName = `order_${testOrder.id}`;
      mockWebSocketManager.broadcastToRoom(roomName, roomMessage);

      // Should have room broadcast
      const roomBroadcasts = mockBroadcastHistory.filter(
        broadcast => broadcast.type === 'room_broadcast'
      );

      expect(roomBroadcasts).toHaveLength(1);
      expect(roomBroadcasts[0].roomName).toBe(roomName);
      expect(roomBroadcasts[0].message.type).toBe('room_update');
    });
  });
});