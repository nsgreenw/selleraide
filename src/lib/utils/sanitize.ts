import type { ListingContent, APlusModule, Marketplace } from "@/types";

/**
 * Server-safe HTML sanitizer — no jsdom dependency.
 *
 * Previously used isomorphic-dompurify which pulls in jsdom on the server.
 * jsdom@28 has an ESM-only transitive dependency (encoding-lite) that crashes
 * in Vercel's CJS serverless runtime. This lightweight approach avoids that.
 */

const SAFE_TAGS = new Set([
  "b", "i", "em", "strong", "br", "p", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "a",
]);

const SAFE_ATTRS = new Set(["href", "target", "rel", "class"]);

/**
 * Strip all HTML tags — returns plain text only.
 * Decodes common HTML entities.
 */
function sanitizePlain(dirty: string): string {
  return dirty
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Allow only safe HTML tags and attributes. Strips everything else.
 * Not a full DOMPurify replacement, but sufficient for our use case:
 * listing descriptions with basic formatting.
 */
export function sanitizeHtml(dirty: string): string {
  // Remove script/style tags and their content entirely
  let html = dirty.replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Remove self-closing dangerous tags
  html = html.replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?>/gi, "");
  // Remove event handler attributes (onclick, onerror, etc.)
  html = html.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  // Remove javascript: URLs
  html = html.replace(/href\s*=\s*["']?\s*javascript:[^"'>]*/gi, 'href="#"');

  // Strip disallowed tags but keep their content
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    const tag = tagName.toLowerCase();
    if (!SAFE_TAGS.has(tag)) return "";

    // For opening tags, filter attributes
    if (!match.startsWith("</")) {
      const attrPart = match.slice(match.indexOf(tagName) + tagName.length, -1);
      const cleanAttrs: string[] = [];
      const attrRegex = /\s+([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
        if (SAFE_ATTRS.has(attrName)) {
          cleanAttrs.push(`${attrName}="${attrValue}"`);
        }
      }
      return cleanAttrs.length > 0 ? `<${tag} ${cleanAttrs.join(" ")}>` : `<${tag}>`;
    }
    return `</${tag}>`;
  });

  return html;
}

function sanitizeStrings(arr?: string[]): string[] | undefined {
  return arr?.map(sanitizePlain);
}

function trimToByteLimit(value: string, maxBytes: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const encoder = new TextEncoder();
  if (encoder.encode(normalized).length <= maxBytes) return normalized;

  let low = 0;
  let high = normalized.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = normalized.slice(0, mid);
    if (encoder.encode(candidate).length <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return normalized.slice(0, low).trim();
}

function trimCleanlyToByteLimit(value: string, maxBytes: number): string {
  const trimmed = trimToByteLimit(value, maxBytes);
  if (!trimmed) return "";

  const normalizedOriginal = value.trim().replace(/\s+/g, " ");
  if (trimmed === normalizedOriginal) return trimmed;

  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) {
    const withoutTrailingWord = trimmed.slice(0, lastSpace).trim();
    if (withoutTrailingWord) {
      return withoutTrailingWord;
    }
  }

  return trimmed;
}

export function enforceAmazonBackendKeywords(value: string): string {
  const normalized = sanitizePlain(value).trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const encoder = new TextEncoder();
  if (encoder.encode(normalized).length <= 250) return normalized;

  const terms = normalized.split(" ").filter(Boolean);
  const kept: string[] = [];

  for (const term of terms) {
    const candidate = kept.length > 0 ? `${kept.join(" ")} ${term}` : term;
    if (encoder.encode(candidate).length <= 250) {
      kept.push(term);
      continue;
    }

    if (kept.length === 0) {
      return trimCleanlyToByteLimit(term, 250);
    }

    break;
  }

  return kept.join(" ");
}

export function enforceAmazonAltText(value: string): string {
  return trimCleanlyToByteLimit(sanitizePlain(value), 100);
}

function sanitizeRecord(
  rec?: Record<string, string>
): Record<string, string> | undefined {
  if (!rec) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[sanitizePlain(k)] = sanitizePlain(v);
  }
  return out;
}

