import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;
    const { id } = await params;

    const supabase = await createClient();

    // Fetch batch (RLS ensures ownership)
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (batchError || !batch) {
      return jsonError("Batch not found.", 404);
    }

    // Fetch listings created for this batch
    const { data: listings } = await supabase
      .from("listings")
      .select("id, conversation_id, content, score, created_at")
      .eq("batch_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const listingSummaries = (listings ?? []).map((l) => ({
      id: l.id,
      conversation_id: l.conversation_id,
      title: (l.content as { title?: string })?.title ?? "(untitled)",
      score: l.score,
    }));

    return jsonSuccess({
      batch,
      listings: listingSummaries,
    });
  } catch (err) {
    console.error("[GET /api/batch/[id]] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError(message, 500);
  }
}
