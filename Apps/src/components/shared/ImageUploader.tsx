"use client";

/**
 * ImageUploader
 * Supports Drag & Drop with immediate thumbnail preview.
 * Progress bar for each file + cancel button.
 * Max 20 images, 5MB per image.
 * Allowed types: JPEG, PNG, WebP, GIF.
 * Uses FileReader for instant preview before upload.
 * Uses XMLHttpRequest for progress tracking.
 * Requirements: 15.1, 15.2, 15.4
 */

import {
  useState,
  useRef,
  useCallback,
  useId,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// --- Types ---

export type FileStatus = "pending" | "uploading" | "success" | "error";

export interface UploadFileItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: FileStatus;
  error?: string;
  url?: string;
  xhr?: XMLHttpRequest;
}

export interface ImageUploaderProps {
  /** Maximum number of files allowed (default: 20) */
  maxFiles?: number;
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Upload endpoint URL */
  uploadUrl?: string;
  /** Additional headers for upload request */
  uploadHeaders?: Record<string, string>;
  /** Field name for the file in the upload request */
  fieldName?: string;
  /** Callback when files are uploaded successfully */
  onUploadComplete?: (files: { url: string; id: string }[]) => void;
  /** Callback when files change (including removals) */
  onChange?: (files: UploadFileItem[]) => void;
  /** Whether the uploader is disabled */
  disabled?: boolean;
}

// --- Validation ---

export interface ValidationResult {
  valid: boolean;
  reason?: "size_exceeded" | "invalid_type" | "max_files_exceeded";
}

export function validateFile(
  file: File,
  config: { maxSizeBytes: number; allowedTypes: string[] },
): ValidationResult {
  if (file.size > config.maxSizeBytes) {
    return { valid: false, reason: "size_exceeded" };
  }
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, reason: "invalid_type" };
  }
  return { valid: true };
}

// --- Helpers ---

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Constants ---

const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// --- Component ---

