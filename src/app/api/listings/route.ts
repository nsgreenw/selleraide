import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";

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
