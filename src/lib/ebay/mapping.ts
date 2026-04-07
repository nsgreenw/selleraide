/**
 * Maps SellerAide ListingContent → eBay Inventory API payloads.
 */

import type { ListingContent, EbayConnectionContext } from "@/types";
import { toEbayCondition } from "./conditions";

// ---------------------------------------------------------------------------
// Types matching eBay Inventory API shapes
// ---------------------------------------------------------------------------

export interface EbayInventoryItem {
  availability: {
    shipToLocationAvailability: { quantity: number };
  };
  condition: string;
  product: {
    title: string;
    description: string;
    aspects?: Record<string, string[]>;
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
  quantity: number = 1
): EbayInventoryItem {
  const item: EbayInventoryItem = {
    availability: {
      shipToLocationAvailability: { quantity },
    },
    condition: toEbayCondition(condition),
    product: {
      title: content.title.slice(0, 80),
      description: content.description,
    },
  };

  // Convert item_specifics { key: value } → eBay aspects { key: [value] }
  if (content.item_specifics && Object.keys(content.item_specifics).length > 0) {
    item.product.aspects = {};
    for (const [key, value] of Object.entries(content.item_specifics)) {
      item.product.aspects[key] = [value];
    }
  }

  return item;
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
