"use client";

import { cn } from "@/lib/utils/cn";

export type LogoSize = "sm" | "md" | "lg";

export interface LogoProps {
  /** Size variant for the logo */
  size?: LogoSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<LogoSize, { container: string; text: string }> = {
  sm: { container: "h-8 w-8", text: "text-lg" },
  md: { container: "h-12 w-12", text: "text-2xl" },
  lg: { container: "h-16 w-16", text: "text-3xl" },
};

/**
 * Logo — renders the Wasl logo with responsive sizing.
 */
export function Logo({ size = "md", className }: LogoProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold",
        styles.container,
        styles.text,
        className,
      )}
      aria-label="Wasl"
    >
      و
    </div>
  );
}
