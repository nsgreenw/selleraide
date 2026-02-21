import type { ListingContent, Marketplace, QAResult, QAGrade } from "@/types";
import { getGrade } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import type { ScoringWeight, FieldConstraint } from "@/lib/marketplace/types";

// ─── Types ────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  criterion: string;
  weight: number;
  score: number;
  weightedScore: number;
  notes: string;
}

// ─── Criterion scoring functions ──────────────────────────────────────
//
// Each function returns { score: 0–100, notes: string }.
// They receive the full context so they can inspect any part of the listing.

interface CriterionContext {
  content: ListingContent;
  marketplace: Marketplace;
  validationResults: QAResult[];
  fields: FieldConstraint[];
}

type CriterionFn = (ctx: CriterionContext) => { score: number; notes: string };

// ── title_keyword_richness ────────────────────────────────────────────

const scoreTitleKeywordRichness: CriterionFn = ({ content }) => {
  const title = content.title?.trim() ?? "";
  if (!title) return { score: 0, notes: "Title is empty" };

  const words = title.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Unique meaningful words (exclude very short filler words)
  const fillerWords = new Set([
    "a", "an", "the", "and", "or", "for", "of", "in", "on", "to", "by",
    "is", "it", "at", "as", "with", "&",
  ]);
  const meaningfulWords = words.filter((w) => !fillerWords.has(w.toLowerCase()));
  const uniqueMeaningful = new Set(meaningfulWords.map((w) => w.toLowerCase()));

  let score: number;
  if (wordCount <= 2) {
    score = 15;
  } else if (wordCount <= 4) {
    score = 40;
  } else if (wordCount <= 6) {
    score = 65;
  } else if (wordCount <= 10) {
    score = 90;
  } else if (wordCount <= 15) {
    score = 100;
  } else {
    // Very long titles can be keyword-stuffed — slight penalty
    score = 85;
  }

  // Bonus for keyword variety (unique meaningful words / total words)
  const varietyRatio = uniqueMeaningful.size / Math.max(wordCount, 1);
  if (varietyRatio >= 0.7) {
    score = Math.min(100, score + 5);
  }

  const notes =
    `${wordCount} words, ${uniqueMeaningful.size} unique keywords` +
    (wordCount > 15 ? " (may be overstuffed)" : "");

  return { score, notes };
};

// ── bullet_quality / feature_quality ──────────────────────────────────

const BENEFIT_WORDS = new Set([
  "easy", "fast", "premium", "durable", "comfortable", "lightweight",
  "portable", "versatile", "powerful", "efficient", "reliable", "secure",
  "safe", "natural", "organic", "eco-friendly", "waterproof", "adjustable",
  "ergonomic", "compact", "professional", "heavy-duty", "long-lasting",
  "non-toxic", "hypoallergenic", "breathable", "stainless", "rechargeable",
  "cordless", "universal", "multi-purpose", "high-quality", "ultra",
  "perfect", "designed", "ideal", "enhanced", "improved", "advanced",
  "innovative", "seamless", "smooth", "sturdy", "flexible", "maximize",
  "protect", "save", "enjoy", "transform", "upgrade", "boost",
  "includes", "features", "delivers", "ensures", "provides", "supports",
]);

