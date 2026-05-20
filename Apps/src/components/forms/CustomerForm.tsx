"use client";

/**
 * CustomerForm — Reusable form for creating and editing customers.
 * Fields: first_name, last_name, email, phone, notes, status, gender, birth_date.
 * Validates: at least one of email/phone required, email max 255, phone 8-20, notes max 1000.
 * Handles 409 for duplicate email/phone.
 *
 * Requirements: 10.3, 10.4
 */

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  customerSchema,
  type CustomerFormData,
} from "@/lib/validators/customer.schema";
import type { Customer } from "@/types";

export interface CustomerFormProps {
  /** Existing customer data for edit mode */
  customer?: Customer | null;
  /** Submit handler */
  onSubmit: (data: CustomerFormData) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether the form is in edit mode */
  isEdit?: boolean;
}

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isEdit = false,
}: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const t = useTranslations("customers");

  const { control, handleSubmit, reset, setError } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      notes: "",
      status: "ACTIVE",
      gender: "",
      birth_date: "",
    },
  });

  // Reset form when customer data changes (edit mode)
  useEffect(() => {
    if (customer) {
      reset({
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        notes: customer.notes || "",
        status: customer.status || "ACTIVE",
        gender: customer.gender || "",
        birth_date: customer.birth_date ? customer.birth_date.slice(0, 10) : "",
      });
    }
  }, [customer, reset]);

  const handleFormSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      // Handle 409 duplicate email/phone
      if (err && typeof err === "object" && "status" in err) {
        const apiErr = err as {
          status?: number;
          message?: string;
          errors?: Array<{ path?: string[]; message?: string }>;
        };
        if (apiErr.status === 409) {
          const message = apiErr.message || "";
          if (message.toLowerCase().includes("email")) {
            setError("email", {
              message: t("emailAlreadyUsed"),
            });
          } else if (message.toLowerCase().includes("phone")) {
            setError("phone", {
              message: t("phoneAlreadyUsed"),
            });
          } else {
            setServerError(t("emailOrPhoneAlreadyUsed"));
          }
        } else if (apiErr.status === 422 && apiErr.errors) {
          // Map validation errors to fields
          for (const fieldErr of apiErr.errors) {
            const fieldName = fieldErr.path?.[0];
            if (fieldName && fieldErr.message) {
              setError(fieldName as keyof CustomerFormData, {
                message: fieldErr.message,
              });
            }
          }
        } else {
          setServerError(apiErr.message || t("saveFailed"));
        }
      } else {
        const message = err instanceof Error ? err.message : t("saveFailed");
        setServerError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* Server error */}
      {serverError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      {/* Name fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="first_name"
          label="الاسم الأول"
          placeholder="أدخل الاسم الأول"
        />
        <FormField
          control={control}
          name="last_name"
          label="اسم العائلة"
          placeholder="أدخل اسم العائلة"
        />
      </div>

      {/* Contact fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="email"
          label="البريد الإلكتروني"
          type="email"
          placeholder="example@email.com"
          description="يجب إدخال البريد الإلكتروني أو رقم الهاتف على الأقل"
        />
        <FormField
          control={control}
          name="phone"
          label="رقم الهاتف"
          placeholder="09XXXXXXXX"
          description="8-20 رقم"
        />
      </div>

      {/* Status and Gender */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="status"
          label="الحالة"
          type="select"
          options={[
            { value: "ACTIVE", label: "نشط" },
            { value: "BLOCKED", label: "محظور" },
            { value: "ARCHIVED", label: "مؤرشف" },
          ]}
        />
        <FormField
          control={control}
          name="gender"
          label="الجنس"
          type="select"
          placeholder="اختر الجنس"
          options={[
            { value: "", label: "غير محدد" },
            { value: "male", label: "ذكر" },
            { value: "female", label: "أنثى" },
          ]}
        />
      </div>

      {/* Birth date */}
      <Controller
        control={control}
        name="birth_date"
        render={({ field, fieldState: { error } }) => (
          <div className="space-y-2">
            <Label htmlFor="birth_date">تاريخ الميلاد</Label>
            <input
              id="birth_date"
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || "")}
            />
            <FormError message={error?.message} />
          </div>
        )}
      />

      {/* Notes */}
      <FormField
        control={control}
        name="notes"
        label="ملاحظات"
        type="textarea"
        placeholder="ملاحظات حول العميل (اختياري، حد أقصى 1000 حرف)"
      />

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>
        <SubmitButton isSubmitting={isSubmitting}>
          {isEdit ? "حفظ التعديلات" : "إنشاء العميل"}
        </SubmitButton>
      </div>
    </form>
  );
}
