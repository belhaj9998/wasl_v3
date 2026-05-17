import { Response, NextFunction } from "express";
import prisma from "../configs/prisma";
import { AppRequest } from "../types";
import { AppError } from "../utils/AppError";
import { SubscriptionStatus } from "../../generated/prisma";

export const verifyStoreSubscriptionAccess = async (
  req: AppRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.storeId) {
      return next(AppError.badRequest("Store context has not been resolved"));
    }

    const subscription = await prisma.storeSubscription.findUnique({
      where: { store_id: req.storeId },
      select: {
        status: true,
        trial_ends_at: true,
        current_period_ends_at: true,
      },
    });

    if (!subscription) {
      return next(AppError.forbidden("Store subscription is required"));
    }

    const now = new Date();

    if (
      subscription.status === SubscriptionStatus.CANCELED ||
      subscription.status === SubscriptionStatus.EXPIRED ||
      subscription.status === SubscriptionStatus.PAST_DUE
    ) {
      return next(AppError.forbidden("Store subscription is not active"));
    }

    if (subscription.status === SubscriptionStatus.TRIALING) {
      const trialEndsAt =
        subscription.trial_ends_at ?? subscription.current_period_ends_at;

      if (!trialEndsAt || trialEndsAt <= now) {
        return next(AppError.forbidden("Store trial period has expired"));
      }
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      if (
        !subscription.current_period_ends_at ||
        subscription.current_period_ends_at <= now
      ) {
        return next(AppError.forbidden("Store subscription period has expired"));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};