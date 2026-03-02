import type { Marketplace } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { extractProductContextFromDescription } from "@/lib/gemini/extract";
import { researchProduct } from "@/lib/gemini/research";
import { generateListing } from "@/lib/gemini/generate";
import { analyzeListing } from "@/lib/qa";
import { sanitizeListingContent } from "@/lib/utils/sanitize";
import { canGenerateListing } from "@/lib/subscription/plans";
import { getTrialStatus, incrementTrialRun } from "@/lib/subscription/trial";
import {
  incrementListingCount,
  recordUsage,
} from "@/lib/subscription/usage";

interface BatchRow {
  product_description: string;
  condition?: string;
  condition_notes?: string;
}

/**
 * Process a batch of product descriptions into optimized listings.
 * Runs sequentially with a delay between rows to respect Gemini rate limits.
 * Uses getSupabaseAdmin() since this runs in `after()` outside the request cookie context.
 */
export async function processBatch(
  batchId: string,
  rows: BatchRow[],
  marketplace: Marketplace,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Mark batch as processing
  await supabase
    .from("batches")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", batchId);

  let completedRows = 0;
  let failedRows = 0;

  for (let i = 0; i < rows.length; i++) {
    // Check if batch was cancelled
    const { data: batch } = await supabase
      .from("batches")
      .select("status")
      .eq("id", batchId)
      .single();

    if (batch?.status === "cancelled") {
      break;
    }

    const row = rows[i];

    try {
      // Step 0: Re-check usage limits before each row (prevents over-generation)
      const { data: rowProfile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, listings_used_this_period, trial_expires_at, trial_runs_used")
        .eq("id", userId)
        .single();

      if (rowProfile) {
        if (rowProfile.subscription_status === "trialing") {
          const trial = getTrialStatus(rowProfile);
          if (!trial.canGenerate) {
            console.warn(`[batch/${batchId}] Row ${i + 1}: trial limit reached, stopping`);
            break;
          }
        } else {
          if (!canGenerateListing(rowProfile.subscription_tier, rowProfile.listings_used_this_period)) {
            console.warn(`[batch/${batchId}] Row ${i + 1}: subscription limit reached, stopping`);
            break;
          }
        }
      }

      // Step 1: Extract product context
      const productContext = await extractProductContextFromDescription(
        row.product_description,
        marketplace
      );

      // Overlay condition fields if present
      if (row.condition) productContext.condition = row.condition;
      if (row.condition_notes) productContext.condition_notes = row.condition_notes;

      // Step 2: Research (best-effort)
      try {
        const researchData = await researchProduct(productContext, marketplace);
        productContext.research_data = researchData;
      } catch {
        // Research is best-effort — continue without it
      }

      // Step 3: Generate listing and sanitize before storage
      const listingContent = sanitizeListingContent(
        await generateListing(productContext, marketplace)
      );

      // Step 4: Create conversation record
      const title = productContext.product_name
        ? `${productContext.product_name} — ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}`
        : `New ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)} Listing`;

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          title,
          marketplace,
          status: "completed",
          product_context: productContext,
        })
        .select("id")
        .single();

      if (convError || !conversation) {
        throw new Error(`Failed to save conversation: ${convError?.message ?? "unknown"}`);
      }

      // Step 5: Save listing with batch_id
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          conversation_id: conversation.id,
          user_id: userId,
          marketplace,
          version: 1,
          content: listingContent,
          qa_results: null,
          score: null,
          batch_id: batchId,
        })
        .select("id")
        .single();

      if (listingError || !listing) {
        throw new Error(`Failed to save listing: ${listingError?.message ?? "unknown"}`);
      }

      // Step 6: Run QA and update listing
      const qaAnalysis = analyzeListing(listingContent, marketplace);

      await supabase
        .from("listings")
        .update({
          qa_results: qaAnalysis.validation,
          score: qaAnalysis.score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id);

      // Step 7: Track usage (non-critical, trial-aware)
      try {
        if (rowProfile?.subscription_status === "trialing") {
          await incrementTrialRun(supabase, userId);
        } else {
          await incrementListingCount(supabase, userId);
        }
      } catch {
        // Non-critical
      }
      try {
        await recordUsage(supabase, userId, "listing_generated", conversation.id, {
          source: "batch",
          batch_id: batchId,
        });
      } catch {
        // Non-critical
      }

      completedRows++;
    } catch (err) {
      console.error(`[batch/${batchId}] Row ${i + 1} failed:`, err);
      failedRows++;
    }

    // Update batch progress
    await supabase
      .from("batches")
      .update({
        completed_rows: completedRows,
        failed_rows: failedRows,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    // Rate limit buffer between rows (skip after last row)
    if (i < rows.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Final status
  const finalStatus = completedRows === 0 ? "failed" : "completed";
  await supabase
    .from("batches")
    .update({
      status: finalStatus,
      completed_rows: completedRows,
      failed_rows: failedRows,
      error: completedRows === 0 ? "All rows failed to generate" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);
}
