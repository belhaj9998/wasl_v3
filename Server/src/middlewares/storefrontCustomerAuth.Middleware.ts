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
 */
export const requireCustomerAuth = async (
  req: StorefrontRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(AppError.unauthorized("Authentication required"));
  }

  let decoded: CustomerJwtPayload;
  try {
    decoded = jwt.verify(token, config.customerJwtSecret) as CustomerJwtPayload;
  } catch {
    return next(AppError.unauthorized("Invalid or expired token"));
  }

  if (!req.store || decoded.storeId !== req.store.id) {
    return next(AppError.unauthorized("Cross-store access denied"));
  }

  const customer = await prisma.customer.findUnique({
    where: { id: decoded.customerId },
    select: { id: true, phone: true, store_id: true, status: true },
  });

  if (!customer || customer.status === "ARCHIVED") {
    return next(AppError.unauthorized("Account is inactive"));
  }

  req.customer = {
    customerId: customer.id,
    phone: customer.phone ?? decoded.phone,
    store_id: customer.store_id,
  };

  next();
};
