import express from 'express';
import { z } from 'zod';
import { validateRequest } from './middleware/validation';
import { asyncHandler } from './middleware/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { requireOrgMember, requireOrgAdmin } from '../middleware/orgSecurity';
import { sendOk, sendCreated, HttpErrors, handleDatabaseError } from '../lib/http';
import { parsePaginationParams, sendPaginatedResponse } from '../lib/pagination';
import { notificationService } from '../services/notificationService';
import { CreateNotificationDTO } from '../../shared/dtos/NotificationDTO';

const router = express.Router();

// All notification routes require authentication
router.use(requireAuth as any);

// GET /api/notifications - Get user notifications with pagination
const getNotificationsQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.enum(['general', 'order', 'design', 'manufacturing', 'fulfillment', 'system']).optional(),
  isRead: z.enum(['true', 'false']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

router.get('/',
  requireOrgMember() as any,
  validateRequest({ query: getNotificationsQuery }) as any,
  asyncHandler<AuthedRequest>(async (req: AuthedRequest, res) => {
    try {
      const { page = '1', limit = '20', category, isRead, priority } = req.query as any;
      const { offset, limit: parsedLimit } = parsePaginationParams({ page, limit });

      const options = {
        limit: parsedLimit,
        offset,
        category,
        isRead: isRead ? isRead === 'true' : undefined,
        priority,
      };

      const userId = req.user?.id;
      const orgId = req.user?.organization_id;
      
      if (!userId || !orgId) {
        return HttpErrors.unauthorized(res, 'User or organization not found');
      }

      const result = await notificationService.getUserNotifications(
        userId,
        orgId,
        options
      );

      sendPaginatedResponse(res, result.notifications, result.totalCount, {
        page: parseInt(page),
        limit: parsedLimit,
        offset
      });
    } catch (error) {
      handleDatabaseError(res, error, 'fetch notifications');
    }
  }) as any
);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count',
  requireOrgMember() as any,
  asyncHandler<AuthedRequest>(async (req: AuthedRequest, res) => {
    try {
      const { category } = req.query as { category?: string };
      
      const userId = req.user?.id;
      const orgId = req.user?.organization_id;
      
      if (!userId || !orgId) {
        return HttpErrors.unauthorized(res, 'User or organization not found');
      }
      
      const count = await notificationService.getUnreadCount(
        userId,
        orgId,
        category
      );

      sendOk(res, { count });
    } catch (error) {
      handleDatabaseError(res, error, 'fetch unread count');
    }
  }) as any
);

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read',
  requireOrgMember() as any,
  asyncHandler<AuthedRequest>(async (req: AuthedRequest, res) => {
    try {
      const { id } = req.params;
      
      const userId = req.user?.id;
      
      if (!userId) {
        return HttpErrors.unauthorized(res, 'User not found');
      }
      
      const notification = await notificationService.markAsRead(id, userId);
      
      sendOk(res, notification);
    } catch (error) {
      handleDatabaseError(res, error, 'mark notification as read');
    }
  }) as any
);

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
const markAllReadBody = z.object({
  category: z.enum(['general', 'order', 'design', 'manufacturing', 'fulfillment', 'system']).optional(),
});

router.patch('/mark-all-read',
  requireOrgMember() as any,
  validateRequest({ body: markAllReadBody }) as any,
  asyncHandler<AuthedRequest>(async (req: AuthedRequest, res) => {
    try {
      const { category } = req.body;
      
      const userId = req.user?.id;
      const orgId = req.user?.organization_id;
      
      if (!userId || !orgId) {
        return HttpErrors.unauthorized(res, 'User or organization not found');
      }
      
      const notifications = await notificationService.markAllAsRead(
        userId,
        orgId,
        category
      );
      
      sendOk(res, { count: notifications.length });
    } catch (error) {
      handleDatabaseError(res, error, 'mark all notifications as read');
    }
  }) as any
);

// POST /api/notifications - Create notification (admin only)
router.post('/',
  requireOrgAdmin() as any, // SECURITY: Requires admin/manager role
  validateRequest({ body: CreateNotificationDTO }) as any,
  asyncHandler<AuthedRequest>(async (req: AuthedRequest, res) => {
    try {
      const notificationData = req.body;
      
      const userOrgId = req.user?.organization_id;
      if (!userOrgId) {
        return HttpErrors.unauthorized(res, 'User organization not found');
      }
      
      // Ensure user can only create notifications for their org
      if (notificationData.orgId !== userOrgId) {
        return HttpErrors.forbidden(res, 'Cannot create notifications for other organizations');
      }
      
      const notification = await notificationService.createNotification(notificationData);
      
      // SECURITY AUDIT: Log notification creation by admin
      console.log(`[SECURITY_AUDIT] NOTIFICATION_CREATED`, {
        timestamp: new Date().toISOString(),
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        notificationId: notification.id,
        targetOrgId: notificationData.orgId,
        targetUserId: notificationData.userId,
        notificationType: notificationData.type,
        category: notificationData.category,
        priority: notificationData.priority,
        hasActionUrl: !!notificationData.actionUrl,
        userAgent: req.headers['user-agent'],
        clientIp: req.ip,
        requestId: req.headers['x-request-id'] || 'unknown'
      });
      
      sendCreated(res, notification);
    } catch (error) {
      handleDatabaseError(res, error, 'create notification');
    }
  }) as any
);

// GET /api/notifications/stats - Get notification statistics
router.get('/stats',
  requireOrgMember() as any,
  asyncHandler<AuthedRequest>(async (req: AuthedRequest, res) => {
    try {
      const userId = req.user?.id;
      const orgId = req.user?.organization_id;

      if (!userId || !orgId) {
        return HttpErrors.unauthorized(res, 'User or organization not found');
      }

      // Get counts by category
      const [
        totalCount,
        orderCount,
        designCount,
        manufacturingCount,
        fulfillmentCount,
        systemCount
      ] = await Promise.all([
        notificationService.getUnreadCount(userId, orgId),
        notificationService.getUnreadCount(userId, orgId, 'order'),
        notificationService.getUnreadCount(userId, orgId, 'design'),
        notificationService.getUnreadCount(userId, orgId, 'manufacturing'),
        notificationService.getUnreadCount(userId, orgId, 'fulfillment'),
        notificationService.getUnreadCount(userId, orgId, 'system'),
      ]);

      const stats = {
        total: totalCount,
        byCategory: {
          order: orderCount,
          design: designCount,
          manufacturing: manufacturingCount,
          fulfillment: fulfillmentCount,
          system: systemCount,
        }
      };

      sendOk(res, stats);
    } catch (error) {
      handleDatabaseError(res, error, 'fetch notification stats');
    }
  }) as any
);

export default router;