/**
 * Eligible Assignees Slice
 *
 * Caches, per store, the list of active members eligible to be set as an
 * order's assignee. The cache is keyed by `storeId` so multiple stores can be
 * held simultaneously (e.g. when an admin switches between stores). Each entry
 * tracks its own `loadedAt` timestamp, which the `fetchEligibleAssignees`
 * thunk uses to short-circuit redundant fetches within a 60s TTL.
 *
 * This slice is NOT persisted — it lives only for the runtime session.
 */

import { createSlice } from "@reduxjs/toolkit";
import type { EligibleAssignee } from "@/types";
import { fetchEligibleAssignees } from "./eligibleAssignees.thunks";

interface EligibleAssigneesStoreEntry {
  items: EligibleAssignee[];
  loadedAt: number | null;
  loading: boolean;
  error: string | null;
}

export interface EligibleAssigneesState {
  /** Per-store cache; key is storeId. */
  byStore: Record<number, EligibleAssigneesStoreEntry>;
}

const initialState: EligibleAssigneesState = {
  byStore: {},
};

/** Lazily create (or return) the cache entry for a store. */
function ensureEntry(
  state: EligibleAssigneesState,
  storeId: number,
): EligibleAssigneesStoreEntry {
  let entry = state.byStore[storeId];
  if (!entry) {
    entry = { items: [], loadedAt: null, loading: false, error: null };
    state.byStore[storeId] = entry;
  }
  return entry;
}

const eligibleAssigneesSlice = createSlice({
  name: "eligibleAssignees",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEligibleAssignees.pending, (state, action) => {
        // `action.meta.arg` is the storeId passed to the thunk.
        const entry = ensureEntry(state, action.meta.arg);
        entry.loading = true;
        entry.error = null;
      })
      .addCase(fetchEligibleAssignees.fulfilled, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg);
        entry.items = action.payload.assignees;
        entry.loadedAt = Date.now();
        entry.loading = false;
        entry.error = null;
      })
      .addCase(fetchEligibleAssignees.rejected, (state, action) => {
        const entry = ensureEntry(state, action.meta.arg);
        entry.loading = false;
        entry.error =
          (action.payload as string) ??
          action.error.message ??
          "Failed to fetch eligible assignees";
      });
  },
});

export const { reset: resetEligibleAssignees } = eligibleAssigneesSlice.actions;
export default eligibleAssigneesSlice.reducer;
