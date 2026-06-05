/**
 * Order Tags Slice
 *
 * Caches the active store's tag definitions for the picker, the filter, and
 * the settings page. This slice does NOT track per-order assignments — those
 * live on `orders.slice` (`currentOrder.tags` and `items[].tags`) and are
 * refreshed by the order thunks after a successful assignment mutation.
 *
 * `countsLoaded` flips to `true` when the most recent fetch was made with
 * `with_counts=true` so the settings page can avoid re-fetching unnecessarily.
 */

import { createSlice } from "@reduxjs/toolkit";
import type { OrderTag } from "@/types/orderTag.types";
import {
  bulkAddOrderTags,
  bulkRemoveOrderTags,
  createOrderTag,
  deleteOrderTag,
  fetchOrderTags,
  replaceOrderTagsForOrder,
  updateOrderTag,
} from "./orderTags.thunks";

export interface OrderTagsState {
  tags: OrderTag[];
  loading: boolean;
  error: string | null;
  /**
   * `true` after the first `fetchOrderTags` call settles (fulfilled OR
   * rejected), regardless of whether the resulting list is empty. Components
   * use this to gate their lazy-fetch effects so an empty store does not
   * trigger an infinite re-fetch loop (an empty `tags` array would keep
   * `tags.length === 0` true forever and the effect would re-fire).
   */
  loaded: boolean;
  /** `true` after a fetch with `with_counts=true` (e.g. on the settings page). */
  countsLoaded: boolean;
}

const initialState: OrderTagsState = {
  tags: [],
  loading: false,
  error: null,
  loaded: false,
  countsLoaded: false,
};

const orderTagsSlice = createSlice({
  name: "orderTags",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchOrderTags
      .addCase(fetchOrderTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderTags.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.tags = action.payload.tags;
        // Only flip the flag on success when counts were actually requested.
        // A subsequent counts-less fetch must NOT downgrade `countsLoaded`,
        // since the cached counts are still accurate until a CUD operation.
        if (action.payload.countsLoaded) {
          state.countsLoaded = true;
        }
      })
      .addCase(fetchOrderTags.rejected, (state, action) => {
        state.loading = false;
        // Mark as loaded even on failure so consumers don't infinite-retry
        // a failing endpoint. Surfacing the error keeps the user informed.
        state.loaded = true;
        state.error = (action.payload as string) ?? "Failed to fetch tags";
      })
      // createOrderTag
      .addCase(createOrderTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrderTag.fulfilled, (state, action) => {
        state.loading = false;
        state.tags.push(action.payload);
        // New tag has no assignments yet, so any cached counts are still
        // valid — leave `countsLoaded` alone.
      })
      .addCase(createOrderTag.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to create tag";
      })
      // updateOrderTag
      .addCase(updateOrderTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderTag.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tags.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          // Preserve `assignment_count` when the server response omits it.
          const previous = state.tags[index];
          state.tags[index] = {
            ...previous,
            ...action.payload,
            assignment_count:
              action.payload.assignment_count ?? previous.assignment_count,
          };
        }
      })
      .addCase(updateOrderTag.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to update tag";
      })
      // deleteOrderTag
      .addCase(deleteOrderTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrderTag.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = state.tags.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteOrderTag.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to delete tag";
      })
      // Assignment thunks intentionally do NOT mutate `tags`. They affect
      // `orders.slice` (currentOrder + items) which is refreshed by the
      // calling component via the existing order thunks. We still reset the
      // `error` flag so a previous error doesn't linger across UIs.
      .addCase(replaceOrderTagsForOrder.pending, (state) => {
        state.error = null;
      })
      .addCase(replaceOrderTagsForOrder.rejected, (state, action) => {
        state.error =
          (action.payload as string) ?? "Failed to update order tags";
      })
      .addCase(bulkAddOrderTags.pending, (state) => {
        state.error = null;
      })
      .addCase(bulkAddOrderTags.rejected, (state, action) => {
        state.error = (action.payload as string) ?? "Failed to bulk-add tags";
      })
      .addCase(bulkRemoveOrderTags.pending, (state) => {
        state.error = null;
      })
      .addCase(bulkRemoveOrderTags.rejected, (state, action) => {
        state.error =
          (action.payload as string) ?? "Failed to bulk-remove tags";
      });
  },
});

export const { reset: resetOrderTags } = orderTagsSlice.actions;
export default orderTagsSlice.reducer;
