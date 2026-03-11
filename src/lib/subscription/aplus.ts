import type { SubscriptionTier } from "@/types";

export function getAPlusModuleCountForTier(tier: SubscriptionTier | null | undefined): number {
  return tier === "starter" ? 4 : 7;
}
