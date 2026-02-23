import type { Marketplace, QAResult, APlusModule } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { getGeminiGenerateModel } from "./client";
import { normalizeStringArray, normalizeAPlusModules } from "./normalization";

export type OptimizeMode = "targeted" | "moderate" | "full";

// Subset of ScoreBreakdown — optimize only needs criterion, score, and notes
interface BreakdownItem {
  criterion: string;
  score: number;
  notes?: string;
}

export interface OptimizeInput {
  marketplace: Marketplace;
  title: string;
  bullets: string[];
  description: string;
  backend_keywords?: string;
  score: number;
  validation: QAResult[];
  breakdown: BreakdownItem[];
}

export interface OptimizeResult {
  title: string;
  bullets: string[];
  description: string;
  backend_keywords?: string;
  a_plus_modules?: APlusModule[];
  mode: OptimizeMode;
}

function getMode(score: number): OptimizeMode {
  if (score >= 70) return "targeted";
  if (score >= 40) return "moderate";
  return "full";
}

const MODE_INSTRUCTIONS: Record<OptimizeMode, string> = {
  targeted:
    "Make TARGETED improvements only. Preserve the seller's existing voice, structure, and " +
    "overall content. Fix the specific validation issues listed above. Only modify sections " +
    "with identified problems — leave sections that score well completely unchanged.",
  moderate:
    "This listing needs MODERATE IMPROVEMENT. Restructure weak sections and fix all validation " +
    "issues while preserving accurate product facts from the original. Keep the seller's intent " +
    "but improve clarity, keyword placement, benefit framing, and compliance.",
  full:
    "This listing needs a FULL REWRITE. Extract the product facts and details from the original " +
    "content, then generate a high-quality listing from scratch following all marketplace best " +
    "practices. Write compelling, benefit-led copy with natural keyword placement.",
};

// Exact list of benefit words the scorer recognizes as bullet starters (scorer.ts BENEFIT_WORDS)
const BENEFIT_WORDS_LIST =
  "easy, fast, premium, durable, comfortable, lightweight, portable, versatile, powerful, " +
  "efficient, reliable, secure, safe, natural, organic, eco-friendly, waterproof, adjustable, " +
  "ergonomic, compact, professional, heavy-duty, long-lasting, non-toxic, hypoallergenic, " +
  "breathable, stainless, rechargeable, cordless, universal, multi-purpose, high-quality, ultra, " +
  "perfect, designed, ideal, enhanced, improved, advanced, innovative, seamless, smooth, sturdy, " +
  "flexible, maximize, protect, save, enjoy, transform, upgrade, boost, includes, features, " +
  "delivers, ensures, provides, supports";

