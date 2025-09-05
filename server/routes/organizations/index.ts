// Consolidated organization routes - canonical implementation
import { Router } from "express";
import hardenedRouter from "./hardened.js";
import assetsRouter from "./assets.js";

const router = Router();

// Mount unified assets router first (more specific routes)
router.use("/", assetsRouter);

// Use hardened implementation for all other organization routes
router.use("/", hardenedRouter);

export default router;
