"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor } from "@/lib/store/store";

interface ReduxProviderProps {
  children: React.ReactNode;
}

/**
 * Mounts the Redux store and the redux-persist gate.
 *
 * `loading={null}` keeps the first server-rendered HTML SSR-safe: the gated
 * subtree renders nothing on the server. On the client, redux-persist reads
 * `localStorage`, rehydrates the `tablePreferences` slice, and then renders
 * the app. Any rehydration failure is swallowed by redux-persist and the
 * slice falls back to its initial state.
 */
export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
