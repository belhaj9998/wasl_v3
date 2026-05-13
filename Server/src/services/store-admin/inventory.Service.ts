import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Parameters for listing inventory with pagination, search, and low-stock filter.
 */
interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  low_stock_only?: boolean;
}

/**
 * Parameters for listing inventory movements with pagination, type filter, and date range.
 */
interface MovementListParams {
  page?: number;
  limit?: number;
  type?:
    | "IN"
    | "ADJUSTMENT_IN"
    | "OUT"
    | "ADJUSTMENT_OUT"
    | "RESERVED"
    | "RELEASED"
    | "RETURNED";
  from_date?: Date;
  to_date?: Date;
}

/**
 * Parameters for paginated queries.
 */
interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Input for adjusting inventory.
 */
interface AdjustInventoryInput {
  type: "IN" | "ADJUSTMENT_IN" | "OUT" | "ADJUSTMENT_OUT";
  quantity: number;
  reason?: string;
  reference_type?: string;
  reference_id?: number;
}

/**
 * InventoryService handles inventory management within a store:
 * listing inventory levels, low-stock alerts, adjustments with movement recording,
 * and movement history queries.
 */
export class InventoryService {
  /**
   * Lists inventory for all variants in a store with pagination.
   * Supports search by SKU, variant title, or product name.
   * Supports low_stock_only filter.
   * Includes variant and product data.
   */
  async list(storeId: number, params: InventoryListParams) {
    const { page = 1, limit = 20, search, low_stock_only } = params;

    // Build where clause
    const where: any = { store_id: storeId };

    // Search filter: match against variant SKU, variant title, or product name
    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          {
            product: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      };
    }

    // For low_stock_only, Prisma doesn't support column-to-column comparison natively
    // (available_quantity <= low_stock_threshold). We fetch with search filter applied
    // and then filter in application for the low_stock condition.
    if (low_stock_only) {
      const allRecords = await prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { available_quantity: "asc" },
      });

      // Filter low stock: available_quantity <= low_stock_threshold
      const lowStockRecords = allRecords.filter(
        (inv) => inv.available_quantity <= inv.low_stock_threshold,
      );

      const total = lowStockRecords.length;
      const data = lowStockRecords.slice((page - 1) * limit, page * limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Standard listing without low_stock filter
    const [data, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updated_at: "desc" },
      }),
      prisma.inventory.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets low-stock items where available_quantity <= low_stock_threshold.
   * Paginated with variant and product data.
   */
  async getLowStock(storeId: number, params: PaginationParams) {
    const { page = 1, limit = 20 } = params;

    // Fetch all inventory for the store and filter in application
    // (Prisma doesn't support column-to-column comparison in where clause)
    const allRecords = await prisma.inventory.findMany({
      where: { store_id: storeId },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { available_quantity: "asc" },
    });

    // Filter: available_quantity <= low_stock_threshold
    const lowStockRecords = allRecords.filter(
      (inv) => inv.available_quantity <= inv.low_stock_threshold,
    );

    const total = lowStockRecords.length;
    const data = lowStockRecords.slice((page - 1) * limit, page * limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets inventory for a specific variant.
   * Returns 404 if not found.
   */
  async getByVariantId(storeId: number, variantId: number) {
    const inventory = await prisma.inventory.findFirst({
      where: { store_id: storeId, variant_id: variantId },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw AppError.notFound("Inventory record not found for this variant");
    }

    return inventory;
  }

  /**
   * Adjusts inventory with movement recording.
   * Validates type, calculates new quantities, checks available >= 0 for OUT types.
   * Updates inventory and creates movement in a single transaction.
   */
  async adjust(
    storeId: number,
    variantId: number,
    data: AdjustInventoryInput,
    actorUserId: number,
  ) {
    return await prisma.$transaction(async (tx) => {
      // Fetch current inventory
      const inventory = await tx.inventory.findFirst({
        where: { store_id: storeId, variant_id: variantId },
      });

      if (!inventory) {
        throw AppError.notFound("Inventory record not found for this variant");
      }

      // Calculate new quantities based on movement type
      let newTotal = inventory.total_quantity;
      let newAvailable = inventory.available_quantity;
      let quantityChange: number;

      switch (data.type) {
        case "IN":
        case "ADJUSTMENT_IN":
          newTotal += data.quantity;
          newAvailable += data.quantity;
          quantityChange = data.quantity;
          break;

        case "OUT":
        case "ADJUSTMENT_OUT":
          if (inventory.available_quantity < data.quantity) {
            throw AppError.badRequest(
              `Insufficient stock. Available: ${inventory.available_quantity}, Requested: ${data.quantity}`,
            );
          }
          newTotal -= data.quantity;
          newAvailable -= data.quantity;
          quantityChange = -data.quantity;
          break;

        default:
          throw AppError.badRequest("Invalid adjustment type");
      }

      // Update inventory
      const updated = await tx.inventory.update({
        where: {
          variant_id_store_id: { variant_id: variantId, store_id: storeId },
        },
        data: {
          total_quantity: newTotal,
          available_quantity: newAvailable,
        },
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });

      // Create movement record
      await tx.inventoryMovement.create({
        data: {
          store_id: storeId,
          variant_id: variantId,
          actor_user_id: actorUserId,
          type: data.type,
          quantity_change: quantityChange,
          reason: data.reason || null,
          reference_type: data.reference_type || null,
          reference_id: data.reference_id || null,
        },
      });

      return updated;
    });
  }

  /**
   * Lists all inventory movements for a store.
   * Supports pagination, type filter, and date range filter.
   */
  async listMovements(storeId: number, params: MovementListParams) {
    const { page = 1, limit = 50, type, from_date, to_date } = params;

    // Build where clause
    const where: any = { store_id: storeId };

    if (type) {
      where.type = type;
    }

    // Date range filter
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) {
        where.created_at.gte = from_date;
      }
      if (to_date) {
        where.created_at.lte = to_date;
      }
    }

    const [data, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              product: {
                select: { id: true, name: true },
              },
            },
          },
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lists movements for a specific variant.
   * Paginated and ordered by created_at descending.
   */
  async getVariantMovements(
    storeId: number,
    variantId: number,
    params: PaginationParams,
  ) {
    const { page = 1, limit = 50 } = params;

    // Verify variant exists in the store
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, store_id: storeId },
    });

    if (!variant) {
      throw AppError.notFound("Variant not found");
    }

    const where = { store_id: storeId, variant_id: variantId };

    const [data, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const inventoryService = new InventoryService();
