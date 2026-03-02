import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess, jsonRateLimited } from "@/lib/api/response";
import { getStandardLimiter } from "@/lib/api/rate-limit";
import { getGeminiGenerateModel } from "@/lib/gemini/client";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { scoreTitleVariant } from "@/lib/qa/title-scorer";
import type { Listing, ListingContent, Marketplace } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function buildPrompt(
  listing: Listing,
  titleConstraints: { maxLength: number | null },
  keywordStrategy: string,
  researchKeywords: string[],
  researchTrends: string[]
): string {
  const content = listing.content;
  const mp = listing.marketplace;

  const keywordsSection =
    researchKeywords.length > 0
      ? `\nResearch keywords: ${researchKeywords.join(", ")}`
      : "";
  const trendsSection =
    researchTrends.length > 0
      ? `\nMarket trends: ${researchTrends.join(", ")}`
      : "";

  return `You are an expert ${mp} product listing copywriter.

Given this existing listing:
- Title: ${content.title}
- Bullets: ${content.bullets?.join(" | ") ?? "N/A"}
- Description: ${content.description?.slice(0, 300) ?? "N/A"}
${keywordsSection}${trendsSection}

Marketplace: ${mp}
Title max length: ${titleConstraints.maxLength ?? "unlimited"} characters
Keyword strategy: ${keywordStrategy}

Generate exactly 5 alternative titles using these strategies:
1. keyword-front-loaded — Place the highest-value search terms at the very start
2. benefit-led — Lead with the primary customer benefit
3. long-tail — Target specific long-tail search queries
4. brand-forward — Emphasize brand identity and trust signals
5. compact-punchy — Short, memorable, high click-through title

Each title MUST:
- Stay within the character limit
- Be unique and substantially different from the others
- Maintain accurate product information
- Follow ${mp} title formatting guidelines

Return ONLY a JSON array of exactly 5 objects:
[
  { "title": "...", "strategy": "keyword-front-loaded", "notes": "brief explanation" },
  { "title": "...", "strategy": "benefit-led", "notes": "brief explanation" },
  { "title": "...", "strategy": "long-tail", "notes": "brief explanation" },
  { "title": "...", "strategy": "brand-forward", "notes": "brief explanation" },
  { "title": "...", "strategy": "compact-punchy", "notes": "brief explanation" }
]

No markdown, no code fences, just the JSON array.`;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const { success, reset } = await getStandardLimiter().limit(user.id);
    if (!success) return jsonRateLimited(Math.ceil((reset - Date.now()) / 1000));

    const { id } = await params;
    const supabase = await createClient();

    // Fetch listing and verify ownership
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return jsonError("Listing not found", 404);
    }

    const marketplace = listing.marketplace as Marketplace;
    const content = listing.content as ListingContent;
    const profile = getMarketplaceProfile(marketplace);
    const titleField = profile.fields.find((f) => f.name === "title");
    const titleConstraints = { maxLength: titleField?.maxLength ?? null };

    // Fetch research data from conversation if available
    let researchKeywords: string[] = [];
    let researchTrends: string[] = [];

    if (listing.conversation_id) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("product_context")
        .eq("id", listing.conversation_id)
        .single();

      if (conversation?.product_context?.research_data) {
        const rd = conversation.product_context.research_data;
        researchKeywords = rd.keywords ?? [];
        researchTrends = rd.trends ?? [];
      }
    }

    // Build prompt and call AI
    const keywordStrategyText = [
      profile.keywordStrategy.primaryPlacement,
      ...profile.keywordStrategy.tips,
    ].join(". ");

    const prompt = buildPrompt(
      listing as Listing,
      titleConstraints,
      keywordStrategyText,
      researchKeywords,
      researchTrends
    );

    const model = getGeminiGenerateModel();
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    // Parse the JSON response
    let variants: Array<{ title: string; strategy: string; notes: string }>;
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
      variants = JSON.parse(cleaned);
      if (!Array.isArray(variants)) {
        return jsonError("AI returned invalid format", 502);
      }
    } catch {
      return jsonError("Failed to parse AI response", 502);
    }

    // Score each variant and filter out banned-term violations
    const scoredVariants = variants
      .map((v) => {
        const { score, violations } = scoreTitleVariant(v.title, content, marketplace);
        const hasBannedTerms = violations.some((viol) => viol.rule === "banned_term");
        return {
          title: v.title,
          strategy: v.strategy,
          notes: v.notes,
          score,
          violations,
          hasBannedTerms,
        };
      })
      .filter((v) => !v.hasBannedTerms)
      .sort((a, b) => b.score - a.score);

    // Score the current title for comparison
    const currentScore = scoreTitleVariant(content.title, content, marketplace);

    return jsonSuccess({
      variants: scoredVariants.map(({ hasBannedTerms: _, ...rest }) => rest),
      current: {
        title: content.title,
        score: currentScore.score,
      },
    });
  } catch {
    return jsonError("Internal server error", 500);
  }
}
