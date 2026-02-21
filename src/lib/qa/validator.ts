import type { ListingContent, Marketplace, QAResult } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import type { FieldConstraint, BannedTermRule } from "@/lib/marketplace/types";

/**
 * Maps FieldConstraint names to the corresponding ListingContent property.
 * Handles both simple string fields and array/object fields.
 */
function getFieldValue(
  content: ListingContent,
  fieldName: string
): string | string[] | undefined {
  switch (fieldName) {
    case "title":
      return content.title;
    case "bullets":
    case "features":
      return content.bullets;
    case "description":
      return content.description;
    case "backend_keywords":
      return content.backend_keywords;
    case "seo_title":
      return content.seo_title;
    case "meta_description":
      return content.meta_description;
    case "tags":
      return content.tags;
    case "subtitle":
      return content.subtitle;
    case "shelf_description":
      return content.shelf_description;
    case "item_specifics": {
      const specifics = content.item_specifics;
      if (!specifics || Object.keys(specifics).length === 0) return undefined;
      return JSON.stringify(specifics);
    }
    case "attributes": {
      const attrs = content.attributes;
      if (!attrs || Object.keys(attrs).length === 0) return undefined;
      return JSON.stringify(attrs);
    }
    case "condition_notes":
      return content.condition_notes;
    case "compliance_notes":
      return content.compliance_notes;
    case "shipping_notes":
      return content.shipping_notes;
    case "returns_notes":
      return content.returns_notes;
    case "category_hint":
      return content.category_hint;
    default:
      return undefined;
  }
}

/**
 * Returns the text representation of a field value for length/content checks.
 */
function getFieldText(content: ListingContent, fieldName: string): string {
  const value = getFieldValue(content, fieldName);
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join("\n");
  return value;
}

/**
 * Returns the byte length of a string (UTF-8).
 */
function byteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Simple HTML tag detection regex. Matches common opening/closing tags.
 */
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*?>/i;

/**
 * Checks whether a string is entirely uppercase (ignoring non-letter chars).
 */
function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

/**
 * Severity ordering: error=0, warning=1, info=2 (lower = more severe).
 */
const SEVERITY_ORDER: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function sortBySeverity(results: QAResult[]): QAResult[] {
  return results.sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
}

// ─── Field constraint checks ──────────────────────────────────────────

function checkFieldConstraints(
  content: ListingContent,
  fields: FieldConstraint[]
): QAResult[] {
  const results: QAResult[] = [];

  for (const field of fields) {
    const value = getFieldValue(content, field.name);
    const text = getFieldText(content, field.name);

    // Required field missing
    if (field.required) {
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        results.push({
          field: field.name,
          rule: "required_field",
          severity: "error",
          message: `${capitalize(field.name)} is required but missing or empty`,
        });
        continue; // Skip further checks for this field
      }
    }

    // If value is empty and not required, skip remaining checks
    if (!text) continue;

    // Character limit exceeded
    if (field.maxLength !== null && text.length > field.maxLength) {
      results.push({
        field: field.name,
        rule: "max_length",
        severity: "error",
        message: `${capitalize(field.name)} is ${text.length} chars, max is ${field.maxLength}`,
      });
    }

    // Byte limit exceeded (relevant for backend_keywords)
    if (field.maxBytes !== undefined && byteLength(text) > field.maxBytes) {
      results.push({
        field: field.name,
        rule: "max_bytes",
        severity: "error",
        message: `${capitalize(field.name)} is ${byteLength(text)} bytes, max is ${field.maxBytes} bytes`,
      });
    }

    // HTML in non-HTML fields
    if (!field.htmlAllowed && HTML_TAG_REGEX.test(text)) {
      results.push({
        field: field.name,
        rule: "no_html",
        severity: "warning",
        message: `${capitalize(field.name)} contains HTML tags but HTML is not allowed for this field`,
      });
    }
  }

  return results;
}

// ─── Banned term checks ───────────────────────────────────────────────

/** Text fields to scan for banned terms. */
const TEXT_FIELDS_TO_SCAN = [
  "title",
  "bullets",
  "description",
  "backend_keywords",
  "seo_title",
  "meta_description",
  "subtitle",
  "shelf_description",
] as const;

function checkBannedTerms(
  content: ListingContent,
  bannedTerms: BannedTermRule[]
): QAResult[] {
  const results: QAResult[] = [];

  for (const rule of bannedTerms) {
    for (const fieldName of TEXT_FIELDS_TO_SCAN) {
      const text = getFieldText(content, fieldName);
      if (!text) continue;

      // Reset regex lastIndex in case the regex has the global flag
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(text);
      if (match) {
        results.push({
          field: fieldName,
          rule: "banned_term",
          severity: rule.severity,
          message: `Banned term '${rule.term}' found in ${fieldName}: ${rule.reason}`,
        });
      }
    }
  }

  return results;
}

// ─── Structural checks ───────────────────────────────────────────────

