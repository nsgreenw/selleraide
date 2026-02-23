import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { analyzeListing } from "@/lib/qa";
import type { ListingContent, Marketplace } from "@/types";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const supabase = await createClient();

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (listingsError) {
      return jsonError("Failed to fetch listings", 500);
    }

    return jsonSuccess({ listings: listings ?? [] });
  } catch {
    return jsonError("Internal server error", 500);
  }
}

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

    const { marketplace, content } = body as {
      marketplace?: string;
      content?: ListingContent;
    };

    if (!marketplace || !content) {
      return jsonError("marketplace and content are required", 400);
    }

    const validMarketplaces = ["amazon", "walmart", "ebay", "shopify"];
    if (!validMarketplaces.includes(marketplace)) {
      return jsonError("Invalid marketplace", 400);
    }

    if (!content.title?.trim() || !content.description?.trim()) {
      return jsonError("content must include title and description", 400);
    }

    // Run QA so the saved listing has a score from day one
    const qaAnalysis = analyzeListing(content, marketplace as Marketplace);

    const supabase = await createClient();

    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        user_id: user.id,
        conversation_id: null,
        marketplace,
        version: 1,
        content,
        qa_results: qaAnalysis.validation,
        score: qaAnalysis.score,
      })
      .select()
      .single();

    if (error || !listing) {
      console.error("Save listing error:", error?.message);
      return jsonError("Failed to save listing", 500);
    }

    return jsonSuccess({ listing });
  } catch (err) {
    console.error("Save listing error:", err instanceof Error ? err.message : err);
    return jsonError("Internal server error", 500);
  }
}
