import prisma from "../../configs/prisma";
import { Prisma } from "../../../generated/prisma";
import { AppError } from "../../utils/AppError";
import { AddToCartInput } from "../../types/storefront.types";
import { Money, getScale } from "../../utils/money";

/** Maximum quantity allowed per cart line item */
const MAX_ITEM_QUANTITY = 9999;

/** Maximum distinct line items allowed per cart */
const MAX_LINE_ITEMS = 100;

const cartInclude = {
  items: {
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          media: {
            orderBy: { sort_order: "asc" },
            take: 1,
            select: {
              id: true,
              url: true,
              alt_text: true,
              sort_order: true,
            },
          },
        },
      },
      variant: {
        select: {
          title: true,
          sku: true,
        },
      },
    },
  },
} as const;
/**
 * Type alias for a Prisma transaction client, used by recalculateCartTotals
 * and other methods that operate within a transaction.
 */
type PrismaTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * StorefrontCartService handles shopping cart management for both
 * guest (session-based) and authenticated customers.
 *
 * Responsibilities:
 * - Get or create a single OPEN cart per identifier per store
 * - Add items with product/variant/inventory validation
 * - Update and remove cart items
 * - Recalculate cart totals after every mutation
 */
export class StorefrontCartService {
  /**
   * Finds an existing OPEN cart or creates a new one.
   * Enforces one OPEN cart per customer/session per store.
   *
   * Requirements: 6.1, 6.2, 6.3, 6.12
   */
  async getOrCreateCart(
    storeId: number,
    customerId?: number,
    sessionId?: string,
  ) {
    if (!customerId && !sessionId) {
      throw AppError.badRequest(
        "Either customerId or sessionId must be provided",
      );
    }

    // Try to find existing OPEN cart
    const existingCart = await this.findOpenCart(
      storeId,
      customerId,
      sessionId,
    );

    if (existingCart) {
      return existingCart;
    }

    // Create a new OPEN cart
    const cart = await prisma.cart.create({
      data: {
        store_id: storeId,
        customer_id: customerId ?? null,
        session_id: sessionId ?? null,
        status: "OPEN",
        subtotal: 0,
        discount_total: 0,
        shipping_total: 0,
        grand_total: 0,
      },
      include: cartInclude,
    });

    return cart;
  }

  /**
   * Returns the current cart with items, or an empty cart structure.
   *
   * Requirements: 6.1, 6.2
   */
  async getCart(storeId: number, customerId?: number, sessionId?: string) {
    if (!customerId && !sessionId) {
      throw AppError.badRequest(
        "Either customerId or sessionId must be provided",
      );
    }

    const cart = await this.findOpenCart(storeId, customerId, sessionId);

    if (!cart) {
      // Return a new cart (create it so subsequent calls work)
      return this.getOrCreateCart(storeId, customerId, sessionId);
    }

    return cart;
  }