function checkStructuralRules(
  content: ListingContent,
  fields: FieldConstraint[],
  marketplace: Marketplace
): QAResult[] {
  const results: QAResult[] = [];

  if (marketplace === "amazon") {
    const bullets = Array.isArray(content.bullets) ? content.bullets : [];
    if (bullets.length !== 5) {
      results.push({
        field: "bullets",
        rule: "amazon_bullet_count",
        severity: "error",
        message: `Amazon requires exactly 5 bullets; found ${bullets.length}`,
      });
    }

    for (let i = 0; i < bullets.length; i++) {
      const rawBullet = bullets[i];
      const bullet = typeof rawBullet === "string" ? rawBullet.trim() : "";

      if (!bullet) {
        results.push({
          field: "bullets",
          rule: "amazon_bullet_empty",
          severity: "error",
          message: `Amazon bullet ${i + 1} must be non-empty`,
        });
        continue;
      }

      if (bullet.length > 500) {
        results.push({
          field: "bullets",
          rule: "amazon_bullet_length",
          severity: "error",
          message: `Amazon bullet ${i + 1} is ${bullet.length} chars; max is 500`,
        });
      }
    }
  }

  // Check bullet/feature quality — each should be substantive (>20 chars)
  if (content.bullets && content.bullets.length > 0) {
    for (let i = 0; i < content.bullets.length; i++) {
      const rawBullet = content.bullets[i];
      const bullet = typeof rawBullet === "string" ? rawBullet.trim() : "";
      if (bullet.length > 0 && bullet.length < 20) {
        results.push({
          field: "bullets",
          rule: "bullet_too_short",
          severity: "warning",
          message: `Bullet ${i + 1} is only ${bullet.length} chars — bullets should be substantive (at least 20 chars)`,
        });
      }
    }
  }

  // Title should not be ALL CAPS
  if (content.title && isAllCaps(content.title)) {
    results.push({
      field: "title",
      rule: "all_caps",
      severity: "warning",
      message:
        "Title is in ALL CAPS — use title case or sentence case for better readability",
    });
  }

  // Title should not start with a brand name pattern (common anti-pattern)
  // Heuristic: title starts with a single short capitalized word followed by a dash or pipe
  if (content.title) {
    const brandPrefixPattern = /^[A-Z][a-zA-Z0-9]{0,20}\s*[-|–—]\s*/;
    if (brandPrefixPattern.test(content.title)) {
      results.push({
        field: "title",
        rule: "brand_prefix",
        severity: "info",
        message:
          "Title appears to start with a brand name prefix — consider integrating the brand name naturally",
      });
    }
  }

  // Description should have at least 100 chars if the field is required
  const descField = fields.find(
    (f) => f.name === "description" || f.name === "shelf_description"
  );
  if (descField?.required) {
    const descText = getFieldText(content, descField.name);
    if (descText && descText.length > 0 && descText.length < 100) {
      results.push({
        field: descField.name,
        rule: "description_too_short",
        severity: "warning",
        message: `${capitalize(descField.name)} is only ${descText.length} chars — aim for at least 100 chars for a complete description`,
      });
    }
  }

  return results;
}

// ─── Utility ──────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Photo recommendation checks ────────────────────────────────────

function checkPhotoRecommendations(
  content: ListingContent
): QAResult[] {
  const results: QAResult[] = [];
  const photos = content.photo_recommendations;
  if (!photos || photos.length === 0) return results;

  const seenSlots = new Set<number>();
  for (const photo of photos) {
    // Duplicate slot check
    if (seenSlots.has(photo.slot)) {
      results.push({
        field: "photo_recommendations",
        rule: "duplicate_slot",
        severity: "warning",
        message: `Duplicate photo slot ${photo.slot} — each slot should be unique`,
      });
    }
    seenSlots.add(photo.slot);

    // Missing description
    if (!photo.description || photo.description.trim().length === 0) {
      results.push({
        field: "photo_recommendations",
        rule: "missing_photo_description",
        severity: "info",
        message: `Photo slot ${photo.slot} is missing a description`,
      });
    }

    // Missing tips
    if (!photo.tips || photo.tips.length === 0) {
      results.push({
        field: "photo_recommendations",
        rule: "missing_photo_tips",
        severity: "info",
        message: `Photo slot ${photo.slot} has no tips`,
      });
    }
  }

  return results;
}

// ─── Item specifics / attributes checks ─────────────────────────────

function checkMetadataFields(
  content: ListingContent
): QAResult[] {
  const results: QAResult[] = [];

  // Check item_specifics for empty values
  if (content.item_specifics) {
    for (const [key, value] of Object.entries(content.item_specifics)) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) {
        results.push({
          field: "item_specifics",
          rule: "empty_specific",
          severity: "warning",
          message: `Item specific "${key}" has an empty value`,
        });
      }
    }
  }

  // Check attributes for empty values
  if (content.attributes) {
    for (const [key, value] of Object.entries(content.attributes)) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) {
        results.push({
          field: "attributes",
          rule: "empty_attribute",
          severity: "warning",
          message: `Attribute "${key}" has an empty value`,
        });
      }
    }
  }

  return results;
}

// ─── Main export ──────────────────────────────────────────────────────

/**
 * Performs deterministic validation of a listing against marketplace rules.
 * Returns an array of QAResult objects sorted by severity (error, warning, info).
 */
export function validateListing(
  content: ListingContent,
  marketplace: Marketplace
): QAResult[] {
  const profile = getMarketplaceProfile(marketplace);

  const fieldResults = checkFieldConstraints(content, profile.fields);
  const bannedResults = checkBannedTerms(content, profile.bannedTerms);
  const structuralResults = checkStructuralRules(content, profile.fields, marketplace);
  const photoResults = checkPhotoRecommendations(content);
  const metadataResults = checkMetadataFields(content);

  return sortBySeverity([
    ...fieldResults,
    ...bannedResults,
    ...structuralResults,
    ...photoResults,
    ...metadataResults,
  ]);
}
