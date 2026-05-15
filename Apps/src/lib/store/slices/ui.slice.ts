import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Toast } from "@/types/global.types";

export interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  toasts: Toast[];
  locale: "ar" | "en";
  direction: "rtl" | "ltr";
}

const initialState: UIState = {
  sidebarCollapsed: false,
  activeModal: null,
  toasts: [],
  locale: "ar",
  direction: "rtl",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setLocale(state, action: PayloadAction<"ar" | "en">) {
      state.locale = action.payload;
      state.direction = action.payload === "ar" ? "rtl" : "ltr";
    },
    setDirection(state, action: PayloadAction<"rtl" | "ltr">) {
      state.direction = action.payload;
    },
    addToast(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload);
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setActiveModal(state, action: PayloadAction<string | null>) {
      state.activeModal = action.payload;
    },
    reset: () => initialState,
  },
});

export const {
  toggleSidebar,
  setLocale,
  setDirection,
  addToast,
  removeToast,
  setActiveModal,
  reset: resetUI,
} = uiSlice.actions;
export default uiSlice.reducer;
