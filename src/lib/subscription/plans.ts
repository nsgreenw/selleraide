import type { SubscriptionTier } from "@/types";

export interface PlanConfig {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  listingsPerMonth: number | null; // null = unlimited
  features: string[];
}

export const PLANS: Record<SubscriptionTier, PlanConfig> = {
  // Internal fallback state for users without an active subscription.
  // Not displayed as a user-selectable plan.
  free: {
    name: "No Active Plan",
    priceMonthly: 0,
    priceYearly: 0,
    listingsPerMonth: 0,
    features: [
      "No active subscription",
      "Choose a paid plan to start your 7-day free trial",
    ],
  },
  starter: {
    name: "Starter",
    priceMonthly: 19,
    priceYearly: 190,
    listingsPerMonth: 50,
    features: [
      "7-day free trial",
      "50 listings per month",
      "Amazon + eBay",
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
      "7-day free trial",
      "200 listings per month",
      "Amazon + eBay",
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
      "7-day free trial",
      "Unlimited listings",
      "Amazon + eBay",
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
