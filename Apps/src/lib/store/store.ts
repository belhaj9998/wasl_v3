import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/auth.slice";
import productsReducer from "./slices/products.slice";
import ordersReducer from "./slices/orders.slice";
import categoriesReducer from "./slices/categories.slice";
import customersReducer from "./slices/customers.slice";
import couponsReducer from "./slices/coupons.slice";
import inventoryReducer from "./slices/inventory.slice";
import membersReducer from "./slices/members.slice";
import platformReducer from "./slices/platform.slice";
import uiReducer from "./slices/ui.slice";
import cartReducer from "./slices/cart.slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    orders: ordersReducer,
    categories: categoriesReducer,
    customers: customersReducer,
    coupons: couponsReducer,
    inventory: inventoryReducer,
    members: membersReducer,
    platform: platformReducer,
    ui: uiReducer,
    cart: cartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
