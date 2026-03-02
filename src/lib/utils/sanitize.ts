import DOMPurify from "isomorphic-dompurify";
import type { ListingContent, APlusModule } from "@/types";

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "br", "p", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "a",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

/** Strip all HTML tags — used for fields that should be plain text. */
function sanitizePlain(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

function sanitizeStrings(arr?: string[]): string[] | undefined {
  return arr?.map(sanitizePlain);
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

function sanitizeAPlusModule(mod: APlusModule): APlusModule {
  const clean: APlusModule = {
    type: mod.type,
    position: mod.position,
  };
  if (mod.headline) clean.headline = sanitizePlain(mod.headline);
  if (mod.body) clean.body = sanitizeHtml(mod.body);
  if (mod.caption) clean.caption = sanitizePlain(mod.caption);
  if (mod.image) {
    clean.image = {
      alt_text: sanitizePlain(mod.image.alt_text),
      image_guidance: sanitizePlain(mod.image.image_guidance),
    };
  }
  if (mod.images) {
    clean.images = mod.images.map((img) => ({
      alt_text: sanitizePlain(img.alt_text),
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
export function sanitizeListingContent(content: ListingContent): ListingContent {
  const clean: ListingContent = {
    title: sanitizePlain(content.title),
    description: sanitizeHtml(content.description),
  };

  if (content.bullets) clean.bullets = sanitizeStrings(content.bullets);
  if (content.backend_keywords) clean.backend_keywords = sanitizePlain(content.backend_keywords);
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
    clean.a_plus_modules = content.a_plus_modules.map(sanitizeAPlusModule);
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
