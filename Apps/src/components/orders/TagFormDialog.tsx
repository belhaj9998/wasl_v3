"use client";

/**
 * TagFormDialog
 *
 * Create / edit dialog for an `OrderTag` definition. Used by the settings
 * page and inline by `TagPicker` (when the user has the manage permission).
 *
 * - Validates `{ name (1-30 trimmed chars), color_preset }` with
 *   `orderTagFormSchema`.
 * - Renders a 14-swatch color grid keyed by `ORDER_TAG_COLOR_PRESETS`.
 * - On submit, dispatches the matching Redux thunk (create or update).
 * - Surfaces server error codes (`TAG_NAME_DUPLICATE`,
 *   `TAG_STORE_LIMIT_REACHED`, etc.) by mapping them to localized strings
 *   under `orderTags.errors.*`. Falls back to the generic toast.
 */

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/hooks/useStore";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  createOrderTag,
  updateOrderTag,
} from "@/lib/store/slices/orderTags.thunks";
import {
  ORDER_TAG_COLORS,
  ORDER_TAG_COLOR_PRESETS,
} from "@/lib/constants/orderTagColors";
import {
  orderTagFormSchema,
  type OrderTagFormValues,
} from "@/lib/validators/orderTag.schema";
import { cn } from "@/lib/utils/cn";
import type { OrderTag, OrderTagColorPreset } from "@/types/orderTag.types";

export interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when `mode === "edit"`. */
  tag?: OrderTag;
  /** Called with the persisted tag after a successful create or update. */
  onSuccess?: (tag: OrderTag) => void;
}

const KNOWN_ERROR_CODES = [
  "TAG_NAME_INVALID",
  "TAG_COLOR_INVALID",
  "TAG_NAME_DUPLICATE",
  "TAG_STORE_LIMIT_REACHED",
  "TAG_NOT_FOUND",
  "FORBIDDEN",
] as const;

type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function extractErrorCode(message: string): KnownErrorCode | null {
  const upper = message.toUpperCase();
  for (const code of KNOWN_ERROR_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

const DEFAULT_COLOR: OrderTagColorPreset = "slate";

export function TagFormDialog({
  open,
  onOpenChange,
  mode,
  tag,
  onSuccess,
}: TagFormDialogProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orderTags");
  const tColors = useTranslations("orderTags.colors");

  const [submitting, setSubmitting] = useState(false);

  const defaultValues: OrderTagFormValues = useMemo(
    () => ({
      name: tag?.name ?? "",
      color_preset: tag?.color_preset ?? DEFAULT_COLOR,
    }),
    [tag],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OrderTagFormValues>({
    resolver: zodResolver(orderTagFormSchema),
    defaultValues,
  });

  // Reset on open/close so reusing the dialog for different tags doesn't
  // bleed stale state into the form.
  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  const title = mode === "create" ? t("page.createButton") : t("card.edit");
  const submitLabel =
    mode === "create" ? t("form.submitCreate") : t("form.submitUpdate");

  const onSubmit = async (values: OrderTagFormValues) => {
    if (!currentStoreId) return;
    setSubmitting(true);
    try {
      let persisted: OrderTag;
      if (mode === "create") {
        persisted = await dispatch(
          createOrderTag({
            storeId: currentStoreId,
            payload: {
              name: values.name,
              color_preset: values.color_preset as OrderTagColorPreset,
            },
          }),
        ).unwrap();
        toast.success(t("toasts.createSuccess"));
      } else if (tag) {
        persisted = await dispatch(
          updateOrderTag({
            storeId: currentStoreId,
            tagId: tag.id,
            payload: {
              name: values.name,
              color_preset: values.color_preset as OrderTagColorPreset,
            },
          }),
        ).unwrap();
        toast.success(t("toasts.updateSuccess"));
      } else {
        return;
      }

      onSuccess?.(persisted);
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "";
      const code = extractErrorCode(message);
      if (code === "TAG_NAME_DUPLICATE" || code === "TAG_NAME_INVALID") {
        setError("name", { message: t(`errors.${code}`) });
      } else if (code === "TAG_COLOR_INVALID") {
        setError("color_preset", { message: t(`errors.${code}`) });
      } else if (code) {
        toast.error(t(`errors.${code}`));
      } else {
        toast.error(t("toasts.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("page.description")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="order-tag-name">
              {t("form.name")}
              <span aria-hidden="true" className="ms-1 text-destructive">
                *
              </span>
            </Label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  id="order-tag-name"
                  placeholder={t("form.namePlaceholder")}
                  maxLength={30}
                  autoFocus
                  aria-invalid={errors.name ? true : undefined}
                  {...field}
                />
              )}
            />
            {errors.name?.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.name.message.startsWith("TAG_")
                  ? t(`errors.${errors.name.message}`)
                  : errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("form.color")}</Label>
            <Controller
              control={control}
              name="color_preset"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-label={t("form.color")}
                  className="grid grid-cols-7 gap-2"
                >
                  {ORDER_TAG_COLOR_PRESETS.map((preset) => {
                    const swatch = ORDER_TAG_COLORS[preset].swatch;
                    const selected = field.value === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={tColors(preset)}
                        onClick={() => field.onChange(preset)}
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          selected && "ring-2 ring-foreground ring-offset-2",
                        )}
                      >
                        <span
                          className={cn("block h-7 w-7 rounded-full", swatch)}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.color_preset?.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.color_preset.message.startsWith("TAG_")
                  ? t(`errors.${errors.color_preset.message}`)
                  : errors.color_preset.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TagFormDialog;
