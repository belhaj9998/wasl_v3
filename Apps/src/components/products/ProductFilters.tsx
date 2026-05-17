"use client";

/**
 * ProductFilters Component
 * Provides filtering for storefront products: price range, category, availability.
 * Syncs filter state with URL query parameters.
 * Requirements: 8.2
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Category } from "@/types";

export interface ProductFilterState {
  minPrice?: number;
  maxPrice?: number;
  categoryIds?: number[];
  availability?: "in_stock" | "out_of_stock";
}

interface ProductFiltersProps {
  categories: Category[];
  onFilterChange: (filters: ProductFilterState) => void;
}

/**
 * Parses URL search params into a ProductFilterState object.
 */
export function parseFiltersFromURL(
  searchParams: URLSearchParams,
): ProductFilterState {
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const category = searchParams.get("category");
  const availability = searchParams.get("availability");

  return {
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    categoryIds: category
      ? category
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0)
      : undefined,
    availability:
      availability === "in_stock" || availability === "out_of_stock"
        ? availability
        : undefined,
  };
}

/**
 * Encodes a ProductFilterState into URL search params string.
 */
export function encodeFiltersToURL(filters: ProductFilterState): string {
  const params = new URLSearchParams();

  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    params.set("category", filters.categoryIds.join(","));
  }
  if (filters.availability) {
    params.set("availability", filters.availability);
  }

  return params.toString();
}

export default function ProductFilters({
  categories,
  onFilterChange,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("storefront");

  // Initialize filter state from URL
  const [filters, setFilters] = useState<ProductFilterState>(() =>
    parseFiltersFromURL(searchParams),
  );

  // Track local input values for price (to allow typing without immediate updates)
  const [minPriceInput, setMinPriceInput] = useState(
    filters.minPrice?.toString() ?? "",
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    filters.maxPrice?.toString() ?? "",
  );

  // Sync URL when filters change
  const updateURL = useCallback(
    (newFilters: ProductFilterState) => {
      const filterParams = encodeFiltersToURL(newFilters);

      // Preserve existing non-filter params (page, sortBy, sortOrder, search)
      const currentParams = new URLSearchParams(searchParams.toString());
      // Remove filter-specific params
      currentParams.delete("minPrice");
      currentParams.delete("maxPrice");
      currentParams.delete("category");
      currentParams.delete("availability");
      // Reset page to 1 when filters change
      currentParams.delete("page");

      // Merge filter params
      const newFilterParams = new URLSearchParams(filterParams);
      newFilterParams.forEach((value, key) => {
        currentParams.set(key, value);
      });

      const queryString = currentParams.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newURL, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Apply filters and update URL
  const applyFilters = useCallback(
    (newFilters: ProductFilterState) => {
      setFilters(newFilters);
      updateURL(newFilters);
      onFilterChange(newFilters);
    },
    [updateURL, onFilterChange],
  );

  // Restore filters from URL on mount
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    setFilters(urlFilters);
    setMinPriceInput(urlFilters.minPrice?.toString() ?? "");
    setMaxPriceInput(urlFilters.maxPrice?.toString() ?? "");
    onFilterChange(urlFilters);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle price range change (on blur or Enter)
  const handlePriceApply = () => {
    const min = minPriceInput ? Number(minPriceInput) : undefined;
    const max = maxPriceInput ? Number(maxPriceInput) : undefined;

    const newFilters: ProductFilterState = {
      ...filters,
      minPrice: min && !isNaN(min) && min > 0 ? min : undefined,
      maxPrice: max && !isNaN(max) && max > 0 ? max : undefined,
    };
    applyFilters(newFilters);
  };

  // Handle category toggle
  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    const currentIds = filters.categoryIds ?? [];
    const newIds = checked
      ? [...currentIds, categoryId]
      : currentIds.filter((id) => id !== categoryId);

    const newFilters: ProductFilterState = {
      ...filters,
      categoryIds: newIds.length > 0 ? newIds : undefined,
    };
    applyFilters(newFilters);
  };

  // Handle availability change
  const handleAvailabilityChange = (
    value: "in_stock" | "out_of_stock" | undefined,
  ) => {
    const newFilters: ProductFilterState = {
      ...filters,
      availability: value,
    };
    applyFilters(newFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    applyFilters({});
  };

  const hasActiveFilters =
    filters.minPrice ||
    filters.maxPrice ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.availability;

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <h3 className="font-medium text-sm">{t("filters.title")}</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs h-7"
            aria-label={t("filters.clearAll")}
          >
            <X className="h-3 w-3 me-1" />
            {t("filters.clearAll")}
          </Button>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("filters.priceRange")}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder={t("filters.min")}
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onBlur={handlePriceApply}
            onKeyDown={(e) => e.key === "Enter" && handlePriceApply()}
            className="h-8 text-sm"
            aria-label={t("filters.minPrice")}
          />
          <span className="text-muted-foreground text-xs">-</span>
          <Input
            type="number"
            min={0}
            placeholder={t("filters.max")}
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onBlur={handlePriceApply}
            onKeyDown={(e) => e.key === "Enter" && handlePriceApply()}
            className="h-8 text-sm"
            aria-label={t("filters.maxPrice")}
          />
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("filters.category")}</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={filters.categoryIds?.includes(category.id) ?? false}
                  onCheckedChange={(checked) =>
                    handleCategoryToggle(category.id, checked === true)
                  }
                />
                <label
                  htmlFor={`category-${category.id}`}
                  className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {t("filters.availability")}
        </Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="availability-all"
              checked={!filters.availability}
              onCheckedChange={() => handleAvailabilityChange(undefined)}
            />
            <label
              htmlFor="availability-all"
              className="text-sm cursor-pointer leading-none"
            >
              {t("filters.all")}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="availability-in-stock"
              checked={filters.availability === "in_stock"}
              onCheckedChange={(checked) =>
                handleAvailabilityChange(checked ? "in_stock" : undefined)
              }
            />
            <label
              htmlFor="availability-in-stock"
              className="text-sm cursor-pointer leading-none"
            >
              {t("filters.inStock")}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="availability-out-of-stock"
              checked={filters.availability === "out_of_stock"}
              onCheckedChange={(checked) =>
                handleAvailabilityChange(checked ? "out_of_stock" : undefined)
              }
            />
            <label
              htmlFor="availability-out-of-stock"
              className="text-sm cursor-pointer leading-none"
            >
              {t("filters.outOfStock")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
