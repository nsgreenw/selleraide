import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid signup data", 400);
    }

    const { email, password, full_name } = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name ?? "",
        },
      },
    });

    if (error) {
      const lower = error.message?.toLowerCase() ?? "";
      const msg = lower.includes("already")
        ? "An account with this email already exists."
        : error.message || "Unable to create account. Please try again.";
      return jsonError(msg, 400);
    }

    return jsonSuccess({ success: true }, 200);
  } catch (err) {
    console.error("Signup error:", err instanceof Error ? err.message : err);
    return jsonError("An unexpected error occurred. Please try again.", 500);
  }
}
