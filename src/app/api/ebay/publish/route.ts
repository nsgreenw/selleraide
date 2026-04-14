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
import { toEbayCondition } from "@/lib/ebay/conditions";
import type { Listing } from "@/types";

/**
 * Parse eBay's structured error response into a readable message.
 * eBay returns { errors: [{ errorId, message, longMessage, parameters }] } on failure.
 * Some errors (e.g. 25019 policy violations) stuff full HTML into parameter
 * values, so we skip HTML-looking values and strip tags from anything that
 * does slip through.
 */
function parseEbayErrors(raw: string): string {
  try {
    const data = JSON.parse(raw);
    const errors = data.errors ?? data.error ?? [];
    if (Array.isArray(errors) && errors.length > 0) {
      return errors
        .map(
          (e: {
            message?: string;
            longMessage?: string;
            errorId?: number;
            parameters?: Array<{ name?: string; value?: string }>;
          }) => {
            const msg = stripHtml(e.longMessage || e.message || "Unknown error");
            const idPart = e.errorId ? ` [${e.errorId}]` : "";
            const usefulParams = (e.parameters ?? [])
              .filter((p) => p.name && p.value)
              .filter((p) => !looksLikeHtml(p.value!))
              .filter((p) => !/^\d+$/.test(p.name!)) // drop positional numeric names
              .map((p) => `${p.name}=${p.value}`);
            const paramPart = usefulParams.length
              ? ` (${usefulParams.join(", ")})`
              : "";
            return `${msg}${idPart}${paramPart}`;
          }
        )
        .join("; ");
    }
    if (typeof data.message === "string") return stripHtml(data.message);
  } catch {
    // Not JSON — return raw text trimmed
  }
  return raw.length > 300 ? raw.slice(0, 300) + "…" : raw;
}

function looksLikeHtml(v: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(v);
}

