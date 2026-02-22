import type { APlusModule, APlusModuleType } from "@/types";

const VALID_APLUS_TYPES = new Set<APlusModuleType>([
  "STANDARD_HEADER_IMAGE_TEXT",
  "STANDARD_IMAGE_TEXT_OVERLAY",
  "STANDARD_SINGLE_SIDE_IMAGE",
  "STANDARD_IMAGE_SIDEBAR",
  "STANDARD_THREE_IMAGE_TEXT",
  "STANDARD_FOUR_IMAGE_TEXT",
  "STANDARD_FOUR_IMAGE_TEXT_QUADRANT",
  "STANDARD_MULTIPLE_IMAGE_TEXT",
  "STANDARD_SINGLE_IMAGE_HIGHLIGHTS",
  "STANDARD_SINGLE_IMAGE_SPECS_DETAIL",
  "STANDARD_TEXT",
  "STANDARD_PRODUCT_DESCRIPTION",
  "STANDARD_TECH_SPECS",
  "STANDARD_COMPARISON_TABLE",
  "STANDARD_COMPANY_LOGO",
]);

export function toSafeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(toSafeString)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function normalizeAPlusModules(value: unknown): APlusModule[] {
  if (!Array.isArray(value)) return [];

  const modules: APlusModule[] = [];
  let position = 1;

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;

    const raw = item as Record<string, unknown>;

    // Validate/coerce type
    const rawType = toSafeString(raw.type).toUpperCase();
    const type: APlusModuleType = VALID_APLUS_TYPES.has(rawType as APlusModuleType)
      ? (rawType as APlusModuleType)
      : "STANDARD_TEXT";

    const mod: APlusModule = {
      type,
      position: typeof raw.position === "number" ? raw.position : position,
    };

    if (raw.headline) mod.headline = toSafeString(raw.headline);
    if (raw.body) mod.body = toSafeString(raw.body);
    if (raw.caption) mod.caption = toSafeString(raw.caption);

    // Normalize primary image slot
    if (raw.image && typeof raw.image === "object" && !Array.isArray(raw.image)) {
      const img = raw.image as Record<string, unknown>;
      mod.image = {
        alt_text: toSafeString(img.alt_text),
        image_guidance: toSafeString(img.image_guidance),
      };
    }

    // Normalize images array (multi-image modules)
    if (Array.isArray(raw.images)) {
      mod.images = raw.images
        .filter((img): img is Record<string, unknown> => !!img && typeof img === "object" && !Array.isArray(img))
        .map((img) => ({
          alt_text: toSafeString(img.alt_text),
          image_guidance: toSafeString(img.image_guidance),
        }));
    }

    // Normalize highlights array
    if (Array.isArray(raw.highlights)) {
      mod.highlights = normalizeStringArray(raw.highlights);
    }

    // Normalize specs record
    if (raw.specs && typeof raw.specs === "object" && !Array.isArray(raw.specs)) {
      mod.specs = normalizeStringRecord(raw.specs);
    }

    modules.push(mod);
    position++;
  }

  return modules;
}

export function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    if (!key) continue;

    let normalizedValue = "";
    if (typeof rawValue === "string") {
      normalizedValue = rawValue.trim();
    } else if (
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      typeof rawValue === "bigint"
    ) {
      normalizedValue = String(rawValue).trim();
    } else if (Array.isArray(rawValue)) {
      normalizedValue = rawValue
        .map(toSafeString)
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .join(", ");
    }

    if (normalizedValue) {
      normalized[key] = normalizedValue;
    }
  }

  return normalized;
}
