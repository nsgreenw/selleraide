import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkCsrfOrigin } from "@/lib/api/csrf";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { ebayPublishSchema } from "@/lib/api/contracts";
import { getValidAccessToken } from "@/lib/ebay/tokens";
import { ebayApiFetch } from "@/lib/ebay/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildInventoryItem, buildOffer, generateSku } from "@/lib/ebay/mapping";
import type { Listing, EbayConnection } from "@/types";

/**
 * Helper: make an eBay API call with a single 401 retry (token refresh).
 */
async function ebayFetchWithRetry(
  path: string,
  opts: { method?: string; body?: unknown; accessToken: string },
  userId: string
): Promise<{ res: Response; token: string }> {
  let res = await ebayApiFetch(path, opts);

  if (res.status === 401) {
    // Token expired mid-flow — refresh and retry once
    const refreshed = await getValidAccessToken(userId);
    if (!refreshed) throw new Error("eBay connection lost during publish");
    opts.accessToken = refreshed.token;
    res = await ebayApiFetch(path, opts);
    return { res, token: refreshed.token };
  }

  return { res, token: opts.accessToken };
}

export async function POST(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  // Parse & validate input
  const body = await req.json();
  const parsed = ebayPublishSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message);
  }
  const { listingId, price, quantity, categoryId, condition } = parsed.data;

  const admin = getSupabaseAdmin();

  // Gate: require paid subscription (starter, pro, or agency)
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) return jsonError("Profile not found", 404);

  const paidTiers = ["starter", "pro", "agency"];
  const isActive =
    profile.subscription_status === "active" ||
    profile.subscription_status === "past_due";
  if (!paidTiers.includes(profile.subscription_tier) || !isActive) {
    return jsonError(
      "eBay publishing requires a paid subscription (Starter, Pro, or Agency)",
      403
    );
  }

  // Get eBay connection with valid token
  const tokenResult = await getValidAccessToken(user.id);
  if (!tokenResult) return jsonError("eBay account not connected", 400);
  let { token } = tokenResult;
  const { connection } = tokenResult;

  // Gate: require setup complete
  if (!connection.policies_verified) {
    return jsonError(
      "Business policies not verified. Check policies in Settings first.",
      400
    );
  }
  if (!connection.merchant_location_key) {
    return jsonError(
      "Inventory location not configured. Set up location in Settings first.",
      400
    );
  }

  // Fetch listing & verify ownership
  const { data: listing } = await admin
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .single();

  if (!listing) return jsonError("Listing not found", 404);
  if (listing.marketplace !== "ebay") {
    return jsonError("Only eBay listings can be published to eBay", 400);
  }

  const typedListing = listing as Listing;
  const sku = generateSku(listingId);

  // Mark as publishing
  await admin
    .from("listings")
    .update({ ebay_status: "publishing", ebay_sku: sku, ebay_error: null })
    .eq("id", listingId);

  // -----------------------------------------------------------------------
  // Step 1: Create Inventory Item
  // -----------------------------------------------------------------------
  const inventoryItem = buildInventoryItem(
    typedListing.content,
    condition,
    quantity
  );

  try {
    const step1 = await ebayFetchWithRetry(
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      { method: "PUT", body: inventoryItem, accessToken: token },
      user.id
    );
    token = step1.token;

    if (!step1.res.ok && step1.res.status !== 204) {
      const errorText = await step1.res.text();
      await setListingError(admin, listingId, `Inventory item creation failed: ${errorText}`);
      return jsonError(`Failed to create inventory item: ${errorText}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await setListingError(admin, listingId, msg);
    return jsonError(msg, 500);
  }

  // -----------------------------------------------------------------------
  // Step 2: Create Offer
  // -----------------------------------------------------------------------
  const offer = buildOffer(
    sku,
    categoryId,
    connection as EbayConnection,
    price,
    quantity,
    typedListing.content
  );

  let offerId: string;
  try {
    const step2 = await ebayFetchWithRetry(
      "/sell/inventory/v1/offer",
      { method: "POST", body: offer, accessToken: token },
      user.id
    );
    token = step2.token;

    if (!step2.res.ok) {
      const errorText = await step2.res.text();
      // Attempt cleanup of inventory item
      await ebayApiFetch(
        `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        { method: "DELETE", accessToken: token }
      );
      await setListingError(admin, listingId, `Offer creation failed: ${errorText}`);
      return jsonError(`Failed to create offer: ${errorText}`);
    }

    const offerData = await step2.res.json();
    offerId = offerData.offerId;

    await admin
      .from("listings")
      .update({ ebay_offer_id: offerId })
      .eq("id", listingId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await setListingError(admin, listingId, msg);
    return jsonError(msg, 500);
  }

  // -----------------------------------------------------------------------
  // Step 3: Publish Offer
  // -----------------------------------------------------------------------
  try {
    const step3 = await ebayFetchWithRetry(
      `/sell/inventory/v1/offer/${offerId}/publish`,
      { method: "POST", accessToken: token },
      user.id
    );

    if (!step3.res.ok) {
      const errorText = await step3.res.text();
      await setListingError(
        admin,
        listingId,
        `Publish failed: ${errorText}. Offer created but not published — you can retry.`
      );
      return jsonError(`Failed to publish offer: ${errorText}`);
    }

    const publishData = await step3.res.json();
    const ebayListingId = publishData.listingId;

    await admin
      .from("listings")
      .update({
        ebay_status: "live",
        ebay_listing_id: ebayListingId,
        ebay_published_at: new Date().toISOString(),
        ebay_error: null,
      })
      .eq("id", listingId);

    return jsonSuccess({
      status: "live",
      ebayListingId,
      offerId,
      sku,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await setListingError(admin, listingId, msg);
    return jsonError(msg, 500);
  }
}

async function setListingError(
  admin: ReturnType<typeof getSupabaseAdmin>,
  listingId: string,
  error: string
) {
  await admin
    .from("listings")
    .update({ ebay_status: "error", ebay_error: error })
    .eq("id", listingId);
}
