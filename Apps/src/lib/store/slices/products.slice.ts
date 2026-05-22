import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PaginationMeta, Product, ProductStatus } from "@/types";
import type { CacheEntry } from "../cache";
import { createCacheEntry } from "../cache";
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  changeProductStatus,
} from "./products.thunks";

export interface ProductsState {
  items: Product[];
  currentProduct: Product | null;
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  _rollbackSnapshot: Product[] | null;
  listCache: CacheEntry<{ data: Product[]; meta: PaginationMeta }> | null;
}

const initialState: ProductsState = {
  items: [],
  currentProduct: null,
  meta: null,
  loading: false,
  error: null,
  _rollbackSnapshot: null,
  listCache: null,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    reset: () => initialState,
    invalidateListCache(state) {
      state.listCache = null;
    },
    optimisticDelete(state, action: PayloadAction<number>) {
      state._rollbackSnapshot = state.items;
      state.items = state.items.filter((p) => p.id !== action.payload);
    },
    optimisticStatusChange(
      state,
      action: PayloadAction<{ id: number; status: ProductStatus }>,
    ) {
      state._rollbackSnapshot = state.items;
      const index = state.items.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = {
          ...state.items[index],
          status: action.payload.status,
        };
      }
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
      // fetchProducts
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
        state.listCache = createCacheEntry(
          { data: action.payload.data, meta: action.payload.meta },
          action.meta.arg.params,
        );
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchProductById
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createProduct
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateProduct
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentProduct?.id === action.payload.id) {
          state.currentProduct = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteProduct
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.listCache = null;

        const { productId, action: deleteAction, product } = action.payload;
        state.items = state.items.filter((p) => p.id !== productId);
        if (state.currentProduct?.id === productId) {
          state.currentProduct =
            deleteAction === "archived" && product ? product : null;
        }
      })
      .addCase(deleteProduct.rejected, (state) => {
        state.loading = false;
      })
      // changeProductStatus
      .addCase(changeProductStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeProductStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.listCache = null;

        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }

        if (state.currentProduct?.id === action.payload.id) {
          state.currentProduct = action.payload;
        }
      })
      .addCase(changeProductStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  reset: resetProducts,
  invalidateListCache: invalidateProductsListCache,
  optimisticDelete: optimisticDeleteProduct,
  optimisticStatusChange: optimisticProductStatusChange,
  rollback: rollbackProducts,
} = productsSlice.actions;
export default productsSlice.reducer;
