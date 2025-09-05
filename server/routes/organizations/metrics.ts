import { Router } from 'express';

const router = Router();

// Test endpoint to verify routing works
router.get('/:id/test-data', (req, res) => {
  console.log('=== TEST ROUTE HIT ===', req.params.id);
  
  res.json({
    success: true,
    message: 'Test route works!',
    orgId: req.params.id
  });
});

// GET organization metrics/KPIs
router.get('/:id/metrics', (req, res) => {
  console.log('=== METRICS ROUTE HIT ===', req.params.id);
  
  res.json({
    success: true,
    data: {
      totalRevenue: 24500,
      totalOrders: 127,
      activeSports: 5,
      yearsWithRichHabits: 3,
      averageOrderValue: 193,
      repeatCustomerRate: 68,
      growthRate: 24,
      satisfactionScore: 4.8
    }
  });
});

export default router;