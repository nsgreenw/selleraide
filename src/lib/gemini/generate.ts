import type {
  Marketplace,
  ProductContext,
  ListingContent,
  PhotoRecommendation,
} from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { getGeminiGenerateModel } from "./client";

/**
 * Generates a complete listing using Gemini, based on the product context,
 * research data, and marketplace profile constraints.
 */
export async function generateListing(
  productContext: ProductContext,
  marketplace: Marketplace
): Promise<ListingContent> {
  const profile = getMarketplaceProfile(marketplace);

  const researchSection = productContext.research_data
    ? `
RESEARCH DATA:
- Top Keywords: ${productContext.research_data.keywords?.join(", ") ?? "None available"}
- Market Trends: ${productContext.research_data.trends?.join("; ") ?? "None available"}
- Competitor Insights: ${productContext.research_data.competitor_insights?.join("; ") ?? "None available"}
- Category Notes: ${productContext.research_data.category_notes ?? "None available"}`
    : "";

  const fieldInstructions = profile.fields
    .map((f) => {
      const limit = f.maxLength
        ? `max ${f.maxLength} chars`
        : f.maxBytes
          ? `max ${f.maxBytes} bytes`
          : "no hard limit";
      return `- "${f.name}": ${f.description} (${limit})`;
    })
    .join("\n");

  const bannedTermsList = profile.bannedTerms
    .map((bt) => bt.term)
    .join(", ");

  const keywordTips = profile.keywordStrategy.tips
    .map((tip) => `  - ${tip}`)
    .join("\n");

  const prompt = `You are an expert ecommerce copywriter generating a product listing for ${profile.displayName}.

PRODUCT INFORMATION:
- Product Name: ${productContext.product_name ?? "Unknown"}
- Brand: ${productContext.brand ?? "Not specified"}
- Category: ${productContext.category ?? "Not specified"}
- Key Features: ${productContext.key_features?.join(", ") ?? "Not specified"}
- Target Audience: ${productContext.target_audience ?? "Not specified"}
- Differentiators: ${productContext.differentiators?.join(", ") ?? "Not specified"}
- Price Point: ${productContext.price_point ?? "Not specified"}
- Compliance Info: ${productContext.compliance_info ?? "None"}
${researchSection}

MARKETPLACE RULES:
${profile.promptModifier}

REQUIRED JSON FIELDS:
${fieldInstructions}

The JSON response MUST contain exactly these keys: ${JSON.stringify(profile.listingShape)}

bullet_points must be a JSON array of 5 strings; backend_search_terms must be a JSON array of strings.

KEYWORD STRATEGY:
- Place primary keywords in: ${profile.keywordStrategy.primaryPlacement}
- Place secondary keywords in: ${profile.keywordStrategy.secondaryPlacement}
- Max keywords in title: ${profile.keywordStrategy.maxKeywordsTitle}
${profile.keywordStrategy.backendField ? `- Backend field "${profile.keywordStrategy.backendField}": max ${profile.keywordStrategy.backendMaxBytes} bytes, space-separated, no repeated words from title` : ""}
${keywordTips}

BANNED TERMS (never use these): ${bannedTermsList}

INSTRUCTIONS:
1. Incorporate the top keywords naturally — never keyword-stuff.
2. Lead with benefits, not features. Use "so that" or "which means" framing.
3. Write at an 8th-grade reading level.
4. Address the customer directly ("you" / "your").
5. Make every claim substantiated or phrased as a benefit.
6. Respect all character and byte limits strictly.

Generate the listing now. Respond with ONLY a valid JSON object.`;

  const result = await getGeminiGenerateModel().generateContent(prompt);
  const responseText = result.response.text();

  let listingData: Record<string, unknown>;
  try {
    // The model is configured with responseMimeType: "application/json"
    // but we still handle potential wrapping gracefully
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in generation response");
    }
    listingData = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse listing JSON from Gemini response");
  }

  // Map the flat JSON response into ListingContent shape
  const content: ListingContent = {
    title: String(listingData.title ?? ""),
    description: String(listingData.description ?? ""),
  };

  // Collect bullet points — new format: bullet_points array
  if (Array.isArray(listingData.bullet_points)) {
    content.bullets = listingData.bullet_points.map(String);
  } else {
    // Legacy fallback: bullet_1, bullet_2, ... format
    const bullets: string[] = [];
    for (const key of profile.listingShape) {
      if (key.startsWith("bullet_") && listingData[key]) {
        bullets.push(String(listingData[key]));
      }
    }
    if (bullets.length > 0) {
      content.bullets = bullets;
    }
  }

  // backend_search_terms array → backend_keywords string (space-joined)
  if (Array.isArray(listingData.backend_search_terms)) {
    content.backend_keywords = listingData.backend_search_terms.join(" ");
  } else if (listingData.backend_keywords) {
    content.backend_keywords = String(listingData.backend_keywords);
  }

  // Map optional fields
  if (listingData.seo_title) {
    content.seo_title = String(listingData.seo_title);
  }
  if (listingData.meta_description) {
    content.meta_description = String(listingData.meta_description);
  }
  if (listingData.tags && Array.isArray(listingData.tags)) {
    content.tags = listingData.tags.map(String);
  }
  if (listingData.subtitle) {
    content.subtitle = String(listingData.subtitle);
  }
  if (listingData.shelf_description) {
    content.shelf_description = String(listingData.shelf_description);
  }
  if (
    listingData.item_specifics &&
    typeof listingData.item_specifics === "object"
  ) {
    content.item_specifics = listingData.item_specifics as Record<
      string,
      string
    >;
  }
  if (listingData.attributes && typeof listingData.attributes === "object") {
    content.attributes = listingData.attributes as Record<string, string>;
  }

  // New optional fields for v1 marketplace profiles
  if (Array.isArray(listingData.compliance_notes)) {
    content.compliance_notes = listingData.compliance_notes.map(String);
  }
  if (Array.isArray(listingData.assumptions)) {
    content.assumptions = listingData.assumptions.map(String);
  }
  if (Array.isArray(listingData.condition_notes)) {
    content.condition_notes = listingData.condition_notes.map(String);
  }
  if (listingData.shipping_notes) {
    content.shipping_notes = String(listingData.shipping_notes);
  }
  if (listingData.returns_notes) {
    content.returns_notes = String(listingData.returns_notes);
  }
  if (listingData.category_hint) {
    content.category_hint = String(listingData.category_hint);
  }

  // Add photo recommendations from the marketplace profile
  content.photo_recommendations = profile.photoSlots.map(
    (slot): PhotoRecommendation => ({
      slot: slot.slot,
      description: slot.description,
      type: slot.type,
      tips: slot.tips,
    })
  );

  return content;
}
