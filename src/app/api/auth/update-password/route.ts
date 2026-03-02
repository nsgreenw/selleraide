import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStrictLimiter } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrfOrigin(request);
    if (csrfError) return jsonError(csrfError, 403);

    const auth = await requireAuth();
    if (auth.error) return jsonError(auth.error, 401);
    const user = auth.user!;

    const { success, reset } = await getStrictLimiter().limit(user.id);
    if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = updatePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid password", 400);
    }

    const supabase = await createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (updateError) {
      console.error("Password update error:", updateError.message);
      return jsonError("Failed to update password. Please try again.", 500);
    }

    // Invalidate all other sessions so stolen tokens on other devices stop working
    await supabase.auth.signOut({ scope: "others" });

    return jsonSuccess({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Update password error:", err instanceof Error ? err.message : err);
    return jsonError("Internal server error", 500);
  }
}
