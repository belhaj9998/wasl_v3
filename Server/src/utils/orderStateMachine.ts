import { ShipmentStatus } from "../../generated/prisma";
import { AppError } from "./AppError";

/**
 * Valid order status transitions.
 *
 * DRAFT → PENDING, CANCELED
 * PENDING → CONFIRMED, CANCELED
 * CONFIRMED → PROCESSING, CANCELED
 * PROCESSING → PREPARING, CANCELED
 * PREPARING → SHIPPED, CANCELED
 * SHIPPED → IN_TRANSIT, RETURNED
 * IN_TRANSIT → OUT_FOR_DELIVERY, RETURNED
 * OUT_FOR_DELIVERY → DELIVERED, RETURNED
 * DELIVERED → RETURNED
 * CANCELED → (terminal state)
 * RETURNED → (terminal state)
 */
const VALID_ORDER_TRANSITIONS: Readonly<
  Record<ShipmentStatus, ShipmentStatus[]>
> = {
  DRAFT: [ShipmentStatus.PENDING, ShipmentStatus.CANCELED],
  PENDING: [ShipmentStatus.CONFIRMED, ShipmentStatus.CANCELED],
  CONFIRMED: [ShipmentStatus.PROCESSING, ShipmentStatus.CANCELED],
  PROCESSING: [ShipmentStatus.PREPARING, ShipmentStatus.CANCELED],
  PREPARING: [ShipmentStatus.SHIPPED, ShipmentStatus.CANCELED],
  SHIPPED: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.RETURNED],
  IN_TRANSIT: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED],
  OUT_FOR_DELIVERY: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED],
  DELIVERED: [ShipmentStatus.RETURNED],
  CANCELED: [],
  RETURNED: [],
} as const;

/**
 * Order State Machine — enforces valid order status transitions.
 * Terminal states: CANCELED, RETURNED (no outgoing transitions).
 */
class OrderStateMachine {
  /**
   * Check whether a transition from one status to another is valid.
   */
  canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
    const allowed = VALID_ORDER_TRANSITIONS[from];
    return allowed.includes(to);
  }

  /**
   * Get all valid target statuses from a given status.
   */
  getValidTransitions(from: ShipmentStatus): ShipmentStatus[] {
    return [...VALID_ORDER_TRANSITIONS[from]];
  }

  /**
   * Assert that a transition is valid. Throws AppError.badRequest if not.
   */
  assertTransition(from: ShipmentStatus, to: ShipmentStatus): void {
    if (!this.canTransition(from, to)) {
      throw AppError.badRequest(
        `Invalid order status transition from "${from}" to "${to}"`,
      );
    }
  }
}

export const orderStateMachine = new OrderStateMachine();
