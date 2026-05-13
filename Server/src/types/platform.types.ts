import { StoreStatus, SubscriptionStatus } from "../../generated/prisma";

export interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  activeStores: number;
  totalSubscriptions: number;
}

export interface RevenueData {
  monthlyRevenue: number;
}

export interface GrowthMetric {
  month: string; // YYYY-MM format
  count: number;
}

/**
 * Valid store status transitions.
 * DRAFT → ACTIVE
 * ACTIVE → SUSPENDED, ARCHIVED
 * SUSPENDED → ACTIVE, ARCHIVED
 * ARCHIVED → (none)
 */
export const VALID_STORE_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  DRAFT: [StoreStatus.ACTIVE],
  ACTIVE: [StoreStatus.SUSPENDED, StoreStatus.ARCHIVED],
  SUSPENDED: [StoreStatus.ACTIVE, StoreStatus.ARCHIVED],
  ARCHIVED: [],
};

/**
 * Valid subscription status transitions.
 * TRIALING → ACTIVE, CANCELED
 * ACTIVE → PAST_DUE, CANCELED
 * PAST_DUE → ACTIVE, EXPIRED
 * CANCELED → ACTIVE
 * EXPIRED → (none)
 */
export const VALID_SUBSCRIPTION_TRANSITIONS: Record<
  SubscriptionStatus,
  SubscriptionStatus[]
> = {
  TRIALING: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED],
  ACTIVE: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED],
  PAST_DUE: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
  CANCELED: [SubscriptionStatus.ACTIVE],
  EXPIRED: [],
};
