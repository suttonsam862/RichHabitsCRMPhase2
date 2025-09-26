/**
 * Materials API Routes
 * RESTful API for materials catalog management, inventory tracking, and material requirements
 */

import express from 'express';
import { 
  MaterialFiltersDTO,
  CreateMaterialDTO,
  UpdateMaterialDTO,
  CreateMaterialRequirementDTO,
} from '../../../shared/dtos/index.js';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { supabaseForUser, extractAccessToken } from '../../lib/supabase';
import { sendOk, sendCreated, HttpErrors, handleDatabaseError } from '../../lib/http';
import { requireAuth, AuthedRequest } from '../../middleware/auth';
import { requireOrgMember } from '../../middleware/orgSecurity';
import { logDatabaseOperation } from '../../lib/log';
import { sendPaginatedResponse } from '../../lib/pagination';
import { idempotent } from '../../lib/idempotency';
import { trackBusinessEvent, MetricsRequest } from '../../middleware/metrics';
import { PurchaseOrderService } from '../../services/purchaseOrderService';

const router = express.Router();

// All material routes require authentication
router.use(requireAuth);

// Get authenticated Supabase client
async function getSupabaseClient(req: AuthedRequest) {
  const token = extractAccessToken(req.headers.authorization);
  if (!token) {
    throw new Error('Missing authentication token');
  }
  return supabaseForUser(token);
}

/**
 * GET /api/materials
 * List materials with filtering, search, and inventory levels
 */