function scoreBulletArray(bullets: string[] | undefined): {
  score: number;
  notes: string;
} {
  if (!bullets || bullets.length === 0) {
    return { score: 0, notes: "No bullets/features provided" };
  }

  let totalScore = 0;
  const bulletCount = bullets.length;
  const issues: string[] = [];

  for (let i = 0; i < bulletCount; i++) {
    const bullet = bullets[i].trim();
    let bulletScore = 0;

    // Length scoring
    if (bullet.length >= 150) {
      bulletScore += 35;
    } else if (bullet.length >= 100) {
      bulletScore += 30;
    } else if (bullet.length >= 50) {
      bulletScore += 20;
    } else if (bullet.length >= 20) {
      bulletScore += 10;
    } else {
      bulletScore += 2;
      issues.push(`Bullet ${i + 1} too short (${bullet.length} chars)`);
    }

    // Starts with a benefit/action word
    const firstWord = bullet.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    if (BENEFIT_WORDS.has(firstWord)) {
      bulletScore += 25;
    } else {
      // Check if any benefit word appears in first 5 words
      const firstFive = bullet
        .split(/\s+/)
        .slice(0, 5)
        .map((w) => w.toLowerCase().replace(/[^a-z-]/g, ""));
      if (firstFive.some((w) => BENEFIT_WORDS.has(w))) {
        bulletScore += 15;
      }
    }

    // Ends with punctuation or complete thought
    if (/[.!)]$/.test(bullet)) {
      bulletScore += 10;
    }

    // Contains specific detail (numbers, measurements, specifications)
    if (/\d/.test(bullet)) {
      bulletScore += 15;
    }

    // Variety: check that bullet isn't just repeating the title words
    const bulletWords = new Set(bullet.toLowerCase().split(/\s+/));
    if (bulletWords.size >= 8) {
      bulletScore += 15;
    }

    totalScore += Math.min(100, bulletScore);
  }

  const avgScore = Math.round(totalScore / bulletCount);

  // Penalize having too few bullets
  let finalScore = avgScore;
  if (bulletCount < 3) {
    finalScore = Math.round(avgScore * 0.7);
    issues.push(`Only ${bulletCount} bullets — aim for 5+`);
  } else if (bulletCount < 5) {
    finalScore = Math.round(avgScore * 0.85);
  }

  const notes =
    `${bulletCount} bullets, avg quality ${avgScore}/100` +
    (issues.length > 0 ? `. Issues: ${issues.join("; ")}` : "");

  return { score: Math.min(100, Math.max(0, finalScore)), notes };
}

const scoreBulletQuality: CriterionFn = ({ content }) => {
  return scoreBulletArray(content.bullets);
};

// ── backend_keywords_utilization ──────────────────────────────────────

const scoreBackendKeywordsUtilization: CriterionFn = ({
  content,
  marketplace,
  fields,
}) => {
  if (marketplace === "amazon") {
    const bkField = fields.find((f) => f.name === "backend_keywords");
    const maxBytes = bkField?.maxBytes ?? 250;
    const keywords = content.backend_keywords?.trim() ?? "";

    if (!keywords) {
      return { score: 0, notes: "Backend keywords empty — wasting indexing opportunity" };
    }

    const usedBytes = new TextEncoder().encode(keywords).length;
    const utilizationPct = Math.round((usedBytes / maxBytes) * 100);

    let score: number;
    if (utilizationPct >= 90) {
      score = 100;
    } else if (utilizationPct >= 70) {
      score = 85;
    } else if (utilizationPct >= 50) {
      score = 65;
    } else if (utilizationPct >= 25) {
      score = 40;
    } else {
      score = 20;
    }

    // Check for commas (Amazon recommends spaces, not commas)
    if (keywords.includes(",")) {
      score = Math.max(0, score - 10);
    }

    // Check for duplicate words
    const words = keywords.toLowerCase().split(/\s+/);
    const unique = new Set(words);
    if (unique.size < words.length * 0.8) {
      score = Math.max(0, score - 15);
    }

    return {
      score,
      notes: `${usedBytes}/${maxBytes} bytes used (${utilizationPct}%)${
        keywords.includes(",") ? " — avoid commas" : ""
      }`,
    };
  }

  // Shopify / eBay / Walmart — check SEO-related fields
  if (marketplace === "shopify") {
    const hasSeoTitle = !!content.seo_title?.trim();
    const hasMetaDesc = !!content.meta_description?.trim();
    const hasTags = !!content.tags && content.tags.length > 0;

    let score = 0;
    const parts: string[] = [];

    if (hasSeoTitle) {
      score += 35;
      parts.push("SEO title present");
    } else {
      parts.push("Missing SEO title");
    }
    if (hasMetaDesc) {
      score += 35;
      parts.push("meta description present");
    } else {
      parts.push("missing meta description");
    }
    if (hasTags) {
      const tagCount = content.tags!.length;
      score += Math.min(30, tagCount * 5);
      parts.push(`${tagCount} tags`);
    } else {
      parts.push("no tags");
    }

    return { score: Math.min(100, score), notes: parts.join(", ") };
  }

  // eBay / Walmart: check if item_specifics or attributes are filled
  const hasItemSpecifics =
    content.item_specifics && Object.keys(content.item_specifics).length > 0;
  const hasAttributes =
    content.attributes && Object.keys(content.attributes).length > 0;

  let score = 50; // baseline
  const parts: string[] = [];
  if (hasItemSpecifics) {
    const count = Object.keys(content.item_specifics!).length;
    score += Math.min(30, count * 5);
    parts.push(`${count} item specifics`);
  }
  if (hasAttributes) {
    const count = Object.keys(content.attributes!).length;
    score += Math.min(30, count * 5);
    parts.push(`${count} attributes`);
  }
  if (parts.length === 0) {
    parts.push("No structured metadata provided");
    score = 30;
  }

  return { score: Math.min(100, score), notes: parts.join(", ") };
};

