import { PaginationParams, PaginatedResult } from "../types/index.js";

/**
 * Generic base service providing reusable CRUD operations with
 * pagination, filtering, soft delete, and multi-tenant store scoping.
 *
 * Domain services extend this class and inherit common query logic.
 */
export class BaseService<T, CreateInput, UpdateInput> {
  constructor(
    protected readonly model: any, // Prisma model delegate
    protected readonly storeId?: number,
  ) {}

  /**
   * Returns a paginated list of records with optional filters.
   * Scopes by store_id when storeId is set, excludes soft-deleted records.
   */
  async findAll(
    params: PaginationParams,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sortBy, sortOrder } = params;

    const where: Record<string, unknown> = {
      deleted_at: null,
      ...filters,
    };

    if (this.storeId !== undefined) {
      where.store_id = this.storeId;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const orderBy = sortBy ? { [sortBy]: sortOrder || "desc" } : undefined;

    const [total, data] = await Promise.all([
      this.model.count({ where }),
      this.model.findMany({
        where,
        skip,
        take,
        ...(orderBy && { orderBy }),
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Finds a single record by ID.
   * Scopes by store_id when storeId is set, excludes soft-deleted records.
   */
  async findById(id: number): Promise<T | null> {
    const where: Record<string, unknown> = {
      id,
      deleted_at: null,
    };

    if (this.storeId !== undefined) {
      where.store_id = this.storeId;
    }

    return this.model.findFirst({ where });
  }

  /**
   * Creates a new record. Includes store_id when scoped.
   */
  async create(data: CreateInput): Promise<T> {
    const createData: Record<string, unknown> = { ...(data as any) };

    if (this.storeId !== undefined) {
      createData.store_id = this.storeId;
    }

    return this.model.create({ data: createData });
  }

  /**
   * Updates a record by ID. Scopes by store_id when storeId is set.
   */
  async update(id: number, data: UpdateInput): Promise<T> {
    const where: Record<string, unknown> = { id };

    if (this.storeId !== undefined) {
      where.store_id = this.storeId;
    }

    return this.model.update({
      where,
      data: data as any,
    });
  }

  /**
   * Soft-deletes a record by setting deleted_at timestamp.
   * Scopes by store_id when storeId is set.
   */
  async softDelete(id: number): Promise<T> {
    const where: Record<string, unknown> = { id };

    if (this.storeId !== undefined) {
      where.store_id = this.storeId;
    }

    return this.model.update({
      where,
      data: { deleted_at: new Date() },
    });
  }
}
