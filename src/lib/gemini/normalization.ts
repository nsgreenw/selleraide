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
