import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

import authReducer from "./slices/auth.slice";
import productsReducer from "./slices/products.slice";
import ordersReducer from "./slices/orders.slice";
import orderTagsReducer from "./slices/orderTags.slice";
import eligibleAssigneesReducer from "./slices/eligibleAssignees.slice";
import categoriesReducer from "./slices/categories.slice";
import customersReducer from "./slices/customers.slice";
import couponsReducer from "./slices/coupons.slice";
import inventoryReducer from "./slices/inventory.slice";
import membersReducer from "./slices/members.slice";
import platformReducer from "./slices/platform.slice";
import uiReducer from "./slices/ui.slice";
import cartReducer from "./slices/cart.slice";
import tablePreferencesReducer from "./slices/tablePreferences.slice";

const rootReducer = combineReducers({
  auth: authReducer,
  products: productsReducer,
  orders: ordersReducer,
  orderTags: orderTagsReducer,
  eligibleAssignees: eligibleAssigneesReducer,
  categories: categoriesReducer,
  customers: customersReducer,
  coupons: couponsReducer,
  inventory: inventoryReducer,
  members: membersReducer,
  platform: platformReducer,
  ui: uiReducer,
  cart: cartReducer,
  tablePreferences: tablePreferencesReducer,
});

/**
 * redux-persist config: only the `tablePreferences` slice is persisted to
 * localStorage. All other slices remain ephemeral, matching their existing
 * runtime behavior.
 */
const persistConfig = {
  key: "root",
  version: 1,
  storage,
  whitelist: ["tablePreferences"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serializable actions internally;
        // ignore them so the default check stays useful for our own actions.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
