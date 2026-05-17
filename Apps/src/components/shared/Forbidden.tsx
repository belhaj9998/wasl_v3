"use client";

/**
 * Forbidden Component
 * Displays a 403 Forbidden page when a user lacks the required permission.
 * Shows the permission name and provides a "Go Back" button.
 *
 * Validates: Requirement 11.6
 */

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ForbiddenProps {
  /** The name of the required permission the user is missing */
  permission: string;
}

/**
 * Forbidden renders a 403 page indicating the user does not have
 * the required permission to access the resource.
 *
 * @example
 * <Forbidden permission="product:create" />
 */
export function Forbidden({ permission }: ForbiddenProps) {
  const t = useTranslations("errors.forbidden");
  const router = useRouter();

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[400px] p-4"
    >
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">403</h1>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {t("title")}
      </h2>
      <p className="text-muted-foreground mb-2 text-center max-w-md">
        {t("description")}
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        {t("requiredPermission")}:{" "}
        <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
          {permission}
        </code>
      </p>
      <Button onClick={() => router.back()}>{t("goBack")}</Button>
    </div>
  );
}

export default Forbidden;
