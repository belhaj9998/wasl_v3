import { PrismaClient } from "../../generated/prisma";

/**
 * Prisma transaction client type.
 * This is the type of the `tx` parameter passed inside `prisma.$transaction(async (tx) => { ... })`.
 */
type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Generates sequential order numbers unique per store.
 * Format: ORD-{storeId padded to 4 digits}-{sequential padded to 6 digits}
 * Example: ORD-0001-000042
 *
 * Must be called within a Prisma transaction to prevent race conditions.
 */
class OrderNumberGenerator {
  /**
   * Generate the next order number for a given store.
   *
   * @param storeId - The store ID to generate the order number for
   * @param tx - Prisma transaction client (ensures atomicity)
   * @returns The generated order number string
   */
  async generate(
    storeId: number,
    tx: PrismaTransactionClient,
  ): Promise<string> {
    const lastOrder = await tx.order.findFirst({
      where: { store_id: storeId },
      orderBy: { id: "desc" },
      select: { order_number: true },
    });

    let nextSequence = 1;

    if (lastOrder && lastOrder.order_number) {
      const parts = lastOrder.order_number.split("-");
      const sequencePart = parts[2];
      if (sequencePart) {
        nextSequence = parseInt(sequencePart, 10) + 1;
      }
    }

    const storePrefix = String(storeId).padStart(4, "0");
    const sequenceStr = String(nextSequence).padStart(6, "0");

    return `ORD-${storePrefix}-${sequenceStr}`;
  }
}

export const orderNumberGenerator = new OrderNumberGenerator();
export type { PrismaTransactionClient };
