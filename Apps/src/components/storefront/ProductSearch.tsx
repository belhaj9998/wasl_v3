"use client";

/**
 * ProductSearch Component
 * Instant product search with suggestions dropdown.
 * Shows suggestions after 2+ characters with 300ms debounce.
 * Supports keyboard navigation (Arrow Up/Down, Enter, Escape).
 * Requirements: 8.1, 8.7
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Search, Package, Loader2, AlertCircle } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import { ROUTES } from "@/lib/constants/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SupportedLocale } from "@/lib/i18n/config";
import type { Product } from "@/types";

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 10;

interface ProductSearchProps {
  className?: string;
}

export function ProductSearch({ className }: ProductSearchProps) {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;
  const t = useTranslations("storefront");
  const locale = useLocale() as SupportedLocale;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search products with debounce
  const searchProducts = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < MIN_SEARCH_LENGTH) {
        setResults([]);
        setIsOpen(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await storefrontService.searchProducts(
          domain,
          searchQuery,
          { limit: String(MAX_RESULTS) } as Record<string, string>,
        );

        setResults(response.data.slice(0, MAX_RESULTS));
        setIsOpen(true);
        setActiveIndex(-1);
      } catch {
        setError("search_failed");
        setResults([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    },
    [domain],
  );

  // Handle input change with debounce
  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchProducts(value);
    }, DEBOUNCE_MS);
  };

  // Navigate to product
  const navigateToProduct = (product: Product) => {
    setIsOpen(false);
    setQuery("");
    router.push(ROUTES.STOREFRONT.PRODUCT_DETAIL(domain, product.slug));
  };

  // Retry search
  const handleRetry = () => {
    searchProducts(query);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => {
          const maxIndex = results.length - 1;
          return prev < maxIndex ? prev + 1 : 0;
        });
        break;

      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => {
          return prev > 0 ? prev - 1 : results.length - 1;
        });
        break;

      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          navigateToProduct(results[activeIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[
        activeIndex
      ] as HTMLElement;
      activeElement?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const showDropdown = isOpen && query.length >= MIN_SEARCH_LENGTH;
  const hasResults = results.length > 0;
  const showNoResults = showDropdown && !isLoading && !error && !hasResults;
  const showError = showDropdown && !isLoading && error;
  const showResults = showDropdown && !isLoading && !error && hasResults;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={t("searchProducts")}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (
              query.length >= MIN_SEARCH_LENGTH &&
              (results.length > 0 || error)
            ) {
              setIsOpen(true);
            }
          }}
          className="ps-9 pe-9"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="product-search-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-label={t("searchProducts")}
        />
        {isLoading && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-1 w-full z-50 rounded-md border bg-popover shadow-lg">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Results list */}
          {showResults && (
            <ul
              ref={listboxRef}
              id="product-search-listbox"
              role="listbox"
              className="max-h-[400px] overflow-y-auto py-1"
            >
              {results.map((product, index) => (
                <li
                  key={product.id}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => navigateToProduct(product)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-10 flex-shrink-0 rounded bg-muted overflow-hidden relative">
                    {product.media && product.media.length > 0 ? (
                      <Image
                        src={product.media[0].url}
                        alt={product.media[0].alt_text || product.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-xs font-semibold text-primary">
                      {formatCurrencyLYD(Number(product.base_price), locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* No results */}
          {showNoResults && (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <Package className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("search.noResults")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("search.tryShorter")}
              </p>
            </div>
          )}

          {/* Error state */}
          {showError && (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("search.error")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleRetry}
              >
                {t("retry")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
