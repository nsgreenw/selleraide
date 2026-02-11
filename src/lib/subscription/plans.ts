import type { SubscriptionTier } from "@/types";

export interface PlanConfig {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  listingsPerMonth: number | null; // null = unlimited
  features: string[];
}

export const PLANS: Record<SubscriptionTier, PlanConfig> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    listingsPerMonth: 5,
    features: [
      "5 listings per month",
      "All marketplaces",
      "Basic QA scoring",
      "Copy to clipboard export",
    ],
  },
  starter: {
    name: "Starter",
    priceMonthly: 19,
    priceYearly: 190,
    listingsPerMonth: 50,
    features: [
      "50 listings per month",
      "All marketplaces",
      "Full QA scoring",
      "PDF & CSV export",
      "Priority AI generation",
    ],
  },
  pro: {
    name: "Pro",
    priceMonthly: 49,
    priceYearly: 490,
    listingsPerMonth: 200,
    features: [
      "200 listings per month",
      "All marketplaces",
      "Full QA scoring",
      "All export formats",
      "Priority AI generation",
      "Listing history",
    ],
  },
  agency: {
    name: "Agency",
    priceMonthly: 99,
    priceYearly: 990,
    listingsPerMonth: null,
    features: [
      "Unlimited listings",
      "All marketplaces",
      "Full QA scoring",
      "All export formats",
      "Priority AI generation",
      "Listing history",
      "Priority support",
    ],
  },
};

/**
 * Check if a user on the given tier can generate another listing.
 * Returns true if the tier has no limit (null) or if listingsUsed is below the limit.
 */
export function canGenerateListing(
  tier: SubscriptionTier,
  listingsUsed: number
): boolean {
  const plan = PLANS[tier];
  if (plan.listingsPerMonth === null) {
    return true;
  }
  return listingsUsed < plan.listingsPerMonth;
}
