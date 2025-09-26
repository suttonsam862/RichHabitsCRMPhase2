import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../../server/services/notificationService';
import type { CreateNotification, CreateRealtimeEvent } from '../../shared/dtos/NotificationDTO';

// Mock dependencies
const mockSupabaseAdmin = {
  from: vi.fn(),
};

const mockWebSocketManager = {
  broadcastToUser: vi.fn(),
  broadcastToOrganization: vi.fn(),
  broadcastToRole: vi.fn(),
};

vi.mock('../../server/lib/supabaseAdmin', () => ({
  supabaseAdmin: mockSupabaseAdmin
}));

vi.mock('../../server/lib/websocket', () => ({
  getWebSocketManager: vi.fn(() => mockWebSocketManager)
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockQuery: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockSingle: any;
  let mockReturning: any;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new NotificationService();
    
    // Create mock chain
    mockSingle = vi.fn();
    mockReturning = vi.fn();
    mockEq = vi.fn().mockReturnThis();
    mockSelect = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockReturnThis();
    mockUpdate = vi.fn().mockReturnThis();
    
    mockQuery = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
      returning: mockReturning,
    };

    // Setup default return chains
    mockSelect.mockReturnValue(mockQuery);
    mockInsert.mockReturnValue(mockQuery);
    mockUpdate.mockReturnValue(mockQuery);
    mockEq.mockReturnValue(mockQuery);
    mockReturning.mockReturnValue(mockQuery);

    // Mock supabase from() method
    mockSupabaseAdmin.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    const mockNotificationData: CreateNotification = {
      orgId: 'org-123',
      userId: 'user-123',
      type: 'order_update',
      title: 'Order Status Updated',
      message: 'Your order #ORD-001 has been shipped',
      category: 'order',
      priority: 'normal',
      actionUrl: '/orders/ord-001',
      data: {
        orderId: 'ord-001',
        orderCode: 'ORD-001',
        newStatus: 'shipped'
      },
      expiresAt: '2025-02-20T10:00:00Z',
      metadata: {
        source: 'order_system',
        trackingNumber: 'FX123456789'
      }
    };

    it('should successfully create notification with broadcast', async () => {
      const mockCreatedNotification = {
        id: 'notification-123',
        ...mockNotificationData,
        isRead: false,
        readAt: null,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      // Mock notification creation
      mockSingle.mockResolvedValueOnce({ data: mockCreatedNotification, error: null });

      const result = await notificationService.createNotification(
        mockNotificationData,
        true // broadcast enabled
      );

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('notifications');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        org_id: mockNotificationData.orgId,
        user_id: mockNotificationData.userId,
        type: mockNotificationData.type,
        title: mockNotificationData.title,
        message: mockNotificationData.message,
        data: mockNotificationData.data,
        category: mockNotificationData.category,
        priority: mockNotificationData.priority,
        action_url: mockNotificationData.actionUrl,
        expires_at: mockNotificationData.expiresAt,
        metadata: mockNotificationData.metadata
      }));

      expect(mockWebSocketManager.broadcastToUser).toHaveBeenCalledWith(
        mockNotificationData.userId,
        mockNotificationData.orgId,
        expect.objectContaining({
          type: 'notification',
          payload: {
            notification: mockCreatedNotification,
            action: 'created'
          },
          timestamp: expect.any(String),
          orgId: mockNotificationData.orgId,
          userId: mockNotificationData.userId
        })
      );

      expect(result).toEqual(mockCreatedNotification);
    });

    it('should create notification without broadcast', async () => {
      const mockCreatedNotification = {
        id: 'notification-456',
        ...mockNotificationData,
        isRead: false,
        readAt: null,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      mockSingle.mockResolvedValueOnce({ data: mockCreatedNotification, error: null });

      const result = await notificationService.createNotification(
        mockNotificationData,
        false // broadcast disabled
      );

      expect(mockWebSocketManager.broadcastToUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockCreatedNotification);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database constraint violation');
      mockSingle.mockResolvedValueOnce({ data: null, error });

      await expect(
        notificationService.createNotification(mockNotificationData, true)
      ).rejects.toThrow('Database constraint violation');
    });

    it('should continue if WebSocket broadcast fails', async () => {
      const mockCreatedNotification = {
        id: 'notification-789',
        ...mockNotificationData,
        isRead: false,
        readAt: null,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      mockSingle.mockResolvedValueOnce({ data: mockCreatedNotification, error: null });

      // Mock WebSocket error
      mockWebSocketManager.broadcastToUser.mockRejectedValueOnce(new Error('WebSocket connection failed'));

      // Should not throw error, should return notification
      const result = await notificationService.createNotification(
        mockNotificationData,
        true
      );

      expect(result).toEqual(mockCreatedNotification);
    });
  });

  describe('createNotifications', () => {
    const mockNotificationsData: CreateNotification[] = [
      {
        orgId: 'org-123',
        userId: 'user-1',
        type: 'order_update',
        title: 'Order Updated',
        message: 'Your order has been updated',
        category: 'order',
        priority: 'normal'
      },
      {
        orgId: 'org-123',
        userId: 'user-2',
        type: 'order_update',
        title: 'Order Updated',
        message: 'Your order has been updated',
        category: 'order',
        priority: 'normal'
      },
      {
        orgId: 'org-123',
        userId: 'user-3',
        type: 'order_update',
        title: 'Order Updated',
        message: 'Your order has been updated',
        category: 'order',
        priority: 'normal'
      }
    ];

    it('should successfully create multiple notifications', async () => {
      const mockCreatedNotifications = mockNotificationsData.map((data, index) => ({
        id: `notification-${index + 1}`,
        ...data,
        isRead: false,
        readAt: null,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }));

      // Mock successful creation for all notifications
      mockCreatedNotifications.forEach((notification) => {
        mockSingle.mockResolvedValueOnce({ data: notification, error: null });
      });

      const result = await notificationService.createNotifications(
        mockNotificationsData,
        true
      );

      expect(result).toEqual({
        successful: mockCreatedNotifications,
        failed: []
      });

      expect(mockWebSocketManager.broadcastToUser).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      const mockCreatedNotifications = [
        {
          id: 'notification-1',
          ...mockNotificationsData[0],
          isRead: false,
          readAt: null,
          createdAt: '2025-01-20T10:00:00Z',
          updatedAt: '2025-01-20T10:00:00Z'
        },
        {
          id: 'notification-3',
          ...mockNotificationsData[2],
          isRead: false,
          readAt: null,
          createdAt: '2025-01-20T10:00:00Z',
          updatedAt: '2025-01-20T10:00:00Z'
        }
      ];

      // Mock successful creation for first and third notifications
      mockSingle.mockResolvedValueOnce({ data: mockCreatedNotifications[0], error: null });
      // Mock failure for second notification
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Database error') });
      // Mock successful creation for third notification
      mockSingle.mockResolvedValueOnce({ data: mockCreatedNotifications[1], error: null });

      const result = await notificationService.createNotifications(
        mockNotificationsData,
        true
      );

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('Database error');

      expect(mockWebSocketManager.broadcastToUser).toHaveBeenCalledTimes(2);
    });

    it('should handle empty notifications array', async () => {
      const result = await notificationService.createNotifications([], true);

      expect(result).toEqual({
        successful: [],
        failed: []
      });

      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
      expect(mockWebSocketManager.broadcastToUser).not.toHaveBeenCalled();
    });
  });

  describe('broadcastEvent', () => {
    const mockEventData: CreateRealtimeEvent = {
      orgId: 'org-123',
      eventType: 'order_status_updated',
      entityType: 'order',
      entityId: 'order-123',
      actorUserId: 'user-123',
      eventData: {
        orderCode: 'ORD-001',
        previousStatus: 'processing',
        newStatus: 'shipped',
        trackingNumber: 'FX123456789'
      },
      broadcastToRoles: ['admin', 'sales', 'manager'],
      isBroadcast: true
    };

    it('should successfully broadcast event to organization and roles', async () => {
      await notificationService.broadcastEvent(mockEventData);

      expect(mockWebSocketManager.broadcastToOrganization).toHaveBeenCalledWith(
        mockEventData.orgId,
        expect.objectContaining({
          type: 'realtime_event',
          payload: {
            eventType: mockEventData.eventType,
            entityType: mockEventData.entityType,
            entityId: mockEventData.entityId,
            eventData: mockEventData.eventData,
            actorUserId: mockEventData.actorUserId
          },
          timestamp: expect.any(String),
          orgId: mockEventData.orgId
        })
      );

      mockEventData.broadcastToRoles?.forEach(role => {
        expect(mockWebSocketManager.broadcastToRole).toHaveBeenCalledWith(
          role,
          mockEventData.orgId,
          expect.objectContaining({
            type: 'realtime_event',
            payload: expect.objectContaining({
              eventType: mockEventData.eventType,
              entityType: mockEventData.entityType
            })
          })
        );
      });
    });

    it('should broadcast to specific user if not organization-wide', async () => {
      const userSpecificEvent: CreateRealtimeEvent = {
        ...mockEventData,
        targetUserId: 'target-user-123',
        isBroadcast: false
      };

      await notificationService.broadcastEvent(userSpecificEvent);

      expect(mockWebSocketManager.broadcastToUser).toHaveBeenCalledWith(
        'target-user-123',
        mockEventData.orgId,
        expect.objectContaining({
          type: 'realtime_event',
          payload: expect.objectContaining({
            eventType: userSpecificEvent.eventType
          })
        })
      );

      expect(mockWebSocketManager.broadcastToOrganization).not.toHaveBeenCalled();
    });

    it('should handle WebSocket broadcasting errors gracefully', async () => {
      mockWebSocketManager.broadcastToOrganization.mockRejectedValueOnce(
        new Error('WebSocket server unavailable')
      );

      // Should not throw error
      await expect(
        notificationService.broadcastEvent(mockEventData)
      ).resolves.toBeUndefined();
    });
  });

  describe('markNotificationAsRead', () => {
    const mockNotificationId = 'notification-123';
    const mockUserId = 'user-123';
    const mockOrgId = 'org-123';

    it('should successfully mark notification as read', async () => {
      const mockNotification = {
        id: mockNotificationId,
        org_id: mockOrgId,
        user_id: mockUserId,
        is_read: false,
        read_at: null
      };

      const mockUpdatedNotification = {
        ...mockNotification,
        is_read: true,
        read_at: '2025-01-20T11:00:00Z',
        updated_at: '2025-01-20T11:00:00Z'
      };

      // Mock notification lookup
      mockSingle.mockResolvedValueOnce({ data: mockNotification, error: null });

      // Mock notification update
      mockSingle.mockResolvedValueOnce({ data: mockUpdatedNotification, error: null });

      const result = await notificationService.markNotificationAsRead(
        mockNotificationId,
        mockUserId,
        mockOrgId
      );

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        is_read: true,
        read_at: expect.any(String),
        updated_at: expect.any(String)
      }));

      expect(mockWebSocketManager.broadcastToUser).toHaveBeenCalledWith(
        mockUserId,
        mockOrgId,
        expect.objectContaining({
          type: 'notification',
          payload: {
            notification: mockUpdatedNotification,
            action: 'read'
          }
        })
      );

      expect(result).toEqual(mockUpdatedNotification);
    });

    it('should throw error if notification not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(
        notificationService.markNotificationAsRead(
          mockNotificationId,
          mockUserId,
          mockOrgId
        )
      ).rejects.toThrow('Notification not found');
    });

    it('should throw error if user does not own notification', async () => {
      const mockNotification = {
        id: mockNotificationId,
        org_id: mockOrgId,
        user_id: 'different-user-456',
        is_read: false
      };

      mockSingle.mockResolvedValueOnce({ data: mockNotification, error: null });

      await expect(
        notificationService.markNotificationAsRead(
          mockNotificationId,
          mockUserId,
          mockOrgId
        )
      ).rejects.toThrow('Unauthorized to mark this notification as read');
    });

    it('should handle already read notifications', async () => {
      const mockNotification = {
        id: mockNotificationId,
        org_id: mockOrgId,
        user_id: mockUserId,
        is_read: true,
        read_at: '2025-01-19T10:00:00Z'
      };

      mockSingle.mockResolvedValueOnce({ data: mockNotification, error: null });

      const result = await notificationService.markNotificationAsRead(
        mockNotificationId,
        mockUserId,
        mockOrgId
      );

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });
  });

  describe('deleteExpiredNotifications', () => {
    it('should successfully delete expired notifications', async () => {
      const mockDeletedNotifications = [
        { id: 'notification-1', expires_at: '2025-01-19T10:00:00Z' },
        { id: 'notification-2', expires_at: '2025-01-18T15:00:00Z' }
      ];

      // Mock delete operation
      mockReturning.mockResolvedValueOnce({ data: mockDeletedNotifications, error: null });

      const result = await notificationService.deleteExpiredNotifications();

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('notifications');
      expect(result).toEqual({
        success: true,
        deletedCount: 2,
        deletedNotifications: mockDeletedNotifications
      });
    });

    it('should handle case where no expired notifications exist', async () => {
      mockReturning.mockResolvedValueOnce({ data: [], error: null });

      const result = await notificationService.deleteExpiredNotifications();

      expect(result).toEqual({
        success: true,
        deletedCount: 0,
        deletedNotifications: []
      });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Database deletion failed');
      mockReturning.mockResolvedValueOnce({ data: null, error });

      await expect(
        notificationService.deleteExpiredNotifications()
      ).rejects.toThrow('Failed to delete expired notifications: Database deletion failed');
    });
  });

  describe('getUserNotifications', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-123';

    it('should successfully retrieve user notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          title: 'Order Shipped',
          message: 'Your order has been shipped',
          type: 'order_update',
          is_read: false,
          created_at: '2025-01-20T10:00:00Z'
        },
        {
          id: 'notification-2',
          title: 'Payment Processed',
          message: 'Your payment has been processed',
          type: 'payment_update',
          is_read: true,
          created_at: '2025-01-19T15:00:00Z'
        }
      ];

      const mockCount = 25;

      // Mock notifications query
      mockReturning.mockResolvedValueOnce({ data: mockNotifications, error: null, count: mockCount });

      const result = await notificationService.getUserNotifications(
        mockUserId,
        mockOrgId,
        {
          page: 1,
          limit: 10,
          unreadOnly: false,
          category: undefined
        }
      );

      expect(result).toEqual({
        notifications: mockNotifications,
        totalCount: mockCount,
        unreadCount: expect.any(Number),
        hasMore: true
      });
    });

    it('should filter unread notifications only', async () => {
      const mockUnreadNotifications = [
        {
          id: 'notification-1',
          title: 'Order Shipped',
          is_read: false,
          created_at: '2025-01-20T10:00:00Z'
        }
      ];

      mockReturning.mockResolvedValueOnce({ data: mockUnreadNotifications, error: null, count: 1 });

      const result = await notificationService.getUserNotifications(
        mockUserId,
        mockOrgId,
        {
          page: 1,
          limit: 10,
          unreadOnly: true
        }
      );

      expect(mockEq).toHaveBeenCalledWith('is_read', false);
      expect(result.notifications).toEqual(mockUnreadNotifications);
    });

    it('should filter by category', async () => {
      const mockOrderNotifications = [
        {
          id: 'notification-1',
          title: 'Order Update',
          category: 'order',
          created_at: '2025-01-20T10:00:00Z'
        }
      ];

      mockReturning.mockResolvedValueOnce({ data: mockOrderNotifications, error: null, count: 1 });

      const result = await notificationService.getUserNotifications(
        mockUserId,
        mockOrgId,
        {
          page: 1,
          limit: 10,
          category: 'order'
        }
      );

      expect(mockEq).toHaveBeenCalledWith('category', 'order');
      expect(result.notifications).toEqual(mockOrderNotifications);
    });
  });
});