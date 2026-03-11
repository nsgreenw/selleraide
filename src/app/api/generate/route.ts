import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { generateListingSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { requireUsageGate, trackUsage } from "@/lib/api/usage-gate";
import { extractProductContextFromDescription } from "@/lib/gemini/extract";
import { researchProduct } from "@/lib/gemini/research";
import { generateListing } from "@/lib/gemini/generate";
import { analyzeListing } from "@/lib/qa";
import { sanitizeListingContent } from "@/lib/utils/sanitize";
import { isMarketplaceEnabled } from "@/lib/marketplace/registry";
import { recordUsage } from "@/lib/subscription/usage";
import type { Marketplace } from "@/types";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = generateListingSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Please provide a product description (at least 10 characters) and marketplace.", 400);
    }

    const { marketplace, product_description, condition, condition_notes } = parsed.data;
    if (!isMarketplaceEnabled(marketplace)) {
      return jsonError("Marketplace is currently disabled.", 403);
    }

    const supabase = await createClient();

    // Check Stripe-backed subscription and plan limits
    const gate = await requireUsageGate(supabase, user.id);
    if (!gate.allowed) return jsonError(gate.error, 403);
    const profile = gate.profile;

    // Step 1: Extract structured product context from the description
    const productContext = await extractProductContextFromDescription(
      product_description,
      marketplace
    );

    // Overlay condition from user selection (eBay)
    if (condition) productContext.condition = condition;
    if (condition_notes) productContext.condition_notes = condition_notes;

    // Step 2: Research product category, keywords, competitors
    let researchData;
    try {
      researchData = await researchProduct(productContext, marketplace);
      productContext.research_data = researchData;
    } catch {
      // Research is best-effort — continue without it
    }

    // Step 3: Generate the listing and sanitize before storage
    const listingContent = sanitizeListingContent(
      await generateListing(productContext, marketplace)
    );

    // Step 4: Create a conversation record to store this listing
    const title =
      productContext.product_name
        ? `${productContext.product_name} — ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}`
        : `New ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)} Listing`;

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
        marketplace,
        status: "completed",
        product_context: productContext,
      })
      .select()
      .single();

    if (convError || !conversation) {
      return jsonError("Failed to save listing", 500);
    }

    // Step 5: Save the listing and run QA
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        marketplace,
        version: 1,
        content: listingContent,
        qa_results: null,
        score: null,
      })
      .select()
      .single();

    if (listingError || !listing) {
      return jsonError("Failed to save listing", 500);
    }

    const qaAnalysis = analyzeListing(listingContent, marketplace as Marketplace);

    await supabase
      .from("listings")
      .update({
        qa_results: qaAnalysis.validation,
        score: qaAnalysis.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    // Step 6: Track usage (non-blocking — don't fail the request if tracking fails)
    try {
      await trackUsage(supabase, user.id, profile.subscription_status);
    } catch { /* Non-critical */ }
    try {
      await recordUsage(supabase, user.id, "listing_generated", conversation.id);
    } catch { /* Non-critical */ }

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
    console.error("[/api/generate] Error:", err);
    return jsonError("Internal server error", 500);
  }
}
