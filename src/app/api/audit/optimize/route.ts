import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { optimizeSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { optimizeListing } from "@/lib/gemini/optimize";
import { canGenerateListing } from "@/lib/subscription/plans";
import { incrementListingCount, recordUsage } from "@/lib/subscription/usage";

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

    const result = await optimizeListing(parsed.data);

    await incrementListingCount(supabase, user.id);
    await recordUsage(supabase, user.id, "listing_optimized");

    return jsonSuccess(result);
  } catch (err) {
    console.error("Optimize error:", err instanceof Error ? err.message : err);
    return jsonError("Optimization failed. Please try again.", 500);
  }
}
