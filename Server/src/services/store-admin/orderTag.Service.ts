import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import {
  mapOrderTagToDto,
  mapOrderTagToSummaryDto,
} from "../../mappers/orderTag.mapper";
import { OrderTagColorPreset, Prisma } from "../../../generated/prisma";

/**
 * Hard limits documented in the design and enforced both at the request
 * boundary (`bulkOrderTagsSchema`, `replaceOrderTagsSchema`) and inside the
 * service so direct service callers (tests, scripts) can't bypass them.
 */
const MAX_TAGS_PER_STORE = 50;
const MAX_TAGS_PER_ORDER = 10;

/**
 * Public input shapes used by the service. Mirror the Zod validators.
 */
interface ListParams {
  withCounts?: boolean;
}

interface CreateInput {
  name: string;
  color_preset: OrderTagColorPreset;
}

interface UpdateInput {
  name?: string;
  color_preset?: OrderTagColorPreset;
}

interface BulkInput {
  order_ids: number[];
  tag_ids: number[];
}

/**
 * Compact, structured audit log for every rejection path.
 * Mirrors the design's "Audit Logging" requirement (Requirement 2.7, 6.4)
 * without coupling to a specific logging library — we use `console.warn`
 * with a deterministic shape so it can be ingested later.
 */
function auditWarn(reason: string, context: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify({
      level: "warn",
      scope: "orderTag",
      reason,
      ...context,
    }),
  );
}

/**
 * OrderTagService encapsulates every read/write concern for tag definitions
 * and tag-to-order assignments. Every mutation enforces store isolation by
 * passing `store_id` through the composite FKs that exist on
 * `OrderTagAssignment(order_id, store_id)` and `OrderTagAssignment(tag_id, store_id)`.
 *
 * Validates: Requirements 1.*, 2.*, 3.*, 7.*
 */
export class OrderTagService {
  // ─── Definitions ──────────────────────────────────────────────────────────

  /**
   * Lists every tag in the store, ordered by `created_at` ascending.
   * When `withCounts` is true, also returns `assignment_count` per tag —
   * computed via a single `groupBy` so we never N+1.
   *
   * Validates: Requirements 1.2, 10.1
   */
  async list(storeId: number, params?: ListParams) {
    const tags = await prisma.orderTag.findMany({
      where: { store_id: storeId },
      orderBy: { created_at: "asc" },
    });

    if (!params?.withCounts || tags.length === 0) {
      return tags.map((t) => mapOrderTagToDto(t));
    }

    const counts = await prisma.orderTagAssignment.groupBy({
      by: ["tag_id"],
      where: {
        store_id: storeId,
        tag_id: { in: tags.map((t) => t.id) },
      },
      _count: { _all: true },
    });

    const countByTag = new Map(
      counts.map((row) => [row.tag_id, row._count._all]),
    );

    return tags.map((t) =>
      mapOrderTagToDto(t, { assignmentCount: countByTag.get(t.id) ?? 0 }),
    );
  }

  /**
   * Creates a tag with a trimmed name and a valid color preset.
   *
   * - Enforces the per-store limit BEFORE the duplicate check so we always
   *   surface the limit error first when both apply.
   * - Performs a case-insensitive duplicate check against `name_lower`.
   *
   * Validates: Requirements 1.1, 1.5, 1.8
   */
  async create(storeId: number, input: CreateInput) {
    const name = input.name.trim();
    const nameLower = name.toLowerCase();

    // Per-store limit check — fail fast.
    const existingCount = await prisma.orderTag.count({
      where: { store_id: storeId },
    });
    if (existingCount >= MAX_TAGS_PER_STORE) {
      auditWarn("TAG_STORE_LIMIT_REACHED", { storeId, attemptedName: name });
      throw new AppError(
        "Tag store limit reached: TAG_STORE_LIMIT_REACHED",
        409,
      );
    }

    // Case-insensitive duplicate check.
    const duplicate = await prisma.orderTag.findFirst({
      where: { store_id: storeId, name_lower: nameLower },
    });
    if (duplicate) {
      auditWarn("TAG_NAME_DUPLICATE", {
        storeId,
        attemptedName: name,
        existingTagId: duplicate.id,
      });
      throw new AppError("Tag name already exists: TAG_NAME_DUPLICATE", 409);
    }

    // `name_lower` is a Postgres GENERATED column — we MUST NOT supply a
    // value for it. Postgres computes `lower(name)` automatically on insert.
    const created = await prisma.orderTag.create({
      data: {
        store_id: storeId,
        name,
        color_preset: input.color_preset,
      },
    });

    return mapOrderTagToDto(created);
  }

