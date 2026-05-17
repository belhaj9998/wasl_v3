/**
 * XSS Prevention — HTML Sanitization Utility
 *
 * ## Approach
 *
 * React's JSX escaping handles XSS prevention by default for all dynamic content
 * rendered via `{}` expressions. This means any user-provided string containing
 * HTML special characters (<, >, &, ", ') will be displayed as literal text and
 * will NOT be interpreted as HTML markup.
 *
 * This utility exists for cases where rich HTML content (e.g., product descriptions
 * from a WYSIWYG editor) needs to be rendered using `dangerouslySetInnerHTML`.
 * In such cases, the HTML MUST be sanitized through `sanitizeHtml()` before rendering.
 *
 * ## Rules
 *
 * 1. NEVER use `dangerouslySetInnerHTML` without passing content through `sanitizeHtml()`.
 * 2. NEVER assign to `.innerHTML` in production code.
 * 3. ALWAYS prefer React's built-in JSX escaping for plain text content.
 * 4. Use `sanitizeHtml()` ONLY when you need to render trusted rich HTML content.
 * 5. Use `escapeHtml()` when you need to manually escape a string for non-React contexts.
 *
 * @module sanitize
 */

import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
/**
 * Default DOMPurify configuration.
 * Allows safe HTML tags for rich text content while stripping dangerous elements.
 */


type StringSanitizeConfig = Omit<DOMPurifyConfig, "RETURN_TRUSTED_TYPE"> & {
  RETURN_TRUSTED_TYPE?: false;
};




const DEFAULT_SANITIZE_CONFIG: StringSanitizeConfig = {
  RETURN_TRUSTED_TYPE: false,
  ALLOWED_TAGS: [
    "p",
    "br",
    "b",
    "i",
    "em",
    "strong",
    "a",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  ALLOWED_ATTR: [
    "href",
    "target",
    "rel",
    "src",
    "alt",
    "width",
    "height",
    "class",
    "style",
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ["target"],
  // Force all links to open in new tab with noopener
  FORBID_TAGS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
  ],
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onfocus",
    "onblur",
  ],
};

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks.
 * Use this ONLY when rendering rich HTML content via `dangerouslySetInnerHTML`.
 *
 * @param dirty - The untrusted HTML string to sanitize
 * @param config - Optional DOMPurify configuration override
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```tsx
 * // Safe usage with dangerouslySetInnerHTML
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
 * ```
 */
export function sanitizeHtml(
  dirty: string,
  config?: StringSanitizeConfig,
): string {  if (!dirty) return "";

  const mergedConfig = config
    ? { ...DEFAULT_SANITIZE_CONFIG, ...config }
    : DEFAULT_SANITIZE_CONFIG;

  return DOMPurify.sanitize(dirty, mergedConfig);
}

/**
 * Strict sanitization that strips ALL HTML tags, returning plain text only.
 * Useful when you want to display user content as text without any formatting.
 *
 * @param dirty - The untrusted string that may contain HTML
 * @returns Plain text with all HTML tags removed
 *
 * @example
 * ```tsx
 * const safeText = stripHtml('<script>alert("xss")</script>Hello');
 * // Returns: 'Hello'
 * ```
 */
export function stripHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * HTML entity encoding map for special characters.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ESCAPE_REGEX = /[&<>"']/g;

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * This is what React does internally for JSX expressions.
 *
 * Use this for non-React contexts where you need manual HTML encoding.
 * In React components, prefer using JSX expressions `{value}` which
 * automatically escape content.
 *
 * @param str - The string to escape
 * @returns HTML-escaped string where <, >, &, ", ' are encoded as entities
 *
 * @example
 * ```ts
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(
    HTML_ESCAPE_REGEX,
    (char) => HTML_ESCAPE_MAP[char] || char,
  );
}

/**
 * Creates a safe props object for rendering user-provided HTML content.
 * Combines sanitization with the dangerouslySetInnerHTML pattern.
 *
 * @param html - The untrusted HTML string
 * @returns Props object safe to spread on a React element
 *
 * @example
 * ```tsx
 * <div {...createSafeHtmlProps(product.richDescription)} />
 * ```
 */
export function createSafeHtmlProps(html: string): {
  dangerouslySetInnerHTML: { __html: string };
} {
  return {
    dangerouslySetInnerHTML: { __html: sanitizeHtml(html) },
  };
}
