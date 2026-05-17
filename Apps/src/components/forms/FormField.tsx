"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldProps<T extends FieldValues> {
  /** React Hook Form control object */
  control: Control<T>;
  /** Field name (must match a key in the form schema) */
  name: Path<T>;
  /** Label text displayed above the field */
  label: string;
  /** Field type — determines which input component to render */
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "textarea"
    | "select"
    | "file"
    | "date"
    | "color";
  /** Placeholder text */
  placeholder?: string;
  /** Options for select fields */
  options?: FormFieldOption[];
  /** Whether the field is required (shows asterisk) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Description text below the label */
  description?: string;
  /** Accept attribute for file inputs (e.g. "image/*") */
  accept?: string;
}

/**
 * FormField — Unified wrapper component integrating React Hook Form's Controller
 * with shadcn Label + Input/Select/Textarea + inline error display.
 *
 * Supports: text, email, password, number, textarea, select, file, date, color.
 *
 * Accessibility:
 * - Links error messages to fields via `aria-describedby`
 * - Uses `role="alert"` on error messages for screen reader announcements
 * - Shows visual required indicator (asterisk) when `required` is true
 */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  options,
  required = false,
  disabled = false,
  className,
  description,
  accept,
}: FormFieldProps<T>) {
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const ariaDescribedBy =
          [description ? descriptionId : undefined, error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined;

        return (
          <div className={cn("space-y-2", className)}>
            <Label htmlFor={name} className={cn(error && "text-destructive")}>
              {label}
              {required && (
                <span className="text-destructive ms-1" aria-hidden="true">
                  *
                </span>
              )}
            </Label>

            {description && (
              <p id={descriptionId} className="text-xs text-muted-foreground">
                {description}
              </p>
            )}

            {renderField({
              type,
              field,
              name,
              placeholder,
              disabled,
              options,
              error: !!error,
              ariaDescribedBy,
              accept,
              required,
            })}

            {error?.message && (
              <p
                id={errorId}
                className="text-sm text-destructive mt-1"
                role="alert"
              >
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

/** Internal helper to render the appropriate input based on type */
function renderField({
  type,
  field,
  name,
  placeholder,
  disabled,
  options,
  error,
  ariaDescribedBy,
  accept,
  required,
}: {
  type: NonNullable<FormFieldProps<FieldValues>["type"]>;
  field: {
    onChange: (...event: unknown[]) => void;
    onBlur: () => void;
    value: unknown;
    name: string;
    ref: React.Ref<unknown>;
  };
  name: string;
  placeholder?: string;
  disabled: boolean;
  options?: FormFieldOption[];
  error: boolean;
  ariaDescribedBy?: string;
  accept?: string;
  required: boolean;
}) {
  switch (type) {
    case "textarea":
      return (
        <Textarea
          id={name}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={cn(error && "border-destructive")}
          ref={field.ref as React.Ref<HTMLTextAreaElement>}
          name={field.name}
          onBlur={field.onBlur}
          onChange={
            field.onChange as React.ChangeEventHandler<HTMLTextAreaElement>
          }
          value={(field.value as string) ?? ""}
        />
      );

    case "select":
      return (
        <Select
          value={(field.value as string) ?? ""}
          onValueChange={field.onChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={name}
            aria-describedby={ariaDescribedBy}
            aria-invalid={error || undefined}
            aria-required={required || undefined}
            className={cn(error && "border-destructive")}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "file":
      return (
        <Input
          id={name}
          type="file"
          disabled={disabled}
          accept={accept}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={cn(error && "border-destructive")}
          ref={field.ref as React.Ref<HTMLInputElement>}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(e) => {
            const files = e.target.files;
            // Pass FileList for single/multiple file handling
            field.onChange(files && files.length === 1 ? files[0] : files);
          }}
        />
      );

    case "color":
      return (
        <Input
          id={name}
          type="color"
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={cn(
            "h-10 w-14 p-1 cursor-pointer",
            error && "border-destructive",
          )}
          ref={field.ref as React.Ref<HTMLInputElement>}
          name={field.name}
          onBlur={field.onBlur}
          onChange={
            field.onChange as React.ChangeEventHandler<HTMLInputElement>
          }
          value={(field.value as string) ?? "#000000"}
        />
      );

    case "date":
      return (
        <Input
          id={name}
          type="date"
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={cn(error && "border-destructive")}
          ref={field.ref as React.Ref<HTMLInputElement>}
          name={field.name}
          onBlur={field.onBlur}
          onChange={
            field.onChange as React.ChangeEventHandler<HTMLInputElement>
          }
          value={(field.value as string) ?? ""}
        />
      );

    case "number":
      return (
        <Input
          id={name}
          type="number"
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={cn(error && "border-destructive")}
          ref={field.ref as React.Ref<HTMLInputElement>}
          name={field.name}
          onBlur={field.onBlur}
          value={(field.value as string | number) ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            field.onChange(val === "" ? "" : Number(val));
          }}
        />
      );

    // text, email, password
    default:
      return (
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={cn(error && "border-destructive")}
          ref={field.ref as React.Ref<HTMLInputElement>}
          name={field.name}
          onBlur={field.onBlur}
          onChange={
            field.onChange as React.ChangeEventHandler<HTMLInputElement>
          }
          value={(field.value as string) ?? ""}
        />
      );
  }
}
