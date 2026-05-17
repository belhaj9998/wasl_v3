import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Category } from "@/types";
import type { CacheEntry } from "../cache";
import { createCacheEntry } from "../cache";
import {
  fetchCategories,
  fetchCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "./categories.thunks";

export interface CategoriesState {
  items: Category[];
  loading: boolean;
  error: string | null;
  _rollbackSnapshot: Category[] | null;
  listCache: CacheEntry<{ data: Category[] }> | null;
}

const initialState: CategoriesState = {
  items: [],
  loading: false,
  error: null,
  _rollbackSnapshot: null,
  listCache: null,
};

/**
 * Helper to remove a category from a tree structure by id.
 */
function removeCategoryFromTree(items: Category[], id: number): Category[] {
  return items
    .filter((cat) => cat.id !== id)
    .map((cat) => ({
      ...cat,
      children: cat.children
        ? removeCategoryFromTree(cat.children, id)
        : undefined,
    }));
}

/**
 * Helper to update a category in a tree structure.
 */
function updateCategoryInTree(
  items: Category[],
  updated: Category,
): Category[] {
  return items.map((cat) => {
    if (cat.id === updated.id) {
      return { ...cat, ...updated };
    }
    if (cat.children) {
      return { ...cat, children: updateCategoryInTree(cat.children, updated) };
    }
    return cat;
  });
}

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    reset: () => initialState,
    invalidateListCache(state) {
      state.listCache = null;
    },
    optimisticDelete(state, action: PayloadAction<number>) {
      state._rollbackSnapshot = state.items;
      state.items = removeCategoryFromTree(state.items, action.payload);
    },
    optimisticStatusChange(
      state,
      action: PayloadAction<{ id: number; is_active: boolean }>,
    ) {
      state._rollbackSnapshot = state.items;
      state.items = updateCategoryInTree(state.items, {
        id: action.payload.id,
        is_active: action.payload.is_active,
      } as Category);
    },
    rollback(state) {
      if (state._rollbackSnapshot) {
        state.items = state._rollbackSnapshot;
        state._rollbackSnapshot = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCategories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.listCache = createCacheEntry(
          { data: action.payload.data },
          action.meta.arg.params,
        );
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchCategoryById
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.items = updateCategoryInTree(state.items, action.payload);
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createCategory
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateCategory
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = updateCategoryInTree(state.items, action.payload);
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteCategory
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = removeCategoryFromTree(state.items, action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // reorderCategories
      .addCase(reorderCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reorderCategories.fulfilled, (state, action) => {
        state.loading = false;
        // Update sort_order for reordered items
        for (const item of action.payload) {
          const cat = state.items.find((c) => c.id === item.id);
          if (cat) {
            cat.sort_order = item.sort_order;
          }
        }
      })
      .addCase(reorderCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  reset: resetCategories,
  invalidateListCache: invalidateCategoriesListCache,
  optimisticDelete: optimisticDeleteCategory,
  optimisticStatusChange: optimisticCategoryStatusChange,
  rollback: rollbackCategories,
} = categoriesSlice.actions;
export default categoriesSlice.reducer;
