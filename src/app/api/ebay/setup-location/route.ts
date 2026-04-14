import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { ebaySetupLocationSchema } from "@/lib/api/contracts";
import { getValidAccessToken } from "@/lib/ebay/tokens";
import { ebayApiFetch } from "@/lib/ebay/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  const result = await getValidAccessToken(user.id);
  if (!result) return jsonError("eBay account not connected", 400);
  const { token } = result;

  const body = await req.json();
  const parsed = ebaySetupLocationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message);
  }

  const { stateOrProvince, country } = parsed.data;
  const locationKey = `selleraide-default-${user.id.slice(0, 8)}`;

  const locationPayload = {
    location: {
      address: {
        stateOrProvince,
        country,
      },
    },
    merchantLocationStatus: "ENABLED",
    locationTypes: ["WAREHOUSE"],
    name: "SellerAide Default Warehouse",
  };

  // eBay requires PUT for createInventoryLocation
  const res = await ebayApiFetch(
    `/sell/inventory/v1/inventory_location/${locationKey}`,
    { method: "PUT", body: locationPayload, accessToken: token }
  );

  // 204 = created, 409 = already exists (both are fine)
  if (!res.ok && res.status !== 204 && res.status !== 409) {
    const text = await res.text();
    console.error("[eBay Location] Create failed:", res.status, text);
    return jsonError(`Failed to create inventory location: ${res.status} ${text.slice(0, 200)}`);
  }

  // Store location key in connection
  const admin = getSupabaseAdmin();
  await admin
    .from("ebay_connections")
    .update({ merchant_location_key: locationKey })
    .eq("user_id", user.id);

  return jsonSuccess({ locationKey });
}
