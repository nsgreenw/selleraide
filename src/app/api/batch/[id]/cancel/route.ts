import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST(
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

    // Verify batch exists and belongs to user
    const { data: batch, error: fetchError } = await supabase
      .from("batches")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !batch) {
      return jsonError("Batch not found.", 404);
    }

    if (batch.status !== "pending" && batch.status !== "processing") {
      return jsonError(`Cannot cancel a batch with status "${batch.status}".`, 400);
    }

    const { error: updateError } = await supabase
      .from("batches")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return jsonError("Failed to cancel batch.", 500);
    }

    return jsonSuccess({ cancelled: true });
  } catch (err) {
    console.error("[POST /api/batch/[id]/cancel] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError(message, 500);
  }
}
