import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { sendFeedbackEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const { success, reset } = await getStandardLimiter().limit(user.id);
    if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request body", 400);
    }

    const { message, page_url } = parsed.data;

    const supabase = await createClient();

    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user.id,
      message,
      page_url,
    });

    if (insertError) {
      return jsonError("Failed to save feedback", 500);
    }

    // Fire-and-forget email — failure is non-blocking
    sendFeedbackEmail(user.email ?? "unknown", message, page_url).catch(
      (err) => console.error("Failed to send feedback email:", err)
    );

    return jsonSuccess({ ok: true }, 201);
  } catch {
    return jsonError("Internal server error", 500);
  }
}
