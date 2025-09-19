/**
 * Work Order Service
 * Comprehensive business logic for manufacturing workflow management
 * Handles work order lifecycle, status transitions, manufacturer assignment, and milestone tracking
 */

import { 
  CreateWorkOrderType, 
  UpdateWorkOrderType, 
  WorkOrderType,
  WorkOrderWithDetailsType,
  BulkGenerateWorkOrdersType,
  CreateProductionEventType,
  ProductionEventType,
  CreateMilestoneType,
  UpdateMilestoneType,
  ProductionMilestoneType,
  ManufacturerCapacityType,
  UpdateWorkOrderStatusDTO,
  canTransition,
  calculateEstimatedCompletion,
  getDefaultMilestones,
} from '@shared/dtos';
import { db } from '../db';
import { 
  manufacturingWorkOrders, 
  orderItems, 
  manufacturers, 
  productionEvents,
  productionMilestones,
  orders,
  designJobs,
  fulfillmentEvents,
  fulfillmentMilestones
} from '@shared/schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';

export class WorkOrderService {
  
  /**
   * Create a new work order for an order item
   * Validates order item exists and creates associated milestones
   */
  static async createWorkOrder(
    workOrderData: CreateWorkOrderType,
    actorUserId?: string
  ): Promise<WorkOrderType> {
    // Use database transaction for atomicity across all operations
    return await db.transaction(async (tx) => {
      // Validate order item exists and get details
      const orderItem = await tx
        .select({
          id: orderItems.id,
          orgId: orderItems.orgId,
          quantity: orderItems.quantity,
          nameSnapshot: orderItems.nameSnapshot,
          statusCode: orderItems.statusCode
        })
        .from(orderItems)
        .where(eq(orderItems.id, workOrderData.orderItemId))
        .limit(1);

      if (!orderItem.length) {
        throw new Error('Order item not found');
      }

      const orderItemData = orderItem[0];

      // Validate organization access
      if (orderItemData.orgId !== workOrderData.orgId) {
        throw new Error('Order item does not belong to specified organization');
      }

      // Check if work order already exists for this order item with orgId filtering for security
      const existingWorkOrder = await tx
        .select({ id: manufacturingWorkOrders.id })
        .from(manufacturingWorkOrders)
        .where(and(
          eq(manufacturingWorkOrders.orderItemId, workOrderData.orderItemId),
          eq(manufacturingWorkOrders.orgId, workOrderData.orgId)
        ))
        .limit(1);

      if (existingWorkOrder.length > 0) {
        throw new Error('Work order already exists for this order item');
      }

      // If manufacturer is specified, validate they exist and are active
      if (workOrderData.manufacturerId) {
        const manufacturerData = await tx
          .select({
            id: manufacturers.id,
            isActive: manufacturers.isActive,
            name: manufacturers.name
          })
          .from(manufacturers)
          .where(eq(manufacturers.id, workOrderData.manufacturerId))
          .limit(1);

        if (!manufacturerData.length) {
          throw new Error('Manufacturer not found');
        }

        const manufacturer = manufacturerData[0];
        if (!manufacturer.isActive) {
          throw new Error(`Manufacturer "${manufacturer.name}" is not active`);
        }
      }

      // Create work order using Drizzle
      const createdWorkOrders = await tx
        .insert(manufacturingWorkOrders)
        .values({
          orgId: workOrderData.orgId,
          orderItemId: workOrderData.orderItemId,
          manufacturerId: workOrderData.manufacturerId || null,
          statusCode: workOrderData.statusCode || 'pending',
          priority: workOrderData.priority || 5,
          quantity: workOrderData.quantity,
          instructions: workOrderData.instructions || null,
          plannedStartDate: workOrderData.plannedStartDate || null,
          plannedDueDate: workOrderData.plannedDueDate || null,
        })
        .returning();

      if (!createdWorkOrders.length) {
        throw new Error('Failed to create work order');
      }

      const workOrder = createdWorkOrders[0];

      // Create production event within the same transaction
      await tx
        .insert(productionEvents)
        .values({
          orgId: workOrder.orgId, // CRITICAL: Add orgId for RLS and tenancy
          workOrderId: workOrder.id,
          eventCode: 'WORK_ORDER_CREATED',
          actorUserId: actorUserId || null,
          payload: {
            quantity: workOrderData.quantity,
            priority: workOrderData.priority,
            manufacturerId: workOrderData.manufacturerId,
          },
        });

      // Create default milestones within the same transaction
      const defaultMilestones = getDefaultMilestones();
      if (defaultMilestones.length > 0) {
        const milestoneData = defaultMilestones.map(milestone => ({
          orgId: workOrder.orgId, // CRITICAL: Add orgId for RLS and tenancy
          workOrderId: workOrder.id,
          milestoneCode: milestone.code,
          milestoneName: milestone.name,
          status: 'pending' as const,
        }));

        await tx.insert(productionMilestones).values(milestoneData);
      }

      return workOrder;
    });
  }

