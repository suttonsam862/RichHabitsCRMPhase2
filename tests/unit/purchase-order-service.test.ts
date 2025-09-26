import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PurchaseOrderService } from '../../server/services/purchaseOrderService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  CreatePurchaseOrderType,
  PurchaseOrderType,
  ApprovePurchaseOrderType,
  ReceivePurchaseOrderItemsType,
  BulkGeneratePurchaseOrdersType
} from '../../shared/dtos';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
} as unknown as SupabaseClient;

describe('PurchaseOrderService', () => {
  let mockQuery: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockSingle: any;
  let mockReturning: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
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
    (mockSupabaseClient.from as any).mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createPurchaseOrder', () => {
    const mockCreateData: CreatePurchaseOrderType = {
      orgId: 'org-123',
      supplierId: 'supplier-123',
      items: [
        {
          materialId: 'material-1',
          materialName: 'Cotton Fabric',
          materialSku: 'COT-001',
          description: 'High quality cotton fabric',
          quantity: 100,
          unit: 'yards',
          unitCost: 12.50,
          notes: 'Premium grade'
        },
        {
          materialId: 'material-2',
          materialName: 'Thread',
          materialSku: 'THR-001',
          description: 'Polyester thread',
          quantity: 50,
          unit: 'spools',
          unitCost: 3.25,
          notes: 'Various colors'
        }
      ],
      orderDate: '2025-01-20',
      expectedDeliveryDate: '2025-02-05',
      requestedBy: 'purchaser-123',
      priority: 3,
      notes: 'Urgent order for production',
      approvalThreshold: 1000
    };

    it('should successfully create purchase order', async () => {
      const mockSupplier = {
        id: 'supplier-123',
        name: 'Test Supplier',
        contact_email: 'supplier@test.com',
        contact_phone: '555-0123',
        is_active: true
      };

      const mockCreatedPO: PurchaseOrderType = {
        id: 'po-123',
        orgId: mockCreateData.orgId,
        poNumber: 'PO-2025-001',
        supplierId: mockCreateData.supplierId,
        supplierName: mockSupplier.name,
        supplierContactEmail: mockSupplier.contact_email,
        supplierContactPhone: mockSupplier.contact_phone,
        statusCode: 'pending_approval',
        totalAmount: 1412.50, // (100 * 12.50) + (50 * 3.25)
        approvalThreshold: mockCreateData.approvalThreshold,
        orderDate: mockCreateData.orderDate,
        expectedDeliveryDate: mockCreateData.expectedDeliveryDate,
        requestedBy: mockCreateData.requestedBy,
        priority: mockCreateData.priority,
        currency: 'USD',
        notes: mockCreateData.notes,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      const mockCreatedItems = mockCreateData.items.map((item, index) => ({
        id: `item-${index + 1}`,
        orgId: mockCreateData.orgId,
        purchaseOrderId: 'po-123',
        materialId: item.materialId,
        materialName: item.materialName,
        materialSku: item.materialSku,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        lineNumber: index + 1,
        notes: item.notes
      }));

      // Mock supplier lookup
      mockSingle.mockResolvedValueOnce({ data: mockSupplier, error: null });

      // Mock PO number generation
      const generatePONumberSpy = vi.spyOn(PurchaseOrderService, 'generatePONumber')
        .mockResolvedValue('PO-2025-001');

      // Mock PO creation
      mockSingle.mockResolvedValueOnce({ data: mockCreatedPO, error: null });

      // Mock items creation
      mockReturning.mockResolvedValueOnce({ data: mockCreatedItems, error: null });

      // Mock event creation
      const createEventSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrderEvent')
        .mockResolvedValue({
          id: 'event-123',
          purchaseOrderId: 'po-123',
          eventCode: 'PO_CREATED',
          actorUserId: 'actor-123',
          payload: expect.any(Object),
          createdAt: '2025-01-20T10:00:00Z'
        });

      const result = await PurchaseOrderService.createPurchaseOrder(
        mockSupabaseClient,
        mockCreateData,
        'actor-123'
      );

      expect(generatePONumberSpy).toHaveBeenCalledWith(mockSupabaseClient, mockCreateData.orgId);
      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          purchaseOrderId: 'po-123',
          eventCode: 'PO_CREATED',
          actorUserId: 'actor-123'
        })
      );
      expect(result).toEqual({
        purchaseOrder: mockCreatedPO,
        items: mockCreatedItems
      });
    });

    it('should throw error if supplier not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(
        PurchaseOrderService.createPurchaseOrder(
          mockSupabaseClient,
          mockCreateData,
          'actor-123'
        )
      ).rejects.toThrow('Supplier not found');
    });

    it('should throw error if supplier is inactive', async () => {
      const mockInactiveSupplier = {
        id: 'supplier-123',
        name: 'Inactive Supplier',
        contact_email: 'supplier@test.com',
        contact_phone: '555-0123',
        is_active: false
      };

      mockSingle.mockResolvedValueOnce({ data: mockInactiveSupplier, error: null });

      await expect(
        PurchaseOrderService.createPurchaseOrder(
          mockSupabaseClient,
          mockCreateData,
          'actor-123'
        )
      ).rejects.toThrow('Supplier "Inactive Supplier" is not active');
    });

    it('should set correct status based on approval threshold', async () => {
      const lowValueData: CreatePurchaseOrderType = {
        ...mockCreateData,
        items: [
          {
            materialId: 'material-1',
            materialName: 'Small Item',
            materialSku: 'SM-001',
            description: 'Small item',
            quantity: 10,
            unit: 'pieces',
            unitCost: 5.00,
            notes: ''
          }
        ],
        approvalThreshold: 1000
      };

      const mockSupplier = {
        id: 'supplier-123',
        name: 'Test Supplier',
        contact_email: 'supplier@test.com',
        contact_phone: '555-0123',
        is_active: true
      };

      mockSingle.mockResolvedValueOnce({ data: mockSupplier, error: null });

      const generatePONumberSpy = vi.spyOn(PurchaseOrderService, 'generatePONumber')
        .mockResolvedValue('PO-2025-001');

      const mockCreatedPO: PurchaseOrderType = {
        id: 'po-123',
        orgId: lowValueData.orgId,
        poNumber: 'PO-2025-001',
        supplierId: lowValueData.supplierId,
        supplierName: mockSupplier.name,
        statusCode: 'draft', // Should be draft since total (50) < threshold (1000)
        totalAmount: 50,
        approvalThreshold: 1000,
        orderDate: lowValueData.orderDate,
        expectedDeliveryDate: lowValueData.expectedDeliveryDate,
        requestedBy: lowValueData.requestedBy,
        priority: lowValueData.priority,
        currency: 'USD',
        notes: lowValueData.notes,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      mockSingle.mockResolvedValueOnce({ data: mockCreatedPO, error: null });
      mockReturning.mockResolvedValueOnce({ data: [], error: null });

      const createEventSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrderEvent')
        .mockResolvedValue({} as any);

      const result = await PurchaseOrderService.createPurchaseOrder(
        mockSupabaseClient,
        lowValueData,
        'actor-123'
      );

      expect(result.purchaseOrder.statusCode).toBe('draft');
    });
  });

  describe('approvePurchaseOrder', () => {
    const mockPOId = 'po-123';
    const mockOrgId = 'org-123';
    const mockApprovalData: ApprovePurchaseOrderType = {
      approved: true,
      approverComments: 'Approved for production',
      approvedAmount: 1412.50
    };

    it('should successfully approve purchase order', async () => {
      const mockExistingPO = {
        id: mockPOId,
        org_id: mockOrgId,
        status_code: 'pending_approval',
        total_amount: 1412.50,
        supplier_name: 'Test Supplier'
      };

      const mockApprovedPO: PurchaseOrderType = {
        ...mockExistingPO,
        statusCode: 'approved',
        approvedAt: '2025-01-20T11:00:00Z',
        approvedBy: 'approver-123',
        approverComments: mockApprovalData.approverComments,
        updatedAt: '2025-01-20T11:00:00Z'
      } as PurchaseOrderType;

      // Mock PO lookup
      mockSingle.mockResolvedValueOnce({ data: mockExistingPO, error: null });

      // Mock PO update
      mockSingle.mockResolvedValueOnce({ data: mockApprovedPO, error: null });

      // Mock event creation
      const createEventSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrderEvent')
        .mockResolvedValue({} as any);

      const result = await PurchaseOrderService.approvePurchaseOrder(
        mockSupabaseClient,
        mockPOId,
        mockOrgId,
        'approver-123',
        mockApprovalData
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          purchaseOrderId: mockPOId,
          eventCode: 'PO_APPROVED',
          actorUserId: 'approver-123',
          payload: expect.objectContaining({
            approved: true,
            approver_comments: mockApprovalData.approverComments,
            approved_amount: mockApprovalData.approvedAmount
          })
        })
      );

      expect(result).toEqual(mockApprovedPO);
    });

    it('should handle rejection of purchase order', async () => {
      const rejectionData: ApprovePurchaseOrderType = {
        approved: false,
        approverComments: 'Budget exceeded, please revise',
        rejectionReason: 'over_budget'
      };

      const mockExistingPO = {
        id: mockPOId,
        org_id: mockOrgId,
        status_code: 'pending_approval',
        total_amount: 1412.50,
        supplier_name: 'Test Supplier'
      };

      const mockRejectedPO: PurchaseOrderType = {
        ...mockExistingPO,
        statusCode: 'rejected',
        rejectedAt: '2025-01-20T11:00:00Z',
        rejectedBy: 'approver-123',
        rejectionReason: rejectionData.rejectionReason,
        approverComments: rejectionData.approverComments,
        updatedAt: '2025-01-20T11:00:00Z'
      } as PurchaseOrderType;

      mockSingle.mockResolvedValueOnce({ data: mockExistingPO, error: null });
      mockSingle.mockResolvedValueOnce({ data: mockRejectedPO, error: null });

      const createEventSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrderEvent')
        .mockResolvedValue({} as any);

      const result = await PurchaseOrderService.approvePurchaseOrder(
        mockSupabaseClient,
        mockPOId,
        mockOrgId,
        'approver-123',
        rejectionData
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          purchaseOrderId: mockPOId,
          eventCode: 'PO_REJECTED',
          actorUserId: 'approver-123',
          payload: expect.objectContaining({
            approved: false,
            rejection_reason: rejectionData.rejectionReason,
            approver_comments: rejectionData.approverComments
          })
        })
      );

      expect(result).toEqual(mockRejectedPO);
    });

    it('should throw error if PO not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(
        PurchaseOrderService.approvePurchaseOrder(
          mockSupabaseClient,
          mockPOId,
          mockOrgId,
          'approver-123',
          mockApprovalData
        )
      ).rejects.toThrow('Purchase order not found');
    });

    it('should throw error if PO is not in pending_approval status', async () => {
      const mockExistingPO = {
        id: mockPOId,
        org_id: mockOrgId,
        status_code: 'draft',
        total_amount: 1412.50
      };

      mockSingle.mockResolvedValueOnce({ data: mockExistingPO, error: null });

      await expect(
        PurchaseOrderService.approvePurchaseOrder(
          mockSupabaseClient,
          mockPOId,
          mockOrgId,
          'approver-123',
          mockApprovalData
        )
      ).rejects.toThrow('Purchase order is not in pending approval status');
    });
  });

  describe('receivePurchaseOrderItems', () => {
    const mockPOId = 'po-123';
    const mockOrgId = 'org-123';
    const mockReceiptData: ReceivePurchaseOrderItemsType = {
      receivedItems: [
        {
          itemId: 'item-1',
          quantityReceived: 95,
          qualityNotes: 'Good quality, slight shortage',
          receivedDate: '2025-01-25'
        },
        {
          itemId: 'item-2',
          quantityReceived: 50,
          qualityNotes: 'Perfect condition',
          receivedDate: '2025-01-25'
        }
      ],
      receivedBy: 'receiver-123',
      totalPackages: 2,
      shippingNotes: 'Delivered on time'
    };

    it('should successfully record item receipts', async () => {
      const mockExistingPO = {
        id: mockPOId,
        org_id: mockOrgId,
        status_code: 'shipped',
        po_number: 'PO-2025-001'
      };

      const mockPOItems = [
        { id: 'item-1', quantity: 100, quantity_received: 0 },
        { id: 'item-2', quantity: 50, quantity_received: 0 }
      ];

      const mockUpdatedItems = mockReceiptData.receivedItems.map(item => ({
        id: item.itemId,
        quantity_received: item.quantityReceived,
        quality_notes: item.qualityNotes,
        received_date: item.receivedDate,
        received_by: mockReceiptData.receivedBy
      }));

      // Mock PO lookup
      mockSingle.mockResolvedValueOnce({ data: mockExistingPO, error: null });

      // Mock items lookup
      mockReturning.mockResolvedValueOnce({ data: mockPOItems, error: null });

      // Mock items update
      mockReturning.mockResolvedValueOnce({ data: mockUpdatedItems, error: null });

      // Mock PO status update to received
      const mockUpdatedPO = {
        ...mockExistingPO,
        status_code: 'received',
        received_at: '2025-01-25T10:00:00Z',
        received_by: mockReceiptData.receivedBy
      };

      mockSingle.mockResolvedValueOnce({ data: mockUpdatedPO, error: null });

      // Mock event creation
      const createEventSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrderEvent')
        .mockResolvedValue({} as any);

      const result = await PurchaseOrderService.receivePurchaseOrderItems(
        mockSupabaseClient,
        mockPOId,
        mockOrgId,
        'receiver-123',
        mockReceiptData
      );

      expect(createEventSpy).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          purchaseOrderId: mockPOId,
          eventCode: 'ITEMS_RECEIVED',
          actorUserId: 'receiver-123',
          payload: expect.objectContaining({
            received_items: mockReceiptData.receivedItems,
            total_packages: mockReceiptData.totalPackages,
            shipping_notes: mockReceiptData.shippingNotes
          })
        })
      );

      expect(result).toEqual({
        purchaseOrder: mockUpdatedPO,
        updatedItems: mockUpdatedItems,
        fullyReceived: true
      });
    });

    it('should handle partial receipts', async () => {
      const partialReceiptData: ReceivePurchaseOrderItemsType = {
        receivedItems: [
          {
            itemId: 'item-1',
            quantityReceived: 50, // Only half of 100 ordered
            qualityNotes: 'Partial delivery',
            receivedDate: '2025-01-25'
          }
        ],
        receivedBy: 'receiver-123',
        totalPackages: 1,
        shippingNotes: 'First shipment of two'
      };

      const mockExistingPO = {
        id: mockPOId,
        org_id: mockOrgId,
        status_code: 'shipped',
        po_number: 'PO-2025-001'
      };

      const mockPOItems = [
        { id: 'item-1', quantity: 100, quantity_received: 0 },
        { id: 'item-2', quantity: 50, quantity_received: 0 }
      ];

      mockSingle.mockResolvedValueOnce({ data: mockExistingPO, error: null });
      mockReturning.mockResolvedValueOnce({ data: mockPOItems, error: null });
      mockReturning.mockResolvedValueOnce({ data: [], error: null });

      // Should remain in partially_received status
      const mockUpdatedPO = {
        ...mockExistingPO,
        status_code: 'partially_received'
      };

      mockSingle.mockResolvedValueOnce({ data: mockUpdatedPO, error: null });

      const createEventSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrderEvent')
        .mockResolvedValue({} as any);

      const result = await PurchaseOrderService.receivePurchaseOrderItems(
        mockSupabaseClient,
        mockPOId,
        mockOrgId,
        'receiver-123',
        partialReceiptData
      );

      expect(result.fullyReceived).toBe(false);
      expect(result.purchaseOrder.status_code).toBe('partially_received');
    });

    it('should throw error if PO not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(
        PurchaseOrderService.receivePurchaseOrderItems(
          mockSupabaseClient,
          mockPOId,
          mockOrgId,
          'receiver-123',
          mockReceiptData
        )
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('bulkGeneratePurchaseOrders', () => {
    const mockBulkData: BulkGeneratePurchaseOrdersType = {
      orgId: 'org-123',
      materialRequirements: [
        {
          materialId: 'material-1',
          requiredQuantity: 500,
          preferredSupplierId: 'supplier-1',
          dueDate: '2025-02-15',
          notes: 'Urgent requirement'
        },
        {
          materialId: 'material-2',
          requiredQuantity: 200,
          preferredSupplierId: 'supplier-2',
          dueDate: '2025-02-20',
          notes: 'Standard order'
        }
      ],
      requestedBy: 'purchaser-123',
      priority: 3
    };

    it('should successfully generate multiple purchase orders', async () => {
      const mockSuppliers = [
        { id: 'supplier-1', name: 'Supplier 1', contact_email: 'sup1@test.com', is_active: true },
        { id: 'supplier-2', name: 'Supplier 2', contact_email: 'sup2@test.com', is_active: true }
      ];

      const mockMaterials = [
        { id: 'material-1', name: 'Material 1', sku: 'MAT-001', unit_cost: 10.00 },
        { id: 'material-2', name: 'Material 2', sku: 'MAT-002', unit_cost: 5.00 }
      ];

      const mockCreatedPOs = [
        {
          id: 'po-1',
          orgId: mockBulkData.orgId,
          poNumber: 'PO-2025-001',
          supplierId: 'supplier-1',
          statusCode: 'draft',
          totalAmount: 5000, // 500 * 10.00
          createdAt: '2025-01-20T10:00:00Z'
        },
        {
          id: 'po-2',
          orgId: mockBulkData.orgId,
          poNumber: 'PO-2025-002',
          supplierId: 'supplier-2',
          statusCode: 'draft',
          totalAmount: 1000, // 200 * 5.00
          createdAt: '2025-01-20T10:00:00Z'
        }
      ];

      // Mock suppliers lookup
      mockReturning.mockResolvedValueOnce({ data: mockSuppliers, error: null });

      // Mock materials lookup
      mockReturning.mockResolvedValueOnce({ data: mockMaterials, error: null });

      // Mock createPurchaseOrder calls
      const createPOSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrder')
        .mockResolvedValueOnce({ purchaseOrder: mockCreatedPOs[0], items: [] })
        .mockResolvedValueOnce({ purchaseOrder: mockCreatedPOs[1], items: [] });

      const result = await PurchaseOrderService.bulkGeneratePurchaseOrders(
        mockSupabaseClient,
        mockBulkData,
        'actor-123'
      );

      expect(createPOSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        createdPurchaseOrders: mockCreatedPOs,
        totalCreated: 2,
        errors: []
      });
    });

    it('should handle some suppliers being inactive', async () => {
      const mockSuppliers = [
        { id: 'supplier-1', name: 'Supplier 1', contact_email: 'sup1@test.com', is_active: true },
        { id: 'supplier-2', name: 'Supplier 2', contact_email: 'sup2@test.com', is_active: false }
      ];

      const mockMaterials = [
        { id: 'material-1', name: 'Material 1', sku: 'MAT-001', unit_cost: 10.00 },
        { id: 'material-2', name: 'Material 2', sku: 'MAT-002', unit_cost: 5.00 }
      ];

      mockReturning.mockResolvedValueOnce({ data: mockSuppliers, error: null });
      mockReturning.mockResolvedValueOnce({ data: mockMaterials, error: null });

      const createPOSpy = vi.spyOn(PurchaseOrderService, 'createPurchaseOrder')
        .mockResolvedValueOnce({ 
          purchaseOrder: {
            id: 'po-1',
            orgId: mockBulkData.orgId,
            supplierId: 'supplier-1',
            statusCode: 'draft'
          }, 
          items: [] 
        });

      const result = await PurchaseOrderService.bulkGeneratePurchaseOrders(
        mockSupabaseClient,
        mockBulkData,
        'actor-123'
      );

      expect(createPOSpy).toHaveBeenCalledTimes(1);
      expect(result.totalCreated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Supplier 2 is not active');
    });
  });

  describe('Status Transition Logic', () => {
    describe('canTransitionToStatus', () => {
      it('should validate correct status transitions', () => {
        expect(PurchaseOrderService.canTransitionToStatus('draft', 'pending_approval')).toBe(true);
        expect(PurchaseOrderService.canTransitionToStatus('pending_approval', 'approved')).toBe(true);
        expect(PurchaseOrderService.canTransitionToStatus('pending_approval', 'rejected')).toBe(true);
        expect(PurchaseOrderService.canTransitionToStatus('approved', 'ordered')).toBe(true);
        expect(PurchaseOrderService.canTransitionToStatus('ordered', 'shipped')).toBe(true);
        expect(PurchaseOrderService.canTransitionToStatus('shipped', 'received')).toBe(true);
      });

      it('should reject invalid status transitions', () => {
        expect(PurchaseOrderService.canTransitionToStatus('draft', 'shipped')).toBe(false);
        expect(PurchaseOrderService.canTransitionToStatus('received', 'pending_approval')).toBe(false);
        expect(PurchaseOrderService.canTransitionToStatus('rejected', 'approved')).toBe(false);
      });
    });

    describe('requiresApproval', () => {
      it('should require approval for amounts above threshold', () => {
        expect(PurchaseOrderService.requiresApproval(1500, 1000)).toBe(true);
        expect(PurchaseOrderService.requiresApproval(1000, 1000)).toBe(false); // Equal to threshold
        expect(PurchaseOrderService.requiresApproval(500, 1000)).toBe(false);
      });

      it('should use default threshold if not provided', () => {
        expect(PurchaseOrderService.requiresApproval(1500)).toBe(true); // Default threshold is usually 1000
        expect(PurchaseOrderService.requiresApproval(500)).toBe(false);
      });
    });
  });

  describe('calculateEstimatedDeliveryDate', () => {
    const mockSupplierId = 'supplier-123';
    const mockOrgId = 'org-123';

    it('should calculate delivery date based on supplier performance', async () => {
      const mockSupplierData = {
        id: mockSupplierId,
        average_lead_time_days: 10,
        on_time_delivery_rate: 0.85,
        recent_orders_count: 5
      };

      mockSingle.mockResolvedValueOnce({ data: mockSupplierData, error: null });

      const result = await PurchaseOrderService.calculateEstimatedDeliveryDate(
        mockSupabaseClient,
        mockSupplierId,
        mockOrgId,
        new Date('2025-01-20')
      );

      expect(result.estimatedDeliveryDate).toBeDefined();
      expect(result.confidenceLevel).toBeDefined();
      expect(result.supplierPerformance).toEqual({
        averageLeadTimeDays: 10,
        onTimeDeliveryRate: 0.85,
        recentOrdersCount: 5
      });
    });

    it('should handle suppliers with no historical data', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await PurchaseOrderService.calculateEstimatedDeliveryDate(
        mockSupabaseClient,
        mockSupplierId,
        mockOrgId,
        new Date('2025-01-20')
      );

      expect(result.estimatedDeliveryDate).toBeDefined();
      expect(result.confidenceLevel).toBe('low');
      expect(result.supplierPerformance).toEqual({
        averageLeadTimeDays: 14, // Default lead time
        onTimeDeliveryRate: 0.7, // Default rate
        recentOrdersCount: 0
      });
    });
  });
});