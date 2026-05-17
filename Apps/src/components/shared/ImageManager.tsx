"use client";

/**
 * ImageManager
 * Manages uploaded images with grid display, drag-and-drop reorder,
 * delete, alt text editing (max 255 chars), primary image selection,
 * and retry for failed uploads (up to 3 attempts).
 * Wraps/extends the ImageUploader component.
 * Requirements: 15.4, 15.5, 15.6
 */

import {
  useState,
  useCallback,
  useRef,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  Star,
  Trash2,
  Pencil,
  RotateCcw,
  GripVertical,
  Check,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ImageUploader, type UploadFileItem } from "./ImageUploader";

// --- Types ---

export interface ManagedImage {
  id: string;
  url: string;
  preview: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
  status: "success" | "error" | "uploading" | "pending";
  error?: string;
  retryCount: number;
  file?: File;
}

export interface ImageManagerProps {
  /** Initial images (already uploaded) */
  initialImages?: ManagedImage[];
  /** Maximum number of images allowed (default: 20) */
  maxImages?: number;
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Upload endpoint URL */
  uploadUrl?: string;
  /** Additional headers for upload request */
  uploadHeaders?: Record<string, string>;
  /** Callback when images change (reorder, delete, alt text, primary) */
  onChange?: (images: ManagedImage[]) => void;
  /** Callback when a new image is uploaded successfully */
  onUploadComplete?: (images: ManagedImage[]) => void;
  /** Whether the manager is disabled */
  disabled?: boolean;
}

// --- Constants ---

const MAX_ALT_TEXT_LENGTH = 255;
const MAX_RETRY_ATTEMPTS = 3;

// --- Component ---