// ── banned_terms_absence ──────────────────────────────────────────────

const scoreBannedTermsAbsence: CriterionFn = ({ validationResults }) => {
  const bannedResults = validationResults.filter((r) => r.rule === "banned_term");
  if (bannedResults.length === 0) {
    return { score: 100, notes: "No banned terms detected" };
  }

  let score = 100;
  let errorCount = 0;
  let warningCount = 0;

  for (const r of bannedResults) {
    if (r.severity === "error") {
      score -= 25;
      errorCount++;
    } else if (r.severity === "warning") {
      score -= 10;
      warningCount++;
    }
  }

  const notes =
    `${bannedResults.length} banned term(s) found` +
    (errorCount > 0 ? `, ${errorCount} error(s)` : "") +
    (warningCount > 0 ? `, ${warningCount} warning(s)` : "");

  return { score: Math.max(0, score), notes };
};

// ── description_completeness ──────────────────────────────────────────

const scoreDescriptionCompleteness: CriterionFn = ({ content, fields }) => {
  const desc = content.description?.trim() ?? "";
  if (!desc) {
    return { score: 0, notes: "Description is empty" };
  }

  const descField = fields.find(
    (f) => f.name === "description" || f.name === "shelf_description"
  );
  const maxLength = descField?.maxLength ?? 2000;

  const lengthRatio = desc.length / maxLength;
  const issues: string[] = [];

  // Length scoring (sweet spot: 30%–80% of max)
  let score: number;
  if (lengthRatio >= 0.3 && lengthRatio <= 0.8) {
    score = 90;
  } else if (lengthRatio >= 0.15 && lengthRatio < 0.3) {
    score = 60;
  } else if (lengthRatio > 0.8 && lengthRatio <= 1.0) {
    score = 80;
  } else if (lengthRatio < 0.15) {
    score = 30;
    issues.push("very short");
  } else {
    score = 70; // Over max but still has content
  }

  // Has paragraph structure (multiple lines or paragraphs)
  const paragraphs = desc.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 2) {
    score = Math.min(100, score + 5);
  } else {
    issues.push("single block of text");
  }

  // Has formatting (HTML tags like <br>, <p>, <ul>, or markdown-style lists)
  const hasFormatting =
    /<[a-z][\s\S]*?>/i.test(desc) || /^[-*•]\s/m.test(desc) || /^\d+\.\s/m.test(desc);
  if (hasFormatting) {
    score = Math.min(100, score + 5);
  }

  // Contains benefit-driven language
  const descLower = desc.toLowerCase();
  const benefitHits = Array.from(BENEFIT_WORDS).filter((w) =>
    descLower.includes(w)
  );
  if (benefitHits.length >= 5) {
    score = Math.min(100, score + 5);
  } else if (benefitHits.length >= 2) {
    score = Math.min(100, score + 3);
  }

  const notes =
    `${desc.length}/${maxLength} chars (${Math.round(lengthRatio * 100)}%)` +
    (issues.length > 0 ? `. ${issues.join(", ")}` : "");

  return { score: Math.max(0, Math.min(100, score)), notes };
};

// ── title_length_optimization ─────────────────────────────────────────

