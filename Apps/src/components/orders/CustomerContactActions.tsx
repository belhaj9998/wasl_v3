"use client";

import { MessageCircle, Phone, Copy, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { buildWhatsAppUrl } from "@/lib/utils/phoneUtils";

/**
 * Props for {@link CustomerContactActions}.
 */
interface CustomerContactActionsProps {
  phone?: string | null;
  email?: string | null;
  customerName: string;
  orderNumber: string;
  locale: "ar" | "en";
}

/**
 * Build the localized greeting used as the WhatsApp `text` query param.
 *
 * - For `ar`: `مرحباً {customerName}، بخصوص طلبكم رقم #{orderNumber}`
 * - For `en`: `Hello {customerName}, regarding your order #{orderNumber}`
 */
export function buildWhatsAppMessage(
  customerName: string,
  orderNumber: string,
  locale: "ar" | "en",
): string {
  if (locale === "ar") {
    return `مرحباً ${customerName}، بخصوص طلبكم رقم #${orderNumber}`;
  }
  return `Hello ${customerName}, regarding your order #${orderNumber}`;
}

/**
 * Localized labels for the inline contact action buttons.
 */
const STRINGS = {
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  call: { ar: "اتصال", en: "Call" },
  sms: { ar: "رسالة نصية", en: "SMS" },
  copyPhone: { ar: "نسخ الرقم", en: "Copy phone" },
  email: { ar: "بريد إلكتروني", en: "Email" },
  copyEmail: { ar: "نسخ البريد", en: "Copy email" },
  copiedPhone: { ar: "تم نسخ الرقم", en: "Phone copied" },
  copiedEmail: { ar: "تم نسخ البريد", en: "Email copied" },
  copyFailed: { ar: "تعذر النسخ", en: "Copy failed" },
} as const;

/**
 * Renders inline quick-contact action icons (WhatsApp, call, copy phone,
 * email, copy email) for a customer on the Order Detail page.
 *
 * - Phone row is rendered only when `phone` is non-empty.
 * - Email row is rendered only when `email` is non-empty.
 * - The WhatsApp button is disabled when the phone has no digits.
 */
export function CustomerContactActions({
  phone,
  email,
  customerName,
  orderNumber,
  locale,
}: CustomerContactActionsProps) {
  const hasPhone = typeof phone === "string" && phone.length > 0;
  const hasEmail = typeof email === "string" && email.length > 0;

  const message = buildWhatsAppMessage(customerName, orderNumber, locale);

  const whatsappUrl = hasPhone
    ? buildWhatsAppUrl(phone as string, message)
    : "";

  const smsHref = hasPhone
    ? `sms:${phone}?body=${encodeURIComponent(message)}`
    : "";

  const emailSubject =
    locale === "ar" ? `طلب #${orderNumber}` : `Order #${orderNumber}`;

  const handleCopyPhone = async () => {
    if (!hasPhone) return;
    const ok = await copyToClipboard(phone as string);
    if (ok) {
      toast.success(STRINGS.copiedPhone[locale]);
    } else {
      toast.error(STRINGS.copyFailed[locale]);
    }
  };

  const handleCopyEmail = async () => {
    if (!hasEmail) return;
    const ok = await copyToClipboard(email as string);
    if (ok) {
      toast.success(STRINGS.copiedEmail[locale]);
    } else {
      toast.error(STRINGS.copyFailed[locale]);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {hasPhone && (
          <div className="flex flex-col gap-1">
            <span dir="ltr" className="text-sm">
              {phone}
            </span>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  {whatsappUrl === "" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled
                      aria-disabled="true"
                      aria-label={STRINGS.whatsapp[locale]}
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={STRINGS.whatsapp[locale]}
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </a>
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent>{STRINGS.whatsapp[locale]}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <a href={`tel:${phone}`} aria-label={STRINGS.call[locale]}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{STRINGS.call[locale]}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <a href={smsHref} aria-label={STRINGS.sms[locale]}>
                      <MessageSquare className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{STRINGS.sms[locale]}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyPhone}
                    aria-label={STRINGS.copyPhone[locale]}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{STRINGS.copyPhone[locale]}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {hasEmail && (
          <div className="flex flex-col gap-1">
            <span dir="ltr" className="text-sm">
              {email}
            </span>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <a
                      href={`mailto:${email}?subject=${encodeURIComponent(
                        emailSubject,
                      )}`}
                      aria-label={STRINGS.email[locale]}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{STRINGS.email[locale]}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyEmail}
                    aria-label={STRINGS.copyEmail[locale]}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{STRINGS.copyEmail[locale]}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default CustomerContactActions;
