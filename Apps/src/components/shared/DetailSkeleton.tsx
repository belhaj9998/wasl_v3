import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export interface DetailSkeletonProps {
  /** Number of detail field rows */
  fields?: number;
  /** Whether to show a back button + title header */
  showHeader?: boolean;
  /** Whether to show a sidebar (e.g., for order detail pages) */
  showSidebar?: boolean;
  /** Number of cards in the sidebar */
  sidebarCards?: number;
  /** Number of content cards in the main area */
  contentCards?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DetailSkeleton — Loading skeleton for detail/view pages.
 * Matches the layout of detail pages with header, content cards, and optional sidebar.
 *
 * Requirements: 1.3, 2.3
 */
export function DetailSkeleton({
  fields = 6,
  showHeader = true,
  showSidebar = true,
  sidebarCards = 3,
  contentCards = 2,
  className,
}: DetailSkeletonProps) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Page header: back button + title + status badges */}
      {showHeader && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      )}

      {/* Action bar */}
      <Skeleton className="h-12 w-full rounded-md" />

      {/* Main content area */}
      {showSidebar ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: contentCards }).map((_, cardIndex) => (
              <div key={cardIndex} className="rounded-lg border p-6 space-y-4">
                {/* Card title */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-32" />
                </div>
                {/* Card content fields */}
                {Array.from({ length: fields }).map((_, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className="flex justify-between items-center"
                  >
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            {Array.from({ length: sidebarCards }).map((_, cardIndex) => (
              <div key={cardIndex} className="rounded-lg border p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Full-width content without sidebar */
        <div className="space-y-6">
          {Array.from({ length: contentCards }).map((_, cardIndex) => (
            <div key={cardIndex} className="rounded-lg border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              {Array.from({ length: fields }).map((_, fieldIndex) => (
                <div
                  key={fieldIndex}
                  className="flex justify-between items-center"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