const scoreTitleLengthOptimization: CriterionFn = ({ content, fields }) => {
  const title = content.title?.trim() ?? "";
  if (!title) return { score: 0, notes: "Title is empty" };

  const titleField = fields.find((f) => f.name === "title");
  const maxLength = titleField?.maxLength ?? 200;

  const length = title.length;
  const ratio = length / maxLength;

  // Sweet spot is 60%–90% of max length
  let score: number;
  if (ratio >= 0.6 && ratio <= 0.9) {
    score = 100;
  } else if (ratio >= 0.45 && ratio < 0.6) {
    score = 80;
  } else if (ratio > 0.9 && ratio <= 1.0) {
    score = 85; // Close to max is fine, slightly less optimal
  } else if (ratio >= 0.25 && ratio < 0.45) {
    score = 55;
  } else if (ratio < 0.25) {
    score = 25;
  } else {
    score = 40; // Over max
  }

  let note: string;
  if (ratio < 0.45) {
    note = `${length}/${maxLength} chars — title is underutilized, add more keywords`;
  } else if (ratio >= 0.6 && ratio <= 0.9) {
    note = `${length}/${maxLength} chars — optimal length`;
  } else if (ratio > 1.0) {
    note = `${length}/${maxLength} chars — exceeds maximum`;
  } else {
    note = `${length}/${maxLength} chars`;
  }

  return { score, notes: note };
};

// ── readability ───────────────────────────────────────────────────────

const scoreReadability: CriterionFn = ({ content }) => {
  // Combine all text content for readability analysis
  const texts: string[] = [];
  if (content.title) texts.push(content.title);
  if (content.bullets) texts.push(...content.bullets);
  if (content.description) texts.push(content.description);

  const fullText = texts.join(" ");
  if (!fullText.trim()) return { score: 0, notes: "No text content to analyze" };

  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return { score: 0, notes: "No words found" };

  // Average word length (target: <8 characters)
  const avgWordLength =
    words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, "").length, 0) / words.length;

  let score: number;
  if (avgWordLength <= 5) {
    score = 95;
  } else if (avgWordLength <= 6) {
    score = 90;
  } else if (avgWordLength <= 7) {
    score = 80;
  } else if (avgWordLength <= 8) {
    score = 65;
  } else {
    score = 45;
  }

  // Sentence variety: check that sentences aren't all the same length
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 3) {
    const sentenceLengths = sentences.map((s) => s.trim().split(/\s+/).length);
    const avgSentLen =
      sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance =
      sentenceLengths.reduce((sum, l) => sum + Math.pow(l - avgSentLen, 2), 0) /
      sentenceLengths.length;
    const stdDev = Math.sqrt(variance);

    // Higher std deviation = more variety = better
    if (stdDev >= 5) {
      score = Math.min(100, score + 5);
    } else if (stdDev < 2) {
      score = Math.max(0, score - 10);
    }
  }

  // Penalize very long unbroken blocks (no line breaks in long text)
  if (fullText.length > 500 && !fullText.includes("\n")) {
    score = Math.max(0, score - 10);
  }

  const notes =
    `Avg word length: ${avgWordLength.toFixed(1)} chars, ${sentences.length} sentence(s)`;

  return { score: Math.max(0, Math.min(100, score)), notes };
};

// ── formatting_compliance ─────────────────────────────────────────────

