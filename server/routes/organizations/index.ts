// Consolidated organization routes - canonical implementation
import { Router } from "express";
import hardenedRouter from "./hardened.js";
import assetsRouter from "./assets.js";
import metricsRouter from "./metrics.js";

const router = Router();

// Mount metrics router FIRST to ensure it gets priority
router.use("/", metricsRouter);

// Mount unified assets router 
router.use("/", assetsRouter);

// Use hardened implementation for all other organization routes
router.use("/", hardenedRouter);

// GET /api/v1/organizations - List organizations with search/filter capabilities
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  console.log('Organizations GET route called with user:', req.user ? { id: req.user.id, email: req.user.email } : 'No user');
});

export default router;