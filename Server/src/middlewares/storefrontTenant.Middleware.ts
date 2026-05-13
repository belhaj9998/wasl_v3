import { Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import prisma from "../configs/prisma";
import { StorefrontRequest } from "../types/storefront.types";
import { AppError } from "../utils/AppError";
import { StoreStatus } from "../../generated/prisma";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604800
const SESSION_COOKIE_NAME = "storefront_session";

/**
 * Storefront Tenant Middleware
 *
 * Resolves store context from the `:domain` route parameter.
 * - Queries store by `domain` or `custom_domain` (case-insensitive)
 * - Rejects deleted stores with 404
 * - Rejects DRAFT / SUSPENDED / ARCHIVED stores with 403
 * - Attaches store context to `req.store`
 * - Manages session cookie for guest cart identification
 */
export const storefrontTenantMiddleware = async (
  req: StorefrontRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const domain = req.params.domain;

    if (!domain || typeof domain !== "string") {
      return next(AppError.badRequest("Domain parameter is required"));
    }

    const domainLower = domain.toLowerCase();

    // Query store by domain or custom_domain (case-insensitive), excluding soft-deleted
    const store = await prisma.store.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { domain: { equals: domainLower, mode: "insensitive" } },
          { custom_domain: { equals: domainLower, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        domain: true,
        currency_code: true,
        locale: true,
        status: true,
      },
    });

    // 404 if store not found or deleted
    if (!store) {
      return next(AppError.notFound("Store not found"));
    }

    // 403 if store is not active (DRAFT, SUSPENDED, or ARCHIVED)
    const unavailableStatuses: StoreStatus[] = [
      StoreStatus.DRAFT,
      StoreStatus.SUSPENDED,
      StoreStatus.ARCHIVED,
    ];

    if (unavailableStatuses.includes(store.status)) {
      return next(AppError.forbidden("Store is currently unavailable"));
    }

    // Attach store context to request
    req.store = {
      id: store.id,
      name: store.name,
      domain: store.domain,
      currency_code: store.currency_code,
      locale: store.locale,
      status: store.status,
    };

    // Session management: read or generate session ID
    let sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: SEVEN_DAYS_SECONDS * 1000, // Express expects milliseconds
      });
    }

    req.sessionId = sessionId;

    next();
  } catch (error) {
    next(error);
  }
};
