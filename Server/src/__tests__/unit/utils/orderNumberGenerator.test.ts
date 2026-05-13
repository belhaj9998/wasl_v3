import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, MockProxy } from "vitest-mock-extended";
import { PrismaClient } from "../../../../generated/prisma";
import {
  orderNumberGenerator,
  PrismaTransactionClient,
} from "../../../utils/orderNumberGenerator";

describe("orderNumberGenerator", () => {
  let mockTx: MockProxy<PrismaTransactionClient>;

  beforeEach(() => {
    mockTx = mockDeep<PrismaTransactionClient>();
  });

  describe("format matches ORD-XXXX-XXXXXX pattern", () => {
    it("generates order number matching ORD-XXXX-XXXXXX format", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(1, mockTx);

      expect(result).toMatch(/^ORD-\d{4}-\d{6}$/);
    });

    it("always starts with ORD prefix", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(42, mockTx);

      expect(result.startsWith("ORD-")).toBe(true);
    });

    it("has exactly three parts separated by hyphens", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(1, mockTx);
      const parts = result.split("-");

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("ORD");
      expect(parts[1]).toHaveLength(4);
      expect(parts[2]).toHaveLength(6);
    });
  });

  describe("store ID is zero-padded to 4 digits", () => {
    it("pads single-digit store ID to 4 digits", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(1, mockTx);

      expect(result).toBe("ORD-0001-000001");
    });

    it("pads two-digit store ID to 4 digits", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(42, mockTx);

      expect(result).toBe("ORD-0042-000001");
    });

    it("pads three-digit store ID to 4 digits", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(123, mockTx);

      expect(result).toBe("ORD-0123-000001");
    });

    it("does not pad four-digit store ID", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(9999, mockTx);

      expect(result).toBe("ORD-9999-000001");
    });
  });

  describe("sequence starts at 1 when no previous orders", () => {
    it("returns sequence 000001 when findFirst returns null", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      const result = await orderNumberGenerator.generate(5, mockTx);

      expect(result).toBe("ORD-0005-000001");
    });

    it("queries orders filtered by store_id", async () => {
      mockTx.order.findFirst.mockResolvedValue(null);

      await orderNumberGenerator.generate(7, mockTx);

      expect(mockTx.order.findFirst).toHaveBeenCalledWith({
        where: { store_id: 7 },
        orderBy: { id: "desc" },
        select: { order_number: true },
      });
    });
  });

  describe("sequence increments from last order number", () => {
    it("increments sequence from last order", async () => {
      mockTx.order.findFirst.mockResolvedValue({
        order_number: "ORD-0001-000005",
      } as any);

      const result = await orderNumberGenerator.generate(1, mockTx);

      expect(result).toBe("ORD-0001-000006");
    });

    it("increments from a high sequence number", async () => {
      mockTx.order.findFirst.mockResolvedValue({
        order_number: "ORD-0010-000999",
      } as any);

      const result = await orderNumberGenerator.generate(10, mockTx);

      expect(result).toBe("ORD-0010-001000");
    });

    it("handles sequence rollover to larger numbers", async () => {
      mockTx.order.findFirst.mockResolvedValue({
        order_number: "ORD-0001-999999",
      } as any);

      const result = await orderNumberGenerator.generate(1, mockTx);

      expect(result).toBe("ORD-0001-1000000");
    });

    it("correctly parses sequence from order number format", async () => {
      mockTx.order.findFirst.mockResolvedValue({
        order_number: "ORD-0050-000100",
      } as any);

      const result = await orderNumberGenerator.generate(50, mockTx);

      expect(result).toBe("ORD-0050-000101");
    });
  });
});
