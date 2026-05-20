import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../configs/App.config";
import {
  StorefrontRequest,
  CustomerJwtPayload,
} from "../types/storefront.types";

// ========== storefrontOptionalAuth ==========
// Attempts to verify a customer JWT from the Authorization header.
// If valid: attaches req.customer with customerId, phone, and store_id.
// If absent, malformed, invalid, or expired: sets req.customer = undefined.
// NEVER returns an error response or blocks request flow.

export const storefrontOptionalAuth = (
  req: StorefrontRequest,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.customer = undefined;
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      req.customer = undefined;
      return next();
    }

    const decoded = jwt.verify(
      token,
      config.customerJwtSecret,
    ) as CustomerJwtPayload;

    req.customer = {
      customerId: decoded.customerId,
      phone: decoded.phone,
      store_id: decoded.storeId,
    };

    return next();
  } catch {
    req.customer = undefined;
    return next();
  }
};
