import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkOrderService } from '../../server/services/workOrderService';
import { eq, and } from 'drizzle-orm';
import type { 
  CreateWorkOrderType, 
  UpdateWorkOrderType,
  WorkOrderType,
  WorkOrderWithDetailsType,
  BulkGenerateWorkOrdersType,
  CreateProductionEventType,
  ManufacturerCapacityType 
} from '../../shared/dtos';

// Mock database
const mockDb = {
  transaction: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: vi.fn()
};

// Mock database schema
vi.mock('../../server/db', () => ({
  db: mockDb
}));

vi.mock('@shared/schema', () => ({
  manufacturingWorkOrders: {
    id: 'id',
    orgId: 'org_id',
    orderItemId: 'order_item_id',
    manufacturerId: 'manufacturer_id',
    statusCode: 'status_code',
    priority: 'priority',
    quantity: 'quantity',
    instructions: 'instructions',
    plannedStartDate: 'planned_start_date',
    plannedDueDate: 'planned_due_date'
  },
  orderItems: {
    id: 'id',
    orgId: 'org_id',
    quantity: 'quantity',
    nameSnapshot: 'name_snapshot',
    statusCode: 'status_code'
  },
  manufacturers: {
    id: 'id',
    isActive: 'is_active',
    name: 'name'
  },
  productionEvents: {
    id: 'id',
    workOrderId: 'work_order_id',
    eventCode: 'event_code',
    eventType: 'event_type',
    actorUserId: 'actor_user_id',
    payload: 'payload',
    createdAt: 'created_at'
  },
  productionMilestones: {
    id: 'id',
    workOrderId: 'work_order_id',
    milestoneCode: 'milestone_code',
    status: 'status',
    completedAt: 'completed_at'
  }
}));

