import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const admin = getSupabaseAdmin();
  const { data: conn } = await admin
    .from("ebay_connections")
    .select(
      "ebay_user_id, policies_verified, merchant_location_key, fulfillment_policy_id, return_policy_id, payment_policy_id"
    )
    .eq("user_id", user.id)
    .single();

  if (!conn) {
    return jsonSuccess({
      connected: false,
      ebayUserId: null,
      policiesVerified: false,
      locationConfigured: false,
      ready: false,
    });
  }

  const policiesVerified = conn.policies_verified ?? false;
  const locationConfigured = !!conn.merchant_location_key;
  const ready = policiesVerified && locationConfigured;

  return jsonSuccess({
    connected: true,
    ebayUserId: conn.ebay_user_id,
    policiesVerified,
    locationConfigured,
    ready,
  });
}
