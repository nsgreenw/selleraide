/**
 * Shared helper for fetching a category's item aspects from eBay's
 * Taxonomy API, with an in-process cache. Used by both the required-
 * aspects route (UI) and the publish route (enforcement).
 */
import { ebayApiFetch, getApplicationToken } from "./client";

export interface AspectOption {
  name: string;
  required: boolean;
  cardinality: "SINGLE" | "MULTI";
  mode: "FREE_TEXT" | "SELECTION_ONLY";
  values: string[];
}

const cache = new Map<string, { data: AspectOption[]; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchCategoryAspects(
  categoryId: string
): Promise<AspectOption[]> {
  const hit = cache.get(categoryId);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const token = await getApplicationToken();
  const res = await ebayApiFetch(
    `/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`,
    { accessToken: token }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[eBay Aspects] Lookup failed:", res.status, text);
    return [];
  }

  type ApiAspect = {
    localizedAspectName: string;
    aspectConstraint: {
      aspectRequired?: boolean;
      aspectMode?: string;
      itemToAspectCardinality?: string;
    };
    aspectValues?: Array<{ localizedValue: string }>;
  };

  const data = (await res.json()) as { aspects?: ApiAspect[] };
  const aspects: AspectOption[] = (data.aspects ?? []).map((a) => ({
    name: a.localizedAspectName,
    required: !!a.aspectConstraint.aspectRequired,
    cardinality:
      a.aspectConstraint.itemToAspectCardinality === "MULTI"
        ? "MULTI"
        : "SINGLE",
    mode:
      a.aspectConstraint.aspectMode === "SELECTION_ONLY"
        ? "SELECTION_ONLY"
        : "FREE_TEXT",
    values: (a.aspectValues ?? []).map((v) => v.localizedValue).slice(0, 100),
  }));

  cache.set(categoryId, {
    data: aspects,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return aspects;
}

/**
 * Enforce cardinality on a set of item specifics. For aspects known to
 * be SINGLE, collapse any comma/semicolon/pipe-separated value down to
 * just the first entry. Unknown-cardinality aspects pass through — only
 * aspects eBay has explicitly told us are SINGLE get trimmed.
 */
export function enforceAspectCardinality(
  specifics: Record<string, string>,
  aspects: AspectOption[]
): Record<string, string> {
  const singleNames = new Set(
    aspects
      .filter((a) => a.cardinality === "SINGLE")
      .map((a) => a.name.toLowerCase())
  );

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(specifics)) {
    if (singleNames.has(key.toLowerCase())) {
      const first = value.split(/[,;|]/)[0].trim();
      out[key] = first.length > 0 ? first : value;
    } else {
      out[key] = value;
    }
  }
  return out;
}
