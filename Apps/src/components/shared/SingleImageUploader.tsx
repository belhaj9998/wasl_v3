"use client";

/**
 * SingleImageUploader
 * مربع رفع صورة واحدة، مع معاينة ورفع فوري للسيرفر.
 * يستخدم uploadService.uploadImage ويرجع الـ URL عبر onChange.
 */

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { uploadService } from "@/lib/api/services/upload.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface SingleImageUploaderProps {
  /** الـ URL الحالي للصورة (أو null/empty لو ما في صورة) */
  value?: string | null;
  /** يُستدعى عند نجاح الرفع أو الإزالة */
  onChange: (url: string | null) => void;
  /** storeId مطلوب للرفع (multi-tenancy) */
  storeId: number;
  /** نص بديل للصورة */
  alt?: string;
  /** تعطيل الرفع */
  disabled?: boolean;
  /** ارتفاع المربع (Tailwind class). افتراضي h-40 */
  heightClass?: string;
}

export function SingleImageUploader({
  value,
  onChange,
  storeId,
  alt = "image",
  disabled = false,
  heightClass = "h-40",
}: SingleImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value ?? null);

  // لو الـ value تغير من الخارج (مثلاً عند تعديل category مختلفة)، حدّث المعاينة
  if (value !== undefined && value !== previewUrl && !uploading) {
    setPreviewUrl(value ?? null);
  }

  const handlePick = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // عشان نقدر نختار نفس الملف مرة ثانية
    if (!file) return;

    // التحقق من النوع
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. JPG, PNG, WebP, GIF فقط");
      return;
    }

    // التحقق من الحجم
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("حجم الملف يتجاوز 5 ميجا");
      return;
    }

    // معاينة فورية قبل الرفع
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    try {
      const res = await uploadService.uploadImage(storeId, file);
      const uploadedUrl = res.data.url;
      setPreviewUrl(uploadedUrl);
      onChange(uploadedUrl);
      URL.revokeObjectURL(localPreview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل رفع الصورة";
      toast.error(msg);
      // ارجع للقيمة السابقة
      setPreviewUrl(value ?? null);
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="رفع صورة"
        onClick={handlePick}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handlePick();
          }
        }}
        className={cn(
          "relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          heightClass,
          "flex items-center justify-center bg-muted/30",
          !disabled &&
            "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt={alt}
              fill
              sizes="400px"
              className="object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {!uploading && !disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute end-2 top-2 h-7 w-7"
                onClick={handleRemove}
                aria-label="إزالة الصورة"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium text-foreground">
              {uploading ? "جاري الرفع..." : "اضغط لرفع صورة"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, GIF (حتى 5 ميجا)
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || uploading}
      />
    </div>
  );
}
