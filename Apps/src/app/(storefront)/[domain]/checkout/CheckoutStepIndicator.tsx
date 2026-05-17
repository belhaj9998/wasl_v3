"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CheckoutStep } from "@/lib/validators/checkout.schema";

interface CheckoutStepIndicatorProps {
  steps: readonly CheckoutStep[];
  currentStep: CheckoutStep;
}

export function CheckoutStepIndicator({
  steps,
  currentStep,
}: CheckoutStepIndicatorProps) {
  const t = useTranslations("storefront");
  const currentIndex = steps.indexOf(currentStep);

  const stepLabels: Record<CheckoutStep, string> = {
    customer: t("checkoutSteps.customer"),
    address: t("checkoutSteps.address"),
    payment: t("checkoutSteps.payment"),
    review: t("checkoutSteps.review"),
  };

  return (
    <nav aria-label={t("checkoutSteps.label")} className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={step}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1",
              )}
            >
              <div
                className="flex items-center gap-2"
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium shrink-0",
                    isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-sm font-medium hidden sm:inline",
                    isCurrent && "text-primary",
                    isCompleted && "text-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {stepLabels[step]}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 sm:mx-4",
                    index < currentIndex
                      ? "bg-primary"
                      : "bg-muted-foreground/30",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
