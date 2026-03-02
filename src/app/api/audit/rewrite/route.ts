import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { rewriteFieldSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { rewriteField } from "@/lib/gemini/rewrite";
import type { Marketplace } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return jsonError(auth.error, 401);
    const user = auth.user!;

    const { success, reset } = await getStandardLimiter().limit(user.id);
    if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = rewriteFieldSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues.map(i => i.message).join(", "), 400);
    }

    const result = await rewriteField({
      ...parsed.data,
      marketplace: parsed.data.marketplace as Marketplace,
    });

    return jsonSuccess(result);
  } catch (err) {
    console.error("Rewrite error:", err instanceof Error ? err.message : err);
    return jsonError("Rewrite failed. Please try again.", 500);
  }
}
