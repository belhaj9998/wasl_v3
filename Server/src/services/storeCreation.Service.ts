import prisma from "../configs/prisma";
import { AppError } from "../utils/AppError";
import { defaultRoleTemplates } from "../constant/constants";
import { BillingCycle, SubscriptionStatus } from "../../generated/prisma";

export interface CreateStoreInput {
  name: string;
  domain: string;
}

export class StoreCreationService {
  async createStore(userId: number, data: CreateStoreInput) {
    return prisma.$transaction(async (tx) => {
      const existingStore = await tx.store.findUnique({
        where: { domain: data.domain },
      });

      if (existingStore) {
        throw AppError.conflict("A store with this domain already exists");
      }

      const starterPlan = await tx.subscriptionPlan.findFirst({
        where: {
          code: "starter",
          deleted_at: null,
        },
      });

      if (!starterPlan) {
        throw AppError.internal(
          "Default subscription plan 'starter' is not configured",
        );
      }

      const now = new Date();
      const trialEndsAt = new Date(now);
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 3);

      const store = await tx.store.create({
        data: {
          name: data.name,
          domain: data.domain,
          status: "DRAFT",
          currency_code: "LYD",
          locale: "ar-LY",
          timezone: "Africa/Tripoli",
        },
      });

      const roles = await Promise.all(
        defaultRoleTemplates.map(async (roleTemplate) => {
          return tx.storeRole.create({
            data: {
              store_id: store.id,
              name: roleTemplate.name,
              slug: roleTemplate.slug,
              description: roleTemplate.description,
              is_protected: roleTemplate.is_protected,
              permissions: {
                create: roleTemplate.permissions.map((permissionCode) => ({
                  permission: { connect: { code: permissionCode } },
                })),
              },
            },
          });
        }),
      );

      const ownerRole = roles.find((role) => role.slug === "owner");

      if (!ownerRole) {
        throw AppError.internal("Default owner role template is not configured");
      }

      const membership = await tx.storeMembership.create({
        data: {
          store_id: store.id,
          user_id: userId,
          role_id: ownerRole.id,
          status: "ACTIVE",
          joined_at: now,
        },
      });

      const subscription = await tx.storeSubscription.create({
        data: {
          store_id: store.id,
          plan_id: starterPlan.id,
          billing_cycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.TRIALING,
          trial_ends_at: trialEndsAt,
          current_period_starts_at: now,
          current_period_ends_at: trialEndsAt,
        },
      });

      return {
        store,
        roles,
        membership,
        subscription,
      };
    });
  }
}

export const storeCreationService = new StoreCreationService();