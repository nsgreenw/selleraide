import { requireAuth } from "@/lib/api/auth-guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getValidAccessToken } from "@/lib/ebay/tokens";
import { ebayApiFetch } from "@/lib/ebay/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EBAY_POLICIES_URL = "https://www.ebay.com/sh/settings/business-policies";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const result = await getValidAccessToken(user.id);
  if (!result) return jsonError("eBay account not connected", 400);
  const { token } = result;

  // Fetch all 3 policy types in parallel
  const [fulfillmentRes, returnRes, paymentRes] = await Promise.all([
    ebayApiFetch(
      "/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US",
      { accessToken: token }
    ),
    ebayApiFetch("/sell/account/v1/return_policy?marketplace_id=EBAY_US", {
      accessToken: token,
    }),
    ebayApiFetch("/sell/account/v1/payment_policy?marketplace_id=EBAY_US", {
      accessToken: token,
    }),
  ]);

  const [fulfillment, returns, payment] = await Promise.all([
    fulfillmentRes.ok ? fulfillmentRes.json() : null,
    returnRes.ok ? returnRes.json() : null,
    paymentRes.ok ? paymentRes.json() : null,
  ]);

  const fulfillmentPolicies = fulfillment?.fulfillmentPolicies ?? [];
  const returnPolicies = returns?.returnPolicies ?? [];
  const paymentPolicies = payment?.paymentPolicies ?? [];

  const missing: string[] = [];
  if (fulfillmentPolicies.length === 0) missing.push("fulfillment");
  if (returnPolicies.length === 0) missing.push("return");
  if (paymentPolicies.length === 0) missing.push("payment");

  if (missing.length > 0) {
    return jsonSuccess({
      policiesReady: false,
      missing,
      setupUrl: EBAY_POLICIES_URL,
    });
  }

  // Auto-store first policy of each type
  const admin = getSupabaseAdmin();
  await admin
    .from("ebay_connections")
    .update({
      fulfillment_policy_id: fulfillmentPolicies[0].fulfillmentPolicyId,
      return_policy_id: returnPolicies[0].returnPolicyId,
      payment_policy_id: paymentPolicies[0].paymentPolicyId,
      policies_verified: true,
    })
    .eq("user_id", user.id);

  return jsonSuccess({
    policiesReady: true,
    missing: [],
    policies: {
      fulfillment: fulfillmentPolicies.length,
      return: returnPolicies.length,
      payment: paymentPolicies.length,
    },
  });
}
