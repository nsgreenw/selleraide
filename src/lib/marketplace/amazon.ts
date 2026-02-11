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
      name: "bullet_1",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "First bullet point. Lead with the strongest benefit or unique selling proposition.",
    },
    {
      name: "bullet_2",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Second bullet point. Highlight a key feature and its benefit to the customer.",
    },
    {
      name: "bullet_3",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Third bullet point. Address quality, materials, or construction details.",
    },
    {
      name: "bullet_4",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Fourth bullet point. Cover use cases, compatibility, or included accessories.",
    },
    {
      name: "bullet_5",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Fifth bullet point. Mention warranty, satisfaction guarantee details, or brand story.",
    },
    {
      name: "description",
      maxLength: 2000,
      required: true,
      htmlAllowed: true,
      description:
        "Product description. Supports basic HTML (<br>, <b>, <ul>, <li>). Expands on bullets with storytelling.",
    },
    {
      name: "backend_keywords",
      maxLength: null,
      maxBytes: 250,
      required: false,
      htmlAllowed: false,
      description:
        "Search terms (backend). Max 250 bytes. Do not repeat words already in the title. Use spaces, not commas. No ASINs, brand names of competitors, or subjective claims.",
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
      weight: 0.2,
      description:
        "Title includes primary and secondary keywords naturally without keyword stuffing.",
    },
    {
      criterion: "bullet_quality",
      weight: 0.2,
      description:
        "Bullets are benefit-driven, scannable, and each covers a distinct selling point.",
    },
    {
      criterion: "backend_keywords_utilization",
      weight: 0.15,
      description:
        "Backend search terms use close to 250 bytes without repeating title words.",
    },
    {
      criterion: "banned_terms_absence",
      weight: 0.15,
      description:
        "Listing is free of all banned terms that would risk suppression or policy violations.",
    },
    {
      criterion: "description_completeness",
      weight: 0.1,
      description:
        "Description expands on bullets with storytelling, use cases, and brand narrative.",
    },
    {
      criterion: "title_length_optimization",
      weight: 0.05,
      description:
        "Title is between 80-200 characters, maximizing visibility without truncation.",
    },
    {
      criterion: "readability",
      weight: 0.05,
      description:
        "Content is written at an accessible reading level, avoiding jargon where possible.",
    },
    {
      criterion: "formatting_compliance",
      weight: 0.05,
      description:
        "No ALL CAPS words (except brand/acronyms), proper punctuation, no special characters abuse.",
    },
    {
      criterion: "benefit_driven_language",
      weight: 0.05,
      description:
        "Features are translated into customer benefits using 'so that' or 'which means' framing.",
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
- Every claim must be substantiated or phrased as a benefit rather than an absolute.`,

  listingShape: [
    "title",
    "bullet_1",
    "bullet_2",
    "bullet_3",
    "bullet_4",
    "bullet_5",
    "description",
    "backend_keywords",
  ],
};
