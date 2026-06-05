/**
 * Libyan phone-number normalization and WhatsApp URL helpers.
 *
 * These helpers are pure and side-effect free. They are used by
 * `CustomerContactActions` to convert a free-form Libyan phone string
 * into international format (`+218...`) and to build a `https://wa.me/...`
 * deep link with a pre-filled message.
 */

/**
 * Normalize a phone string into international format.
 *
 * Rules (in order):
 *   1. If `phone` begins with "+", preserve the "+" and strip every non-digit
 *      from the remainder.
 *   2. Otherwise, strip every non-digit. If the resulting digit string starts
 *      with "0", remove the leading "0" and prepend "+218".
 *   3. Otherwise, prepend "+218" to the stripped digit sequence.
 *   4. If no digit characters exist after stripping, return "".
 *
 * Postcondition: the returned value is either `""` or `"+"` followed by one
 * or more decimal digits.
 *
 * @param phone - Free-form phone string (may include spaces, dashes, parens, "+", etc.)
 * @returns Normalized international phone string, or "" when no digits are present.
 */
export function normalizeLibyanPhone(phone: string): string {
  const startsWithPlus = phone.startsWith("+");
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length === 0) {
    return "";
  }

  if (startsWithPlus) {
    return "+" + digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return "+218" + digitsOnly.slice(1);
  }

  return "+218" + digitsOnly;
}

/**
 * Build a `https://wa.me/...` deep link with a pre-filled message.
 *
 * Returns `""` when `normalizeLibyanPhone(phone)` returns `""` (i.e. the phone
 * string contained no digits). Otherwise returns:
 *   "https://wa.me/" + digitsOnly + "?text=" + encodeURIComponent(message)
 * where `digitsOnly` is the normalized phone with the leading "+" removed.
 *
 * @param phone - Free-form phone string.
 * @param message - Plain-text message body to URL-encode into the `text` param.
 * @returns A WhatsApp deep-link URL, or "" when the phone has no digits.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeLibyanPhone(phone);
  if (normalized === "") {
    return "";
  }
  const digitsOnly = normalized.slice(1); // strip leading "+"
  return "https://wa.me/" + digitsOnly + "?text=" + encodeURIComponent(message);
}
