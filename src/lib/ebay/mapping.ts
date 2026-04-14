/**
 * Maps SellerAide ListingContent → eBay Inventory API payloads.
 */

import type { ListingContent, EbayConnectionContext, ListingImage } from "@/types";
import { toEbayCondition } from "./conditions";

// ---------------------------------------------------------------------------
// Types matching eBay Inventory API shapes
// ---------------------------------------------------------------------------

export interface EbayInventoryItem {
  availability: {
    shipToLocationAvailability: { quantity: number };
  };
  condition: string;
  conditionDescription?: string;
  product: {
    title: string;
    description: string;
    aspects?: Record<string, string[]>;
    imageUrls?: string[];
  };
}

export interface EbayOffer {
  sku: string;
  marketplaceId: string;
  format: string;
  availableQuantity: number;
  categoryId: string;
  listingDescription: string;
  listingPolicies: {
    fulfillmentPolicyId: string;
    returnPolicyId: string;
    paymentPolicyId: string;
  };
  merchantLocationKey: string;
  pricingSummary: {
    price: { currency: string; value: string };
  };
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Build the inventory item payload from listing content.
 */
export function buildInventoryItem(
  content: ListingContent,
  condition?: string,
  quantity: number = 1,
  images: ListingImage[] = []
): EbayInventoryItem {
  const ebayCondition = toEbayCondition(condition);
  const item: EbayInventoryItem = {
    availability: {
      shipToLocationAvailability: { quantity },
    },
    condition: ebayCondition,
    product: {
      title: content.title.slice(0, 80),
      description: content.description,
    },
  };

  if (images.length > 0) {
    item.product.imageUrls = images.map((i) => i.url);
  }

  // Add condition description for non-new items
  if (
    ebayCondition !== "NEW" &&
    content.condition_notes &&
    content.condition_notes.length > 0
  ) {
    item.conditionDescription = content.condition_notes.join(". ");
  }

  // Convert item_specifics { key: "val1, val2" } → eBay aspects { key: ["val1", "val2"] }.
  // eBay rejects any single aspect value over 65 characters, so we split
  // delimited strings into discrete values and trim/cap each entry.
  if (content.item_specifics && Object.keys(content.item_specifics).length > 0) {
    item.product.aspects = {};
    for (const [key, value] of Object.entries(content.item_specifics)) {
      const values = splitAspectValue(value);
      if (values.length > 0) {
        item.product.aspects[key] = values;
      }
    }
  }

  return item;
}

const MAX_ASPECT_VALUE_LEN = 65;

function splitAspectValue(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map((v) =>
      v.length > MAX_ASPECT_VALUE_LEN ? v.slice(0, MAX_ASPECT_VALUE_LEN).trim() : v
    );
}

/**
 * Build the offer payload.
 */
export function buildOffer(
  sku: string,
  categoryId: string,
  connection: EbayConnectionContext,
  price: string,
  quantity: number,
  content: ListingContent
): EbayOffer {
  // Build listing description — include condition notes if present
  let description = content.description;
  if (content.condition_notes && content.condition_notes.length > 0) {
    description += "\n\nCondition Notes:\n" + content.condition_notes.join("\n");
  }

  return {
    sku,
    marketplaceId: "EBAY_US",
    format: "FIXED_PRICE",
    availableQuantity: quantity,
    categoryId,
    listingDescription: description,
    listingPolicies: {
      fulfillmentPolicyId: connection.fulfillment_policy_id!,
      returnPolicyId: connection.return_policy_id!,
      paymentPolicyId: connection.payment_policy_id!,
    },
    merchantLocationKey: connection.merchant_location_key!,
    pricingSummary: {
      price: { currency: "USD", value: price },
    },
  };
}

/**
 * Generate a unique SKU for a listing.
 * Format: SA-{first 8 chars of listing ID}-{timestamp}
 */
export function generateSku(listingId: string): string {
  const short = listingId.replace(/-/g, "").slice(0, 8);
  const ts = Date.now().toString(36);
  return `SA-${short}-${ts}`;
}
