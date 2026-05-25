import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";

/**
 * Represents a category tree node with nested children.
 */
interface CategoryTreeNode {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: Date;
  updated_at: Date;
  children: CategoryTreeNode[];
}

/**
 * Options for listing categories.
 */
interface CategoryListOptions {
  flat?: boolean;
  page?: number;
  limit?: number;
  parent_id?: number | null;
  is_active?: boolean;
}

/**
 * Input for creating a category.
 */
interface CreateCategoryInput {
  name: string;
  parent_id?: number | null;
  image_url?: string | null;
  is_active?: boolean;
}

/**
 * Input for updating a category.
 */
interface UpdateCategoryInput {
  name?: string;
  parent_id?: number | null;
  image_url?: string | null;
  is_active?: boolean;
}

/**
 * Item in a reorder request.
 */
interface ReorderItem {
  id: number;
  sort_order: number;
  parent_id?: number | null;
}

/**
 * CategoryService handles category management within a store:
 * listing (flat/tree), creating, updating, deleting, and reordering
 * categories with tree structure validation.
 */
export class CategoryService {
  /**
   * Lists categories for a store as a flat paginated list or nested tree structure.
   * When flat=true, returns paginated results with optional parent_id and is_active filters.
   * When flat=false (default), returns the full tree structure sorted by sort_order.
   */
  async list(storeId: number, options: CategoryListOptions) {
    const {
      flat = false,
      page = 1,
      limit = 20,
      parent_id,
      is_active,
    } = options;

    // Build where clause with optional filters
    const where: any = { store_id: storeId };

    if (parent_id !== undefined) {
      where.parent_id = parent_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (flat) {
      // Flat paginated list
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { sort_order: "asc" },
        }),
        prisma.category.count({ where }),
      ]);
      const data = await this.withProductCounts(storeId, categories);

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

    // Tree structure — fetch all categories for the store (with optional filters)
    const categories = await prisma.category.findMany({
      where,
      orderBy: { sort_order: "asc" },
    });

    return this.buildCategoryTree(
      await this.withProductCounts(storeId, categories),
    );
  }

  private async withProductCounts<T extends { id: number }>(
    storeId: number,
    categories: T[],
  ): Promise<Array<T & { product_count: number }>> {
    if (categories.length === 0) {
      return [];
    }

    const counts = await prisma.productCategory.groupBy({
      by: ["category_id"],
      where: {
        store_id: storeId,
        category_id: { in: categories.map((category) => category.id) },
      },
      _count: { product_id: true },
    });

    const countByCategoryId = new Map(
      counts.map((item) => [item.category_id, item._count.product_id]),
    );

    return categories.map((category) => ({
      ...category,
      product_count: countByCategoryId.get(category.id) ?? 0,
    }));
  }

  /**
   * Builds a nested tree structure from a flat category list.
   * Uses a two-pass hash map approach for O(n) performance.
   * Children at each level are sorted by sort_order.
   */
  buildCategoryTree(categories: any[]): CategoryTreeNode[] {
    const map = new Map<number, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

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
    const sortChildren = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order);
      nodes.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
  }

  /**
   * Creates a new category with auto-generated slug.
   * Validates parent_id exists in store, checks depth ≤ 3,
   * generates unique slug, and sets sort_order to max+1 among siblings.
   */
  async create(storeId: number, data: CreateCategoryInput) {
    const { name, parent_id = null, image_url, is_active = true } = data;

    // Validate parent_id exists in the same store
    if (parent_id !== null && parent_id !== undefined) {
      const parent = await prisma.category.findFirst({
        where: { id: parent_id, store_id: storeId },
      });

      if (!parent) {
        throw AppError.notFound("Parent category not found");
      }

      // Check depth: parent's depth + 1 must not exceed 3
      const parentDepth = await this.getDepth(parent_id, undefined, storeId);
      if (parentDepth + 1 > 3) {
        throw AppError.badRequest("Maximum category depth (3 levels) exceeded");
      }
    }

    // Generate unique slug
    const slug = await this.ensureUniqueSlug(storeId, slugify(name));

    // Get max sort_order among siblings
    const maxSortOrder = await prisma.category.aggregate({
      where: { store_id: storeId, parent_id: parent_id ?? null },
      _max: { sort_order: true },
    });
    const sortOrder = (maxSortOrder._max.sort_order ?? -1) + 1;

    // Create the category
    const category = await prisma.category.create({
      data: {
        store_id: storeId,
        name,
        slug,
        parent_id: parent_id ?? null,
        image_url: image_url ?? null,
        sort_order: sortOrder,
        is_active,
      },
    });

    return category;
  }

  /**
   * Fetches a single category by ID within a store.
   * Throws 404 if not found.
   */
  async getById(storeId: number, categoryId: number) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, store_id: storeId },
    });

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    return category;
  }

  /**
   * Updates a category. Validates circular reference prevention and depth check.
   * Regenerates slug if name changes.
   */
  async update(storeId: number, categoryId: number, data: UpdateCategoryInput) {
    // Check existence
    const category = await prisma.category.findFirst({
      where: { id: categoryId, store_id: storeId },
    });

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    const updateData: any = {};

    // Handle parent_id change
    if (data.parent_id !== undefined) {
      const newParentId = data.parent_id;

      if (newParentId !== null) {
        // Cannot set parent to itself
        if (newParentId === categoryId) {
          throw AppError.badRequest(
            "Cannot set parent: would create circular reference",
          );
        }

        // Validate parent exists in store
        const parent = await prisma.category.findFirst({
          where: { id: newParentId, store_id: storeId },
        });

        if (!parent) {
          throw AppError.notFound("Parent category not found");
        }

        // Check circular reference: new parent must not be a descendant
        const descendantIds = await this.getDescendantIds(
          categoryId,
          undefined,
          storeId,
        );
        if (descendantIds.includes(newParentId)) {
          throw AppError.badRequest(
            "Cannot set parent: would create circular reference",
          );
        }

        // Check depth: new parent depth + 1 + max subtree depth of this category
        const parentDepth = await this.getDepth(
          newParentId,
          undefined,
          storeId,
        );
        const subtreeDepth = await this.getMaxSubtreeDepth(categoryId, storeId);
        if (parentDepth + 1 + subtreeDepth > 3) {
          throw AppError.badRequest(
            "Maximum category depth (3 levels) exceeded",
          );
        }
      }

      updateData.parent_id = newParentId;
    }

    // Handle name change — regenerate slug
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = await this.ensureUniqueSlug(
        storeId,
        slugify(data.name),
        categoryId,
      );
    }

    if (data.image_url !== undefined) {
      updateData.image_url = data.image_url;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const updated = await prisma.category.update({
      where: { id_store_id: { id: categoryId, store_id: storeId } },
      data: updateData,
    });

    return updated;
  }

  /**
   * Deletes a category. Reassigns children to the deleted category's parent
   * (or to root if the deleted category had no parent).
   * ProductCategory links are cascade-deleted by the database.
   */
  async delete(storeId: number, categoryId: number) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, store_id: storeId },
    });

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    await prisma.$transaction(async (tx) => {
      // Reassign children to the deleted category's parent
      await tx.category.updateMany({
        where: { parent_id: categoryId, store_id: storeId },
        data: { parent_id: category.parent_id },
      });

      // Delete ProductCategory links for this category
      await tx.productCategory.deleteMany({
        where: { category_id: categoryId, store_id: storeId },
      });

      // Delete the category
      await tx.category.delete({
        where: { id_store_id: { id: categoryId, store_id: storeId } },
      });
    });
  }

  /**
   * Bulk reorders categories by updating sort_order and optional parent_id.
   * Validates all IDs exist in store, checks for circular references and depth limits.
   * Executes in a single atomic transaction.
   */
  async reorder(storeId: number, items: ReorderItem[]) {
    // Validate all category IDs exist in the store
    const categoryIds = items.map((item) => item.id);
    const existingCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, store_id: storeId },
      select: { id: true, parent_id: true },
    });

    if (existingCategories.length !== categoryIds.length) {
      throw AppError.badRequest(
        "One or more category IDs do not exist in this store",
      );
    }

    // Build a map of proposed parent changes for validation
    const parentChanges = new Map<number, number | null>();
    for (const item of items) {
      if (item.parent_id !== undefined) {
        parentChanges.set(item.id, item.parent_id);
      }
    }

    // Validate circular references and depth for parent changes
    if (parentChanges.size > 0) {
      // Get all categories in the store for validation
      const allCategories = await prisma.category.findMany({
        where: { store_id: storeId },
        select: { id: true, parent_id: true },
      });

      // Build a simulated parent map with proposed changes applied
      const parentMap = new Map<number, number | null>();
      for (const cat of allCategories) {
        parentMap.set(cat.id, cat.parent_id);
      }
      for (const [id, parentId] of parentChanges) {
        parentMap.set(id, parentId);
      }

      // Validate no circular references and depth ≤ 3
      for (const [id, newParentId] of parentChanges) {
        if (newParentId !== null) {
          // Check self-reference
          if (newParentId === id) {
            throw AppError.badRequest(
              "Cannot set parent: would create circular reference",
            );
          }

          // Check circular reference by traversing parent chain
          const visited = new Set<number>();
          let current: number | null = newParentId;
          while (current !== null) {
            if (current === id) {
              throw AppError.badRequest(
                "Cannot set parent: would create circular reference",
              );
            }
            if (visited.has(current)) {
              throw AppError.badRequest(
                "Cannot set parent: would create circular reference",
              );
            }
            visited.add(current);
            current = parentMap.get(current) ?? null;
          }
        }

        // Check depth constraint
        const depth = this.computeDepthFromMap(id, parentMap);
        if (depth > 3) {
          throw AppError.badRequest(
            "Maximum category depth (3 levels) exceeded",
          );
        }

        // Also check descendants' depth
        const descendants = this.getDescendantIdsFromMap(
          id,
          parentMap,
          allCategories.map((c) => c.id),
        );
        for (const descId of descendants) {
          const descDepth = this.computeDepthFromMap(descId, parentMap);
          if (descDepth > 3) {
            throw AppError.badRequest(
              "Maximum category depth (3 levels) exceeded",
            );
          }
        }
      }
    }

    // Execute atomic update
    await prisma.$transaction(
      items.map((item) => {
        const updateData: any = { sort_order: item.sort_order };
        if (item.parent_id !== undefined) {
          updateData.parent_id = item.parent_id;
        }
        return prisma.category.update({
          where: { id_store_id: { id: item.id, store_id: storeId } },
          data: updateData,
        });
      }),
    );
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  /**
   * Computes the depth of a category by traversing the parent chain.
   * Root categories have depth 1.
   * Requires storeId to ensure traversal stays within the same store.
   */
  async getDepth(
    categoryId: number,
    tx?: any,
    storeId?: number,
  ): Promise<number> {
    const client = tx || prisma;
    let depth = 0;
    let currentId: number | null = categoryId;

    while (currentId !== null) {
      depth++;
      const whereClause: any = { id: currentId };
      if (storeId !== undefined) {
        whereClause.store_id = storeId;
      }
      const category: { parent_id: number | null } | null =
        await client.category.findFirst({
          where: whereClause,
          select: { parent_id: true },
        });

      if (!category) break;
      currentId = category.parent_id;
    }

    return depth;
  }

  /**
   * Gets all descendant IDs of a category to prevent circular references.
   * Uses BFS traversal. Requires storeId to ensure traversal stays within the same store.
   */
  async getDescendantIds(
    categoryId: number,
    tx?: any,
    storeId?: number,
  ): Promise<number[]> {
    const client = tx || prisma;
    const descendants: number[] = [];
    const queue: number[] = [categoryId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const whereClause: any = { parent_id: currentId };
      if (storeId !== undefined) {
        whereClause.store_id = storeId;
      }
      const children = await client.category.findMany({
        where: whereClause,
        select: { id: true },
      });

      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  /**
   * Gets the maximum depth of the subtree rooted at a category.
   * Returns 0 if the category has no children.
   * Requires storeId to ensure traversal stays within the same store.
   */
  private async getMaxSubtreeDepth(
    categoryId: number,
    storeId?: number,
  ): Promise<number> {
    const whereClause: any = { parent_id: categoryId };
    if (storeId !== undefined) {
      whereClause.store_id = storeId;
    }
    const children = await prisma.category.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (children.length === 0) return 0;

    let maxDepth = 0;
    for (const child of children) {
      const childDepth = await this.getMaxSubtreeDepth(child.id, storeId);
      maxDepth = Math.max(maxDepth, childDepth + 1);
    }

    return maxDepth;
  }

  /**
   * Ensures slug uniqueness within a store by appending numeric suffix if needed.
   * Optionally excludes a category ID (for updates).
   */
  private async ensureUniqueSlug(
    storeId: number,
    baseSlug: string,
    excludeId?: number,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await prisma.category.findFirst({
        where: {
          store_id: storeId,
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });

      if (!existing) return slug;

      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }

  /**
   * Computes depth of a category from a parent map (for reorder validation).
   * Root categories have depth 1.
   */
  private computeDepthFromMap(
    categoryId: number,
    parentMap: Map<number, number | null>,
  ): number {
    let depth = 0;
    let currentId: number | null = categoryId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (visited.has(currentId)) break; // safety against infinite loops
      visited.add(currentId);
      depth++;
      currentId = parentMap.get(currentId) ?? null;
    }

    return depth;
  }

  /**
   * Gets descendant IDs from a parent map (for reorder validation).
   */
  private getDescendantIdsFromMap(
    categoryId: number,
    parentMap: Map<number, number | null>,
    allIds: number[],
  ): number[] {
    const descendants: number[] = [];
    const queue: number[] = [categoryId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      for (const id of allIds) {
        if (parentMap.get(id) === currentId && id !== categoryId) {
          descendants.push(id);
          queue.push(id);
        }
      }
    }

    return descendants;
  }
}

export const categoryService = new CategoryService();
