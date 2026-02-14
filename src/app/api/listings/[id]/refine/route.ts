import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { refineListingSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getGeminiGenerateModel } from "@/lib/gemini/client";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { analyzeListing } from "@/lib/qa";
import { recordUsage } from "@/lib/subscription/usage";
import type { Listing, ListingContent, Marketplace } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Auth check
    const auth = await requireAuth();
    if (auth.error || !auth.user) {
      return jsonError(auth.error ?? "Unauthorized", 401);
    }
    const user = auth.user;

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const parsed = refineListingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues.map((i) => i.message).join("; "),
        400
      );
    }
    const { instruction } = parsed.data;

    // 3. Resolve listing ID from route params
    const { id: listingId } = await params;

    // 4. Fetch the listing and verify ownership
    const supabase = await createClient();

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return jsonError("Listing not found", 404);
    }

    const typedListing = listing as Listing;

    if (typedListing.user_id !== user.id) {
      return jsonError("Listing not found", 404);
    }

    // 5. Fetch the associated conversation for marketplace and product_context
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("marketplace, product_context")
      .eq("id", typedListing.conversation_id)
      .eq("user_id", user.id)
      .single();

    if (conversationError || !conversation) {
      return jsonError("Associated conversation not found", 404);
    }

    const marketplace = conversation.marketplace as Marketplace;
    const profile = getMarketplaceProfile(marketplace);

    // 6. Call Gemini to refine the listing
    const currentContent = typedListing.content as ListingContent;

    const prompt = `You are refining an existing ${marketplace} product listing based on the seller's feedback.

CURRENT LISTING:
${JSON.stringify(currentContent, null, 2)}

SELLER'S REQUEST:
${instruction}

MARKETPLACE RULES:
${profile.promptModifier}

Modify the listing according to the seller's request. Keep all other fields unchanged unless the change logically requires updating them. Ensure all fields stay within the marketplace's character and formatting limits. Return the COMPLETE updated listing as a JSON object with the same structure. Do NOT add commentary — respond with ONLY the JSON object.`;

    const result = await getGeminiGenerateModel().generateContent(prompt);
    const responseText = result.response.text();

    // 7. Parse the Gemini response into ListingContent
    let listingData: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in refinement response");
      }
      listingData = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse Gemini refinement response:", responseText);
      return jsonError("Failed to parse refined listing from AI response", 500);
    }

    // Map the flat JSON response into ListingContent shape
    const refinedContent: ListingContent = {
      title: String(listingData.title ?? currentContent.title ?? ""),
      description: String(
        listingData.description ?? currentContent.description ?? ""
      ),
    };

    // Collect bullet points into the bullets array
    const bullets: string[] = [];
    if (Array.isArray(listingData.bullets)) {
      // Handle array-format bullets
      for (const b of listingData.bullets) {
        bullets.push(String(b));
      }
    } else {
      // Handle bullet_1, bullet_2, ... format
      for (const key of Object.keys(listingData)) {
        if (key.startsWith("bullet_") && listingData[key]) {
          bullets.push(String(listingData[key]));
        }
      }
    }
    if (bullets.length > 0) {
      refinedContent.bullets = bullets;
    } else if (currentContent.bullets) {
      refinedContent.bullets = currentContent.bullets;
    }

    // Map optional fields
    if (listingData.backend_keywords) {
      refinedContent.backend_keywords = String(listingData.backend_keywords);
    } else if (currentContent.backend_keywords) {
      refinedContent.backend_keywords = currentContent.backend_keywords;
    }

    if (listingData.seo_title) {
      refinedContent.seo_title = String(listingData.seo_title);
    } else if (currentContent.seo_title) {
      refinedContent.seo_title = currentContent.seo_title;
    }

    if (listingData.meta_description) {
      refinedContent.meta_description = String(listingData.meta_description);
    } else if (currentContent.meta_description) {
      refinedContent.meta_description = currentContent.meta_description;
    }

    if (listingData.tags && Array.isArray(listingData.tags)) {
      refinedContent.tags = listingData.tags.map(String);
    } else if (currentContent.tags) {
      refinedContent.tags = currentContent.tags;
    }

    if (listingData.subtitle) {
      refinedContent.subtitle = String(listingData.subtitle);
    } else if (currentContent.subtitle) {
      refinedContent.subtitle = currentContent.subtitle;
    }

    if (listingData.shelf_description) {
      refinedContent.shelf_description = String(listingData.shelf_description);
    } else if (currentContent.shelf_description) {
      refinedContent.shelf_description = currentContent.shelf_description;
    }

    if (
      listingData.item_specifics &&
      typeof listingData.item_specifics === "object"
    ) {
      refinedContent.item_specifics = listingData.item_specifics as Record<
        string,
        string
      >;
    } else if (currentContent.item_specifics) {
      refinedContent.item_specifics = currentContent.item_specifics;
    }

    if (
      listingData.attributes &&
      typeof listingData.attributes === "object"
    ) {
      refinedContent.attributes = listingData.attributes as Record<
        string,
        string
      >;
    } else if (currentContent.attributes) {
      refinedContent.attributes = currentContent.attributes;
    }

    // Preserve photo recommendations from original listing
    if (currentContent.photo_recommendations) {
      refinedContent.photo_recommendations =
        currentContent.photo_recommendations;
    }

    // Preserve a_plus_modules from original listing
    if (currentContent.a_plus_modules) {
      refinedContent.a_plus_modules = currentContent.a_plus_modules;
    }

    // Preserve collections from original listing
    if (currentContent.collections) {
      refinedContent.collections = currentContent.collections;
    }

    // 8. Run QA analysis on the refined content
    const qaAnalysis = analyzeListing(refinedContent, marketplace);

    // 9. Save as a new version (increment version number)
    const newVersion = typedListing.version + 1;

    const { data: newListing, error: insertError } = await supabase
      .from("listings")
      .insert({
        conversation_id: typedListing.conversation_id,
        user_id: user.id,
        marketplace,
        version: newVersion,
        content: refinedContent,
        qa_results: qaAnalysis.validation,
        score: qaAnalysis.score,
      })
      .select("*")
      .single();

    if (insertError || !newListing) {
      console.error("Failed to save refined listing:", insertError);
      return jsonError("Failed to save refined listing", 500);
    }

    // 10. Record usage event for auditing
    try {
      await recordUsage(supabase, user.id, "listing_refined", typedListing.conversation_id, {
        listing_id: newListing.id,
        version: newVersion,
        marketplace,
      });
    } catch {
      // Non-fatal: don't block the response if usage tracking fails
    }

    // 11. Return the new listing + QA results
    return jsonSuccess({
      listing: newListing,
      qa: qaAnalysis,
    });
  } catch (error) {
    console.error("Refine listing error:", error instanceof Error ? error.message : error);
    return jsonError("An unexpected error occurred. Please try again.", 500);
  }
}
