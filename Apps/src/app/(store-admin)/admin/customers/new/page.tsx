"use client";

/**
 * New Customer Page
 * Form for creating a new customer.
 *
 * Requirements: 10.3, 10.4
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { CustomerForm } from "@/components/forms/CustomerForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAppDispatch } from "@/lib/store/hooks";
import { createCustomer } from "@/lib/store/slices/customers.thunks";
import { useStore } from "@/hooks/useStore";
import type { CustomerFormData } from "@/lib/validators/customer.schema";

export default function NewCustomerPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();

  const handleSubmit = useCallback(
    async (data: CustomerFormData) => {
      if (!currentStoreId) return;

      // Clean up empty strings to undefined
      const payload = {
        customer_name: data.customer_name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
        status: data.status || undefined,
        gender: data.gender || undefined,
        birth_date: data.birth_date || undefined,
      };

      const result = await dispatch(
        createCustomer({ storeId: currentStoreId, payload }),
      ).unwrap();

      toast.success("تم إنشاء العميل بنجاح");
      router.push(`/admin/customers/${result.id}`);
    },
    [dispatch, currentStoreId, router],
  );

  const handleCancel = useCallback(() => {
    router.push("/admin/customers");
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/customers")}
        >
          <ArrowRight className="h-4 w-4" />
          <span className="sr-only">العودة</span>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">عميل جديد</h2>
          <p className="text-muted-foreground">إنشاء عميل جديد في المتجر</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات العميل</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}
