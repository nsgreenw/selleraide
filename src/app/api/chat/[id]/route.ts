import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";

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

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return jsonError("Conversation not found", 404);
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      return jsonError("Failed to fetch messages", 500);
    }

    return jsonSuccess({
      ...conversation,
      messages: messages ?? [],
    });
  } catch {
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const { id } = await params;
    const supabase = await createClient();

    // Verify ownership
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return jsonError("Conversation not found", 404);
    }

    // Delete messages first (foreign key constraint)
    await supabase.from("messages").delete().eq("conversation_id", id);

    // Delete any associated listings
    await supabase.from("listings").delete().eq("conversation_id", id);

    // Delete the conversation
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return jsonError("Failed to delete conversation", 500);
    }

    return jsonSuccess({ deleted: true });
  } catch {
    return jsonError("Internal server error", 500);
  }
}
