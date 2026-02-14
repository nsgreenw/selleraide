import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST() {
  try {
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
