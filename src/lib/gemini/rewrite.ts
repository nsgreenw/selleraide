import type { Marketplace } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { getGeminiGenerateModel } from "./client";

export interface RewriteInput {
  marketplace: Marketplace;
  field: "title" | "bullet" | "description" | "backend_keywords";
  bullet_index?: number;
  current_value: string;
  listing: {
    title: string;
    bullets: string[];
    description: string;
    backend_keywords?: string;
  };
  instructions?: string;
}

export interface RewriteResult {
  value: string;
}

export async function rewriteField(input: RewriteInput): Promise<RewriteResult> {
  const { marketplace, field, bullet_index, current_value, listing, instructions } = input;
  const profile = getMarketplaceProfile(marketplace);

  const titleMax = profile.fields.find(f => f.name === "title")?.maxLength ?? 200;
  const descMax = profile.fields.find(f => f.name === "description")?.maxLength ?? 2000;
  const isAmazon = marketplace === "amazon";
  const isEbay = marketplace === "ebay";

  const bulletsContext = listing.bullets
    .map((b, i) => `  ${i + 1}. ${b}`)
    .join("\n") || "  (none)";

  const keywordsLine = listing.backend_keywords
    ? `Backend Keywords: ${listing.backend_keywords}`
    : "";

  let fieldLabel: string;
  let fieldRules: string;

  switch (field) {
    case "title":
      fieldLabel = "Title";
      fieldRules = `- Maximum ${titleMax} characters
- Front-load the primary keyword as the first 1-2 words
- Include brand, product type, key spec, and size/quantity if applicable
- No promotional phrases (Best, #1, Amazing, Sale, etc.)
- No ALL CAPS words`;
      break;

    case "bullet":
      fieldLabel = `Bullet Point ${bullet_index !== undefined ? bullet_index + 1 : ""}`;
      if (isAmazon) {
        fieldRules = `- Length: 150-250 characters
- First word must be a benefit-oriented word (e.g. Easy, Fast, Durable, Lightweight, Ergonomic, Waterproof, Rechargeable, etc.)
- Include at least one numeric spec (dimension, weight, count, percentage, or measurement)
- End with a period
- Focus on ONE key benefit or feature per bullet
- Do not start with the product name or brand`;
      } else {
        fieldRules = `- Write a clear, benefit-led sentence
- Include relevant specs where natural
- Keep it concise and scannable`;
      }
      break;

    case "description":
      fieldLabel = "Description";
      if (isEbay) {
        fieldRules = `- HTML is allowed (no <script> tags)
- 600-2000 characters ideal
- Use 2+ paragraphs for structure
- Include benefit language and key features
- Mention condition if relevant`;
      } else {
        fieldRules = `- Plain text only (no HTML)
- 600-1600 characters ideal (max ${descMax} chars)
- Use 2+ paragraphs separated by a blank line
- Lead with the primary benefit
- Include 5+ distinct benefit words`;
      }
      break;

    case "backend_keywords":
      fieldLabel = "Backend Keywords";
      fieldRules = `- Amazon only: space-separated keywords, no commas, no punctuation
- Target 225-250 bytes total
- Do NOT repeat any word already in the title
- Include synonyms, alternate spellings, and related search terms
- No brand names of competitors`;
      break;
  }

  const userInstructions = instructions?.trim()
    ? `\nUSER INSTRUCTIONS: "${instructions.trim()}"\n`
    : "";

  const prompt = `You are rewriting ONE field of a ${profile.displayName} listing.

FULL LISTING CONTEXT (for reference only — do not rewrite these):
Title: ${listing.title}
Bullets:
${bulletsContext}
Description: ${listing.description}${keywordsLine ? `\n${keywordsLine}` : ""}

FIELD TO REWRITE: ${fieldLabel}
CURRENT VALUE:
"${current_value}"
${userInstructions}
FIELD RULES:
${fieldRules}

Return ONLY valid JSON with no explanation: {"value": "..."}`;

  const result = await getGeminiGenerateModel().generateContent(prompt);
  const responseText = result.response.text();

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (typeof parsed.value !== "string") throw new Error("No value field");
    return { value: parsed.value };
  } catch {
    return { value: input.current_value };
  }
}