  /**
   * Adds an item to the cart with full validation:
   * - Product must be published and active
   * - Variant must be active and belong to the product
   * - Inventory check if track_inventory is true
   * - Upserts cart item (sums quantities if variant already in cart)
   * - Sets unit_price from variant.price ?? product.base_price
   * - Calculates total_price = unit_price * quantity
   * - Recalculates cart totals
   * - Enforces max 100 distinct line items per cart
   *
   * Requirements: 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.13
   */
  async addToCart(storeId: number, cartId: number, input: AddToCartInput) {
    const { product_id, variant_id, quantity } = input;

    // If quantity is 0, treat as no-op (Requirement 6.6)
    if (quantity === 0) {
      const cart = await prisma.cart.findFirst({
        where: { id: cartId, store_id: storeId, status: "OPEN" },
        include: cartInclude,
      });
      if (!cart) {
        throw AppError.notFound("Cart not found");
      }
      return cart;
    }

    return prisma.$transaction(async (tx) => {
      // Verify cart exists and is OPEN
      const cart = await tx.cart.findFirst({
        where: { id: cartId, store_id: storeId, status: "OPEN" },
        include: cartInclude,
      });

      if (!cart) {
        throw AppError.notFound("Cart not found");
      }

      // Validate product: must be published in the same store
      const product = await tx.product.findFirst({
        where: {
          id: product_id,
          store_id: storeId,
          is_published: true,
          status: "PUBLISHED",
        },
      });

      if (!product) {
        throw AppError.badRequest("Product is not available (not published)");
      }

      // Validate variant: must be active and belong to the product
      const variant = await tx.productVariant.findFirst({
        where: {
          id: variant_id,
          store_id: storeId,
          product_id: product_id,
          is_active: true,
        },
        include: { inventory: true },
      });

      if (!variant) {
        throw AppError.badRequest(
          "Variant is not available (not active or does not belong to the product)",
        );
      }
      if (product.has_variants && variant.is_default) {
        throw AppError.badRequest("Please select a product variant");
      }

      // Check existing cart item for this variant
      const existingItem = await tx.cartItem.findUnique({
        where: { cart_id_variant_id: { cart_id: cartId, variant_id } },
      });

      const existingQuantity = existingItem ? existingItem.quantity : 0;
      const newTotalQuantity = existingQuantity + quantity;

      // Enforce max quantity per line item
      if (newTotalQuantity > MAX_ITEM_QUANTITY) {
        throw AppError.badRequest(
          `Maximum quantity per item is ${MAX_ITEM_QUANTITY}`,
        );
      }

      // Inventory check if track_inventory is true
      if (product.track_inventory && variant.inventory) {
        if (
          variant.inventory.available_quantity <= 0 ||
          variant.inventory.available_quantity < newTotalQuantity
        ) {
          throw AppError.badRequest(
            `Insufficient stock. Available quantity: ${variant.inventory.available_quantity}`,
          );
        }
      }

      // Determine unit_price: variant.price ?? product.base_price
      const unitPrice = variant.price ?? product.base_price;
      const totalPrice = new Prisma.Decimal(unitPrice.toString()).mul(
        newTotalQuantity,
      );

      if (existingItem) {
        // Update existing cart item (sum quantities)
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newTotalQuantity,
            unit_price: unitPrice,
            total_price: totalPrice,
          },
        });
      } else {
        // Enforce max 100 distinct line items
        const itemCount = cart.items.length;
        if (itemCount >= MAX_LINE_ITEMS) {
          throw AppError.badRequest(
            `Maximum of ${MAX_LINE_ITEMS} distinct items per cart reached`,
          );
        }

        // Create new cart item
        await tx.cartItem.create({
          data: {
            store_id: storeId,
            cart_id: cartId,
            product_id,
            variant_id,
            quantity,
            unit_price: unitPrice,
            total_price: new Prisma.Decimal(unitPrice.toString()).mul(quantity),
          },
        });
      }