const scoreFormattingCompliance: CriterionFn = ({ content }) => {
  let score = 100;
  const issues: string[] = [];

  // Title checks
  if (content.title) {
    const title = content.title.trim();

    // ALL CAPS check
    const letters = title.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 0 && letters === letters.toUpperCase()) {
      score -= 25;
      issues.push("title is ALL CAPS");
    }

    // Excessive punctuation (!!!, ???, ...)
    if (/[!?]{2,}/.test(title)) {
      score -= 15;
      issues.push("excessive punctuation in title");
    }

    // Leading/trailing whitespace (beyond trim)
    if (/\s{2,}/.test(title)) {
      score -= 5;
      issues.push("double spaces in title");
    }
  }

  // Bullet checks
  if (content.bullets) {
    let capsCount = 0;
    for (const bullet of content.bullets) {
      const bulletLetters = bullet.replace(/[^a-zA-Z]/g, "");
      if (
        bulletLetters.length > 5 &&
        bulletLetters === bulletLetters.toUpperCase()
      ) {
        capsCount++;
      }
    }
    if (capsCount > 0) {
      score -= capsCount * 10;
      issues.push(`${capsCount} bullet(s) in ALL CAPS`);
    }

    // Check for consistent bullet formatting (start with uppercase)
    let lowercaseStarts = 0;
    for (const bullet of content.bullets) {
      const trimmed = bullet.trim();
      if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
        lowercaseStarts++;
      }
    }
    if (lowercaseStarts > 0 && lowercaseStarts < content.bullets.length) {
      score -= 5;
      issues.push("inconsistent bullet capitalization");
    }
  }

  // Description: check for orphan HTML (unclosed tags)
  if (content.description) {
    const openTags = (content.description.match(/<[a-z][^/]*?>/gi) || []).length;
    const closeTags = (content.description.match(/<\/[a-z]+>/gi) || []).length;
    if (openTags > 0 && Math.abs(openTags - closeTags) > 1) {
      score -= 10;
      issues.push("possible unclosed HTML tags in description");
    }
  }

  const notes = issues.length > 0 ? issues.join(", ") : "Formatting looks clean";

  return { score: Math.max(0, score), notes };
};

// ── benefit_driven_language ───────────────────────────────────────────

const scoreBenefitDrivenLanguage: CriterionFn = ({ content }) => {
  const texts: string[] = [];
  if (content.title) texts.push(content.title);
  if (content.bullets) texts.push(...content.bullets);
  if (content.description) texts.push(content.description);

  const fullText = texts.join(" ").toLowerCase();
  if (!fullText.trim()) return { score: 0, notes: "No text to analyze" };

  const totalWords = fullText.split(/\s+/).filter((w) => w.length > 0).length;
  if (totalWords === 0) return { score: 0, notes: "No words found" };

  // Count unique benefit words found
  const foundBenefits = new Set<string>();
  for (const word of BENEFIT_WORDS) {
    if (fullText.includes(word)) {
      foundBenefits.add(word);
    }
  }

  // Also count power phrases
  const powerPhrases = [
    "you can", "you'll", "perfect for", "designed for", "ideal for",
    "great for", "works with", "compatible with", "comes with",
    "backed by", "guaranteed", "money back", "risk free", "free shipping",
    "easy to use", "ready to use", "no assembly", "plug and play",
    "all-in-one", "step by step",
  ];
  let phraseCount = 0;
  for (const phrase of powerPhrases) {
    if (fullText.includes(phrase)) phraseCount++;
  }

  const benefitDensity = foundBenefits.size + phraseCount;

  let score: number;
  if (benefitDensity >= 15) {
    score = 100;
  } else if (benefitDensity >= 10) {
    score = 90;
  } else if (benefitDensity >= 7) {
    score = 75;
  } else if (benefitDensity >= 4) {
    score = 60;
  } else if (benefitDensity >= 2) {
    score = 40;
  } else {
    score = 15;
  }

  const notes =
    `${foundBenefits.size} benefit word(s), ${phraseCount} power phrase(s) detected`;

  return { score, notes };
};

// ── seo_optimization ──────────────────────────────────────────────────

