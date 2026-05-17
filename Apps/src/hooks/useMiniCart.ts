"use client";

/**
 * useMiniCart Hook
 * Manages the mini-cart popup state. Provides a way to show/hide the popup
 * when an item is added to the cart.
 * Uses a simple event-based approach via a global store to avoid prop drilling.
 * Requirements: 8.3
 */

import { useCallback, useSyncExternalStore } from "react";

export interface MiniCartItem {
  productName: string;
  quantity: number;
  price: string;
}

interface MiniCartState {
  item: MiniCartItem | null;
  visible: boolean;
}

// Simple external store for mini-cart state
let miniCartState: MiniCartState = { item: null, visible: false };
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MiniCartState {
  return miniCartState;
}

function getServerSnapshot(): MiniCartState {
  return { item: null, visible: false };
}

/**
 * Show the mini-cart popup with the given item details.
 * Can be called from anywhere (thunks, components, etc.)
 */
export function showMiniCart(item: MiniCartItem) {
  miniCartState = { item, visible: true };
  emitChange();
}

/**
 * Hide the mini-cart popup.
 */
export function hideMiniCart() {
  miniCartState = { item: null, visible: false };
  emitChange();
}

/**
 * Hook to consume mini-cart state in components.
 */
export function useMiniCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const hide = useCallback(() => {
    hideMiniCart();
  }, []);

  return {
    item: state.item,
    visible: state.visible,
    hide,
  };
}
