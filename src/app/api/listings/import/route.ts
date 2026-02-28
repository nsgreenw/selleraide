import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { analyzeListing } from "@/lib/qa";
import { parseCSV, mapEbayRow } from "@/lib/csv/ebay-import";
import { getGrade } from "@/types";
import type { SubscriptionTier } from "@/types";

// ---------------------------------------------------------------------------
// Tier-based row limits
// ---------------------------------------------------------------------------

const IMPORT_ROW_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 0,        // blocked entirely
  starter: 100,
  pro: 500,
  agency: null,   // unlimited
};

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

interface ImportRowResult {
  row: number;    // 1-based (header = row 1, data starts at row 2)
  title: string;
  score: number | null;
  grade: string | null;
  status: "imported" | "failed";
  error?: string;
}

// ---------------------------------------------------------------------------
// POST /api/listings/import
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const auth = await requireAuth();
    if (auth.error || !auth.user) {
      return jsonError(auth.error ?? "Unauthorized", 401);
    }
    const user = auth.user;

    // 2. Fetch subscription tier
    const supabase = await createClient();
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      return jsonError("Failed to fetch subscription details", 500);
    }

    const tier = profileData.subscription_tier as SubscriptionTier;
    const rowLimit = IMPORT_ROW_LIMITS[tier];

    if (rowLimit === 0) {
      return jsonError(
        "Bulk CSV import requires a paid plan. Upgrade to Starter or higher.",
        403
      );
    }

    // 3. Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonError("Invalid multipart form data", 400);
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("No file provided. Send a .csv file in the 'file' field.", 400);
    }

    // 4. Validate file
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return jsonError("Only .csv files are accepted.", 400);
    }
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      return jsonError("File exceeds the 5 MB limit.", 400);
    }

    // 5. Decode — UTF-8 with Latin-1 fallback
    const buffer = await file.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder("latin1").decode(buffer);
    }

    // 6. Parse CSV
    const { rows } = parseCSV(text);
    if (rows.length === 0) {
      return jsonError("The CSV file contains no data rows.", 400);
    }

    // 7. Deduplicate by normalized title (if requested)
    const dedupe = formData.get("dedupe") === "true";
    let activeRows = rows;
    let duplicateCount = 0;

    if (dedupe) {
      const seen = new Set<string>();
      const deduped: typeof rows = [];
      for (const row of rows) {
        const { content } = mapEbayRow(row);
        const key = content.title.toLowerCase().trim();
        if (!key) {
          deduped.push(row); // empty titles pass through (will fail mapping)
        } else if (!seen.has(key)) {
          seen.add(key);
          deduped.push(row);
        } else {
          duplicateCount++;
        }
      }
      activeRows = deduped;
    }

    // 8. Apply row cap
    const totalRows = activeRows.length;
    const cappedRows = rowLimit === null ? activeRows : activeRows.slice(0, rowLimit);
    const skippedCount = totalRows - cappedRows.length;

    // 8. Process rows sequentially (preserves per-row error attribution)
    const results: ImportRowResult[] = [];
    let importedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < cappedRows.length; i++) {
      const rowNumber = i + 2; // header is row 1, data starts at row 2
      const row = cappedRows[i];

      const { content, condition, error: mapError } = mapEbayRow(row);

      if (mapError) {
        results.push({
          row: rowNumber,
          title: content.title || "(no title)",
          score: null,
          grade: null,
          status: "failed",
          error: mapError,
        });
        failedCount++;
        continue;
      }

      // Prepend resolved condition to condition_notes if present
      if (condition) {
        const conditionPrefix = `Condition: ${condition}`;
        content.condition_notes = content.condition_notes
          ? [conditionPrefix, ...content.condition_notes]
          : [conditionPrefix];
      }

      // QA scoring (deterministic — no AI, no credits)
      const qa = analyzeListing(content, "ebay");
      const score = qa.score;
      const grade = getGrade(score);

      // Insert to DB
      const { error: insertError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          conversation_id: null,
          marketplace: "ebay",
          version: 1,
          content,
          qa_results: qa.validation,
          score,
        });

      if (insertError) {
        results.push({
          row: rowNumber,
          title: content.title,
          score: null,
          grade: null,
          status: "failed",
          error: "Database insert failed",
        });
        failedCount++;
        continue;
      }

      results.push({
        row: rowNumber,
        title: content.title,
        score,
        grade,
        status: "imported",
      });
      importedCount++;
    }

    return jsonSuccess({
      imported: importedCount,
      failed: failedCount,
      skipped: skippedCount,
      duplicates: duplicateCount,
      results,
    });
  } catch (err) {
    console.error("CSV import error:", err instanceof Error ? err.message : err);
    return jsonError("Internal server error", 500);
  }
}
