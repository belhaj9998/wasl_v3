"use client";

/**
 * DashboardSection — Reusable wrapper for independent dashboard sections.
 *
 * Each section:
 * - Loads data independently (parallel fetch)
 * - Shows a skeleton placeholder while loading
 * - Shows an error message with retry button on failure
 * - Does not affect other sections when it fails
 * - Times out after 10 seconds
 *
 * Requirements: 13.6, 13.7
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTION_TIMEOUT_MS = 10_000; // 10 seconds

export interface DashboardSectionProps<T> {
  /** Async function that fetches the section data */
  fetcher: () => Promise<T>;
  /** Skeleton component to show while loading */
  skeleton: React.ReactNode;
  /** Render function called with the fetched data */
  children: (data: T) => React.ReactNode;
  /** Optional CSS class for the wrapper */
  className?: string;
  /** Optional section title for accessibility */
  "aria-label"?: string;
}

type SectionState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export function DashboardSection<T>({
  fetcher,
  skeleton,
  children,
  className,
  "aria-label": ariaLabel,
}: DashboardSectionProps<T>) {
  const t = useTranslations("dashboard");
  const [state, setState] = useState<SectionState<T>>({ status: "loading" });
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    // Cancel any previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "loading" });

    try {
      const result = await Promise.race([
        fetcher(),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error("TIMEOUT"));
          }, SECTION_TIMEOUT_MS);
          controller.signal.addEventListener("abort", () =>
            clearTimeout(timer),
          );
        }),
      ]);

      if (mountedRef.current && !controller.signal.aborted) {
        setState({ status: "success", data: result });
      }
    } catch (error) {
      if (mountedRef.current && !controller.signal.aborted) {
        const message =
          error instanceof Error && error.message === "TIMEOUT"
            ? t("sectionTimeout")
            : t("sectionError");
        setState({ status: "error", message });
      }
    }
  }, [fetcher, t]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [loadData]);

  if (state.status === "loading") {
    return (
      <div className={className} aria-label={ariaLabel} aria-busy="true">
        {skeleton}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={className} role="alert" aria-label={ariaLabel}>
        <div className="flex flex-col items-center justify-center py-8 gap-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">
            {state.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className} aria-label={ariaLabel}>
      {children(state.data)}
    </div>
  );
}