  /**
   * Partially updates a tag definition. Re-validates name + duplicate
   * uniqueness when `name` is provided.
   *
   * Validates: Requirements 1.3, 1.5, 1.9
   */
  async update(storeId: number, tagId: number, input: UpdateInput) {
    const existing = await prisma.orderTag.findFirst({
      where: { id: tagId, store_id: storeId },
    });
    if (!existing) {
      auditWarn("TAG_NOT_FOUND", { storeId, tagId });
      throw new AppError("Tag not found: TAG_NOT_FOUND", 404);
    }

    const data: Prisma.OrderTagUpdateInput = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      const nameLower = name.toLowerCase();

      if (nameLower !== existing.name_lower) {
        const duplicate = await prisma.orderTag.findFirst({
          where: {
            store_id: storeId,
            name_lower: nameLower,
            NOT: { id: tagId },
          },
        });
        if (duplicate) {
          auditWarn("TAG_NAME_DUPLICATE", {
            storeId,
            tagId,
            attemptedName: name,
            existingTagId: duplicate.id,
          });
          throw new AppError(
            "Tag name already exists: TAG_NAME_DUPLICATE",
            409,
          );
        }
      }

      data.name = name;
      // Do NOT set `data.name_lower` here — it's a Postgres GENERATED
      // column derived from `name` and any explicit assignment is rejected
      // with `cannot insert a non-DEFAULT value into column "name_lower"`.
    }

    if (input.color_preset !== undefined) {
      data.color_preset = input.color_preset;
    }

    const updated = await prisma.orderTag.update({
      where: { id: tagId },
      data,
    });

