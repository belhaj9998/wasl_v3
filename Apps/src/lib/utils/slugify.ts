const ARABIC_CHAR_MAP: Record<string, string> = {
  ء: "",
  آ: "a",
  أ: "a",
  إ: "i",
  ا: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "h",
  و: "w",
  ي: "y",
  ى: "a",
  ئ: "y",
  ؤ: "w",
};

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

export function slugify(value: string, fallback = "product"): string {
  const transliterated = value
    .replace(ARABIC_DIACRITICS, "")
    .split("")
    .map((char) => ARABIC_CHAR_MAP[char] ?? char)
    .join("");

  const slug = transliterated
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}
