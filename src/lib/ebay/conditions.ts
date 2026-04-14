/**
 * Maps SellerAide condition strings → eBay Inventory API condition enums.
 *
 * The Inventory API uses the `condition` field with enum values like
 * "NEW", "LIKE_NEW", "USED_EXCELLENT", etc. Each eBay category accepts a
 * *subset* of those enums — we discover the valid subset at publish time
 * via the metadata API.
 */

const CONDITION_MAP: Record<string, string> = {
  New: "NEW",
  "New Other": "NEW_OTHER",
  "New with Defects": "NEW_WITH_DEFECTS",
  "Like New": "LIKE_NEW",
  "Open Box": "LIKE_NEW",
  "Certified Refurbished": "CERTIFIED_REFURBISHED",
  "Excellent Refurbished": "EXCELLENT_REFURBISHED",
  "Very Good Refurbished": "VERY_GOOD_REFURBISHED",
  "Good Refurbished": "GOOD_REFURBISHED",
  "Seller Refurbished": "SELLER_REFURBISHED",
  "Used - Excellent": "USED_EXCELLENT",
  "Used - Very Good": "USED_VERY_GOOD",
  "Used - Good": "USED_GOOD",
  "Used - Acceptable": "USED_ACCEPTABLE",
  "For Parts or Not Working": "FOR_PARTS_OR_NOT_WORKING",
};

/** Reverse lookup: enum → friendly label (first matching label). */
const ENUM_TO_LABEL: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [label, enumVal] of Object.entries(CONDITION_MAP)) {
    if (!out[enumVal]) out[enumVal] = label;
  }
  return out;
})();

/**
 * eBay's numeric conditionId → Inventory API conditionEnum.
 * See https://developer.ebay.com/api-docs/sell/metadata/resources/marketplace/methods/getItemConditionPolicies
 */
const CONDITION_ID_TO_ENUM: Record<string, string> = {
  "1000": "NEW",
  "1500": "NEW_OTHER",
  "1750": "NEW_WITH_DEFECTS",
  "2000": "CERTIFIED_REFURBISHED",
  "2010": "EXCELLENT_REFURBISHED",
  "2020": "VERY_GOOD_REFURBISHED",
  "2030": "GOOD_REFURBISHED",
  "2500": "SELLER_REFURBISHED",
  "2750": "LIKE_NEW",
  "3000": "USED_EXCELLENT",
  "4000": "USED_VERY_GOOD",
  "5000": "USED_GOOD",
  "6000": "USED_ACCEPTABLE",
  "7000": "FOR_PARTS_OR_NOT_WORKING",
};

/**
 * Convert a SellerAide condition string to an eBay condition enum.
 * If the value is already an enum (e.g. "USED_EXCELLENT"), it is returned
 * as-is so the panel can pass a pre-resolved enum through.
 */
export function toEbayCondition(condition?: string): string {
  if (!condition) return "NEW";
  if (CONDITION_MAP[condition]) return CONDITION_MAP[condition];
  // Already an enum — pass through
  if (/^[A-Z_]+$/.test(condition)) return condition;
  return "NEW";
}

/** All conditions available as the default UI dropdown. */
export const EBAY_CONDITIONS = Object.keys(CONDITION_MAP);

export function conditionIdToEnum(id: string): string | null {
  return CONDITION_ID_TO_ENUM[id] ?? null;
}

export function enumToLabel(enumVal: string): string {
  return ENUM_TO_LABEL[enumVal] ?? enumVal;
}
