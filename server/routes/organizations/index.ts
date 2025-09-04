// Consolidated organization routes - canonical implementation
import { Router } from "express";
import hardenedRouter from "./hardened.js";

const router = Router();

// Use only the hardened implementation for all organization routes
router.use("/", hardenedRouter);

export default router;