function stripHtml(v: string): string {
  return v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Detect wording that contradicts the selected eBay condition. eBay policy
 * 25019 (SP_Item_Condition_Misrep) rejects listings where the title or
 * description implies a different condition than what's set. Catching this
 * pre-flight gives a much clearer error than eBay's HTML-laden response.
 */
function detectConditionConflict(
  conditionEnum: string,
  title: string,
  description: string
): string | null {
  const haystack = `${title}\n${description}`.toLowerCase();
  const used = /\b(used|pre[- ]?owned|second[- ]?hand|refurbished|restored|gently used|previously owned)\b/;
  const newish = /\b(brand new|factory sealed|never used|unused|new in box|new in package|nib|nwt)\b/;

  if (conditionEnum.startsWith("NEW") || conditionEnum === "LIKE_NEW") {
    if (used.test(haystack)) {
      return 'The title or description contains words like "used", "pre-owned", or "refurbished" but the condition is set to new. Either edit the listing text or pick a used condition.';
    }
  }
  if (
    conditionEnum.startsWith("USED_") ||
    conditionEnum === "FOR_PARTS_OR_NOT_WORKING" ||
    conditionEnum.includes("REFURBISHED")
  ) {
    if (newish.test(haystack)) {
      return 'The title or description contains words like "brand new", "sealed", or "unused" but the condition is not new. Either edit the listing text or pick "New".';
    }
  }
  return null;
}

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
  const {
    listingId,
    price,
    quantity,
    categoryId,
    condition,
    fulfillmentPolicyId: reqFulfillment,
    returnPolicyId: reqReturn,
    paymentPolicyId: reqPayment,
  } = parsed.data;

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
  const images = typedListing.images ?? [];
  if (images.length === 0) {
    return jsonError(
      "At least one image is required to publish to eBay. Upload or paste image URLs on the listing page.",
      400
    );
  }

  const conflict = detectConditionConflict(
    toEbayCondition(condition),
    typedListing.content.title ?? "",
    typedListing.content.description ?? ""
  );
  if (conflict) return jsonError(conflict, 400);

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
    quantity,
    images
  );

  try {
    const step1 = await ebayFetchWithRetry(
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      { method: "PUT", body: inventoryItem, accessToken: token },
      user.id
    );
    token = step1.token;

    if (!step1.res.ok && step1.res.status !== 204) {
      const text = await step1.res.text();
      console.error("[eBay Publish] Step 1 (inventory item) failed", {
        status: step1.res.status,
        body: text,
        payload: inventoryItem,
      });
      const parsed = parseEbayErrors(text);
      await setListingError(admin, listingId, `Inventory item creation failed: ${parsed}`);
      return jsonError(`Failed to create inventory item: ${parsed}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await setListingError(admin, listingId, msg);
    return jsonError(msg, 500);
  }

  // -----------------------------------------------------------------------
  // Step 2: Create Offer
  // -----------------------------------------------------------------------
  // Apply per-request policy overrides if provided
  const effectiveConnection = {
    ...connection,
    ...(reqFulfillment && { fulfillment_policy_id: reqFulfillment }),
    ...(reqReturn && { return_policy_id: reqReturn }),
    ...(reqPayment && { payment_policy_id: reqPayment }),
  };

  const offer = buildOffer(
    sku,
    categoryId,
    effectiveConnection,
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
      const text = await step2.res.text();
      console.error("[eBay Publish] Step 2 (offer) failed", {
        status: step2.res.status,
        body: text,
        payload: offer,
      });
      const parsed = parseEbayErrors(text);
      // Attempt cleanup of inventory item
      await ebayApiFetch(
        `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        { method: "DELETE", accessToken: token }
      ).catch(() => {});
      await setListingError(admin, listingId, `Offer creation failed: ${parsed}`);
      return jsonError(`Failed to create offer: ${parsed}`);
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
      console.error("[eBay Publish] Step 3 (publish) failed", {
        status: step3.res.status,
        body: errorText,
        offerId,
        sku,
        inventoryItem,
        offer,
      });

      // Rollback: delete the orphaned offer, then the inventory item
      await ebayApiFetch(`/sell/inventory/v1/offer/${offerId}`, {
        method: "DELETE",
        accessToken: step3.token,
      }).catch(() => {});
      await ebayApiFetch(
        `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        { method: "DELETE", accessToken: step3.token }
      ).catch(() => {});

      const parsed = parseEbayErrors(errorText);
      await setListingError(admin, listingId, `Publish failed: ${parsed}`);
      return jsonError(`Failed to publish offer: ${parsed}`);
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

/**
 * PUT — Update a published listing (revise the offer on eBay).
 * Accepts the same payload as POST. Updates inventory item + offer in place.
 */
export async function PUT(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  const body = await req.json();
  const parsed = ebayPublishSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message);

  const {
    listingId,
    price,
    quantity,
    categoryId,
    condition,
    fulfillmentPolicyId: reqFulfillment,
    returnPolicyId: reqReturn,
    paymentPolicyId: reqPayment,
  } = parsed.data;

  const admin = getSupabaseAdmin();

  const { data: listing } = await admin
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .single();

  if (!listing) return jsonError("Listing not found", 404);
  if (!listing.ebay_offer_id || !listing.ebay_sku) {
    return jsonError("Listing has not been published to eBay yet", 400);
  }

  const tokenResult = await getValidAccessToken(user.id);
  if (!tokenResult) return jsonError("eBay account not connected", 400);
  let { token } = tokenResult;
  const { connection } = tokenResult;

  const typedListing = listing as Listing;
  const sku = listing.ebay_sku;
  const offerId = listing.ebay_offer_id;

  // Update inventory item
  const inventoryItem = buildInventoryItem(
    typedListing.content,
    condition,
    quantity,
    typedListing.images ?? []
  );
  try {
    const step1 = await ebayFetchWithRetry(
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      { method: "PUT", body: inventoryItem, accessToken: token },
      user.id
    );
    token = step1.token;
    if (!step1.res.ok && step1.res.status !== 204) {
      const parsed = parseEbayErrors(await step1.res.text());
      return jsonError(`Failed to update inventory item: ${parsed}`);
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }

  // Update offer
  const effectiveConnection = {
    ...connection,
    ...(reqFulfillment && { fulfillment_policy_id: reqFulfillment }),
    ...(reqReturn && { return_policy_id: reqReturn }),
    ...(reqPayment && { payment_policy_id: reqPayment }),
  };
  const offer = buildOffer(sku, categoryId, effectiveConnection, price, quantity, typedListing.content);
  try {
    const step2 = await ebayFetchWithRetry(
      `/sell/inventory/v1/offer/${offerId}`,
      { method: "PUT", body: offer, accessToken: token },
      user.id
    );
    if (!step2.res.ok && step2.res.status !== 204) {
      const parsed = parseEbayErrors(await step2.res.text());
      return jsonError(`Failed to update offer: ${parsed}`);
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }

  await admin
    .from("listings")
    .update({ ebay_error: null })
    .eq("id", listingId);

  return jsonSuccess({ status: "updated", offerId, sku });
}

/**
 * DELETE — End (withdraw) a listing from eBay.
 * Withdraws the offer so the item is no longer live, then cleans up.
 */
export async function DELETE(req: NextRequest) {
  const csrfError = checkCsrfOrigin(req);
  if (csrfError) return jsonError(csrfError, 403);

  const auth = await requireAuth();
  if (auth.error) return jsonError(auth.error, 401);
  const user = auth.user!;

  const { success, reset } = await getStandardLimiter().limit(user.id);
  if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  if (!listingId) return jsonError("listingId query param required");

  const admin = getSupabaseAdmin();

  const { data: listing } = await admin
    .from("listings")
    .select("ebay_offer_id, ebay_sku, ebay_status, user_id")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .single();

  if (!listing) return jsonError("Listing not found", 404);
  if (!listing.ebay_offer_id) {
    return jsonError("Listing has no eBay offer to end", 400);
  }

  const tokenResult = await getValidAccessToken(user.id);
  if (!tokenResult) return jsonError("eBay account not connected", 400);
  const { token } = tokenResult;

  // Withdraw the offer (takes listing off eBay but keeps offer data)
  const withdrawRes = await ebayApiFetch(
    `/sell/inventory/v1/offer/${listing.ebay_offer_id}/withdraw`,
    { method: "POST", accessToken: token }
  );

  if (!withdrawRes.ok && withdrawRes.status !== 404) {
    const parsed = parseEbayErrors(await withdrawRes.text());
    return jsonError(`Failed to end listing: ${parsed}`);
  }

  // Clean up: delete offer and inventory item
  await ebayApiFetch(`/sell/inventory/v1/offer/${listing.ebay_offer_id}`, {
    method: "DELETE",
    accessToken: token,
  }).catch(() => {});

  if (listing.ebay_sku) {
    await ebayApiFetch(
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(listing.ebay_sku)}`,
      { method: "DELETE", accessToken: token }
    ).catch(() => {});
  }

  await admin
    .from("listings")
    .update({
      ebay_status: "ended",
      ebay_error: null,
    })
    .eq("id", listingId);

  return jsonSuccess({ status: "ended" });
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