      // Recalculate cart totals
      return this.recalculateCartTotals(
        tx as PrismaTransactionClient,
        storeId,
        cartId,
      );
    });
  }

  /**
   * Updates a cart item quantity.
   * - If quantity = 0, removes the item
   * - Otherwise updates quantity with inventory check
   * - Enforces max 9999 per line item
   * - Recalculates cart totals
   *
   * Requirements: 6.11, 6.13
   */
  async updateCartItem(
    storeId: number,
    cartId: number,
    itemId: number,
    quantity: number,
  ) {
    return prisma.$transaction(async (tx) => {
      // Verify cart exists and is OPEN
      const cart = await tx.cart.findFirst({
        where: { id: cartId, store_id: storeId, status: "OPEN" },
      });

      if (!cart) {
        throw AppError.notFound("Cart not found");
      }

      // Find the cart item
      const cartItem = await tx.cartItem.findFirst({
        where: { id: itemId, cart_id: cartId, store_id: storeId },
        include: {
          product: true,
          variant: { include: { inventory: true } },
        },
      });

      if (!cartItem) {
        throw AppError.notFound("Cart item not found");
      }

      // If quantity is 0, remove the item
      if (quantity === 0) {
        await tx.cartItem.delete({ where: { id: itemId } });
        return this.recalculateCartTotals(
          tx as PrismaTransactionClient,
          storeId,
          cartId,
        );
      }

      // Enforce max quantity per line item
      if (quantity > MAX_ITEM_QUANTITY) {
        throw AppError.badRequest(
          `Maximum quantity per item is ${MAX_ITEM_QUANTITY}`,
        );
      }

      // Inventory check if track_inventory is true
      if (cartItem.product.track_inventory && cartItem.variant.inventory) {
        if (
          cartItem.variant.inventory.available_quantity <= 0 ||
          cartItem.variant.inventory.available_quantity < quantity
        ) {
          throw AppError.badRequest(
            `Insufficient stock. Available quantity: ${cartItem.variant.inventory.available_quantity}`,
          );
        }
      }

      // Calculate new total_price
      const unitPrice = cartItem.unit_price;
      const totalPrice = new Prisma.Decimal(unitPrice.toString()).mul(quantity);

      // Update the cart item
      await tx.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          total_price: totalPrice,
        },
      });

      // Recalculate cart totals
      return this.recalculateCartTotals(
        tx as PrismaTransactionClient,
        storeId,
        cartId,
      );
    });
  }

  /**
   * Removes a cart item and recalculates cart totals.
   *
   * Requirements: 6.10
   */
  async removeCartItem(storeId: number, cartId: number, itemId: number) {
    return prisma.$transaction(async (tx) => {
      // Verify cart exists and is OPEN
      const cart = await tx.cart.findFirst({
        where: { id: cartId, store_id: storeId, status: "OPEN" },
      });

      if (!cart) {
        throw AppError.notFound("Cart not found");
      }

      // Find the cart item
      const cartItem = await tx.cartItem.findFirst({
        where: { id: itemId, cart_id: cartId, store_id: storeId },
      });

      if (!cartItem) {
        throw AppError.notFound("Cart item not found");
      }

      // Delete the item
      await tx.cartItem.delete({ where: { id: itemId } });

      // Recalculate cart totals
      return this.recalculateCartTotals(
        tx as PrismaTransactionClient,
        storeId,
        cartId,
      );
    });
  }

  /**
   * Recalculates cart totals:
   * - subtotal = sum of rounded line totals (unit_price * quantity, rounded to currency scale)
   * - grand_total = max(subtotal - discount_total + shipping_total, 0), rounded to currency scale
   *
   * Uses the Money utility for all arithmetic to ensure HALF_UP rounding at currency scale,
   * producing results identical to the OrderService calculation path.
   *
   * Accepts a Prisma transaction client as first param for use within transactions.
   *
   * Requirements: 6.9, 6.10, 2.4, 2.5
   */
  async recalculateCartTotals(
    tx: PrismaTransactionClient,
    storeId: number,
    cartId: number,
  ) {
    // Get current cart to read currency_code, discount_total, and shipping_total
    const currentCart = await (tx as any).cart.findFirst({
      where: { id: cartId, store_id: storeId },
    });

    // Resolve currency scale from the cart's currency_code
    const scale = getScale(currentCart?.currency_code ?? "LYD");

    // Get all items in the cart
    const items = await (tx as any).cartItem.findMany({
      where: { cart_id: cartId, store_id: storeId },
    });

    // Calculate line totals with proper rounding via Money.multiply
    const lineTotals: Prisma.Decimal[] = items.map(
      (item: { unit_price: Prisma.Decimal; quantity: number }) =>
        Money.multiply(
          new Prisma.Decimal(item.unit_price.toString()),
          item.quantity,
          scale,
        ),
    );

    // Subtotal = sum of rounded line totals
    const subtotal = Money.sum(lineTotals);

    const discountTotal = currentCart
      ? Money.round(
          new Prisma.Decimal(currentCart.discount_total.toString()),
          scale,
        )
      : Money.zero();
    const shippingTotal = currentCart
      ? Money.round(
          new Prisma.Decimal(currentCart.shipping_total.toString()),
          scale,
        )
      : Money.zero();

    // grand_total = max(subtotal - discount_total + shipping_total, 0), rounded to scale
    const grandTotal = Money.max(
      Money.round(subtotal.sub(discountTotal).add(shippingTotal), scale),
      Money.zero(),
    );

    // Update cart totals
    const updatedCart = await (tx as any).cart.update({
      where: { id_store_id: { id: cartId, store_id: storeId } },
      data: {
        subtotal,
        grand_total: grandTotal,
      },
      include: cartInclude,
    });

    return updatedCart;
  }

  /**
   * Merges a session-based cart into the customer's cart upon login.
   *
   * Scenarios:
   * 1. Session cart exists + customer cart exists: merge items (max quantity, skip inactive/OOS), recalculate, abandon session cart
   * 2. Session cart exists + no customer cart: reassign session cart to customer
   * 3. No session cart: no-op
   *
   * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
   */
  async mergeSessionCartOnLogin(
    storeId: number,
    customerId: number,
    sessionId: string,
  ) {
    // Find the session-based OPEN cart
    const sessionCart = await prisma.cart.findFirst({
      where: {
        store_id: storeId,
        session_id: sessionId,
        status: "OPEN",
      },
      include: {
        items: {
          include: {
            variant: {
              include: { inventory: true, product: true },
            },
          },
        },
      },
    });

    // No session cart → no-op
    if (!sessionCart) {
      return;
    }

    // Find the customer's existing OPEN cart
    const customerCart = await prisma.cart.findFirst({
      where: {
        store_id: storeId,
        customer_id: customerId,
        status: "OPEN",
      },
      include: cartInclude,
    });

    if (!customerCart) {
      // Scenario 2: No customer cart → reassign session cart to customer
      await prisma.cart.update({
        where: { id_store_id: { id: sessionCart.id, store_id: storeId } },
        data: {
          customer_id: customerId,
          session_id: null,
        },
      });
      return;
    }

    // Scenario 1: Both carts exist → merge items within a transaction
    await prisma.$transaction(async (tx) => {
      // Build a map of existing customer cart items by variant_id
      const customerItemMap = new Map<
        number,
        { id: number; quantity: number }
      >();
      for (const item of customerCart.items) {
        customerItemMap.set(item.variant_id, {
          id: item.id,
          quantity: item.quantity,
        });
      }

      // Process each session cart item
      for (const sessionItem of sessionCart.items) {
        const variant = sessionItem.variant;

        // Skip inactive variants
        if (!variant.is_active) {
          continue;
        }

        // Skip out-of-stock variants (when track_inventory is true)
        if (variant.product.track_inventory && variant.inventory) {
          if (variant.inventory.available_quantity <= 0) {
            continue;
          }
        }

        const existingCustomerItem = customerItemMap.get(
          sessionItem.variant_id,
        );

        if (existingCustomerItem) {
          // Duplicate variant: take the MAX of the two quantities, capped at 9999
          const mergedQuantity = Math.min(
            Math.max(existingCustomerItem.quantity, sessionItem.quantity),
            MAX_ITEM_QUANTITY,
          );

          const unitPrice = variant.price ?? variant.product.base_price;
          const totalPrice = new Prisma.Decimal(unitPrice.toString()).mul(
            mergedQuantity,
          );

          await (tx as any).cartItem.update({
            where: { id: existingCustomerItem.id },
            data: {
              quantity: mergedQuantity,
              unit_price: unitPrice,
              total_price: totalPrice,
            },
          });
        } else {
          // New variant: add to customer cart
          const unitPrice = variant.price ?? variant.product.base_price;
          const totalPrice = new Prisma.Decimal(unitPrice.toString()).mul(
            sessionItem.quantity,
          );

          await (tx as any).cartItem.create({
            data: {
              store_id: storeId,
              cart_id: customerCart.id,
              product_id: sessionItem.product_id,
              variant_id: sessionItem.variant_id,
              quantity: Math.min(sessionItem.quantity, MAX_ITEM_QUANTITY),
              unit_price: unitPrice,
              total_price: totalPrice,
            },
          });
        }
      }

      // Recalculate customer cart totals
      await this.recalculateCartTotals(
        tx as PrismaTransactionClient,
        storeId,
        customerCart.id,
      );

      // Set session cart to ABANDONED
      await (tx as any).cart.update({
        where: { id_store_id: { id: sessionCart.id, store_id: storeId } },
        data: { status: "ABANDONED" },
      });
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Finds an existing OPEN cart for the given identifier (customer or session).
   */
  private async findOpenCart(
    storeId: number,
    customerId?: number,
    sessionId?: string,
  ) {
    if (customerId) {
      return prisma.cart.findFirst({
        where: {
          store_id: storeId,
          customer_id: customerId,
          status: "OPEN",
        },
        include: cartInclude,
      });
    }

    if (sessionId) {
      return prisma.cart.findFirst({
        where: {
          store_id: storeId,
          session_id: sessionId,
          status: "OPEN",
        },
        include: cartInclude,
      });
    }

    return null;
  }
}

export const storefrontCartService = new StorefrontCartService();
