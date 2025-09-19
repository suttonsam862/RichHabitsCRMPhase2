import { z } from 'zod';

// Notification DTOs
export const NotificationDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error', 'order_update', 'design_update', 'manufacturing_update', 'fulfillment_update']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  isRead: z.boolean().default(false),
  readAt: z.string().optional(),
  category: z.enum(['general', 'order', 'design', 'manufacturing', 'fulfillment', 'system']).default('general'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  actionUrl: z.string().optional(),
  expiresAt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateNotificationDTO = NotificationDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isRead: true,
  readAt: true,
});

export const UpdateNotificationDTO = NotificationDTO.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const NotificationPreferenceDTO = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.enum(['order', 'design', 'manufacturing', 'fulfillment', 'system']),
  channel: z.enum(['real_time', 'email', 'sms', 'push']),
  isEnabled: z.boolean().default(true),
  settings: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateNotificationPreferenceDTO = NotificationPreferenceDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateNotificationPreferenceDTO = NotificationPreferenceDTO.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Real-time event DTOs
export const RealtimeEventDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  eventType: z.string(),
  entityType: z.enum(['order', 'order_item', 'design_job', 'work_order', 'purchase_order', 'fulfillment']),
  entityId: z.string(),
  actorUserId: z.string().optional(),
  eventData: z.record(z.any()).optional(),
  broadcastToUsers: z.array(z.string()).optional(),
  broadcastToRoles: z.array(z.string()).optional(),
  isBroadcast: z.boolean().default(true),
  processedAt: z.string().optional(),
  createdAt: z.string(),
});

export const CreateRealtimeEventDTO = RealtimeEventDTO.omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

// WebSocket message DTOs
export const WebSocketMessageDTO = z.object({
  type: z.enum([
    'notification',
    'order_update',
    'order_item_update',
    'design_job_update',
    'work_order_update',
    'purchase_order_update',
    'fulfillment_update',
    'user_typing',
    'connection_status'
  ]),
  payload: z.record(z.any()),
  timestamp: z.string(),
  orgId: z.string().optional(),
  userId: z.string().optional(),
});

export const WebSocketAuthDTO = z.object({
  token: z.string(),
  orgId: z.string().optional(),
});

// Type exports
export type Notification = z.infer<typeof NotificationDTO>;
export type CreateNotification = z.infer<typeof CreateNotificationDTO>;
export type UpdateNotification = z.infer<typeof UpdateNotificationDTO>;
export type NotificationPreference = z.infer<typeof NotificationPreferenceDTO>;
export type CreateNotificationPreference = z.infer<typeof CreateNotificationPreferenceDTO>;
export type UpdateNotificationPreference = z.infer<typeof UpdateNotificationPreferenceDTO>;
export type RealtimeEvent = z.infer<typeof RealtimeEventDTO>;
export type CreateRealtimeEvent = z.infer<typeof CreateRealtimeEventDTO>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageDTO>;
export type WebSocketAuth = z.infer<typeof WebSocketAuthDTO>;

// Zod schemas are already exported above in the main section