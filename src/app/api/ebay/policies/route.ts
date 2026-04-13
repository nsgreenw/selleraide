import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
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
      policies: { fulfillment: [], return: [], payment: [] },
    });
  }

  // Map to simplified shapes for the UI
  const mapFulfillment = fulfillmentPolicies.map(
    (p: { fulfillmentPolicyId: string; name: string }) => ({
      id: p.fulfillmentPolicyId,
      name: p.name,
    })
  );
  const mapReturn = returnPolicies.map(
    (p: { returnPolicyId: string; name: string }) => ({
      id: p.returnPolicyId,
      name: p.name,
    })
  );
  const mapPayment = paymentPolicies.map(
    (p: { paymentPolicyId: string; name: string }) => ({
      id: p.paymentPolicyId,
      name: p.name,
    })
  );

  // Auto-store first policy of each type if none set yet
  const admin = getSupabaseAdmin();
  const { data: conn } = await admin
    .from("ebay_connections")
    .select("fulfillment_policy_id, return_policy_id, payment_policy_id")
    .eq("user_id", user.id)
    .single();

  const updates: Record<string, unknown> = { policies_verified: true };
  if (!conn?.fulfillment_policy_id) {
    updates.fulfillment_policy_id = mapFulfillment[0].id;
  }
  if (!conn?.return_policy_id) {
    updates.return_policy_id = mapReturn[0].id;
  }
  if (!conn?.payment_policy_id) {
    updates.payment_policy_id = mapPayment[0].id;
  }
  await admin.from("ebay_connections").update(updates).eq("user_id", user.id);

  return jsonSuccess({
    policiesReady: true,
    missing: [],
    policies: {
      fulfillment: mapFulfillment,
      return: mapReturn,
      payment: mapPayment,
    },
    selected: {
      fulfillmentPolicyId: conn?.fulfillment_policy_id ?? mapFulfillment[0].id,
      returnPolicyId: conn?.return_policy_id ?? mapReturn[0].id,
      paymentPolicyId: conn?.payment_policy_id ?? mapPayment[0].id,
    },
  });
}

/** Save user's policy selections. */
export async function POST(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const body = await req.json();
  const { fulfillmentPolicyId, returnPolicyId, paymentPolicyId } = body;

  if (!fulfillmentPolicyId || !returnPolicyId || !paymentPolicyId) {
    return jsonError("All three policy IDs are required");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("ebay_connections")
    .update({
      fulfillment_policy_id: fulfillmentPolicyId,
      return_policy_id: returnPolicyId,
      payment_policy_id: paymentPolicyId,
    })
    .eq("user_id", user.id);

  if (error) return jsonError("Failed to save policy selections");

  return jsonSuccess({ saved: true });
}