router.get('/',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const orgId = req.query.orgId as string;
    
    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    // Parse and validate filters
    const filters = MaterialFiltersDTO.parse({
      orgId,
      ...req.query,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    });

    try {
      let query = sb
        .from('materials')
        .select(`
          *,
          preferred_supplier:manufacturers!preferred_supplier_id (
            id,
            name,
            contact_email,
            lead_time_days,
            is_active
          ),
          inventory:materials_inventory!material_id (
            quantity_on_hand,
            quantity_reserved,
            quantity_on_order,
            last_updated
          )
        `)
        .eq('org_id', filters.orgId);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.supplierId) {
        query = query.eq('preferred_supplier_id', filters.supplierId);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      // Search functionality
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Pagination
      query = query
        .range(filters.offset, filters.offset + filters.limit - 1)
        .order('name');

      const { data: materials, error, count } = await query;

      if (error) {
        throw error;
      }

      // Filter by below reorder level if requested
      let filteredMaterials = materials || [];
      if (filters.belowReorderLevel) {
        filteredMaterials = filteredMaterials.filter(material => {
          const inventory = material.inventory?.[0];
          const onHandQuantity = inventory?.quantity_on_hand || 0;
          return onHandQuantity <= material.reorder_level;
        });
      }

      await logDatabaseOperation('materials', 'SELECT', { 
        count: filteredMaterials.length, 
        filters 
      });

      return sendPaginatedResponse(res, {
        data: filteredMaterials,
        count: count || 0,
        limit: filters.limit,
        offset: filters.offset,
      });

    } catch (error) {
      console.error('Error fetching materials:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/materials/:materialId
 * Get material details with inventory and usage history
 */
router.get('/:materialId',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { materialId } = req.params;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    try {
      const { data: material, error } = await sb
        .from('materials')
        .select(`
          *,
          preferred_supplier:manufacturers!preferred_supplier_id (
            id,
            name,
            contact_email,
            contact_phone,
            lead_time_days,
            minimum_order_quantity,
            specialties,
            is_active
          ),
          inventory:materials_inventory!material_id (
            quantity_on_hand,
            quantity_reserved,
            quantity_on_order,
            last_updated,
            notes
          )
        `)
        .eq('id', materialId)
        .eq('org_id', orgId)
        .single();

      if (error) {
        throw error;
      }

      if (!material) {
        return HttpErrors.notFound(res, 'Material not found');
      }

      // Get recent material requirements
      const { data: recentRequirements } = await sb
        .from('material_requirements')
        .select(`
          id,
          work_order_id,
          quantity_needed,
          quantity_fulfilled,
          needed_by_date,
          status,
          notes,
          created_at,
          work_order:manufacturing_work_orders!work_order_id (
            id,
            order_item_id,
            status_code,
            quantity,
            planned_start_date,
            planned_due_date
          )
        `)
        .eq('material_id', materialId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent purchase order items for this material
      const { data: recentPurchases } = await sb
        .from('purchase_order_items')
        .select(`
          id,
          purchase_order_id,
          quantity,
          quantity_received,
          unit_cost,
          date_received,
          quality_check_passed,
          purchase_order:purchase_orders!purchase_order_id (
            po_number,
            status_code,
            order_date,
            expected_delivery_date,
            supplier_name
          )
        `)
        .eq('material_id', materialId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      const materialWithHistory = {
        ...material,
        recent_requirements: recentRequirements || [],
        recent_purchases: recentPurchases || [],
      };

      await logDatabaseOperation('materials', 'SELECT', { materialId, orgId });
      return sendOk(res, materialWithHistory);

    } catch (error) {
      console.error('Error fetching material details:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/materials
 * Create a new material in the catalog
 */
router.post('/',
  requireOrgMember,
  validateRequest(CreateMaterialDTO),
  idempotent,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const materialData = req.body;

    try {
      // Validate SKU uniqueness within organization if provided
      if (materialData.sku) {
        const { data: existingMaterial } = await sb
          .from('materials')
          .select('id')
          .eq('org_id', materialData.orgId)
          .eq('sku', materialData.sku)
          .single();

        if (existingMaterial) {
          return HttpErrors.badRequest(res, 'SKU already exists for this organization');
        }
      }

      // Validate preferred supplier exists if provided
      if (materialData.preferredSupplierId) {
        const { data: supplier, error: supplierError } = await sb
          .from('manufacturers')
          .select('id, is_active')
          .eq('id', materialData.preferredSupplierId)
          .single();

        if (supplierError || !supplier) {
          return HttpErrors.badRequest(res, 'Preferred supplier not found');
        }

        if (!supplier.is_active) {
          return HttpErrors.badRequest(res, 'Preferred supplier is not active');
        }
      }

      // Create material
      const { data: newMaterial, error } = await sb
        .from('materials')
        .insert({
          org_id: materialData.orgId,
          name: materialData.name,
          sku: materialData.sku,
          description: materialData.description,
          category: materialData.category,
          unit: materialData.unit,
          unit_cost: materialData.unitCost,
          reorder_level: materialData.reorderLevel,
          preferred_supplier_id: materialData.preferredSupplierId,
          lead_time_days: materialData.leadTimeDays,
          moq: materialData.moq,
          specifications: materialData.specifications,
          is_active: materialData.isActive,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create initial inventory record
      await sb
        .from('materials_inventory')
        .insert({
          org_id: materialData.orgId,
          material_id: newMaterial.id,
          quantity_on_hand: 0,
          quantity_reserved: 0,
          quantity_on_order: 0,
        });

      await logDatabaseOperation('materials', 'INSERT', {
        materialId: newMaterial.id,
        orgId: materialData.orgId,
      });

      // Track business event
      await trackBusinessEvent('material_created', req as MetricsRequest, {
        status: 'success',
        materialId: newMaterial.id,
        orgId: materialData.orgId
      });

      return sendCreated(res, newMaterial, 'Material created successfully');

    } catch (error) {
      console.error('Error creating material:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * PUT /api/materials/:materialId
 * Update material details
 */
router.put('/:materialId',
  requireOrgMember,
  validateRequest(UpdateMaterialDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { materialId } = req.params;
    const updateData = req.body;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    try {
      // Validate SKU uniqueness if being updated
      if (updateData.sku) {
        const { data: existingMaterial } = await sb
          .from('materials')
          .select('id')
          .eq('org_id', orgId)
          .eq('sku', updateData.sku)
          .neq('id', materialId)
          .single();

        if (existingMaterial) {
          return HttpErrors.badRequest(res, 'SKU already exists for this organization');
        }
      }

      // Validate preferred supplier if being updated
      if (updateData.preferredSupplierId) {
        const { data: supplier } = await sb
          .from('manufacturers')
          .select('id, is_active')
          .eq('id', updateData.preferredSupplierId)
          .single();

        if (!supplier || !supplier.is_active) {
          return HttpErrors.badRequest(res, 'Preferred supplier not found or not active');
        }
      }

      const { data: updatedMaterial, error } = await sb
        .from('materials')
        .update({
          name: updateData.name,
          sku: updateData.sku,
          description: updateData.description,
          category: updateData.category,
          unit: updateData.unit,
          unit_cost: updateData.unitCost,
          reorder_level: updateData.reorderLevel,
          preferred_supplier_id: updateData.preferredSupplierId,
          lead_time_days: updateData.leadTimeDays,
          moq: updateData.moq,
          specifications: updateData.specifications,
          is_active: updateData.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', materialId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedMaterial) {
        return HttpErrors.notFound(res, 'Material not found');
      }

      await logDatabaseOperation('materials', 'UPDATE', { materialId, orgId });
      return sendOk(res, updatedMaterial, 'Material updated successfully');

    } catch (error) {
      console.error('Error updating material:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/materials/:materialId/inventory
 * Get current inventory levels for a material
 */
router.get('/:materialId/inventory',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { materialId } = req.params;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    try {
      const { data: inventory, error } = await sb
        .from('materials_inventory')
        .select(`
          *,
          material:materials!material_id (
            name,
            sku,
            unit,
            reorder_level
          )
        `)
        .eq('material_id', materialId)
        .eq('org_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!inventory) {
        // Create inventory record if it doesn't exist
        const { data: newInventory, error: createError } = await sb
          .from('materials_inventory')
          .insert({
            org_id: orgId,
            material_id: materialId,
            quantity_on_hand: 0,
            quantity_reserved: 0,
            quantity_on_order: 0,
          })
          .select(`
            *,
            material:materials!material_id (
              name,
              sku,
              unit,
              reorder_level
            )
          `)
          .single();

        if (createError) {
          throw createError;
        }

        return sendOk(res, newInventory);
      }

      await logDatabaseOperation('materials_inventory', 'SELECT', { materialId, orgId });
      return sendOk(res, inventory);

    } catch (error) {
      console.error('Error fetching material inventory:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * PUT /api/materials/:materialId/inventory
 * Update material inventory levels (manual adjustment)
 */
router.put('/:materialId/inventory',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { materialId } = req.params;
    const { quantityOnHand, quantityReserved, notes } = req.body;
    const orgId = req.query.orgId as string;
    const actorUserId = req.user?.id;

    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    if (quantityOnHand === undefined || quantityOnHand < 0) {
      return HttpErrors.badRequest(res, 'Valid quantity on hand is required');
    }

    try {
      const { data: updatedInventory, error } = await sb
        .from('materials_inventory')
        .update({
          quantity_on_hand: quantityOnHand,
          quantity_reserved: quantityReserved || 0,
          notes: notes,
          last_updated: new Date().toISOString(),
        })
        .eq('material_id', materialId)
        .eq('org_id', orgId)
        .select(`
          *,
          material:materials!material_id (
            name,
            sku,
            unit,
            reorder_level
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      if (!updatedInventory) {
        return HttpErrors.notFound(res, 'Material inventory not found');
      }

      await logDatabaseOperation('materials_inventory', 'UPDATE', {
        materialId,
        orgId,
        quantityOnHand,
        adjustedBy: actorUserId,
      });

      return sendOk(res, updatedInventory, 'Material inventory updated successfully');

    } catch (error) {
      console.error('Error updating material inventory:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/materials/:materialId/requirements
 * Get material requirements for work orders
 */
router.get('/:materialId/requirements',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { materialId } = req.params;
    const orgId = req.query.orgId as string;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    try {
      let query = sb
        .from('material_requirements')
        .select(`
          *,
          work_order:manufacturing_work_orders!work_order_id (
            id,
            order_item_id,
            manufacturer_id,
            status_code,
            quantity,
            instructions,
            planned_start_date,
            planned_due_date,
            order_item:order_items!order_item_id (
              id,
              name_snapshot,
              quantity,
              status_code
            ),
            manufacturer:manufacturers!manufacturer_id (
              name
            )
          )
        `)
        .eq('material_id', materialId)
        .eq('org_id', orgId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: requirements, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      await logDatabaseOperation('material_requirements', 'SELECT', {
        materialId,
        orgId,
        status,
        count: requirements?.length,
      });

      return sendPaginatedResponse(res, {
        data: requirements || [],
        count: count || 0,
        limit,
        offset,
      });

    } catch (error) {
      console.error('Error fetching material requirements:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * POST /api/materials/:materialId/requirements
 * Create material requirement for a work order
 */
router.post('/:materialId/requirements',
  requireOrgMember,
  validateRequest(CreateMaterialRequirementDTO),
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const { materialId } = req.params;
    const requirementData = req.body;
    const actorUserId = req.user?.id;

    try {
      // Validate work order exists and belongs to organization
      const { data: workOrder, error: woError } = await sb
        .from('manufacturing_work_orders')
        .select('id, org_id, status_code')
        .eq('id', requirementData.workOrderId)
        .single();

      if (woError || !workOrder) {
        return HttpErrors.badRequest(res, 'Work order not found');
      }

      if (workOrder.org_id !== requirementData.orgId) {
        return HttpErrors.badRequest(res, 'Work order does not belong to organization');
      }

      // Check if requirement already exists
      const { data: existingReq } = await sb
        .from('material_requirements')
        .select('id')
        .eq('work_order_id', requirementData.workOrderId)
        .eq('material_id', materialId)
        .single();

      if (existingReq) {
        return HttpErrors.badRequest(res, 'Material requirement already exists for this work order');
      }

      const requirements = await PurchaseOrderService.createMaterialRequirements(
        sb,
        requirementData.workOrderId,
        requirementData.orgId,
        [{
          ...requirementData,
          materialId,
        }],
        actorUserId
      );

      await logDatabaseOperation('material_requirements', 'INSERT', {
        materialId,
        workOrderId: requirementData.workOrderId,
        orgId: requirementData.orgId,
      });

      return sendCreated(res, requirements[0], 'Material requirement created successfully');

    } catch (error) {
      console.error('Error creating material requirement:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

/**
 * GET /api/materials/low-stock
 * Get materials that are below reorder level
 */
router.get('/low-stock',
  requireOrgMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sb = await getSupabaseClient(req);
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return HttpErrors.badRequest(res, 'Organization ID is required');
    }

    try {
      const { data: lowStockMaterials, error } = await sb
        .from('materials')
        .select(`
          *,
          inventory:materials_inventory!material_id (
            quantity_on_hand,
            quantity_reserved,
            quantity_on_order,
            last_updated
          ),
          preferred_supplier:manufacturers!preferred_supplier_id (
            name,
            contact_email,
            lead_time_days
          )
        `)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      // Filter to only materials below reorder level
      const filteredMaterials = (lowStockMaterials || []).filter(material => {
        const inventory = material.inventory?.[0];
        const onHandQuantity = inventory?.quantity_on_hand || 0;
        return onHandQuantity <= material.reorder_level;
      });

      await logDatabaseOperation('materials', 'SELECT', {
        orgId,
        lowStockCount: filteredMaterials.length,
      });

      return sendOk(res, filteredMaterials);

    } catch (error) {
      console.error('Error fetching low stock materials:', error);
      return handleDatabaseError(res, error as Error);
    }
  })
);

export default router;