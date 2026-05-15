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
import { FormError } from "./FormError";
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
  type?: "text" | "email" | "password" | "number" | "textarea" | "select";
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
}

/**
 * FormField — Wrapper component integrating React Hook Form's Controller
 * with shadcn Label + Input/Select/Textarea + inline error display.
 *
 * Supports text, email, password, number, textarea, and select field types.
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
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <Label htmlFor={name} className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ms-1">*</span>}
          </Label>

          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {type === "textarea" ? (
            <Textarea
              id={name}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(error && "border-destructive")}
              {...field}
              value={field.value ?? ""}
            />
          ) : type === "select" ? (
            <Select
              value={field.value ?? ""}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                id={name}
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
          ) : (
            <Input
              id={name}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(error && "border-destructive")}
              {...field}
              value={field.value ?? ""}
              onChange={(e) => {
                if (type === "number") {
                  const val = e.target.value;
                  field.onChange(val === "" ? "" : Number(val));
                } else {
                  field.onChange(e);
                }
              }}
            />
          )}

          <FormError message={error?.message} />
        </div>
      )}
    />
  );
}