    return mapOrderTagToDto(updated);
  }

  /**
   * Deletes a tag in this store. The composite FK on `OrderTagAssignment`
   * uses `onDelete: Cascade`, so all assignment rows referencing the tag
   * are removed automatically without touching `Order` rows.
   *
   * Validates: Requirements 1.4, 1.9, 7.4
   */
  async delete(storeId: number, tagId: number): Promise<void> {
    const existing = await prisma.orderTag.findFirst({
      where: { id: tagId, store_id: storeId },
      select: { id: true },
    });
    if (!existing) {
      auditWarn("TAG_NOT_FOUND", { storeId, tagId });
      throw new AppError("Tag not found: TAG_NOT_FOUND", 404);
    }

    await prisma.orderTag.delete({ where: { id: tagId } });
  }

  // ─── Single-order assignments ────────────────────────────────────────────

  /**
   * Returns the tags currently assigned to an order in this store.
   * Sorted by `OrderTag.created_at` ascending so the chip order matches
   * everywhere the tag is rendered.
   *
   * Validates: Requirements 2.5, 4.1
   */
  async getForOrder(storeId: number, orderId: number) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
      select: { id: true },
    });
    if (!order) {
      auditWarn("ORDER_NOT_FOUND", { storeId, orderId });
      throw new AppError("Order not found: ORDER_NOT_FOUND", 404);
    }

    const assignments = await prisma.orderTagAssignment.findMany({
      where: { store_id: storeId, order_id: orderId },
      include: { tag: true },
    });

    return assignments
      .map((a) => a.tag)
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((t) => mapOrderTagToSummaryDto(t));
  }

  /**
   * Replaces the tag set on an order in a single transaction.
   *
   * - Validates the order exists and belongs to the store.
   * - Validates every supplied tag id exists in this store.
   * - Enforces MAX_TAGS_PER_ORDER on the deduplicated request.
   * - Computes (toAdd, toRemove) deltas to minimize writes.
   * - Appends a single `TAGS_UPDATED` timeline entry only when the set
   *   actually changed (Requirement 2.6).
   *
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   */
  async replaceForOrder(
    storeId: number,
    orderId: number,
    tagIds: number[],
    actorUserId: number,
  ) {
    // Deduplicate input so callers don't have to.
    const requested = Array.from(new Set(tagIds));

    if (requested.length > MAX_TAGS_PER_ORDER) {
      auditWarn("TAG_ORDER_LIMIT_EXCEEDED", {
        storeId,
        orderId,
        actorUserId,
        requestedCount: requested.length,
        limit: MAX_TAGS_PER_ORDER,
      });
      throw new AppError(
        "Per-order tag limit exceeded: TAG_ORDER_LIMIT_EXCEEDED",
        400,
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
      select: { id: true },
    });
    if (!order) {
      auditWarn("ORDER_NOT_FOUND", { storeId, orderId, actorUserId });
      throw new AppError("Order not found: ORDER_NOT_FOUND", 404);
    }

    // Validate every tag id belongs to this store.
    if (requested.length > 0) {
      const validTags = await prisma.orderTag.findMany({
        where: { store_id: storeId, id: { in: requested } },
        select: { id: true },
      });
      if (validTags.length !== requested.length) {
        const validSet = new Set(validTags.map((t) => t.id));
        const missing = requested.filter((id) => !validSet.has(id));
        auditWarn("TAG_NOT_FOUND_IN_STORE", {
          storeId,
          orderId,
          actorUserId,
          missingTagIds: missing,
        });
        throw new AppError(
          "Tag does not belong to store: TAG_NOT_FOUND_IN_STORE",
          400,
        );
      }
    }

    // Compute deltas against the current set.
    const current = await prisma.orderTagAssignment.findMany({
      where: { store_id: storeId, order_id: orderId },
      select: { tag_id: true },
    });
    const currentIds = current.map((a) => a.tag_id);
    const currentSet = new Set(currentIds);
    const requestedSet = new Set(requested);
    const toAdd = requested.filter((id) => !currentSet.has(id));
    const toRemove = currentIds.filter((id) => !requestedSet.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      // No-op; return the current set without writing or appending timeline.
      return this.getForOrder(storeId, orderId);
    }

    await prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.orderTagAssignment.deleteMany({
          where: {
            store_id: storeId,
            order_id: orderId,
            tag_id: { in: toRemove },
          },
        });
      }

      if (toAdd.length > 0) {
        await tx.orderTagAssignment.createMany({
          data: toAdd.map((tagId) => ({
            store_id: storeId,
            order_id: orderId,
            tag_id: tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Sort the from/to lists so the timeline payload is deterministic.
      const fromSorted = [...currentIds].sort((a, b) => a - b);
      const toSorted = [...requested].sort((a, b) => a - b);

      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "TAGS_UPDATED",
          payload: { from: fromSorted, to: toSorted },
        },
      });
    });

    return this.getForOrder(storeId, orderId);
  }

  // ─── Bulk assignments ────────────────────────────────────────────────────

  /**
   * Bulk add — every supplied tag is added to every supplied order, with
   * full atomicity. The implementation:
   *
   *   1. Deduplicates inputs.
   *   2. Validates every order belongs to the store.
   *   3. Validates every tag belongs to the store.
   *   4. Computes per-order: existing tag count + would-be-added count
   *      (after deduplication against existing). Rejects if any exceeds
   *      MAX_TAGS_PER_ORDER.
   *   5. Inserts only the new (order_id, tag_id) pairs in one transaction.
   *   6. Appends `TAGS_UPDATED` rows only for orders whose tag set changed.
   *
   * Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6
   */
  async bulkAdd(
    storeId: number,
    input: BulkInput,
    actorUserId: number,
  ): Promise<{ affected_orders: number }> {
    const orderIds = Array.from(new Set(input.order_ids));
    const tagIds = Array.from(new Set(input.tag_ids));

    await this.assertOrdersInStore(storeId, orderIds, actorUserId);
    await this.assertTagsInStore(storeId, tagIds, actorUserId);

    // Read existing assignments for the targeted orders.
    const existing = await prisma.orderTagAssignment.findMany({
      where: {
        store_id: storeId,
        order_id: { in: orderIds },
      },
      select: { order_id: true, tag_id: true },
    });

    // Index existing assignments by order_id for O(1) per-order lookups.
    const existingByOrder = new Map<number, Set<number>>();
    for (const oid of orderIds) existingByOrder.set(oid, new Set());
    for (const row of existing) {
      existingByOrder.get(row.order_id)!.add(row.tag_id);
    }

    // Compute per-order would-be-added counts and the final result size.
    const additionsByOrder = new Map<number, number[]>();
    for (const oid of orderIds) {
      const have = existingByOrder.get(oid)!;
      const adds = tagIds.filter((tid) => !have.has(tid));
      const finalCount = have.size + adds.length;
      if (finalCount > MAX_TAGS_PER_ORDER) {
        auditWarn("TAG_ORDER_LIMIT_EXCEEDED", {
          storeId,
          actorUserId,
          orderId: oid,
          existingCount: have.size,
          wouldAdd: adds.length,
          limit: MAX_TAGS_PER_ORDER,
          mode: "bulkAdd",
        });
        throw new AppError(
          "Per-order tag limit exceeded: TAG_ORDER_LIMIT_EXCEEDED",
          400,
        );
      }
      additionsByOrder.set(oid, adds);
    }

    // Apply changes atomically.
    const changedOrderIds: number[] = [];
    await prisma.$transaction(async (tx) => {
      const inserts: Array<{
        store_id: number;
        order_id: number;
        tag_id: number;
      }> = [];

      for (const oid of orderIds) {
        const adds = additionsByOrder.get(oid)!;
        if (adds.length === 0) continue;
        changedOrderIds.push(oid);
        for (const tid of adds) {
          inserts.push({ store_id: storeId, order_id: oid, tag_id: tid });
        }
      }

      if (inserts.length > 0) {
        await tx.orderTagAssignment.createMany({
          data: inserts,
          skipDuplicates: true,
        });
      }

      for (const oid of changedOrderIds) {
        const existingSet = existingByOrder.get(oid)!;
        const fromSorted = [...existingSet].sort((a, b) => a - b);
        const toSorted = [...existingSet, ...additionsByOrder.get(oid)!].sort(
          (a, b) => a - b,
        );

        await tx.orderTimeline.create({
          data: {
            store_id: storeId,
            order_id: oid,
            actor_user_id: actorUserId,
            event: "TAGS_UPDATED",
            payload: { from: fromSorted, to: toSorted },
          },
        });
      }
    });

    return { affected_orders: changedOrderIds.length };
  }

  /**
   * Bulk remove — deletes every (order_id, tag_id) pair where both are
   * in the request and belong to the store.
   *
   * Validates: Requirements 3.2, 3.3, 3.4, 3.6
   */
  async bulkRemove(
    storeId: number,
    input: BulkInput,
    actorUserId: number,
  ): Promise<{ affected_orders: number }> {
    const orderIds = Array.from(new Set(input.order_ids));
    const tagIds = Array.from(new Set(input.tag_ids));

    await this.assertOrdersInStore(storeId, orderIds, actorUserId);
    await this.assertTagsInStore(storeId, tagIds, actorUserId);

    // Read existing assignments to determine which orders will actually
    // change (so we only append timeline rows for genuinely-affected ones).
    const existing = await prisma.orderTagAssignment.findMany({
      where: {
        store_id: storeId,
        order_id: { in: orderIds },
        tag_id: { in: tagIds },
      },
      select: { order_id: true, tag_id: true },
    });

    if (existing.length === 0) {
      return { affected_orders: 0 };
    }

    const existingAllByOrder = await prisma.orderTagAssignment.findMany({
      where: { store_id: storeId, order_id: { in: orderIds } },
      select: { order_id: true, tag_id: true },
    });
    const allByOrder = new Map<number, number[]>();
    for (const oid of orderIds) allByOrder.set(oid, []);
    for (const row of existingAllByOrder) {
      allByOrder.get(row.order_id)!.push(row.tag_id);
    }

    // Per-order list of tag ids that will actually be removed.
    const removalsByOrder = new Map<number, Set<number>>();
    for (const row of existing) {
      if (!removalsByOrder.has(row.order_id)) {
        removalsByOrder.set(row.order_id, new Set());
      }
      removalsByOrder.get(row.order_id)!.add(row.tag_id);
    }

    const changedOrderIds = Array.from(removalsByOrder.keys());

    await prisma.$transaction(async (tx) => {
      await tx.orderTagAssignment.deleteMany({
        where: {
          store_id: storeId,
          order_id: { in: orderIds },
          tag_id: { in: tagIds },
        },
      });

      for (const oid of changedOrderIds) {
        const before = allByOrder.get(oid) ?? [];
        const removed = removalsByOrder.get(oid)!;
        const after = before.filter((id) => !removed.has(id));

        await tx.orderTimeline.create({
          data: {
            store_id: storeId,
            order_id: oid,
            actor_user_id: actorUserId,
            event: "TAGS_UPDATED",
            payload: {
              from: [...before].sort((a, b) => a - b),
              to: after.sort((a, b) => a - b),
            },
          },
        });
      }
    });

    return { affected_orders: changedOrderIds.length };
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /**
   * Asserts every order id in the input belongs to the requester's store.
   * Throws `ORDER_NOT_FOUND_IN_STORE` (400) on mismatch.
   *
   * Validates: Requirements 3.3
   */
  private async assertOrdersInStore(
    storeId: number,
    orderIds: number[],
    actorUserId: number,
  ): Promise<void> {
    if (orderIds.length === 0) return;

    const found = await prisma.order.findMany({
      where: { store_id: storeId, id: { in: orderIds } },
      select: { id: true },
    });

    if (found.length !== orderIds.length) {
      const foundSet = new Set(found.map((o) => o.id));
      const missing = orderIds.filter((id) => !foundSet.has(id));
      auditWarn("ORDER_NOT_FOUND_IN_STORE", {
        storeId,
        actorUserId,
        missingOrderIds: missing,
      });
      throw new AppError(
        "Order does not belong to store: ORDER_NOT_FOUND_IN_STORE",
        400,
      );
    }
  }

  /**
   * Asserts every tag id in the input belongs to the requester's store.
   * Throws `TAG_NOT_FOUND_IN_STORE` (400) on mismatch.
   *
   * Validates: Requirements 3.4
   */
  private async assertTagsInStore(
    storeId: number,
    tagIds: number[],
    actorUserId: number,
  ): Promise<void> {
    if (tagIds.length === 0) return;

    const found = await prisma.orderTag.findMany({
      where: { store_id: storeId, id: { in: tagIds } },
      select: { id: true },
    });

    if (found.length !== tagIds.length) {
      const foundSet = new Set(found.map((t) => t.id));
      const missing = tagIds.filter((id) => !foundSet.has(id));
      auditWarn("TAG_NOT_FOUND_IN_STORE", {
        storeId,
        actorUserId,
        missingTagIds: missing,
      });
      throw new AppError(
        "Tag does not belong to store: TAG_NOT_FOUND_IN_STORE",
        400,
      );
    }
  }
}

export const orderTagService = new OrderTagService();
