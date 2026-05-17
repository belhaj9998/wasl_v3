/**
 * Custom Hooks - Barrel Export
 */

export {
  usePermission,
  usePermissions,
  useHasAnyPermission,
} from "./usePermission";
export { useAuth } from "./useAuth";
export { useStore } from "./useStore";
export { usePagination } from "./usePagination";
export { useTheme } from "./useTheme";
export type { Theme } from "./useTheme";
export { useFocusTrap, getFocusableElements } from "./useFocusTrap";
export { useUnsavedChanges } from "./useUnsavedChanges";
export type { UseUnsavedChangesOptions } from "./useUnsavedChanges";
export { useSubmitDebounce } from "./useSubmitDebounce";
export { useAutoSaveDraft } from "./useAutoSaveDraft";
export { useNotifications } from "./useNotifications";
export { useSessionValidator } from "./useSessionValidator";
export { useStoreSubscription } from "@/lib/providers/StoreSubscriptionProvider";
