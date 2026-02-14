import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid email format", 400);
    }

    const { email } = parsed.data;
    const supabase = await createClient();

    // Always return success to avoid leaking whether the email exists
    await supabase.auth.resetPasswordForEmail(email);

    return jsonSuccess({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Password reset error:", err instanceof Error ? err.message : err);
    return jsonError("An unexpected error occurred. Please try again.", 500);
  }
}
