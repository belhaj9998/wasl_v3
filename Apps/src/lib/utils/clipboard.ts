/**
 * Shared clipboard helper.
 *
 * Tries `navigator.clipboard.writeText` first (modern path), then falls back
 * to a hidden `<textarea>` + `document.execCommand("copy")` for legacy
 * environments or contexts where the Clipboard API is unavailable / blocked.
 *
 * Pure imperative helper: no toasts, no logging. Callers decide how to
 * surface success/failure (e.g. via `sonner` toast).
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  // Modern path: navigator.clipboard.writeText
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the legacy fallback
  }

  // Legacy fallback: hidden textarea + document.execCommand("copy")
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
