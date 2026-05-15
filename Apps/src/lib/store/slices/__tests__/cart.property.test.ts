import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import cartReducer, {
  type CartState,
  addItemOptimistic,
  removeItemOptimistic,
  updateQuantityOptimistic,
  setCart,
} from "../cart.slice";
import type { CartItem, AppliedCoupon } from "@/types";

/**
 * **Validates: Requirements 17.2**
 *
 * Property 7: Cart Optimistic Rollback
 * For any cart operation that fails, cart state after failure equals
 * cart state before the operation.
 *
 * This tests the rollback mechanism at the reducer level:
 * 1. Start with a random valid cart state
 * 2. Apply an optimistic action (addItemOptimistic, removeItemOptimistic, updateQuantityOptimistic)
 * 3. Then apply setCart with the original snapshot (simulating rollback)
 * 4. Verify the state equals the original state
 */

// --- Arbitraries ---

const arbCartItem: fc.Arbitrary<CartItem> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  product_id: fc.integer({ min: 1, max: 10000 }),
  variant_id: fc.integer({ min: 1, max: 10000 }),
  quantity: fc.integer({ min: 1, max: 9999 }),
  unit_price: fc.integer({ min: 1, max: 99999 }).map((v) => v.toString()),
  total_price: fc.integer({ min: 1, max: 999999 }).map((v) => v.toString()),
  product: fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    slug: fc.string({ minLength: 1, maxLength: 30 }),
    media: fc.constant([]),
  }),
  variant: fc.record({
    title: fc.string({ minLength: 1, maxLength: 30 }),
    sku: fc.string({ minLength: 1, maxLength: 20 }),
  }),
});

const arbAppliedCoupon: fc.Arbitrary<AppliedCoupon> = fc.record({
  code: fc.string({ minLength: 2, maxLength: 50 }),
  type: fc.constantFrom("PERCENTAGE" as const, "FIXED" as const),
  value: fc.integer({ min: 1, max: 100 }),
  discount_amount: fc.integer({ min: 0, max: 99999 }).map((v) => v.toString()),
});

const arbCartState: fc.Arbitrary<CartState> = fc.record({
  items: fc.array(arbCartItem, { minLength: 0, maxLength: 10 }),
  subtotal: fc.integer({ min: 0, max: 999999 }).map((v) => v.toString()),
  discount_amount: fc.integer({ min: 0, max: 99999 }).map((v) => v.toString()),
  total: fc.integer({ min: 0, max: 999999 }).map((v) => v.toString()),
  coupon: fc.option(arbAppliedCoupon, { nil: null }),
  loading: fc.boolean(),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
});

describe("Cart Optimistic Rollback Property Tests", () => {
  it("rollback after addItemOptimistic restores original state", () => {
    fc.assert(
      fc.property(arbCartState, arbCartItem, (initialState, newItem) => {
        // Take a snapshot (simulating what the thunk does before optimistic update)
        const snapshot: CartState = { ...initialState };

        // Apply optimistic add
        const afterOptimistic = cartReducer(
          initialState,
          addItemOptimistic(newItem),
        );

        // Simulate rollback: apply setCart with the original snapshot
        const afterRollback = cartReducer(afterOptimistic, setCart(snapshot));

        // After rollback, the data fields should match the original snapshot
        expect(afterRollback.items).toEqual(snapshot.items);
        expect(afterRollback.subtotal).toEqual(snapshot.subtotal);
        expect(afterRollback.discount_amount).toEqual(snapshot.discount_amount);
        expect(afterRollback.total).toEqual(snapshot.total);
        expect(afterRollback.coupon).toEqual(snapshot.coupon);
      }),
      { numRuns: 100 },
    );
  });

  it("rollback after removeItemOptimistic restores original state", () => {
    fc.assert(
      fc.property(
        arbCartState.filter((s) => s.items.length > 0),
        (initialState) => {
          // Pick an item ID from the existing items to remove
          const itemIdToRemove = initialState.items[0].id;

          // Take a snapshot
          const snapshot: CartState = { ...initialState };

          // Apply optimistic remove
          const afterOptimistic = cartReducer(
            initialState,
            removeItemOptimistic(itemIdToRemove),
          );

          // Simulate rollback
          const afterRollback = cartReducer(afterOptimistic, setCart(snapshot));

          // After rollback, the data fields should match the original snapshot
          expect(afterRollback.items).toEqual(snapshot.items);
          expect(afterRollback.subtotal).toEqual(snapshot.subtotal);
          expect(afterRollback.discount_amount).toEqual(
            snapshot.discount_amount,
          );
          expect(afterRollback.total).toEqual(snapshot.total);
          expect(afterRollback.coupon).toEqual(snapshot.coupon);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rollback after updateQuantityOptimistic restores original state", () => {
    fc.assert(
      fc.property(
        arbCartState.filter((s) => s.items.length > 0),
        fc.integer({ min: 1, max: 9999 }),
        (initialState, newQuantity) => {
          // Pick an item ID from the existing items to update
          const itemIdToUpdate = initialState.items[0].id;

          // Take a snapshot
          const snapshot: CartState = { ...initialState };

          // Apply optimistic quantity update
          const afterOptimistic = cartReducer(
            initialState,
            updateQuantityOptimistic({
              itemId: itemIdToUpdate,
              quantity: newQuantity,
            }),
          );

          // Simulate rollback
          const afterRollback = cartReducer(afterOptimistic, setCart(snapshot));

          // After rollback, the data fields should match the original snapshot
          expect(afterRollback.items).toEqual(snapshot.items);
          expect(afterRollback.subtotal).toEqual(snapshot.subtotal);
          expect(afterRollback.discount_amount).toEqual(
            snapshot.discount_amount,
          );
          expect(afterRollback.total).toEqual(snapshot.total);
          expect(afterRollback.coupon).toEqual(snapshot.coupon);
        },
      ),
      { numRuns: 100 },
    );
  });
});
