import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { patchListingSchema } from "@/lib/api/contracts";
import { analyzeListing } from "@/lib/qa";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const { id } = await params;
    const supabase = await createClient();

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return jsonError("Listing not found", 404);
    }

    return jsonSuccess(listing);
  } catch {
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const supabase = await createClient();

    // Verify ownership
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return jsonError("Listing not found", 404);
    }

    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return jsonError("Failed to delete listing", 500);
    }

    return jsonSuccess({ deleted: true });
  } catch {
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const supabase = await createClient();

    // Fetch listing and verify ownership
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return jsonError("Listing not found", 404);
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = patchListingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    // Merge updated fields into existing content
    const mergedContent = { ...listing.content, ...parsed.data.content };

    // Re-run QA analysis
    const qa = analyzeListing(mergedContent, listing.marketplace);

    const { data: updated, error: updateError } = await supabase
      .from("listings")
      .update({
        content: mergedContent,
        qa_results: qa.validation,
        score: qa.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return jsonError("Failed to update listing", 500);
    }

    return jsonSuccess(updated);
  } catch {
    return jsonError("Internal server error", 500);
  }
}
