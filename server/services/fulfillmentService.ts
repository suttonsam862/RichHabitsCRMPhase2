import { supabaseAdmin } from '../lib/supabase';
import {
  FulfillmentEventType,
  CreateFulfillmentEventType,
  ShippingInfoType,
  CreateShippingInfoType,
  UpdateShippingInfoType,
  QualityCheckType,
  CreateQualityCheckType,
  UpdateQualityCheckType,
  CompletionRecordType,
  CreateCompletionRecordType,
  FulfillmentMilestoneType,
  CreateFulfillmentMilestoneType,
  FulfillmentStatusType,
  FulfillmentDashboardType,
  FULFILLMENT_EVENT_CODES,
  FULFILLMENT_MILESTONE_CODES,
  FULFILLMENT_STATUS_CODES,
  canTransitionFulfillmentStatus,
  getDefaultFulfillmentMilestones
} from '@shared/dtos/FulfillmentDTO';
import {
  serializeFulfillmentEvent,
  deserializeFulfillmentEvent,
  serializeShippingInfo,
  deserializeShippingInfo,
  serializeShippingInfoUpdate,
  serializeQualityCheck,
  deserializeQualityCheck,
  serializeCompletionRecord,
  deserializeCompletionRecord,
  serializeFulfillmentMilestone,
  deserializeFulfillmentMilestone,
  serializeShipment,
  deserializeShipment,
  serializeShipmentItem,
  deserializeShipmentItem,
  generateShipmentNumber,
  ShipmentType,
  CreateShipmentType,
  ShipmentItemType,
  CreateShipmentItemType
} from './fulfillmentTransformers';

/**
 * Comprehensive Fulfillment Service
 * Handles end-to-end order fulfillment workflow including:
 * - Milestone tracking and status transitions
 * - Shipping management and tracking
 * - Quality control processes
 * - Order completion and closure
 * - Integration with manufacturing and billing systems
 */
export class FulfillmentService {

  /**
   * Initialize fulfillment process for an order
   * Creates default milestones and triggers the first fulfillment event
   */
  async startFulfillment(orderId: string, orgId: string, actorUserId?: string, options?: {
    notes?: string;
    priority?: number;
    plannedShipDate?: string;
    specialInstructions?: string;
  }): Promise<{ success: boolean; fulfillmentStatus: FulfillmentStatusType; error?: string }> {
    try {
      // Check if fulfillment already started
      const existingMilestones = await this.getFulfillmentMilestones(orderId, orgId);
      if (existingMilestones.length > 0) {
        return { success: false, error: 'Fulfillment already started for this order', fulfillmentStatus: {} as FulfillmentStatusType };
      }

      // Verify order exists and get current status
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, status_code, org_id')
        .eq('id', orderId)
        .eq('org_id', orgId)
        .single();

      if (orderError || !order) {
        return { success: false, error: 'Order not found', fulfillmentStatus: {} as FulfillmentStatusType };
      }

      // Create default fulfillment milestones
      const defaultMilestones = getDefaultFulfillmentMilestones();
      const milestonesToCreate = defaultMilestones.map(milestone => ({
        org_id: orgId,
        order_id: orderId,
        milestone_code: milestone.code,
        milestone_name: milestone.name,
        milestone_type: milestone.type,
        status: milestone.code === FULFILLMENT_MILESTONE_CODES.ORDER_CONFIRMED ? 'completed' : 'pending',
        planned_date: options?.plannedShipDate ? new Date(options.plannedShipDate).toISOString().split('T')[0] : null,
        completed_at: milestone.code === FULFILLMENT_MILESTONE_CODES.ORDER_CONFIRMED ? new Date().toISOString() : null,
        completed_by: milestone.code === FULFILLMENT_MILESTONE_CODES.ORDER_CONFIRMED ? actorUserId : null,
        notes: milestone.code === FULFILLMENT_MILESTONE_CODES.ORDER_CONFIRMED ? options?.notes : null
      }));

      // Insert milestones
      const { error: milestonesError } = await supabaseAdmin
        .from('fulfillment_milestones')
        .insert(milestonesToCreate);

      if (milestonesError) {
        throw milestonesError;
      }

      // Create fulfillment started event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.FULFILLMENT_STARTED,
        eventType: 'status_change',
        statusAfter: FULFILLMENT_STATUS_CODES.PREPARATION,
        actorUserId,
        notes: options?.notes,
        metadata: {
          priority: options?.priority || 5,
          plannedShipDate: options?.plannedShipDate,
          specialInstructions: options?.specialInstructions
        }
      });

      // Get the updated fulfillment status
      const fulfillmentStatus = await this.getFulfillmentStatus(orderId, orgId);

