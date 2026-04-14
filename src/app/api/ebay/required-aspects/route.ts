import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { ebayApiFetch, getApplicationToken } from "@/lib/ebay/client";

interface AspectOption {
  name: string;
  required: boolean;
  cardinality: "SINGLE" | "MULTI";
  mode: "FREE_TEXT" | "SELECTION_ONLY";
  values: string[];
}

const cache = new Map<string, { data: AspectOption[]; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  if (!categoryId) return jsonError("Missing categoryId");

  const hit = cache.get(categoryId);
  if (hit && hit.expiresAt > Date.now()) {
    return jsonSuccess(hit.data);
  }

  const token = await getApplicationToken();
  const res = await ebayApiFetch(
    `/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`,
    { accessToken: token }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[eBay Aspects] Lookup failed:", res.status, text);
    return jsonError("Aspect lookup failed");
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
      a.aspectConstraint.itemToAspectCardinality === "MULTI" ? "MULTI" : "SINGLE",
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

  return jsonSuccess(aspects);
}
