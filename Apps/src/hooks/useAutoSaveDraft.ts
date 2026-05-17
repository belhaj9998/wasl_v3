/**
 * Auto-Save Draft Hook
 * Saves form data to localStorage periodically when changes exist.
 * Provides draft restoration and cleanup utilities.
 *
 * Requirements: 6.3
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormWatch } from "react-hook-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftEntry<T = Record<string, unknown>> {
  formId: string;
  data: T;
  savedAt: number;
}

interface UseAutoSaveDraftOptions {
  /** Interval in milliseconds between auto-save checks. Default: 30000 (30s) */
  interval?: number;
}

interface UseAutoSaveDraftReturn<T> {
  /** Whether a draft exists in localStorage for this formId */
  hasDraft: boolean;
  /** The saved draft data, or null if no draft exists */
  draftData: T | null;
  /** Restore the draft (returns the saved data for use with form reset) */
  restoreDraft: () => T | null;
  /** Clear the draft from localStorage (call after successful submit) */
  clearDraft: () => void;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const DRAFT_PREFIX = "wasl_draft_";

function getDraftKey(formId: string): string {
  return `${DRAFT_PREFIX}${formId}`;
}

function loadDraft<T>(formId: string): DraftEntry<T> | null {
  try {
    const raw = localStorage.getItem(getDraftKey(formId));
    if (!raw) return null;
    const entry = JSON.parse(raw) as DraftEntry<T>;
    // Basic validation
    if (entry && entry.formId === formId && entry.data && entry.savedAt) {
      return entry;
    }
    return null;
  } catch {
    return null;
  }
}

function saveDraft<T>(formId: string, data: T): void {
  try {
    const entry: DraftEntry<T> = {
      formId,
      data,
      savedAt: Date.now(),
    };
    localStorage.setItem(getDraftKey(formId), JSON.stringify(entry));
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

function removeDraft(formId: string): void {
  try {
    localStorage.removeItem(getDraftKey(formId));
  } catch {
    // Silently ignore
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook that auto-saves form data to localStorage every `interval` ms when
 * the form has changes. On mount, checks if a draft exists and exposes it.
 *
 * @param formId - Unique identifier for this form's draft
 * @param watch - The `watch` function from React Hook Form
 * @param options - Optional configuration (interval)
 * @returns Draft state and control functions
 *
 * @example
 * ```tsx
 * const { hasDraft, draftData, restoreDraft, clearDraft } = useAutoSaveDraft(
 *   'product-create',
 *   watch,
 * );
 *
 * // On successful submit:
 * clearDraft();
 *
 * // To restore:
 * if (hasDraft) {
 *   const data = restoreDraft();
 *   if (data) reset(data);
 * }
 * ```
 */
export function useAutoSaveDraft<T extends FieldValues = FieldValues>(
  formId: string,
  watch: UseFormWatch<T>,
  options?: UseAutoSaveDraftOptions,
): UseAutoSaveDraftReturn<T> {
  const { interval = 30000 } = options ?? {};

  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<T | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  // On mount, check for existing draft
  useEffect(() => {
    const existing = loadDraft<T>(formId);
    if (existing) {
      setHasDraft(true);
      setDraftData(existing.data);
    }
  }, [formId]);

  // Auto-save on interval
  useEffect(() => {
    const timer = setInterval(() => {
      const currentData = watch();
      const serialized = JSON.stringify(currentData);

      // Only save if data has changed since last save
      if (serialized !== lastSavedRef.current) {
        saveDraft(formId, currentData);
        lastSavedRef.current = serialized;
      }
    }, interval);

    return () => clearInterval(timer);
  }, [formId, watch, interval]);

  const restoreDraft = useCallback((): T | null => {
    const existing = loadDraft<T>(formId);
    if (existing) {
      return existing.data;
    }
    return null;
  }, [formId]);

  const clearDraft = useCallback((): void => {
    removeDraft(formId);
    setHasDraft(false);
    setDraftData(null);
    lastSavedRef.current = null;
  }, [formId]);

  return {
    hasDraft,
    draftData,
    restoreDraft,
    clearDraft,
  };
}
