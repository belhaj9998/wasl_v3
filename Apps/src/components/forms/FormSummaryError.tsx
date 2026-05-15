"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface FormSummaryErrorProps {
  /** Array of error messages that don't map to specific fields */
  errors?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * FormSummaryError — Displays server errors that don't map to specific form fields.
 * Typically rendered at the top of a form to show unmapped 422 errors or general server errors.
 */
export function FormSummaryError({ errors, className }: FormSummaryErrorProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      {errors.length === 1 ? (
        <p>{errors[0]}</p>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
