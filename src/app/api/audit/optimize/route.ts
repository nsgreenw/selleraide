import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { optimizeSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { optimizeListing } from "@/lib/gemini/optimize";
import { analyzeListing } from "@/lib/qa";
import { canGenerateListing } from "@/lib/subscription/plans";
import { incrementListingCount, recordUsage } from "@/lib/subscription/usage";
import type { ListingContent } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return jsonError(auth.error, 401);
    const user = auth.user!;

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, listings_used_this_period")
      .eq("id", user.id)
      .single();

    if (!profile || !canGenerateListing(profile.subscription_tier, profile.listings_used_this_period)) {
      return jsonError(
        "You have reached your listing limit for this billing period. Upgrade your plan to continue optimizing.",
        403
      );
    }

    // First optimization pass
    const firstResult = await optimizeListing(parsed.data);

    // Re-score the first result to check if a second pass is needed
    const firstContent: ListingContent = {
      title: firstResult.title,
      bullets: firstResult.bullets,
      description: firstResult.description,
      ...(firstResult.backend_keywords ? { backend_keywords: firstResult.backend_keywords } : {}),
      ...(firstResult.a_plus_modules ? { a_plus_modules: firstResult.a_plus_modules } : {}),
    };
    const firstAnalysis = analyzeListing(firstContent, parsed.data.marketplace);

    let finalResult = firstResult;

    // Second pass if we didn't hit 90 — feed the first result's score/breakdown back in
    if (firstAnalysis.score < 90) {
      const secondPassInput = {
        ...parsed.data,
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

    await incrementListingCount(supabase, user.id);
    await recordUsage(supabase, user.id, "listing_optimized");

    return jsonSuccess(finalResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Optimize error:", msg);
    return jsonError(`Optimization failed: ${msg}`, 500);
  }
}