const scoreSeoOptimization: CriterionFn = ({ content, marketplace }) => {
  if (marketplace !== "shopify") {
    // For non-Shopify, this criterion should be skipped via weights, but
    // return a neutral score just in case.
    return { score: 50, notes: "SEO optimization criterion not primary for this marketplace" };
  }

  let score = 0;
  const parts: string[] = [];

  // SEO title: optimal 50-60 chars
  if (content.seo_title?.trim()) {
    const len = content.seo_title.trim().length;
    if (len >= 50 && len <= 60) {
      score += 35;
      parts.push(`SEO title optimal (${len} chars)`);
    } else if (len >= 30 && len <= 70) {
      score += 25;
      parts.push(`SEO title acceptable (${len} chars)`);
    } else {
      score += 10;
      parts.push(`SEO title suboptimal (${len} chars)`);
    }
  } else {
    parts.push("Missing SEO title");
  }

  // Meta description: optimal 120-160 chars
  if (content.meta_description?.trim()) {
    const len = content.meta_description.trim().length;
    if (len >= 120 && len <= 160) {
      score += 35;
      parts.push(`meta desc optimal (${len} chars)`);
    } else if (len >= 80 && len <= 200) {
      score += 25;
      parts.push(`meta desc acceptable (${len} chars)`);
    } else {
      score += 10;
      parts.push(`meta desc suboptimal (${len} chars)`);
    }
  } else {
    parts.push("missing meta description");
  }

  // Tags
  if (content.tags && content.tags.length > 0) {
    const tagCount = content.tags.length;
    if (tagCount >= 10) {
      score += 30;
    } else if (tagCount >= 5) {
      score += 20;
    } else {
      score += 10;
    }
    parts.push(`${tagCount} tag(s)`);
  } else {
    parts.push("no tags");
  }

  return { score: Math.min(100, score), notes: parts.join(", ") };
};

// ── item_specifics_completeness ───────────────────────────────────────
// Checks eBay item specifics coverage.

const scoreItemSpecificsCompleteness: CriterionFn = ({ content }) => {
  const specifics = content.item_specifics;
  if (!specifics || Object.keys(specifics).length === 0) {
    return { score: 0, notes: "No item specifics provided" };
  }

  const entries = Object.entries(specifics);
  const total = entries.length;
  const filled = entries.filter(([, v]) => {
    if (typeof v !== "string") return false;
    const trimmed = v.trim();
    return trimmed.length > 0 && trimmed.toLowerCase() !== "null";
  }).length;
  const fillRate = filled / total;

  let score: number;
  if (total >= 10 && fillRate >= 0.9) {
    score = 100;
  } else if (total >= 7 && fillRate >= 0.8) {
    score = 85;
  } else if (total >= 5 && fillRate >= 0.7) {
    score = 70;
  } else if (total >= 3) {
    score = 50;
  } else {
    score = 25;
  }

  return {
    score,
    notes: `${filled}/${total} item specifics filled (${Math.round(fillRate * 100)}%)`,
  };
};

// ── title_quality_readability ─────────────────────────────────────────
// Combines title length optimization + readability into one criterion (50/50).

const scoreTitleQualityReadability: CriterionFn = (ctx) => {
  const len = scoreTitleLengthOptimization(ctx);
  const read = scoreReadability(ctx);
  const score = Math.round((len.score + read.score) / 2);
  return { score, notes: `Length: ${len.notes}; Readability: ${read.notes}` };
};

// ── attribute_completeness ────────────────────────────────────────────
// Checks content.attributes for Amazon required + optional keys.

const scoreAttributeCompleteness: CriterionFn = ({ content }) => {
  const required = ["brand", "condition"];
  const optional = ["material", "color", "size", "model"];
  const attrs = content.attributes ?? {};
  const filled = Object.entries(attrs).filter(([, v]) => {
    if (typeof v !== "string") return false;
    const trimmed = v.trim();
    return trimmed.length > 0 && trimmed.toLowerCase() !== "null";
  }).length;
  const hasRequired = required.every((k) => {
    const value = attrs[k];
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.toLowerCase() !== "null";
  });
  let score = hasRequired ? 60 : 20;
  score += Math.min(40, filled * 8); // up to 5 extra keys = full 40pts
  return {
    score: Math.min(100, score),
    notes: `${filled} of ${required.length + optional.length} attributes filled`,
  };
};

// ── condition_disclosure ──────────────────────────────────────────────
// Checks eBay flaw/condition transparency.

