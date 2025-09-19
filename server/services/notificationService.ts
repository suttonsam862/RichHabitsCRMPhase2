import { supabaseAdmin } from '../lib/supabaseAdmin';
import { getWebSocketManager } from '../lib/websocket';
import { CreateNotification, CreateRealtimeEvent, WebSocketMessage } from '../../shared/dtos/NotificationDTO';

export class NotificationService {
  
  /**
   * Create a notification and optionally broadcast it in real-time
   */
  async createNotification(notification: CreateNotification, broadcast: boolean = true) {
    try {
      // Insert notification into database
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          org_id: notification.orgId,
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          category: notification.category,
          priority: notification.priority,
          action_url: notification.actionUrl,
          expires_at: notification.expiresAt,
          metadata: notification.metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      // Broadcast in real-time if enabled
      if (broadcast) {
        try {
          const wsManager = getWebSocketManager();
          const message: WebSocketMessage = {
            type: 'notification',
            payload: {
              notification: data,
              action: 'created'
            },
            timestamp: new Date().toISOString(),
            orgId: notification.orgId,
            userId: notification.userId,
          };

          wsManager.broadcastToUser(notification.userId, notification.orgId, message);
        } catch (wsError) {
          console.error('Error broadcasting notification:', wsError);
          // Don't throw - notification was saved successfully
        }
      }

      return data;
    } catch (error) {
      console.error('Error in createNotification:', error);
      throw error;
    }
  }