export function ImageManager({
  initialImages = [],
  maxImages = 20,
  maxSizeBytes,
  uploadUrl,
  uploadHeaders,
  onChange,
  onUploadComplete,
  disabled = false,
}: ImageManagerProps) {
  const t = useTranslations("imageManager");
  const tA11y = useTranslations("accessibility.buttons");

  const [images, setImages] = useState<ManagedImage[]>(initialImages);
  const [editingAltId, setEditingAltId] = useState<string | null>(null);
  const [editingAltText, setEditingAltText] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);
  const altInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---

  const updateImages = useCallback(
    (updater: (prev: ManagedImage[]) => ManagedImage[]) => {
      setImages((prev) => {
        const next = updater(prev);
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  // --- Handle new uploads from ImageUploader ---

  const handleUploaderChange = useCallback(
    (files: UploadFileItem[]) => {
      setImages((prev) => {
        const existingIds = new Set(prev.map((img) => img.id));
        const newImages: ManagedImage[] = [];

        for (const file of files) {
          if (!existingIds.has(file.id)) {
            newImages.push({
              id: file.id,
              url: file.url || "",
              preview: file.preview,
              altText: "",
              isPrimary: prev.length === 0 && newImages.length === 0,
              sortOrder: prev.length + newImages.length,
              status: file.status,
              error: file.error,
              retryCount: 0,
              file: file.file,
            });
          } else {
            // Update existing image status
            const idx = prev.findIndex((img) => img.id === file.id);
            if (idx !== -1) {
              prev[idx] = {
                ...prev[idx],
                status: file.status,
                url: file.url || prev[idx].url,
                error: file.error,
              };
            }
          }
        }

        const next = [...prev, ...newImages];
        if (newImages.length > 0) {
          onChange?.(next);
        }
        return next;
      });
    },
    [onChange],
  );

  const handleUploadComplete = useCallback(
    (files: { url: string; id: string }[]) => {
      setImages((prev) => {
        const next = prev.map((img) => {
          const uploaded = files.find((f) => f.id === img.id);
          if (uploaded) {
            return { ...img, url: uploaded.url, status: "success" as const };
          }
          return img;
        });
        onUploadComplete?.(next.filter((img) => img.status === "success"));
        return next;
      });
    },
    [onUploadComplete],
  );

  // --- Delete image ---

  const handleDelete = useCallback(
    (imageId: string) => {
      updateImages((prev) => {
        const filtered = prev.filter((img) => img.id !== imageId);
        // If deleted image was primary, set first remaining as primary
        const wasPrimary = prev.find((img) => img.id === imageId)?.isPrimary;
        if (wasPrimary && filtered.length > 0) {
          filtered[0] = { ...filtered[0], isPrimary: true };
        }
        // Recalculate sort orders
        return filtered.map((img, idx) => ({ ...img, sortOrder: idx }));
      });
    },
    [updateImages],
  );

  // --- Set primary image ---

  const handleSetPrimary = useCallback(
    (imageId: string) => {
      updateImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: img.id === imageId,
        })),
      );
    },
    [updateImages],
  );

  // --- Edit alt text ---

  const startEditAlt = useCallback(
    (imageId: string) => {
      const image = images.find((img) => img.id === imageId);
      setEditingAltId(imageId);
      setEditingAltText(image?.altText || "");
      setTimeout(() => altInputRef.current?.focus(), 0);
    },
    [images],
  );

  const saveAltText = useCallback(() => {
    if (editingAltId) {
      const trimmed = editingAltText.slice(0, MAX_ALT_TEXT_LENGTH);
      updateImages((prev) =>
        prev.map((img) =>
          img.id === editingAltId ? { ...img, altText: trimmed } : img,
        ),
      );
      setEditingAltId(null);
      setEditingAltText("");
    }
  }, [editingAltId, editingAltText, updateImages]);

  const cancelEditAlt = useCallback(() => {
    setEditingAltId(null);
    setEditingAltText("");
  }, []);

  const handleAltKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveAltText();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditAlt();
      }
    },
    [saveAltText, cancelEditAlt],
  );

  // --- Retry failed upload ---

  const handleRetry = useCallback(
    (imageId: string) => {
      updateImages((prev) =>
        prev.map((img) => {
          if (img.id === imageId && img.retryCount < MAX_RETRY_ATTEMPTS) {
            return {
              ...img,
              status: "pending" as const,
              error: undefined,
              retryCount: img.retryCount + 1,
            };
          }
          return img;
        }),
      );

      // Trigger re-upload via XHR
      const image = images.find((img) => img.id === imageId);
      if (image?.file && uploadUrl) {
        retryUpload(imageId, image.file);
      }
    },
    [images, uploadUrl],
  );

  const retryUpload = useCallback(
    (imageId: string, file: File) => {
      if (!uploadUrl) return;

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageId
                ? { ...img, status: "uploading" as const }
                : img,
            ),
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let url = "";
          try {
            const response = JSON.parse(xhr.responseText);
            url = response.url || response.data?.url || "";
          } catch {
            // ignore
          }
          updateImages((prev) =>
            prev.map((img) =>
              img.id === imageId
                ? { ...img, status: "success" as const, url, error: undefined }
                : img,
            ),
          );
        } else {
          updateImages((prev) =>
            prev.map((img) =>
              img.id === imageId
                ? { ...img, status: "error" as const, error: t("retryFailed") }
                : img,
            ),
          );
        }
      });

      xhr.addEventListener("error", () => {
        updateImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, status: "error" as const, error: t("networkError") }
              : img,
          ),
        );
      });

      xhr.open("POST", uploadUrl);
      if (uploadHeaders) {
        Object.entries(uploadHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      xhr.send(formData);
    },
    [uploadUrl, uploadHeaders, updateImages, t],
  );

  // --- Drag and Drop Reorder ---

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, imageId: string) => {
      if (disabled) return;
      dragItemRef.current = imageId;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", imageId);
      // Add a slight delay for visual feedback
      (e.currentTarget as HTMLElement).style.opacity = "0.5";
    },
    [disabled],
  );

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    dragItemRef.current = null;
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, imageId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragItemRef.current && dragItemRef.current !== imageId) {
        setDragOverId(imageId);
      }
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault();
      setDragOverId(null);

      const sourceId = dragItemRef.current;
      if (!sourceId || sourceId === targetId) return;

      updateImages((prev) => {
        const sourceIdx = prev.findIndex((img) => img.id === sourceId);
        const targetIdx = prev.findIndex((img) => img.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return prev;

        const newImages = [...prev];
        const [moved] = newImages.splice(sourceIdx, 1);
        newImages.splice(targetIdx, 0, moved);

        return newImages.map((img, idx) => ({ ...img, sortOrder: idx }));
      });

      dragItemRef.current = null;
    },
    [updateImages],
  );

  // --- Keyboard reorder ---

  const handleKeyboardReorder = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, imageId: string) => {
      if (disabled) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      e.preventDefault();
      updateImages((prev) => {
        const idx = prev.findIndex((img) => img.id === imageId);
        if (idx === -1) return prev;

        const newIdx =
          e.key === "ArrowLeft"
            ? Math.max(0, idx - 1)
            : Math.min(prev.length - 1, idx + 1);

        if (newIdx === idx) return prev;

        const newImages = [...prev];
        const [moved] = newImages.splice(idx, 1);
        newImages.splice(newIdx, 0, moved);

        return newImages.map((img, i) => ({ ...img, sortOrder: i }));
      });
    },
    [disabled, updateImages],
  );

  // --- Computed ---

  const successImages = images.filter(
    (img) => img.status === "success" || img.status === "error",
  );
  const remainingSlots = maxImages - images.length;

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {successImages.length > 0 && (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          role="list"
          aria-label={t("gridLabel")}
        >
          {successImages.map((image) => (
            <div
              key={image.id}
              role="listitem"
              draggable={!disabled && image.status === "success"}
              tabIndex={disabled ? -1 : 0}
              aria-label={t("imageItem", {
                alt: image.altText || t("noAltText"),
                position: image.sortOrder + 1,
                total: successImages.length,
                primary: image.isPrimary ? t("primaryLabel") : "",
              })}
              aria-roledescription={t("draggableImage")}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                dragOverId === image.id && "ring-2 ring-primary border-primary",
                image.status === "error" && "border-destructive",
                !disabled && "cursor-grab active:cursor-grabbing",
              )}
              onDragStart={(e) => handleDragStart(e, image.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, image.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, image.id)}
              onKeyDown={(e) => handleKeyboardReorder(e, image.id)}
            >
              {/* Image preview */}
              {image.preview || image.url ? (
                <img
                  src={image.preview || image.url}
                  alt={image.altText || ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">
                    {t("noPreview")}
                  </span>
                </div>
              )}

              {/* Primary badge */}
              {image.isPrimary && (
                <div
                  className="absolute top-1 start-1 rounded-full bg-yellow-500 p-1"
                  aria-label={t("primaryLabel")}
                >
                  <Star
                    className="h-3 w-3 fill-white text-white"
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* Drag handle indicator */}
              <div className="absolute top-1 end-1 rounded bg-black/50 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <GripVertical
                  className="h-3 w-3 text-white"
                  aria-hidden="true"
                />
              </div>

              {/* Error overlay */}
              {image.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-2">
                  <p
                    className="mb-1 text-center text-xs text-white"
                    role="alert"
                  >
                    {image.error || t("uploadError")}
                  </p>
                  {image.retryCount < MAX_RETRY_ATTEMPTS && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleRetry(image.id)}
                      disabled={disabled}
                      aria-label={t("retryUpload", {
                        attempt: image.retryCount + 1,
                        max: MAX_RETRY_ATTEMPTS,
                      })}
                    >
                      <RotateCcw className="me-1 h-3 w-3" aria-hidden="true" />
                      {t("retry")} ({image.retryCount}/{MAX_RETRY_ATTEMPTS})
                    </Button>
                  )}
                </div>
              )}

              {/* Action overlay (visible on hover/focus) */}
              {image.status === "success" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {/* Set as primary */}
                  {!image.isPrimary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(image.id);
                      }}
                      disabled={disabled}
                      aria-label={t("setPrimary")}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}

                  {/* Edit alt text */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditAlt(image.id);
                    }}
                    disabled={disabled}
                    aria-label={t("editAltText")}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-destructive/80 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    disabled={disabled}
                    aria-label={t("deleteImage")}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )}

              {/* Alt text edit inline */}
              {editingAltId === image.id && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label
                    className="mb-1 text-xs text-white"
                    htmlFor={`alt-${image.id}`}
                  >
                    {t("altTextLabel")}
                  </label>
                  <input
                    ref={altInputRef}
                    id={`alt-${image.id}`}
                    type="text"
                    value={editingAltText}
                    onChange={(e) =>
                      setEditingAltText(
                        e.target.value.slice(0, MAX_ALT_TEXT_LENGTH),
                      )
                    }
                    onKeyDown={handleAltKeyDown}
                    maxLength={MAX_ALT_TEXT_LENGTH}
                    className="w-full rounded border border-white/30 bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white"
                    placeholder={t("altTextPlaceholder")}
                    aria-describedby={`alt-hint-${image.id}`}
                  />
                  <p
                    id={`alt-hint-${image.id}`}
                    className="mt-0.5 text-[10px] text-white/60"
                  >
                    {editingAltText.length}/{MAX_ALT_TEXT_LENGTH}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white hover:bg-white/20 hover:text-white"
                      onClick={saveAltText}
                      aria-label={t("saveAltText")}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white hover:bg-white/20 hover:text-white"
                      onClick={cancelEditAlt}
                      aria-label={t("cancelEdit")}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploader (only show if there are remaining slots) */}
      {remainingSlots > 0 && (
        <ImageUploader
          maxFiles={remainingSlots}
          maxSizeBytes={maxSizeBytes}
          uploadUrl={uploadUrl}
          uploadHeaders={uploadHeaders}
          onChange={handleUploaderChange}
          onUploadComplete={handleUploadComplete}
          disabled={disabled}
        />
      )}
    </div>
  );
}
