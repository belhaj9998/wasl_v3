"use client";

/**
 * Product Detail Page
 * Redirects to the edit page for the product.
 * This page exists as a route handler for /products/[id].
 *
 * Requirements: 7.2
 */

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Number(params.id);

  useEffect(() => {
    if (productId) {
      router.replace(ROUTES.STORE_ADMIN.PRODUCT_EDIT(productId));
    }
  }, [router, productId]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">جاري التحويل...</p>
    </div>
  );
}
