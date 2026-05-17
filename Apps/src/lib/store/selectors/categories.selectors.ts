import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import type { Category } from "@/types";

/**
 * Base selectors
 */
const selectCategoriesState = (state: RootState) => state.categories;
const selectCategoryItems = (state: RootState) => state.categories.items;

/**
 * Select root categories (parent_id === null)
 */
export const selectRootCategories = createSelector(
  [selectCategoryItems],
  (items) => items.filter((c) => c.parent_id === null),
);

/**
 * Select a single category by ID (searches tree recursively)
 */
export const selectCategoryById = createSelector(
  [selectCategoryItems, (_: RootState, categoryId: number) => categoryId],
  (items, categoryId) => findCategoryInTree(items, categoryId),
);

/**
 * Select categories loading state
 */
export const selectCategoriesLoading = createSelector(
  [selectCategoriesState],
  (state) => state.loading,
);

/**
 * Select categories error
 */
export const selectCategoriesError = createSelector(
  [selectCategoriesState],
  (state) => state.error,
);

/**
 * Helper: recursively find a category in a tree structure
 */
function findCategoryInTree(items: Category[], id: number): Category | null {
  for (const cat of items) {
    if (cat.id === id) return cat;
    if (cat.children) {
      const found = findCategoryInTree(cat.children, id);
      if (found) return found;
    }
  }
  return null;
}
