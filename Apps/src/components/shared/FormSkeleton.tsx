import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export interface FormSkeletonProps {
  /** Number of form field groups to render */
  fields?: number;
  /** Whether to show a back button + title header */
  showHeader?: boolean;
  /** Whether to show tabs (for multi-tab forms like product edit) */
  showTabs?: boolean;
  /** Number of tabs to show */
  tabCount?: number;
  /** Whether to show a submit button area at the bottom */
  showActions?: boolean;
  /** Layout: single column or two columns */
  layout?: "single" | "two-column";
  /** Additional CSS classes */
  className?: string;
}

/**
 * FormSkeleton — Loading skeleton for form/create/edit pages.
 * Matches the layout of form pages with header, input fields, and action buttons.
 *
 * Requirements: 1.3, 2.3
 */
export function FormSkeleton({
  fields = 6,
  showHeader = true,
  showTabs = false,
  tabCount = 3,
  showActions = true,
  layout = "single",
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Page header: back button + title */}
      {showHeader && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-1 border-b pb-px">
          {Array.from({ length: tabCount }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-9 rounded-t-md px-4", i === 0 ? "w-28" : "w-24")}
            />
          ))}
        </div>
      )}

      {/* Form fields */}
      <div className="rounded-lg border p-6">
        {layout === "two-column" ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: fields }).map((_, i) => (
              <FormFieldSkeleton
                key={i}
                wide={i === fields - 1 && fields % 2 !== 0}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from({ length: fields }).map((_, i) => (
              <FormFieldSkeleton key={i} />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      )}
    </div>
  );
}

/**
 * Individual form field skeleton (label + input)
 */
function FormFieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={cn("space-y-2", wide && "md:col-span-2")}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