export function ImageUploader({
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  uploadUrl,
  uploadHeaders = {},
  fieldName = "file",
  onUploadComplete,
  onChange,
  disabled = false,
}: ImageUploaderProps) {
  const t = useTranslations("imageUploader");
  const tA11y = useTranslations("accessibility.buttons");
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropzoneId = useId();

  const updateFiles = useCallback(
    (updater: (prev: UploadFileItem[]) => UploadFileItem[]) => {
      setFiles((prev) => {
        const next = updater(prev);
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  // --- File reading for preview ---

  const createPreview = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      }),
    [],
  );

  // --- Upload logic ---

  const uploadFile = useCallback(
    (item: UploadFileItem) => {
      if (!uploadUrl) {
        // If no upload URL, mark as success immediately (preview-only mode)
        updateFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "success" as FileStatus, progress: 100 }
              : f,
          ),
        );
        return;
      }

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append(fieldName, item.file);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          updateFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, progress, status: "uploading" as FileStatus }
                : f,
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
            // If response isn't JSON, use empty string
          }
          updateFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: "success" as FileStatus,
                    progress: 100,
                    url,
                    xhr: undefined,
                  }
                : f,
            ),
          );
          // Notify parent of completed uploads
          setFiles((current) => {
            const successFiles = current
              .filter((f) => f.status === "success" && f.url)
              .map((f) => ({ url: f.url!, id: f.id }));
            if (successFiles.length > 0) {
              onUploadComplete?.(successFiles);
            }
            return current;
          });
        } else {
          updateFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: "error" as FileStatus,
                    error: t("uploadFailed"),
                    xhr: undefined,
                  }
                : f,
            ),
          );
        }
      });

      xhr.addEventListener("error", () => {
        updateFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error" as FileStatus,
                  error: t("networkError"),
                  xhr: undefined,
                }
              : f,
          ),
        );
      });

      xhr.addEventListener("abort", () => {
        updateFiles((prev) => prev.filter((f) => f.id !== item.id));
      });

      xhr.open("POST", uploadUrl);
      Object.entries(uploadHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      // Store xhr reference for cancel
      updateFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "uploading" as FileStatus, xhr }
            : f,
        ),
      );

      xhr.send(formData);
    },
    [uploadUrl, uploadHeaders, fieldName, updateFiles, onUploadComplete, t],
  );

  // --- Process selected files ---

  const processFiles = useCallback(
    async (selectedFiles: File[]) => {
      const currentCount = files.length;
      const availableSlots = maxFiles - currentCount;

      if (availableSlots <= 0) return;

      const filesToProcess = selectedFiles.slice(0, availableSlots);
      const newItems: UploadFileItem[] = [];

      for (const file of filesToProcess) {
        const validation = validateFile(file, { maxSizeBytes, allowedTypes });
        if (!validation.valid) {
          // Add as error item so user sees the rejection reason
          const errorMessage =
            validation.reason === "size_exceeded"
              ? t("fileTooLarge", { max: formatFileSize(maxSizeBytes) })
              : t("invalidType");

          newItems.push({
            id: generateId(),
            file,
            preview: "",
            progress: 0,
            status: "error",
            error: errorMessage,
          });
          continue;
        }

        const preview = await createPreview(file);
        newItems.push({
          id: generateId(),
          file,
          preview,
          progress: 0,
          status: "pending",
        });
      }

      updateFiles((prev) => [...prev, ...newItems]);

      // Start uploading valid files
      for (const item of newItems) {
        if (item.status === "pending") {
          uploadFile(item);
        }
      }
    },
    [
      files.length,
      maxFiles,
      maxSizeBytes,
      allowedTypes,
      createPreview,
      updateFiles,
      uploadFile,
      t,
    ],
  );

  // --- Drag & Drop handlers ---

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [disabled, processFiles],
  );

  // --- Input change handler ---

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        processFiles(selectedFiles);
        // Reset input so same file can be selected again
        e.target.value = "";
      }
    },
    [processFiles],
  );

  // --- Cancel upload ---

  const handleCancel = useCallback(
    (fileId: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        if (file?.xhr) {
          file.xhr.abort();
        }
        const next = prev.filter((f) => f.id !== fileId);
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  // --- Remove file ---

  const handleRemove = useCallback(
    (fileId: string) => {
      updateFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    [updateFiles],
  );

  // --- Click to browse ---

  const handleBrowseClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  // --- Keyboard support for dropzone ---

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  const remainingSlots = maxFiles - files.length;
  const hasFiles = files.length > 0;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        id={dropzoneId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("dropzoneLabel")}
        aria-describedby={`${dropzoneId}-hint`}
        aria-disabled={disabled}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragOver && !disabled && "border-primary bg-primary/5",
          !isDragOver &&
            !disabled &&
            "border-muted-foreground/25 hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={handleKeyDown}
      >
        <Upload
          className={cn(
            "h-8 w-8",
            isDragOver ? "text-primary" : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragOver ? t("dropHere") : t("dragOrClick")}
          </p>
          <p
            id={`${dropzoneId}-hint`}
            className="mt-1 text-xs text-muted-foreground"
          >
            {t("hint", {
              maxSize: formatFileSize(maxSizeBytes),
              maxFiles,
              remaining: remainingSlots,
            })}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={allowedTypes.join(",")}
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled}
        />
      </div>

      {/* File list */}
      {hasFiles && (
        <ul className="space-y-2" aria-label={t("fileListLabel")}>
          {files.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border bg-card p-2"
            >
              {/* Thumbnail */}
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <AlertCircle
                      className="h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>

              {/* File info + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </p>

                {/* Progress bar */}
                {item.status === "uploading" && (
                  <div className="mt-1">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t("uploadProgress", {
                        fileName: item.file.name,
                        progress: item.progress,
                      })}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message */}
                {item.status === "error" && item.error && (
                  <p className="mt-0.5 text-xs text-destructive" role="alert">
                    {item.error}
                  </p>
                )}
              </div>

              {/* Status icon + action */}
              <div className="flex-shrink-0">
                {item.status === "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCancel(item.id)}
                    aria-label={tA11y("cancelUpload")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {item.status === "pending" && (
                  <Loader2
                    className="h-4 w-4 animate-spin text-muted-foreground"
                    aria-label={t("pending")}
                  />
                )}
                {item.status === "success" && (
                  <CheckCircle2
                    className="h-4 w-4 text-green-600"
                    aria-label={t("uploadSuccess")}
                  />
                )}
                {item.status === "error" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemove(item.id)}
                    aria-label={tA11y("removeFile")}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
