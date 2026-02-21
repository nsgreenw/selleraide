import type { MarketplaceProfile } from "./types";
import type { Marketplace } from "@/types";
import { amazonProfile } from "./amazon";
import { walmartProfile } from "./walmart";
import { ebayProfile } from "./ebay";
import { shopifyProfile } from "./shopify";

const profiles: Record<Marketplace, MarketplaceProfile> = {
  amazon: amazonProfile,
  walmart: walmartProfile,
  ebay: ebayProfile,
  shopify: shopifyProfile,
};

export function isMarketplaceEnabled(id: Marketplace): boolean {
  const key = `MARKETPLACE_ENABLED_${id.toUpperCase()}`;
  const val = process.env[key];
  if (val === undefined) return id === "amazon" || id === "ebay"; // safe defaults
  return val !== "false" && val !== "0";
}

export function getMarketplaceProfile(marketplace: Marketplace): MarketplaceProfile {
  return profiles[marketplace];
}

export function getAllMarketplaces(): MarketplaceProfile[] {
  return Object.values(profiles);
}

export function getMarketplaceIds(): Marketplace[] {
  return Object.keys(profiles) as Marketplace[];
}

export function getEnabledMarketplaceIds(): Marketplace[] {
  return getMarketplaceIds().filter(isMarketplaceEnabled);
}
