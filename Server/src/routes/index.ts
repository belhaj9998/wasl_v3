import { Router, Request, Response } from "express";
import prisma from "../configs/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import authRoutes from "./auth.routes";
import platformRoutes from "./platform.routes";
import storeAdminRoutes from "./storeAdmin.routes";
import catalogRoutes from "./catalog.routes";
import orderRoutes from "./order.routes";
import orderTagRoutes from "./orderTag.routes";
import storefrontRoutes from "./storefront.routes";
import uploadRoutes from "./upload.routes";
import webhookRoutes from "./webhook.routes";

const router = Router();

// Health check endpoint — no auth required
router.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    sendError(
      res,
      { status: "unhealthy", error: message },
      "Health check failed",
      503,
    );
  }
});

// Webhook routes — use their own raw body middleware per-route (no global JSON parsing needed)
router.use("/api/webhooks", webhookRoutes);

// Route groups
router.use("/api/auth", authRoutes);
router.use("/api/platform", platformRoutes);
router.use("/api/stores/:storeId", storeAdminRoutes);
router.use("/api/stores/:storeId", catalogRoutes);
router.use("/api/stores/:storeId", orderRoutes);
router.use("/api/stores/:storeId", orderTagRoutes);
router.use("/api/stores/:domain", Router());

// Upload routes — require authentication and store context
router.use("/api/upload", uploadRoutes);

// Storefront (customer-facing) routes — separate from admin routes
router.use("/api/storefront", storefrontRoutes);

// Catch-all 404 handler for unmatched routes
router.use((_req: Request, res: Response) => {
  sendError(
    res,
    "Not found",
    `Route ${_req.method} ${_req.originalUrl} not found`,
    404,
  );
});

export default router;
