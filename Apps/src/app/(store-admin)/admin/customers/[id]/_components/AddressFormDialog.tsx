"use client";

/**
 * AddressFormDialog — Dialog for adding/editing customer addresses.
 * Required fields: full_name (1-200), city (1-100), street_line_1 (1-300), type.
 *
 * Requirements: 10.5, 10.6
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { FormField } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CustomerAddress } from "@/types";

// Address validation schema
const addressSchema = z.object({
  full_name: z
    .string()
    .min(1, "الاسم الكامل مطلوب")
    .max(200, "الاسم الكامل يجب ألا يتجاوز 200 حرف"),
  city: z
    .string()
    .min(1, "المدينة مطلوبة")
    .max(100, "المدينة يجب ألا تتجاوز 100 حرف"),
  street_line_1: z
    .string()
    .min(1, "العنوان مطلوب")
    .max(300, "العنوان يجب ألا يتجاوز 300 حرف"),
  street_line_2: z
    .string()
    .max(300, "العنوان الإضافي يجب ألا يتجاوز 300 حرف")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "المنطقة يجب ألا تتجاوز 100 حرف")
    .optional()
    .or(z.literal("")),
  postal_code: z
    .string()
    .max(20, "الرمز البريدي يجب ألا يتجاوز 20 حرف")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .max(100, "الدولة يجب ألا تتجاوز 100 حرف")
    .optional()
    .or(z.literal("")),
  type: z.enum(["SHIPPING", "BILLING", "OTHER"]),
  is_default: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: CustomerAddress | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function AddressFormDialog({
  open,
  onOpenChange,
  address,
  onSubmit,
}: AddressFormDialogProps) {
  const isEdit = !!address;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: "",
      city: "",
      street_line_1: "",
      street_line_2: "",
      state: "",
      postal_code: "",
      country: "",
      type: "SHIPPING",
      is_default: false,
    },
  });

  // Reset form when dialog opens/closes or address changes
  useEffect(() => {
    if (open) {
      if (address) {
        reset({
          full_name: address.full_name || "",
          city: address.city || "",
          street_line_1: address.street_line_1 || "",
          street_line_2: address.street_line_2 || "",
          state: address.state || "",
          postal_code: address.postal_code || "",
          country: address.country || "",
          type: address.type || "SHIPPING",
          is_default: address.is_default ?? false,
        });
      } else {
        reset({
          full_name: "",
          city: "",
          street_line_1: "",
          street_line_2: "",
          state: "",
          postal_code: "",
          country: "",
          type: "SHIPPING",
          is_default: false,
        });
      }
    }
  }, [open, address, reset]);

  const handleFormSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true);
    try {
      // Clean up empty strings
      const payload: Record<string, unknown> = {
        full_name: data.full_name,
        city: data.city,
        street_line_1: data.street_line_1,
        type: data.type,
      };

      if (data.street_line_2) payload.street_line_2 = data.street_line_2;
      if (data.state) payload.state = data.state;
      if (data.postal_code) payload.postal_code = data.postal_code;
      if (data.country) payload.country = data.country;
      if (data.is_default) payload.is_default = data.is_default;

      await onSubmit(payload);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل العنوان" : "إضافة عنوان جديد"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "قم بتعديل بيانات العنوان" : "أدخل بيانات العنوان الجديد"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Full name */}
          <FormField
            control={control}
            name="full_name"
            label="الاسم الكامل"
            placeholder="اسم المستلم"
            required
          />

          {/* Type */}
          <FormField
            control={control}
            name="type"
            label="نوع العنوان"
            type="select"
            options={[
              { value: "SHIPPING", label: "شحن" },
              { value: "BILLING", label: "فوترة" },
              { value: "OTHER", label: "أخرى" },
            ]}
            required
          />

          {/* Street line 1 */}
          <FormField
            control={control}
            name="street_line_1"
            label="العنوان"
            placeholder="الشارع، رقم المبنى"
            required
          />

          {/* Street line 2 */}
          <FormField
            control={control}
            name="street_line_2"
            label="العنوان الإضافي"
            placeholder="شقة، طابق (اختياري)"
          />

          {/* City and State */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="city"
              label="المدينة"
              placeholder="المدينة"
              required
            />
            <FormField
              control={control}
              name="state"
              label="المنطقة / الولاية"
              placeholder="اختياري"
            />
          </div>

          {/* Postal code and Country */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="postal_code"
              label="الرمز البريدي"
              placeholder="اختياري"
            />
            <FormField
              control={control}
              name="country"
              label="الدولة"
              placeholder="اختياري"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <SubmitButton isSubmitting={isSubmitting}>
              {isEdit ? "حفظ التعديلات" : "إضافة العنوان"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
