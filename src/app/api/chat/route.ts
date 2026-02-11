import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { createConversationSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildSystemPrompt } from "@/lib/gemini/prompts/system";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request body", 400);
    }

    const { marketplace, title } = parsed.data;
    const supabase = await createClient();

    // Create the conversation
    const conversationTitle =
      title ?? `New ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)} Listing`;

    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: conversationTitle,
        marketplace,
        status: "gathering",
        product_context: {},
      })
      .select()
      .single();

    if (insertError || !conversation) {
      return jsonError("Failed to create conversation", 500);
    }

    // Insert the initial system message
    const systemPrompt = buildSystemPrompt(marketplace);

    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "system",
      content: systemPrompt,
      metadata: { phase: "gathering" },
    });

    if (msgError) {
      return jsonError("Failed to create system message", 500);
    }

    return jsonSuccess(conversation, 201);
  } catch {
    return jsonError("Internal server error", 500);
  }
}
