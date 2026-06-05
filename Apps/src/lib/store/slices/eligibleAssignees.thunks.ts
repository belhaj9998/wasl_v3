/**
 * Eligible Assignees Thunks
 *
 * Async actions wrapping `orderService.getEligibleAssignees` for the
 * `eligibleAssignees` slice. The list of eligible assignees changes rarely
 * (only when store membership changes), so `fetchEligibleAssignees` is
 * idempotent with a 60s TTL: a `condition` guard short-circuits the dispatch
 * when the per-store cache is still fresh, avoiding redundant network calls
 * when several surfaces (the order detail card, the list filter) mount at the
 * same time.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { orderService } from "@/lib/api/services/order.service";
import type { EligibleAssignee } from "@/types";
// Type-only import — erased at compile time, so it introduces no runtime
// circular dependency with `store.ts` (which imports this slice's reducer).
import type { RootState } from "../store";

/** Time-to-live for the per-store eligible-assignees cache (60 seconds). */
const ELIGIBLE_ASSIGNEES_TTL_MS = 60_000;

/**
 * GET /api/stores/:storeId/orders/assignees
 *
 * Fetches the active store members eligible to be assigned an order. Skips the
 * network call when a fresh (< 60s) cache exists for the same `storeId`.
 */
export const fetchEligibleAssignees = createAsyncThunk<
  { assignees: EligibleAssignee[] },
  number,
  { state: RootState; rejectValue: string }
>(
  "eligibleAssignees/fetch",
  async (storeId, { rejectWithValue }) => {
    try {
      const response = await orderService.getEligibleAssignees(storeId);
      return { assignees: response.data.assignees };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch eligible assignees";
      return rejectWithValue(message);
    }
  },
  {
    condition: (storeId, { getState }) => {
      const entry = getState().eligibleAssignees.byStore[storeId];
      if (!entry) return true;
      // Skip when the cache is fresh and no fetch is already settled-in-flight.
      const isFresh =
        entry.loadedAt !== null &&
        Date.now() - entry.loadedAt < ELIGIBLE_ASSIGNEES_TTL_MS;
      if (isFresh && !entry.loading) {
        return false;
      }
      return true;
    },
  },
);
