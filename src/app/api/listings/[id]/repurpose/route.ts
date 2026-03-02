import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { repurposeSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { researchProduct } from "@/lib/gemini/research";
import { generateListing } from "@/lib/gemini/generate";
import { analyzeListing } from "@/lib/qa";
import { isMarketplaceEnabled } from "@/lib/marketplace/registry";
import { canGenerateListing } from "@/lib/subscription/plans";
import {
  incrementListingCount,
  recordUsage,
} from "@/lib/subscription/usage";
import { getTrialStatus, incrementTrialRun } from "@/lib/subscription/trial";
import type { Marketplace, ProductContext } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = checkCsrfOrigin(request);
    if (csrfError) return jsonError(csrfError, 403);

    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const { success, reset } = await getStandardLimiter().limit(user.id);
    if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

    const { id: sourceListingId } = await params;

    const body = await request.json();
    const parsed = repurposeSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Please specify a valid target marketplace.", 400);
    }

    const { marketplace: targetMarketplace } = parsed.data;

    if (!isMarketplaceEnabled(targetMarketplace)) {
      return jsonError("Marketplace is currently disabled.", 403);
    }

    const supabase = await createClient();

    // Fetch the source listing and verify ownership
    const { data: sourceListing, error: sourceError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", sourceListingId)
      .eq("user_id", user.id)
      .single();

    if (sourceError || !sourceListing) {
      return jsonError("Source listing not found.", 404);
    }

    if (sourceListing.marketplace === targetMarketplace) {
      return jsonError("Target marketplace must be different from the source.", 400);
    }

    // Check usage limits (trial-aware)
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, listings_used_this_period, trial_expires_at, trial_runs_used")
      .eq("id", user.id)
      .single();

    if (profile) {
      if (profile.subscription_status === "trialing") {
        const trial = getTrialStatus(profile);
        if (!trial.canGenerate) {
          const reason = trial.daysRemaining <= 0
            ? "Your 7-day free trial has ended."
            : `You've used all ${trial.runsUsed} free trial generations.`;
          return jsonError(
            `${reason} Upgrade to keep generating listings.`,
            403
          );
        }
      } else {
        const allowed = canGenerateListing(
          profile.subscription_tier,
          profile.listings_used_this_period
        );
        if (!allowed) {
          return jsonError(
            "You have reached your listing limit for this billing period. Please upgrade your plan.",
            403
          );
        }
      }
    }

    // Build ProductContext from the source listing
    let productContext: ProductContext;

    if (sourceListing.conversation_id) {
      const { data: sourceConversation } = await supabase
        .from("conversations")
        .select("product_context")
        .eq("id", sourceListing.conversation_id)
        .single();

      if (sourceConversation?.product_context) {
        productContext = sourceConversation.product_context as ProductContext;
      } else {
        productContext = buildContextFromContent(sourceListing.content);
      }
    } else {
      productContext = buildContextFromContent(sourceListing.content);
    }

    // Fresh research for the target marketplace
    try {
      const researchData = await researchProduct(productContext, targetMarketplace);
      productContext.research_data = researchData;
    } catch {
      // Research is best-effort — continue without it
    }

    // Generate listing for the target marketplace
    const listingContent = await generateListing(productContext, targetMarketplace);

    // Create conversation record
    const sourceMarketplaceLabel = sourceListing.marketplace.charAt(0).toUpperCase() + sourceListing.marketplace.slice(1);
    const targetMarketplaceLabel = targetMarketplace.charAt(0).toUpperCase() + targetMarketplace.slice(1);
    const title = productContext.product_name
      ? `${productContext.product_name} — ${targetMarketplaceLabel} (Repurposed from ${sourceMarketplaceLabel})`
      : `${targetMarketplaceLabel} Listing (Repurposed from ${sourceMarketplaceLabel})`;

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
        marketplace: targetMarketplace,
        status: "completed",
        product_context: productContext,
      })
      .select()
      .single();

    if (convError || !conversation) {
      return jsonError("Failed to save listing.", 500);
    }

    // Save the listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        marketplace: targetMarketplace,
        version: 1,
        content: listingContent,
        qa_results: null,
        score: null,
      })
      .select()
      .single();

    if (listingError || !listing) {
      return jsonError("Failed to save listing.", 500);
    }

    // Run QA analysis
    const qaAnalysis = analyzeListing(listingContent, targetMarketplace as Marketplace);

    await supabase
      .from("listings")
      .update({
        qa_results: qaAnalysis.validation,
        score: qaAnalysis.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    // Track usage (non-blocking)
    if (profile?.subscription_status === "trialing") {
      try {
        await incrementTrialRun(supabase, user.id);
      } catch {
        // Non-critical
      }
    } else {
      try {
        await incrementListingCount(supabase, user.id);
      } catch {
        // Non-critical
      }
    }
    try {
      await recordUsage(supabase, user.id, "listing_repurposed", conversation.id);
    } catch {
      // Non-critical
    }

    return jsonSuccess({
      conversation,
      listing: {
        ...listing,
        content: listingContent,
        qa_results: qaAnalysis.validation,
        score: qaAnalysis.score,
      },
      qa: {
        validation: qaAnalysis.validation,
        score: qaAnalysis.score,
        grade: qaAnalysis.grade,
        breakdown: qaAnalysis.breakdown,
      },
    }, 201);
  } catch (err) {
    console.error("[/api/listings/[id]/repurpose] Error:", err);
    return jsonError("Internal server error", 500);
  }
}

function buildContextFromContent(content: Record<string, unknown>): ProductContext {
  return {
    product_name: (content.title as string) || undefined,
    category: (content.category_hint as string) || "General",
    key_features: (content.bullets as string[]) || [],
  };
}
