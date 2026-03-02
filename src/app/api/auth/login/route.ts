import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getStrictLimiter, getIP } from "@/lib/api/rate-limit";
import { checkCsrfOrigin } from "@/lib/api/csrf";

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrfOrigin(request);
    if (csrfError) return jsonError(csrfError, 403);

    const { success, reset } = await getStrictLimiter().limit(getIP(request));
    if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid email or password format", 400);
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return jsonError("Invalid email or password", 401);
    }

    return jsonSuccess({ user: data.user });
  } catch (err) {
    console.error("Login error:", err instanceof Error ? err.message : err);
    return jsonError("An unexpected error occurred. Please try again.", 500);
  }
}
