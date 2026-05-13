import prisma from "../configs/prisma";
import { AppError } from "../utils/AppError";

/**
 * Default store roles created for every new store.
 * Each role has a display name, a URL-safe slug, and is_protected = true.
 */
const DEFAULT_STORE_ROLES = [
  { name: "Owner", slug: "owner" },
  { name: "Admin", slug: "admin" },
  { name: "Catalog Manager", slug: "catalog-manager" },
  { name: "Order Manager", slug: "order-manager" },
  { name: "Inventory Manager", slug: "inventory-manager" },
  { name: "Staff", slug: "staff" },
] as const;

/**
 * Input data required to create a new store.
 */
export interface CreateStoreInput {
  name: string;
  domain: string;
}

/**
 * StoreCreationService orchestrates the creation of a new store
 * along with its default roles and the owner's membership — all
 * within a single Prisma transaction for atomicity.
 */
export class StoreCreationService {
  /**
   * Creates a new store with default configuration, roles, and owner membership.
   *
   * Steps (atomic transaction):
   * 1. Check domain uniqueness → 409 on conflict
   * 2. Create Store with status=DRAFT, currency_code=LYD, locale=ar-LY, timezone=Africa/Tripoli
   * 3. Create 6 default StoreRole records (all is_protected=true)
   * 4. Create StoreMembership linking the user to the store with Owner role and ACTIVE status
   *
   * @param userId - The ID of the authenticated user creating the store
   * @param data - Store name and domain
   * @returns The created store with membership and role data
   */
  async createStore(userId: number, data: CreateStoreInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Check domain uniqueness
      const existingStore = await tx.store.findUnique({
        where: { domain: data.domain },
      });

      if (existingStore) {
        throw AppError.conflict("A store with this domain already exists");
      }

      // 2. Create Store with defaults
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

      // 3. Create 6 default StoreRole records
      const roles = await Promise.all(
        DEFAULT_STORE_ROLES.map((role) =>
          tx.storeRole.create({
            data: {
              store_id: store.id,
              name: role.name,
              slug: role.slug,
              is_protected: true,
            },
          }),
        ),
      );

      // Find the Owner role for membership assignment
      const ownerRole = roles.find((r) => r.slug === "owner")!;

      // 4. Create StoreMembership linking user to store with Owner role
      const membership = await tx.storeMembership.create({
        data: {
          store_id: store.id,
          user_id: userId,
          role_id: ownerRole.id,
          status: "ACTIVE",
          joined_at: new Date(),
        },
      });

      return {
        store,
        roles,
        membership,
      };
    });
  }
}

export const storeCreationService = new StoreCreationService();
