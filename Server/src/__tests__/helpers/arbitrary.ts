import * as fc from "fast-check";
import { ShipmentStatus } from "../../../generated/prisma";

// ─── Slug Testing Arbitraries ───────────────────────────────────────────────

/**
 * Arbitrary strings for slug testing — mix of unicode, spaces, special chars.
 * Generates a wide variety of inputs to stress-test the slugify function.
 *
 * Validates: Requirements 9.1, 9.2
 */
export const arbSlugInput: fc.Arbitrary<string> = fc.oneof(
  fc.string(), // general strings with special chars
  fc.mixedCase(fc.string({ minLength: 1, maxLength: 50 })), // mixed case
  fc.constant(""), // empty string edge case
  fc.constantFrom(
    "Hello World",
    "café-résumé",
    "  leading spaces",
    "trailing spaces  ",
    "multiple   spaces",
    "special!@#$%^&*()chars",
    "---hyphens---",
    "مرحبا بالعالم", // Arabic
    "日本語テスト", // Japanese
  ),
);

/**
 * Whitespace-only strings (spaces, tabs, newlines, carriage returns).
 * Used to verify slugify returns empty string for whitespace input.
 *
 * Validates: Requirements 9.2
 */
export const arbWhitespace: fc.Arbitrary<string> =
  fc.stringMatching(/^[ \t\n\r]+$/);

// ─── Order State Machine Arbitraries ────────────────────────────────────────

/**
 * All ShipmentStatus enum values from Prisma schema.
 * Used for property-based testing of the order state machine.
 *
 * Validates: Requirements 9.3
 */
export const arbShipmentStatus: fc.Arbitrary<ShipmentStatus> = fc.constantFrom(
  ShipmentStatus.DRAFT,
  ShipmentStatus.PENDING,
  ShipmentStatus.CONFIRMED,
  ShipmentStatus.PROCESSING,
  ShipmentStatus.PREPARING,
  ShipmentStatus.SHIPPED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.CANCELED,
  ShipmentStatus.RETURNED,
);

// ─── Validator Arbitraries ──────────────────────────────────────────────────

/**
 * Valid registration data objects matching the registerSchema constraints:
 * - name: 2–100 characters
 * - email: valid email format
 * - phone: matches ^\+?\d{7,15}$
 * - password: 8–128 characters
 *
 * Validates: Requirements 9.5
 */
export const arbRegistrationData: fc.Arbitrary<{
  name: string;
  email: string;
  phone: string;
  password: string;
}> = fc.record({
  name: fc
    .string({ minLength: 2, maxLength: 100 })
    .filter((s) => s.trim().length >= 2),
  email: fc.emailAddress(),
  phone: fc.stringMatching(/^\+?\d{7,15}$/),
  password: fc
    .string({ minLength: 8, maxLength: 128 })
    .filter((s) => s.length >= 8),
});

// ─── Category Tree Arbitraries ──────────────────────────────────────────────

interface CategoryListItem {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
}

/**
 * Flat category lists with valid parent references.
 * Each item has { id, name, slug, parent_id, sort_order } where parent_id
 * references a valid id within the same list or is null.
 *
 * The generation strategy ensures valid parent references by only allowing
 * parent_id to reference items that appear earlier in the list (lower index).
 *
 * Validates: Requirements 9.8
 */
export const arbCategoryList: fc.Arbitrary<CategoryListItem[]> = fc
  .integer({ min: 1, max: 20 })
  .chain((size) =>
    fc
      .array(
        fc.record({
          sort_order: fc.integer({ min: 0, max: 100 }),
          parentIndex: fc.integer({ min: -1, max: size - 1 }),
        }),
        { minLength: size, maxLength: size },
      )
      .map((items) =>
        items.map((item, index) => {
          const id = index + 1;
          // parent_id references an earlier item's id, or null if parentIndex < index is false or -1
          let parent_id: number | null = null;
          if (item.parentIndex >= 0 && item.parentIndex < index) {
            parent_id = item.parentIndex + 1; // convert 0-based index to 1-based id
          }
          return {
            id,
            name: `Category ${id}`,
            slug: `category-${id}`,
            parent_id,
            sort_order: item.sort_order,
          };
        }),
      ),
  );

// ─── Store ID Arbitrary ─────────────────────────────────────────────────────

/**
 * Valid store IDs — integers from 1 to 9999.
 * Used for order number generation property tests.
 *
 * Validates: Requirements 9.8
 */
export const arbStoreId: fc.Arbitrary<number> = fc.integer({
  min: 1,
  max: 9999,
});
