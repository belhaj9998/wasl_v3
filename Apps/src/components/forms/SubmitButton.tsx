"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Button label text */
  children: React.ReactNode;
}

/**
 * SubmitButton — Form submit button with loading state.
 * Displays a spinner and disables interaction while the form is submitting.
 */
export function SubmitButton({
  isSubmitting = false,
  children,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting || disabled}
      className={cn("relative", className)}
      {...props}
    >
      {isSubmitting && (
        <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </Button>
  );
}
