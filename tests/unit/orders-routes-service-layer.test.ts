import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import ordersRouter from '../../server/routes/orders/index';
import { listOrders, getOrderById, updateOrder } from '../../server/services/supabase/orders';
import { listOrderItems } from '../../server/services/supabase/orderItems';

// Mock the services
vi.mock('../../server/services/supabase/orders');
vi.mock('../../server/services/supabase/orderItems');

const mockListOrders = vi.mocked(listOrders);
const mockGetOrderById = vi.mocked(getOrderById);
const mockUpdateOrder = vi.mocked(updateOrder);
const mockListOrderItems = vi.mocked(listOrderItems);

describe('Orders Routes - Service Layer Integration', () => {
  let app: express.Application;
  const mockOrgId = 'test-org-123';
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      (req as any).user = {
        id: mockUserId,
        organization_id: mockOrgId,
        email: 'test@example.com'
      };
      next();
    });

    app.use('/api/orders', ordersRouter);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('GET /api/orders/stats', () => {
    it('should use listOrders service and aggregate stats in code', async () => {
      // Mock service response
      const mockOrders = [
        { 
          id: '1', org_id: mockOrgId, customer_id: 'cust-1', salesperson_id: null, sport_id: null,
          code: 'ORD-001', customer_contact_name: 'Test Customer', customer_contact_email: null,
          status_code: 'pending', total_amount: 100, total_items: 1, priority: 5,
          created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z', due_date: '2024-02-01T10:00:00Z'
        },
        { 
          id: '2', org_id: mockOrgId, customer_id: 'cust-2', salesperson_id: null, sport_id: null,
          code: 'ORD-002', customer_contact_name: 'Test Customer 2', customer_contact_email: null,
          status_code: 'completed', total_amount: 200, total_items: 2, priority: 5,
          created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', due_date: null
        },
        { 
          id: '3', org_id: mockOrgId, customer_id: 'cust-3', salesperson_id: null, sport_id: null,
          code: 'ORD-003', customer_contact_name: 'Test Customer 3', customer_contact_email: null,
          status_code: 'cancelled', total_amount: 150, total_items: 1, priority: 5,
          created_at: '2024-01-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z', due_date: '2024-01-05T10:00:00Z'
        }
      ];
      
      mockListOrders.mockResolvedValue({ data: mockOrders, error: null });

      const response = await request(app)
        .get('/api/orders/stats')
        .expect(200);

      // Verify service was called with correct org_id
      expect(mockListOrders).toHaveBeenCalledWith({ org_id: mockOrgId });
      
      // Verify response contains aggregated stats
      expect(response.body.data).toMatchObject({
        totalOrders: 3,
        activeOrders: 1, // only pending orders are active
        completedThisMonth: expect.any(Number),
        overdueOrders: expect.any(Number)
      });
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should use getOrderById and updateOrder services with tenant scoping', async () => {
      const orderId = 'order-123';
      const newStatus = 'completed';
      
      // Mock service responses
      const mockOrder = {
        id: orderId, org_id: mockOrgId, customer_id: 'cust-1', salesperson_id: null, sport_id: null,
        code: 'ORD-001', customer_contact_name: 'Test Customer', customer_contact_email: null,
        status_code: 'pending', total_amount: 100, total_items: 1, priority: 5,
        created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z', due_date: '2024-02-01T10:00:00Z'
      };
      const mockUpdatedOrder = { ...mockOrder, status_code: newStatus };
      
      mockGetOrderById.mockResolvedValue({ data: mockOrder, error: null });
      mockUpdateOrder.mockResolvedValue({ data: mockUpdatedOrder, error: null });

      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .send({ statusCode: newStatus })
        .expect(200);

      // Verify tenant scoping check
      expect(mockGetOrderById).toHaveBeenCalledWith(orderId, mockOrgId);
      
      // Verify update service was called
      expect(mockUpdateOrder).toHaveBeenCalledWith(orderId, { status_code: newStatus });
      
      // Verify response
      expect(response.body.data).toMatchObject({
        id: orderId,
        status_code: newStatus
      });
    });
  });

  describe('GET /api/orders/:id/items', () => {
    it('should use listOrderItems service with tenant scoping', async () => {
      const orderId = 'order-123';
      const mockItems = [
        { 
          id: 'item-1', org_id: mockOrgId, order_id: orderId, product_id: null, variant_id: null,
          name: 'Item 1', description: null, quantity: 1, unit_price: 50, total_price: 50,
          status_code: 'pending', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z',
          customizations_json: null, size_chart_json: null
        },
        { 
          id: 'item-2', org_id: mockOrgId, order_id: orderId, product_id: null, variant_id: null,
          name: 'Item 2', description: null, quantity: 2, unit_price: 25, total_price: 50,
          status_code: 'pending', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z',
          customizations_json: null, size_chart_json: null
        }
      ];
      
      // Mock service response
      mockListOrderItems.mockResolvedValue({ data: mockItems, error: null });

      const response = await request(app)
        .get(`/api/orders/${orderId}/items`)
        .expect(200);

      // Verify service was called with correct parameters
      expect(mockListOrderItems).toHaveBeenCalledWith({ 
        order_id: orderId, 
        org_id: mockOrgId 
      });
      
      // Verify response
      expect(response.body.data).toEqual(mockItems);
    });
  });
});