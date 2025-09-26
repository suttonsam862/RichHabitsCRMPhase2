import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../server/db';
import { 
  createTestUser, 
  createTestOrganization, 
  cleanupTestData,
  getAuthToken 
} from '../helpers/test-setup';

// Import route modules
import ordersRouter from '../../server/routes/orders/index';
import designJobsRouter from '../../server/routes/design-jobs/index';
import workOrdersRouter from '../../server/routes/work-orders/index';
import purchaseOrdersRouter from '../../server/routes/purchase-orders/index';
import fulfillmentRouter from '../../server/routes/fulfillment/index';

describe('Order Workflow Integration Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testOrg: any;
  let authToken: string;
  let designer: any;
  let manufacturer: any;
  let fulfillmentManager: any;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Add auth middleware mock
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        if (token === authToken && testUser) {
          (req as any).user = {
            id: testUser.id,
            email: testUser.email,
            organization_id: testOrg.id,
            role: testUser.role,
            is_super_admin: false
          };
        }
      }
      next();
    });

    // Mount routes
    app.use('/api/orders', ordersRouter);
    app.use('/api/design-jobs', designJobsRouter);
    app.use('/api/work-orders', workOrdersRouter);
    app.use('/api/purchase-orders', purchaseOrdersRouter);
    app.use('/api/fulfillment', fulfillmentRouter);

    // Create test users with different roles
    testUser = await createTestUser({
      email: 'workflow-admin@example.com',
      fullName: 'Workflow Admin',
      role: 'admin'
    });

    testOrg = await createTestOrganization({
      name: 'Workflow Test Org',
      ownerId: testUser.id
    });

    designer = await createTestUser({
      email: 'designer@example.com',
      fullName: 'Test Designer',
      role: 'member',
      organizationId: testOrg.id
    });

    manufacturer = await createTestUser({
      email: 'manufacturer@example.com',
      fullName: 'Test Manufacturer',
      role: 'member',
      organizationId: testOrg.id
    });

    fulfillmentManager = await createTestUser({
      email: 'fulfillment@example.com',
      fullName: 'Fulfillment Manager',
      role: 'member',
      organizationId: testOrg.id
    });

    authToken = await getAuthToken(testUser.id);

    // Create test catalog item and manufacturer
    await db.execute(`
      INSERT INTO catalog_items (id, org_id, name, sport_id, base_price, turnaround_days, moq)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['cat-item-workflow', testOrg.id, 'Workflow Test Product', 'sport-123', 50.00, 14, 10]);

    await db.execute(`
      INSERT INTO manufacturers (id, org_id, name, email, specialties, capabilities)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'mfg-workflow', 
      testOrg.id, 
      'Test Manufacturer', 
      'mfg@example.com',
      JSON.stringify(['apparel', 'accessories']),
      JSON.stringify(['embroidery', 'screen_printing'])
    ]);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Complete Order Lifecycle', () => {
    let orderId: string;
    let designJobId: string;
    let workOrderId: string;
    let purchaseOrderId: string;
    let fulfillmentId: string;

    it('Step 1: Create initial order', async () => {
      const orderData = {
        customerName: 'Workflow Test Customer',
        customerEmail: 'customer@example.com',
        customerPhone: '+1234567890',
        totalAmount: 500.00,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            productId: 'cat-item-workflow',
            quantity: 10,
            unitPrice: 50.00,
            totalPrice: 500.00,
            customizations: {
              size: 'Large',
              color: 'Blue',
              logo: 'Company Logo'
            }
          }
        ],
        notes: 'Complete workflow test order'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status || response.body.data.statusCode).toBe('draft');
      
      orderId = response.body.data.id;
      expect(orderId).toBeDefined();
    });

    it('Step 2: Transition order to pending', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'pending' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status || response.body.data.statusCode).toBe('pending');
    });

    it('Step 3: Confirm order and create design job', async () => {
      // Confirm order
      const confirmResponse = await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(confirmResponse.body.data.status || confirmResponse.body.data.statusCode).toBe('confirmed');

      // Create design job
      const designJobData = {
        orderId: orderId,
        designerId: designer.id,
        priority: 'high',
        requirements: {
          designType: 'logo_placement',
          specifications: 'Place company logo on front chest',
          colors: ['blue', 'white'],
          dimensions: { width: 4, height: 3, unit: 'inches' }
        },
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Rush job for important client'
      };

      const designResponse = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(designJobData)
        .expect(201);

      expect(designResponse.body.success).toBe(true);
      expect(designResponse.body.data.status || designResponse.body.data.statusCode).toBe('pending_design');
      
      designJobId = designResponse.body.data.id;
    });

    it('Step 4: Progress design job through workflow', async () => {
      // Start design work
      const startResponse = await request(app)
        .patch(`/api/design-jobs/${designJobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'design_in_progress',
          notes: 'Started working on logo placement design'
        })
        .expect(200);

      expect(startResponse.body.data.status || startResponse.body.data.statusCode).toBe('design_in_progress');

      // Submit design for approval
      const submitResponse = await request(app)
        .patch(`/api/design-jobs/${designJobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'pending_approval',
          designFileUrls: ['https://example.com/design-v1.pdf'],
          notes: 'Design completed, ready for client approval'
        })
        .expect(200);

      expect(submitResponse.body.data.status || submitResponse.body.data.statusCode).toBe('pending_approval');

      // Approve design
      const approveResponse = await request(app)
        .patch(`/api/design-jobs/${designJobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'approved',
          approvedBy: testUser.id,
          approvalNotes: 'Design approved by client'
        })
        .expect(200);

      expect(approveResponse.body.data.status || approveResponse.body.data.statusCode).toBe('approved');
    });

    it('Step 5: Create work order for manufacturing', async () => {
      const workOrderData = {
        orderId: orderId,
        designJobId: designJobId,
        manufacturerId: 'mfg-workflow',
        priority: 'high',
        productionRequirements: {
          technique: 'embroidery',
          materials: ['cotton_poly_blend', 'embroidery_thread'],
          quality_standards: 'premium',
          special_instructions: 'Use metallic thread for logo'
        },
        targetQuantity: 10,
        unitCost: 25.00,
        totalCost: 250.00,
        estimatedStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Rush order - priority manufacturing'
      };

      const response = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status || response.body.data.statusCode).toBe('pending');
      
      workOrderId = response.body.data.id;
    });

    it('Step 6: Progress work order through manufacturing', async () => {
      // Start production
      const startResponse = await request(app)
        .patch(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'in_progress',
          actualStartDate: new Date().toISOString(),
          notes: 'Production started'
        })
        .expect(200);

      expect(startResponse.body.data.status || startResponse.body.data.statusCode).toBe('in_progress');

      // Complete production
      const completeResponse = await request(app)
        .patch(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'completed',
          actualCompletionDate: new Date().toISOString(),
          actualQuantity: 10,
          actualCost: 250.00,
          qualityCheckPassed: true,
          notes: 'Production completed successfully'
        })
        .expect(200);

      expect(completeResponse.body.data.status || completeResponse.body.data.statusCode).toBe('completed');
    });

    it('Step 7: Create purchase order for materials (if needed)', async () => {
      const purchaseOrderData = {
        supplierId: 'supplier-123',
        workOrderId: workOrderId,
        requestedBy: testUser.id,
        urgency: 'high',
        items: [
          {
            description: 'Embroidery Thread - Metallic Blue',
            quantity: 10,
            unitPrice: 5.00,
            totalPrice: 50.00,
            category: 'materials'
          }
        ],
        totalAmount: 50.00,
        expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Rush order for embroidery materials'
      };

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status || response.body.data.statusCode).toBe('draft');
      
      purchaseOrderId = response.body.data.id;

      // Approve and submit purchase order
      await request(app)
        .patch(`/api/purchase-orders/${purchaseOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'approved' })
        .expect(200);

      await request(app)
        .patch(`/api/purchase-orders/${purchaseOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'submitted' })
        .expect(200);
    });

    it('Step 8: Start fulfillment process', async () => {
      const fulfillmentData = {
        orderId: orderId,
        workOrderId: workOrderId,
        assignedTo: fulfillmentManager.id,
        shippingMethod: 'priority',
        shippingAddress: {
          name: 'Workflow Test Customer',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'TC',
          postalCode: '12345',
          country: 'US'
        },
        packagingRequirements: {
          type: 'standard',
          includeInvoice: true,
          includeReturnLabel: false
        },
        notes: 'Handle with care - rush order'
      };

      const response = await request(app)
        .post('/api/fulfillment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fulfillmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status || response.body.data.statusCode).toBe('preparation');
      
      fulfillmentId = response.body.data.id;
    });

    it('Step 9: Progress fulfillment through completion', async () => {
      // Package items
      const packageResponse = await request(app)
        .patch(`/api/fulfillment/${fulfillmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'packaging',
          notes: 'Items packaged and ready for shipment'
        })
        .expect(200);

      expect(packageResponse.body.data.status || packageResponse.body.data.statusCode).toBe('packaging');

      // Mark ready to ship
      const readyResponse = await request(app)
        .patch(`/api/fulfillment/${fulfillmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'ready_to_ship',
          trackingNumber: 'TRK123456789',
          carrier: 'FedEx',
          notes: 'Package ready for pickup'
        })
        .expect(200);

      expect(readyResponse.body.data.status || readyResponse.body.data.statusCode).toBe('ready_to_ship');

      // Ship package
      const shipResponse = await request(app)
        .patch(`/api/fulfillment/${fulfillmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'shipped',
          shippedAt: new Date().toISOString(),
          trackingUrl: 'https://fedex.com/track/TRK123456789',
          notes: 'Package shipped via FedEx'
        })
        .expect(200);

      expect(shipResponse.body.data.status || shipResponse.body.data.statusCode).toBe('shipped');

      // Mark as delivered
      const deliverResponse = await request(app)
        .patch(`/api/fulfillment/${fulfillmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
          deliveryConfirmation: 'SIGNED',
          notes: 'Package delivered and signed for'
        })
        .expect(200);

      expect(deliverResponse.body.data.status || deliverResponse.body.data.statusCode).toBe('delivered');
    });

    it('Step 10: Complete order workflow', async () => {
      // Update order status to completed
      const response = await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'completed',
          completedAt: new Date().toISOString(),
          notes: 'Order successfully completed - all items delivered'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status || response.body.data.statusCode).toBe('completed');
    });

    it('Step 11: Verify workflow completion and data integrity', async () => {
      // Check order is marked complete
      const orderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderResponse.body.data.status || orderResponse.body.data.statusCode).toBe('completed');

      // Check design job is complete
      const designResponse = await request(app)
        .get(`/api/design-jobs/${designJobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(designResponse.body.data.status || designResponse.body.data.statusCode).toBe('approved');

      // Check work order is complete
      const workResponse = await request(app)
        .get(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(workResponse.body.data.status || workResponse.body.data.statusCode).toBe('completed');

      // Check fulfillment is delivered
      const fulfillmentResponse = await request(app)
        .get(`/api/fulfillment/${fulfillmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(fulfillmentResponse.body.data.status || fulfillmentResponse.body.data.statusCode).toBe('delivered');
    });
  });

  describe('Workflow Error Scenarios', () => {
    it('should handle design job rejection and rework', async () => {
      // Create order and design job
      const order = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Rejection Test Customer',
          totalAmount: 100.00,
          items: [{ productId: 'cat-item-workflow', quantity: 2, unitPrice: 50.00, totalPrice: 100.00 }]
        })
        .expect(201);

      const designJob = await request(app)
        .post('/api/design-jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: order.body.data.id,
          designerId: designer.id,
          requirements: { designType: 'simple_text' },
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      // Submit design for approval
      await request(app)
        .patch(`/api/design-jobs/${designJob.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'pending_approval',
          designFileUrls: ['https://example.com/design-bad.pdf']
        })
        .expect(200);

      // Reject design
      const rejectResponse = await request(app)
        .patch(`/api/design-jobs/${designJob.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'revision_required',
          rejectionReason: 'Colors don\'t match brand guidelines',
          revisionNotes: 'Please use blue and white colors only'
        })
        .expect(200);

      expect(rejectResponse.body.data.status || rejectResponse.body.data.statusCode).toBe('revision_required');
    });

    it('should handle manufacturing delays and updates', async () => {
      // Create work order
      const workOrder = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'order-delay-test',
          manufacturerId: 'mfg-workflow',
          targetQuantity: 5,
          unitCost: 30.00,
          totalCost: 150.00,
          estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      // Report delay
      const delayResponse = await request(app)
        .patch(`/api/work-orders/${workOrder.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'delayed',
          delayReason: 'Material shortage',
          newEstimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Waiting for material delivery - 7 day delay'
        })
        .expect(200);

      expect(delayResponse.body.data.status || delayResponse.body.data.statusCode).toBe('delayed');
    });

    it('should handle fulfillment issues and returns', async () => {
      // Create fulfillment record
      const fulfillment = await request(app)
        .post('/api/fulfillment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'order-return-test',
          assignedTo: fulfillmentManager.id,
          shippingAddress: {
            name: 'Return Test Customer',
            addressLine1: '456 Return St',
            city: 'Return City',
            state: 'RC',
            postalCode: '67890',
            country: 'US'
          }
        })
        .expect(201);

      // Ship and then handle return
      await request(app)
        .patch(`/api/fulfillment/${fulfillment.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped', trackingNumber: 'RET123456' })
        .expect(200);

      const returnResponse = await request(app)
        .patch(`/api/fulfillment/${fulfillment.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          status: 'returned',
          returnReason: 'Defective product',
          returnTrackingNumber: 'RET987654',
          notes: 'Customer reported embroidery defect'
        })
        .expect(200);

      expect(returnResponse.body.data.status || returnResponse.body.data.statusCode).toBe('returned');
    });
  });

  describe('Workflow Performance and Concurrency', () => {
    it('should handle multiple concurrent orders in different workflow stages', async () => {
      const orderPromises = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerName: `Concurrent Customer ${index}`,
            totalAmount: 100.00 + index * 10,
            items: [{
              productId: 'cat-item-workflow',
              quantity: 1,
              unitPrice: 100.00 + index * 10,
              totalPrice: 100.00 + index * 10
            }]
          })
      );

      const orders = await Promise.all(orderPromises);
      
      // All orders should be created successfully
      orders.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.customerName).toBe(`Concurrent Customer ${index}`);
      });

      // Create design jobs for all orders concurrently
      const designPromises = orders.map((order, index) =>
        request(app)
          .post('/api/design-jobs')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            orderId: order.body.data.id,
            designerId: designer.id,
            requirements: { designType: `concurrent_${index}` },
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
      );

      const designJobs = await Promise.all(designPromises);
      
      designJobs.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });
});