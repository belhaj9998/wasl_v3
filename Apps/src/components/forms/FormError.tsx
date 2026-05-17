"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface FormErrorProps {
  /** The error message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Optional id for aria-describedby binding */
  id?: string;
}

/**
 * FormError — Inline field error display component.
 * Renders a red error message below a form field when validation fails.
 */
export function FormError({ message, className, id }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className={cn("text-sm text-destructive mt-1", className)}
    >
      {message}
    </p>
  );
}
