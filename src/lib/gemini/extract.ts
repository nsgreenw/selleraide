import type { Marketplace, ProductContext } from "@/types";
import { getGeminiModel } from "./client";

/**
 * Extracts structured product context from a free-form product description.
 * Used by the single-step generation flow.
 */
export async function extractProductContextFromDescription(
  description: string,
  marketplace: Marketplace
): Promise<ProductContext> {
  const prompt = `You are parsing a seller's product description to extract structured data for a ${marketplace} listing.

SELLER'S INPUT:
${description}

Extract as much information as possible from this text. Return a JSON object with these fields (use null for any field you cannot determine):

{
  "product_name": "The product name/title",
  "brand": "Brand name if mentioned",
  "category": "Product category",
  "key_features": ["feature1", "feature2", "feature3"],
  "target_audience": "Who this product is for",
  "differentiators": ["What makes it unique"],
  "price_point": "Price if mentioned",
  "compliance_info": "Any regulatory or compliance details"
}

Be thorough — infer the category and target audience from context if not stated explicitly. Always return at least 3 key features, inferring from the description if needed.

Respond with ONLY the JSON object.`;

  try {
    const result = await getGeminiModel().generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackContext(description);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const context: ProductContext = {};
    if (parsed.product_name) context.product_name = String(parsed.product_name);
    if (parsed.brand) context.brand = String(parsed.brand);
    if (parsed.category) context.category = String(parsed.category);
    if (Array.isArray(parsed.key_features) && parsed.key_features.length > 0) {
      context.key_features = parsed.key_features.map(String);
    }
    if (parsed.target_audience) context.target_audience = String(parsed.target_audience);
    if (Array.isArray(parsed.differentiators) && parsed.differentiators.length > 0) {
      context.differentiators = parsed.differentiators.map(String);
    }
    if (parsed.price_point) context.price_point = String(parsed.price_point);
    if (parsed.compliance_info) context.compliance_info = String(parsed.compliance_info);

    return context;
  } catch {
    return buildFallbackContext(description);
  }
}

function buildFallbackContext(description: string): ProductContext {
  return {
    product_name: description.substring(0, 100),
    category: "General",
    key_features: [description.substring(0, 200)],
  };
}
