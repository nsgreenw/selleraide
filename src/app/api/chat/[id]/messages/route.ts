import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { sendMessageSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { requireUsageGate, trackUsage } from "@/lib/api/usage-gate";
import { handleChatMessage } from "@/lib/gemini/chat";
import { analyzeListing } from "@/lib/qa";
import { sanitizeListingContent } from "@/lib/utils/sanitize";
import { recordUsage } from "@/lib/subscription/usage";
import type { Conversation, ListingContent, Marketplace } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid message content", 400);
    }

    const { id } = await params;
    const { content } = parsed.data;
    const supabase = await createClient();

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return jsonError("Conversation not found", 404);
    }

    const conv = conversation as Conversation;

    // Usage gate — check trial + subscription limits before any AI call
    // Chat can trigger AI at any state (gathering extracts context, researching/generating produce listings)
    const gate = await requireUsageGate(supabase, user.id);
    if (!gate.allowed) return jsonError(gate.error, 403);
    const profile = gate.profile;

    // Derive A+ module count from subscription tier
    // Starter gets 4-module stack; Pro/Agency get full 7-module stack
    const aplusModuleCount = profile.subscription_tier === "starter" ? 4 : 7;

    // Insert user message into DB
    const { data: userMsg, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        role: "user",
        content,
        metadata: null,
      })
      .select()
      .single();

    if (userMsgError || !userMsg) {
      return jsonError("Failed to save message", 500);
    }

    // Call the chat engine (this saves assistant message + updates status internally)
    const chatResult = await handleChatMessage(id, content, supabase, { aplusModuleCount });

    // Use the assistant message returned directly from handleChatMessage
    // (avoids race condition with re-fetching by created_at)
    const assistantMsg = chatResult.assistantMessage ?? null;

    // Fetch updated conversation
    const { data: updatedConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    // Build the response in the shape the client expects
    const response: Record<string, unknown> = {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversation: updatedConv,
    };

    // If a listing was generated, sanitize and save it, then run QA
    if (chatResult.listing) {
      const listingContent = sanitizeListingContent(chatResult.listing);

      // Determine the next version number
      const { data: existingListings } = await supabase
        .from("listings")
        .select("version")
        .eq("conversation_id", id)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion =
        existingListings && existingListings.length > 0
          ? existingListings[0].version + 1
          : 1;

      // Insert the listing
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          conversation_id: id,
          user_id: user.id,
          marketplace: conv.marketplace,
          version: nextVersion,
          content: listingContent,
          qa_results: null,
          score: null,
        })
        .select()
        .single();

      if (listingError || !listing) {
        return jsonError("Failed to save listing", 500);
      }

      // Run QA analysis
      const qaAnalysis = analyzeListing(
        listingContent,
        conv.marketplace as Marketplace
      );

      // Update listing with QA results
      await supabase
        .from("listings")
        .update({
          qa_results: qaAnalysis.validation,
          score: qaAnalysis.score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id);

      // Increment usage counters
      try {
        await trackUsage(supabase, user.id, profile.subscription_status);
      } catch { /* Non-critical */ }
      try {
        await recordUsage(supabase, user.id, "listing_generated", id);
      } catch { /* Non-critical */ }

      response.listing = {
        ...listing,
        qa_results: qaAnalysis.validation,
        score: qaAnalysis.score,
      };

      response.qa = {
        validation: qaAnalysis.validation,
        score: qaAnalysis.score,
        grade: qaAnalysis.grade,
        breakdown: qaAnalysis.breakdown,
      };
    }

    return jsonSuccess(response);
  } catch (err) {
    console.error("Chat message error:", err instanceof Error ? err.message : err);
    return jsonError("An unexpected error occurred. Please try again.", 500);
  }
}
