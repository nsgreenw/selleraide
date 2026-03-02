import type { ListingContent, Marketplace, QAResult } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { CRITERION_FUNCTIONS } from "./scorer";
import { validateListing } from "./validator";

/**
 * Scores a candidate title in the context of a full listing.
 * Reuses the existing title_keyword_richness and title_length_optimization
 * criterion functions, then averages them for a title-specific score.
 * Also runs validation filtered to title-only results.
 */
export function scoreTitleVariant(
  title: string,
  fullContent: ListingContent,
  marketplace: Marketplace
): { score: number; violations: QAResult[] } {
  const profile = getMarketplaceProfile(marketplace);

  // Clone content with the candidate title
  const cloned: ListingContent = { ...fullContent, title };

  const ctx = {
    content: cloned,
    marketplace,
    validationResults: [] as QAResult[],
    fields: profile.fields,
  };

  const keywordRichness = CRITERION_FUNCTIONS.title_keyword_richness(ctx);
  const lengthOptimization = CRITERION_FUNCTIONS.title_length_optimization(ctx);

  const score = Math.round((keywordRichness.score + lengthOptimization.score) / 2);

  // Run full validation, filter to title-only results
  const allResults = validateListing(cloned, marketplace);
  const violations = allResults.filter((r) => r.field === "title");

  return { score, violations };
}