      return { success: true, fulfillmentStatus };
    } catch (error) {
      console.error('Error starting fulfillment:', error);
      return { success: false, error: 'Failed to start fulfillment process', fulfillmentStatus: {} as FulfillmentStatusType };
    }
  }

  /**
   * Update fulfillment milestone status
   */
  async updateMilestone(orderId: string, orgId: string, milestoneCode: string, updates: {
    status?: string;
    completedBy?: string;
    notes?: string;
    blockedReason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = updates.completedBy;
        updateData.status = 'completed';
      } else if (updates.status === 'blocked') {
        updateData.status = 'blocked';
        updateData.blocked_reason = updates.blockedReason;
      } else if (updates.status) {
        updateData.status = updates.status;
      }

      if (updates.notes) {
        updateData.notes = updates.notes;
      }

      const { error } = await supabaseAdmin
        .from('fulfillment_milestones')
        .update(updateData)
        .eq('order_id', orderId)
        .eq('org_id', orgId)
        .eq('milestone_code', milestoneCode);

      if (error) {
        throw error;
      }

      // Create milestone event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.MILESTONE_UPDATED,
        eventType: 'milestone',
        actorUserId: updates.completedBy,
        notes: updates.notes,
        metadata: {
          milestoneCode,
          newStatus: updates.status,
          blockedReason: updates.blockedReason
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating milestone:', error);
      return { success: false, error: 'Failed to update milestone' };
    }
  }

  /**
   * Create shipping information and mark order as shipped
   */
  async shipOrder(orderId: string, orgId: string, shippingData: CreateShippingInfoType, actorUserId?: string): Promise<{ success: boolean; shippingInfo?: ShippingInfoType; error?: string }> {
    try {
      // Properly serialize DTO to DB format
      const serializedData = serializeShippingInfo({
        ...shippingData,
        orgId,
        orderId,
        statusCode: 'shipped',
        lastStatusUpdate: new Date().toISOString()
      });

      // Insert shipping information
      const { data: shippingInfo, error: shippingError } = await supabaseAdmin
        .from('shipping_info')
        .insert(serializedData)
        .select()
        .single();

      if (shippingError) {
        throw shippingError;
      }

      // Update shipped milestone
      await this.updateMilestone(orderId, orgId, FULFILLMENT_MILESTONE_CODES.SHIPPED, {
        status: 'completed',
        completedBy: actorUserId,
        notes: `Shipped via ${shippingData.carrier}${shippingData.trackingNumber ? ` - Tracking: ${shippingData.trackingNumber}` : ''}`
      });

      // Create shipped event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.SHIPPED,
        eventType: 'status_change',
        statusAfter: FULFILLMENT_STATUS_CODES.SHIPPED,
        actorUserId,
        notes: `Order shipped via ${shippingData.carrier}`,
        metadata: {
          carrier: shippingData.carrier,
          trackingNumber: shippingData.trackingNumber,
          estimatedDeliveryDate: shippingData.estimatedDeliveryDate
        }
      });

      // Update order status to shipped if all items are ready
      await this.checkAndUpdateOrderStatus(orderId, orgId);

      // Return properly deserialized DTO
      return { success: true, shippingInfo: deserializeShippingInfo(shippingInfo) };
    } catch (error) {
      console.error('Error shipping order:', error);
      return { success: false, error: 'Failed to ship order' };
    }
  }

  /**
   * Mark order as delivered
   */
  async markDelivered(orderId: string, orgId: string, deliveryData: {
    deliveryDate: string;
    deliveryMethod?: string;
    recipientName?: string;
    deliveryNotes?: string;
    photoUrl?: string;
  }, actorUserId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Properly serialize update data
      const updateData = serializeShippingInfoUpdate({
        actualDeliveryDate: deliveryData.deliveryDate,
        statusCode: 'delivered',
        lastStatusUpdate: new Date().toISOString(),
        notes: deliveryData.deliveryNotes
      });

      // Update shipping info with delivery details
      const { error: shippingError } = await supabaseAdmin
        .from('shipping_info')
        .update(updateData)
        .eq('order_id', orderId)
        .eq('org_id', orgId);

      if (shippingError) {
        throw shippingError;
      }

      // Update delivered milestone
      await this.updateMilestone(orderId, orgId, FULFILLMENT_MILESTONE_CODES.DELIVERED, {
        status: 'completed',
        completedBy: actorUserId,
        notes: `Delivered to ${deliveryData.recipientName || 'customer'}`
      });

      // Create delivered event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.DELIVERED,
        eventType: 'status_change',
        statusAfter: FULFILLMENT_STATUS_CODES.DELIVERED,
        actorUserId,
        notes: 'Order delivered successfully',
        metadata: {
          deliveryDate: deliveryData.deliveryDate,
          deliveryMethod: deliveryData.deliveryMethod,
          recipientName: deliveryData.recipientName,
          photoUrl: deliveryData.photoUrl
        }
      });

      // Check if order should auto-complete
      await this.checkForAutoCompletion(orderId, orgId);

      return { success: true };
    } catch (error) {
      console.error('Error marking as delivered:', error);
      return { success: false, error: 'Failed to mark as delivered' };
    }
  }

  /**
   * Complete an order with final verification and billing integration
   */
  async completeOrder(orderId: string, orgId: string, completionData: {
    completionType?: string;
    verificationMethod?: string;
    customerSatisfactionScore?: number;
    customerFeedback?: string;
    qualityScore?: number;
    defectsReported?: number;
    generateInvoice?: boolean;
    capturePayment?: boolean;
    notes?: string;
  }, actorUserId?: string): Promise<{ success: boolean; completionRecord?: CompletionRecordType; error?: string }> {
    try {
      // Verify all critical milestones are completed
      const milestones = await this.getFulfillmentMilestones(orderId, orgId);
      const criticalMilestones = [
        FULFILLMENT_MILESTONE_CODES.MANUFACTURING_COMPLETED,
        FULFILLMENT_MILESTONE_CODES.QUALITY_CHECK_PASSED,
        FULFILLMENT_MILESTONE_CODES.SHIPPED,
        FULFILLMENT_MILESTONE_CODES.DELIVERED
      ];

      const incompleteMilestones = milestones.filter(m =>
        criticalMilestones.includes(m.milestoneCode as any) && m.status !== 'completed'
      );

      if (incompleteMilestones.length > 0) {
        return {
          success: false,
          error: `Cannot complete order: pending milestones - ${incompleteMilestones.map(m => m.milestoneName).join(', ')}`
        };
      }

      // Create completion record with proper serialization
      const serializedCompletionData = serializeCompletionRecord({
        orgId,
        orderId,
        completionType: completionData.completionType || 'manual',
        completedBy: actorUserId,
        completedAt: new Date().toISOString(),
        verificationMethod: completionData.verificationMethod,
        deliveryConfirmed: true,
        customerSatisfactionScore: completionData.customerSatisfactionScore,
        customerFeedback: completionData.customerFeedback,
        qualityScore: completionData.qualityScore,
        defectsReported: completionData.defectsReported || 0,
        invoiceGenerated: completionData.generateInvoice || false,
        finalPaymentCaptured: completionData.capturePayment || false,
        notes: completionData.notes
      });

      const { data: completionRecord, error: completionError } = await supabaseAdmin
        .from('completion_records')
        .insert(serializedCompletionData)
        .select()
        .single();

      if (completionError) {
        throw completionError;
      }

      // Update completed milestone
      await this.updateMilestone(orderId, orgId, FULFILLMENT_MILESTONE_CODES.COMPLETED, {
        status: 'completed',
        completedBy: actorUserId,
        notes: 'Order completed successfully'
      });

      // Update order status to completed
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update({
          status_code: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('org_id', orgId);

      if (orderError) {
        throw orderError;
      }

      // Create completion event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.COMPLETED,
        eventType: 'status_change',
        statusAfter: FULFILLMENT_STATUS_CODES.COMPLETED,
        actorUserId,
        notes: 'Order completed successfully',
        metadata: {
          completionType: completionData.completionType,
          customerSatisfactionScore: completionData.customerSatisfactionScore,
          qualityScore: completionData.qualityScore,
          invoiceGenerated: completionData.generateInvoice,
          paymentCaptured: completionData.capturePayment
        }
      });

      // TODO: Trigger invoice generation if requested
      if (completionData.generateInvoice) {
        // Integration point for billing system
      }

      // TODO: Trigger payment capture if requested
      if (completionData.capturePayment) {
        // Integration point for payment system
      }

      return { success: true, completionRecord: deserializeCompletionRecord(completionRecord) };
    } catch (error) {
      console.error('Error completing order:', error);
      return { success: false, error: 'Failed to complete order' };
    }
  }

  /**
   * Create a quality check record
   */
  async createQualityCheck(qualityCheckData: CreateQualityCheckType): Promise<{ success: boolean; qualityCheck?: QualityCheckType; error?: string }> {
    try {
      // Properly serialize quality check data
      const serializedData = serializeQualityCheck({
        ...qualityCheckData,
        checkedAt: new Date().toISOString()
      });

      const { data: qualityCheck, error } = await supabaseAdmin
        .from('quality_checks')
        .insert(serializedData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create quality check event
      await this.createFulfillmentEvent({
        orgId: qualityCheckData.orgId,
        orderId: qualityCheckData.orderId,
        orderItemId: qualityCheckData.orderItemId,
        workOrderId: qualityCheckData.workOrderId,
        eventCode: qualityCheckData.overallResult === 'pass' ? FULFILLMENT_EVENT_CODES.QUALITY_CHECK_PASSED : FULFILLMENT_EVENT_CODES.QUALITY_CHECK_FAILED,
        eventType: 'quality_check',
        actorUserId: qualityCheckData.checkedBy,
        notes: qualityCheckData.notes,
        metadata: {
          checkType: qualityCheckData.checkType,
          overallResult: qualityCheckData.overallResult,
          qualityScore: qualityCheckData.qualityScore,
          defectsFound: qualityCheckData.defectsFound
        }
      });

      return { success: true, qualityCheck: deserializeQualityCheck(qualityCheck) };
    } catch (error) {
      console.error('Error creating quality check:', error);
      return { success: false, error: 'Failed to create quality check' };
    }
  }

  /**
   * Get comprehensive fulfillment status for an order
   */
  async getFulfillmentStatus(orderId: string, orgId: string): Promise<FulfillmentStatusType> {
    try {
      const [milestones, events, shippingInfo, qualityChecks, completionRecord] = await Promise.all([
        this.getFulfillmentMilestones(orderId, orgId),
        this.getFulfillmentEvents(orderId, orgId),
        this.getShippingInfo(orderId, orgId),
        this.getQualityChecks(orderId, orgId),
        this.getCompletionRecord(orderId, orgId)
      ]);

      // Calculate overall status and progress
      const completedMilestones = milestones.filter(m => m.status === 'completed').length;
      const totalMilestones = milestones.length;
      const fulfillmentProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      // Determine current and next milestone
      const currentMilestone = milestones.find(m => m.status === 'in_progress')?.milestoneName ||
                              milestones.filter(m => m.status === 'completed').slice(-1)[0]?.milestoneName;
      const nextMilestone = milestones.find(m => m.status === 'pending')?.milestoneName;

      // Determine overall status
      let overallStatus = FULFILLMENT_STATUS_CODES.NOT_STARTED;
      if (completionRecord) {
        overallStatus = FULFILLMENT_STATUS_CODES.COMPLETED;
      } else if (shippingInfo?.statusCode === 'delivered') {
        overallStatus = FULFILLMENT_STATUS_CODES.DELIVERED;
      } else if (shippingInfo?.statusCode === 'shipped') {
        overallStatus = FULFILLMENT_STATUS_CODES.SHIPPED;
      } else if (milestones.some(m => m.milestoneCode === FULFILLMENT_MILESTONE_CODES.READY_TO_SHIP && m.status === 'completed')) {
        overallStatus = FULFILLMENT_STATUS_CODES.READY_TO_SHIP;
      } else if (milestones.some(m => m.status === 'completed')) {
        overallStatus = FULFILLMENT_STATUS_CODES.PREPARATION;
      }

      // Check for blockers
      const blockers = milestones
        .filter(m => m.status === 'blocked')
        .map(m => ({
          type: 'milestone_blocked',
          description: `${m.milestoneName}: ${m.blockedReason || 'No reason provided'}`,
          severity: 'high'
        }));

      return {
        orderId,
        overallStatus,
        fulfillmentProgress,
        currentMilestone,
        nextMilestone,
        milestones,
        events,
        shippingInfo,
        qualityChecks,
        completionRecord,
        blockers
      };
    } catch (error) {
      console.error('Error getting fulfillment status:', error);
      return {
        orderId,
        overallStatus: FULFILLMENT_STATUS_CODES.EXCEPTION,
        fulfillmentProgress: 0,
        milestones: [],
        events: [],
        blockers: [{
          type: 'system_error',
          description: 'Failed to load fulfillment status',
          severity: 'critical'
        }]
      };
    }
  }

  /**
   * Get fulfillment dashboard with summary and orders
   */
  async getFulfillmentDashboard(orgId: string, filters?: {
    statusCode?: string;
    isOverdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<FulfillmentDashboardType> {
    try {
      // Get orders with fulfillment information
      let query = supabaseAdmin
        .from('orders')
        .select(`
          id,
          code,
          customer_contact_name,
          total_amount,
          status_code,
          due_date,
          created_at,
          customers:customer_id(name)
        `)
        .eq('org_id', orgId)
        .in('status_code', ['confirmed', 'processing', 'shipped', 'delivered']);

      if (filters?.statusCode) {
        query = query.eq('status_code', filters.statusCode);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw error;
      }

      // Process orders and calculate metrics
      const processedOrders: any[] = [];
      let totalOrders = 0;
      let inFulfillment = 0;
      let readyToShip = 0;
      let shipped = 0;
      let completed = 0;
      let overdue = 0;

      for (const order of orders || []) {
        totalOrders++;

        // Get fulfillment status for each order
        const fulfillmentStatus = await this.getFulfillmentStatus(order.id, orgId);

        const daysInFulfillment = Math.floor(
          (new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const isOrderOverdue = order.due_date && new Date(order.due_date) < new Date();

        if (isOrderOverdue) overdue++;

        // Count by status
        switch (fulfillmentStatus.overallStatus) {
          case FULFILLMENT_STATUS_CODES.PREPARATION:
          case FULFILLMENT_STATUS_CODES.PACKAGING:
            inFulfillment++;
            break;
          case FULFILLMENT_STATUS_CODES.READY_TO_SHIP:
            readyToShip++;
            break;
          case FULFILLMENT_STATUS_CODES.SHIPPED:
          case FULFILLMENT_STATUS_CODES.IN_TRANSIT:
            shipped++;
            break;
          case FULFILLMENT_STATUS_CODES.COMPLETED:
            completed++;
            break;
        }

        if (!filters?.isOverdue || isOrderOverdue) {
          processedOrders.push({
            orderId: order.id,
            orderCode: order.code,
            customerName: order.customers?.name || order.customer_contact_name || 'Unknown',
            totalAmount: order.total_amount ? parseFloat(order.total_amount) : undefined,
            statusCode: order.status_code,
            fulfillmentStatus: fulfillmentStatus.overallStatus,
            currentMilestone: fulfillmentStatus.currentMilestone,
            daysInFulfillment,
            estimatedCompletion: order.due_date,
            isOverdue: isOrderOverdue,
            priority: 5, // Default priority
            blockers: fulfillmentStatus.blockers?.length || 0,
            lastActivity: fulfillmentStatus.events?.[0]?.createdAt
          });
        }
      }

      return {
        summary: {
          totalOrders,
          inFulfillment,
          readyToShip,
          shipped,
          completed,
          overdue
        },
        orders: processedOrders
      };
    } catch (error) {
      console.error('Error getting fulfillment dashboard:', error);
      return {
        summary: {
          totalOrders: 0,
          inFulfillment: 0,
          readyToShip: 0,
          shipped: 0,
          completed: 0,
          overdue: 0
        },
        orders: []
      };
    }
  }

  // Helper methods for data retrieval

  private async getFulfillmentMilestones(orderId: string, orgId: string): Promise<FulfillmentMilestoneType[]> {
    const { data, error } = await supabaseAdmin
      .from('fulfillment_milestones')
      .select('*')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .order('created_at');

    if (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }

    return (data || []).map(this.mapMilestoneFromDb);
  }

  private async getFulfillmentEvents(orderId: string, orgId: string, limit = 50): Promise<FulfillmentEventType[]> {
    const { data, error } = await supabaseAdmin
      .from('fulfillment_events')
      .select('*')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map(this.mapEventFromDb);
  }

  private async getShippingInfo(orderId: string, orgId: string): Promise<ShippingInfoType | undefined> {
    const { data, error } = await supabaseAdmin
      .from('shipping_info')
      .select('*')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .single();

    if (error) {
      return undefined;
    }

    return this.mapShippingInfoFromDb(data);
  }

  private async getQualityChecks(orderId: string, orgId: string): Promise<QualityCheckType[]> {
    const { data, error } = await supabaseAdmin
      .from('quality_checks')
      .select('*')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .order('checked_at', { ascending: false });

    if (error) {
      console.error('Error fetching quality checks:', error);
      return [];
    }

    return (data || []).map(this.mapQualityCheckFromDb);
  }

  private async getCompletionRecord(orderId: string, orgId: string): Promise<CompletionRecordType | undefined> {
    const { data, error } = await supabaseAdmin
      .from('completion_records')
      .select('*')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .single();

    if (error) {
      return undefined;
    }

    return this.mapCompletionRecordFromDb(data);
  }

  private async createFulfillmentEvent(eventData: CreateFulfillmentEventType): Promise<void> {
    // Use proper serialization for DB insert
    const serializedEventData = serializeFulfillmentEvent(eventData);

    const { error } = await supabaseAdmin
      .from('fulfillment_events')
      .insert(serializedEventData);

    if (error) {
      console.error('Error creating fulfillment event:', error);
      throw error;
    }
  }

  /**
   * Check and update order status based on fulfillment progress
   * Integrates with existing order and manufacturing systems
   */
  private async checkAndUpdateOrderStatus(orderId: string, orgId: string): Promise<void> {
    try {
      // Get all order items and their statuses
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('id, status_code, manufacturer_id')
        .eq('order_id', orderId)
        .eq('org_id', orgId);

      if (itemsError || !orderItems) {
        console.error('Error fetching order items:', itemsError);
        return;
      }

      // Get manufacturing work orders for these items
      const { data: workOrders, error: workOrdersError } = await supabaseAdmin
        .from('manufacturing_work_orders')
        .select('id, order_item_id, status_code')
        .in('order_item_id', orderItems.map(item => item.id));

      if (workOrdersError) {
        console.error('Error fetching work orders:', workOrdersError);
      }

      // Check if all manufacturing is complete
      const allManufacturingComplete = workOrders?.every(wo =>
        ['completed', 'shipped'].includes(wo.status_code)
      ) || false;

      // Check if shipping info exists
      const { data: shippingInfo } = await supabaseAdmin
        .from('shipping_info')
        .select('status_code')
        .eq('order_id', orderId)
        .eq('org_id', orgId)
        .single();

      // Update order status based on fulfillment progress
      let newOrderStatus = null;

      if (shippingInfo?.status_code === 'delivered') {
        newOrderStatus = 'delivered';
      } else if (shippingInfo?.status_code === 'shipped') {
        newOrderStatus = 'shipped';
      } else if (allManufacturingComplete) {
        newOrderStatus = 'processing'; // Ready for fulfillment
      }

      if (newOrderStatus) {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            status_code: newOrderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .eq('org_id', orgId);

        if (updateError) {
          console.error('Error updating order status:', updateError);
        }
      }
    } catch (error) {
      console.error('Error in checkAndUpdateOrderStatus:', error);
    }
  }

  /**
   * Advanced auto-completion logic with business rules and integrations
   */
  private async checkForAutoCompletion(orderId: string, orgId: string): Promise<void> {
    try {
      // Get organization settings for auto-completion rules
      const autoCompletionRules = await this.getAutoCompletionRules(orgId);

      // Check all completion criteria
      const completionChecks = await Promise.all([
        this.checkAllItemsDelivered(orderId, orgId),
        this.checkPaymentStatus(orderId, orgId, autoCompletionRules),
        this.checkQualityRequirements(orderId, orgId, autoCompletionRules),
        this.checkCustomerNotifications(orderId, orgId, autoCompletionRules),
        this.checkManufacturingCompletion(orderId, orgId)
      ]);

      const [
        allItemsDelivered,
        paymentComplete,
        qualityPassed,
        notificationsSent,
        manufacturingComplete
      ] = completionChecks;

      // Apply business rules for auto-completion
      const shouldAutoComplete =
        allItemsDelivered &&
        (autoCompletionRules.requirePayment ? paymentComplete : true) &&
        (autoCompletionRules.requireQualityCheck ? qualityPassed : true) &&
        (autoCompletionRules.requireNotifications ? notificationsSent : true) &&
        manufacturingComplete;

      if (shouldAutoComplete) {
        console.log(`Auto-completing order ${orderId} based on business rules`);

        // Auto-complete the order
        const result = await this.completeOrder(orderId, orgId, {
          completionType: 'automatic',
          verificationMethod: 'auto_completion_rules',
          notes: 'Order auto-completed based on fulfillment rules',
          generateInvoice: autoCompletionRules.autoGenerateInvoice,
          capturePayment: autoCompletionRules.autoCapturePayment
        }, 'system');

        if (result.success) {
          // Trigger post-completion integrations
          await this.triggerPostCompletionIntegrations(orderId, orgId, autoCompletionRules);
        }
      }
    } catch (error) {
      console.error('Error in checkForAutoCompletion:', error);
    }
  }

  /**
   * Get auto-completion rules for an organization
   */
  private async getAutoCompletionRules(orgId: string): Promise<{
    requirePayment: boolean;
    requireQualityCheck: boolean;
    requireNotifications: boolean;
    autoGenerateInvoice: boolean;
    autoCapturePayment: boolean;
    autoUpdateInventory: boolean;
    enableCustomerNotifications: boolean;
  }> {
    // Default rules - in a real system, these would be stored in organization settings
    return {
      requirePayment: false, // Most orders don't require upfront payment
      requireQualityCheck: true,
      requireNotifications: false,
      autoGenerateInvoice: true,
      autoCapturePayment: false,
      autoUpdateInventory: true,
      enableCustomerNotifications: true
    };
  }

  /**
   * Check if all items in the order have been delivered
   */
  private async checkAllItemsDelivered(orderId: string, orgId: string): Promise<boolean> {
    const { data: shippingInfo } = await supabaseAdmin
      .from('shipping_info')
      .select('status_code')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .single();

    return shippingInfo?.status_code === 'delivered';
  }

  /**
   * Check payment status for the order
   */
  private async checkPaymentStatus(orderId: string, orgId: string, rules: any): Promise<boolean> {
    if (!rules.requirePayment) return true;

    // Check accounting_payments table for payment records
    const { data: payments } = await supabaseAdmin
      .from('accounting_payments')
      .select('amount, status')
      .eq('order_id', orderId)
      .eq('org_id', orgId);

    // Sum paid amounts and check against order total
    const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('id', orderId)
      .single();

    const orderTotal = order?.total_amount || 0;
    return totalPaid >= orderTotal;
  }

  /**
   * Check quality requirements for the order
   */
  private async checkQualityRequirements(orderId: string, orgId: string, rules: any): Promise<boolean> {
    if (!rules.requireQualityCheck) return true;

    const { data: qualityChecks } = await supabaseAdmin
      .from('quality_checks')
      .select('overall_result, check_type')
      .eq('order_id', orderId)
      .eq('org_id', orgId);

    // Ensure all critical quality checks have passed
    const criticalChecks = qualityChecks?.filter(qc =>
      ['final_inspection', 'pre_shipment'].includes(qc.check_type)
    ) || [];

    return criticalChecks.length > 0 && criticalChecks.every(qc => qc.overall_result === 'pass');
  }

  /**
   * Check if customer notifications have been sent
   */
  private async checkCustomerNotifications(orderId: string, orgId: string, rules: any): Promise<boolean> {
    if (!rules.requireNotifications) return true;

    // Check fulfillment events for notification events
    const { data: notificationEvents } = await supabaseAdmin
      .from('fulfillment_events')
      .select('event_code')
      .eq('order_id', orderId)
      .eq('org_id', orgId)
      .eq('event_type', 'notification');

    // Check for required notification events
    const requiredNotifications = ['SHIPPED', 'DELIVERED'];
    return requiredNotifications.every(notification =>
      notificationEvents?.some(event => event.event_code === notification)
    );
  }

  /**
   * Check manufacturing completion status
   */
  private async checkManufacturingCompletion(orderId: string, orgId: string): Promise<boolean> {
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .eq('org_id', orgId);

    if (!orderItems?.length) return false;

    const { data: workOrders } = await supabaseAdmin
      .from('manufacturing_work_orders')
      .select('status_code')
      .in('order_item_id', orderItems.map(item => item.id));

    return workOrders?.every(wo => ['completed', 'shipped'].includes(wo.status_code)) || false;
  }

  /**
   * Trigger post-completion integrations
   */
  private async triggerPostCompletionIntegrations(orderId: string, orgId: string, rules: any): Promise<void> {
    try {
      const integrations = [];

      // Inventory management integration
      if (rules.autoUpdateInventory) {
        integrations.push(this.updateInventoryLevels(orderId, orgId));
      }

      // Customer notification integration
      if (rules.enableCustomerNotifications) {
        integrations.push(this.sendCustomerCompletionNotification(orderId, orgId));
      }

      // Invoice generation integration
      if (rules.autoGenerateInvoice) {
        integrations.push(this.generateCompletionInvoice(orderId, orgId));
      }

      // Analytics and reporting integration
      integrations.push(this.updateCompletionAnalytics(orderId, orgId));

      await Promise.all(integrations);
    } catch (error) {
      console.error('Error in post-completion integrations:', error);
    }
  }

  /**
   * Update inventory levels after order completion
   */
  private async updateInventoryLevels(orderId: string, orgId: string): Promise<void> {
    try {
      // Get order items to update inventory
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', orderId)
        .eq('org_id', orgId);

      // Update inventory levels (placeholder - would integrate with inventory system)
      for (const item of orderItems || []) {
        console.log(`Updating inventory for product ${item.product_id}, quantity: ${item.quantity}`);
        // TODO: Integrate with inventory management system
      }

      // Log inventory update event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.INVENTORY_UPDATED,
        eventType: 'notification',
        notes: 'Inventory levels updated after order completion',
        metadata: { orderItems: orderItems?.length || 0 }
      });
    } catch (error) {
      console.error('Error updating inventory levels:', error);
    }
  }

  /**
   * Send customer completion notification
   */
  private async sendCustomerCompletionNotification(orderId: string, orgId: string): Promise<void> {
    try {
      // Get order and customer information
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          code,
          customer_contact_name,
          customer_contact_email,
          customers:customer_id(name, email)
        `)
        .eq('id', orderId)
        .single();

      if (order?.customer_contact_email) {
        // TODO: Integrate with email service (SendGrid, etc.)
        console.log(`Sending completion notification to ${order.customer_contact_email} for order ${order.code}`);

        // Log notification event
        await this.createFulfillmentEvent({
          orgId,
          orderId,
          eventCode: 'CUSTOMER_NOTIFICATION_SENT',
          eventType: 'notification',
          notes: `Completion notification sent to ${order.customer_contact_email}`,
          metadata: {
            recipient: order.customer_contact_email,
            orderCode: order.code
          }
        });
      }
    } catch (error) {
      console.error('Error sending customer notification:', error);
    }
  }

  /**
   * Generate completion invoice
   */
  private async generateCompletionInvoice(orderId: string, orgId: string): Promise<void> {
    try {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from('accounting_invoices')
        .select('id')
        .eq('order_id', orderId)
        .eq('org_id', orgId)
        .single();

      if (!existingInvoice) {
        // Get order details for invoice generation
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('total_amount, customer_contact_name')
          .eq('id', orderId)
          .single();

        if (order) {
          // TODO: Integrate with accounting/billing system
          console.log(`Generating invoice for order ${orderId}, amount: ${order.total_amount}`);

          // Log invoice generation event
          await this.createFulfillmentEvent({
            orgId,
            orderId,
            eventCode: 'INVOICE_GENERATED',
            eventType: 'notification',
            notes: 'Completion invoice generated automatically',
            metadata: {
              amount: order.total_amount,
              customer: order.customer_contact_name
            }
          });
        }
      }
    } catch (error) {
      console.error('Error generating completion invoice:', error);
    }
  }

  /**
   * Update completion analytics and metrics
   */
  private async updateCompletionAnalytics(orderId: string, orgId: string): Promise<void> {
    try {
      // Calculate completion metrics
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('created_at, total_amount')
        .eq('id', orderId)
        .single();

      if (order) {
        const completionTime = new Date().getTime() - new Date(order.created_at).getTime();
        const completionDays = Math.floor(completionTime / (1000 * 60 * 60 * 24));

        // TODO: Update organization metrics tables
        console.log(`Order ${orderId} completed in ${completionDays} days, value: ${order.total_amount}`);

        // Log analytics event
        await this.createFulfillmentEvent({
          orgId,
          orderId,
          eventCode: FULFILLMENT_EVENT_CODES.ANALYTICS_UPDATED,
          eventType: 'notification',
          notes: 'Completion analytics updated',
          metadata: {
            completionDays,
            orderValue: order.total_amount
          }
        });
      }
    } catch (error) {
      console.error('Error updating completion analytics:', error);
    }
  }

  // Database mapping helpers - use transformers instead of manual mapping
  private mapMilestoneFromDb(dbRecord: any): FulfillmentMilestoneType {
    return deserializeFulfillmentMilestone(dbRecord);
  }

  private mapEventFromDb(dbRecord: any): FulfillmentEventType {
    return deserializeFulfillmentEvent(dbRecord);
  }

  private mapShippingInfoFromDb(dbRecord: any): ShippingInfoType {
    return deserializeShippingInfo(dbRecord);
  }

  private mapQualityCheckFromDb(dbRecord: any): QualityCheckType {
    return deserializeQualityCheck(dbRecord);
  }

  private mapCompletionRecordFromDb(dbRecord: any): CompletionRecordType {
    return deserializeCompletionRecord(dbRecord);
  }

  // ===== PARTIAL FULFILLMENT SUPPORT =====

  /**
   * Create a partial shipment with specific items and quantities
   */
  async createPartialShipment(orderId: string, orgId: string, shipmentData: {
    items: Array<{ orderItemId: string; quantity: number; notes?: string }>;
    carrier: string;
    service?: string;
    trackingNumber?: string;
    shippingAddress: any;
    estimatedDeliveryDate?: string;
    notes?: string;
  }, actorUserId?: string): Promise<{ success: boolean; shipment?: ShipmentType; error?: string }> {
    try {
      // Validate order items and quantities
      const itemValidation = await this.validateShipmentItems(orderId, orgId, shipmentData.items);
      if (!itemValidation.valid) {
        return { success: false, error: itemValidation.error };
      }

      // Generate shipment number
      const shipmentNumber = generateShipmentNumber(orgId);

      // Create shipment record
      const shipmentCreateData: CreateShipmentType = {
        orgId,
        orderId,
        shipmentNumber,
        carrier: shipmentData.carrier,
        service: shipmentData.service,
        trackingNumber: shipmentData.trackingNumber,
        shippingAddress: shipmentData.shippingAddress,
        estimatedDeliveryDate: shipmentData.estimatedDeliveryDate,
        statusCode: 'preparing',
        notes: shipmentData.notes
      };

      const serializedShipmentData = serializeShipment(shipmentCreateData);

      const { data: shipment, error: shipmentError } = await supabaseAdmin
        .from('shipments')
        .insert(serializedShipmentData)
        .select()
        .single();

      if (shipmentError) {
        throw shipmentError;
      }

      // Create shipment items
      const shipmentItemPromises = shipmentData.items.map(item => {
        const itemData: CreateShipmentItemType = {
          orgId,
          shipmentId: shipment.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          notes: item.notes
        };

        const serializedItemData = serializeShipmentItem(itemData);

        return supabaseAdmin
          .from('shipment_items')
          .insert(serializedItemData);
      });

      const shipmentItemResults = await Promise.all(shipmentItemPromises);
      const failedItems = shipmentItemResults.filter(result => result.error);

      if (failedItems.length > 0) {
        // Rollback shipment if items failed
        await supabaseAdmin.from('shipments').delete().eq('id', shipment.id);
        throw new Error(`Failed to create shipment items: ${failedItems.map(f => f.error?.message).join(', ')}`);
      }

      // Create shipment event
      await this.createFulfillmentEvent({
        orgId,
        orderId,
        eventCode: FULFILLMENT_EVENT_CODES.READY_FOR_PACKAGING,
        eventType: 'status_change',
        statusAfter: FULFILLMENT_STATUS_CODES.PACKAGING,
        actorUserId,
        notes: `Partial shipment created: ${shipmentNumber}`,
        metadata: {
          shipmentId: shipment.id,
          shipmentNumber,
          itemCount: shipmentData.items.length,
          carrier: shipmentData.carrier
        }
      });

      return { success: true, shipment: deserializeShipment(shipment) };
    } catch (error) {
      console.error('Error creating partial shipment:', error);
      return { success: false, error: 'Failed to create partial shipment' };
    }
  }

  /**
   * Ship a specific shipment (partial or full)
   */
  async shipShipment(shipmentId: string, orgId: string, shippingData: {
    trackingNumber?: string;
    trackingUrl?: string;
    labelUrl?: string;
    shippingCost?: number;
    weight?: number;
    actualShipDate?: string;
  }, actorUserId?: string): Promise<{ success: boolean; shipment?: ShipmentType; error?: string }> {
    try {
      // Get shipment and validate
      const { data: shipment, error: shipmentError } = await supabaseAdmin
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .eq('org_id', orgId)
        .single();

      if (shipmentError || !shipment) {
        return { success: false, error: 'Shipment not found' };
      }

      // Update shipment with shipping details
      const updateData = {
        tracking_number: shippingData.trackingNumber,
        tracking_url: shippingData.trackingUrl,
        label_url: shippingData.labelUrl,
        shipping_cost: shippingData.shippingCost,
        weight: shippingData.weight,
        status_code: 'shipped',
        shipped_at: shippingData.actualShipDate || new Date().toISOString(),
        last_status_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: updatedShipment, error: updateError } = await supabaseAdmin
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Create shipped event
      await this.createFulfillmentEvent({
        orgId,
        orderId: shipment.order_id,
        eventCode: FULFILLMENT_EVENT_CODES.SHIPPED,
        eventType: 'status_change',
        statusAfter: FULFILLMENT_STATUS_CODES.SHIPPED,
        actorUserId,
        notes: `Shipment shipped: ${shipment.shipment_number}`,
        metadata: {
          shipmentId,
          trackingNumber: shippingData.trackingNumber,
          carrier: shipment.carrier
        }
      });

      // Check if order should be marked as shipped (all items shipped)
      await this.checkOrderShippingStatus(shipment.order_id, orgId);

      return { success: true, shipment: deserializeShipment(updatedShipment) };
    } catch (error) {
      console.error('Error shipping shipment:', error);
      return { success: false, error: 'Failed to ship shipment' };
    }
  }

  /**
   * Get shipping status for an order with partial fulfillment support
   */
  async getOrderShippingStatus(orderId: string, orgId: string): Promise<{
    totalItems: number;
    shippedItems: number;
    deliveredItems: number;
    remainingItems: number;
    shipments: ShipmentType[];
    isFullyShipped: boolean;
    isFullyDelivered: boolean;
  }> {
    try {
      // Get all order items
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('id, quantity')
        .eq('order_id', orderId)
        .eq('org_id', orgId);

      const totalItems = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get all shipments for this order
      const { data: shipments } = await supabaseAdmin
        .from('shipments')
        .select(`
          *,
          shipment_items!inner(order_item_id, quantity)
        `)
        .eq('order_id', orderId)
        .eq('org_id', orgId);

      let shippedItems = 0;
      let deliveredItems = 0;

      // Calculate shipped and delivered quantities
      for (const shipment of shipments || []) {
        const shipmentQuantity = shipment.shipment_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

        if (shipment.status_code === 'shipped' || shipment.status_code === 'delivered') {
          shippedItems += shipmentQuantity;
        }

        if (shipment.status_code === 'delivered') {
          deliveredItems += shipmentQuantity;
        }
      }

      const remainingItems = totalItems - shippedItems;
      const isFullyShipped = remainingItems <= 0;
      const isFullyDelivered = deliveredItems >= totalItems;

      return {
        totalItems,
        shippedItems,
        deliveredItems,
        remainingItems,
        shipments: shipments?.map(deserializeShipment) || [],
        isFullyShipped,
        isFullyDelivered
      };
    } catch (error) {
      console.error('Error getting order shipping status:', error);
      return {
        totalItems: 0,
        shippedItems: 0,
        deliveredItems: 0,
        remainingItems: 0,
        shipments: [],
        isFullyShipped: false,
        isFullyDelivered: false
      };
    }
  }

  /**
   * Validate shipment items against available quantities
   */
  private async validateShipmentItems(orderId: string, orgId: string, items: Array<{ orderItemId: string; quantity: number }>): Promise<{ valid: boolean; error?: string }> {
    try {
      // Get order items with their quantities
      const orderItemIds = items.map(item => item.orderItemId);
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('id, quantity')
        .eq('order_id', orderId)
        .eq('org_id', orgId)
        .in('id', orderItemIds);

      // Get already shipped quantities
      const { data: shippedItems } = await supabaseAdmin
        .from('shipment_items')
        .select('order_item_id, quantity')
        .in('order_item_id', orderItemIds);

      // Calculate remaining quantities for each item
      for (const item of items) {
        const orderItem = orderItems?.find(oi => oi.id === item.orderItemId);
        if (!orderItem) {
          return { valid: false, error: `Order item ${item.orderItemId} not found` };
        }

        const alreadyShipped = shippedItems?.filter(si => si.order_item_id === item.orderItemId)
          .reduce((sum, si) => sum + si.quantity, 0) || 0;

        const remainingQuantity = orderItem.quantity - alreadyShipped;

        if (item.quantity > remainingQuantity) {
          return { valid: false, error: `Cannot ship ${item.quantity} of item ${item.orderItemId}. Only ${remainingQuantity} remaining.` };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Failed to validate shipment items' };
    }
  }

  /**
   * Check and update order shipping status based on all shipments
   */
  private async checkOrderShippingStatus(orderId: string, orgId: string): Promise<void> {
    try {
      const shippingStatus = await this.getOrderShippingStatus(orderId, orgId);

      // Update SHIPPED milestone only when all items are shipped
      if (shippingStatus.isFullyShipped) {
        await this.updateMilestone(orderId, orgId, FULFILLMENT_MILESTONE_CODES.SHIPPED, {
          status: 'completed',
          notes: `All items shipped across ${shippingStatus.shipments.length} shipment(s)`
        });
      }

      // Update DELIVERED milestone only when all items are delivered
      if (shippingStatus.isFullyDelivered) {
        await this.updateMilestone(orderId, orgId, FULFILLMENT_MILESTONE_CODES.DELIVERED, {
          status: 'completed',
          notes: `All items delivered across ${shippingStatus.shipments.filter(s => s.statusCode === 'delivered').length} shipment(s)`
        });
      }
    } catch (error) {
      console.error('Error checking order shipping status:', error);
    }
  }
}

// Export singleton instance
export const fulfillmentService = new FulfillmentService();