import { Response, NextFunction } from "express";
import prisma from "../configs/prisma";
import { AppError } from "../utils/AppError";
import { StorefrontRequest } from "../types/storefront.types";
import { SubscriptionStatus } from "../../generated/prisma";

export const verifyStorefrontSubscriptionAccess = async (
  req: StorefrontRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.store?.id) {
      return next(AppError.badRequest("Store context has not been resolved"));
    }

    const subscription = await prisma.storeSubscription.findUnique({
      where: {
        store_id: req.store.id,
      },
      select: {
        status: true,
        trial_ends_at: true,
        current_period_ends_at: true,
      },
    });

    if (!subscription) {
      return next(AppError.forbidden("Store is temporarily unavailable"));
    }

    const now = new Date();

    if (
      subscription.status === SubscriptionStatus.CANCELED ||
      subscription.status === SubscriptionStatus.EXPIRED ||
      subscription.status === SubscriptionStatus.PAST_DUE
    ) {
      return next(AppError.forbidden("Store is temporarily unavailable"));
    }

    if (subscription.status === SubscriptionStatus.TRIALING) {
      const trialEndsAt =
        subscription.trial_ends_at ?? subscription.current_period_ends_at;

      if (!trialEndsAt || trialEndsAt <= now) {
        return next(AppError.forbidden("Store is temporarily unavailable"));
      }
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      if (
        !subscription.current_period_ends_at ||
        subscription.current_period_ends_at <= now
      ) {
        return next(AppError.forbidden("Store is temporarily unavailable"));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};