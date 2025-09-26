/**
 * Purchase Order Service - Business logic for materials procurement management
 * Handles PO creation, approval workflows, material tracking, and supplier management
 */

import { 
  PurchaseOrderType, 
  CreatePurchaseOrderType,
  CreatePurchaseOrderItemType,
  MaterialRequirementType,
  CreateMaterialRequirementType,
  BulkGeneratePurchaseOrdersType,
  ReceivePurchaseOrderItemsType,
  ApprovePurchaseOrderType,
  UpdatePurchaseOrderStatusType,
  PurchaseOrderStatusType,
  PurchaseOrderEventType,
  CreatePurchaseOrderEventType,
  SupplierType,
  canTransitionToStatus,
  requiresApproval,
  PurchaseOrderEventCodeType
} from '@shared/dtos';

interface SupabaseClient {
  from: (table: string) => any;
  rpc: (fn: string, params?: any) => any;
}

export class PurchaseOrderService {
  
  /**
   * Create a new purchase order manually
   * Validates supplier, calculates totals, and handles approval workflow
   */
  static async createPurchaseOrder(
    sb: SupabaseClient,
    purchaseOrderData: CreatePurchaseOrderType,
    actorUserId?: string
  ): Promise<PurchaseOrderType> {
    // Validate supplier exists and is active
    const { data: supplier, error: supplierError } = await sb
      .from('manufacturers')
      .select('id, name, contact_email, contact_phone, is_active')
      .eq('id', purchaseOrderData.supplierId)
      .eq('org_id', purchaseOrderData.orgId)
      .single();

    if (supplierError || !supplier) {
      throw new Error('Supplier not found');
    }

    if (!supplier.is_active) {
      throw new Error(`Supplier "${supplier.name}" is not active`);
    }

    // Generate PO number
    const poNumber = await this.generatePONumber(sb, purchaseOrderData.orgId);

    // Calculate total amount from items
    const totalAmount = purchaseOrderData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unitCost), 0
    );

    // Determine initial status based on approval requirements
    const initialStatus: PurchaseOrderStatusType = requiresApproval(
      totalAmount, 
      purchaseOrderData.approvalThreshold || 1000
    ) ? "pending_approval" : "draft";

    // Create purchase order
    const poPayload = {
      org_id: purchaseOrderData.orgId,
      po_number: poNumber,
      supplier_id: purchaseOrderData.supplierId,
      supplier_name: supplier.name,
      supplier_contact_email: supplier.contact_email,
      supplier_contact_phone: supplier.contact_phone,
      status_code: initialStatus,
      total_amount: totalAmount,
      approval_threshold: purchaseOrderData.approvalThreshold || 1000,
      order_date: purchaseOrderData.orderDate,
      expected_delivery_date: purchaseOrderData.expectedDeliveryDate,
      requested_by: purchaseOrderData.requestedBy,
      assigned_to: purchaseOrderData.assignedTo,
      priority: purchaseOrderData.priority || 3,
      currency: purchaseOrderData.currency || "USD",
      terms_and_conditions: purchaseOrderData.termsAndConditions,
      shipping_address: purchaseOrderData.shippingAddress,
      notes: purchaseOrderData.notes,
      internal_notes: purchaseOrderData.internalNotes,
    };

    const { data: newPO, error: poError } = await sb
      .from('purchase_orders')
      .insert(poPayload)
      .select()
      .single();

    if (poError) {
      throw new Error(`Failed to create purchase order: ${poError.message}`);
    }

    // Create purchase order items
    const itemsPayload = purchaseOrderData.items.map((item, index) => ({
      org_id: purchaseOrderData.orgId,
      purchase_order_id: newPO.id,
      material_id: item.materialId || null,
      material_name: item.materialName,
      material_sku: item.materialSku,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unitCost,
      total_cost: item.quantity * item.unitCost,
      line_number: index + 1,
      notes: item.notes,
    }));

    const { data: items, error: itemsError } = await sb
      .from('purchase_order_items')
      .insert(itemsPayload)
      .select();

    if (itemsError) {
      // Cleanup: delete the PO if items creation failed
      await sb.from('purchase_orders').delete().eq('id', newPO.id);
      throw new Error(`Failed to create purchase order items: ${itemsError.message}`);
    }

    // Create default milestones if provided
    if (purchaseOrderData.milestones && purchaseOrderData.milestones.length > 0) {
      const milestonesPayload = purchaseOrderData.milestones.map((milestone, index) => ({
        org_id: purchaseOrderData.orgId,
        purchase_order_id: newPO.id,
        milestone_code: milestone.milestoneCode,
        milestone_name: milestone.milestoneName,
        expected_date: milestone.expectedDate,
        status: milestone.status || "pending",
        notes: milestone.notes,
        automatically_tracked: milestone.automaticallyTracked || false,
        sort_order: milestone.sortOrder || index,
      }));

      await sb
        .from('purchase_order_milestones')
        .insert(milestonesPayload);
    }

    // Create creation event
    await this.createPurchaseOrderEvent(sb, {
      orgId: purchaseOrderData.orgId,
      purchaseOrderId: newPO.id,
      eventCode: "PO_CREATED",
      actorUserId,
      payload: {
        po_number: poNumber,
        supplier_name: supplier.name,
        total_amount: totalAmount,
        initial_status: initialStatus,
        item_count: items.length,
      },
    });

    // Update material inventory reservations for tracked materials
    await this.updateMaterialInventoryReservations(sb, newPO.id, purchaseOrderData.orgId, "reserve");

    return await this.getPurchaseOrderWithDetails(sb, newPO.id, purchaseOrderData.orgId);
  }

  /**
   * Bulk generate purchase orders from work order material requirements
   * Groups materials by supplier and creates multiple POs as needed
   */
  static async bulkGeneratePurchaseOrders(
    sb: SupabaseClient,
    bulkData: BulkGeneratePurchaseOrdersType,
    orgId: string,
    actorUserId?: string
  ): Promise<PurchaseOrderType[]> {
    // Get material requirements for specified work orders
    const { data: requirements, error: reqError } = await sb
      .from('material_requirements')
      .select(`
        id,
        work_order_id,
        material_id,
        quantity_needed,
        quantity_fulfilled,
        needed_by_date,
        materials (
          id,
          name,
          sku,
          unit,
          unit_cost,
          preferred_supplier_id,
          manufacturers (
            id,
            name,
            contact_email,
            contact_phone,
            is_active
          )
        )
      `)
      .eq('org_id', orgId)
      .in('work_order_id', bulkData.workOrderIds)
      .eq('status', 'pending')
      .neq('material_id', null);

    if (reqError) {
      throw new Error(`Failed to fetch material requirements: ${reqError.message}`);
    }

    if (!requirements || requirements.length === 0) {
      throw new Error('No pending material requirements found for specified work orders');
    }

    // Group requirements by supplier if requested
    const supplierGroups = new Map<string, typeof requirements>();
    
    for (const req of requirements) {
      const material = req.materials;
      if (!material || !material.preferred_supplier_id) {
        throw new Error(`Material "${material?.name || req.material_id}" has no preferred supplier`);
      }

      const supplierId = bulkData.groupBySupplierId ? material.preferred_supplier_id : req.id;
      
      if (!supplierGroups.has(supplierId)) {
        supplierGroups.set(supplierId, []);
      }
      supplierGroups.get(supplierId)!.push(req);
    }

    // Create purchase orders for each supplier group
    const createdPurchaseOrders: PurchaseOrderType[] = [];

    for (const [supplierId, supplierRequirements] of supplierGroups.entries()) {
      const firstRequirement = supplierRequirements[0];
      const supplier = firstRequirement.materials.manufacturers;
      
      if (!supplier || !supplier.is_active) {
        console.warn(`Skipping inactive supplier: ${supplier?.name || supplierId}`);
        continue;
      }

      // Calculate needed quantities (minus already fulfilled)
      const items: CreatePurchaseOrderItemType[] = supplierRequirements.map((req, index) => {
        const material = req.materials;
        const quantityNeeded = req.quantity_needed - req.quantity_fulfilled;
        
        return {
          orgId,
          materialId: material.id,
          materialName: material.name,
          materialSku: material.sku,
          description: `For Work Order ${req.work_order_id}`,
          quantity: quantityNeeded,
          unit: material.unit,
          unitCost: material.unit_cost || 0,
          lineNumber: index + 1,
          notes: `Auto-generated from work order requirements. Needed by: ${req.needed_by_date || 'TBD'}`,
        };
      });

      // Create the purchase order
      const poData: CreatePurchaseOrderType = {
        orgId,
        supplierId: bulkData.groupBySupplierId ? supplierId : supplier.id,
        requestedBy: actorUserId || '',
        priority: bulkData.priority,
        expectedDeliveryDate: bulkData.requestedDeliveryDate,
        notes: bulkData.notes || `Auto-generated PO for work orders: ${bulkData.workOrderIds.join(', ')}`,
        items,
      };

      try {
        const purchaseOrder = await this.createPurchaseOrder(sb, poData, actorUserId);
        createdPurchaseOrders.push(purchaseOrder);

        // Update material requirements status to "ordered"
        const requirementIds = supplierRequirements.map(req => req.id);
        await sb
          .from('material_requirements')
          .update({ status: 'ordered' })
          .eq('org_id', orgId)
          .in('id', requirementIds);

      } catch (error) {
        console.error(`Failed to create PO for supplier ${supplier.name}:`, error);
        // Continue with other suppliers even if one fails
      }
    }

    // Create bulk generation event
    await this.createPurchaseOrderEvent(sb, {
      orgId,
      purchaseOrderId: createdPurchaseOrders[0]?.id || '', // Use first PO for event tracking
      eventCode: "PO_CREATED",
      actorUserId,
      payload: {
        bulk_generation: true,
        work_order_ids: bulkData.workOrderIds,
        pos_created: createdPurchaseOrders.length,
        supplier_groups: supplierGroups.size,
      },
    });

    return createdPurchaseOrders;
  }

  /**
   * Approve purchase order - validates approval authority and updates status
   */
  static async approvePurchaseOrder(
    sb: SupabaseClient,
    purchaseOrderId: string,
    orgId: string,
    approvalData: ApprovePurchaseOrderType,
    actorUserId?: string
  ): Promise<PurchaseOrderType> {
    // Get current PO details
    const { data: po, error: poError } = await sb
      .from('purchase_orders')
      .select('id, status_code, total_amount, approval_threshold, requested_by')
      .eq('id', purchaseOrderId)
      .eq('org_id', orgId)
      .single();

    if (poError || !po) {
      throw new Error('Purchase order not found');
    }

    // Validate current status allows approval
    if (!canTransitionToStatus(po.status_code, "approved")) {
      throw new Error(`Cannot approve purchase order with status: ${po.status_code}`);
    }

    // Check if approval is actually required
    if (!requiresApproval(po.total_amount, po.approval_threshold)) {
      throw new Error('This purchase order does not require approval');
    }

    // Update purchase order status to approved
    const { data: updatedPO, error: updateError } = await sb
      .from('purchase_orders')
      .update({
        status_code: "approved",
        approved_by: actorUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to approve purchase order: ${updateError.message}`);
    }

    // Create approval event
    await this.createPurchaseOrderEvent(sb, {
      orgId,
      purchaseOrderId,
      eventCode: "PO_APPROVED",
      actorUserId,
      payload: {
        total_amount: po.total_amount,
        approval_notes: approvalData.notes,
        requested_by: po.requested_by,
      },
    });

    return await this.getPurchaseOrderWithDetails(sb, purchaseOrderId, orgId);
  }

  /**
   * Update purchase order status with validation and event logging
   */
  static async updatePurchaseOrderStatus(
    sb: SupabaseClient,
    purchaseOrderId: string,
    orgId: string,
    statusData: UpdatePurchaseOrderStatusType,
    actorUserId?: string
  ): Promise<PurchaseOrderType> {
    // Get current status
    const { data: po, error: poError } = await sb
      .from('purchase_orders')
      .select('id, status_code, supplier_name')
      .eq('id', purchaseOrderId)
      .eq('org_id', orgId)
      .single();

    if (poError || !po) {
      throw new Error('Purchase order not found');
    }

    // Validate status transition
    if (!canTransitionToStatus(po.status_code, statusData.statusCode)) {
      throw new Error(`Cannot transition from ${po.status_code} to ${statusData.statusCode}`);
    }

    // Update status
    const { data: updatedPO, error: updateError } = await sb
      .from('purchase_orders')
      .update({
        status_code: statusData.statusCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseOrderId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update purchase order status: ${updateError.message}`);
    }

    // Determine event code based on new status
    const eventCodeMap: Record<PurchaseOrderStatusType, PurchaseOrderEventCodeType> = {
      "draft": "PO_DRAFT_SAVED",
      "pending_approval": "PO_SUBMITTED_FOR_APPROVAL",
      "approved": "PO_APPROVED",
      "sent": "PO_SENT_TO_SUPPLIER",
      "acknowledged": "PO_ACKNOWLEDGED_BY_SUPPLIER",
      "in_production": "PO_ITEMS_SHIPPED",
      "shipped": "PO_ITEMS_SHIPPED",
      "delivered": "PO_ITEMS_DELIVERED",
      "received": "PO_ITEMS_RECEIVED",
      "completed": "PO_COMPLETED",
      "cancelled": "PO_CANCELLED",
      "on_hold": "PO_PUT_ON_HOLD",
    };

    // Create status change event
    await this.createPurchaseOrderEvent(sb, {
      orgId,
      purchaseOrderId,
      eventCode: eventCodeMap[statusData.statusCode],
      actorUserId,
      payload: {
        old_status: po.status_code,
        new_status: statusData.statusCode,
        notes: statusData.notes,
        notify_supplier: statusData.notifySupplier,
      },
    });

    return await this.getPurchaseOrderWithDetails(sb, purchaseOrderId, orgId);
  }

  /**
   * Receive purchase order items and update inventory
   */
  static async receivePurchaseOrderItems(
    sb: SupabaseClient,
    purchaseOrderId: string,
    orgId: string,
    receiptData: ReceivePurchaseOrderItemsType,
    actorUserId?: string
  ): Promise<PurchaseOrderType> {
    // Validate PO exists and is in appropriate status
    const { data: po, error: poError } = await sb
      .from('purchase_orders')
      .select('id, status_code, supplier_name')
      .eq('id', purchaseOrderId)
      .eq('org_id', orgId)
      .single();

    if (poError || !po) {
      throw new Error('Purchase order not found');
    }

    if (!["delivered", "received"].includes(po.status_code)) {
      throw new Error(`Cannot receive items for PO with status: ${po.status_code}`);
    }

    // Update each received item
    for (const receivedItem of receiptData.items) {
      const { data: item, error: itemError } = await sb
        .from('purchase_order_items')
        .update({
          quantity_received: receivedItem.quantityReceived,
          date_received: receivedItem.dateReceived || new Date().toISOString(),
          received_by: actorUserId,
          quality_check_passed: receivedItem.qualityCheckPassed,
          quality_notes: receivedItem.qualityNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', receivedItem.itemId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (itemError) {
        throw new Error(`Failed to update item ${receivedItem.itemId}: ${itemError.message}`);
      }

      // Update material inventory if this item is linked to a material
      if (item.material_id) {
        await this.updateMaterialInventoryOnReceipt(
          sb, 
          item.material_id, 
          orgId, 
          receivedItem.quantityReceived
        );
      }
    }

    // Check if all items are fully received and update PO status
    const { data: allItems, error: itemsError } = await sb
      .from('purchase_order_items')
      .select('quantity, quantity_received')
      .eq('purchase_order_id', purchaseOrderId);

    if (!itemsError && allItems) {
      const allFullyReceived = allItems.every(item => 
        item.quantity_received >= item.quantity
      );

      if (allFullyReceived && po.status_code !== "completed") {
        await this.updatePurchaseOrderStatus(
          sb,
          purchaseOrderId,
          orgId,
          { statusCode: "completed", notes: "All items received" },
          actorUserId
        );
      }
    }

    // Create receipt event
    await this.createPurchaseOrderEvent(sb, {
      orgId,
      purchaseOrderId,
      eventCode: "PO_ITEMS_RECEIVED",
      actorUserId,
      payload: {
        items_received: receiptData.items.length,
        receipt_notes: receiptData.notes,
        receipt_date: new Date().toISOString(),
      },
    });

    return await this.getPurchaseOrderWithDetails(sb, purchaseOrderId, orgId);
  }

  /**
   * Get purchase order with full details including items, milestones, and events
   */
  static async getPurchaseOrderWithDetails(
    sb: SupabaseClient,
    purchaseOrderId: string,
    orgId: string
  ): Promise<PurchaseOrderType> {
    const { data: po, error: poError } = await sb
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items (*),
        milestones:purchase_order_milestones (*),
        supplier:manufacturers (
          id,
          name,
          contact_email,
          contact_phone,
          specialties,
          minimum_order_quantity,
          lead_time_days,
          is_active
        )
      `)
      .eq('id', purchaseOrderId)
      .eq('org_id', orgId)
      .single();

    if (poError || !po) {
      throw new Error('Purchase order not found');
    }

    // Get recent events
    const { data: events } = await sb
      .from('purchase_order_events')
      .select('*')
      .eq('org_id', orgId)
      .eq('purchase_order_id', purchaseOrderId)
      .order('occurred_at', { ascending: false })
      .limit(10);

    return {
      ...po,
      events: events || [],
    } as PurchaseOrderType;
  }

  /**
   * Create material requirements for a work order
   */
  static async createMaterialRequirements(
    sb: SupabaseClient,
    workOrderId: string,
    orgId: string,
    requirements: CreateMaterialRequirementType[],
    actorUserId?: string
  ): Promise<MaterialRequirementType[]> {
    const requirementsPayload = requirements.map(req => ({
      org_id: orgId,
      work_order_id: workOrderId,
      material_id: req.materialId,
      quantity_needed: req.quantityNeeded,
      needed_by_date: req.neededByDate,
      status: req.status || 'pending',
      notes: req.notes,
    }));

    const { data: createdRequirements, error } = await sb
      .from('material_requirements')
      .insert(requirementsPayload)
      .select();

    if (error) {
      throw new Error(`Failed to create material requirements: ${error.message}`);
    }

    return createdRequirements;
  }

  /**
   * Generate unique PO number
   */
  private static async generatePONumber(sb: SupabaseClient, orgId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const poNumber = `PO-${today}-${random}`;

      // Check if this PO number already exists
      const { data: existing } = await sb
        .from('purchase_orders')
        .select('id')
        .eq('org_id', orgId)
        .eq('po_number', poNumber)
        .single();

      if (!existing) {
        return poNumber;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique PO number after maximum attempts');
  }

  /**
   * Create purchase order event for audit trail
   */
  private static async createPurchaseOrderEvent(
    sb: SupabaseClient,
    eventData: CreatePurchaseOrderEventType
  ): Promise<PurchaseOrderEventType> {
    const { data: event, error } = await sb
      .from('purchase_order_events')
      .insert({
        org_id: eventData.orgId,
        purchase_order_id: eventData.purchaseOrderId,
        event_code: eventData.eventCode,
        actor_user_id: eventData.actorUserId,
        payload: eventData.payload,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create purchase order event:', error);
      // Don't throw error to avoid breaking main operations
    }

    return event;
  }

  /**
   * Update material inventory reservations when PO is created/cancelled
   */
  private static async updateMaterialInventoryReservations(
    sb: SupabaseClient,
    purchaseOrderId: string,
    orgId: string,
    operation: "reserve" | "release"
  ): Promise<void> {
    // Get all items with material IDs from this PO
    const { data: items, error: itemsError } = await sb
      .from('purchase_order_items')
      .select('material_id, quantity')
      .eq('purchase_order_id', purchaseOrderId)
      .neq('material_id', null);

    if (itemsError || !items) return;

    for (const item of items) {
      const adjustment = operation === "reserve" ? item.quantity : -item.quantity;

      await sb
        .from('materials_inventory')
        .update({
          quantity_on_order: sb.raw(`quantity_on_order + ${adjustment}`),
          last_updated: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('material_id', item.material_id);
    }
  }

  /**
   * Update material inventory when items are received
   */
  private static async updateMaterialInventoryOnReceipt(
    sb: SupabaseClient,
    materialId: string,
    orgId: string,
    quantityReceived: number
  ): Promise<void> {
    // First, ensure inventory record exists
    const { data: inventory, error: inventoryError } = await sb
      .from('materials_inventory')
      .select('id')
      .eq('org_id', orgId)
      .eq('material_id', materialId)
      .single();

    if (inventoryError && inventoryError.code === 'PGRST116') {
      // Create inventory record if it doesn't exist
      await sb
        .from('materials_inventory')
        .insert({
          org_id: orgId,
          material_id: materialId,
          quantity_on_hand: quantityReceived,
          quantity_on_order: -quantityReceived, // Reduce on-order quantity
        });
    } else {
      // Update existing inventory
      await sb
        .from('materials_inventory')
        .update({
          quantity_on_hand: sb.raw(`quantity_on_hand + ${quantityReceived}`),
          quantity_on_order: sb.raw(`quantity_on_order - ${quantityReceived}`),
          last_updated: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('material_id', materialId);
    }
  }

  /**
   * Calculate estimated delivery date based on supplier lead time
   */
  static async calculateEstimatedDeliveryDate(
    sb: SupabaseClient,
    supplierId: string,
    orgId: string,
    orderDate?: string
  ): Promise<string> {
    const { data: supplier, error } = await sb
      .from('manufacturers')
      .select('lead_time_days')
      .eq('id', supplierId)
      .eq('org_id', orgId)
      .single();

    const leadTimeDays = supplier?.lead_time_days || 14; // Default 14 days
    const startDate = new Date(orderDate || new Date());
    startDate.setDate(startDate.getDate() + leadTimeDays);

    return startDate.toISOString().split('T')[0]; // Return date only
  }

  /**
   * Get suppliers with performance metrics
   */
  static async getSuppliersWithPerformance(
    sb: SupabaseClient,
    orgId: string,
    filters: {
      isActive?: boolean;
      specialties?: string[];
      minimumPerformanceScore?: number;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SupplierType[]> {
    let query = sb
      .from('manufacturers')
      .select(`
        *,
        performance_metrics:supplier_performance_metrics!supplier_id (
          overall_rating,
          on_time_delivery_rate,
          quality_score
        )
      `)
      .eq('org_id', orgId);

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.specialties && filters.specialties.length > 0) {
      query = query.overlaps('specialties', filters.specialties);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
    }

    const { data: suppliers, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    // Filter by performance score if specified
    if (filters.minimumPerformanceScore) {
      return suppliers?.filter(supplier => {
        const latestMetrics = supplier.performance_metrics?.[0];
        return !latestMetrics || 
               (latestMetrics.overall_rating || 0) >= filters.minimumPerformanceScore!;
      }) || [];
    }

    return suppliers || [];
  }

  /**
   * Update supplier performance metrics
   */
  static async updateSupplierPerformanceMetrics(
    sb: SupabaseClient,
    supplierId: string,
    orgId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<void> {
    // Calculate performance metrics for the period
    const { data: pos, error: posError } = await sb
      .from('purchase_orders')
      .select(`
        id,
        total_amount,
        expected_delivery_date,
        actual_delivery_date,
        status_code,
        items:purchase_order_items (
          quality_check_passed,
          quality_notes
        )
      `)
      .eq('supplier_id', supplierId)
      .eq('org_id', orgId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .eq('status_code', 'completed');

    if (posError || !pos || pos.length === 0) return;

    const totalOrders = pos.length;
    const totalAmount = pos.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    
    const deliveryStats = pos.reduce((stats, po) => {
      if (po.expected_delivery_date && po.actual_delivery_date) {
        const expected = new Date(po.expected_delivery_date);
        const actual = new Date(po.actual_delivery_date);
        
        if (actual <= expected) {
          stats.onTime++;
        } else {
          stats.late++;
          stats.totalDelayDays += Math.ceil(
            (actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }
      return stats;
    }, { onTime: 0, late: 0, totalDelayDays: 0 });

    const qualityStats = pos.reduce((stats, po) => {
      po.items?.forEach(item => {
        stats.total++;
        if (item.quality_check_passed === false) {
          stats.issues++;
        }
      });
      return stats;
    }, { total: 0, issues: 0 });

    const averageDeliveryDays = deliveryStats.late > 0 ? 
      deliveryStats.totalDelayDays / deliveryStats.late : 0;

    const onTimeRate = totalOrders > 0 ? 
      deliveryStats.onTime / totalOrders : 0;

    const qualityScore = qualityStats.total > 0 ? 
      Math.max(1, 5 - (qualityStats.issues / qualityStats.total * 4)) : 5;

    const overallRating = Math.min(5, Math.max(1, 
      (onTimeRate * 2) + (qualityScore / 5 * 2) + 1
    ));

    // Upsert performance metrics
    await sb
      .from('supplier_performance_metrics')
      .upsert({
        org_id: orgId,
        supplier_id: supplierId,
        period_start: periodStart,
        period_end: periodEnd,
        total_orders: totalOrders,
        total_amount: totalAmount,
        on_time_deliveries: deliveryStats.onTime,
        late_deliveries: deliveryStats.late,
        average_delivery_days: averageDeliveryDays,
        quality_score: qualityScore,
        quality_issues: qualityStats.issues,
        overall_rating: overallRating,
      }, {
        onConflict: 'org_id,supplier_id,period_start,period_end'
      });
  }
}