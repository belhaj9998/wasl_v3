import { describe, it, expect } from "vitest";
import { orderStateMachine } from "../../../utils/orderStateMachine";
import { ShipmentStatus } from "../../../../generated/prisma";
import { AppError } from "../../../utils/AppError";

describe("orderStateMachine", () => {
  describe("canTransition — valid transitions", () => {
    const validTransitions: [ShipmentStatus, ShipmentStatus][] = [
      [ShipmentStatus.DRAFT, ShipmentStatus.PENDING],
      [ShipmentStatus.DRAFT, ShipmentStatus.CANCELED],
      [ShipmentStatus.PENDING, ShipmentStatus.CONFIRMED],
      [ShipmentStatus.PENDING, ShipmentStatus.CANCELED],
      [ShipmentStatus.CONFIRMED, ShipmentStatus.PROCESSING],
      [ShipmentStatus.CONFIRMED, ShipmentStatus.CANCELED],
      [ShipmentStatus.PROCESSING, ShipmentStatus.PREPARING],
      [ShipmentStatus.PROCESSING, ShipmentStatus.CANCELED],
      [ShipmentStatus.PREPARING, ShipmentStatus.SHIPPED],
      [ShipmentStatus.PREPARING, ShipmentStatus.CANCELED],
      [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT],
      [ShipmentStatus.SHIPPED, ShipmentStatus.RETURNED],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.RETURNED],
      [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
      [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED],
      [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED],
    ];

    it.each(validTransitions)("returns true for %s → %s", (from, to) => {
      expect(orderStateMachine.canTransition(from, to)).toBe(true);
    });
  });

  describe("canTransition — invalid transitions", () => {
    const invalidTransitions: [ShipmentStatus, ShipmentStatus][] = [
      [ShipmentStatus.DRAFT, ShipmentStatus.CONFIRMED],
      [ShipmentStatus.DRAFT, ShipmentStatus.DELIVERED],
      [ShipmentStatus.PENDING, ShipmentStatus.SHIPPED],
      [ShipmentStatus.CONFIRMED, ShipmentStatus.DELIVERED],
      [ShipmentStatus.PROCESSING, ShipmentStatus.SHIPPED],
      [ShipmentStatus.PREPARING, ShipmentStatus.DELIVERED],
      [ShipmentStatus.SHIPPED, ShipmentStatus.DELIVERED],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
      [ShipmentStatus.DELIVERED, ShipmentStatus.PENDING],
      [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELED],
    ];

    it.each(invalidTransitions)("returns false for %s → %s", (from, to) => {
      expect(orderStateMachine.canTransition(from, to)).toBe(false);
    });
  });

  describe("terminal states (CANCELED, RETURNED)", () => {
    const allStatuses = Object.values(ShipmentStatus);

    it("CANCELED has no outgoing transitions", () => {
      for (const target of allStatuses) {
        expect(
          orderStateMachine.canTransition(ShipmentStatus.CANCELED, target),
        ).toBe(false);
      }
    });

    it("RETURNED has no outgoing transitions", () => {
      for (const target of allStatuses) {
        expect(
          orderStateMachine.canTransition(ShipmentStatus.RETURNED, target),
        ).toBe(false);
      }
    });

    it("getValidTransitions returns empty array for CANCELED", () => {
      expect(
        orderStateMachine.getValidTransitions(ShipmentStatus.CANCELED),
      ).toEqual([]);
    });

    it("getValidTransitions returns empty array for RETURNED", () => {
      expect(
        orderStateMachine.getValidTransitions(ShipmentStatus.RETURNED),
      ).toEqual([]);
    });
  });

  describe("assertTransition — throws AppError 400 for invalid transitions", () => {
    it("throws AppError with status 400 for invalid transition", () => {
      expect(() =>
        orderStateMachine.assertTransition(
          ShipmentStatus.DRAFT,
          ShipmentStatus.DELIVERED,
        ),
      ).toThrow(AppError);

      try {
        orderStateMachine.assertTransition(
          ShipmentStatus.DRAFT,
          ShipmentStatus.DELIVERED,
        );
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(400);
        expect((err as AppError).message).toContain("DRAFT");
        expect((err as AppError).message).toContain("DELIVERED");
      }
    });

    it("throws for terminal state CANCELED to any target", () => {
      expect(() =>
        orderStateMachine.assertTransition(
          ShipmentStatus.CANCELED,
          ShipmentStatus.PENDING,
        ),
      ).toThrow(AppError);
    });

    it("throws for terminal state RETURNED to any target", () => {
      expect(() =>
        orderStateMachine.assertTransition(
          ShipmentStatus.RETURNED,
          ShipmentStatus.PENDING,
        ),
      ).toThrow(AppError);
    });

    it("does not throw for valid transitions", () => {
      expect(() =>
        orderStateMachine.assertTransition(
          ShipmentStatus.DRAFT,
          ShipmentStatus.PENDING,
        ),
      ).not.toThrow();
    });
  });

  describe("getValidTransitions — immutability", () => {
    it("returns a new array each time (not a reference to internal state)", () => {
      const first = orderStateMachine.getValidTransitions(ShipmentStatus.DRAFT);
      const second = orderStateMachine.getValidTransitions(
        ShipmentStatus.DRAFT,
      );
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });

    it("mutating the returned array does not affect future calls", () => {
      const transitions = orderStateMachine.getValidTransitions(
        ShipmentStatus.DRAFT,
      );
      transitions.push(ShipmentStatus.DELIVERED);

      const fresh = orderStateMachine.getValidTransitions(ShipmentStatus.DRAFT);
      expect(fresh).not.toContain(ShipmentStatus.DELIVERED);
      expect(fresh).toEqual([ShipmentStatus.PENDING, ShipmentStatus.CANCELED]);
    });

    it("returns correct transitions for non-terminal states", () => {
      expect(
        orderStateMachine.getValidTransitions(ShipmentStatus.SHIPPED),
      ).toEqual([ShipmentStatus.IN_TRANSIT, ShipmentStatus.RETURNED]);
    });
  });
});
