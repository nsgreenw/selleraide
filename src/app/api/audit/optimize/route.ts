import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { optimizeSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { requireUsageGate, trackUsage } from "@/lib/api/usage-gate";
import { optimizeListing } from "@/lib/gemini/optimize";
import { analyzeListing } from "@/lib/qa";
import { recordUsage } from "@/lib/subscription/usage";
import { getAPlusModuleCountForTier } from "@/lib/subscription/aplus";
import type { ListingContent, SubscriptionTier } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const csrfError = checkCsrfOrigin(req);
    if (csrfError) return jsonError(csrfError, 403);

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

    const parsed = optimizeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues.map(i => i.message).join(", "), 400);
    }

    const supabase = await createClient();
    const gate = await requireUsageGate(supabase, user.id);
    if (!gate.allowed) return jsonError(gate.error, 403);

    const optimizeInput = {
      ...parsed.data,
      aplus_module_count:
        parsed.data.marketplace === "amazon"
          ? getAPlusModuleCountForTier(gate.profile.subscription_tier as SubscriptionTier)
          : parsed.data.aplus_module_count,
    };

    // First optimization pass
    const firstResult = await optimizeListing(optimizeInput);

    // Re-score the first result to check if a second pass is needed
    const firstContent: ListingContent = {
      title: firstResult.title,
      bullets: firstResult.bullets,
      description: firstResult.description,
      ...(firstResult.backend_keywords ? { backend_keywords: firstResult.backend_keywords } : {}),
      ...(parsed.data.attributes ? { attributes: parsed.data.attributes } : {}),
      ...(firstResult.a_plus_modules ? { a_plus_modules: firstResult.a_plus_modules } : {}),
    };
    const firstAnalysis = analyzeListing(firstContent, parsed.data.marketplace);

    let finalResult = firstResult;

    // Second pass if we didn't hit 90 — feed the first result's score/breakdown back in
    if (firstAnalysis.score < 90) {
      const secondPassInput = {
        ...optimizeInput,
        title: firstResult.title,
        bullets: firstResult.bullets,
        description: firstResult.description,
        backend_keywords: firstResult.backend_keywords,
        score: firstAnalysis.score,
        validation: firstAnalysis.validation,
        breakdown: firstAnalysis.breakdown.map(b => ({
          criterion: b.criterion,
          score: b.score,
          notes: b.notes,
        })),
      };
      finalResult = await optimizeListing(secondPassInput);
    }

    try {
      await trackUsage(supabase, user.id, gate.profile.subscription_status);
    } catch { /* Non-critical */ }
    try {
      await recordUsage(supabase, user.id, "listing_optimized");
    } catch { /* Non-critical */ }

    return jsonSuccess(finalResult);
  } catch (err) {
    console.error("Optimize error:", err instanceof Error ? err.message : err);
    return jsonError("Optimization failed. Please try again.", 500);
  }
}
