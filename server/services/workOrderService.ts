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
  canTransition,
  calculateEstimatedCompletion,
  getDefaultMilestones,
} from '@shared/dtos';

interface SupabaseClient {
  from: (table: string) => any;
  rpc: (fn: string, params?: any) => any;
}

export class WorkOrderService {
  
  /**
   * Create a new work order for an order item
   * Validates order item exists and creates associated milestones
   */
  static async createWorkOrder(
    sb: SupabaseClient,
    workOrderData: CreateWorkOrderType,
    actorUserId?: string
  ): Promise<WorkOrderType> {
    // Validate order item exists and get details
    const { data: orderItem, error: orderItemError } = await sb
      .from('order_items')
      .select('id, org_id, quantity, name_snapshot, status_code')
      .eq('id', workOrderData.orderItemId)
      .single();

    if (orderItemError || !orderItem) {
      throw new Error('Order item not found');
    }

    // Validate organization access
    if (orderItem.org_id !== workOrderData.orgId) {
      throw new Error('Order item does not belong to specified organization');
    }

    // Check if work order already exists for this order item
    const { data: existingWorkOrder } = await sb
      .from('manufacturing_work_orders')
      .select('id')
      .eq('order_item_id', workOrderData.orderItemId)
      .single();

    if (existingWorkOrder) {
      throw new Error('Work order already exists for this order item');
    }

    // If manufacturer is specified, validate they exist and are active
    if (workOrderData.manufacturerId) {
      const { data: manufacturer, error: mfgError } = await sb
        .from('manufacturers')
        .select('id, is_active, name')
        .eq('id', workOrderData.manufacturerId)
        .single();

      if (mfgError || !manufacturer) {
        throw new Error('Manufacturer not found');
      }

      if (!manufacturer.is_active) {
        throw new Error(`Manufacturer "${manufacturer.name}" is not active`);
      }
    }

    // Prepare work order data with defaults
    const workOrderPayload = {
      org_id: workOrderData.orgId,
      order_item_id: workOrderData.orderItemId,
      manufacturer_id: workOrderData.manufacturerId || null,
      status_code: workOrderData.statusCode || 'pending',
      priority: workOrderData.priority || 5,
      quantity: workOrderData.quantity,
      instructions: workOrderData.instructions || null,
      planned_start_date: workOrderData.plannedStartDate || null,
      planned_due_date: workOrderData.plannedDueDate || null,
    };

    // Create work order
    const { data: workOrder, error: workOrderError } = await sb
      .from('manufacturing_work_orders')
      .insert(workOrderPayload)
      .select()
      .single();

    if (workOrderError) {
      throw new Error(`Failed to create work order: ${workOrderError.message}`);
    }

    // Create production event
    await WorkOrderService.createProductionEvent(sb, {
      workOrderId: workOrder.id,
      eventCode: 'WORK_ORDER_CREATED',
      actorUserId,
      payload: {
        quantity: workOrderData.quantity,
        priority: workOrderData.priority,
        manufacturerId: workOrderData.manufacturerId,
      },
    });

    // Create default milestones
    const defaultMilestones = getDefaultMilestones();
    if (defaultMilestones.length > 0) {
      const milestoneData = defaultMilestones.map(milestone => ({
        org_id: workOrder.org_id, // CRITICAL: Add org_id for RLS and tenancy
        work_order_id: workOrder.id,
        milestone_code: milestone.code,
        milestone_name: milestone.name,
        status: 'pending',
      }));

      await sb.from('production_milestones').insert(milestoneData);
    }

    return workOrder;
  }

