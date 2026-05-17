"use client";

/**
 * CreateStoreDialog — Modal dialog for creating a new store.
 * Integrates React Hook Form + Zod validation, handles API errors per the design error matrix,
 * implements 10s AbortController timeout, loading states, and focus management.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7,
 *              4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import {
  createStoreSchema,
  type CreateStoreFormData,
} from "@/lib/validators/store.schema";
import { storeService } from "@/lib/api/services/store.service";
import type { Store, ApiError } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CreateStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newStore: Store) => void;
  /** Current number of active stores (excluding ARCHIVED and soft-deleted) */
  storeCount?: number;
  /** Maximum stores allowed by subscription plan (null = unlimited) */
  maxStores?: number | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateStoreDialog({
  open,
  onOpenChange,
  onSuccess,
  storeCount,
  maxStores,
}: CreateStoreDialogProps) {
  const t = useTranslations("createStore");
  const tValidation = useTranslations("validation");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: "",
      domain: "",
    },
  });

  // Focus first input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog content is rendered
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Translate Zod error messages to localized strings
  const getFieldError = useCallback(
    (fieldError: { message?: string } | undefined): string | undefined => {
      if (!fieldError?.message) return undefined;
      const msg = fieldError.message;

      // Map Zod error keys to translated messages
      switch (msg) {
        case "validation.storeName.tooShort":
          return tValidation("storeName.tooShort");
        case "validation.storeName.tooLong":
          return tValidation("storeName.tooLong");
        case "validation.domain.tooShort":
          return tValidation("domain.tooShort");
        case "validation.domain.tooLong":
          return tValidation("domain.tooLong");
        case "validation.domain.invalid":
          return tValidation("domain.invalid");
        default:
          // Server errors or already-translated messages
          return msg;
      }
    },
    [tValidation],
  );

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setGeneralError(null);
    reset();
    onOpenChange(false);
  }, [isSubmitting, reset, onOpenChange]);

  const onSubmit = async (data: CreateStoreFormData) => {
    // Client-side store limit guard — reject submission without API call
    if (
      maxStores !== null &&
      maxStores !== undefined &&
      storeCount !== undefined &&
      storeCount >= maxStores
    ) {
      setGeneralError(t("errors.limitReached"));
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    // Create AbortController with 10s timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await storeService.create(data);

      // Success (201)
      const newStore = response.data;
      reset();
      setGeneralError(null);
      onSuccess(newStore);
      onOpenChange(false);
    } catch (err: unknown) {
      handleApiError(err);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsSubmitting(false);
    }
  };

  const handleApiError = (err: unknown) => {
    // Network/timeout errors
    if (err instanceof DOMException && err.name === "AbortError") {
      setGeneralError(t("errors.networkError"));
      return;
    }

    if (err instanceof TypeError) {
      // fetch throws TypeError on network failure
      setGeneralError(t("errors.networkError"));
      return;
    }

    // API error responses (thrown by apiClient when !response.ok)
    if (err && typeof err === "object" && "success" in err) {
      const apiError = err as ApiError;
      const statusCode = apiError.statusCode;

      // 409 — Domain conflict
      if (statusCode === 409) {
        setError("domain", {
          type: "server",
          message: t("errors.domainTaken"),
        });
        return;
      }

      // 422 — Validation errors from server
      if (statusCode === 422 && apiError.errors) {
        for (const fieldError of apiError.errors) {
          const fieldName = fieldError.path as keyof CreateStoreFormData;
          if (fieldName === "name" || fieldName === "domain") {
            setError(fieldName, {
              type: "server",
              message: fieldError.message,
            });
          }
        }
        return;
      }

      // 403 — Forbidden (store limit reached)
      if (statusCode === 403) {
        setGeneralError(t("errors.storeLimitReached"));
        return;
      }

      // 5xx — Server error
      if (statusCode && statusCode >= 500) {
        setGeneralError(t("errors.serverError"));
        return;
      }

      // Fallback for other API errors
      setGeneralError(apiError.message || t("errors.serverError"));
      return;
    }

    // Unknown error fallback
    setGeneralError(t("errors.serverError"));
  };

  const nameError = getFieldError(errors.name);
  const domainError = getFieldError(errors.domain);
  const dialogTitleId = "create-store-dialog-title";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle id={dialogTitleId}>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* General error banner */}
          {generalError && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {generalError}
            </div>
          )}

          {/* Store Name Field */}
          <div className="space-y-2">
            <Label
              htmlFor="create-store-name"
              className={cn(nameError && "text-destructive")}
            >
              {t("dialog.nameLabel")}
              <span className="text-destructive ms-1" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="create-store-name"
              placeholder={t("dialog.namePlaceholder")}
              disabled={isSubmitting}
              aria-invalid={!!nameError || undefined}
              aria-describedby={
                nameError ? "create-store-name-error" : undefined
              }
              aria-required="true"
              className={cn(nameError && "border-destructive")}
              {...register("name")}
              ref={(e) => {
                register("name").ref(e);
                nameInputRef.current = e;
              }}
            />
            {nameError && (
              <p
                id="create-store-name-error"
                className="text-sm text-destructive mt-1"
                role="alert"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Store Domain Field */}
          <div className="space-y-2">
            <Label
              htmlFor="create-store-domain"
              className={cn(domainError && "text-destructive")}
            >
              {t("dialog.domainLabel")}
              <span className="text-destructive ms-1" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="create-store-domain"
              placeholder={t("dialog.domainPlaceholder")}
              disabled={isSubmitting}
              aria-invalid={!!domainError || undefined}
              aria-describedby={
                [
                  "create-store-domain-hint",
                  domainError ? "create-store-domain-error" : undefined,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              aria-required="true"
              className={cn(domainError && "border-destructive")}
              dir="ltr"
              {...register("domain")}
            />
            <p
              id="create-store-domain-hint"
              className="text-xs text-muted-foreground"
            >
              {t("dialog.domainHint", { domain: "your-domain" })}
            </p>
            {domainError && (
              <p
                id="create-store-domain-error"
                className="text-sm text-destructive mt-1"
                role="alert"
              >
                {domainError}
              </p>
            )}
          </div>

          {/* Footer buttons */}
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2
                  className="me-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {isSubmitting ? t("dialog.creating") : t("dialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
