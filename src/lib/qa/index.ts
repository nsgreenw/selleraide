import { validateListing } from "./validator";
import { scoreListing } from "./scorer";
import type { ListingContent } from "@/types";
import type { Marketplace } from "@/types";

export function analyzeListing(content: ListingContent, marketplace: Marketplace) {
  const validationResults = validateListing(content, marketplace);
  const scoreResults = scoreListing(content, marketplace, validationResults);
  return {
    validation: validationResults,
    ...scoreResults,
  };
}

export { validateListing, scoreListing };