  /**
   * Update work order status with validation and event tracking
   */
  static async updateWorkOrderStatus(
    sb: SupabaseClient,
    workOrderId: string,
    newStatusCode: string,
    orgId: string,
    actorUserId?: string,
    notes?: string,
    additionalData?: any
  ): Promise<WorkOrderType> {
    // Get current work order
    const { data: workOrder, error: workOrderError } = await sb
      .from('manufacturing_work_orders')
      .select('*')
      .eq('id', workOrderId)
      .eq('org_id', orgId)
      .single();

    if (workOrderError || !workOrder) {
      throw new Error('Work order not found');
    }

    const currentStatus = workOrder.status_code;

    // Validate status transition
    if (!canTransition(currentStatus, newStatusCode)) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatusCode}'`);
    }

    // Prepare update data
    const updateData: any = {
      status_code: newStatusCode,
      updated_at: new Date().toISOString(),
    };

    // Set actual dates based on status
    const now = new Date().toISOString();
    if (newStatusCode === 'in_production' && !workOrder.actual_start_date) {
      updateData.actual_start_date = now;
    }
    if (newStatusCode === 'completed' && !workOrder.actual_end_date) {
      updateData.actual_end_date = now;
      updateData.actual_completion_date = now.split('T')[0]; // Date only
    }

    // Add additional data if provided
    if (additionalData?.delayReason) {
      updateData.delay_reason = additionalData.delayReason;
    }
    if (additionalData?.qualityNotes) {
      updateData.quality_notes = additionalData.qualityNotes;
    }

    // Update work order
    const { data: updatedWorkOrder, error: updateError } = await sb
      .from('manufacturing_work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update work order status: ${updateError.message}`);
    }

    // Create production event
    await WorkOrderService.createProductionEvent(sb, {
      workOrderId,
      eventCode: 'STATUS_UPDATED',
      actorUserId,
      payload: {
        from_status: currentStatus,
        to_status: newStatusCode,
        notes,
        ...additionalData,
      },
    });

    // Update related order item status if needed
    await WorkOrderService.syncOrderItemStatus(sb, workOrder.order_item_id, newStatusCode);

    // Check for material requirements and auto-generate POs if needed
    if (newStatusCode === 'materials_needed' || newStatusCode === 'pending_materials') {
      await WorkOrderService.checkMaterialRequirementsAndGeneratePOs(
        sb, 
        workOrderId, 
        orgId, 
        actorUserId
      );
    }

    return updatedWorkOrder;
  }

  /**
   * Assign work order to a manufacturer with capacity validation
   */
  static async assignManufacturer(
    sb: SupabaseClient,
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
    // Get work order
    const { data: workOrder, error: workOrderError } = await sb
      .from('manufacturing_work_orders')
      .select('*')
      .eq('id', workOrderId)
      .eq('org_id', orgId)
      .single();

    if (workOrderError || !workOrder) {
      throw new Error('Work order not found');
    }

    // Validate manufacturer exists and is active
    const { data: manufacturer, error: mfgError } = await sb
      .from('manufacturers')
      .select('id, name, is_active, lead_time_days, minimum_order_quantity')
      .eq('id', manufacturerId)
      .single();

    if (mfgError || !manufacturer) {
      throw new Error('Manufacturer not found');
    }

    if (!manufacturer.is_active) {
      throw new Error(`Manufacturer "${manufacturer.name}" is not active`);
    }

    // Check minimum order quantity
    if (manufacturer.minimum_order_quantity && workOrder.quantity < manufacturer.minimum_order_quantity) {
      throw new Error(
        `Order quantity (${workOrder.quantity}) is below manufacturer minimum (${manufacturer.minimum_order_quantity})`
      );
    }

    // Check capacity unless skipped
    if (!options?.skipCapacityCheck) {
      const capacity = await WorkOrderService.getManufacturerCapacity(sb, manufacturerId);
      if (capacity.workloadScore > 90) { // Over 90% capacity
        throw new Error(`Manufacturer "${manufacturer.name}" is at capacity (${capacity.workloadScore}% loaded)`);
      }
    }

    // Calculate dates if not provided
    let plannedStartDate = options?.plannedStartDate;
    let plannedDueDate = options?.plannedDueDate;

    if (!plannedDueDate && manufacturer.lead_time_days) {
      const startDate = plannedStartDate || new Date().toISOString().split('T')[0];
      plannedDueDate = calculateEstimatedCompletion(startDate, manufacturer.lead_time_days);
    }

    // Update work order
    const updateData: any = {
      manufacturer_id: manufacturerId,
      status_code: workOrder.status_code === 'pending' ? 'queued' : workOrder.status_code,
      planned_start_date: plannedStartDate,
      planned_due_date: plannedDueDate,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedWorkOrder, error: updateError } = await sb
      .from('manufacturing_work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to assign manufacturer: ${updateError.message}`);
    }

    // Create event
    await WorkOrderService.createProductionEvent(sb, {
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
   * Bulk generate work orders from approved design jobs
   */
  static async bulkGenerateWorkOrders(
    sb: SupabaseClient,
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
    // Get approved design jobs
    const { data: designJobs, error: jobsError } = await sb
      .from('design_jobs')
      .select(`
        id, org_id, order_item_id, status_code,
        order_items:order_item_id(id, quantity, name_snapshot, status_code)
      `)
      .in('id', designJobIds)
      .eq('status_code', 'approved');

    if (jobsError) {
      throw new Error(`Failed to fetch design jobs: ${jobsError.message}`);
    }

    if (!designJobs || designJobs.length === 0) {
      throw new Error('No approved design jobs found');
    }

    if (designJobs.length !== designJobIds.length) {
      throw new Error('Some design jobs were not found or not approved');
    }

    // Verify all jobs belong to same organization
    const orgIds = [...new Set(designJobs.map(job => job.org_id))];
    if (orgIds.length > 1) {
      throw new Error('All design jobs must belong to the same organization');
    }

    const orgId = orgIds[0];

    // Check for existing work orders
    const orderItemIds = designJobs.map(job => job.order_item_id);
    const { data: existingWorkOrders } = await sb
      .from('manufacturing_work_orders')
      .select('order_item_id')
      .in('order_item_id', orderItemIds);

    if (existingWorkOrders && existingWorkOrders.length > 0) {
      const existingItemIds = existingWorkOrders.map(wo => wo.order_item_id);
      throw new Error(`Work orders already exist for order items: ${existingItemIds.join(', ')}`);
    }

    // Create work orders
    const workOrders: WorkOrderType[] = [];
    const events: CreateProductionEventType[] = [];

    for (const job of designJobs) {
      const orderItem = job.order_items;
      if (!orderItem) continue;

      const workOrderData = {
        org_id: orgId,
        order_item_id: job.order_item_id,
        manufacturer_id: options?.manufacturerId || null,
        status_code: 'pending',
        priority: options?.priority || 5,
        quantity: orderItem.quantity,
        instructions: options?.instructions || null,
        planned_start_date: options?.plannedStartDate || null,
        planned_due_date: options?.plannedDueDate || null,
      };

      const { data: workOrder, error: createError } = await sb
        .from('manufacturing_work_orders')
        .insert(workOrderData)
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create work order for order item ${job.order_item_id}: ${createError.message}`);
      }

      workOrders.push(workOrder);

      // Queue event creation
      events.push({
        workOrderId: workOrder.id,
        eventCode: 'WORK_ORDER_CREATED',
        actorUserId,
        payload: {
          generated_from_design_job: job.id,
          quantity: orderItem.quantity,
          priority: options?.priority || 5,
        },
      });
    }

    // Create events in bulk
    for (const event of events) {
      await WorkOrderService.createProductionEvent(sb, event);
    }

    return workOrders;
  }

  /**
   * Get work order with all related details
   */
  static async getWorkOrderWithDetails(
    sb: SupabaseClient,
    workOrderId: string,
    orgId?: string
  ): Promise<WorkOrderWithDetailsType | null> {
    let query = sb
      .from('manufacturing_work_orders')
      .select(`
        *,
        order_items:order_item_id(id, name_snapshot, quantity, status_code, pantone_json, build_overrides_text),
        manufacturers:manufacturer_id(id, name, contact_email, contact_phone, specialties, lead_time_days),
        orders!inner(id, code, customer_contact_name, due_date)
      `)
      .eq('id', workOrderId);

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: workOrder, error } = await query.single();

    if (error || !workOrder) {
      return null;
    }

    // Get production events
    const { data: events } = await sb
      .from('production_events')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('occurred_at', { ascending: false })
      .limit(20);

    // Get milestones
    const { data: milestones } = await sb
      .from('production_milestones')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    return {
      ...workOrder,
      productionEvents: events || [],
      milestones: milestones || [],
    };
  }

  /**
   * Create production event for audit trail
   */
  static async createProductionEvent(
    sb: SupabaseClient,
    eventData: CreateProductionEventType
  ): Promise<ProductionEventType> {
    // CRITICAL: Get org_id from work order for RLS and tenancy
    const { data: workOrder, error: workOrderError } = await sb
      .from('manufacturing_work_orders')
      .select('org_id')
      .eq('id', eventData.workOrderId)
      .single();

    if (workOrderError || !workOrder) {
      throw new Error(`Work order not found: ${workOrderError?.message || 'Invalid work order ID'}`);
    }

    const { data: event, error } = await sb
      .from('production_events')
      .insert({
        org_id: workOrder.org_id, // CRITICAL: Add org_id for RLS and tenancy
        work_order_id: eventData.workOrderId,
        event_code: eventData.eventCode,
        actor_user_id: eventData.actorUserId || null,
        payload: eventData.payload || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create production event: ${error.message}`);
    }

    return event;
  }

  /**
   * Create or update production milestone
   */
  static async updateMilestone(
    sb: SupabaseClient,
    milestoneId: string,
    updateData: UpdateMilestoneType,
    actorUserId?: string
  ): Promise<ProductionMilestoneType> {
    const payload: any = {
      status: updateData.status,
      updated_at: new Date().toISOString(),
    };

    if (updateData.actualDate) {
      payload.actual_date = updateData.actualDate;
    }
    if (updateData.notes) {
      payload.notes = updateData.notes;
    }
    if (updateData.completedBy) {
      payload.completed_by = updateData.completedBy;
    }

    const { data: milestone, error } = await sb
      .from('production_milestones')
      .update(payload)
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update milestone: ${error.message}`);
    }

    // Create event if milestone completed
    if (updateData.status === 'completed') {
      await WorkOrderService.createProductionEvent(sb, {
        workOrderId: milestone.work_order_id,
        eventCode: 'MILESTONE_REACHED',
        actorUserId,
        payload: {
          milestone_code: milestone.milestone_code,
          milestone_name: milestone.milestone_name,
          actual_date: updateData.actualDate,
          notes: updateData.notes,
        },
      });
    }

    return milestone;
  }

  /**
   * Get manufacturer capacity and workload
   */
  static async getManufacturerCapacity(
    sb: SupabaseClient,
    manufacturerId: string
  ): Promise<ManufacturerCapacityType> {
    const { data: manufacturer, error: mfgError } = await sb
      .from('manufacturers')
      .select('id, name, specialties, lead_time_days, is_active')
      .eq('id', manufacturerId)
      .single();

    if (mfgError || !manufacturer) {
      throw new Error('Manufacturer not found');
    }

    // Get current active work orders
    const { data: workOrders, error: woError } = await sb
      .from('manufacturing_work_orders')
      .select('id, quantity, status_code, priority')
      .eq('manufacturer_id', manufacturerId)
      .not('status_code', 'in', '("completed", "shipped", "cancelled")');

    if (woError) {
      throw new Error(`Failed to get manufacturer workload: ${woError.message}`);
    }

    const currentWorkOrders = workOrders?.length || 0;
    const totalQuantity = workOrders?.reduce((sum, wo) => sum + wo.quantity, 0) || 0;

    // Simple capacity calculation (could be enhanced with real capacity data)
    const capacityLimit = 100; // Default capacity
    const workloadScore = Math.min((currentWorkOrders / capacityLimit) * 100, 100);

    return {
      manufacturerId: manufacturer.id,
      name: manufacturer.name,
      specialties: manufacturer.specialties || [],
      currentWorkOrders,
      capacityLimit,
      leadTimeDays: manufacturer.lead_time_days,
      isAvailable: manufacturer.is_active && workloadScore < 90,
      workloadScore,
      nextAvailableDate: workloadScore > 90 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    };
  }

  /**
   * Sync order item status based on work order progress
   */
  private static async syncOrderItemStatus(
    sb: SupabaseClient,
    orderItemId: string,
    workOrderStatus: string
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

    await sb
      .from('order_items')
      .update({ 
        status_code: orderItemStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderItemId);
  }

  /**
   * Handle production delays
   */
  static async reportDelay(
    sb: SupabaseClient,
    workOrderId: string,
    delayReason: string,
    estimatedDelayDays: number,
    orgId: string,
    actorUserId?: string
  ): Promise<WorkOrderType> {
    // Get work order
    const { data: workOrder, error } = await sb
      .from('manufacturing_work_orders')
      .select('*')
      .eq('id', workOrderId)
      .eq('org_id', orgId)
      .single();

    if (error || !workOrder) {
      throw new Error('Work order not found');
    }

    // Calculate new due date
    let newDueDate;
    if (workOrder.planned_due_date) {
      const currentDue = new Date(workOrder.planned_due_date);
      currentDue.setDate(currentDue.getDate() + estimatedDelayDays);
      newDueDate = currentDue.toISOString().split('T')[0];
    }

    // Update work order
    const { data: updatedWorkOrder, error: updateError } = await sb
      .from('manufacturing_work_orders')
      .update({
        delay_reason: delayReason,
        planned_due_date: newDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workOrderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to report delay: ${updateError.message}`);
    }

    // Create delay event
    await WorkOrderService.createProductionEvent(sb, {
      workOrderId,
      eventCode: 'PRODUCTION_DELAYED',
      actorUserId,
      payload: {
        delay_reason: delayReason,
        estimated_delay_days: estimatedDelayDays,
        old_due_date: workOrder.planned_due_date,
        new_due_date: newDueDate,
      },
    });

    return updatedWorkOrder;
  }

  /**
   * Check material requirements for work order and auto-generate POs if configured
   */
  static async checkMaterialRequirementsAndGeneratePOs(
    sb: SupabaseClient,
    workOrderId: string,
    orgId: string,
    actorUserId?: string
  ): Promise<void> {
    try {
      // Import PurchaseOrderService to avoid circular dependency
      const { PurchaseOrderService } = await import('./purchaseOrderService');

      // Check if there are pending material requirements
      const { data: pendingRequirements, error: reqError } = await sb
        .from('material_requirements')
        .select('id, status')
        .eq('work_order_id', workOrderId)
        .eq('org_id', orgId)
        .eq('status', 'pending');

      if (reqError || !pendingRequirements || pendingRequirements.length === 0) {
        return; // No pending requirements, nothing to do
      }

      // Check organization settings for auto PO generation (if implemented)
      // For now, we'll auto-generate POs for small quantities and flag larger ones
      
      try {
        const purchaseOrders = await PurchaseOrderService.bulkGeneratePurchaseOrders(
          sb,
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
          await WorkOrderService.createProductionEvent(sb, {
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