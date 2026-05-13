import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Parameters for listing storefront products with pagination, filtering, and sorting.
 */
interface StorefrontProductListParams {
  page?: number;
  limit?: number;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  sort_by?: "name" | "price" | "created_at";
  sort_order?: "asc" | "desc";
}

/**
 * StorefrontProductService handles public product browsing:
 * listing published products with filters, getting product details by slug,
 * and searching products by name/description/SKU.
 */
export class StorefrontProductService {
  /**
   * Lists published and active products with pagination, filtering, and sorting.
   * Only returns products where is_published=true and status=ACTIVE.
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  async listProducts(storeId: number, params: StorefrontProductListParams) {
    const {
      page = 1,
      limit = 20,
      category_id,
      min_price,
      max_price,
      sort_by = "created_at",
      sort_order = "desc",
    } = params;

    // Clamp limit to max 100
    const effectiveLimit = Math.min(limit, 100);

    // Build where clause — only published + active products
    const where: any = {
      store_id: storeId,
      is_published: true,
      status: "ACTIVE",
    };

    // Filter by category
    if (category_id) {
      where.categories = {
        some: { category_id },
      };
    }

    // Filter by price range
    if (min_price !== undefined || max_price !== undefined) {
      where.base_price = {};
      if (min_price !== undefined) {
        where.base_price.gte = min_price;
      }
      if (max_price !== undefined) {
        where.base_price.lte = max_price;
      }
    }

    // Build orderBy
    const orderBy: any = {};
    if (sort_by === "price") {
      orderBy.base_price = sort_order;
    } else if (sort_by === "name") {
      orderBy.name = sort_order;
    } else {
      orderBy.created_at = sort_order;
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          media: { orderBy: { sort_order: "asc" }, take: 1 },
          variants: {
            where: { is_active: true },
            take: 1,
            orderBy: { sort_order: "asc" },
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        skip: (page - 1) * effectiveLimit,
        take: effectiveLimit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: effectiveLimit,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  /**
   * Gets a product by slug with active variants, option values, media, and inventory.
   * Returns 404 if product not found, not published, or not active.
   * Requirements: 5.5, 5.6
   */
  async getProductBySlug(storeId: number, slug: string) {
    const product = await prisma.product.findFirst({
      where: {
        store_id: storeId,
        slug,
        is_published: true,
        status: "ACTIVE",
      },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        media: { orderBy: { sort_order: "asc" } },
        options: {
          orderBy: { position: "asc" },
          include: {
            values: { orderBy: { position: "asc" } },
          },
        },
        variants: {
          where: { is_active: true },
          orderBy: { sort_order: "asc" },
          include: {
            option_values: {
              include: { option_value: true },
            },
            inventory: {
              select: { available_quantity: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    return product;
  }

  /**
   * Searches products by case-insensitive partial match on name, description, and variant SKU.
   * Only returns published + active products. Paginated results.
   * Requirements: 5.7
   */
  async searchProducts(
    storeId: number,
    query: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Clamp limit to max 100
    const effectiveLimit = Math.min(limit, 100);

    const where: any = {
      store_id: storeId,
      is_published: true,
      status: "ACTIVE",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        {
          variants: {
            some: { sku: { contains: query, mode: "insensitive" } },
          },
        },
      ],
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          media: { orderBy: { sort_order: "asc" }, take: 1 },
          variants: {
            where: { is_active: true },
            take: 1,
            orderBy: { sort_order: "asc" },
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        skip: (page - 1) * effectiveLimit,
        take: effectiveLimit,
        orderBy: { created_at: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: effectiveLimit,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }
}

export const storefrontProductService = new StorefrontProductService();
