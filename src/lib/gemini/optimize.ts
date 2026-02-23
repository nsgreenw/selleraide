import type { Marketplace, QAResult } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { getGeminiGenerateModel } from "./client";
import { normalizeStringArray } from "./normalization";

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

export async function optimizeListing(input: OptimizeInput): Promise<OptimizeResult> {
  const { marketplace, title, bullets, description, backend_keywords, score, validation, breakdown } = input;
  const profile = getMarketplaceProfile(marketplace);
  const mode = getMode(score);

  // Field limits from the marketplace profile
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

  const outputKeys = isAmazon
    ? `"title", "bullet_points" (array of exactly 5 strings), "description", "backend_keywords" (space-separated string, max 250 bytes)`
    : `"title", "bullet_points" (array of strings), "description"`;

  const prompt = `You are an expert ecommerce copywriter optimizing an existing ${profile.displayName} listing.

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

FIELD LIMITS:
- Title: max ${titleMax} characters
- Each bullet: max ${bulletMax} characters — write exactly 5 bullets
- Description: max ${descMax} characters
- Banned terms (never use): ${bannedTermsList}

KEYWORD STRATEGY:
- Front-load primary keywords in the title
- Reinforce in bullets and description naturally — never keyword-stuff
${isAmazon ? "- Backend keywords: space-separated, no repeating words already in title, max 250 bytes" : ""}

OUTPUT: Return ONLY a valid JSON object with these keys: ${outputKeys}`;

  const result = await getGeminiGenerateModel().generateContent(prompt);
  const responseText = result.response.text();

  let data: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    data = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse optimization response from Gemini");
  }

  const optimizedTitle = String(data.title ?? title);
  const optimizedBullets = Array.isArray(data.bullet_points)
    ? normalizeStringArray(data.bullet_points)
    : bullets;
  const optimizedDescription = String(data.description ?? description);
  const optimizedKeywords = isAmazon && data.backend_keywords
    ? String(data.backend_keywords)
    : backend_keywords;

  return {
    title: optimizedTitle,
    bullets: optimizedBullets,
    description: optimizedDescription,
    ...(isAmazon && optimizedKeywords ? { backend_keywords: optimizedKeywords } : {}),
    mode,
  };
}