  /**
   * Create multiple notifications for different users
   */
  async createNotifications(notifications: CreateNotification[], broadcast: boolean = true) {
    try {
      const results = await Promise.allSettled(
        notifications.map(notification => this.createNotification(notification, broadcast))
      );

      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      if (failed.length > 0) {
        console.error(`${failed.length} notifications failed to create:`, failed);
      }

      return { successful, failed: failed.length };
    } catch (error) {
      console.error('Error in createNotifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markAllAsRead(userId: string, orgId?: string, category?: string) {
    try {
      let query = supabaseAdmin
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('Error marking notifications as read:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string, 
    orgId: string, 
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      isRead?: boolean;
      priority?: string;
    } = {}
  ) {
    try {
      const { limit = 50, offset = 0, category, isRead, priority } = options;

      let query = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq('category', category);
      }

      if (isRead !== undefined) {
        query = query.eq('is_read', isRead);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching user notifications:', error);
        throw error;
      }

      return { notifications: data || [], totalCount: count || 0 };
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string, orgId: string, category?: string) {
    try {
      let query = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_read', false);

      if (category) {
        query = query.eq('category', category);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching unread count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications based on retention policy
   */
  async cleanupExpiredNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .or(`expires_at.lt.${new Date().toISOString()},created_at.lt.${thirtyDaysAgo}`);

      if (error) {
        console.error('Error cleaning up notifications:', error);
        throw error;
      }

      console.log('✅ Expired notifications cleaned up successfully');
    } catch (error) {
      console.error('Error in cleanupExpiredNotifications:', error);
      throw error;
    }
  }

  /**
   * Create order-related notification helpers
   */
  async createOrderNotification(
    orgId: string, 
    userId: string, 
    orderId: string, 
    type: string, 
    title: string, 
    message: string, 
    additionalData?: any
  ) {
    return this.createNotification({
      orgId,
      userId,
      type: 'order_update',
      title,
      message,
      category: 'order',
      priority: type.includes('urgent') ? 'urgent' : 'normal',
      actionUrl: `/orders/${orderId}`,
      data: {
        orderId,
        orderUpdateType: type,
        ...additionalData
      }
    });
  }

  async createDesignJobNotification(
    orgId: string, 
    userId: string, 
    designJobId: string, 
    orderId: string,
    type: string, 
    title: string, 
    message: string, 
    additionalData?: any
  ) {
    return this.createNotification({
      orgId,
      userId,
      type: 'design_update',
      title,
      message,
      category: 'design',
      priority: type.includes('urgent') ? 'urgent' : 'normal',
      actionUrl: `/orders/${orderId}/design-jobs/${designJobId}`,
      data: {
        designJobId,
        orderId,
        designUpdateType: type,
        ...additionalData
      }
    });
  }

  async createManufacturingNotification(
    orgId: string, 
    userId: string, 
    workOrderId: string, 
    orderId: string,
    type: string, 
    title: string, 
    message: string, 
    additionalData?: any
  ) {
    return this.createNotification({
      orgId,
      userId,
      type: 'manufacturing_update',
      title,
      message,
      category: 'manufacturing',
      priority: type.includes('urgent') ? 'urgent' : 'normal',
      actionUrl: `/orders/${orderId}/manufacturing/${workOrderId}`,
      data: {
        workOrderId,
        orderId,
        manufacturingUpdateType: type,
        ...additionalData
      }
    });
  }

  /**
   * Broadcast real-time event with proper entity type → message type mapping
   */
  async broadcastEvent(eventData: CreateRealtimeEvent, createNotifications: boolean = true) {
    try {
      const wsManager = getWebSocketManager();
      
      // Map entityType to proper message type
      const messageType = this.mapEntityTypeToMessageType(eventData.entityType);
      
      // Create WebSocket message with proper structure
      const message = {
        type: messageType,
        payload: {
          event: eventData.eventType,
          entityType: eventData.entityType,
          entityId: eventData.entityId,
          data: eventData.eventData,
          actorUserId: eventData.actorUserId,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        orgId: eventData.orgId,
      };

      // Save event to database first
      const { data: savedEvent, error: saveError } = await supabaseAdmin
        .from('realtime_events')
        .insert({
          org_id: eventData.orgId,
          event_type: eventData.eventType,
          entity_type: eventData.entityType,
          entity_id: eventData.entityId,
          actor_user_id: eventData.actorUserId,
          event_data: eventData.eventData,
          broadcast_to_users: eventData.broadcastToUsers,
          broadcast_to_roles: eventData.broadcastToRoles,
          is_broadcast: eventData.isBroadcast,
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving realtime event:', saveError);
      }

      // Broadcast to appropriate audience
      if (eventData.isBroadcast) {
        if (eventData.broadcastToUsers?.length) {
          // Broadcast to specific users
          eventData.broadcastToUsers.forEach(userId => {
            wsManager.broadcastToUser(userId, eventData.orgId, message);
          });
        } else {
          // Broadcast to entire organization
          wsManager.broadcastToOrganization(eventData.orgId, message);
        }
      }

      // Mark event as processed
      if (savedEvent) {
        await supabaseAdmin
          .from('realtime_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', savedEvent.id);
      }

      // Create notifications based on event type
      if (createNotifications) {
        await this.createEventNotifications(eventData);
      }

      console.log(`📡 Event broadcasted: ${eventData.eventType} for ${eventData.entityType}:${eventData.entityId}`);
      
    } catch (error) {
      console.error('Error broadcasting event:', error);
      // Don't throw - this should not break the main operation
    }
  }

  /**
   * Map entity type to proper WebSocket message type
   */
  private mapEntityTypeToMessageType(entityType: string): string {
    switch (entityType) {
      case 'order':
        return 'order_update';
      case 'order_item':
        return 'order_item_update';
      case 'design_job':
        return 'design_job_update';
      case 'work_order':
        return 'work_order_update';
      case 'purchase_order':
        return 'purchase_order_update';
      case 'fulfillment':
        return 'fulfillment_update';
      default:
        return 'notification';
    }
  }

  private async createEventNotifications(eventData: CreateRealtimeEvent) {
    try {
      // Get users who should be notified based on event type and data
      const usersToNotify = await this.getUsersForEventNotification(eventData);

      if (usersToNotify.length === 0) {
        return;
      }

      const notifications = usersToNotify.map(user => ({
        orgId: eventData.orgId,
        userId: user.id,
        type: this.mapEventTypeToNotificationType(eventData.eventType),
        title: this.generateNotificationTitle(eventData),
        message: this.generateNotificationMessage(eventData),
        category: this.mapEntityTypeToCategory(eventData.entityType),
        priority: this.getEventPriority(eventData),
        actionUrl: this.generateActionUrl(eventData),
        data: eventData.eventData,
      }));

      await this.createNotifications(notifications);
    } catch (error) {
      console.error('Error creating event notifications:', error);
    }
  }

  private async getUsersForEventNotification(eventData: CreateRealtimeEvent): Promise<any[]> {
    // This would implement logic to determine which users should be notified
    // Based on their roles, preferences, and involvement in the entity
    // For now, return empty array - this would need to be implemented based on business rules
    return [];
  }

  private mapEventTypeToNotificationType(eventType: string): string {
    if (eventType.includes('order')) return 'order_update';
    if (eventType.includes('design')) return 'design_update';
    if (eventType.includes('manufacturing')) return 'manufacturing_update';
    if (eventType.includes('fulfillment')) return 'fulfillment_update';
    return 'info';
  }

  private mapEntityTypeToCategory(entityType: string): string {
    switch (entityType) {
      case 'order':
      case 'order_item':
        return 'order';
      case 'design_job':
        return 'design';
      case 'work_order':
        return 'manufacturing';
      case 'purchase_order':
      case 'fulfillment':
        return 'fulfillment';
      default:
        return 'general';
    }
  }

  private generateNotificationTitle(eventData: CreateRealtimeEvent): string {
    // Generate appropriate title based on event type and entity
    const entityType = eventData.entityType;
    const eventType = eventData.eventType;
    
    if (eventType.includes('created')) {
      return `New ${entityType.replace('_', ' ')} created`;
    }
    if (eventType.includes('updated')) {
      return `${entityType.replace('_', ' ')} updated`;
    }
    if (eventType.includes('assigned')) {
      return `${entityType.replace('_', ' ')} assigned`;
    }
    
    return `${entityType.replace('_', ' ')} notification`;
  }

  private generateNotificationMessage(eventData: CreateRealtimeEvent): string {
    // Generate appropriate message based on event data
    return `${eventData.eventType.replace('_', ' ')} for ${eventData.entityType} ${eventData.entityId}`;
  }

  private getEventPriority(eventData: CreateRealtimeEvent): string {
    // Determine priority based on event type
    if (eventData.eventType.includes('urgent') || eventData.eventType.includes('error')) {
      return 'urgent';
    }
    if (eventData.eventType.includes('warning') || eventData.eventType.includes('delay')) {
      return 'high';
    }
    return 'normal';
  }

  private generateActionUrl(eventData: CreateRealtimeEvent): string {
    // Generate appropriate action URL based on entity type
    switch (eventData.entityType) {
      case 'order':
        return `/orders/${eventData.entityId}`;
      case 'order_item':
        return eventData.eventData?.orderId ? `/orders/${eventData.eventData.orderId}` : '/orders';
      case 'design_job':
        return eventData.eventData?.orderId ? `/orders/${eventData.eventData.orderId}` : '/design-jobs';
      case 'work_order':
        return eventData.eventData?.orderId ? `/orders/${eventData.eventData.orderId}` : '/manufacturing';
      case 'purchase_order':
        return `/purchase-orders/${eventData.entityId}`;
      default:
        return '/dashboard';
    }
  }
}

// Global notification service instance
export const notificationService = new NotificationService();