const scoreConditionDisclosure: CriterionFn = ({ content }) => {
  const hasConditionNotes = content.condition_notes && content.condition_notes.length > 0;
  const descLower = (content.description ?? "").toLowerCase();
  const conditionWords = ["condition", "used", "like new", "refurbished", "wear", "scratch", "flaw", "open box", "new"];
  const foundCondition = conditionWords.filter(w => descLower.includes(w)).length;
  let score = hasConditionNotes ? 70 : 30;
  score += Math.min(30, foundCondition * 6);
  return {
    score: Math.min(100, score),
    notes: hasConditionNotes
      ? `Condition notes present; ${foundCondition} condition term(s) in description`
      : `No condition_notes; ${foundCondition} condition term(s) in description`,
  };
};

// ── listing_completeness ──────────────────────────────────────────────
// Checks eBay shipping/returns/category presence.

const scoreListingCompleteness: CriterionFn = ({ content }) => {
  let score = 0;
  const parts: string[] = [];
  if (content.shipping_notes?.trim()) { score += 35; parts.push("shipping notes"); }
  if (content.returns_notes?.trim()) { score += 35; parts.push("returns notes"); }
  if (content.category_hint?.trim()) { score += 30; parts.push("category hint"); }
  return {
    score,
    notes: parts.length > 0 ? parts.join(", ") + " present" : "Missing shipping/returns/category",
  };
};

// ─── Criterion registry ───────────────────────────────────────────────

export const CRITERION_FUNCTIONS: Record<string, CriterionFn> = {
  title_keyword_richness: scoreTitleKeywordRichness,
  bullet_quality: scoreBulletQuality,
  feature_quality: scoreBulletQuality, // alias — some marketplaces call them "features"
  backend_keywords_utilization: scoreBackendKeywordsUtilization,
  banned_terms_absence: scoreBannedTermsAbsence,
  // compliance_safety is an alias for banned_terms_absence
  compliance_safety: scoreBannedTermsAbsence,
  description_completeness: scoreDescriptionCompleteness,
  title_length_optimization: scoreTitleLengthOptimization,
  title_quality_readability: scoreTitleQualityReadability,
  readability: scoreReadability,
  formatting_compliance: scoreFormattingCompliance,
  benefit_driven_language: scoreBenefitDrivenLanguage,
  seo_optimization: scoreSeoOptimization,
  attribute_completeness: scoreAttributeCompleteness,
  condition_disclosure: scoreConditionDisclosure,
  listing_completeness: scoreListingCompleteness,
  item_specifics_completeness: scoreItemSpecificsCompleteness,
};

// ─── Main export ──────────────────────────────────────────────────────

/**
 * Scores a listing against marketplace-specific weighted criteria.
 *
 * Each criterion is scored 0-100, then multiplied by its weight.
 * The final score is the sum of weighted scores, rounded to an integer.
 *
 * Only criteria listed in the marketplace profile's `scoringWeights` are
 * evaluated — unrecognized criteria are skipped with a log warning.
 */
export function scoreListing(
  content: ListingContent,
  marketplace: Marketplace,
  validationResults: QAResult[]
): { score: number; grade: QAGrade; breakdown: ScoreBreakdown[] } {
  const profile = getMarketplaceProfile(marketplace);
  const weights: ScoringWeight[] = profile.scoringWeights;

  const ctx: CriterionContext = {
    content,
    marketplace,
    validationResults,
    fields: profile.fields,
  };

  const breakdown: ScoreBreakdown[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const sw of weights) {
    const fn = CRITERION_FUNCTIONS[sw.criterion];
    if (!fn) {
      // Unknown criterion — skip silently
      continue;
    }

    const { score: rawScore, notes } = fn(ctx);
    const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const weightedScore = sw.weight * clampedScore;

    breakdown.push({
      criterion: sw.criterion,
      weight: sw.weight,
      score: clampedScore,
      weightedScore: Math.round(weightedScore * 100) / 100,
      notes,
    });

    totalWeightedScore += weightedScore;
    totalWeight += sw.weight;
  }

  // Normalize: if weights don't sum to 1, scale proportionally
  let finalScore: number;
  if (totalWeight > 0 && Math.abs(totalWeight - 1) > 0.001) {
    finalScore = Math.round(totalWeightedScore / totalWeight);
  } else {
    finalScore = Math.round(totalWeightedScore);
  }

  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    score: finalScore,
    grade: getGrade(finalScore),
    breakdown,
  };
}
