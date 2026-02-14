import type { Marketplace, ProductContext, ResearchData } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { getGeminiResearchModel } from "./client";

/**
 * Researches the product category, keywords, competitors, and trends
 * using Gemini. Returns structured research data to inform listing generation.
 */
export async function researchProduct(
  productContext: ProductContext,
  marketplace: Marketplace
): Promise<ResearchData> {
  const profile = getMarketplaceProfile(marketplace);

  const prompt = `You are an ecommerce product research specialist for ${profile.displayName}.

Analyze the following product and provide research data in JSON format.

PRODUCT INFORMATION:
- Product Name: ${productContext.product_name ?? "Unknown"}
- Brand: ${productContext.brand ?? "Not specified"}
- Category: ${productContext.category ?? "Not specified"}
- Key Features: ${productContext.key_features?.join(", ") ?? "Not specified"}
- Target Audience: ${productContext.target_audience ?? "Not specified"}
- Differentiators: ${productContext.differentiators?.join(", ") ?? "Not specified"}
- Price Point: ${productContext.price_point ?? "Not specified"}
- Compliance Info: ${productContext.compliance_info ?? "None"}

RESEARCH TASKS:
1. Identify the top 15-20 relevant search keywords for this product on ${profile.displayName}. Include high-volume primary keywords and long-tail secondary keywords. Order by estimated search volume (highest first).

2. Identify 3-5 current market trends relevant to this product category (seasonal patterns, rising demand, emerging niches, consumer preferences).

3. Analyze competitor positioning: what are the top-selling products in this category doing well? What gaps exist? Identify 3-5 actionable competitor insights.

4. Provide category-specific notes: any special requirements, common pitfalls, or optimization tips specific to selling this type of product on ${profile.displayName}.

Respond with valid JSON in this exact structure:
{
  "keywords": ["keyword1", "keyword2", ...],
  "trends": ["trend description 1", "trend description 2", ...],
  "competitor_insights": ["insight 1", "insight 2", ...],
  "category_notes": "A paragraph with category-specific advice and tips."
}

Respond ONLY with the JSON object, no additional text.`;

  const result = await getGeminiResearchModel().generateContent(prompt);
  const responseText = result.response.text();

  try {
    // Extract JSON from the response, handling potential markdown code blocks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in research response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as ResearchData;

    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      trends: Array.isArray(parsed.trends) ? parsed.trends : [],
      competitor_insights: Array.isArray(parsed.competitor_insights)
        ? parsed.competitor_insights
        : [],
      category_notes:
        typeof parsed.category_notes === "string"
          ? parsed.category_notes
          : "",
    };
  } catch (err) {
    console.error(
      "Gemini research parsing failed:",
      err instanceof Error ? err.message : err
    );
    // Return a minimal research object if parsing fails
    return {
      keywords: [],
      trends: [],
      competitor_insights: [],
      category_notes:
        "Research data could not be fully parsed. Proceeding with available product information.",
    };
  }
}
