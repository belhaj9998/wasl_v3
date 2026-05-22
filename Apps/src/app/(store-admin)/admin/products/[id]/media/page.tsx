"use client";

/**
 * Product Media Management Page
 * Implements image upload (JPEG/PNG/WebP, max 5MB, max 20 per product),
 * drag-to-reorder media gallery with sort_order PATCH,
 * alt text editing, and media deletion.
 * Handles upload failures with error display, preserving existing media.
 *
 * Requirements: 7.4, 7.8
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Upload,
  Trash2,
  GripVertical,
  ImageIcon,
  Pencil,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import { useStore } from "@/hooks/useStore";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse } from "@/types";

// ========== Types ==========

interface ProductMedia {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

// ========== Constants ==========

const MAX_MEDIA_COUNT = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

// ========== Component ==========

export default function ProductMediaPage() {
  const params = useParams();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const productId = Number(params.id);

	  // State
	  const [media, setMedia] = useState<ProductMedia[]>([]);
	  const [loading, setLoading] = useState(true);
	  const [uploading, setUploading] = useState(false);
	  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
	  const [actionLoading, setActionLoading] = useState(false);
	  const [isUploadDragOver, setIsUploadDragOver] = useState(false);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Alt text edit dialog
  const [altDialog, setAltDialog] = useState<{
    open: boolean;
    mediaItem: ProductMedia | null;
  }>({ open: false, mediaItem: null });
  const [altText, setAltText] = useState("");

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    mediaItem: ProductMedia | null;
  }>({ open: false, mediaItem: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========== Data Fetching ==========

  const fetchMedia = useCallback(async () => {
    if (!currentStoreId || !productId) return;

    setLoading(true);
    try {
      const response = await apiClient<ApiResponse<ProductMedia[]>>(
        `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media`,
        { storeId: currentStoreId },
      );
      setMedia(response.data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "فشل تحميل الوسائط";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, productId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // ========== Upload ==========

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" — نوع الملف غير مدعوم. يُقبل فقط JPEG, PNG, WebP`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" — حجم الملف يتجاوز 5 ميجابايت`;
    }
    return null;
  };

	  const uploadFiles = useCallback(
	    async (files: FileList | File[] | null) => {
	      if (!files || files.length === 0) return;

	      if (!currentStoreId || !productId) {
	        setUploadErrors(["لا يمكن رفع الصور قبل تحميل المتجر والمنتج"]);
	        return;
	      }

	      const remainingSlots = MAX_MEDIA_COUNT - media.length;
	      if (remainingSlots <= 0) {
	        toast.error(`تم الوصول للحد الأقصى (${MAX_MEDIA_COUNT} صورة)`);
	        return;
	      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const errors: string[] = [];
      const validFiles: File[] = [];

      // Validate files
      for (const file of filesToUpload) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      if (filesToUpload.length > remainingSlots) {
        errors.push(
          `تم تجاهل ${files.length - remainingSlots} ملف(ات) — الحد الأقصى ${MAX_MEDIA_COUNT} صورة`,
        );
      }

      if (validFiles.length === 0) {
        setUploadErrors(errors);
        return;
      }

      setUploading(true);
      setUploadErrors([]);

      let uploadedCount = 0;

      // Upload files sequentially
      for (const file of validFiles) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await apiClient<ApiResponse<{ media: ProductMedia }>>(
            `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media`,
            {
              method: "POST",
              body: formData,
              storeId: currentStoreId,
            },
          );

          setMedia((prev) => [...prev, response.data.media]);
          uploadedCount += 1;
        } catch (err: unknown) {
          const message =
            err && typeof err === "object" && "message" in err
              ? (err as { message: string }).message
              : `فشل رفع "${file.name}"`;
          errors.push(message);
        }
      }

      if (uploadedCount > 0) {
        toast.success(
          uploadedCount === 1
            ? "تم رفع الصورة وحفظها تلقائيا"
            : `تم رفع ${uploadedCount} صور وحفظها تلقائيا`,
        );
      }

      if (errors.length > 0) {
        setUploadErrors(errors);
      }

      setUploading(false);
    },
    [currentStoreId, productId, media.length],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      await uploadFiles(e.target.files);
      e.target.value = "";
    },
    [uploadFiles],
  );

  const handleUploadDrop = useCallback(
	    async (e: React.DragEvent<HTMLDivElement>) => {
	      e.preventDefault();
	      setIsUploadDragOver(false);
	      await uploadFiles(e.dataTransfer.files);
	    },
	    [uploadFiles],
	  );

  // ========== Drag & Drop Reorder ==========

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);

      if (
        draggedIndex === null ||
        draggedIndex === dropIndex ||
        !currentStoreId
      )
        return;

      // Reorder locally
      const newMedia = [...media];
      const [draggedItem] = newMedia.splice(draggedIndex, 1);
      newMedia.splice(dropIndex, 0, draggedItem);

      // Update sort_order
      const reorderedMedia = newMedia.map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }));

      setMedia(reorderedMedia);
      setDraggedIndex(null);

      // Send PATCH to update sort_order
      try {
        const sortPayload = reorderedMedia.map((item) => ({
          id: item.id,
          sort_order: item.sort_order,
        }));

        await apiClient<ApiResponse<null>>(
          `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media/reorder`,
          {
            method: "PATCH",
            body: { items: sortPayload },
            storeId: currentStoreId,
          },
        );
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل إعادة ترتيب الوسائط";
        toast.error(message);
        // Revert on failure
        fetchMedia();
      }
    },
    [draggedIndex, media, currentStoreId, productId, fetchMedia],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // ========== Alt Text ==========

  const openAltDialog = useCallback((item: ProductMedia) => {
    setAltText(item.alt_text || "");
    setAltDialog({ open: true, mediaItem: item });
  }, []);

  const handleSaveAltText = useCallback(async () => {
    if (!altDialog.mediaItem || !currentStoreId) return;

    setActionLoading(true);
    try {
      await apiClient<ApiResponse<ProductMedia>>(
        `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media/${altDialog.mediaItem.id}`,
        {
          method: "PATCH",
          body: { alt_text: altText || null },
          storeId: currentStoreId,
        },
      );

      setMedia((prev) =>
        prev.map((m) =>
          m.id === altDialog.mediaItem!.id
            ? { ...m, alt_text: altText || null }
            : m,
        ),
      );
      setAltDialog({ open: false, mediaItem: null });
      toast.success("تم تحديث النص البديل");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "فشل تحديث النص البديل";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }, [altDialog.mediaItem, altText, currentStoreId, productId]);

  // ========== Delete ==========

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.mediaItem || !currentStoreId) return;

    setDeleteLoading(true);
    try {
      await apiClient<ApiResponse<null>>(
        `${API_ENDPOINTS.STORE.PRODUCTS(currentStoreId)}/${productId}/media/${deleteDialog.mediaItem.id}`,
        {
          method: "DELETE",
          storeId: currentStoreId,
        },
      );

      setMedia((prev) =>
        prev.filter((m) => m.id !== deleteDialog.mediaItem!.id),
      );
      toast.success("تم حذف الصورة");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "فشل حذف الصورة";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, mediaItem: null });
    }
  }, [deleteDialog.mediaItem, currentStoreId, productId]);

  // ========== Render ==========

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">وسائط المنتج</h2>
          <p className="text-muted-foreground">
            إدارة صور المنتج — اسحب لإعادة الترتيب ({media.length}/
            {MAX_MEDIA_COUNT})
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">رفع صور جديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
	          <div
	            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors ${
	              isUploadDragOver ? "border-primary bg-primary/5" : ""
	            }`}
	            onClick={() => fileInputRef.current?.click()}
	            onDragEnter={(e) => {
	              e.preventDefault();
	              setIsUploadDragOver(true);
	            }}
	            onDragOver={(e) => {
	              e.preventDefault();
	              setIsUploadDragOver(true);
	            }}
	            onDragLeave={(e) => {
	              e.preventDefault();
	              setIsUploadDragOver(false);
	            }}
	            onDrop={handleUploadDrop}
	            role="button"
	            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              اضغط لاختيار الصور أو اسحبها هنا
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, WebP — حد أقصى 5 ميجابايت لكل صورة
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading || media.length >= MAX_MEDIA_COUNT}
          />

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              جاري الرفع...
            </div>
          )}

          {/* Upload Errors */}
          {uploadErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-1">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                أخطاء في الرفع
              </div>
              {uploadErrors.map((error, idx) => (
                <p key={idx} className="text-xs text-destructive/80 ps-6">
                  {error}
                </p>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setUploadErrors([])}
              >
                <X className="me-1 h-3 w-3" />
                إخفاء
              </Button>
            </div>
          )}

          {media.length >= MAX_MEDIA_COUNT && (
            <p className="text-sm text-muted-foreground">
              تم الوصول للحد الأقصى ({MAX_MEDIA_COUNT} صورة)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Media Gallery */}
      {media.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              معرض الصور ({media.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    relative group rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing
                    transition-all duration-200
                    ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                    ${dragOverIndex === index ? "ring-2 ring-primary border-primary" : ""}
                  `}
                >
                  {/* Drag Handle */}
                  <div className="absolute top-2 start-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-background/80 backdrop-blur-sm rounded p-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Sort Order Badge */}
                  <div className="absolute top-2 end-2 z-10">
                    <span className="bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-medium">
                      {index + 1}
                    </span>
                  </div>

                  {/* Image */}
                  <div className="aspect-square bg-muted relative">
                    <Image
                      src={item.url}
                      alt={item.alt_text || `صورة المنتج ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAltDialog(item);
                        }}
                        title="تعديل النص البديل"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, mediaItem: item });
                        }}
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Alt Text Indicator */}
                  {item.alt_text && (
                    <div className="absolute bottom-0 start-0 end-0 bg-background/80 backdrop-blur-sm px-2 py-1">
                      <p className="text-xs text-muted-foreground truncate">
                        {item.alt_text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="mb-4 h-12 w-12" />
            <p className="text-sm">لا توجد صور. ارفع صوراً للمنتج.</p>
          </CardContent>
        </Card>
      )}

      {/* Alt Text Edit Dialog */}
      <Dialog
        open={altDialog.open}
        onOpenChange={(open) => {
          if (!open) setAltDialog({ open: false, mediaItem: null });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل النص البديل</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {altDialog.mediaItem && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                <Image
                  src={altDialog.mediaItem.url}
                  alt="معاينة"
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-contain"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="alt-text">النص البديل</Label>
              <Input
                id="alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="وصف الصورة للقارئات الشاشية..."
              />
              <p className="text-xs text-muted-foreground">
                يساعد النص البديل في تحسين إمكانية الوصول وتحسين محركات البحث
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAltDialog({ open: false, mediaItem: null })}
            >
              إلغاء
            </Button>
            <Button onClick={handleSaveAltText} disabled={actionLoading}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, mediaItem: null });
        }}
        title="حذف الصورة"
        description="هل أنت متأكد من حذف هذه الصورة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDeleteConfirm}
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}
