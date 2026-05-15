"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export interface LoadingSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns per row */
  columns?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LoadingSkeleton — renders skeleton placeholder rows for table loading states.
 * Matches the current page limit count for a seamless loading experience.
 */
export function LoadingSkeleton({
  rows = 5,
  columns = 4,
  className,
}: LoadingSkeletonProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 rounded-md border p-4"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-4 rounded",
                colIndex === 0 ? "w-[30%]" : "w-[20%]",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
