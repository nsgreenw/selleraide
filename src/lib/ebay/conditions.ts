/**
 * Maps SellerAide condition strings → eBay Inventory API condition enums.
 *
 * The Inventory API uses the `conditionEnum` field with values like "NEW",
 * "LIKE_NEW", etc. This maps our user-facing condition names to those enums.
 */

const CONDITION_MAP: Record<string, string> = {
  New: "NEW",
  "Open Box": "LIKE_NEW",
  "Like New": "LIKE_NEW",
  "Very Good": "VERY_GOOD",
  Good: "GOOD",
  Acceptable: "ACCEPTABLE",
  "For Parts or Not Working": "FOR_PARTS_OR_NOT_WORKING",
};

/**
 * Convert a SellerAide condition string to an eBay condition enum.
 * Falls back to "NEW" if unrecognised.
 */
export function toEbayCondition(condition?: string): string {
  if (!condition) return "NEW";
  return CONDITION_MAP[condition] ?? "NEW";
}

/** All conditions available in the UI dropdown. */
export const EBAY_CONDITIONS = Object.keys(CONDITION_MAP);
