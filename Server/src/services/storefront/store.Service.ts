import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { storefrontPurchasableProductWhere } from "../../utils/productVisibility";

/**
 * Represents a category tree node with nested children for storefront display.
 */
interface StorefrontCategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: number | null;
  sort_order: number;
  children: StorefrontCategoryTreeNode[];
}

/**
 * StorefrontStoreService provides public store information,
 * category browsing, and category-product listing for the
 * customer-facing storefront.
 */
export class StorefrontStoreService {
  /**
   * Returns the public profile of a store by its ID.
   * Includes: name, domain, logo, favicon, description, currency_code, locale,
   * social links, support contact, and SEO metadata.
   */
  async getStoreInfo(storeId: number) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        domain: true,
        logo: true,
        favicon: true,
        description: true,
        currency_code: true,
        locale: true,
        facebook_url: true,
        instagram_url: true,
        tiktok_url: true,
        support_email: true,
        support_phone: true,
        meta_title: true,
        meta_description: true,
      },
    });

    if (!store) {
      throw AppError.notFound("Store not found");
    }

    return store;
  }

  /**
   * Returns all active categories for a store as a nested tree structure,
   * ordered by sort_order ascending at each level.
   */
  async listCategories(storeId: number) {
    const categories = await prisma.category.findMany({
      where: {
        store_id: storeId,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        parent_id: true,
        sort_order: true,
      },
      orderBy: { sort_order: "asc" },
    });

    return this.buildCategoryTree(categories);
  }

  /**
   * Returns a category by slug with its published and active products, paginated.
   * Throws 404 if the category is not found or is inactive.
   *
   * @param storeId - The store ID
   * @param slug - The category slug
   * @param page - Page number (default 1)
   * @param limit - Items per page (default 20, max 100)
   */
  async getCategoryBySlug(
    storeId: number,
    slug: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Clamp limit to max 100
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    // Find the category
    const category = await prisma.category.findFirst({
      where: {
        store_id: storeId,
        slug,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        parent_id: true,
      },
    });

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    // Get published products in this category, paginated
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          store_id: storeId,
          is_published: true,
          status: "PUBLISHED",
          AND: [storefrontPurchasableProductWhere],
          categories: {
            some: {
              category_id: category.id,
              store_id: storeId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          short_description: true,
          base_price: true,
          compare_at_price: true,
          media: {
            select: {
              id: true,
              url: true,
              alt_text: true,
            },
            orderBy: { sort_order: "asc" },
            take: 1,
          },
        },
        skip,
        take: safeLimit,
        orderBy: { created_at: "desc" },
      }),
      prisma.product.count({
        where: {
          store_id: storeId,
          is_published: true,
          status: "PUBLISHED",
          AND: [storefrontPurchasableProductWhere],
          categories: {
            some: {
              category_id: category.id,
              store_id: storeId,
            },
          },
        },
      }),
    ]);

    return {
      category,
      products: {
        data: products,
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit),
        },
      },
    };
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  /**
   * Builds a nested tree structure from a flat category list.
   * Uses a two-pass hash map approach for O(n) performance.
   * Children at each level are sorted by sort_order.
   */
  private buildCategoryTree(
    categories: Array<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      image_url: string | null;
      parent_id: number | null;
      sort_order: number;
    }>,
  ): StorefrontCategoryTreeNode[] {
    const map = new Map<number, StorefrontCategoryTreeNode>();
    const roots: StorefrontCategoryTreeNode[] = [];

    // First pass: create nodes with empty children arrays
    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    // Second pass: link parents to children
    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort children by sort_order at each level
    const sortChildren = (nodes: StorefrontCategoryTreeNode[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order);
      nodes.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
  }
}

export const storefrontStoreService = new StorefrontStoreService();
