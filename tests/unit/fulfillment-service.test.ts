import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FulfillmentService } from '../../server/services/fulfillmentService';
import type { 
  CreateShippingInfoType,
  CreateQualityCheckType,
  CreateCompletionRecordType,
  FulfillmentEventType,
  ShippingInfoType,
  QualityCheckType
} from '@shared/dtos/FulfillmentDTO';

// Mock supabase
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('../../server/lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock transformers
vi.mock('../../server/services/fulfillmentTransformers', () => ({
  serializeFulfillmentEvent: vi.fn(data => data),
  deserializeFulfillmentEvent: vi.fn(data => data),
  serializeShippingInfo: vi.fn(data => data),
  deserializeShippingInfo: vi.fn(data => data),
  serializeQualityCheck: vi.fn(data => data),
  deserializeQualityCheck: vi.fn(data => data),
  serializeCompletionRecord: vi.fn(data => data),
  deserializeCompletionRecord: vi.fn(data => data),
  serializeFulfillmentMilestone: vi.fn(data => data),
  deserializeFulfillmentMilestone: vi.fn(data => data),
  generateShipmentNumber: vi.fn(() => 'SHIP-2025-001'),
}));

// Mock DTOs
vi.mock('@shared/dtos/FulfillmentDTO', () => ({
  FULFILLMENT_EVENT_CODES: {
    FULFILLMENT_STARTED: 'FULFILLMENT_STARTED',
    QUALITY_CHECK_PASSED: 'QUALITY_CHECK_PASSED',
    READY_TO_SHIP: 'READY_TO_SHIP',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'COMPLETED'
  },
  FULFILLMENT_MILESTONE_CODES: {
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    PRODUCTION_COMPLETED: 'PRODUCTION_COMPLETED',
    QUALITY_APPROVED: 'QUALITY_APPROVED',
    PACKAGING_COMPLETED: 'PACKAGING_COMPLETED',
    READY_TO_SHIP: 'READY_TO_SHIP',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED'
  },
  FULFILLMENT_STATUS_CODES: {
    PREPARATION: 'PREPARATION',
    PRODUCTION: 'PRODUCTION',
    QUALITY_CONTROL: 'QUALITY_CONTROL',
    PACKAGING: 'PACKAGING',
    READY_TO_SHIP: 'READY_TO_SHIP',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'COMPLETED'
  },
  canTransitionFulfillmentStatus: vi.fn((from, to) => {
    const validTransitions = {
      'PREPARATION': ['PRODUCTION', 'CANCELLED'],
      'PRODUCTION': ['QUALITY_CONTROL', 'CANCELLED'],
      'QUALITY_CONTROL': ['PACKAGING', 'PRODUCTION', 'CANCELLED'],
      'PACKAGING': ['READY_TO_SHIP', 'CANCELLED'],
      'READY_TO_SHIP': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED', 'CANCELLED'],
      'DELIVERED': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': []
    };
    return validTransitions[from]?.includes(to) || false;
  }),
  getDefaultFulfillmentMilestones: vi.fn(() => [
    {
      code: 'ORDER_CONFIRMED',
      name: 'Order Confirmed',
      type: 'status_milestone'
    },
    {
      code: 'PRODUCTION_COMPLETED',
      name: 'Production Completed',
      type: 'status_milestone'
    },
    {
      code: 'QUALITY_APPROVED',
      name: 'Quality Approved',
      type: 'status_milestone'
    },
    {
      code: 'READY_TO_SHIP',
      name: 'Ready to Ship',
      type: 'status_milestone'
    },
    {
      code: 'SHIPPED',
      name: 'Shipped',
      type: 'status_milestone'
    },
    {
      code: 'DELIVERED',
      name: 'Delivered',
      type: 'status_milestone'
    }
  ])
}));

describe('FulfillmentService', () => {
  let fulfillmentService: FulfillmentService;
  let mockQuery: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockSingle: any;
  let mockReturning: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fulfillmentService = new FulfillmentService();
    
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
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startFulfillment', () => {
    const mockOrderId = 'order-123';
    const mockOrgId = 'org-123';
    const mockActorUserId = 'actor-123';

    it('should successfully start fulfillment process', async () => {
      const options = {
        notes: 'Priority order',
        priority: 1,
        plannedShipDate: '2025-02-01',
        specialInstructions: 'Handle with care'
      };

      const mockOrder = {
        id: mockOrderId,
        status_code: 'confirmed',
        org_id: mockOrgId
      };

      // Mock getFulfillmentMilestones to return empty array (no existing milestones)
      const getMilestonesSpy = vi.spyOn(fulfillmentService, 'getFulfillmentMilestones')
        .mockResolvedValue([]);

      // Mock order lookup
      mockSingle.mockResolvedValueOnce({ data: mockOrder, error: null });

      // Mock milestone creation
      mockInsert.mockResolvedValueOnce({ error: null });

      // Mock createFulfillmentEvent
      const createEventSpy = vi.spyOn(fulfillmentService, 'createFulfillmentEvent')
        .mockResolvedValue({
          id: 'event-123',
          orgId: mockOrgId,
          orderId: mockOrderId,
          eventCode: 'FULFILLMENT_STARTED',
          eventType: 'status_change',
          statusAfter: 'PREPARATION',
          actorUserId: mockActorUserId,
          createdAt: '2025-01-20T10:00:00Z'
        });

      const result = await fulfillmentService.startFulfillment(
        mockOrderId,
        mockOrgId,
        mockActorUserId,
        options
      );

      expect(getMilestonesSpy).toHaveBeenCalledWith(mockOrderId, mockOrgId);
      expect(createEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        orgId: mockOrgId,
        orderId: mockOrderId,
        eventCode: 'FULFILLMENT_STARTED',
        eventType: 'status_change',
        statusAfter: 'PREPARATION',
        actorUserId: mockActorUserId
      }));
      expect(result.success).toBe(true);
      expect(result.fulfillmentStatus).toBeDefined();
    });

    it('should fail if fulfillment already started', async () => {
      const mockExistingMilestones = [
        { id: 'milestone-1', milestone_code: 'ORDER_CONFIRMED' }
      ];

      const getMilestonesSpy = vi.spyOn(fulfillmentService, 'getFulfillmentMilestones')
        .mockResolvedValue(mockExistingMilestones);

      const result = await fulfillmentService.startFulfillment(
        mockOrderId,
        mockOrgId,
        mockActorUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fulfillment already started for this order');
    });

    it('should fail if order not found', async () => {
      const getMilestonesSpy = vi.spyOn(fulfillmentService, 'getFulfillmentMilestones')
        .mockResolvedValue([]);

      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await fulfillmentService.startFulfillment(
        mockOrderId,
        mockOrgId,
        mockActorUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });
  });

  describe('performQualityCheck', () => {
    const mockQualityCheckData: CreateQualityCheckType = {
      orgId: 'org-123',
      orderId: 'order-123',
      orderItemId: 'order-item-123',
      checkedBy: 'qc-inspector-123',
      checkType: 'final_inspection',
      checkCriteria: {
        dimensions: { status: 'pass', notes: 'Within tolerance' },
        color: { status: 'pass', notes: 'Color matches specification' },
        material: { status: 'pass', notes: 'Material quality approved' }
      },
      overallResult: 'pass',
      defectsFound: [],
      notes: 'Product meets all quality standards'
    };

    it('should successfully perform quality check', async () => {
      const mockCreatedQC: QualityCheckType = {
        id: 'qc-123',
        ...mockQualityCheckData,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      // Mock quality check creation
      mockSingle.mockResolvedValueOnce({ data: mockCreatedQC, error: null });

      // Mock createFulfillmentEvent
      const createEventSpy = vi.spyOn(fulfillmentService, 'createFulfillmentEvent')
        .mockResolvedValue({
          id: 'event-123',
          eventCode: 'QUALITY_CHECK_PASSED',
          eventType: 'quality_check'
        } as FulfillmentEventType);

      // Mock milestone update
      const updateMilestoneSpy = vi.spyOn(fulfillmentService, 'updateFulfillmentMilestone')
        .mockResolvedValue({
          id: 'milestone-123',
          milestoneCode: 'QUALITY_APPROVED',
          status: 'completed'
        } as any);

      const result = await fulfillmentService.performQualityCheck(
        mockQualityCheckData,
        'actor-123'
      );

      expect(createEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        eventCode: 'QUALITY_CHECK_PASSED',
        eventType: 'quality_check',
        payload: expect.objectContaining({
          check_type: mockQualityCheckData.checkType,
          overall_result: mockQualityCheckData.overallResult
        })
      }));

      expect(updateMilestoneSpy).toHaveBeenCalledWith(
        'QUALITY_APPROVED',
        mockQualityCheckData.orderId,
        mockQualityCheckData.orgId,
        'completed',
        'actor-123'
      );

      expect(result).toEqual(mockCreatedQC);
    });

    it('should handle failed quality check', async () => {
      const failedQCData: CreateQualityCheckType = {
        ...mockQualityCheckData,
        overallResult: 'fail',
        defectsFound: [
          { type: 'dimension', severity: 'major', description: 'Size is off specification' }
        ],
        notes: 'Product requires rework'
      };

      const mockFailedQC: QualityCheckType = {
        id: 'qc-456',
        ...failedQCData,
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      mockSingle.mockResolvedValueOnce({ data: mockFailedQC, error: null });

      const createEventSpy = vi.spyOn(fulfillmentService, 'createFulfillmentEvent')
        .mockResolvedValue({
          id: 'event-456',
          eventCode: 'QUALITY_CHECK_FAILED',
          eventType: 'quality_check'
        } as FulfillmentEventType);

      const result = await fulfillmentService.performQualityCheck(
        failedQCData,
        'actor-123'
      );

      expect(createEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        eventCode: 'QUALITY_CHECK_FAILED',
        eventType: 'quality_check',
        payload: expect.objectContaining({
          overall_result: 'fail',
          defects_found: failedQCData.defectsFound
        })
      }));

      expect(result).toEqual(mockFailedQC);
    });
  });

  describe('createShipment', () => {
    const mockShippingData: CreateShippingInfoType = {
      orgId: 'org-123',
      orderId: 'order-123',
      carrier: 'FedEx',
      trackingNumber: 'FX123456789',
      shippingMethod: 'Ground',
      estimatedDeliveryDate: '2025-01-25',
      shippingCost: 15.50,
      shippingAddress: {
        name: 'John Doe',
        line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US'
      },
      packageDimensions: {
        length: 12,
        width: 8,
        height: 6,
        weight: 2.5
      },
      specialInstructions: 'Signature required'
    };

    it('should successfully create shipment', async () => {
      const mockCreatedShipping: ShippingInfoType = {
        id: 'shipping-123',
        ...mockShippingData,
        shipmentNumber: 'SHIP-2025-001',
        statusCode: 'shipped',
        shippedAt: '2025-01-20T10:00:00Z',
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      };

      // Mock shipping info creation
      mockSingle.mockResolvedValueOnce({ data: mockCreatedShipping, error: null });

      // Mock createFulfillmentEvent
      const createEventSpy = vi.spyOn(fulfillmentService, 'createFulfillmentEvent')
        .mockResolvedValue({
          id: 'event-123',
          eventCode: 'SHIPPED',
          eventType: 'shipment'
        } as FulfillmentEventType);

      // Mock milestone update
      const updateMilestoneSpy = vi.spyOn(fulfillmentService, 'updateFulfillmentMilestone')
        .mockResolvedValue({
          id: 'milestone-123',
          milestoneCode: 'SHIPPED',
          status: 'completed'
        } as any);

      const result = await fulfillmentService.createShipment(
        mockShippingData,
        'actor-123'
      );

      expect(createEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        eventCode: 'SHIPPED',
        eventType: 'shipment',
        payload: expect.objectContaining({
          tracking_number: mockShippingData.trackingNumber,
          carrier: mockShippingData.carrier,
          shipping_method: mockShippingData.shippingMethod
        })
      }));

      expect(updateMilestoneSpy).toHaveBeenCalledWith(
        'SHIPPED',
        mockShippingData.orderId,
        mockShippingData.orgId,
        'completed',
        'actor-123'
      );

      expect(result).toEqual(mockCreatedShipping);
    });

    it('should handle shipping creation errors', async () => {
      const error = new Error('Carrier API error');
      mockSingle.mockResolvedValueOnce({ data: null, error });

      await expect(
        fulfillmentService.createShipment(mockShippingData, 'actor-123')
      ).rejects.toThrow('Failed to create shipment: Carrier API error');
    });
  });

  describe('markDelivered', () => {
    const mockOrderId = 'order-123';
    const mockOrgId = 'org-123';
    const mockDeliveryData = {
      deliveredAt: '2025-01-25T14:30:00Z',
      deliveredTo: 'John Doe',
      deliveryNotes: 'Package delivered to front door',
      signatureRequired: true,
      signatureObtained: true,
      deliveryPhoto: 'https://example.com/delivery-photo.jpg'
    };

    it('should successfully mark order as delivered', async () => {
      const mockShippingInfo = {
        id: 'shipping-123',
        order_id: mockOrderId,
        org_id: mockOrgId,
        status_code: 'shipped',
        tracking_number: 'FX123456789'
      };

      const mockUpdatedShipping = {
        ...mockShippingInfo,
        status_code: 'delivered',
        delivered_at: mockDeliveryData.deliveredAt,
        delivered_to: mockDeliveryData.deliveredTo,
        delivery_notes: mockDeliveryData.deliveryNotes
      };

      // Mock shipping info lookup
      mockSingle.mockResolvedValueOnce({ data: mockShippingInfo, error: null });

      // Mock shipping info update
      mockSingle.mockResolvedValueOnce({ data: mockUpdatedShipping, error: null });

      // Mock createFulfillmentEvent
      const createEventSpy = vi.spyOn(fulfillmentService, 'createFulfillmentEvent')
        .mockResolvedValue({
          id: 'event-123',
          eventCode: 'DELIVERED',
          eventType: 'delivery'
        } as FulfillmentEventType);

      // Mock milestone update
      const updateMilestoneSpy = vi.spyOn(fulfillmentService, 'updateFulfillmentMilestone')
        .mockResolvedValue({
          id: 'milestone-123',
          milestoneCode: 'DELIVERED',
          status: 'completed'
        } as any);

      const result = await fulfillmentService.markDelivered(
        mockOrderId,
        mockOrgId,
        'actor-123',
        mockDeliveryData
      );

      expect(createEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        eventCode: 'DELIVERED',
        eventType: 'delivery',
        payload: expect.objectContaining({
          delivered_at: mockDeliveryData.deliveredAt,
          delivered_to: mockDeliveryData.deliveredTo,
          delivery_notes: mockDeliveryData.deliveryNotes
        })
      }));

      expect(updateMilestoneSpy).toHaveBeenCalledWith(
        'DELIVERED',
        mockOrderId,
        mockOrgId,
        'completed',
        'actor-123'
      );

      expect(result.success).toBe(true);
      expect(result.shippingInfo).toEqual(mockUpdatedShipping);
    });

    it('should fail if no shipping info found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await fulfillmentService.markDelivered(
        mockOrderId,
        mockOrgId,
        'actor-123',
        mockDeliveryData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No shipping information found for this order');
    });
  });

  describe('completeOrder', () => {
    const mockOrderId = 'order-123';
    const mockOrgId = 'org-123';
    const mockCompletionData: CreateCompletionRecordType = {
      orgId: mockOrgId,
      orderId: mockOrderId,
      completedBy: 'fulfillment-manager-123',
      completionType: 'standard',
      finalNotes: 'Order completed successfully',
      customerSatisfactionScore: 5,
      qualityScore: 5,
      deliveryPerformance: 'on_time'
    };

    it('should successfully complete order', async () => {
      const mockCompletionRecord = {
        id: 'completion-123',
        ...mockCompletionData,
        completedAt: '2025-01-25T15:00:00Z',
        createdAt: '2025-01-25T15:00:00Z'
      };

      // Mock completion record creation
      mockSingle.mockResolvedValueOnce({ data: mockCompletionRecord, error: null });

      // Mock createFulfillmentEvent
      const createEventSpy = vi.spyOn(fulfillmentService, 'createFulfillmentEvent')
        .mockResolvedValue({
          id: 'event-123',
          eventCode: 'COMPLETED',
          eventType: 'completion'
        } as FulfillmentEventType);

      // Mock order status update
      const updateOrderStatusSpy = vi.spyOn(fulfillmentService, 'updateOrderFulfillmentStatus')
        .mockResolvedValue({
          id: mockOrderId,
          fulfillment_status: 'COMPLETED'
        } as any);

      // Mock analytics update
      const updateAnalyticsSpy = vi.spyOn(fulfillmentService, 'updateCompletionAnalytics')
        .mockResolvedValue(undefined);

      const result = await fulfillmentService.completeOrder(
        mockCompletionData,
        'actor-123'
      );

      expect(createEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        eventCode: 'COMPLETED',
        eventType: 'completion',
        payload: expect.objectContaining({
          completion_type: mockCompletionData.completionType,
          customer_satisfaction_score: mockCompletionData.customerSatisfactionScore,
          quality_score: mockCompletionData.qualityScore
        })
      }));

      expect(updateOrderStatusSpy).toHaveBeenCalledWith(
        mockOrderId,
        mockOrgId,
        'COMPLETED'
      );

      expect(updateAnalyticsSpy).toHaveBeenCalledWith(
        mockOrderId,
        mockOrgId,
        mockCompletionRecord
      );

      expect(result).toEqual(mockCompletionRecord);
    });

    it('should handle completion errors', async () => {
      const error = new Error('Database error');
      mockSingle.mockResolvedValueOnce({ data: null, error });

      await expect(
        fulfillmentService.completeOrder(mockCompletionData, 'actor-123')
      ).rejects.toThrow('Failed to complete order: Database error');
    });
  });

  describe('getFulfillmentStatus', () => {
    const mockOrderId = 'order-123';
    const mockOrgId = 'org-123';

    it('should return comprehensive fulfillment status', async () => {
      const mockMilestones = [
        { milestone_code: 'ORDER_CONFIRMED', status: 'completed', completed_at: '2025-01-20T10:00:00Z' },
        { milestone_code: 'PRODUCTION_COMPLETED', status: 'completed', completed_at: '2025-01-22T14:00:00Z' },
        { milestone_code: 'QUALITY_APPROVED', status: 'completed', completed_at: '2025-01-22T16:00:00Z' },
        { milestone_code: 'READY_TO_SHIP', status: 'in_progress', completed_at: null },
        { milestone_code: 'SHIPPED', status: 'pending', completed_at: null },
        { milestone_code: 'DELIVERED', status: 'pending', completed_at: null }
      ];

      const mockEvents = [
        { event_code: 'FULFILLMENT_STARTED', created_at: '2025-01-20T10:00:00Z' },
        { event_code: 'QUALITY_CHECK_PASSED', created_at: '2025-01-22T16:00:00Z' }
      ];

      const mockShippingInfo = {
        id: 'shipping-123',
        tracking_number: 'FX123456789',
        carrier: 'FedEx',
        status_code: 'processing'
      };

      // Mock getMilestones
      const getMilestonesSpy = vi.spyOn(fulfillmentService, 'getFulfillmentMilestones')
        .mockResolvedValue(mockMilestones);

      // Mock getEvents
      const getEventsSpy = vi.spyOn(fulfillmentService, 'getFulfillmentEvents')
        .mockResolvedValue(mockEvents);

      // Mock getShippingInfo
      const getShippingSpy = vi.spyOn(fulfillmentService, 'getShippingInfo')
        .mockResolvedValue(mockShippingInfo);

      const result = await fulfillmentService.getFulfillmentStatus(mockOrderId, mockOrgId);

      expect(result).toEqual({
        orderId: mockOrderId,
        currentStatus: 'PACKAGING',
        progressPercentage: expect.any(Number),
        milestones: mockMilestones,
        events: mockEvents,
        shippingInfo: mockShippingInfo,
        estimatedCompletion: expect.any(String),
        nextMilestone: 'READY_TO_SHIP'
      });
    });

    it('should handle orders with no fulfillment data', async () => {
      const getMilestonesSpy = vi.spyOn(fulfillmentService, 'getFulfillmentMilestones')
        .mockResolvedValue([]);
      const getEventsSpy = vi.spyOn(fulfillmentService, 'getFulfillmentEvents')
        .mockResolvedValue([]);
      const getShippingSpy = vi.spyOn(fulfillmentService, 'getShippingInfo')
        .mockResolvedValue(null);

      const result = await fulfillmentService.getFulfillmentStatus(mockOrderId, mockOrgId);

      expect(result).toEqual({
        orderId: mockOrderId,
        currentStatus: 'NOT_STARTED',
        progressPercentage: 0,
        milestones: [],
        events: [],
        shippingInfo: null,
        estimatedCompletion: null,
        nextMilestone: 'ORDER_CONFIRMED'
      });
    });
  });

  describe('Status Transition Logic', () => {
    describe('canTransitionStatus', () => {
      it('should validate correct status transitions', () => {
        const canTransition = vi.mocked(require('@shared/dtos/FulfillmentDTO').canTransitionFulfillmentStatus);
        
        expect(canTransition('PREPARATION', 'PRODUCTION')).toBe(true);
        expect(canTransition('PRODUCTION', 'QUALITY_CONTROL')).toBe(true);
        expect(canTransition('QUALITY_CONTROL', 'PACKAGING')).toBe(true);
        expect(canTransition('PACKAGING', 'READY_TO_SHIP')).toBe(true);
        expect(canTransition('READY_TO_SHIP', 'SHIPPED')).toBe(true);
        expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
        expect(canTransition('DELIVERED', 'COMPLETED')).toBe(true);
      });

      it('should reject invalid status transitions', () => {
        const canTransition = vi.mocked(require('@shared/dtos/FulfillmentDTO').canTransitionFulfillmentStatus);
        
        expect(canTransition('PREPARATION', 'SHIPPED')).toBe(false);
        expect(canTransition('COMPLETED', 'PRODUCTION')).toBe(false);
        expect(canTransition('CANCELLED', 'PREPARATION')).toBe(false);
      });
    });
  });
});