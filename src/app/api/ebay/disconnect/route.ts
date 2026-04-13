import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { revokeEbayToken } from "@/lib/ebay/client";
import { decryptValue, isEncryptedValue } from "@/lib/security/encryption";

export async function POST(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  const admin = getSupabaseAdmin();

  // Fetch tokens so we can revoke them before deleting
  const { data: conn } = await admin
    .from("ebay_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .single();

  if (conn?.refresh_token) {
    const token = isEncryptedValue(conn.refresh_token)
      ? decryptValue(conn.refresh_token)
      : conn.refresh_token;
    // Best-effort revocation — don't block disconnect on failure
    await revokeEbayToken(token).catch(() => {});
  }

  // Delete the eBay connection
  await admin.from("ebay_connections").delete().eq("user_id", user.id);

  // Reset all user's listings eBay fields
  await admin
    .from("listings")
    .update({
      ebay_status: "none",
      ebay_offer_id: null,
      ebay_listing_id: null,
      ebay_sku: null,
      ebay_error: null,
      ebay_published_at: null,
    })
    .eq("user_id", user.id)
    .eq("marketplace", "ebay");

  return jsonSuccess({ disconnected: true });
}
