import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../configs/prisma";
import { config } from "../configs/App.config";
import { AppError } from "../utils/AppError";
import {
  StorefrontRequest,
  CustomerJwtPayload,
} from "../types/storefront.types";

/**
 * requireCustomerAuth — Middleware that enforces customer JWT authentication.
 * Used for protected customer endpoints (profile, orders, addresses).
 *
 * - Verifies Bearer token is present; returns 401 if missing
 * - Decodes and validates customer JWT; returns 401 if invalid/expired
 * - Verifies store_id in token matches resolved store from domain; returns 401 if mismatch
 * - Checks customer status is not ARCHIVED; returns 401 if inactive
 * - Attaches req.customer with id, email, store_id
 */
export const requireCustomerAuth = async (
  req: StorefrontRequest,
  res: Response,
  next: NextFunction,
) => {
  // 1. Extract Bearer token from Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(AppError.unauthorized("Authentication required"));
  }

  // 2. Decode and validate customer JWT
  let decoded: CustomerJwtPayload;
  try {
    decoded = jwt.verify(token, config.customerJwtSecret) as CustomerJwtPayload;
  } catch {
    return next(AppError.unauthorized("Invalid or expired token"));
  }

  // 3. Verify store_id in token matches resolved store from domain
  if (!req.store || decoded.storeId !== req.store.id) {
    return next(AppError.unauthorized("Cross-store access denied"));
  }

  // 4. Check customer status is not ARCHIVED
  const customer = await prisma.customer.findUnique({
    where: { id: decoded.customerId },
    select: { id: true, email: true, store_id: true, status: true },
  });

  if (!customer || customer.status === "ARCHIVED") {
    return next(AppError.unauthorized("Account is inactive"));
  }

  // 5. Attach customer context to request
  req.customer = {
    customerId: customer.id,
    email: customer.email ?? decoded.email,
    store_id: customer.store_id,
  };

  next();
};
