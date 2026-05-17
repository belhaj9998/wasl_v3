/**
 * Reset Store Data
 * Thunk that clears all store-specific slices, cancels pending API requests,
 * and resets cache timestamps when the user switches stores.
 *
 * Requirements: 4.5
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { abortAllPendingRequests } from "@/lib/api/abortRegistry";
import { resetProducts } from "./slices/products.slice";
import { resetOrders } from "./slices/orders.slice";
import { resetCategories } from "./slices/categories.slice";
import { resetCustomers } from "./slices/customers.slice";
import { resetCoupons } from "./slices/coupons.slice";
import { resetInventory } from "./slices/inventory.slice";
import { resetMembers } from "./slices/members.slice";

/**
 * Resets all store-scoped data when switching between stores.
 *
 * This thunk performs three operations:
 * 1. Cancels all pending API requests (via AbortController registry)
 * 2. Dispatches reset actions for all store-specific slices
 *    (products, orders, categories, customers, coupons, inventory, members)
 * 3. Cache timestamps are implicitly reset because each slice's reset action
 *    returns initialState which sets listCache to null
 */
export const resetStoreData = createAsyncThunk<void, void>(
  "store/resetData",
  async (_, { dispatch }) => {
    // 1. Cancel all pending API requests for the previous store
    abortAllPendingRequests();

    // 2. Reset all store-specific slices (this also resets cache timestamps
    //    since initialState has listCache: null)
    dispatch(resetProducts());
    dispatch(resetOrders());
    dispatch(resetCategories());
    dispatch(resetCustomers());
    dispatch(resetCoupons());
    dispatch(resetInventory());
    dispatch(resetMembers());
  },
);
