"use client";

/**
 * ColumnVisibilityMenu
 *
 * A shadcn DropdownMenu-based UI for customizing a table's column visibility
 * and order. Powered by @dnd-kit for accessible drag-and-drop reordering.
 *
 * Behavior:
 * - Renders one row per customizable column (filters out `pinnedLastIds` —
 *   typically `["actions"]`). The pinned column is invisible to the menu
 *   and stays trailing in the resulting order.
 * - For ids in `forcedVisibleIds` (typically `["order_number", "actions"]`),
 *   the row's checkbox is rendered as `checked` and `disabled` — the column
 *   is reorderable but never hideable.
 * - Drag-end produces a permutation of the current order, with pinned ids
 *   re-appended at the trailing index. Visibility is NOT changed by drag.
 * - Reset button invokes `onReset` (typically `dispatch(resetOrders())`).
 *
 * Accessibility:
 * - Pointer + Keyboard sensors via @dnd-kit. Press Space/Enter on a focused
 *   drag handle to enter keyboard sorting mode; arrow keys move; Space to drop.
 * - Each draggable row has `aria-roledescription="sortable"`.
 * - The drag handle has an `aria-label` naming the column being moved.
 *
 * RTL: when locale === "ar", the dropdown content is wrapped in `dir="rtl"`
 * so dnd-kit's pointer-coordinate math aligns with the visually rightmost
 * column.
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import type { ColumnMeta } from "@/lib/utils/tableColumns";

export interface ColumnVisibilityMenuProps {
  /** All defined columns (including pinned ones). */
  columns: ColumnMeta[];
  /** Current effective visibility record. */
  visibility: Record<string, boolean>;
  /** Current effective order (includes pinned ids at the end). */
  order: string[];
  /** Called when the user toggles a non-mandatory checkbox. */
  onVisibilityChange: (next: Record<string, boolean>) => void;
  /** Called when the user reorders columns via drag-and-drop. */
  onOrderChange: (next: string[]) => void;
  /** Called when the user clicks the "Reset to defaults" button. */
  onReset: () => void;
  /** Active locale; drives labels and RTL direction. */
  locale: "ar" | "en";
  /** Column ids pinned to the trailing positions (e.g. ["actions"]). */
  pinnedLastIds: string[];
  /** Column ids forced to visible regardless of saved value. */
  forcedVisibleIds: string[];
}

const LABELS = {
  trigger: { ar: "تخصيص الأعمدة", en: "Customize columns" },
  reset: { ar: "إعادة التعيين", en: "Reset to defaults" },
  reorderPrefix: { ar: "إعادة ترتيب العمود", en: "Reorder column" },
  sectionTitle: { ar: "الأعمدة", en: "Columns" },
} as const;

export function ColumnVisibilityMenu({
  columns,
  visibility,
  order,
  onVisibilityChange,
  onOrderChange,
  onReset,
  locale,
  pinnedLastIds,
  forcedVisibleIds,
}: ColumnVisibilityMenuProps) {
  const pinnedSet = new Set(pinnedLastIds);
  const forcedSet = new Set(forcedVisibleIds);
  const labelById = new Map(columns.map((c) => [c.id, c.label]));

  // Rows shown in the menu = current order minus pinned ids.
  const sortableIds = order.filter((id) => !pinnedSet.has(id));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(sortableIds, oldIndex, newIndex);
    const pinned = pinnedLastIds.filter((id) => order.includes(id));
    onOrderChange([...moved, ...pinned]);
  };

  const handleToggle = (id: string, checked: boolean) => {
    if (forcedSet.has(id)) return; // mandatory: ignore
    onVisibilityChange({ ...visibility, [id]: checked });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Columns3 className="me-2 h-4 w-4" />
          {LABELS.trigger[locale]}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 p-2"
        // Stop pointer events from bubbling and triggering drag-end on the trigger.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            {LABELS.sectionTitle[locale]}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {sortableIds.map((id) => {
                  const label = labelById.get(id);
                  if (!label) return null;
                  return (
                    <SortableRow
                      key={id}
                      id={id}
                      label={label[locale]}
                      checked={visibility[id] !== false}
                      disabled={forcedSet.has(id)}
                      reorderLabel={`${LABELS.reorderPrefix[locale]}: ${label[locale]}`}
                      onToggle={(checked) => handleToggle(id, checked)}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="mt-2 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={onReset}
            >
              {LABELS.reset[locale]}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SortableRowProps {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  reorderLabel: string;
  onToggle: (checked: boolean) => void;
}

function SortableRow({
  id,
  label,
  checked,
  disabled,
  reorderLabel,
  onToggle,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      aria-roledescription="sortable"
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent",
        isDragging && "bg-accent",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        tabIndex={0}
        aria-label={reorderLabel}
        className="cursor-grab text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        id={`col-vis-${id}`}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onToggle(value === true)}
        aria-label={label}
      />

      <label
        htmlFor={`col-vis-${id}`}
        className={cn(
          "flex-1 cursor-pointer text-sm",
          disabled && "cursor-not-allowed opacity-70",
        )}
      >
        {label}
      </label>
    </li>
  );
}
