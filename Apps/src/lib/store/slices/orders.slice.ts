import { createSlice } from "@reduxjs/toolkit";
import type {
  AssignedUserSummary,
  Order,
  OrderSource,
  OrderStatus,
  PaginationMeta,
} from "@/types";
import {
  fetchOrders,
  fetchOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  addOrderNote,
  fetchOrderCounts,
  fetchOrderKpis,
  assignOrderAssignee,
  updateOrderSource,
} from "./orders.thunks";
import type { OrderKpisResponse } from "@/lib/api/services/order.service";

/**
 * Order counts payload returned by GET /orders/stats/counts.
 * `total` equals the sum of `by_status` values.
 * `by_status` always contains exactly the 11 ShipmentStatus keys.
 */
export interface OrderCounts {
  total: number;
  by_status: Record<OrderStatus, number>;
}

export interface OrdersState {
  items: Order[];
  currentOrder: Order | null;
  meta: PaginationMeta | null;
  // List loading/error — driven by fetchOrders only
  loading: boolean;
  error: string | null;
  // Single-order loading/error — driven by fetchOrderById (and mutations on
  // the single order). Kept separate from list flags so a failed Quick View
  // fetch does NOT replace the orders list with an error screen.
  currentOrderLoading: boolean;
  currentOrderError: string | null;
  // Status tabs counts
  counts: OrderCounts | null;
  countsLoading: boolean;
  countsError: string | null;
  // KPI cards (today's orders count/revenue/AOV + all-time pending count)
  kpis: OrderKpisResponse | null;
  kpisLoading: boolean;
  kpisError: string | null;
  // Assignee mutation (assignOrderAssignee). `assigneeError` holds the last
  // assignment error string (component maps it to a localized toast).
  // `assigneePrevById` stashes the pre-optimistic `assigned_user` per orderId
  // so a rejected assignment can be reverted. Kept as a plain serializable
  // Record (no Map) to satisfy Redux's serializable-state checks.
  assigneeError: string | null;
  assigneePrevById: Record<number, AssignedUserSummary | null>;
  sourceError: string | null;
  sourcePrevById: Record<number, OrderSource>;
}

const initialState: OrdersState = {
  items: [],
  currentOrder: null,
  meta: null,
  loading: false,
  error: null,
  currentOrderLoading: false,
  currentOrderError: null,
  counts: null,
  countsLoading: false,
  countsError: null,
  kpis: null,
  kpisLoading: false,
  kpisError: null,
  assigneeError: null,
  assigneePrevById: {},
  sourceError: null,
  sourcePrevById: {},
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchOrders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchOrderById — uses currentOrder* flags so Quick View errors do NOT
      // bleed into the orders list error UI
      .addCase(fetchOrderById.pending, (state) => {
        state.currentOrderLoading = true;
        state.currentOrderError = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.currentOrderLoading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.currentOrderLoading = false;
        state.currentOrderError = action.payload as string;
      })
      // createOrder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateOrderStatus
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateOrderSource — optimistic update with revert-on-reject.
      .addCase(updateOrderSource.pending, (state, action) => {
        const { orderId, payload } = action.meta.arg;
        state.sourceError = null;

        const item = state.items.find((o) => o.id === orderId);
        const previous =
          item?.source ??
          (state.currentOrder?.id === orderId
            ? state.currentOrder.source
            : undefined);

        if (previous !== undefined) {
          state.sourcePrevById[orderId] = previous;
        }

        if (item) {
          item.source = payload.source;
        }
        if (state.currentOrder?.id === orderId) {
          state.currentOrder.source = payload.source;
        }
      })
      .addCase(updateOrderSource.fulfilled, (state, action) => {
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
        state.sourceError = null;
        delete state.sourcePrevById[action.payload.id];
      })
      .addCase(updateOrderSource.rejected, (state, action) => {
        const { orderId } = action.meta.arg;
        if (orderId in state.sourcePrevById) {
          const previous = state.sourcePrevById[orderId];
          const item = state.items.find((o) => o.id === orderId);
          if (item) {
            item.source = previous;
          }
          if (state.currentOrder?.id === orderId) {
            state.currentOrder.source = previous;
          }
          delete state.sourcePrevById[orderId];
        }
        state.sourceError =
          (action.payload as string) ?? "Failed to update source";
      })
      // cancelOrder
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addOrderNote
      .addCase(addOrderNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addOrderNote.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentOrder?.id === action.payload.orderId) {
          state.currentOrder.internal_notes.push(action.payload.note);
        }
      })
      .addCase(addOrderNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchOrderCounts — sticky behavior: keep previous counts on pending/rejected
      .addCase(fetchOrderCounts.pending, (state) => {
        state.countsLoading = true;
        // Do NOT clear `counts` — keep previous values during refetch
      })
      .addCase(fetchOrderCounts.fulfilled, (state, action) => {
        state.countsLoading = false;
        state.countsError = null;
        state.counts = action.payload;
      })
      .addCase(fetchOrderCounts.rejected, (state, action) => {
        state.countsLoading = false;
        state.countsError =
          (action.payload as string) ?? "Failed to fetch counts";
        // Do NOT clear `counts` — keep previous values on error
      })
      .addCase(fetchOrderKpis.pending, (state) => {
        state.kpisLoading = true;
      })
      .addCase(fetchOrderKpis.fulfilled, (state, action) => {
        state.kpisLoading = false;
        state.kpisError = null;
        state.kpis = action.payload;
      })
      .addCase(fetchOrderKpis.rejected, (state, action) => {
        state.kpisLoading = false;
        state.kpisError = (action.payload as string) ?? "Failed to fetch KPIs";
      })
      // assignOrderAssignee — optimistic update with revert-on-reject.
      // `assigned_user` is NOT stored separately; it lives on Order.assigned_user
      // and is kept current here (and by fetchOrderById).
      .addCase(assignOrderAssignee.pending, (state, action) => {
        const { orderId, optimisticAssignee } = action.meta.arg;
        state.assigneeError = null;
        // Only apply an optimistic value when the caller provided one.
        if (optimisticAssignee === undefined) return;

        const item = state.items.find((o) => o.id === orderId);
        // Stash the previous value (prefer the list row, fall back to the
        // current order) so a rejection can restore it precisely.
        const previous =
          item?.assigned_user ??
          (state.currentOrder?.id === orderId
            ? state.currentOrder.assigned_user
            : null);
        state.assigneePrevById[orderId] = previous ?? null;

        if (item) {
          item.assigned_user = optimisticAssignee;
        }
        if (state.currentOrder?.id === orderId) {
          state.currentOrder.assigned_user = optimisticAssignee;
        }
      })
      .addCase(assignOrderAssignee.fulfilled, (state, action) => {
        // Server value wins: replace the whole order DTO (its `assigned_user`
        // and `timeline` are authoritative).
        const index = state.items.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
        state.assigneeError = null;
        delete state.assigneePrevById[action.payload.id];
      })
      .addCase(assignOrderAssignee.rejected, (state, action) => {
        const { orderId } = action.meta.arg;
        // Revert the optimistic update if we stashed a previous value.
        if (orderId in state.assigneePrevById) {
          const previous = state.assigneePrevById[orderId];
          const item = state.items.find((o) => o.id === orderId);
          if (item) {
            item.assigned_user = previous;
          }
          if (state.currentOrder?.id === orderId) {
            state.currentOrder.assigned_user = previous;
          }
          delete state.assigneePrevById[orderId];
        }
        state.assigneeError =
          (action.payload as string) ?? "Failed to assign order";
      });
  },
});

export const { reset: resetOrders } = ordersSlice.actions;
export default ordersSlice.reducer;
