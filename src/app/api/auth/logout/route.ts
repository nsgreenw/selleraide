import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    return jsonSuccess({ message: "Signed out" });
  } catch {
    return jsonError("Internal server error", 500);
  }
}