  /**
   * Update work order status with validation and event tracking
   */
  static async updateWorkOrderStatus(
    workOrderId: string,
    newStatusCode: string,
    orgId: string,
    actorUserId?: string,
    notes?: string,
    additionalData?: Pick<UpdateWorkOrderStatusDTO, 'delayReason' | 'qualityNotes' | 'actualDate'>
  ): Promise<WorkOrderType> {
    // Use database transaction for atomicity across all operations
    return await db.transaction(async (tx) => {
      // Get current work order
      const workOrderData = await tx
        .select()
        .from(manufacturingWorkOrders)
        .where(and(
          eq(manufacturingWorkOrders.id, workOrderId),
          eq(manufacturingWorkOrders.orgId, orgId)
        ))
        .limit(1);

      if (!workOrderData.length) {
        throw new Error('Work order not found');
      }

      const workOrder = workOrderData[0];
      const currentStatus = workOrder.statusCode;

      // Validate status transition
      if (!canTransition(currentStatus, newStatusCode)) {
        throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatusCode}'`);
      }

      // Prepare update data with proper typing
      const updateData: Partial<typeof manufacturingWorkOrders.$inferInsert> = {
        statusCode: newStatusCode,
      };

      // Set actual dates based on status
      const now = new Date().toISOString();
      if (newStatusCode === 'in_production' && !workOrder.actualStartDate) {
        updateData.actualStartDate = now;
      }
      if (newStatusCode === 'completed' && !workOrder.actualEndDate) {
        updateData.actualEndDate = now;
        updateData.actualCompletionDate = now.split('T')[0]; // Date only
      }

      // Add additional data with proper type safety
      if (additionalData?.delayReason && typeof additionalData.delayReason === 'string') {
        updateData.delayReason = additionalData.delayReason;
      }
      if (additionalData?.qualityNotes && typeof additionalData.qualityNotes === 'string') {
        updateData.qualityNotes = additionalData.qualityNotes;
      }

      // CRITICAL FIX: Update work order with BOTH workOrderId AND orgId in WHERE clause for security
      const updatedWorkOrders = await tx
        .update(manufacturingWorkOrders)
        .set(updateData)
        .where(and(
          eq(manufacturingWorkOrders.id, workOrderId),
          eq(manufacturingWorkOrders.orgId, orgId)
        ))
        .returning();

      if (!updatedWorkOrders.length) {
        throw new Error('Failed to update work order status');
      }

      const updatedWorkOrder = updatedWorkOrders[0];

      // Create production event within the same transaction
      await tx
        .insert(productionEvents)
        .values({
          orgId: orgId, // CRITICAL: Add orgId for RLS and tenancy
          workOrderId: workOrderId,
          eventCode: 'STATUS_UPDATED',
          actorUserId: actorUserId || null,
          payload: {
            from_status: currentStatus,
            to_status: newStatusCode,
            notes: notes || null,
            delayReason: additionalData?.delayReason || null,
            qualityNotes: additionalData?.qualityNotes || null,
            actualDate: additionalData?.actualDate || null,
          },
        });

      // Note: Additional operations like order item sync, material PO generation, and 
      // fulfillment integration will be handled outside the transaction to avoid 
      // complexity and potential deadlocks in this critical production fix.

      return updatedWorkOrder;
    });
  }

  /**
   * Assign work order to a manufacturer with capacity validation
   */
  static async assignManufacturer(
    workOrderId: string,
    manufacturerId: string,
    orgId: string,
    actorUserId?: string,
    options?: {
      skipCapacityCheck?: boolean;
      plannedStartDate?: string;
      plannedDueDate?: string;
      notes?: string;
    }
  ): Promise<WorkOrderType> {
    // Get work order with orgId filtering for security
    const workOrderData = await db
      .select()
      .from(manufacturingWorkOrders)
      .where(and(
        eq(manufacturingWorkOrders.id, workOrderId),
        eq(manufacturingWorkOrders.orgId, orgId)
      ))
      .limit(1);

    if (!workOrderData.length) {
      throw new Error('Work order not found');
    }

    const workOrder = workOrderData[0];

    // Validate manufacturer exists and is active
    const manufacturerData = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        isActive: manufacturers.isActive,
        leadTimeDays: manufacturers.leadTimeDays,
        minimumOrderQuantity: manufacturers.minimumOrderQuantity
      })
      .from(manufacturers)
      .where(eq(manufacturers.id, manufacturerId))
      .limit(1);

    if (!manufacturerData.length) {
      throw new Error('Manufacturer not found');
    }

    const manufacturer = manufacturerData[0];
    if (!manufacturer.isActive) {
      throw new Error(`Manufacturer "${manufacturer.name}" is not active`);
    }

    // Check minimum order quantity
    if (manufacturer.minimumOrderQuantity && workOrder.quantity < manufacturer.minimumOrderQuantity) {
      throw new Error(
        `Order quantity (${workOrder.quantity}) is below manufacturer minimum (${manufacturer.minimumOrderQuantity})`
      );
    }

    // Check capacity unless skipped
    if (!options?.skipCapacityCheck) {
      const capacity = await WorkOrderService.getManufacturerCapacity(manufacturerId);
      if (capacity.workloadScore > 90) { // Over 90% capacity
        throw new Error(`Manufacturer "${manufacturer.name}" is at capacity (${capacity.workloadScore}% loaded)`);
      }
    }

    // Calculate dates if not provided
    let plannedStartDate = options?.plannedStartDate;
    let plannedDueDate = options?.plannedDueDate;

    if (!plannedDueDate && manufacturer.leadTimeDays) {
      const startDate = plannedStartDate || new Date().toISOString().split('T')[0];
      plannedDueDate = calculateEstimatedCompletion(startDate, manufacturer.leadTimeDays);
    }

    // Update work order
    const updateData = {
      manufacturerId: manufacturerId,
      statusCode: workOrder.statusCode === 'pending' ? 'queued' : workOrder.statusCode,
      plannedStartDate: plannedStartDate || null,
      plannedDueDate: plannedDueDate || null,
      updatedAt: new Date().toISOString(),
    };

    const updatedWorkOrders = await db
      .update(manufacturingWorkOrders)
      .set(updateData)
      .where(and(
        eq(manufacturingWorkOrders.id, workOrderId),
        eq(manufacturingWorkOrders.orgId, orgId) // CRITICAL: Ensure orgId security
      ))
      .returning();

    if (!updatedWorkOrders.length) {
      throw new Error('Failed to assign manufacturer');
    }

    const updatedWorkOrder = updatedWorkOrders[0];

    // Create event
    await WorkOrderService.createProductionEvent({
      workOrderId,
      eventCode: 'ASSIGNED_TO_MANUFACTURER',
      actorUserId,
      payload: {
        manufacturer_id: manufacturerId,
        manufacturer_name: manufacturer.name,
        planned_start_date: plannedStartDate,
        planned_due_date: plannedDueDate,
        notes: options?.notes,
      },
    });

    return updatedWorkOrder;
  }

  /**
   * Bulk generate work orders from approved design jobs with transaction safety
   */
  static async bulkGenerateWorkOrders(
    designJobIds: string[],
    actorUserId?: string,
    options?: {
      manufacturerId?: string;
      priority?: number;
      plannedStartDate?: string;
      plannedDueDate?: string;
      instructions?: string;
    }
  ): Promise<WorkOrderType[]> {
    // Use database transaction for atomicity
    return await db.transaction(async (tx) => {
      // Get approved design jobs with order item details using Drizzle joins
      const designJobsData = await tx
        .select({
          id: designJobs.id,
          orgId: designJobs.orgId,
          orderItemId: designJobs.orderItemId,
          statusCode: designJobs.statusCode,
          orderItem: {
            id: orderItems.id,
            quantity: orderItems.quantity,
            nameSnapshot: orderItems.nameSnapshot,
            statusCode: orderItems.statusCode,
            orgId: orderItems.orgId
          }
        })
        .from(designJobs)
        .innerJoin(orderItems, eq(designJobs.orderItemId, orderItems.id))
        .where(and(
          sql`${designJobs.id} = ANY(${designJobIds})`,
          eq(designJobs.statusCode, 'approved')
        ));

      if (!designJobsData.length) {
        throw new Error('No approved design jobs found');
      }

      if (designJobsData.length !== designJobIds.length) {
        throw new Error('Some design jobs were not found or not approved');
      }

      // Verify all jobs belong to same organization (CRITICAL: Security check)
      const orgIds = [...new Set(designJobsData.map(job => job.orgId))];
      if (orgIds.length > 1) {
        throw new Error('All design jobs must belong to the same organization');
      }

      const orgId = orgIds[0];

      // Double-check orgId consistency with order items
      const orderItemOrgIds = [...new Set(designJobsData.map(job => job.orderItem.orgId))];
      if (orderItemOrgIds.length > 1 || orderItemOrgIds[0] !== orgId) {
        throw new Error('Organization mismatch between design jobs and order items');
      }

      // Check for existing work orders with orgId filtering
      const orderItemIds = designJobsData.map(job => job.orderItemId);
      const existingWorkOrders = await tx
        .select({
          orderItemId: manufacturingWorkOrders.orderItemId
        })
        .from(manufacturingWorkOrders)
        .where(and(
          sql`${manufacturingWorkOrders.orderItemId} = ANY(${orderItemIds})`,
          eq(manufacturingWorkOrders.orgId, orgId) // CRITICAL: Ensure orgId filtering
        ));

      if (existingWorkOrders.length > 0) {
        const existingItemIds = existingWorkOrders.map(wo => wo.orderItemId);
        throw new Error(`Work orders already exist for order items: ${existingItemIds.join(', ')}`);
      }

      // Validate manufacturer if specified
      if (options?.manufacturerId) {
        const manufacturerData = await tx
          .select({
            id: manufacturers.id,
            isActive: manufacturers.isActive,
            name: manufacturers.name
          })
          .from(manufacturers)
          .where(eq(manufacturers.id, options.manufacturerId))
          .limit(1);

        if (!manufacturerData.length) {
          throw new Error('Manufacturer not found');
        }

        if (!manufacturerData[0].isActive) {
          throw new Error(`Manufacturer "${manufacturerData[0].name}" is not active`);
        }
      }

      // Create work orders in bulk
      const workOrdersToCreate = designJobsData.map(job => ({
        orgId: orgId, // CRITICAL: Explicit orgId for every work order
        orderItemId: job.orderItemId,
        manufacturerId: options?.manufacturerId || null,
        statusCode: 'pending' as const,
        priority: options?.priority || 5,
        quantity: job.orderItem.quantity,
        instructions: options?.instructions || null,
        plannedStartDate: options?.plannedStartDate || null,
        plannedDueDate: options?.plannedDueDate || null,
      }));

      const createdWorkOrders = await tx
        .insert(manufacturingWorkOrders)
        .values(workOrdersToCreate)
        .returning();

      if (!createdWorkOrders.length) {
        throw new Error('Failed to create work orders');
      }

      // Create production events for all work orders in bulk
      const eventsToCreate = createdWorkOrders.map((workOrder, index) => ({
        orgId: orgId, // CRITICAL: Add orgId for RLS and tenancy
        workOrderId: workOrder.id,
        eventCode: 'WORK_ORDER_AUTO_GENERATED' as const,
        actorUserId: actorUserId || null,
        payload: {
          generated_from_design_job: designJobsData[index].id,
          quantity: designJobsData[index].orderItem.quantity,
          priority: options?.priority || 5,
        },
      }));

      await tx
        .insert(productionEvents)
        .values(eventsToCreate);

      // Create default milestones for each work order
      const defaultMilestones = getDefaultMilestones();
      if (defaultMilestones.length > 0) {
        const milestonesToCreate = createdWorkOrders.flatMap(workOrder =>
          defaultMilestones.map(milestone => ({
            orgId: orgId, // CRITICAL: Add orgId for RLS and tenancy
            workOrderId: workOrder.id,
            milestoneCode: milestone.code,
            milestoneName: milestone.name,
            status: 'pending' as const,
          }))
        );

        await tx
          .insert(productionMilestones)
          .values(milestonesToCreate);
      }

      return createdWorkOrders;
    });
  }

  /**
   * Get work order with all related details using Drizzle joins
   * CRITICAL: orgId is required to prevent cross-tenant data access
   */
  static async getWorkOrderWithDetails(
    workOrderId: string,
    orgId: string
  ): Promise<WorkOrderWithDetailsType | null> {
    // CRITICAL: Always filter by orgId for security - no optional behavior allowed
    const whereConditions = and(
      eq(manufacturingWorkOrders.id, workOrderId),
      eq(manufacturingWorkOrders.orgId, orgId)
    );

    // Get work order with related data using Drizzle joins
    const workOrderResults = await db
      .select({
        // Work order fields
        id: manufacturingWorkOrders.id,
        orgId: manufacturingWorkOrders.orgId,
        orderItemId: manufacturingWorkOrders.orderItemId,
        manufacturerId: manufacturingWorkOrders.manufacturerId,
        statusCode: manufacturingWorkOrders.statusCode,
        priority: manufacturingWorkOrders.priority,
        quantity: manufacturingWorkOrders.quantity,
        instructions: manufacturingWorkOrders.instructions,
        estimatedCompletionDate: manufacturingWorkOrders.estimatedCompletionDate,
        actualCompletionDate: manufacturingWorkOrders.actualCompletionDate,
        plannedStartDate: manufacturingWorkOrders.plannedStartDate,
        plannedDueDate: manufacturingWorkOrders.plannedDueDate,
        actualStartDate: manufacturingWorkOrders.actualStartDate,
        actualEndDate: manufacturingWorkOrders.actualEndDate,
        delayReason: manufacturingWorkOrders.delayReason,
        qualityNotes: manufacturingWorkOrders.qualityNotes,
        createdAt: manufacturingWorkOrders.createdAt,
        updatedAt: manufacturingWorkOrders.updatedAt,
        // Order item details
        orderItem: {
          id: orderItems.id,
          nameSnapshot: orderItems.nameSnapshot,
          quantity: orderItems.quantity,
          statusCode: orderItems.statusCode,
          pantoneJson: orderItems.pantoneJson,
          buildOverridesText: orderItems.buildOverridesText,
        },
        // Manufacturer details (optional)
        manufacturer: {
          id: manufacturers.id,
          name: manufacturers.name,
          contactEmail: manufacturers.contactEmail,
          contactPhone: manufacturers.contactPhone,
          specialties: manufacturers.specialties,
          leadTimeDays: manufacturers.leadTimeDays,
        },
        // Order details
        order: {
          id: orders.id,
          code: orders.code,
          customerContactName: orders.customerContactName,
          dueDate: orders.dueDate,
        }
      })
      .from(manufacturingWorkOrders)
      .innerJoin(orderItems, eq(manufacturingWorkOrders.orderItemId, orderItems.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(manufacturers, eq(manufacturingWorkOrders.manufacturerId, manufacturers.id))
      .where(whereConditions)
      .limit(1);

    if (!workOrderResults.length) {
      return null;
    }

    const workOrderData = workOrderResults[0];

    // Get production events with orgId filtering for security
    const events = await db
      .select()
      .from(productionEvents)
      .where(and(
        eq(productionEvents.workOrderId, workOrderId),
        orgId ? eq(productionEvents.orgId, orgId) : undefined
      ))
      .orderBy(desc(productionEvents.occurredAt))
      .limit(20);

    // Get milestones with orgId filtering for security  
    const milestones = await db
      .select()
      .from(productionMilestones)
      .where(and(
        eq(productionMilestones.workOrderId, workOrderId),
        orgId ? eq(productionMilestones.orgId, orgId) : undefined
      ))
      .orderBy(asc(productionMilestones.createdAt));

    // Build the detailed work order response
    return {
      id: workOrderData.id,
      orgId: workOrderData.orgId,
      orderItemId: workOrderData.orderItemId,
      manufacturerId: workOrderData.manufacturerId,
      statusCode: workOrderData.statusCode,
      priority: workOrderData.priority,
      quantity: workOrderData.quantity,
      instructions: workOrderData.instructions,
      estimatedCompletionDate: workOrderData.estimatedCompletionDate,
      actualCompletionDate: workOrderData.actualCompletionDate,
      plannedStartDate: workOrderData.plannedStartDate,
      plannedDueDate: workOrderData.plannedDueDate,
      actualStartDate: workOrderData.actualStartDate,
      actualEndDate: workOrderData.actualEndDate,
      delayReason: workOrderData.delayReason,
      qualityNotes: workOrderData.qualityNotes,
      createdAt: workOrderData.createdAt,
      updatedAt: workOrderData.updatedAt,
      orderItem: workOrderData.orderItem,
      manufacturer: workOrderData.manufacturer,
      order: workOrderData.order,
      productionEvents: events || [],
      milestones: milestones || [],
    };
  }

  /**
   * Create production event for audit trail
   */
  static async createProductionEvent(
    eventData: CreateProductionEventType
  ): Promise<ProductionEventType> {
    // CRITICAL: Get orgId from work order for RLS and tenancy
    const workOrderData = await db
      .select({ orgId: manufacturingWorkOrders.orgId })
      .from(manufacturingWorkOrders)
      .where(eq(manufacturingWorkOrders.id, eventData.workOrderId))
      .limit(1);

    if (!workOrderData.length) {
      throw new Error(`Work order not found: Invalid work order ID`);
    }

    const workOrder = workOrderData[0];

    // Create production event using Drizzle
    const createdEvents = await db
      .insert(productionEvents)
      .values({
        orgId: workOrder.orgId, // CRITICAL: Add orgId for RLS and tenancy
        workOrderId: eventData.workOrderId,
        eventCode: eventData.eventCode,
        actorUserId: eventData.actorUserId || null,
        payload: eventData.payload || null,
      })
      .returning();

    if (!createdEvents.length) {
      throw new Error('Failed to create production event');
    }

    return createdEvents[0];
  }

  /**
   * Update production milestone with proper orgId filtering and event creation
   */
  static async updateMilestone(
    milestoneId: string,
    updateData: UpdateMilestoneType,
    orgId: string,
    actorUserId?: string
  ): Promise<ProductionMilestoneType> {
    // Get current milestone to ensure it exists and belongs to the org
    const currentMilestone = await db
      .select()
      .from(productionMilestones)
      .where(and(
        eq(productionMilestones.id, milestoneId),
        eq(productionMilestones.orgId, orgId) // CRITICAL: Ensure orgId security
      ))
      .limit(1);

    if (!currentMilestone.length) {
      throw new Error('Milestone not found or access denied');
    }

    const milestone = currentMilestone[0];

    // Prepare update data with proper typing
    const updatePayload: Partial<typeof productionMilestones.$inferInsert> = {
      status: updateData.status,
      updatedAt: new Date().toISOString(),
    };

    if (updateData.actualDate) {
      updatePayload.actualDate = updateData.actualDate;
    }
    if (updateData.notes) {
      updatePayload.notes = updateData.notes;
    }
    if (updateData.completedBy) {
      updatePayload.completedBy = updateData.completedBy;
    }

    // Update milestone with transaction safety
    const updatedMilestones = await db
      .update(productionMilestones)
      .set(updatePayload)
      .where(and(
        eq(productionMilestones.id, milestoneId),
        eq(productionMilestones.orgId, orgId) // CRITICAL: Double-check orgId security
      ))
      .returning();

    if (!updatedMilestones.length) {
      throw new Error('Failed to update milestone');
    }

    const updatedMilestone = updatedMilestones[0];

    // Create event if milestone completed
    if (updateData.status === 'completed') {
      await WorkOrderService.createProductionEvent({
        workOrderId: updatedMilestone.workOrderId,
        eventCode: 'MILESTONE_REACHED',
        actorUserId,
        payload: {
          milestone_code: updatedMilestone.milestoneCode,
          milestone_name: updatedMilestone.milestoneName,
          actual_date: updateData.actualDate,
          notes: updateData.notes,
        },
      });
    }

    return updatedMilestone;
  }

  /**
   * Get manufacturer capacity and workload
   */
  static async getManufacturerCapacity(
    manufacturerId: string
  ): Promise<ManufacturerCapacityType> {
    // Get manufacturer details
    const manufacturerData = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        specialties: manufacturers.specialties,
        leadTimeDays: manufacturers.leadTimeDays,
        isActive: manufacturers.isActive
      })
      .from(manufacturers)
      .where(eq(manufacturers.id, manufacturerId))
      .limit(1);

    if (!manufacturerData.length) {
      throw new Error('Manufacturer not found');
    }

    const manufacturer = manufacturerData[0];

    // Get current active work orders using Drizzle aggregation
    const workOrderStats = await db
      .select({
        totalWorkOrders: count(),
        totalQuantity: sql<number>`sum(${manufacturingWorkOrders.quantity})::int`.mapWith(Number)
      })
      .from(manufacturingWorkOrders)
      .where(and(
        eq(manufacturingWorkOrders.manufacturerId, manufacturerId),
        sql`${manufacturingWorkOrders.statusCode} NOT IN ('completed', 'shipped', 'cancelled')`
      ));

    const stats = workOrderStats[0];
    const currentWorkOrders = stats?.totalWorkOrders || 0;
    const totalQuantity = stats?.totalQuantity || 0;

    // Simple capacity calculation (could be enhanced with real capacity data)
    const capacityLimit = 100; // Default capacity
    const workloadScore = Math.min((currentWorkOrders / capacityLimit) * 100, 100);

    return {
      manufacturerId: manufacturer.id,
      name: manufacturer.name,
      specialties: manufacturer.specialties || [],
      currentWorkOrders,
      capacityLimit,
      leadTimeDays: manufacturer.leadTimeDays,
      isAvailable: manufacturer.isActive && workloadScore < 90,
      workloadScore,
      nextAvailableDate: workloadScore > 90 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    };
  }

  /**
   * Sync order item status based on work order progress
   * CRITICAL: orgId is required for security to prevent cross-tenant operations
   */
  private static async syncOrderItemStatus(
    orderItemId: string,
    workOrderStatus: string,
    orgId: string
  ): Promise<void> {
    // Map work order status to order item status
    const statusMapping: Record<string, string> = {
      'pending': 'manufacturing',
      'queued': 'manufacturing',
      'in_production': 'manufacturing',
      'quality_check': 'manufacturing',
      'rework': 'manufacturing',
      'packaging': 'manufacturing',
      'completed': 'shipped', // Could be 'ready_to_ship' if that status exists
      'shipped': 'shipped',
      'cancelled': 'cancelled',
      'on_hold': 'manufacturing',
    };

    const orderItemStatus = statusMapping[workOrderStatus];
    if (!orderItemStatus) return;

    // CRITICAL SECURITY FIX: Update with BOTH orderItemId AND orgId in WHERE clause
    await db
      .update(orderItems)
      .set({ 
        statusCode: orderItemStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(orderItems.id, orderItemId),
        eq(orderItems.orgId, orgId)
      ));
  }

  /**
   * Handle production delays with proper orgId security
   */
  static async reportDelay(
    workOrderId: string,
    delayReason: string,
    estimatedDelayDays: number,
    orgId: string,
    actorUserId?: string
  ): Promise<WorkOrderType> {
    // Get work order with proper orgId filtering for security
    const workOrderData = await db
      .select()
      .from(manufacturingWorkOrders)
      .where(and(
        eq(manufacturingWorkOrders.id, workOrderId),
        eq(manufacturingWorkOrders.orgId, orgId)
      ))
      .limit(1);

    if (!workOrderData.length) {
      throw new Error('Work order not found');
    }

    const workOrder = workOrderData[0];

    // Calculate new due date
    let newDueDate: string | null = null;
    if (workOrder.plannedDueDate) {
      const currentDue = new Date(workOrder.plannedDueDate);
      currentDue.setDate(currentDue.getDate() + estimatedDelayDays);
      newDueDate = currentDue.toISOString().split('T')[0];
    }

    // Update work order with proper orgId security
    const updatedWorkOrders = await db
      .update(manufacturingWorkOrders)
      .set({
        delayReason: delayReason,
        plannedDueDate: newDueDate,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(manufacturingWorkOrders.id, workOrderId),
        eq(manufacturingWorkOrders.orgId, orgId) // CRITICAL: Ensure orgId security
      ))
      .returning();

    if (!updatedWorkOrders.length) {
      throw new Error('Failed to report delay');
    }

    const updatedWorkOrder = updatedWorkOrders[0];

    // Create delay event
    await WorkOrderService.createProductionEvent({
      workOrderId,
      eventCode: 'PRODUCTION_DELAYED',
      actorUserId,
      payload: {
        delay_reason: delayReason,
        estimated_delay_days: estimatedDelayDays,
        old_due_date: workOrder.plannedDueDate,
        new_due_date: newDueDate,
      },
    });

    return updatedWorkOrder;
  }

  /**
   * Check material requirements for work order and auto-generate POs if configured
   */
  static async checkMaterialRequirementsAndGeneratePOs(
    workOrderId: string,
    orgId: string,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Import PurchaseOrderService to avoid circular dependency
      const { PurchaseOrderService } = await import('./purchaseOrderService');

      // Check if there are pending material requirements with proper orgId filtering
      const pendingRequirements = await db
        .select({
          id: sql<string>`id`,
          status: sql<string>`status`
        })
        .from(sql`material_requirements`)
        .where(and(
          sql`work_order_id = ${workOrderId}`,
          sql`org_id = ${orgId}`,
          sql`status = 'pending'`
        ));

      if (!pendingRequirements.length) {
        return; // No pending requirements, nothing to do
      }

      // Check organization settings for auto PO generation (if implemented)
      // For now, we'll auto-generate POs for small quantities and flag larger ones
      
      try {
        const purchaseOrders = await PurchaseOrderService.bulkGeneratePurchaseOrders(
          {
            workOrderIds: [workOrderId],
            groupBySupplierId: true,
            priority: 3,
            notes: `Auto-generated from work order ${workOrderId} materials requirements`,
          },
          orgId,
          actorUserId
        );

        if (purchaseOrders.length > 0) {
          // Create production event for PO generation
          await WorkOrderService.createProductionEvent({
            workOrderId,
            eventCode: 'POS_AUTO_GENERATED',
            actorUserId,
            payload: {
              purchase_orders_created: purchaseOrders.length,
              po_numbers: purchaseOrders.map(po => po.poNumber),
              auto_generated: true,
            },
          });

          console.log(`Auto-generated ${purchaseOrders.length} purchase orders for work order ${workOrderId}`);
        }

      } catch (poError) {
        console.error(`Failed to auto-generate POs for work order ${workOrderId}:`, poError);
        
        // Create event for failed PO generation
        await WorkOrderService.createProductionEvent(sb, {
          workOrderId,
          eventCode: 'PO_GENERATION_FAILED',
          actorUserId,
          payload: {
            error_message: poError instanceof Error ? poError.message : 'Unknown error',
            pending_requirements: pendingRequirements.length,
          },
        });
      }

    } catch (error) {
      console.error(`Error checking material requirements for work order ${workOrderId}:`, error);
    }
  }

  /**
   * Trigger fulfillment integration when manufacturing milestones are reached
   * This bridges the manufacturing and fulfillment workflows
   */
  static async triggerFulfillmentIntegration(
    sb: SupabaseClient,
    workOrder: any,
    fromStatus: string,
    toStatus: string,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Import fulfillment service dynamically to avoid circular dependencies
      const { fulfillmentService } = await import('./fulfillmentService');

      // Get order information for fulfillment integration
      const { data: orderItem } = await sb
        .from('order_items')
        .select('order_id, org_id')
        .eq('id', workOrder.order_item_id)
        .single();

      if (!orderItem) {
        console.warn(`Order item not found for work order ${workOrder.id}`);
        return;
      }

      const orderId = orderItem.order_id;
      const orgId = orderItem.org_id;

      // Trigger different fulfillment actions based on manufacturing status changes
      switch (toStatus) {
        case 'completed':
          // Manufacturing completed - check if ready for fulfillment
          await this.handleManufacturingCompletion(
            sb, 
            fulfillmentService, 
            orderId, 
            orgId, 
            workOrder, 
            actorUserId
          );
          break;

        case 'quality_approved':
          // Quality approved - update quality milestone
          await this.handleQualityApproval(
            sb, 
            fulfillmentService, 
            orderId, 
            orgId, 
            workOrder, 
            actorUserId
          );
          break;

        case 'shipped':
          // Item shipped from manufacturer - update shipping milestone
          await this.handleManufacturerShipment(
            sb, 
            fulfillmentService, 
            orderId, 
            orgId, 
            workOrder, 
            actorUserId
          );
          break;

        case 'delayed':
        case 'on_hold':
          // Manufacturing issues - create fulfillment blocker
          await this.handleManufacturingDelay(
            sb, 
            fulfillmentService, 
            orderId, 
            orgId, 
            workOrder, 
            fromStatus, 
            toStatus, 
            actorUserId
          );
          break;
      }
    } catch (error) {
      console.error('Error in fulfillment integration:', error);
      // Don't throw - this shouldn't block the manufacturing workflow
    }
  }

  /**
   * Handle manufacturing completion and check for fulfillment readiness
   */
  private static async handleManufacturingCompletion(
    fulfillmentService: any,
    orderId: string,
    orgId: string,
    workOrder: WorkOrderType,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Check if fulfillment has been started for this order with proper orgId filtering
      const existingMilestones = await db
        .select({ id: fulfillmentMilestones.id })
        .from(fulfillmentMilestones)
        .where(and(
          eq(fulfillmentMilestones.orderId, orderId),
          eq(fulfillmentMilestones.orgId, orgId)
        ))
        .limit(1);

      // If no fulfillment started yet, start it now
      if (!existingMilestones.length) {
        await fulfillmentService.startFulfillment(
          orderId, 
          orgId, 
          actorUserId, 
          {
            notes: `Fulfillment auto-started after manufacturing completion for work order ${workOrder.id}`,
            priority: workOrder.priority || 5
          }
        );
      }

      // Update manufacturing completed milestone
      const milestoneResult = await fulfillmentService.updateMilestone(
        orderId, 
        orgId, 
        'MANUFACTURING_COMPLETED', 
        {
          status: 'completed',
          completedBy: actorUserId,
          notes: `Manufacturing completed for work order ${workOrder.id}`
        }
      );

      // Check if all manufacturing is complete to trigger next phase
      await this.checkAndTriggerFulfillmentReadiness(fulfillmentService, orderId, orgId);

    } catch (error) {
      console.error('Error handling manufacturing completion:', error);
    }
  }

  /**
   * Handle quality approval from manufacturing
   */
  private static async handleQualityApproval(
    sb: SupabaseClient,
    fulfillmentService: any,
    orderId: string,
    orgId: string,
    workOrder: any,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Create quality check record for fulfillment tracking
      await fulfillmentService.createQualityCheck({
        orgId,
        orderId,
        workOrderId: workOrder.id,
        checkType: 'post_manufacturing',
        checkedBy: actorUserId || 'system',
        overallResult: 'pass',
        qualityScore: 5.0,
        notes: `Quality approved for work order ${workOrder.id}`,
        checkResults: {
          manufacturingQuality: 'pass',
          workOrderId: workOrder.id
        }
      });

      // Update quality milestone
      await fulfillmentService.updateMilestone(
        orderId, 
        orgId, 
        'QUALITY_CHECK_PASSED', 
        {
          status: 'completed',
          completedBy: actorUserId,
          notes: `Quality check passed for work order ${workOrder.id}`
        }
      );

    } catch (error) {
      console.error('Error handling quality approval:', error);
    }
  }

  /**
   * Handle shipment from manufacturer to fulfillment center
   */
  private static async handleManufacturerShipment(
    sb: SupabaseClient,
    fulfillmentService: any,
    orderId: string,
    orgId: string,
    workOrder: any,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Create fulfillment event for manufacturer shipment
      const { error } = await sb
        .from('fulfillment_events')
        .insert({
          org_id: orgId,
          order_id: orderId,
          work_order_id: workOrder.id,
          event_code: 'RECEIVED_FROM_MANUFACTURER',
          event_type: 'status_change',
          status_after: 'ready_to_ship',
          actor_user_id: actorUserId,
          notes: `Items received from manufacturer for work order ${workOrder.id}`,
          metadata: {
            workOrderId: workOrder.id,
            manufacturerId: workOrder.manufacturer_id,
            quantity: workOrder.quantity
          }
        });

      // Update ready to ship milestone
      await fulfillmentService.updateMilestone(
        orderId, 
        orgId, 
        'READY_TO_SHIP', 
        {
          status: 'completed',
          completedBy: actorUserId,
          notes: `Items ready to ship after receiving from manufacturer (work order ${workOrder.id})`
        }
      );

    } catch (error) {
      console.error('Error handling manufacturer shipment:', error);
    }
  }

  /**
   * Handle manufacturing delays that affect fulfillment
   */
  private static async handleManufacturingDelay(
    sb: SupabaseClient,
    fulfillmentService: any,
    orderId: string,
    orgId: string,
    workOrder: any,
    fromStatus: string,
    toStatus: string,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Create fulfillment event for delay
      const { error } = await sb
        .from('fulfillment_events')
        .insert({
          org_id: orgId,
          order_id: orderId,
          work_order_id: workOrder.id,
          event_code: 'MANUFACTURING_DELAYED',
          event_type: 'status_change',
          status_before: fromStatus,
          status_after: toStatus,
          actor_user_id: actorUserId,
          notes: `Manufacturing delayed for work order ${workOrder.id}: ${toStatus}`,
          metadata: {
            workOrderId: workOrder.id,
            delayReason: workOrder.delay_reason,
            fromStatus,
            toStatus
          }
        });

      // Update milestones to blocked if not already completed
      const milestonesToBlock = ['MANUFACTURING_COMPLETED', 'QUALITY_CHECK_PASSED', 'READY_TO_SHIP'];
      
      for (const milestoneCode of milestonesToBlock) {
        await fulfillmentService.updateMilestone(
          orderId, 
          orgId, 
          milestoneCode, 
          {
            status: 'blocked',
            blockedReason: `Manufacturing ${toStatus}: ${workOrder.delay_reason || 'No specific reason provided'}`,
            notes: `Blocked due to manufacturing delay in work order ${workOrder.id}`
          }
        );
      }

    } catch (error) {
      console.error('Error handling manufacturing delay:', error);
    }
  }

  /**
   * Check if all manufacturing is complete and trigger fulfillment readiness
   */
  private static async checkAndTriggerFulfillmentReadiness(
    fulfillmentService: any,
    orderId: string,
    orgId: string
  ): Promise<void> {
    try {
      // Check if all work orders for this order are complete
      const orderItemsData = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(and(
          eq(orderItems.orderId, orderId),
          eq(orderItems.orgId, orgId)
        ));

      if (!orderItemsData.length) return;

      const workOrdersData = await db
        .select({ statusCode: manufacturingWorkOrders.statusCode })
        .from(manufacturingWorkOrders)
        .where(and(
          sql`${manufacturingWorkOrders.orderItemId} = ANY(${orderItemsData.map(item => item.id)})`,
          eq(manufacturingWorkOrders.orgId, orgId) // CRITICAL: Ensure orgId filtering
        ));

      const allCompleted = workOrdersData.every(wo => 
        ['completed', 'shipped', 'quality_approved'].includes(wo.statusCode)
      );

      if (allCompleted) {
        // All manufacturing complete - trigger fulfillment preparation
        await db
          .insert(fulfillmentEvents)
          .values({
            orgId: orgId,
            orderId: orderId,
            eventCode: 'READY_FOR_PACKAGING',
            eventType: 'milestone',
            statusAfter: 'packaging',
            notes: 'All manufacturing completed - ready for packaging and shipment',
            metadata: {
              allItemsComplete: true,
              workOrdersCount: workOrdersData.length
            }
          });

        // Auto-update to packaging milestone
        await fulfillmentService.updateMilestone(
          orderId, 
          orgId, 
          'READY_TO_SHIP', 
          {
            status: 'in_progress',
            notes: 'All manufacturing completed - beginning packaging process'
          }
        );
      }
    } catch (error) {
      console.error('Error checking fulfillment readiness:', error);
    }
  }

  /**
   * Create material requirements for a work order based on catalog item specifications
   */
  static async createMaterialRequirementsForWorkOrder(
    sb: SupabaseClient,
    workOrderId: string,
    orgId: string,
    catalogItemId?: string,
    customRequirements?: Array<{
      materialId: string;
      quantityNeeded: number;
      neededByDate?: string;
    }>,
    actorUserId?: string
  ): Promise<void> {
    try {
      const { PurchaseOrderService } = await import('./purchaseOrderService');

      let requirements: Array<{
        materialId: string;
        quantityNeeded: number;
        neededByDate?: string;
      }> = [];

      // If custom requirements provided, use them
      if (customRequirements && customRequirements.length > 0) {
        requirements = customRequirements;
      } 
      // Otherwise, try to derive from catalog item if provided
      else if (catalogItemId) {
        // Get catalog item build requirements (if implemented in the future)
        const { data: catalogItem } = await sb
          .from('catalog_items')
          .select('build_instructions, embellishments_json')
          .eq('id', catalogItemId)
          .single();

        // This would need to be expanded based on how material requirements 
        // are specified in catalog items - placeholder for future implementation
        if (catalogItem?.build_instructions) {
          console.log('Material requirements derivation from catalog items not yet implemented');
          return;
        }
      }

      if (requirements.length === 0) {
        return; // No requirements to create
      }

      // Get work order details for date calculations
      const { data: workOrder } = await sb
        .from('manufacturing_work_orders')
        .select('planned_start_date, planned_due_date')
        .eq('id', workOrderId)
        .single();

      // Calculate needed by date (buffer before planned start date)
      const neededByDate = workOrder?.planned_start_date 
        ? new Date(new Date(workOrder.planned_start_date).getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        : undefined;

      // Create material requirements
      const materialRequirements = requirements.map(req => ({
        orgId,
        materialId: req.materialId,
        quantityNeeded: req.quantityNeeded,
        neededByDate: req.neededByDate || neededByDate,
        status: 'pending' as const,
        notes: `Required for work order ${workOrderId}`,
      }));

      await PurchaseOrderService.createMaterialRequirements(
        sb,
        workOrderId,
        orgId,
        materialRequirements,
        actorUserId
      );

      // Create production event
      await WorkOrderService.createProductionEvent(sb, {
        workOrderId,
        eventCode: 'MATERIAL_REQUIREMENTS_CREATED',
        actorUserId,
        payload: {
          requirements_count: requirements.length,
          catalog_item_id: catalogItemId,
          needed_by_date: neededByDate,
        },
      });

      console.log(`Created ${requirements.length} material requirements for work order ${workOrderId}`);

    } catch (error) {
      console.error(`Error creating material requirements for work order ${workOrderId}:`, error);
      throw error;
    }
  }
}