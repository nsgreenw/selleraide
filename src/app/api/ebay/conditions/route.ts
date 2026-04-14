import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { ebayApiFetch, getApplicationToken } from "@/lib/ebay/client";
import { conditionIdToEnum, enumToLabel } from "@/lib/ebay/conditions";

interface CategoryConditionOption {
  conditionEnum: string;
  label: string;
  conditionId: string;
}

const conditionCache = new Map<
  string,
  { data: CategoryConditionOption[]; expiresAt: number }
>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  if (!categoryId) return jsonError("Missing categoryId");

  const cached = conditionCache.get(categoryId);
  if (cached && cached.expiresAt > Date.now()) {
    return jsonSuccess(cached.data);
  }

  const token = await getApplicationToken();

  const res = await ebayApiFetch(
    `/sell/metadata/v1/marketplace/EBAY_US/get_item_condition_policies?filter=categoryIds:%7B${encodeURIComponent(categoryId)}%7D`,
    { accessToken: token }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[eBay Conditions] Lookup failed:", res.status, text);
    return jsonError("Condition lookup failed");
  }

  const data = (await res.json()) as {
    itemConditionPolicies?: Array<{
      itemConditions?: Array<{
        conditionId: string;
        conditionDescription: string;
      }>;
    }>;
  };

  const raw = data.itemConditionPolicies?.[0]?.itemConditions ?? [];
  const options: CategoryConditionOption[] = [];
  for (const c of raw) {
    const enumVal = conditionIdToEnum(c.conditionId);
    if (!enumVal) continue;
    options.push({
      conditionEnum: enumVal,
      label: c.conditionDescription || enumToLabel(enumVal),
      conditionId: c.conditionId,
    });
  }

  conditionCache.set(categoryId, {
    data: options,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (conditionCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of conditionCache) {
      if (val.expiresAt < now) conditionCache.delete(key);
    }
  }

  return jsonSuccess(options);
}
