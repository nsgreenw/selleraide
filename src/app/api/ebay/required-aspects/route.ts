import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { fetchCategoryAspects } from "@/lib/ebay/aspects";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  if (!categoryId) return jsonError("Missing categoryId");

  const aspects = await fetchCategoryAspects(categoryId);
  return jsonSuccess(aspects);
}