describe('WorkOrderService', () => {
  let mockTransaction: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockFrom: any;
  let mockWhere: any;
  let mockLimit: any;
  let mockReturning: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock chains
    mockLimit = vi.fn().mockReturnThis();
    mockWhere = vi.fn().mockReturnThis();
    mockFrom = vi.fn().mockReturnThis();
    mockReturning = vi.fn().mockReturnThis();
    mockSelect = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockReturnThis();
    mockUpdate = vi.fn().mockReturnThis();

    const mockQuery = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      returning: mockReturning
    };

    mockSelect.mockReturnValue(mockQuery);
    mockInsert.mockReturnValue(mockQuery);
    mockUpdate.mockReturnValue(mockQuery);
    mockFrom.mockReturnValue(mockQuery);
    mockWhere.mockReturnValue(mockQuery);
    mockLimit.mockReturnValue(mockQuery);
    mockReturning.mockReturnValue(mockQuery);

    // Mock transaction
    mockTransaction = vi.fn().mockImplementation(async (callback) => {
      const tx = mockQuery;
      return await callback(tx);
    });
    
    mockDb.transaction = mockTransaction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkOrder', () => {
    const mockWorkOrderData: CreateWorkOrderType = {
      orgId: 'org-123',
      orderItemId: 'order-item-123',
      manufacturerId: 'manufacturer-123',
      statusCode: 'pending',
      priority: 3,
      quantity: 100,
      instructions: 'Follow standard procedures',
      plannedStartDate: '2025-02-01',
      plannedDueDate: '2025-02-15'
    };

    it('should successfully create work order', async () => {
      const mockOrderItem = [{
        id: 'order-item-123',
        orgId: 'org-123',
        quantity: 100,
        nameSnapshot: 'Test Product',
        statusCode: 'pending'
      }];

      const mockManufacturer = [{
        id: 'manufacturer-123',
        isActive: true,
        name: 'Test Manufacturer'
      }];

      const mockCreatedWorkOrder = [{
        id: 'work-order-123',
        ...mockWorkOrderData,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }];

      // Mock order item lookup
      mockLimit.mockResolvedValueOnce(mockOrderItem);
      
      // Mock existing work order check
      mockLimit.mockResolvedValueOnce([]);
      
      // Mock manufacturer validation
      mockLimit.mockResolvedValueOnce(mockManufacturer);
      
      // Mock work order creation
      mockReturning.mockResolvedValueOnce(mockCreatedWorkOrder);

      const result = await WorkOrderService.createWorkOrder(
        mockWorkOrderData,
        'actor-123'
      );

      expect(mockTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedWorkOrder[0]);
    });

    it('should throw error if order item not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        WorkOrderService.createWorkOrder(mockWorkOrderData, 'actor-123')
      ).rejects.toThrow('Order item not found');
    });

    it('should throw error if order item belongs to different organization', async () => {
      const mockOrderItem = [{
        id: 'order-item-123',
        orgId: 'different-org',
        quantity: 100,
        nameSnapshot: 'Test Product',
        statusCode: 'pending'
      }];

      mockLimit.mockResolvedValueOnce(mockOrderItem);

      await expect(
        WorkOrderService.createWorkOrder(mockWorkOrderData, 'actor-123')
      ).rejects.toThrow('Order item does not belong to specified organization');
    });

    it('should throw error if work order already exists', async () => {
      const mockOrderItem = [{
        id: 'order-item-123',
        orgId: 'org-123',
        quantity: 100,
        nameSnapshot: 'Test Product',
        statusCode: 'pending'
      }];

      const mockExistingWorkOrder = [{
        id: 'existing-work-order'
      }];

      mockLimit.mockResolvedValueOnce(mockOrderItem);
      mockLimit.mockResolvedValueOnce(mockExistingWorkOrder);

      await expect(
        WorkOrderService.createWorkOrder(mockWorkOrderData, 'actor-123')
      ).rejects.toThrow('Work order already exists for this order item');
    });

    it('should throw error if manufacturer is inactive', async () => {
      const mockOrderItem = [{
        id: 'order-item-123',
        orgId: 'org-123',
        quantity: 100,
        nameSnapshot: 'Test Product',
        statusCode: 'pending'
      }];

      const mockInactiveManufacturer = [{
        id: 'manufacturer-123',
        isActive: false,
        name: 'Inactive Manufacturer'
      }];

      mockLimit.mockResolvedValueOnce(mockOrderItem);
      mockLimit.mockResolvedValueOnce([]);
      mockLimit.mockResolvedValueOnce(mockInactiveManufacturer);

      await expect(
        WorkOrderService.createWorkOrder(mockWorkOrderData, 'actor-123')
      ).rejects.toThrow('Manufacturer "Inactive Manufacturer" is not active');
    });

    it('should handle work order creation without manufacturer', async () => {
      const workOrderDataWithoutManufacturer: CreateWorkOrderType = {
        ...mockWorkOrderData,
        manufacturerId: undefined
      };

      const mockOrderItem = [{
        id: 'order-item-123',
        orgId: 'org-123',
        quantity: 100,
        nameSnapshot: 'Test Product',
        statusCode: 'pending'
      }];

      const mockCreatedWorkOrder = [{
        id: 'work-order-123',
        ...workOrderDataWithoutManufacturer,
        manufacturerId: null,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }];

      mockLimit.mockResolvedValueOnce(mockOrderItem);
      mockLimit.mockResolvedValueOnce([]);
      mockReturning.mockResolvedValueOnce(mockCreatedWorkOrder);

      const result = await WorkOrderService.createWorkOrder(
        workOrderDataWithoutManufacturer,
        'actor-123'
      );

      expect(result).toEqual(mockCreatedWorkOrder[0]);
    });
  });

  describe('updateWorkOrderStatus', () => {
    const mockWorkOrderId = 'work-order-123';
    const mockOrgId = 'org-123';
    const mockNewStatus = 'in_progress';
    const mockActorUserId = 'actor-123';

    it('should successfully update work order status', async () => {
      const mockExistingWorkOrder = [{
        id: mockWorkOrderId,
        orgId: mockOrgId,
        statusCode: 'pending',
        orderItemId: 'order-item-123'
      }];

      const mockUpdatedWorkOrder = [{
        ...mockExistingWorkOrder[0],
        statusCode: mockNewStatus,
        updatedAt: '2025-01-20T11:00:00Z'
      }];

      // Mock work order lookup
      mockLimit.mockResolvedValueOnce(mockExistingWorkOrder);
      
      // Mock status update
      mockReturning.mockResolvedValueOnce(mockUpdatedWorkOrder);

      // Mock createProductionEvent
      const createEventSpy = vi.spyOn(WorkOrderService, 'createProductionEvent')
        .mockResolvedValue({
          id: 'event-123',
          workOrderId: mockWorkOrderId,
          eventCode: 'STATUS_UPDATED',
          eventType: 'status_change',
          actorUserId: mockActorUserId,
          payload: { from: 'pending', to: mockNewStatus },
          createdAt: '2025-01-20T11:00:00Z'
        });

      const result = await WorkOrderService.updateWorkOrderStatus(
        mockWorkOrderId,
        mockNewStatus,
        mockOrgId,
        mockActorUserId,
        'Status updated by user'
      );

      expect(createEventSpy).toHaveBeenCalledWith({
        workOrderId: mockWorkOrderId,
        eventCode: 'STATUS_UPDATED',
        eventType: 'status_change',
        statusBefore: 'pending',
        statusAfter: mockNewStatus,
        actorUserId: mockActorUserId,
        notes: 'Status updated by user'
      });

      expect(result).toEqual(mockUpdatedWorkOrder[0]);
    });

    it('should throw error if work order not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        WorkOrderService.updateWorkOrderStatus(
          mockWorkOrderId,
          mockNewStatus,
          mockOrgId,
          mockActorUserId
        )
      ).rejects.toThrow('Work order not found');
    });

    it('should validate status transitions', async () => {
      const mockExistingWorkOrder = [{
        id: mockWorkOrderId,
        orgId: mockOrgId,
        statusCode: 'completed',
        orderItemId: 'order-item-123'
      }];

      mockLimit.mockResolvedValueOnce(mockExistingWorkOrder);

      const isValidTransitionSpy = vi.spyOn(WorkOrderService, 'isValidStatusTransition')
        .mockReturnValue(false);

      await expect(
        WorkOrderService.updateWorkOrderStatus(
          mockWorkOrderId,
          'pending',
          mockOrgId,
          mockActorUserId
        )
      ).rejects.toThrow('Invalid status transition');

      expect(isValidTransitionSpy).toHaveBeenCalledWith('completed', 'pending');
    });
  });

  describe('bulkGenerateWorkOrders', () => {
    const mockBulkData: BulkGenerateWorkOrdersType = {
      orgId: 'org-123',
      orderItemIds: ['item-1', 'item-2', 'item-3'],
      manufacturerId: 'manufacturer-123',
      priority: 3,
      instructions: 'Bulk production run',
      plannedStartDate: '2025-02-01',
      plannedDueDate: '2025-02-15'
    };

    it('should successfully generate multiple work orders', async () => {
      const mockOrderItems = [
        { id: 'item-1', orgId: 'org-123', quantity: 50, nameSnapshot: 'Product 1', statusCode: 'pending' },
        { id: 'item-2', orgId: 'org-123', quantity: 75, nameSnapshot: 'Product 2', statusCode: 'pending' },
        { id: 'item-3', orgId: 'org-123', quantity: 100, nameSnapshot: 'Product 3', statusCode: 'pending' }
      ];

      const mockCreatedWorkOrders = mockOrderItems.map((item, index) => ({
        id: `work-order-${index + 1}`,
        orgId: mockBulkData.orgId,
        orderItemId: item.id,
        manufacturerId: mockBulkData.manufacturerId,
        statusCode: 'pending',
        priority: mockBulkData.priority,
        quantity: item.quantity,
        instructions: mockBulkData.instructions,
        plannedStartDate: mockBulkData.plannedStartDate,
        plannedDueDate: mockBulkData.plannedDueDate,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }));

      // Mock order items lookup
      mockFrom.mockResolvedValueOnce(mockOrderItems);
      
      // Mock existing work orders check
      mockFrom.mockResolvedValueOnce([]);
      
      // Mock manufacturer validation
      mockLimit.mockResolvedValueOnce([{
        id: 'manufacturer-123',
        isActive: true,
        name: 'Test Manufacturer'
      }]);
      
      // Mock bulk work order creation
      mockReturning.mockResolvedValueOnce(mockCreatedWorkOrders);

      const createEventSpy = vi.spyOn(WorkOrderService, 'createProductionEvent')
        .mockResolvedValue({} as any);

      const result = await WorkOrderService.bulkGenerateWorkOrders(
        mockBulkData,
        'actor-123'
      );

      expect(createEventSpy).toHaveBeenCalledTimes(mockCreatedWorkOrders.length);
      expect(result).toEqual({
        success: true,
        createdWorkOrders: mockCreatedWorkOrders,
        totalCreated: mockCreatedWorkOrders.length,
        skipped: []
      });
    });

    it('should handle some order items already having work orders', async () => {
      const mockOrderItems = [
        { id: 'item-1', orgId: 'org-123', quantity: 50, nameSnapshot: 'Product 1', statusCode: 'pending' },
        { id: 'item-2', orgId: 'org-123', quantity: 75, nameSnapshot: 'Product 2', statusCode: 'pending' }
      ];

      const mockExistingWorkOrders = [
        { orderItemId: 'item-1' }
      ];

      const mockCreatedWorkOrders = [{
        id: 'work-order-1',
        orgId: mockBulkData.orgId,
        orderItemId: 'item-2',
        manufacturerId: mockBulkData.manufacturerId,
        statusCode: 'pending',
        priority: mockBulkData.priority,
        quantity: 75,
        instructions: mockBulkData.instructions,
        plannedStartDate: mockBulkData.plannedStartDate,
        plannedDueDate: mockBulkData.plannedDueDate,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      }];

      mockFrom.mockResolvedValueOnce(mockOrderItems);
      mockFrom.mockResolvedValueOnce(mockExistingWorkOrders);
      mockLimit.mockResolvedValueOnce([{
        id: 'manufacturer-123',
        isActive: true,
        name: 'Test Manufacturer'
      }]);
      mockReturning.mockResolvedValueOnce(mockCreatedWorkOrders);

      const createEventSpy = vi.spyOn(WorkOrderService, 'createProductionEvent')
        .mockResolvedValue({} as any);

      const result = await WorkOrderService.bulkGenerateWorkOrders(
        mockBulkData,
        'actor-123'
      );

      expect(result).toEqual({
        success: true,
        createdWorkOrders: mockCreatedWorkOrders,
        totalCreated: 1,
        skipped: ['item-1']
      });
    });
  });

  describe('getManufacturerCapacity', () => {
    const mockManufacturerId = 'manufacturer-123';
    const mockOrgId = 'org-123';

    it('should calculate manufacturer capacity correctly', async () => {
      const mockActiveWorkOrders = [
        { id: 'wo-1', quantity: 100, statusCode: 'in_progress' },
        { id: 'wo-2', quantity: 50, statusCode: 'pending' },
        { id: 'wo-3', quantity: 75, statusCode: 'in_progress' }
      ];

      const mockCompletedWorkOrders = [
        { id: 'wo-4', quantity: 200, statusCode: 'completed', completedAt: '2025-01-15T10:00:00Z' },
        { id: 'wo-5', quantity: 150, statusCode: 'completed', completedAt: '2025-01-10T10:00:00Z' }
      ];

      // Mock active work orders query
      mockFrom.mockResolvedValueOnce(mockActiveWorkOrders);
      
      // Mock completed work orders query (last 30 days)
      mockFrom.mockResolvedValueOnce(mockCompletedWorkOrders);

      const result = await WorkOrderService.getManufacturerCapacity(
        mockManufacturerId,
        mockOrgId
      );

      expect(result).toEqual({
        manufacturerId: mockManufacturerId,
        currentWorkload: 225, // 100 + 50 + 75
        activeWorkOrders: 3,
        averageMonthlyThroughput: 350, // 200 + 150
        utilizationPercentage: expect.any(Number),
        estimatedAvailableDate: expect.any(String)
      });
    });

    it('should handle manufacturer with no work orders', async () => {
      mockFrom.mockResolvedValueOnce([]);
      mockFrom.mockResolvedValueOnce([]);

      const result = await WorkOrderService.getManufacturerCapacity(
        mockManufacturerId,
        mockOrgId
      );

      expect(result).toEqual({
        manufacturerId: mockManufacturerId,
        currentWorkload: 0,
        activeWorkOrders: 0,
        averageMonthlyThroughput: 0,
        utilizationPercentage: 0,
        estimatedAvailableDate: expect.any(String)
      });
    });
  });

  describe('Status Transition Logic', () => {
    describe('isValidStatusTransition', () => {
      it('should validate correct status transitions', () => {
        expect(WorkOrderService.isValidStatusTransition('pending', 'in_progress')).toBe(true);
        expect(WorkOrderService.isValidStatusTransition('in_progress', 'completed')).toBe(true);
        expect(WorkOrderService.isValidStatusTransition('pending', 'cancelled')).toBe(true);
        expect(WorkOrderService.isValidStatusTransition('in_progress', 'on_hold')).toBe(true);
      });

      it('should reject invalid status transitions', () => {
        expect(WorkOrderService.isValidStatusTransition('pending', 'completed')).toBe(false);
        expect(WorkOrderService.isValidStatusTransition('completed', 'in_progress')).toBe(false);
        expect(WorkOrderService.isValidStatusTransition('cancelled', 'pending')).toBe(false);
      });

      it('should handle unknown status codes', () => {
        expect(WorkOrderService.isValidStatusTransition('unknown', 'pending')).toBe(false);
        expect(WorkOrderService.isValidStatusTransition('pending', 'unknown')).toBe(false);
      });
    });

    describe('getValidTransitions', () => {
      it('should return valid transitions for each status', () => {
        const pendingTransitions = WorkOrderService.getValidTransitions('pending');
        expect(pendingTransitions).toContain('in_progress');
        expect(pendingTransitions).toContain('cancelled');

        const inProgressTransitions = WorkOrderService.getValidTransitions('in_progress');
        expect(inProgressTransitions).toContain('completed');
        expect(inProgressTransitions).toContain('on_hold');
        expect(inProgressTransitions).toContain('cancelled');

        const completedTransitions = WorkOrderService.getValidTransitions('completed');
        expect(completedTransitions).toEqual([]);
      });

      it('should handle unknown status codes', () => {
        expect(WorkOrderService.getValidTransitions('unknown')).toEqual([]);
      });
    });
  });
});