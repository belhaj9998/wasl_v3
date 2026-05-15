"use client";

/**
 * Storefront Customer Addresses Page
 * Address management: add, edit, delete, set default.
 * Requirements: 19.4, 19.5
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Star, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { FormError, SubmitButton } from "@/components/forms";
import { EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerAddress } from "@/types";

const addressSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  street_line_1: z.string().min(1, "Street address is required").max(300),
  street_line_2: z.string().max(300).optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function StorefrontAddressesPage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await storefrontService.getCustomerAddresses(domain);
      // The API returns full address objects with id and is_default
      setAddresses(response.data as unknown as CustomerAddress[]);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddDialog = () => {
    setEditingAddress(null);
    reset({
      full_name: "",
      city: "",
      street_line_1: "",
      street_line_2: "",
      state: "",
      postal_code: "",
      country: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (address: CustomerAddress) => {
    setEditingAddress(address);
    reset({
      full_name: address.full_name,
      city: address.city,
      street_line_1: address.street_line_1,
      street_line_2: address.street_line_2 || "",
      state: address.state || "",
      postal_code: address.postal_code || "",
      country: address.country || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: AddressFormData) => {
    try {
      if (editingAddress) {
        await storefrontService.updateCustomerAddress(
          domain,
          editingAddress.id,
          data,
        );
        toast.success(t("addressUpdated"));
      } else {
        await storefrontService.addCustomerAddress(domain, {
          ...data,
          street_line_2: data.street_line_2 || undefined,
          state: data.state || undefined,
          postal_code: data.postal_code || undefined,
          country: data.country || undefined,
        });
        toast.success(t("addressAdded"));
      }
      setDialogOpen(false);
      fetchAddresses();
    } catch {
      toast.error(t("addressSaveError"));
    }
  };

  const handleDelete = async (addressId: number) => {
    try {
      await storefrontService.deleteCustomerAddress(domain, addressId);
      toast.success(t("addressDeleted"));
      fetchAddresses();
    } catch {
      toast.error(t("addressDeleteError"));
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await storefrontService.setDefaultAddress(domain, addressId);
      toast.success(t("defaultAddressSet"));
      fetchAddresses();
    } catch {
      toast.error(t("defaultAddressError"));
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EmptyState
          title={t("loadError")}
          description={t("loadErrorDesc")}
          action={{ label: t("retry"), onClick: fetchAddresses }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t("myAddresses")}
        </h1>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 me-1" />
          {t("addAddress")}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t("noAddresses")}
          description={t("noAddressesDesc")}
          action={{ label: t("addAddress"), onClick: openAddDialog }}
        />
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {address.full_name}
                      </p>
                      {address.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {t("default")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {address.street_line_1}
                      {address.street_line_2 && `, ${address.street_line_2}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}
                      {address.state && `, ${address.state}`}
                      {address.postal_code && ` ${address.postal_code}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSetDefault(address.id)}
                        title={t("setDefault")}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(address)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Address Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? t("editAddress") : t("addAddress")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="full_name">{t("fullName")} *</Label>
              <Input
                id="full_name"
                {...register("full_name")}
                className="mt-1"
              />
              {errors.full_name && (
                <FormError message={errors.full_name.message} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">{t("city")} *</Label>
                <Input id="city" {...register("city")} className="mt-1" />
                {errors.city && <FormError message={errors.city.message} />}
              </div>
              <div>
                <Label htmlFor="state">{t("state")}</Label>
                <Input id="state" {...register("state")} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="street_line_1">{t("streetAddress")} *</Label>
              <Input
                id="street_line_1"
                {...register("street_line_1")}
                className="mt-1"
              />
              {errors.street_line_1 && (
                <FormError message={errors.street_line_1.message} />
              )}
            </div>
            <div>
              <Label htmlFor="street_line_2">{t("streetAddress2")}</Label>
              <Input
                id="street_line_2"
                {...register("street_line_2")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="postal_code">{t("postalCode")}</Label>
              <Input
                id="postal_code"
                {...register("postal_code")}
                className="mt-1"
                dir="ltr"
              />
            </div>
            <SubmitButton isSubmitting={isSubmitting} className="w-full">
              {editingAddress ? t("saveChanges") : t("addAddress")}
            </SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
