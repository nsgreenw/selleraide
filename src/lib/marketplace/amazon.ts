import type { MarketplaceProfile } from "./types";

export const amazonProfile: MarketplaceProfile = {
  id: "amazon",
  name: "amazon",
  displayName: "Amazon",
  icon: "ShoppingCart",

  fields: [
    {
      name: "title",
      maxLength: 200,
      required: true,
      htmlAllowed: false,
      description:
        "Product title. Must include brand, key feature, product type, size/quantity. No ALL CAPS.",
    },
    {
      name: "bullets",
      maxLength: null,
      required: true,
      htmlAllowed: false,
      description:
        "5 benefit-driven bullet points. Each starts with a capitalized short phrase (2-4 words) followed by a benefit statement. Max 500 chars each.",
    },
    {
      name: "description",
      maxLength: 2000,
      required: true,
      htmlAllowed: false,
      description:
        "Product description. Plain text only — HTML deprecated since 2021. Expands on bullets with storytelling. Remains indexed by A9 even when A+ Content is active.",
    },
    {
      name: "backend_keywords",
      maxLength: null,
      maxBytes: 250,
      required: false,
      htmlAllowed: false,
      description:
        "Backend search terms (space-separated). Max 250 bytes. Do not repeat words already in the title. No ASINs, competitor brand names, or subjective claims.",
    },
  ],

  bannedTerms: [
    {
      pattern: /\b#\s*1\b/gi,
      term: "#1",
      reason:
        "Unsubstantiated ranking claims violate Amazon's product listing policies.",
      severity: "error",
    },
    {
      pattern: /\bnumber\s+one\b/gi,
      term: "number one",
      reason:
        "Unsubstantiated ranking claims violate Amazon's product listing policies.",
      severity: "error",
    },
    {
      pattern: /\bbest\s+seller\b/gi,
      term: "best seller",
      reason:
        "Only Amazon can award Best Seller badges. Claiming this status is prohibited.",
      severity: "error",
    },
    {
      pattern: /\bguarantee\b/gi,
      term: "guarantee",
      reason:
        "Guarantee claims require substantiation and are restricted by Amazon policies.",
      severity: "error",
    },
    {
      pattern: /\bguaranteed\b/gi,
      term: "guaranteed",
      reason:
        "Guarantee claims require substantiation and are restricted by Amazon policies.",
      severity: "error",
    },
    {
      pattern: /100\s*%/g,
      term: "100%",
      reason:
        "Absolute percentage claims are considered unsubstantiated and may trigger listing suppression.",
      severity: "error",
    },
    {
      pattern: /\bfree\s+shipping\b/gi,
      term: "free shipping",
      reason:
        "Shipping terms are controlled by Amazon. Mentioning shipping in listing content is prohibited.",
      severity: "error",
    },
    {
      pattern: /\bact\s+now\b/gi,
      term: "act now",
      reason:
        "Urgency-based pressure tactics are not allowed in Amazon product listings.",
      severity: "error",
    },
    {
      pattern: /\blimited\s+time\b/gi,
      term: "limited time",
      reason:
        "Time-sensitive claims create false urgency and violate listing policies.",
      severity: "error",
    },
    {
      pattern: /\bFDA\s+approved\b/gi,
      term: "FDA approved",
      reason:
        "FDA approval claims require official authorization and are strictly regulated.",
      severity: "error",
    },
    {
      pattern: /\bclinically\s+proven\b/gi,
      term: "clinically proven",
      reason:
        "Medical efficacy claims require clinical evidence and regulatory clearance.",
      severity: "error",
    },
    {
      pattern: /\bcure\b/gi,
      term: "cure",
      reason:
        "Medical treatment claims are prohibited unless the product is an approved drug or device.",
      severity: "error",
    },
    {
      pattern: /\btreats\b/gi,
      term: "treats",
      reason:
        "Medical treatment claims are prohibited unless the product is an approved drug or device.",
      severity: "error",
    },
    {
      pattern:
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      term: "emoji",
      reason:
        "Emojis are not allowed in Amazon product listing content. Use plain text only.",
      severity: "error",
    },
    {
      pattern: /\bcheap\b/gi,
      term: "cheap",
      reason:
        "The word 'cheap' undermines perceived value and can trigger quality concerns.",
      severity: "warning",
    },
    {
      pattern: /\bbuy\s+now\b/gi,
      term: "buy now",
      reason:
        "Transactional CTAs in listing content are discouraged by Amazon style guidelines.",
      severity: "warning",
    },
    {
      pattern: /\bhurry\b/gi,
      term: "hurry",
      reason:
        "Urgency language is discouraged and may be flagged during listing review.",
      severity: "warning",
    },
  ],

  scoringWeights: [
    {
      criterion: "title_keyword_richness",
      weight: 0.20,
      description: "Relevance + keyword placement",
    },
    {
      criterion: "title_quality_readability",
      weight: 0.15,
      description: "Title quality/readability",
    },
    {
      criterion: "bullet_quality",
      weight: 0.20,
      description: "Bullet uniqueness/benefit clarity",
    },
    {
      criterion: "description_completeness",
      weight: 0.10,
      description: "Description depth/clarity",
    },
    {
      criterion: "compliance_safety",
      weight: 0.20,
      description: "Compliance safety (no banned terms)",
    },
    {
      criterion: "attribute_completeness",
      weight: 0.05,
      description: "Attribute completeness",
    },
    {
      criterion: "a_plus_content",
      weight: 0.10,
      description: "A+ Content module quality",
    },
  ],

  keywordStrategy: {
    primaryPlacement: "title",
    secondaryPlacement: "bullets",
    maxKeywordsTitle: 5,
    backendField: "backend_keywords",
    backendMaxBytes: 250,
    tips: [
      "Place the highest-volume keyword as close to the start of the title as possible.",
      "Do NOT repeat words in backend keywords that already appear in the title — Amazon indexes them automatically.",
      "Use singular or plural form (not both) — Amazon's A9 algorithm stems words.",
      "Separate backend keywords with spaces, not commas or semicolons.",
      "Include common misspellings and Spanish-language synonyms if relevant to your market.",
      "Never include competitor brand names or ASINs in backend keywords.",
      "Use all 250 bytes — underutilization is lost opportunity; over-limit causes all terms to be ignored.",
    ],
  },

  photoSlots: [
    {
      slot: 1,
      name: "Main Image",
      type: "main",
      description:
        "Product on pure white background (RGB 255,255,255). Product fills 85%+ of frame. No text, logos, or watermarks.",
      tips: [
        "Minimum 1000x1000px (2000x2000px recommended for zoom).",
        "Use professional studio lighting with soft shadows.",
        "Product must be the exact item the customer receives.",
        "No props, accessories, or items not included in the sale.",
      ],
    },
    {
      slot: 2,
      name: "Lifestyle Image",
      type: "lifestyle",
      description:
        "Product in use in its intended environment. Shows the target customer interacting with the product.",
      tips: [
        "Match your target demographic in model selection.",
        "Use natural, aspirational settings relevant to your niche.",
        "Product should be clearly identifiable, not lost in the scene.",
        "Evoke the emotional benefit of owning the product.",
      ],
    },
    {
      slot: 3,
      name: "Infographic — Features",
      type: "infographic",
      description:
        "Annotated image highlighting 3-5 key features with callout text and icons.",
      tips: [
        "Keep text large enough to read on mobile (minimum 30px at 1000px width).",
        "Use icons or arrows to connect callouts to specific product areas.",
        "Limit to 5 callouts maximum — too many clutters the image.",
        "Use brand-consistent colors and fonts.",
      ],
    },
    {
      slot: 4,
      name: "Detail Shot",
      type: "detail",
      description:
        "Close-up showing texture, material quality, stitching, or craftsmanship details.",
      tips: [
        "Use macro photography to show fine details.",
        "Highlight premium materials or construction quality.",
        "Include a brief caption if the detail is not self-explanatory.",
        "Show what differentiates you from cheaper alternatives.",
      ],
    },
    {
      slot: 5,
      name: "Scale / Size Reference",
      type: "scale",
      description:
        "Product next to a common reference object (hand, coin, ruler) to communicate size.",
      tips: [
        "Use universally understood reference objects.",
        "Include dimensions as text overlay if appropriate.",
        "Helpful for categories where size is a common return reason.",
        "Consider showing the product next to a hand for immediate scale.",
      ],
    },
    {
      slot: 6,
      name: "Packaging / What's in the Box",
      type: "packaging",
      description:
        "Flat-lay or arranged shot showing every item included in the package.",
      tips: [
        "Label each included item if there are multiple components.",
        "Show the packaging if it's gift-ready or premium.",
        "Clarify exactly what the customer receives to reduce returns.",
        "Use a clean, uncluttered background.",
      ],
    },
    {
      slot: 7,
      name: "Lifestyle Variant",
      type: "lifestyle",
      description:
        "Second lifestyle shot showing an alternative use case, setting, or customer segment.",
      tips: [
        "Show a different use case than slot 2.",
        "Target a secondary audience or occasion.",
        "Can be seasonal or situational to broaden appeal.",
        "Pair with an A+ Content module below the fold for maximum impact.",
      ],
    },
  ],

  promptModifier: `You are generating a product listing for Amazon Seller Central. Follow these rules strictly:

TITLE RULES:
- Maximum 200 characters. Structure: Brand + Key Feature + Product Type + Size/Quantity/Color.
- Capitalize the first letter of each word (Title Case) except articles, prepositions, and conjunctions.
- Do NOT use ALL CAPS for any word except brand names or established acronyms.
- Place the highest-volume keyword as early in the title as possible for A9 algorithm visibility.
- Do not include price, promotional language, or subjective claims.

BULLET POINT RULES:
- Exactly 5 bullet points. Each starts with a CAPITALIZED short phrase (2-4 words) followed by a dash or colon, then the benefit statement.
- Lead each bullet with a benefit, not a feature. Use "so that" framing internally.
- Each bullet should cover a distinct topic: (1) primary benefit/USP, (2) key feature, (3) quality/materials, (4) use cases/compatibility, (5) trust/brand/warranty.
- Maximum 500 characters each. Keep sentences scannable — no walls of text.

DESCRIPTION RULES:
- Maximum 2000 characters. Use basic HTML: <br>, <b>, <ul>, <li>.
- Expand on the bullet points with storytelling and emotional language.
- Include secondary keywords naturally. Do not keyword-stuff.
- Address the customer directly ("you" / "your").

BACKEND KEYWORDS RULES:
- Maximum 250 bytes (not characters — multi-byte characters count more).
- Do NOT repeat any word that already appears in the title.
- Separate terms with single spaces. No commas, no punctuation.
- Include: synonyms, alternate spellings, Spanish terms (if US market), abbreviations.
- Exclude: competitor brand names, ASINs, subjective claims, temporary terms like "new" or "sale".

GENERAL:
- Never use banned terms: #1, best seller, guarantee, 100%, free shipping, act now, limited time, FDA approved, clinically proven, cure, treats.
- No emojis anywhere in the listing.
- Write at an 8th-grade reading level for maximum accessibility.
- Every claim must be substantiated or phrased as a benefit rather than an absolute.

A+ CONTENT MODULE RULES:
Generate exactly {APLUS_MODULE_COUNT} A+ Content modules in the "a_plus_modules" JSON array.
Use the "aplus_module_count" value from the product context to determine how many modules to generate (default: 4).

Each module object must have:
- "type": one of the STANDARD_* module types listed below
- "position": sequential integer starting at 1
- "headline": conversion-focused headline (module-appropriate length)
- "body": persuasive copy for conversion — NOT keyword-optimized
- "image": { "alt_text": "100-char max, keyword-rich", "image_guidance": "describe the ideal photo" }

INDEXING RULES (critical):
- A+ body text is NOT indexed by Amazon's A9 search algorithm. Write for conversion, not SEO.
- Image alt_text IS partially indexed. Use relevant product keywords in every alt_text field.
- The standard "description" field remains indexed even when A+ Content is active. Keep it keyword-rich.

DEFAULT 7-MODULE STACK (use all 7 for Pro/Agency; use modules 1, 2, 3, 5 for 4-module Starter):
1. STANDARD_HEADER_IMAGE_TEXT — Hero banner: brand story headline + aspirational body (min 970x600px image)
2. STANDARD_SINGLE_SIDE_IMAGE (imagePositionType: LEFT) — Primary benefit/USP
3. STANDARD_SINGLE_SIDE_IMAGE (imagePositionType: RIGHT) — Secondary feature/differentiator
4. STANDARD_THREE_IMAGE_TEXT — Three use cases or target customer segments (3 images required)
5. STANDARD_SINGLE_IMAGE_HIGHLIGHTS — "Why choose us": body text + up to 5 bullet highlights
6. STANDARD_TECH_SPECS — 4–8 key specifications as "specs" record (label: value pairs)
7. STANDARD_PRODUCT_DESCRIPTION — Brand storytelling body (up to 6000 chars, no image required)

For 4-module stack: generate modules 1, 2, 3, 5 (skip 4, 6, 7).

BANNED TERMS apply to all A+ text fields — same list as the main listing.
Never use pricing, shipping, or time-sensitive language in A+ content.`,

  listingShape: [
    "title",
    "bullet_points",
    "description",
    "backend_search_terms",
    "attributes",
    "compliance_notes",
    "assumptions",
    "a_plus_modules",
  ],
};
