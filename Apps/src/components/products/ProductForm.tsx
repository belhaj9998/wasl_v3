"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Package,
  Plus,
  Settings2,
  Trash2,
  Upload,
  Warehouse,
  X,
  Copy,
  Eye,
  MoreVertical,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/forms/FormField";
import { FormSummaryError } from "@/components/forms/FormSummaryError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { mapServerErrorsToForm } from "@/components/forms/mapServerErrors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import { useStore } from "@/hooks/useStore";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

import { apiClient } from "@/lib/api/client";
import { inventoryService } from "@/lib/api/services/inventory.service";
import { productService } from "@/lib/api/services/product.service";
import {
  API_ENDPOINTS,
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
} from "@/lib/constants";
import { ROUTES } from "@/lib/constants/routes";
import {
  productSchema,
  type ProductFormData,
} from "@/lib/validators/product.schema";
import { slugify } from "@/lib/utils";

import type { ApiError } from "@/types/api.types";
import type {
  Category,
  OptionValue,
  Product,
  ProductMedia,
  ProductOption,
  ProductOptionType,
  ProductVariant,
  ProductStatus,
} from "@/types";

const MAX_MEDIA_COUNT = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

const PRODUCT_STATUS_OPTIONS = [
  PRODUCT_STATUS.DRAFT,
  PRODUCT_STATUS.HIDDEN,
  PRODUCT_STATUS.PUBLISHED,
] as ProductStatus[];

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type NewOptionDraft = {
  name: string;
  type: ProductOptionType;
};

type NewOptionValueDraft = {
  value: string;
  color_hex: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
};

type SectionKey =
  | "basic"
  | "inventory"
  | "advanced";

const DEFAULT_COLOR_HEX = "#000000";

const OPTION_TYPE_LABELS: Record<ProductOptionType, string> = {
  TEXT: "نص",
  COLOR: "لون",
  IMAGE: "صورة",
};

function createEmptyOptionValueDraft(): NewOptionValueDraft {
  return {
    value: "",
    color_hex: DEFAULT_COLOR_HEX,
    imageFile: null,
    imagePreviewUrl: null,
  };
}

function sortOptionValues(values: OptionValue[]) {
  return [...values].sort((a, b) => a.position - b.position);
}

function sortProductOptions(options: ProductOption[]) {
  return [...options]
    .sort((a, b) => a.position - b.position)
    .map((option) => ({
      ...option,
      values: sortOptionValues(option.values || []),
    }));
}

function replaceProductOption(
  options: ProductOption[],
  updatedOption: ProductOption,
) {
  return sortProductOptions(
    options.map((option) =>
      option.id === updatedOption.id ? updatedOption : option,
    ),
  );
}

function sortProductVariants(variants: ProductVariant[]) {
  return [...variants].sort((a, b) => {
    if (a.is_default === b.is_default) return a.id - b.id;
    return a.is_default ? -1 : 1;
  });
}

function createDraftId() {
  return -Math.floor(Date.now() + Math.random() * 100000);
}

function isDraftId(id: number) {
  return id < 0;
}

function getAvailableProductStatuses(currentStatus: ProductStatus) {
  return PRODUCT_STATUS_OPTIONS.filter((status) => status !== currentStatus);
}

function getDefaultVariant(product?: Product | null) {
  const variants = product?.variants || [];
  return variants.find((variant) => variant.is_default) || variants[0];
}

function getProductDefaults(product?: Product | null): ProductFormData {
  const defaultVariant = getDefaultVariant(product);

  return {
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    short_description: product?.short_description || "",
    base_price: product?.base_price || "",
    compare_at_price: product?.compare_at_price || "",
    cost_price: product?.cost_price || "",
    status: product?.status || "DRAFT",
    track_inventory: product?.track_inventory ?? true,
    has_variants: product?.has_variants ?? false,
    inventory_quantity: String(
      defaultVariant?.inventory?.available_quantity ?? 0,
    ),
    low_stock_threshold: String(
      defaultVariant?.inventory?.low_stock_threshold ?? 5,
    ),
    meta_title: "",
    meta_description: "",
  };
}

function validateImageFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" نوع الملف غير مدعوم. الصيغ المقبولة: JPEG, PNG, WebP`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" يتجاوز الحد الأقصى 5MB`;
  }

  return null;
}

function createPendingImage(file: File): PendingImage {
  return {
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function SectionCard({
  title,
  description,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
          onClick={onToggle}
        >
          <span className="flex min-w-0 items-center gap-3">
            {icon}
            <span className="min-w-0">
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <span className="mt-1 block text-sm font-normal text-muted-foreground">
                  {description}
                </span>
              )}
            </span>
          </span>
          {open ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {open && <CardContent className="space-y-6 pt-0">{children}</CardContent>}
    </Card>
  );
}

export interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  loading?: boolean;
  onSubmit: (
    data: ProductFormData & { category_ids: number[] },
  ) => Promise<Product | void>;
  onStatusChange?: (newStatus: ProductStatus) => Promise<void>;
}

export function ProductForm({
  product,
  categories,
  loading = false,
  onSubmit,
  onStatusChange,
}: ProductFormProps) {
  const router = useRouter();
  const { currentStoreId, stores } = useStore();
  const t = useTranslations("productForm");
  const tCommon = useTranslations("common");
  const isEditMode = !!product;

  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    product?.categories?.map((category) => category.id) || [],
  );
  const [existingMedia, setExistingMedia] = useState<ProductMedia[]>(
    product?.media || [],
  );
  const [productOptions, setProductOptions] = useState<ProductOption[]>(
    sortProductOptions(product?.options || []),
  );
  const [productVariants, setProductVariants] = useState<ProductVariant[]>(
    sortProductVariants(product?.variants || []),
  );
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [newOptionDraft, setNewOptionDraft] = useState<NewOptionDraft>({
    name: "",
    type: "TEXT",
  });
  const [newValueDrafts, setNewValueDrafts] = useState<
    Record<number, NewOptionValueDraft>
  >({});
  const [draftOptionValueImages, setDraftOptionValueImages] = useState<
    Record<number, File>
  >({});
  const [creatingOption, setCreatingOption] = useState(false);
  const [savingOptionId, setSavingOptionId] = useState<number | null>(null);
  const [savingValueId, setSavingValueId] = useState<number | null>(null);
  const [creatingValueOptionId, setCreatingValueOptionId] = useState<
    number | null
  >(null);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [uploadingOptionValueId, setUploadingOptionValueId] = useState<
    number | null
  >(null);
  const [pendingPrimaryImage, setPendingPrimaryImage] =
    useState<PendingImage | null>(null);
  const [pendingGalleryImages, setPendingGalleryImages] = useState<
    PendingImage[]
  >([]);
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!isEditMode);
  const [draftSaving, setDraftSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [savingInventory, setSavingInventory] = useState(false);
  const [editingVariantInventoryId, setEditingVariantInventoryId] = useState<
    number | null
  >(null);
  const [variantQuantityDrafts, setVariantQuantityDrafts] = useState<
    Record<number, string>
  >({});
  const [isPrimaryDragOver, setIsPrimaryDragOver] = useState(false);
  const [isGalleryDragOver, setIsGalleryDragOver] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      basic: true,
      inventory: true,
      advanced: false,
    },
  );

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: getProductDefaults(product),
  });

  useUnsavedChanges({ isDirty });

  const formId = isEditMode ? `product-edit-${product?.id}` : "product-create";

  const currentStore = useMemo(
    () => stores.find((store) => store.id === currentStoreId),
    [currentStoreId, stores],
  );

  const productStorefrontUrl = useMemo(() => {
    if (!product?.slug || !currentStore?.domain) return null;

    return ROUTES.STOREFRONT.PRODUCT_DETAIL(currentStore.domain, product.slug);
  }, [currentStore?.domain, product?.slug]);

  const openProductPreview = useCallback(() => {
    if (!productStorefrontUrl) return;

    window.open(productStorefrontUrl, "_blank", "noopener,noreferrer");
  }, [productStorefrontUrl]);

  const copyProductLink = useCallback(async () => {
    if (!productStorefrontUrl) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${productStorefrontUrl}`,
      );
      toast.success("تم نسخ رابط المنتج");
    } catch {
      toast.error("تعذر نسخ رابط المنتج");
    }
  }, [productStorefrontUrl]);

  const shareProduct = useCallback(async () => {
    if (!productStorefrontUrl) return;

    const url = `${window.location.origin}${productStorefrontUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name || "المنتج",
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط المنتج للمشاركة");
    } catch {
      toast.error("تعذر مشاركة المنتج");
    }
  }, [product?.name, productStorefrontUrl]);

  const { hasDraft, restoreDraft, clearDraft } = useAutoSaveDraft(
    formId,
    watch,
  );

  useEffect(() => {
    if (hasDraft && !isEditMode) {
      setShowDraftPrompt(true);
    }
  }, [hasDraft, isEditMode]);

  useEffect(() => {
    if (!product) return;

    reset(getProductDefaults(product));
    setSelectedCategories(
      product.categories?.map((category) => category.id) || [],
    );
    setExistingMedia(
      [...(product.media || [])].sort((a, b) => a.sort_order - b.sort_order),
    );
    setProductOptions(sortProductOptions(product.options || []));
    setProductVariants(sortProductVariants(product.variants || []));
    setEditingOptionId(null);
    setNewValueDrafts({});
    setDraftOptionValueImages({});
    setEditingVariantInventoryId(null);
    setVariantQuantityDrafts({});
    setPendingPrimaryImage(null);
    setPendingGalleryImages([]);
    setAutoSlug(!product.slug);
  }, [product, reset]);

  const nameValue = watch("name");
  const hasVariantsValue = watch("has_variants") ?? false;
  const trackInventoryValue = watch("track_inventory") ?? true;
  const metaTitleValue = watch("meta_title") || "";
  const metaDescriptionValue = watch("meta_description") || "";

  useEffect(() => {
    if (autoSlug) {
      setValue("slug", nameValue ? slugify(nameValue) : "", {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [autoSlug, nameValue, setValue]);

  const flatCategories = useMemo(() => {
    const flat: Array<Category & { level: number }> = [];
    const flatten = (cats: Category[], level: number) => {
      for (const cat of cats) {
        flat.push({ ...cat, level });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, level + 1);
        }
      }
    };
    flatten(categories, 0);
    return flat;
  }, [categories]);

  const defaultVariant = productVariants.find((variant) => variant.is_default);

  const availableTransitions = useMemo(() => {
    if (!product) return [];
    return getAvailableProductStatuses(product.status);
  }, [product]);

  const primaryMedia = existingMedia[0] || null;
  const visiblePrimaryImage = pendingPrimaryImage || primaryMedia;
  const primaryImageSrc = visiblePrimaryImage
    ? "previewUrl" in visiblePrimaryImage
      ? visiblePrimaryImage.previewUrl
      : visiblePrimaryImage.url
    : null;
  const primaryImageAlt = visiblePrimaryImage
    ? "file" in visiblePrimaryImage
      ? visiblePrimaryImage.file.name
      : visiblePrimaryImage.alt_text || "الصورة الرئيسية"
    : "الصورة الرئيسية";
  const galleryMedia = pendingPrimaryImage
    ? existingMedia
    : existingMedia.slice(1);
  const totalImageCount =
    existingMedia.length +
    (pendingPrimaryImage ? 1 : 0) +
    pendingGalleryImages.length;

  const toggleSection = useCallback((section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleCategory = useCallback((categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  const handleRestoreDraft = useCallback(() => {
    const data = restoreDraft();
    if (data) {
      reset(data);
    }
    setShowDraftPrompt(false);
  }, [restoreDraft, reset]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowDraftPrompt(false);
  }, [clearDraft]);

  const handleSelectPrimaryImage = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setPendingPrimaryImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return createPendingImage(file);
    });
  }, []);

  const handleSelectGalleryImages = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = MAX_MEDIA_COUNT - totalImageCount;
      if (remainingSlots <= 0) {
        toast.error(`تم الوصول للحد الأقصى (${MAX_MEDIA_COUNT} صورة)`);
        return;
      }

      const errors: string[] = [];
      const nextImages: PendingImage[] = [];

      Array.from(files)
        .slice(0, remainingSlots)
        .forEach((file) => {
          const error = validateImageFile(file);
          if (error) {
            errors.push(error);
            return;
          }

          nextImages.push(createPendingImage(file));
        });

      if (files.length > remainingSlots) {
        errors.push(
          `تم تجاهل ${files.length - remainingSlots} صورة بسبب الحد الأقصى`,
        );
      }

      if (errors.length > 0) {
        toast.error(errors.join("\n"));
      }

      if (nextImages.length > 0) {
        setPendingGalleryImages((prev) => [...prev, ...nextImages]);
      }
    },
    [totalImageCount],
  );

  const removePendingPrimaryImage = useCallback(() => {
    setPendingPrimaryImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const removePendingGalleryImage = useCallback((imageId: string) => {
    setPendingGalleryImages((prev) => {
      const image = prev.find((item) => item.id === imageId);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return prev.filter((item) => item.id !== imageId);
    });
  }, []);

  const uploadMediaFile = useCallback(
    async (productId: number, image: PendingImage) => {
      if (!currentStoreId) return null;

      const formData = new FormData();
      formData.append("file", image.file);

      const response = await apiClient<{
        data: { media: ProductMedia };
      }>(`${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media`, {
        method: "POST",
        body: formData,
        storeId: currentStoreId,
      });

      return response.data.media;
    },
    [currentStoreId],
  );

  const uploadStandaloneImage = useCallback(
    async (file: File) => {
      if (!currentStoreId) return null;

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient<{
        data: { file: { url: string } };
      }>(API_ENDPOINTS.UPLOAD.IMAGE, {
        method: "POST",
        body: formData,
        storeId: currentStoreId,
      });

      return response.data.file.url;
    },
    [currentStoreId],
  );

  const reorderMedia = useCallback(
    async (productId: number, mediaItems: ProductMedia[]) => {
      if (!currentStoreId || mediaItems.length === 0) return mediaItems;

      const response = await apiClient<{
        data: { media: ProductMedia[] };
      }>(
        `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media/reorder`,
        {
          method: "PATCH",
          body: {
            items: mediaItems.map((item, index) => ({
              id: item.id,
              sort_order: index,
            })),
          },
          storeId: currentStoreId,
        },
      );

      return response.data.media;
    },
    [currentStoreId],
  );

  const uploadPendingImages = useCallback(
    async (productId: number) => {
      if (
        !currentStoreId ||
        (!pendingPrimaryImage && pendingGalleryImages.length === 0)
      ) {
        return;
      }

      setUploadingImages(true);
      const failedUploads: string[] = [];
      const uploadedGalleryIds: string[] = [];
      let uploadedPrimary: ProductMedia | null = null;
      const uploadedGallery: ProductMedia[] = [];

      try {
        if (pendingPrimaryImage) {
          try {
            uploadedPrimary = await uploadMediaFile(
              productId,
              pendingPrimaryImage,
            );
            URL.revokeObjectURL(pendingPrimaryImage.previewUrl);
          } catch {
            failedUploads.push(pendingPrimaryImage.file.name);
          }
        }

        for (const image of pendingGalleryImages) {
          try {
            const media = await uploadMediaFile(productId, image);
            if (media) uploadedGallery.push(media);
            URL.revokeObjectURL(image.previewUrl);
            uploadedGalleryIds.push(image.id);
          } catch {
            failedUploads.push(image.file.name);
          }
        }

        let nextMedia = [...existingMedia, ...uploadedGallery];
        if (uploadedPrimary) {
          nextMedia = [
            uploadedPrimary,
            ...nextMedia.filter((item) => item.id !== uploadedPrimary?.id),
          ];
          nextMedia = await reorderMedia(productId, nextMedia);
        }

        setExistingMedia(nextMedia.sort((a, b) => a.sort_order - b.sort_order));
        if (uploadedPrimary) setPendingPrimaryImage(null);
        setPendingGalleryImages((prev) =>
          prev.filter((image) => !uploadedGalleryIds.includes(image.id)),
        );

        if (failedUploads.length > 0) {
          throw new Error(`فشل رفع الصور: ${failedUploads.join(", ")}`);
        }
      } finally {
        setUploadingImages(false);
      }
    },
    [
      currentStoreId,
      existingMedia,
      pendingGalleryImages,
      pendingPrimaryImage,
      reorderMedia,
      uploadMediaFile,
    ],
  );

  const deleteExistingMedia = useCallback(
    async (mediaItem: ProductMedia) => {
      if (!currentStoreId || !product?.id) return;

      try {
        await apiClient(
          `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${product.id}/media/${mediaItem.id}`,
          {
            method: "DELETE",
            storeId: currentStoreId,
          },
        );
        setExistingMedia((prev) =>
          prev.filter((item) => item.id !== mediaItem.id),
        );
        toast.success("تم حذف الصورة");
      } catch {
        toast.error("فشل حذف الصورة");
      }
    },
    [currentStoreId, product?.id],
  );

  const getNewValueDraft = useCallback(
    (optionId: number) =>
      newValueDrafts[optionId] || createEmptyOptionValueDraft(),
    [newValueDrafts],
  );

  const patchOption = useCallback(
    (optionId: number, patch: Partial<ProductOption>) => {
      setProductOptions((prev) =>
        prev.map((option) =>
          option.id === optionId ? { ...option, ...patch } : option,
        ),
      );
    },
    [],
  );

  const patchOptionValue = useCallback(
    (optionId: number, valueId: number, patch: Partial<OptionValue>) => {
      setProductOptions((prev) =>
        prev.map((option) =>
          option.id === optionId
            ? {
                ...option,
                values: sortOptionValues(
                  option.values.map((value) =>
                    value.id === valueId ? { ...value, ...patch } : value,
                  ),
                ),
              }
            : option,
        ),
      );
    },
    [],
  );

  const handleCreateOption = useCallback(async () => {
    const name = newOptionDraft.name.trim() || "خيار";

    if (!product?.id) {
      const draftOption: ProductOption = {
        id: createDraftId(),
        name,
        type: newOptionDraft.type,
        position: productOptions.length,
        values: [],
      };

      setProductOptions((prev) => sortProductOptions([...prev, draftOption]));
      setEditingOptionId(draftOption.id);
      setNewOptionDraft({ name: "", type: "TEXT" });
      return;
    }

    if (!currentStoreId) return;

    setCreatingOption(true);
    try {
      const option = await productService.createOption(currentStoreId, product.id, {
        name,
        type: newOptionDraft.type,
        position: productOptions.length,
      });
      setProductOptions((prev) => sortProductOptions([...prev, option.data]));
      setEditingOptionId(option.data.id);
      setNewOptionDraft({ name: "", type: "TEXT" });
      toast.success("تم إضافة الخيار");
      router.refresh();
    } catch {
      toast.error("تعذر إضافة الخيار");
    } finally {
      setCreatingOption(false);
    }
  }, [
    currentStoreId,
    newOptionDraft.name,
    newOptionDraft.type,
    product?.id,
    productOptions.length,
    router,
  ]);

  const handleSaveOption = useCallback(
    async (option: ProductOption) => {
      if (isDraftId(option.id)) {
        return;
      }

      if (!currentStoreId || !product?.id) return;

      const name = option.name.trim();
      if (!name) {
        toast.error("اسم الخيار مطلوب");
        return;
      }

      setSavingOptionId(option.id);
      try {
        const updated = await productService.updateOption(
          currentStoreId,
          product.id,
          option.id,
          {
            name,
            type: option.type,
            position: option.position,
          },
        );
        setProductOptions((prev) => replaceProductOption(prev, updated.data));
        router.refresh();
      } catch {
        toast.error("تعذر حفظ الخيار");
      } finally {
        setSavingOptionId(null);
      }
    },
    [currentStoreId, product?.id, router],
  );

  const handleDeleteOption = useCallback(
    async (optionId: number) => {
      if (isDraftId(optionId)) {
        setProductOptions((prev) =>
          prev.filter((option) => option.id !== optionId),
        );
        setEditingOptionId((current) =>
          current === optionId ? null : current,
        );
        return;
      }

      if (!currentStoreId || !product?.id) return;

      setSavingOptionId(optionId);
      try {
        await productService.deleteOption(currentStoreId, product.id, optionId);
        setProductOptions((prev) =>
          prev.filter((option) => option.id !== optionId),
        );
        setEditingOptionId((current) =>
          current === optionId ? null : current,
        );
        toast.success("تم حذف الخيار");
        router.refresh();
      } catch {
        toast.error("تعذر حذف الخيار");
      } finally {
        setSavingOptionId(null);
      }
    },
    [currentStoreId, product?.id, router],
  );

  const handleDuplicateOption = useCallback(
    async (option: ProductOption) => {
      const copiedName = `${option.name || "خيار"} نسخة`;

      if (!product?.id || isDraftId(option.id)) {
        const copiedOptionId = createDraftId();
        const copiedOption: ProductOption = {
          id: copiedOptionId,
          name: copiedName,
          type: option.type,
          position: productOptions.length,
          values: option.values.map((optionValue, index) => ({
            ...optionValue,
            id: createDraftId(),
            position: index,
          })),
        };

        setProductOptions((prev) => sortProductOptions([...prev, copiedOption]));
        setEditingOptionId(copiedOptionId);
        toast.success("تم نسخ الخيار");
        return;
      }

      if (!currentStoreId) return;

      setCreatingOption(true);
      try {
        const createdOption = await productService.createOption(
          currentStoreId,
          product.id,
          {
            name: copiedName,
            type: option.type,
            position: productOptions.length,
          },
        );

        let copiedOption = createdOption.data;

        for (const optionValue of option.values) {
          const updatedOption = await productService.addOptionValue(
            currentStoreId,
            product.id,
            copiedOption.id,
            {
              value: optionValue.value,
              color_hex:
                option.type === "COLOR"
                  ? optionValue.color_hex || DEFAULT_COLOR_HEX
                  : null,
              image_url:
                option.type === "IMAGE" ? optionValue.image_url || null : null,
              position: optionValue.position,
            },
          );
          copiedOption = updatedOption.data;
        }

        setProductOptions((prev) => sortProductOptions([...prev, copiedOption]));
        setEditingOptionId(copiedOption.id);
        toast.success("تم نسخ الخيار");
        router.refresh();
      } catch {
        toast.error("تعذر نسخ الخيار");
      } finally {
        setCreatingOption(false);
      }
    },
    [currentStoreId, product?.id, productOptions.length, router],
  );

  const handleSaveOptionTemplate = useCallback((option: ProductOption) => {
    const template = {
      name: option.name,
      type: option.type,
      values: option.values.map((optionValue) => ({
        value: optionValue.value,
        color_hex: optionValue.color_hex,
        image_url: optionValue.image_url,
      })),
    };

    window.localStorage.setItem(
      `product-option-template:${option.name || option.id}`,
      JSON.stringify(template),
    );
    toast.success("تم حفظ قالب الخيار");
  }, []);

  const handleNewValueDraftChange = useCallback(
    (optionId: number, patch: Partial<NewOptionValueDraft>) => {
      setNewValueDrafts((prev) => ({
        ...prev,
        [optionId]: {
          ...createEmptyOptionValueDraft(),
          ...prev[optionId],
          ...patch,
        },
      }));
    },
    [],
  );

  const handleAddOptionValue = useCallback(
    async (option: ProductOption) => {
      const draft = getNewValueDraft(option.id);
      const value = draft.value.trim();

      if (!value) {
        toast.error("اكتب قيمة الخيار");
        return;
      }

      if (!product?.id || isDraftId(option.id)) {
        const valueId = createDraftId();
        let imageUrl: string | null = null;

        if (option.type === "IMAGE" && draft.imageFile) {
          const error = validateImageFile(draft.imageFile);
          if (error) {
            toast.error(error);
            return;
          }

          imageUrl = URL.createObjectURL(draft.imageFile);
          setDraftOptionValueImages((prev) => ({
            ...prev,
            [valueId]: draft.imageFile as File,
          }));
        }

        const optionValue: OptionValue = {
          id: valueId,
          value,
          color_hex:
            option.type === "COLOR"
              ? draft.color_hex || DEFAULT_COLOR_HEX
              : null,
          image_url: option.type === "IMAGE" ? imageUrl : null,
          position: option.values.length,
        };

        setProductOptions((prev) =>
          prev.map((item) =>
            item.id === option.id
              ? {
                  ...item,
                  values: sortOptionValues([...item.values, optionValue]),
                }
              : item,
          ),
        );
        setNewValueDrafts((prev) => {
          const next = { ...prev };
          delete next[option.id];
          return next;
        });
        return;
      }

      if (!currentStoreId) return;

      setCreatingValueOptionId(option.id);
      try {
        let imageUrl: string | null = null;
        if (option.type === "IMAGE" && draft.imageFile) {
          const error = validateImageFile(draft.imageFile);
          if (error) {
            toast.error(error);
            return;
          }
          imageUrl = await uploadStandaloneImage(draft.imageFile);
        }

        const updated = await productService.addOptionValue(
          currentStoreId,
          product.id,
          option.id,
          {
            value,
            color_hex:
              option.type === "COLOR" ? draft.color_hex || DEFAULT_COLOR_HEX : null,
            image_url: option.type === "IMAGE" ? imageUrl : null,
            position: option.values.length,
          },
        );

        setProductOptions((prev) => replaceProductOption(prev, updated.data));
        setNewValueDrafts((prev) => {
          const next = { ...prev };
          delete next[option.id];
          return next;
        });
        toast.success("تم إضافة قيمة الخيار");
        router.refresh();
      } catch {
        toast.error("تعذر إضافة قيمة الخيار");
      } finally {
        setCreatingValueOptionId(null);
      }
    },
    [
      currentStoreId,
      getNewValueDraft,
      product?.id,
      router,
      uploadStandaloneImage,
    ],
  );

  const handleSaveOptionValue = useCallback(
    async (option: ProductOption, optionValue: OptionValue) => {
      if (isDraftId(option.id) || isDraftId(optionValue.id)) {
        return;
      }

      if (!currentStoreId || !product?.id) return;

      const value = optionValue.value.trim();
      if (!value) {
        toast.error("قيمة الخيار مطلوبة");
        return;
      }

      setSavingValueId(optionValue.id);
      try {
        const updated = await productService.updateOptionValue(
          currentStoreId,
          product.id,
          option.id,
          optionValue.id,
          {
            value,
            color_hex:
              option.type === "COLOR"
                ? optionValue.color_hex || DEFAULT_COLOR_HEX
                : null,
            image_url:
              option.type === "IMAGE" ? optionValue.image_url || null : null,
            position: optionValue.position,
          },
        );
        setProductOptions((prev) => replaceProductOption(prev, updated.data));
        router.refresh();
      } catch {
        toast.error("تعذر حفظ قيمة الخيار");
      } finally {
        setSavingValueId(null);
      }
    },
    [currentStoreId, product?.id, router],
  );

  const handleDeleteOptionValue = useCallback(
    async (optionId: number, valueId: number) => {
      if (isDraftId(optionId) || isDraftId(valueId)) {
        setProductOptions((prev) =>
          prev.map((option) =>
            option.id === optionId
              ? {
                  ...option,
                  values: option.values.filter((value) => value.id !== valueId),
                }
              : option,
          ),
        );
        setDraftOptionValueImages((prev) => {
          const next = { ...prev };
          delete next[valueId];
          return next;
        });
        return;
      }

      if (!currentStoreId || !product?.id) return;

      setSavingValueId(valueId);
      try {
        const updated = await productService.deleteOptionValue(
          currentStoreId,
          product.id,
          optionId,
          valueId,
        );
        setProductOptions((prev) => replaceProductOption(prev, updated.data));
        toast.success("تم حذف قيمة الخيار");
        router.refresh();
      } catch {
        toast.error("تعذر حذف قيمة الخيار");
      } finally {
        setSavingValueId(null);
      }
    },
    [currentStoreId, product?.id, router],
  );

  const handleUploadOptionValueImage = useCallback(
    async (option: ProductOption, optionValue: OptionValue, file: File) => {
      const error = validateImageFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      if (!product?.id || isDraftId(option.id) || isDraftId(optionValue.id)) {
        const imageUrl = URL.createObjectURL(file);
        patchOptionValue(option.id, optionValue.id, { image_url: imageUrl });
        setDraftOptionValueImages((prev) => ({
          ...prev,
          [optionValue.id]: file,
        }));
        return;
      }

      if (!currentStoreId) return;

      setUploadingOptionValueId(optionValue.id);
      try {
        const imageUrl = await uploadStandaloneImage(file);
        const updated = await productService.updateOptionValue(
          currentStoreId,
          product.id,
          option.id,
          optionValue.id,
          {
            value: optionValue.value,
            image_url: imageUrl,
            position: optionValue.position,
          },
        );
        setProductOptions((prev) => replaceProductOption(prev, updated.data));
        toast.success("تم رفع صورة القيمة");
        router.refresh();
      } catch {
        toast.error("تعذر رفع صورة القيمة");
      } finally {
        setUploadingOptionValueId(null);
      }
    },
    [currentStoreId, patchOptionValue, product?.id, router, uploadStandaloneImage],
  );

  const handleGenerateVariants = useCallback(async () => {
    if (!product?.id) {
      toast.info("سيتم توليد المتغيرات تلقائياً بعد حفظ المنتج");
      return;
    }

    if (!currentStoreId) return;

    setGeneratingVariants(true);
    try {
      await productService.generateVariants(currentStoreId, product.id);
      const variants = await productService.getVariants(currentStoreId, product.id);
      setProductVariants(sortProductVariants(variants.data));
      toast.success("تم توليد المتغيرات من الخيارات");
      router.refresh();
    } catch {
      toast.error("تعذر توليد المتغيرات");
    } finally {
      setGeneratingVariants(false);
    }
  }, [currentStoreId, product?.id, router]);

  const handleConfirmOption = useCallback(
    async (option: ProductOption) => {
      const optionName = option.name.trim();
      const draft = getNewValueDraft(option.id);
      const hasDraftValue = draft.value.trim().length > 0;
      const hasExistingValues = option.values.some(
        (optionValue) => optionValue.value.trim().length > 0,
      );

      if (!optionName) {
        toast.error("اسم الخيار مطلوب");
        return;
      }

      if (!hasExistingValues && !hasDraftValue) {
        toast.error("أضف قيمة واحدة على الأقل لهذا الخيار");
        return;
      }

      await handleSaveOption(option);

      for (const optionValue of option.values) {
        await handleSaveOptionValue(option, optionValue);
      }

      if (hasDraftValue) {
        await handleAddOptionValue(option);
      }

      await handleGenerateVariants();
      setEditingOptionId(null);
    },
    [
      getNewValueDraft,
      handleAddOptionValue,
      handleGenerateVariants,
      handleSaveOption,
      handleSaveOptionValue,
    ],
  );

  const syncDefaultInventory = useCallback(
    async (savedProduct: Product | void, data: ProductFormData) => {
      if (
        !currentStoreId ||
        data.has_variants ||
        data.track_inventory === false
      ) {
        return;
      }

      const productForInventory = savedProduct || product;
      const variant =
        productForInventory?.variants?.find((item) => item.is_default) ||
        productForInventory?.variants?.[0] ||
        defaultVariant;

      if (!variant?.id) {
        throw new Error(
          "تعذر تحديث المخزون لأن المنتج لا يحتوي على متغير افتراضي.",
        );
      }

      const quantity = Number.parseInt(data.inventory_quantity || "0", 10);
      const lowStockThreshold = Number.parseInt(
        data.low_stock_threshold || "5",
        10,
      );

      setSavingInventory(true);
      try {
        await inventoryService.update(currentStoreId, variant.id, {
          available_quantity: Number.isNaN(quantity) ? 0 : quantity,
          low_stock_threshold: Number.isNaN(lowStockThreshold)
            ? 5
            : lowStockThreshold,
          reason: "تحديث من نموذج المنتج",
        });
      } finally {
        setSavingInventory(false);
      }
    },
    [currentStoreId, defaultVariant, product],
  );

  const handleEditVariantInventory = useCallback((variant: ProductVariant) => {
    setEditingVariantInventoryId(variant.id);
    setVariantQuantityDrafts((prev) => ({
      ...prev,
      [variant.id]: String(variant.inventory?.available_quantity ?? 0),
    }));
  }, []);

  const handleSaveVariantInventory = useCallback(
    async (variant: ProductVariant) => {
      if (!currentStoreId) return;

      const quantity = Number.parseInt(
        variantQuantityDrafts[variant.id] ??
          String(variant.inventory?.available_quantity ?? 0),
        10,
      );

      setSavingInventory(true);
      try {
        const updatedInventory = await inventoryService.update(currentStoreId, variant.id, {
          available_quantity: Number.isNaN(quantity) ? 0 : quantity,
          reason: "تحديث كمية المتغير من نموذج المنتج",
        });
        setProductVariants((prev) =>
          prev.map((item) =>
            item.id === variant.id
              ? { ...item, inventory: updatedInventory.data }
              : item,
          ),
        );
        setEditingVariantInventoryId(null);
        toast.success("تم تحديث كمية المتغير");
        router.refresh();
      } catch {
        toast.error("تعذر تحديث كمية المتغير");
      } finally {
        setSavingInventory(false);
      }
    },
    [currentStoreId, router, variantQuantityDrafts],
  );

  const syncDraftProductOptions = useCallback(
    async (productId: number, data: ProductFormData) => {
      if (!currentStoreId || !data.has_variants) return;

      const hasDraftOptions = productOptions.some(
        (option) =>
          isDraftId(option.id) ||
          option.values.some((optionValue) => isDraftId(optionValue.id)),
      );

      if (!hasDraftOptions) return;

      const syncedOptions: ProductOption[] = [];

      for (const option of productOptions) {
        const optionName = option.name.trim();
        if (!optionName) continue;

        let persistedOption = option;

        if (isDraftId(option.id)) {
          const createdOption = await productService.createOption(
            currentStoreId,
            productId,
            {
              name: optionName,
              type: option.type,
              position: option.position,
            },
          );
          persistedOption = createdOption.data;
        }

        let optionWithValues = persistedOption;

        for (const optionValue of option.values) {
          if (!isDraftId(optionValue.id)) continue;

          const value = optionValue.value.trim();
          if (!value) continue;

          const draftImageFile = draftOptionValueImages[optionValue.id];
          const imageUrl =
            option.type === "IMAGE" && draftImageFile
              ? await uploadStandaloneImage(draftImageFile)
              : null;

          const updatedOption = await productService.addOptionValue(
            currentStoreId,
            productId,
            persistedOption.id,
            {
              value,
              color_hex:
                option.type === "COLOR"
                  ? optionValue.color_hex || DEFAULT_COLOR_HEX
                  : null,
              image_url: option.type === "IMAGE" ? imageUrl : null,
              position: optionValue.position,
            },
          );

          optionWithValues = updatedOption.data;
        }

        syncedOptions.push(optionWithValues);
      }

      if (syncedOptions.length === 0) return;

      setProductOptions(sortProductOptions(syncedOptions));

      const hasValues = syncedOptions.some((option) => option.values.length > 0);
      if (hasValues) {
        await productService.generateVariants(currentStoreId, productId);
        const variants = await productService.getVariants(currentStoreId, productId);
        setProductVariants(sortProductVariants(variants.data));
      }
    },
    [
      currentStoreId,
      draftOptionValueImages,
      productOptions,
      uploadStandaloneImage,
    ],
  );

  const handleStatusChange = useCallback(
    async (newStatus: ProductStatus) => {
      if (!onStatusChange || !product) return;

      setStatusLoading(true);
      try {
        await onStatusChange(newStatus);
        toast.success(t("statusChanged"));
      } catch {
        toast.error(t("statusChangeFailed"));
      } finally {
        setStatusLoading(false);
      }
    },
    [onStatusChange, product, t],
  );

  const handleSubmitWithImages = async (data: ProductFormData) => {
    setSummaryErrors([]);

    try {
      const savedProduct = await onSubmit({
        ...data,
        category_ids: selectedCategories,
      });
      const targetProductId = savedProduct?.id ?? product?.id;

      await syncDefaultInventory(savedProduct, data);

      if (targetProductId) {
        await syncDraftProductOptions(targetProductId, data);
        await uploadPendingImages(targetProductId);
      }

      clearDraft();

      if (!isEditMode && savedProduct?.id) {
        router.push(ROUTES.STORE_ADMIN.PRODUCT_EDIT(savedProduct.id));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSummaryErrors([err.message]);
        return;
      }

      if (typeof err === "string") {
        setSummaryErrors([err]);
        return;
      }

      const apiError = err as ApiError;
      if (apiError?.errors || apiError?.message) {
        const fieldNames = [
          "name",
          "slug",
          "description",
          "short_description",
          "base_price",
          "compare_at_price",
          "cost_price",
          "status",
          "track_inventory",
          "has_variants",
          "inventory_quantity",
          "low_stock_threshold",
          "meta_title",
          "meta_description",
        ];
        const unmapped = mapServerErrorsToForm(apiError, setError, fieldNames);
        setSummaryErrors(unmapped);
      } else {
        setSummaryErrors([t("unexpectedError")]);
      }
    }
  };

  const handleSaveAsDraft = useCallback(async () => {
    const currentData = watch();
    setSummaryErrors([]);
    setDraftSaving(true);

    try {
      const savedProduct = await onSubmit({
        ...currentData,
        status: "DRAFT",
        category_ids: selectedCategories,
      });
      const targetProductId = savedProduct?.id ?? product?.id;

      await syncDefaultInventory(savedProduct, currentData);

      if (targetProductId) {
        await syncDraftProductOptions(targetProductId, currentData);
        await uploadPendingImages(targetProductId);
      }

      clearDraft();
      toast.success(t("savedAsDraft"));

      if (!isEditMode && savedProduct?.id) {
        router.push(ROUTES.STORE_ADMIN.PRODUCT_EDIT(savedProduct.id));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSummaryErrors([err.message]);
      } else if (typeof err === "string") {
        setSummaryErrors([err]);
      } else {
        const apiError = err as ApiError;
        if (apiError?.errors || apiError?.message) {
          const fieldNames = [
            "name",
            "slug",
            "description",
            "short_description",
            "base_price",
            "compare_at_price",
            "cost_price",
            "status",
            "track_inventory",
            "has_variants",
            "inventory_quantity",
            "low_stock_threshold",
            "meta_title",
            "meta_description",
          ];
          const unmapped = mapServerErrorsToForm(
            apiError,
            setError,
            fieldNames,
          );
          setSummaryErrors(unmapped);
        } else {
          setSummaryErrors([t("unexpectedError")]);
        }
      }
    } finally {
      setDraftSaving(false);
    }
  }, [
    clearDraft,
    isEditMode,
    onSubmit,
    product?.id,
    router,
    selectedCategories,
    setError,
    t,
    syncDefaultInventory,
    syncDraftProductOptions,
    uploadPendingImages,
    watch,
  ]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDraftPrompt && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">{t("draftFound")}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscardDraft}>
                {t("startFresh")}
              </Button>
              <Button size="sm" onClick={handleRestoreDraft}>
                {t("restoreDraft")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <FormSummaryError errors={summaryErrors} />

      {isEditMode && product && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 lg:flex-row-reverse lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!productStorefrontUrl}
                onClick={openProductPreview}
                aria-label="معاينة المنتج في المتجر"
              >
                <Eye className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!productStorefrontUrl}
                onClick={copyProductLink}
              >
                <Copy className="h-4 w-4" />
                نسخ رابط المنتج
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!productStorefrontUrl}
                onClick={shareProduct}
              >
                <Share2 className="h-4 w-4" />
                مشاركة المنتج
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="المزيد"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableTransitions.length === 0 ? (
                    <DropdownMenuItem disabled>لا توجد إجراءات</DropdownMenuItem>
                  ) : (
                    availableTransitions.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        disabled={statusLoading}
                        onClick={() => handleStatusChange(status)}
                      >
                        {PRODUCT_STATUS_LABELS[status].ar}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("currentStatus")}:
              </span>
              <Badge variant="outline">
                {PRODUCT_STATUS_LABELS[product.status].ar}
              </Badge>

            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(handleSubmitWithImages)}>
        <div className="space-y-6">
          <SectionCard
            title="المعلومات الأساسية"
            description="صور المنتج، الاسم، الأسعار، التصنيف، المتغيرات والوصف."
            icon={<Package className="h-5 w-5 text-primary" />}
            open={openSections.basic}
            onToggle={() => toggleSection("basic")}
          >
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">بيانات المنتج</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  الاسم، السعر، التكلفة والتصنيفات.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormField
                control={control}
                name="name"
                label={t("fields.name")}
                placeholder={t("placeholders.name")}
                required
              />
              {!isEditMode && (
                <FormField
                  control={control}
                  name="status"
                  label={t("fields.status")}
                  type="select"
                  options={PRODUCT_STATUS_OPTIONS.map((status) => ({
                    value: status,
                    label: PRODUCT_STATUS_LABELS[status].ar,
                  }))}
                />
              )}
              </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={control}
                name="base_price"
                label={t("fields.basePrice")}
                placeholder="0.00"
                required
              />
              <FormField
                control={control}
                name="cost_price"
                label={t("fields.costPrice")}
                placeholder="0.00"
              />
              <FormField
                control={control}
                name="compare_at_price"
                label={t("fields.compareAtPrice")}
                placeholder="0.00"
                description={t("compareAtPriceDesc")}
              />
            </div>

            <div className="space-y-2">
              <Label>التصنيفات</Label>
              {flatCategories.length === 0 ? (
                <p className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  لا توجد تصنيفات بعد.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {flatCategories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                      style={{ paddingInlineStart: `${cat.level * 1.25}rem` }}
                    >
                      <Checkbox
                        checked={selectedCategories.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}

              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedCategories.map((categoryId) => {
                    const category = flatCategories.find(
                      (cat) => cat.id === categoryId,
                    );
                    return category ? (
                      <Badge
                        key={categoryId}
                        variant="secondary"
                        className="text-xs"
                      >
                        {category.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">صور المنتج</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  الصورة الرئيسية تظهر في البطاقة، ومعرض الصور يظهر داخل صفحة المنتج.
                </p>
              </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
              <div className="space-y-3">
                <Label>الصورة الرئيسية</Label>
                <div
                  className={`relative flex h-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/20 transition md:h-[340px] xl:h-[420px] ${
                    isPrimaryDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => primaryFileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsPrimaryDragOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsPrimaryDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsPrimaryDragOver(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsPrimaryDragOver(false);
                    handleSelectPrimaryImage(event.dataTransfer.files);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {primaryImageSrc ? (
                    <>
                      <Image
                        src={primaryImageSrc}
                        alt={primaryImageAlt}
                        fill
                        sizes="320px"
                        className="object-cover"
                      />
                      <Badge className="absolute end-3 top-3">رئيسية</Badge>
                    </>
                  ) : (
                    <div className="px-4 text-center">
                      <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        اسحب الصورة الرئيسية أو تصفح من جهازك
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPEG, PNG, WebP - حتى 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={primaryFileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  onChange={(event) => {
                    handleSelectPrimaryImage(event.target.files);
                    event.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => primaryFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    اختيار صورة
                  </Button>
                  {pendingPrimaryImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={removePendingPrimaryImage}
                    >
                      <X className="h-4 w-4" />
                      إلغاء الاختيار
                    </Button>
                  )}
                  {isEditMode && primaryMedia && !pendingPrimaryImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => deleteExistingMedia(primaryMedia)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف الصورة
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label>معرض الصور</Label>
                <div
                  className={`rounded-lg border-2 border-dashed p-5 text-center transition ${
                    isGalleryDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                  onClick={() => galleryFileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsGalleryDragOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsGalleryDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsGalleryDragOver(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsGalleryDragOver(false);
                    handleSelectGalleryImages(event.dataTransfer.files);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">أضف صوراً إضافية للمعرض</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ({totalImageCount}/{MAX_MEDIA_COUNT}) صورة
                  </p>
                </div>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleSelectGalleryImages(event.target.files);
                    event.target.value = "";
                  }}
                />

                {galleryMedia.length === 0 &&
                pendingGalleryImages.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    لا توجد صور في المعرض بعد.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {galleryMedia.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        <Image
                          src={item.url}
                          alt={item.alt_text || `صورة المعرض ${index + 1}`}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                        {isEditMode && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute bottom-2 start-2 h-8 w-8 opacity-0 transition group-hover:opacity-100"
                            onClick={() => deleteExistingMedia(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {pendingGalleryImages.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-primary/50 bg-muted"
                      >
                        <Image
                          src={item.previewUrl}
                          alt={item.file.name}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                        <Badge className="absolute end-2 top-2 text-xs">
                          جديد
                        </Badge>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute bottom-2 start-2 h-8 w-8"
                          onClick={() => removePendingGalleryImage(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadingImages && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    جاري رفع الصور...
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">الخيارات والمتغيرات</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  فعّلها للمنتجات التي تختلف بالسعر أو الكمية حسب اللون أو المقاس.
                </p>
              </div>

              <Controller
                control={control}
                name="has_variants"
                render={({ field }) => (
                  <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Label htmlFor="has_variants">منتج متغير</Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        إذا كان المنتج بسيطاً اتركه مقفلاً لتبقى صفحة الإنشاء أسرع
                        وأنظف.
                      </p>
                    </div>
                    <Switch
                      id="has_variants"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              {hasVariantsValue && (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-lg border bg-muted/10">
                    <div className="flex items-center justify-between gap-3 border-b bg-muted/20 p-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={handleCreateOption}
                        disabled={creatingOption}
                      >
                        <Plus className="h-4 w-4" />
                        إضافة خيار
                      </Button>

                      <div className="text-end">
                        <h4 className="text-base font-semibold">الخيارات</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          أضف الخيارات ثم أكدها لتوليد المتغيرات والكميات.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      {productOptions.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        أضف خياراً مثل اللون أو المقاس، ثم أضف القيم الخاصة به.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {productOptions.map((option) => {
                          const draft = getNewValueDraft(option.id);
                          const draftImagePreview = draft.imagePreviewUrl;
                          const isEditing = editingOptionId === option.id;
                          const canConfirm =
                            option.values.length > 0 ||
                            draft.value.trim().length > 0;

                          return (
                            <div
                              key={option.id}
                              className="overflow-hidden rounded-lg border bg-background"
                            >
                              <div className="flex min-h-24 items-center justify-between gap-4 bg-muted/20 p-4">
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-11 w-11 text-destructive"
                                      onClick={() => handleDeleteOption(option.id)}
                                      disabled={savingOptionId === option.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-11"
                                      onClick={() => setEditingOptionId(option.id)}
                                    >
                                      تعديل
                                    </Button>
                                  )}
                                  {!isEditing && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-11 w-11 text-muted-foreground"
                                      onClick={() =>
                                        void handleDuplicateOption(option)
                                      }
                                      disabled={creatingOption}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="text-end">
                                  <p className="text-lg font-semibold">
                                    {option.name || "خيار"}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {OPTION_TYPE_LABELS[option.type]}
                                  </p>
                                </div>
                              </div>

                              {isEditing && (
                                <div className="space-y-8 border-t p-4">
                                  <div className="space-y-4">
                                    <div className="text-end">
                                      <h4 className="text-lg font-semibold">
                                        معلومات خيار المنتج
                                      </h4>
                                    </div>

                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
                                      <div className="space-y-2">
                                        <Label>اسم الخيار</Label>
                                        <div className="flex min-w-0 items-center rounded-md border bg-background">
                                          <Input
                                            value={option.name}
                                            onChange={(event) =>
                                              patchOption(option.id, {
                                                name: event.target.value,
                                              })
                                            }
                                            placeholder="مثال: المقاس، اللون، الخامة"
                                            className="h-11 border-0 shadow-none focus-visible:ring-0"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>نوع الخيار</Label>
                                        <Select
                                          value={option.type}
                                          onValueChange={(value) =>
                                            patchOption(option.id, {
                                              type: value as ProductOptionType,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="h-11">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="TEXT">نص</SelectItem>
                                            <SelectItem value="COLOR">لون</SelectItem>
                                            <SelectItem value="IMAGE">صورة</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleAddOptionValue(option)}
                                        disabled={creatingValueOptionId === option.id}
                                        className="h-11 self-start"
                                      >
                                        <Plus className="h-4 w-4" />
                                        قيمة جديدة
                                      </Button>

                                      <div className="text-end">
                                        <h4 className="text-lg font-semibold">
                                          قيم الخيار
                                        </h4>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                          القيم هنا تولد المتغيرات وتظهر للعميل في صفحة المنتج.
                                        </p>
                                      </div>
                                    </div>

                                    <div
                                      className={`grid gap-3 rounded-lg border bg-muted/10 p-3 ${
                                        option.type === "TEXT"
                                          ? "lg:grid-cols-[minmax(0,1fr)]"
                                          : "lg:grid-cols-[auto_minmax(0,1fr)]"
                                      } lg:items-center`}
                                    >
                                      {option.type === "COLOR" && (
                                        <div className="relative h-11 w-20 overflow-hidden rounded-md border bg-background p-1">
                                          <div
                                            className="h-full w-full rounded-sm"
                                            style={{
                                              backgroundColor: draft.color_hex,
                                            }}
                                          />
                                          <Input
                                            type="color"
                                            value={draft.color_hex}
                                            onChange={(event) =>
                                              handleNewValueDraftChange(option.id, {
                                                color_hex: event.target.value,
                                              })
                                            }
                                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                          />
                                        </div>
                                      )}

                                      {option.type === "IMAGE" && (
                                        <Label className="flex h-11 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed bg-background text-muted-foreground">
                                          {draftImagePreview ? (
                                            <img
                                              src={draftImagePreview}
                                              alt={draft.value || "صورة القيمة"}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <ImageIcon className="h-5 w-5" />
                                          )}
                                          <Input
                                            type="file"
                                            accept={ACCEPTED_EXTENSIONS}
                                            className="hidden"
                                            onChange={(event) => {
                                              const file =
                                                event.target.files?.[0] || null;
                                              handleNewValueDraftChange(option.id, {
                                                imageFile: file,
                                                imagePreviewUrl: file
                                                  ? URL.createObjectURL(file)
                                                  : null,
                                              });
                                            }}
                                          />
                                        </Label>
                                      )}

                                      <div className="flex min-w-0 items-center rounded-md border bg-background">
                                        <Input
                                          value={draft.value}
                                          onChange={(event) =>
                                            handleNewValueDraftChange(option.id, {
                                              value: event.target.value,
                                            })
                                          }
                                          placeholder="قيمة"
                                          className="h-11 border-0 shadow-none focus-visible:ring-0"
                                        />
                                      </div>
                                    </div>

                                    {option.values.length > 0 && (
                                      <div className="space-y-2">
                                        {option.values.map((optionValue) => (
                                          <div
                                            key={optionValue.id}
                                            className={`grid gap-3 rounded-lg border bg-background p-3 ${
                                              option.type === "TEXT"
                                                ? "lg:grid-cols-[auto_minmax(0,1fr)]"
                                                : "lg:grid-cols-[auto_minmax(0,1fr)_auto]"
                                            } lg:items-center`}
                                          >
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              className="h-11 w-11 text-destructive"
                                              onClick={() =>
                                                handleDeleteOptionValue(
                                                  option.id,
                                                  optionValue.id,
                                                )
                                              }
                                              disabled={
                                                savingValueId === optionValue.id
                                              }
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>

                                            <div className="flex min-w-0 items-center rounded-md border bg-background">
                                              <Input
                                                value={optionValue.value}
                                                onChange={(event) =>
                                                  patchOptionValue(
                                                    option.id,
                                                    optionValue.id,
                                                    { value: event.target.value },
                                                  )
                                                }
                                                className="h-11 border-0 shadow-none focus-visible:ring-0"
                                              />
                                            </div>

                                            {option.type === "COLOR" && (
                                              <div className="relative h-11 w-20 overflow-hidden rounded-md border bg-background p-1">
                                                <div
                                                  className="h-full w-full rounded-sm"
                                                  style={{
                                                    backgroundColor:
                                                      optionValue.color_hex ||
                                                      DEFAULT_COLOR_HEX,
                                                  }}
                                                />
                                                <Input
                                                  type="color"
                                                  value={
                                                    optionValue.color_hex ||
                                                    DEFAULT_COLOR_HEX
                                                  }
                                                  onChange={(event) =>
                                                    patchOptionValue(
                                                      option.id,
                                                      optionValue.id,
                                                      {
                                                        color_hex:
                                                          event.target.value,
                                                      },
                                                    )
                                                  }
                                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                                />
                                              </div>
                                            )}

                                            {option.type === "IMAGE" && (
                                              <Label className="flex h-11 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed bg-background text-muted-foreground">
                                                {optionValue.image_url ? (
                                                  <img
                                                    src={optionValue.image_url}
                                                    alt={optionValue.value}
                                                    className="h-full w-full object-cover"
                                                  />
                                                ) : (
                                                  <Upload className="h-5 w-5" />
                                                )}
                                                <Input
                                                  type="file"
                                                  accept={ACCEPTED_EXTENSIONS}
                                                  className="hidden"
                                                  disabled={
                                                    uploadingOptionValueId ===
                                                    optionValue.id
                                                  }
                                                  onChange={(event) => {
                                                    const file =
                                                      event.target.files?.[0];
                                                    if (file) {
                                                      void handleUploadOptionValueImage(
                                                        option,
                                                        optionValue,
                                                        file,
                                                      );
                                                    }
                                                  }}
                                                />
                                              </Label>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="h-11 self-start"
                                      onClick={() => {
                                        if (
                                          isDraftId(option.id) &&
                                          option.values.length === 0
                                        ) {
                                          void handleDeleteOption(option.id);
                                          return;
                                        }
                                        setEditingOptionId(null);
                                      }}
                                    >
                                      إلغاء
                                    </Button>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11"
                                        onClick={() =>
                                          handleSaveOptionTemplate(option)
                                        }
                                      >
                                        حفظ القالب
                                      </Button>

                                      <Button
                                        type="button"
                                        className="h-11"
                                        onClick={() => void handleConfirmOption(option)}
                                        disabled={
                                          !canConfirm ||
                                          savingOptionId === option.id ||
                                          creatingValueOptionId === option.id ||
                                          generatingVariants
                                        }
                                      >
                                        تأكيد
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>

                  {productVariants.length > 0 && (
                    <div className="overflow-hidden rounded-lg border bg-muted/10">
                      <div className="flex items-center justify-between gap-3 p-4">
                        <ChevronDown className="h-5 w-5 text-primary" />
                        <h4 className="text-base font-semibold">الكميات</h4>
                      </div>

                      <div className="space-y-3 border-t p-4">
                        <Controller
                          control={control}
                          name="track_inventory"
                          render={({ field }) => (
                            <label className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
                              كمية لا محدودة
                              <Checkbox
                                checked={!(field.value ?? true)}
                                onCheckedChange={(checked) =>
                                  field.onChange(!(checked === true))
                                }
                              />
                            </label>
                          )}
                        />

                        {productVariants.map((variant) => (
                          <div
                            key={variant.id}
                            className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 self-start"
                              onClick={() => handleEditVariantInventory(variant)}
                            >
                              تعديل
                            </Button>
                            <div className="flex flex-col gap-1 text-end sm:flex-row sm:items-center sm:gap-6">
                              {editingVariantInventoryId === variant.id ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                      void handleSaveVariantInventory(variant)
                                    }
                                    disabled={savingInventory}
                                  >
                                    حفظ
                                  </Button>
                                  <Input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={
                                      variantQuantityDrafts[variant.id] ??
                                      String(
                                        variant.inventory?.available_quantity ??
                                          0,
                                      )
                                    }
                                    onChange={(event) =>
                                      setVariantQuantityDrafts((prev) => ({
                                        ...prev,
                                        [variant.id]: event.target.value,
                                      }))
                                    }
                                    className="h-10 w-28 text-center"
                                  />
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  الكمية:{" "}
                                  {variant.inventory?.available_quantity ?? 0}
                                </span>
                              )}
                              <span className="font-medium">{variant.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">وصف المنتج</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  الوصف التفصيلي الذي يظهر للعميل في صفحة المنتج.
                </p>
              </div>

              <FormField
                control={control}
                name="description"
                label={t("fields.description")}
                type="textarea"
                placeholder={t("placeholders.description")}
              />
            </div>
            </div>
            </div>
          </SectionCard>

          <SectionCard
            title="المخزون"
            description="المستودع الافتراضي، الكمية وحد التنبيه عند انخفاض المخزون."
            icon={<Warehouse className="h-5 w-5 text-primary" />}
            open={openSections.inventory}
            onToggle={() => toggleSection("inventory")}
          >
            <Controller
              control={control}
              name="track_inventory"
              render={({ field }) => (
                <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Label htmlFor="unlimited-stock">كمية غير محدودة</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      عند التفعيل لن يتم احتساب نفاد المخزون لهذا المنتج.
                    </p>
                  </div>
                  <Switch
                    id="unlimited-stock"
                    checked={!(field.value ?? true)}
                    onCheckedChange={(checked) => field.onChange(!checked)}
                  />
                </div>
              )}
            />

            {hasVariantsValue ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  بعد توليد المتغيرات من الخيارات ستظهر كميات كل متغير بشكل
                  مستقل للتاجر.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="rounded-lg border p-4">
                  <Label className="text-sm text-muted-foreground">
                    المستودع
                  </Label>
                  <div className="mt-2 flex items-center gap-2 text-base font-medium">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    Default - الافتراضي
                  </div>
                </div>

                <Controller
                  control={control}
                  name="inventory_quantity"
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor="inventory_quantity"
                        className={
                          fieldState.error ? "text-destructive" : undefined
                        }
                      >
                        الكمية
                      </Label>
                      <div className="flex overflow-hidden rounded-lg border">
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-none"
                          disabled={!trackInventoryValue}
                          onClick={() => {
                            const next = Math.max(
                              0,
                              Number(field.value || 0) - 1,
                            );
                            field.onChange(String(next));
                          }}
                        >
                          -
                        </Button>
                        <Input
                          id="inventory_quantity"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          className="rounded-none border-0 text-center"
                          disabled={!trackInventoryValue}
                          value={field.value || "0"}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-none"
                          disabled={!trackInventoryValue}
                          onClick={() => {
                            const next = Number(field.value || 0) + 1;
                            field.onChange(String(next));
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {fieldState.error?.message && (
                        <p className="text-sm text-destructive" role="alert">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                <FormField
                  control={control}
                  name="low_stock_threshold"
                  label="حد تنبيه المخزون"
                  placeholder="5"
                  disabled={!trackInventoryValue}
                />
              </div>
            )}

            {savingInventory && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                جاري حفظ المخزون...
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="معلومات متقدمة"
            description="الرابط المختصر، الوصف القصير، وحقول SEO."
            icon={<Settings2 className="h-5 w-5 text-primary" />}
            open={openSections.advanced}
            onToggle={() => toggleSection("advanced")}
          >
            <div className="space-y-2">
              <FormField
                control={control}
                name="slug"
                label={t("fields.slug")}
                placeholder="product-slug"
                description={
                  autoSlug ? t("slugAutoGenerated") : t("slugManual")
                }
                disabled={autoSlug}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-slug"
                  checked={autoSlug}
                  onCheckedChange={setAutoSlug}
                />
                <Label
                  htmlFor="auto-slug"
                  className="text-sm text-muted-foreground"
                >
                  {t("autoGenerate")}
                </Label>
              </div>
            </div>

            <FormField
              control={control}
              name="short_description"
              label={t("fields.shortDescription")}
              type="textarea"
              placeholder={t("placeholders.shortDescription")}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <FormField
                  control={control}
                  name="meta_title"
                  label={t("fields.metaTitle")}
                  placeholder={t("placeholders.metaTitle")}
                  description={t("metaTitleDesc", {
                    count: metaTitleValue.length,
                    max: 70,
                  })}
                />
                <div className="text-xs text-muted-foreground text-end">
                  {metaTitleValue.length}/70
                </div>
              </div>

              <Controller
                control={control}
                name="meta_description"
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="meta_description"
                      className={
                        fieldState.error ? "text-destructive" : undefined
                      }
                    >
                      {t("fields.metaDescription")}
                    </Label>
                    <Textarea
                      id="meta_description"
                      placeholder={t("placeholders.metaDescription")}
                      aria-invalid={!!fieldState.error || undefined}
                      className={
                        fieldState.error ? "border-destructive" : undefined
                      }
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      value={field.value ?? ""}
                      rows={3}
                    />
                    <div className="flex justify-between">
                      <p className="text-xs text-muted-foreground">
                        {t("metaDescriptionDesc")}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {metaDescriptionValue.length}/160
                      </span>
                    </div>
                    {fieldState.error?.message && (
                      <p className="text-sm text-destructive" role="alert">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </SectionCard>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.STORE_ADMIN.PRODUCTS)}
          >
            {tCommon("cancel")}
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveAsDraft}
              disabled={
                isSubmitting ||
                draftSaving ||
                uploadingImages ||
                savingInventory
              }
            >
              {draftSaving ? t("saving") : t("saveAsDraft")}
            </Button>

            <SubmitButton
              isSubmitting={isSubmitting || uploadingImages || savingInventory}
            >
              {isEditMode ? t("saveChanges") : t("createProduct")}
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
