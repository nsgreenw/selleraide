import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { ensureProfileForUser } from "@/lib/profile-bootstrap";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error || !auth.user) {
    return jsonError(auth.error ?? "Unauthorized", 401);
  }

  try {
    const profile = await ensureProfileForUser(auth.user);
    return jsonSuccess({ profile });
  } catch (error) {
    console.error("Profile bootstrap failed:", error);
    return jsonError("Failed to load your account profile. Please try again.", 500);
  }
}
