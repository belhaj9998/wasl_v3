/**
 * Pagination Hook
 * Manages pagination state including page, limit, sort, and query params.
 *
 * Requirements: 15.1, 6.1
 */

import { useState, useMemo, useCallback } from "react";
import type { PaginationParams } from "@/types";

interface UsePaginationReturn {
  page: number;
  limit: number;
  sortBy: string | undefined;
  sortOrder: "asc" | "desc";
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSortBy: (sortBy: string | undefined) => void;
  setSortOrder: (sortOrder: "asc" | "desc") => void;
  params: PaginationParams;
}

/**
 * Hook for managing pagination, sorting, and query parameters.
 * @param initialPage - Starting page number (default: 1)
 * @param initialLimit - Items per page (default: 10)
 */
export function usePagination(
  initialPage = 1,
  initialLimit = 10,
): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [sortBy, setSortByState] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrderState] = useState<"asc" | "desc">("desc");

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setPageState(1); // Reset to first page when limit changes
    setLimitState(newLimit);
  }, []);

  const setSortBy = useCallback((newSortBy: string | undefined) => {
    setPageState(1); // Reset to first page when sort changes
    setSortByState(newSortBy);
  }, []);

  const setSortOrder = useCallback((newSortOrder: "asc" | "desc") => {
    setPageState(1); // Reset to first page when sort order changes
    setSortOrderState(newSortOrder);
  }, []);

  const params: PaginationParams = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [page, limit, sortBy, sortOrder],
  );

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    params,
  };
}
