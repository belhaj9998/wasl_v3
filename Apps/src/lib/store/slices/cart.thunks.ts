import { createAsyncThunk } from "@reduxjs/toolkit";
import { storefrontService } from "@/lib/api/services/storefront.service";
import type { CartItem } from "@/types";
import type { RootState } from "../store";
import type { CartState } from "./cart.slice";

// --- Thunk argument types ---

interface AddToCartArgs {
  domain: string;
  productId: number;
  variantId: number;
  quantity: number;
}

interface UpdateCartItemArgs {
  domain: string;
  itemId: number;
  quantity: number;
}

interface RemoveCartItemArgs {
  domain: string;
  itemId: number;
}

interface ApplyCouponArgs {
  domain: string;
  code: string;
}

interface RemoveCouponArgs {
  domain: string;
}

// --- Thunks ---

/**
 * Add item to cart with optimistic update.
 * Dispatches addItemOptimistic immediately, then calls API.
 * On rejection, rolls back to pre-operation snapshot via setCart.
 */
export const addToCartThunk = createAsyncThunk<
  void,
  AddToCartArgs,
  { state: RootState; rejectValue: string }
>(
  "cart/addToCart",
  async ({ domain, productId, variantId, quantity }, thunkAPI) => {
    // Snapshot current state before optimistic update
    const snapshot = selectCartSnapshot(thunkAPI.getState());

    // Create optimistic item with temporary ID
    const optimisticItem: CartItem = {
      id: Date.now(),
      product_id: productId,
      variant_id: variantId,
      quantity,
      unit_price: "0",
      total_price: "0",
      product: { name: "Loading...", slug: "", media: [] },
      variant: { title: "", sku: "" },
    };

    // Dispatch optimistic update immediately
    thunkAPI.dispatch({
      type: "cart/addItemOptimistic",
      payload: optimisticItem,
    });

    try {
      const response = await storefrontService.addToCart(domain, {
        product_id: productId,
        variant_id: variantId,
        quantity,
      });

      // Replace optimistic state with server response
      thunkAPI.dispatch({
        type: "cart/setCart",
        payload: mapCartResponse(response.data),
      });
    } catch (error) {
      // Rollback to pre-operation snapshot
      thunkAPI.dispatch({ type: "cart/setCart", payload: snapshot });
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  },
);

/**
 * Update cart item quantity with optimistic update.
 * Dispatches updateQuantityOptimistic immediately, then calls API.
 * On rejection, rolls back to pre-operation snapshot via setCart.
 */
export const updateCartItemThunk = createAsyncThunk<
  void,
  UpdateCartItemArgs,
  { state: RootState; rejectValue: string }
>("cart/updateCartItem", async ({ domain, itemId, quantity }, thunkAPI) => {
  // Snapshot current state before optimistic update
  const snapshot = selectCartSnapshot(thunkAPI.getState());

  // Dispatch optimistic update immediately
  thunkAPI.dispatch({
    type: "cart/updateQuantityOptimistic",
    payload: { itemId, quantity },
  });

  try {
    const response = await storefrontService.updateCartItem(domain, itemId, {
      quantity,
    });

    // Replace optimistic state with server response
    thunkAPI.dispatch({
      type: "cart/setCart",
      payload: mapCartResponse(response.data),
    });
  } catch (error) {
    // Rollback to pre-operation snapshot
    thunkAPI.dispatch({ type: "cart/setCart", payload: snapshot });
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Remove cart item with optimistic update.
 * Dispatches removeItemOptimistic immediately, then calls API.
 * On rejection, rolls back to pre-operation snapshot via setCart.
 */
export const removeCartItemThunk = createAsyncThunk<
  void,
  RemoveCartItemArgs,
  { state: RootState; rejectValue: string }
>("cart/removeCartItem", async ({ domain, itemId }, thunkAPI) => {
  // Snapshot current state before optimistic update
  const snapshot = selectCartSnapshot(thunkAPI.getState());

  // Dispatch optimistic update immediately
  thunkAPI.dispatch({ type: "cart/removeItemOptimistic", payload: itemId });

  try {
    const response = await storefrontService.removeCartItem(domain, itemId);

    // Replace optimistic state with server response
    thunkAPI.dispatch({
      type: "cart/setCart",
      payload: mapCartResponse(response.data),
    });
  } catch (error) {
    // Rollback to pre-operation snapshot
    thunkAPI.dispatch({ type: "cart/setCart", payload: snapshot });
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Apply coupon code to cart.
 * No optimistic update — uses loading state only.
 */
export const applyCouponThunk = createAsyncThunk<
  void,
  ApplyCouponArgs,
  { state: RootState; rejectValue: string }
>("cart/applyCoupon", async ({ domain, code }, thunkAPI) => {
  try {
    const response = await storefrontService.applyCoupon(domain, { code });

    thunkAPI.dispatch({
      type: "cart/setCart",
      payload: mapCartResponse(response.data),
    });
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Remove coupon from cart.
 * No optimistic update — uses loading state only.
 */
export const removeCouponThunk = createAsyncThunk<
  void,
  RemoveCouponArgs,
  { state: RootState; rejectValue: string }
>("cart/removeCoupon", async ({ domain }, thunkAPI) => {
  try {
    const response = await storefrontService.removeCoupon(domain);

    thunkAPI.dispatch({
      type: "cart/setCart",
      payload: mapCartResponse(response.data),
    });
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error));
  }
});

// --- Helpers ---

/**
 * Extract cart state snapshot for rollback purposes.
 */
function selectCartSnapshot(state: RootState): CartState {
  const cart = state.cart;

  return {
    items: [...(cart.items ?? [])],
    subtotal: cart.subtotal ?? "0",
    discount_amount: cart.discount_amount ?? "0",
    total: cart.total ?? "0",
    coupon: cart.coupon ?? null,
    loading: cart.loading ?? false,
    error: cart.error ?? null,
  };
}

/**
 * Map API cart response to CartState shape.
 */
function mapCartResponse(data: unknown): CartState {
  const response = data as {
    cart?: {
      items?: CartItem[];
      subtotal?: string;
      discount_total?: string;
      grand_total?: string;
      coupon?: CartState["coupon"];
    };
  };

  const cart = response.cart ?? {};

  return {
    items: cart.items ?? [],
    subtotal: cart.subtotal ?? "0",
    discount_amount: cart.discount_total ?? "0",
    total: cart.grand_total ?? "0",
    coupon: cart.coupon ?? null,
    loading: false,
    error: null,
  };
}
/**
 * Extract error message from unknown error.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}
