/**
 * Generates a URL-safe slug from a given name.
 * Converts to lowercase, trims whitespace, removes special characters,
 * replaces spaces with hyphens, collapses multiple hyphens,
 * and trims leading/trailing hyphens.
 */
export const slugify = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
};
