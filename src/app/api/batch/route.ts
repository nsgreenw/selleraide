import { NextRequest } from "next/server";
import { after } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { parseCSV } from "@/lib/csv/ebay-import";
import { isMarketplaceEnabled } from "@/lib/marketplace/registry";
import { PLANS, canGenerateListing } from "@/lib/subscription/plans";
import { processBatch } from "@/lib/batch/processor";
import type { Marketplace, SubscriptionTier } from "@/types";

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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file");
    const marketplace = formData.get("marketplace") as string | null;

    if (!marketplace || !["amazon", "walmart", "ebay", "shopify"].includes(marketplace)) {
      return jsonError("Invalid marketplace.", 400);
    }
    if (!isMarketplaceEnabled(marketplace as Marketplace)) {
      return jsonError("Marketplace is currently disabled.", 403);
    }
    if (!(file instanceof File)) {
      return jsonError("CSV file is required.", 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return jsonError("File exceeds the 5 MB limit.", 400);
    }

    const supabase = await createClient();

    // Fetch profile for subscription checks
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, listings_used_this_period")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return jsonError("Profile not found.", 404);
    }

    // Trial users cannot use bulk generation
    if (profile.subscription_status === "trialing") {
      return jsonError(
        "Bulk generation is not available during your free trial. Upgrade to a paid plan to unlock batch processing.",
        403
      );
    }

    const tier = profile.subscription_tier as SubscriptionTier;
    const plan = PLANS[tier];

    if (plan.batchRowLimit === 0) {
      return jsonError(
        "Bulk generation requires a Pro or Agency plan. Upgrade your plan to unlock batch processing.",
        403
      );
    }

    // Parse CSV
    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    // Validate headers
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
    if (!normalizedHeaders.includes("product_description")) {
      return jsonError(
        'CSV must include a "product_description" column. Download the template for the correct format.',
        400
      );
    }

    if (rows.length === 0) {
      return jsonError("CSV file contains no data rows.", 400);
    }

    // Map rows to batch row format
    const descIdx = normalizedHeaders.indexOf("product_description");
    const condIdx = normalizedHeaders.indexOf("condition");
    const condNotesIdx = normalizedHeaders.indexOf("condition_notes");

    const batchRows: { product_description: string; condition?: string; condition_notes?: string }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = Object.values(row);
      const desc = (values[descIdx] ?? "").trim();

      if (desc.length < 10) {
        errors.push(`Row ${i + 1}: product_description must be at least 10 characters`);
        continue;
      }

      batchRows.push({
        product_description: desc,
        condition: condIdx >= 0 ? (values[condIdx] ?? "").trim() || undefined : undefined,
        condition_notes: condNotesIdx >= 0 ? (values[condNotesIdx] ?? "").trim() || undefined : undefined,
      });
    }

    if (batchRows.length === 0) {
      return jsonError(
        `No valid rows found. ${errors.length > 0 ? errors[0] : "Each row needs a product_description with at least 10 characters."}`,
        400
      );
    }

    // Tier row limit
    const cappedRows = batchRows.slice(0, plan.batchRowLimit);

    // Usage quota check: ensure enough quota remains
    if (plan.listingsPerMonth !== null) {
      const remaining = plan.listingsPerMonth - profile.listings_used_this_period;
      if (remaining <= 0) {
        return jsonError(
          "You have reached your listing limit for this billing period. Please upgrade your plan.",
          403
        );
      }
      if (cappedRows.length > remaining) {
        return jsonError(
          `You have ${remaining} listing${remaining !== 1 ? "s" : ""} remaining this period, but the batch has ${cappedRows.length} rows. Reduce the CSV or upgrade your plan.`,
          403
        );
      }
    }

    // Check subscription-level generation ability
    if (!canGenerateListing(tier, profile.listings_used_this_period)) {
      return jsonError(
        "You have reached your listing limit for this billing period. Please upgrade your plan.",
        403
      );
    }

    // Insert batch record
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .insert({
        user_id: user.id,
        marketplace,
        status: "pending",
        total_rows: cappedRows.length,
        completed_rows: 0,
        failed_rows: 0,
      })
      .select()
      .single();

    if (batchError || !batch) {
      return jsonError("Failed to create batch.", 500);
    }

    // Fire-and-forget background processing
    after(() =>
      processBatch(batch.id, cappedRows, marketplace as Marketplace, user.id).catch((err) => {
        console.error(`[batch/${batch.id}] Fatal error:`, err);
      })
    );

    return jsonSuccess(
      {
        batch: {
          id: batch.id,
          status: batch.status,
          total_rows: batch.total_rows,
          marketplace: batch.marketplace,
        },
        skipped_rows: batchRows.length - cappedRows.length,
        validation_errors: errors.slice(0, 5),
      },
      201
    );
  } catch (err) {
    console.error("[POST /api/batch] Error:", err);
    return jsonError("Internal server error", 500);
  }
}