export async function optimizeListing(input: OptimizeInput): Promise<OptimizeResult> {
  const { marketplace, title, bullets, description, backend_keywords, score, validation, breakdown } = input;
  const profile = getMarketplaceProfile(marketplace);
  const mode = getMode(score);

  const titleMax = profile.fields.find(f => f.name === "title")?.maxLength ?? 200;
  const descMax = profile.fields.find(f => f.name === "description")?.maxLength ?? 2000;
  const bulletMax = profile.fields.find(f =>
    f.name === "bullet_points" || f.name.startsWith("bullet_")
  )?.maxLength ?? 500;

  const bannedTermsList = profile.bannedTerms.map(bt => bt.term).join(", ");
  const isAmazon = marketplace === "amazon";

  // Errors and warnings only, capped at 10
  const actionableIssues = validation
    .filter(v => v.severity === "error" || v.severity === "warning")
    .slice(0, 10);

  // Weakest areas first, capped at 5
  const weakAreas = [...breakdown]
    .filter(b => b.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const bulletsSection = bullets.length > 0
    ? bullets.map((b, i) => `  ${i + 1}. ${b}`).join("\n")
    : "  (none provided)";

  const issuesSection = actionableIssues.length > 0
    ? actionableIssues.map(v => `  - [${v.severity.toUpperCase()}] ${v.message}`).join("\n")
    : "  None flagged";

  const weakAreasSection = weakAreas.length > 0
    ? weakAreas.map(b =>
        `  - ${b.criterion.replace(/_/g, " ")}: ${b.score}/100${b.notes ? ` — ${b.notes}` : ""}`
      ).join("\n")
    : "  None";

  // Exact scoring rubric so Claude knows precisely what the scorer measures
  const scoringRubric = isAmazon ? `
SCORING RUBRIC — hit these targets to reach 90+:

TITLE (35% of total score):
- Word count: 10-15 words = 100pts; 7-10 words = 90pts; fewer than 7 words scores much lower
- Length: 120-180 characters (60-90% of ${titleMax} max) = 100pts for length optimization
- Readability: average word length under 5 characters improves readability score

BULLETS (20% of total score — all 5 bullets scored individually then averaged):
- Length (worth 35pts per bullet): each bullet MUST be 150+ characters
- Opening word (worth 25pts): the FIRST word of the bullet must be one of these exactly:
  ${BENEFIT_WORDS_LIST}
- Specific number or measurement (worth 15pts): include at least one digit, dimension, capacity, weight, count, or percentage in every bullet
- Closing punctuation (worth 10pts): end each bullet with a period
- Word variety (worth 15pts): use 8+ unique words per bullet — substantive bullets already do this

DESCRIPTION (10% of total score):
- Length sweet spot: 600-1600 characters (30-80% of ${descMax}) = 90pts; shorter or longer scores lower
- Paragraph structure: use 2+ paragraphs separated by a blank line for a +5 bonus
- Benefit language: include 5+ distinct benefit words from the list above for maximum score

BACKEND KEYWORDS (fills A9 index — target 225+ bytes):
- Fill 225-250 bytes of the 250-byte limit for 100pts
- Space-separated only — no commas, no punctuation
- Do NOT repeat any word already in the title` : "";

  const aplusInstructions = isAmazon ? `

A+ CONTENT MODULES (10% of total score — required to reach 90+):
Generate exactly 4 A+ Content modules in the "a_plus_modules" array. These appear on the Amazon
product page below the fold and improve conversion. NOTE: A+ body text is NOT indexed by Amazon's
search algorithm — write body text for conversion, not SEO. Image alt_text IS partially indexed —
use relevant product keywords in every alt_text field (max 100 characters).

Module stack (4-module Starter):
1. STANDARD_HEADER_IMAGE_TEXT (position 1) — Hero banner with brand story headline and aspirational body
2. STANDARD_SINGLE_SIDE_IMAGE (position 2) — Primary benefit or USP
3. STANDARD_SINGLE_SIDE_IMAGE (position 3) — Secondary feature or differentiator
4. STANDARD_SINGLE_IMAGE_HIGHLIGHTS (position 4) — "Why choose us": body text + 3-5 highlight bullets

Each module object structure:
{
  "type": "MODULE_TYPE",
  "position": N,
  "headline": "Conversion-focused headline (under 160 chars)",
  "body": "Persuasive copy focused on benefits and emotion (NOT keyword-optimized)",
  "image": {
    "alt_text": "Keyword-rich description, max 100 chars — this IS indexed",
    "image_guidance": "Brief description of the ideal photo for this module"
  }
}

Module 4 (STANDARD_SINGLE_IMAGE_HIGHLIGHTS) should also include:
  "highlights": ["Highlight 1 (under 100 chars)", "Highlight 2", "Highlight 3"]

A+ scoring: modules present = 30pts base; all modules with body text = +20; all image alt_text populated and ≤100 chars = +20; alt_text average ≥20 chars = +15; 3+ distinct module types = +15.` : "";

  const outputKeys = isAmazon
    ? `"title", "bullet_points" (array of exactly 5 strings), "description", "backend_keywords" (space-separated, targeting 225+ bytes), "a_plus_modules" (array of 4 module objects as specified)`
    : `"title", "bullet_points" (array of strings), "description"`;

  const prompt = `You are an expert ecommerce copywriter optimizing an existing ${profile.displayName} listing to maximize its quality score. Your goal is to produce a listing that scores 90 or above.

CURRENT LISTING (Score: ${score}/100):
Title: ${title}
Bullets:
${bulletsSection}
Description: ${description}${backend_keywords ? `\nBackend Keywords: ${backend_keywords}` : ""}

VALIDATION ISSUES TO FIX:
${issuesSection}

WEAKEST SCORING AREAS:
${weakAreasSection}

OPTIMIZATION MODE: ${mode.toUpperCase()}
${MODE_INSTRUCTIONS[mode]}
${scoringRubric}
FIELD LIMITS:
- Title: max ${titleMax} characters
- Each bullet: max ${bulletMax} characters — write exactly 5 bullets
- Description: max ${descMax} characters
- Banned terms (never use): ${bannedTermsList}

KEYWORD STRATEGY:
- Front-load primary keywords in the title
- Reinforce in bullets and description naturally — never keyword-stuff
${isAmazon ? "- Backend keywords: space-separated, no commas, no words already in title, target 225+ bytes" : ""}
${aplusInstructions}

OUTPUT: Return ONLY a valid JSON object with these keys: ${outputKeys}`;

  const result = await getGeminiGenerateModel().generateContent(prompt);
  const responseText = result.response.text();

  let data: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    data = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse optimization response from Claude");
  }

  const optimizedTitle = String(data.title ?? title);
  const optimizedBullets = Array.isArray(data.bullet_points)
    ? normalizeStringArray(data.bullet_points)
    : bullets;
  const optimizedDescription = String(data.description ?? description);
  const optimizedKeywords = isAmazon && data.backend_keywords
    ? String(data.backend_keywords)
    : backend_keywords;
  const optimizedAPlusModules =
    isAmazon && Array.isArray(data.a_plus_modules) && data.a_plus_modules.length > 0
      ? normalizeAPlusModules(data.a_plus_modules)
      : undefined;

  return {
    title: optimizedTitle,
    bullets: optimizedBullets,
    description: optimizedDescription,
    ...(isAmazon && optimizedKeywords ? { backend_keywords: optimizedKeywords } : {}),
    ...(optimizedAPlusModules ? { a_plus_modules: optimizedAPlusModules } : {}),
    mode,
  };
}
