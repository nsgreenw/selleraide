import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { checkCsrfOrigin } from "@/lib/api/csrf";

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrfOrigin(request);
    if (csrfError) return jsonError(csrfError, 403);
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error.message);
      return jsonError("Failed to sign out. Please try again.", 500);
    }

    return jsonSuccess({ message: "Signed out" });
  } catch (err) {
    console.error("Logout route error:", err instanceof Error ? err.message : err);
    return jsonError("Internal server error", 500);
  }
}
