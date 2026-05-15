import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartItem, AppliedCoupon } from "@/types";
import type { RootState } from "../store";
import {
  addToCartThunk,
  updateCartItemThunk,
  removeCartItemThunk,
  applyCouponThunk,
  removeCouponThunk,
} from "./cart.thunks";

export interface CartState {
  items: CartItem[];
  subtotal: string;
  discount_amount: string;
  total: string;
  coupon: AppliedCoupon | null;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  subtotal: "0",
  discount_amount: "0",
  total: "0",
  coupon: null,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItemOptimistic(state, action: PayloadAction<CartItem>) {
      const existingItem = state.items.find(
        (item) =>
          item.variant_id === action.payload.variant_id &&
          item.product_id === action.payload.product_id,
      );
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItemOptimistic(state, action: PayloadAction<number>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateQuantityOptimistic(
      state,
      action: PayloadAction<{ itemId: number; quantity: number }>,
    ) {
      const item = state.items.find((i) => i.id === action.payload.itemId);
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },
    setCart(state, action: PayloadAction<CartState>) {
      state.items = action.payload.items;
      state.subtotal = action.payload.subtotal;
      state.discount_amount = action.payload.discount_amount;
      state.total = action.payload.total;
      state.coupon = action.payload.coupon;
    },
    reset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // addToCartThunk
    builder
      .addCase(addToCartThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCartThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addToCartThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Failed to add item to cart";
      });

    // updateCartItemThunk
    builder
      .addCase(updateCartItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItemThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateCartItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Failed to update cart item";
      });

    // removeCartItemThunk
    builder
      .addCase(removeCartItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCartItemThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(removeCartItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Failed to remove cart item";
      });

    // applyCouponThunk
    builder
      .addCase(applyCouponThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyCouponThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(applyCouponThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to apply coupon";
      });

    // removeCouponThunk
    builder
      .addCase(removeCouponThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCouponThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(removeCouponThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to remove coupon";
      });
  },
});

export const {
  addItemOptimistic,
  removeItemOptimistic,
  updateQuantityOptimistic,
  setCart,
  reset,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartSubtotal = (state: RootState) => state.cart.subtotal;
export const selectCartDiscount = (state: RootState) =>
  state.cart.discount_amount;
export const selectCartTotal = (state: RootState) => state.cart.total;
export const selectCartCoupon = (state: RootState) => state.cart.coupon;
export const selectCartLoading = (state: RootState) => state.cart.loading;
export const selectCartError = (state: RootState) => state.cart.error;
export const selectCartItemCount = (state: RootState) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartItemQuantity = (state: RootState, itemId: number) =>
  state.cart.items.find((item) => item.id === itemId)?.quantity ?? 0;

export default cartSlice.reducer;