function sanitizeAPlusModule(mod: APlusModule, marketplace?: Marketplace): APlusModule {
  const clean: APlusModule = {
    type: mod.type,
    position: mod.position,
  };
  if (mod.headline) clean.headline = sanitizePlain(mod.headline);
  if (mod.body) clean.body = sanitizeHtml(mod.body);
  if (mod.caption) clean.caption = sanitizePlain(mod.caption);
  if (mod.image) {
    clean.image = {
      alt_text: marketplace === "amazon"
        ? enforceAmazonAltText(mod.image.alt_text)
        : sanitizePlain(mod.image.alt_text),
      image_guidance: sanitizePlain(mod.image.image_guidance),
    };
  }
  if (mod.images) {
    clean.images = mod.images.map((img) => ({
      alt_text: marketplace === "amazon"
        ? enforceAmazonAltText(img.alt_text)
        : sanitizePlain(img.alt_text),
      image_guidance: sanitizePlain(img.image_guidance),
    }));
  }
  if (mod.highlights) clean.highlights = sanitizeStrings(mod.highlights);
  if (mod.specs) clean.specs = sanitizeRecord(mod.specs);
  return clean;
}

/**
 * Sanitize all string fields of a ListingContent before DB storage.
 * - `description` and A+ `body` fields allow safe HTML (eBay uses HTML descriptions).
 * - All other fields are stripped to plain text.
 */
export function sanitizeListingContent(content: ListingContent, marketplace?: Marketplace): ListingContent {
  const clean: ListingContent = {
    title: sanitizePlain(content.title),
    description: sanitizeHtml(content.description),
  };

  if (content.bullets) clean.bullets = sanitizeStrings(content.bullets);
  if (content.backend_keywords) {
    clean.backend_keywords = marketplace === "amazon"
      ? enforceAmazonBackendKeywords(content.backend_keywords)
      : sanitizePlain(content.backend_keywords);
  }
  if (content.seo_title) clean.seo_title = sanitizePlain(content.seo_title);
  if (content.meta_description) clean.meta_description = sanitizePlain(content.meta_description);
  if (content.tags) clean.tags = sanitizeStrings(content.tags);
  if (content.subtitle) clean.subtitle = sanitizePlain(content.subtitle);
  if (content.item_specifics) clean.item_specifics = sanitizeRecord(content.item_specifics);
  if (content.attributes) clean.attributes = sanitizeRecord(content.attributes);
  if (content.shelf_description) clean.shelf_description = sanitizeHtml(content.shelf_description);
  if (content.collections) clean.collections = sanitizeStrings(content.collections);
  if (content.compliance_notes) clean.compliance_notes = sanitizeStrings(content.compliance_notes);
  if (content.assumptions) clean.assumptions = sanitizeStrings(content.assumptions);
  if (content.condition_notes) clean.condition_notes = sanitizeStrings(content.condition_notes);
  if (content.shipping_notes) clean.shipping_notes = sanitizePlain(content.shipping_notes);
  if (content.returns_notes) clean.returns_notes = sanitizePlain(content.returns_notes);
  if (content.category_hint) clean.category_hint = sanitizePlain(content.category_hint);

  if (content.a_plus_modules) {
    clean.a_plus_modules = content.a_plus_modules.map((mod) => sanitizeAPlusModule(mod, marketplace));
  }

  // photo_recommendations are system-generated guidance, not user/AI text — pass through
  if (content.photo_recommendations) {
    clean.photo_recommendations = content.photo_recommendations;
  }

  return clean;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

export function charCount(str: string): number {
  return str.length;
}

export function byteCount(str: string): number {
  return new TextEncoder().encode(str).length;
}
