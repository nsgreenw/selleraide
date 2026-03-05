import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getValidAccessToken } from "@/lib/ebay/tokens";
import { ebayApiFetch } from "@/lib/ebay/client";

// Simple in-memory cache: query → { data, expiresAt }
const categoryCache = new Map<
  string,
  { data: { categoryId: string; categoryName: string }[]; expiresAt: number }
>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length === 0) {
    return jsonError("Missing search query (?q=)");
  }

  const cacheKey = query.trim().toLowerCase();

  // Check cache
  const cached = categoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return jsonSuccess(cached.data);
  }

  const result = await getValidAccessToken(user.id);
  if (!result) return jsonError("eBay account not connected", 400);
  const { token } = result;

  const res = await ebayApiFetch(
    `/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${encodeURIComponent(query.trim())}`,
    { accessToken: token }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[eBay Categories] Search failed:", res.status, text);
    return jsonError("Category search failed");
  }

  const json = await res.json();
  const suggestions: { categoryId: string; categoryName: string }[] = (
    json.categorySuggestions ?? []
  ).map(
    (s: { category: { categoryId: string; categoryName: string } }) => ({
      categoryId: s.category.categoryId,
      categoryName: s.category.categoryName,
    })
  );

  // Store in cache
  categoryCache.set(cacheKey, {
    data: suggestions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  // Evict old entries if cache grows too large
  if (categoryCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of categoryCache) {
      if (val.expiresAt < now) categoryCache.delete(key);
    }
  }

  return jsonSuccess(suggestions);
}
