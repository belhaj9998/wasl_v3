import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export interface TableSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns per row */
  columns?: number;
  /** Whether to show a header row with title and action button */
  showHeader?: boolean;
  /** Whether to show filter bar above the table */
  showFilters?: boolean;
  /** Number of filter items to show */
  filterCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TableSkeleton — Loading skeleton for list/table pages.
 * Matches the layout of DataTable pages with header, filters, and rows.
 *
 * Requirements: 1.3, 2.3
 */
export function TableSkeleton({
  rows = 10,
  columns = 5,
  showHeader = true,
  showFilters = true,
  filterCount = 3,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Page header: title + action button */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: filterCount }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-10 rounded-md", i === 0 ? "w-64" : "w-40")}
            />
          ))}
        </div>
      )}

      {/* Table header row */}
      <div className="rounded-md border">
        <div className="flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "h-4 rounded",
                i === 0 ? "w-[25%]" : `w-[${Math.floor(75 / (columns - 1))}%]`,
              )}
              style={{
                width: i === 0 ? "25%" : `${Math.floor(75 / (columns - 1))}%`,
              }}
            />
          ))}
        </div>

        {/* Table body rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4 rounded"
                style={{
                  width:
                    colIndex === 0
                      ? "25%"
                      : `${Math.floor(75 / (columns - 1))}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}
