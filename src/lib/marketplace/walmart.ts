import type { MarketplaceProfile } from "./types";

export const walmartProfile: MarketplaceProfile = {
  id: "walmart",
  name: "walmart",
  displayName: "Walmart Marketplace",
  icon: "Store",

  fields: [
    {
      name: "title",
      maxLength: 75,
      required: true,
      htmlAllowed: false,
      description:
        "Product name. Keep concise: Brand + Product Type + Defining Attributes. Walmart truncates titles aggressively on mobile.",
    },
    {
      name: "feature_1",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "First key feature. Lead with the most compelling benefit or differentiator.",
    },
    {
      name: "feature_2",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Second key feature. Highlight materials, quality, or construction.",
    },
    {
      name: "feature_3",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Third key feature. Cover use cases or compatibility details.",
    },
    {
      name: "feature_4",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Fourth key feature. Address sizing, included items, or setup instructions.",
    },
    {
      name: "feature_5",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Fifth key feature. Brand story, warranty, or customer support details.",
    },
    {
      name: "shelf_description",
      maxLength: 500,
      required: true,
      htmlAllowed: false,
      description:
        "Short shelf description shown in search results and category pages. Must be punchy and keyword-rich.",
    },
    {
      name: "description",
      maxLength: 4000,
      required: true,
      htmlAllowed: true,
      description:
        "Long description. Supports HTML (<p>, <br>, <b>, <ul>, <li>). Provide detailed product information, use cases, and brand story.",
    },
    {
      name: "attributes",
      maxLength: null,
      required: false,
      htmlAllowed: false,
      description:
        "Structured product attributes (JSONB). Fill in as many Walmart category-specific attributes as possible for Listing Quality Score.",
    },
  ],

  bannedTerms: [
    {
      pattern: /\bamazon\b/gi,
      term: "Amazon",
      reason:
        "References to competing marketplaces are strictly prohibited on Walmart listings.",
      severity: "error",
    },
    {
      pattern: /\bprime\b/gi,
      term: "Prime",
      reason:
        "References to Amazon Prime or competing membership programs are not allowed.",
      severity: "error",
    },
    {
      pattern: /\bcheap\b/gi,
      term: "cheap",
      reason:
        "Walmart positions itself on value, not cheapness. Use 'affordable' or 'great value' instead.",
      severity: "error",
    },
    {
      pattern: /\bbest\s+seller\b/gi,
      term: "best seller",
      reason:
        "Unsubstantiated ranking claims are not permitted on Walmart Marketplace.",
      severity: "error",
    },
    {
      pattern: /\b#\s*1\b/gi,
      term: "#1",
      reason:
        "Unverifiable ranking claims violate Walmart's listing content policies.",
      severity: "error",
    },
    {
      pattern: /\bguarantee\b/gi,
      term: "guarantee",
      reason:
        "Guarantee claims require substantiation. Use specific warranty terms instead.",
      severity: "error",
    },
    {
      pattern: /100\s*%/g,
      term: "100%",
      reason:
        "Absolute percentage claims are considered unsubstantiated on Walmart.",
      severity: "error",
    },
    {
      pattern: /\blimited\s+time\b/gi,
      term: "limited time",
      reason:
        "Promotional urgency language is not allowed in Walmart product content.",
      severity: "error",
    },
    {
      pattern: /\bfree\s+shipping\b/gi,
      term: "free shipping",
      reason:
        "Shipping terms are managed by Walmart. Do not reference shipping in listing content.",
      severity: "error",
    },
    {
      pattern: /\bFDA\s+approved\b/gi,
      term: "FDA approved",
      reason:
        "FDA approval claims require regulatory authorization documentation.",
      severity: "error",
    },
    {
      pattern: /\bclinically\s+proven\b/gi,
      term: "clinically proven",
      reason:
        "Medical efficacy claims require clinical evidence and are strictly regulated.",
      severity: "error",
    },
    {
      pattern:
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      term: "emoji",
      reason:
        "Emojis are not allowed in Walmart Marketplace listing content.",
      severity: "error",
    },
  ],

  scoringWeights: [
    {
      criterion: "title_keyword_richness",
      weight: 0.2,
      description:
        "Title includes top search keywords within the strict 75-character limit.",
    },
    {
      criterion: "key_features_quality",
      weight: 0.2,
      description:
        "Key features are benefit-driven, unique per bullet, and keyword-optimized.",
    },
    {
      criterion: "shelf_description_effectiveness",
      weight: 0.1,
      description:
        "Shelf description is compelling, keyword-rich, and within 500 characters.",
    },
    {
      criterion: "description_completeness",
      weight: 0.15,
      description:
        "Long description uses HTML formatting, covers all product aspects, and includes keywords.",
    },
    {
      criterion: "banned_terms_absence",
      weight: 0.1,
      description:
        "Listing is free of competitor references and all banned terms.",
    },
    {
      criterion: "attribute_completeness",
      weight: 0.1,
      description:
        "Product attributes are populated to maximize Walmart Listing Quality Score.",
    },
    {
      criterion: "readability",
      weight: 0.05,
      description:
        "Content is scannable, free of jargon, and accessible to a broad audience.",
    },
    {
      criterion: "formatting_compliance",
      weight: 0.05,
      description:
        "No ALL CAPS, no special characters abuse, proper HTML in description.",
    },
    {
      criterion: "benefit_driven_language",
      weight: 0.05,
      description:
        "Features are framed as customer benefits, not raw specifications.",
    },
  ],

  keywordStrategy: {
    primaryPlacement: "title",
    secondaryPlacement: "key_features",
    maxKeywordsTitle: 3,
    backendField: null,
    tips: [
      "Walmart's search algorithm weighs the title very heavily — prioritize the top 2-3 keywords there.",
      "Walmart does not have a backend keywords field; all keywords must be in visible content.",
      "Use the shelf description as a secondary keyword opportunity — it appears in search results.",
      "Fill in as many structured attributes as possible; they function like backend keywords on Walmart.",
      "Do not repeat the exact same keyword phrase across title and features — use variations and synonyms.",
      "Walmart's algorithm favors exact-match keywords more than Amazon's — be precise.",
    ],
  },

  photoSlots: [
    {
      slot: 1,
      name: "Main Image",
      type: "main",
      description:
        "Product on pure white background. Clear, professional studio shot showing the product as-is.",
      tips: [
        "Minimum 1000x1000px (Walmart requires at least 300x300px but higher is better).",
        "Product must fill at least 75% of the image frame.",
        "No text overlays, badges, or promotional stickers.",
        "White background (RGB 255,255,255).",
      ],
    },
    {
      slot: 2,
      name: "Lifestyle Image",
      type: "lifestyle",
      description:
        "Product in context showing real-world usage that resonates with Walmart's customer base.",
      tips: [
        "Focus on family-friendly, value-oriented lifestyle imagery.",
        "Show the product being used in everyday settings (home, yard, office).",
        "Walmart shoppers respond well to relatable, practical imagery.",
        "Ensure the product is the clear focal point.",
      ],
    },
    {
      slot: 3,
      name: "Feature Callouts",
      type: "infographic",
      description:
        "Annotated image with 3-5 feature callouts highlighting key selling points.",
      tips: [
        "Large, mobile-readable text (Walmart has very high mobile traffic).",
        "Use simple icons and arrows.",
        "Focus on value and practicality — Walmart shoppers are benefit-focused.",
        "Keep design clean and uncluttered.",
      ],
    },
    {
      slot: 4,
      name: "Detail / Material Shot",
      type: "detail",
      description:
        "Close-up showing quality, material, texture, or key construction details.",
      tips: [
        "Highlight durability and quality to combat 'cheap' perception.",
        "Show stitching, material grain, or internal components.",
        "Use good lighting to showcase quality.",
      ],
    },
    {
      slot: 5,
      name: "Size Reference",
      type: "scale",
      description:
        "Product shown with scale reference to communicate dimensions clearly.",
      tips: [
        "Use common household objects for scale.",
        "Include dimension callouts as text overlay.",
        "Critical for furniture, storage, and apparel categories.",
      ],
    },
    {
      slot: 6,
      name: "Package Contents",
      type: "packaging",
      description:
        "Flat-lay or arranged shot showing everything included with the product.",
      tips: [
        "Label each component clearly.",
        "Walmart shoppers are value-conscious — showing 'more in the box' drives conversions.",
        "Use a clean background with clear separation between items.",
      ],
    },
  ],

  promptModifier: `You are generating a product listing for Walmart Marketplace. Follow these rules strictly:

TITLE RULES:
- Maximum 75 characters. This is much shorter than Amazon — every character counts.
- Structure: Brand + Product Type + Key Differentiating Attribute.
- Title Case capitalization. No ALL CAPS, no special characters.
- Front-load the most important keyword. Walmart's algorithm weights title keywords heavily.
- Do not include pricing, promotional language, or subjective claims.

KEY FEATURES RULES:
- Exactly 5 key features. Each should be a standalone selling point.
- Lead with benefits, not specifications. "Keeps drinks cold for 24 hours" beats "Double-wall vacuum insulated."
- Maximum 500 characters each. Keep them scannable for mobile shoppers.
- Cover: (1) primary benefit, (2) materials/quality, (3) use case, (4) sizing/contents, (5) brand/trust.

SHELF DESCRIPTION RULES:
- Maximum 500 characters. This appears in search results and category browse.
- Must be compelling and keyword-rich — it is your search snippet.
- Write a concise paragraph, not bullets.

LONG DESCRIPTION RULES:
- Maximum 4000 characters. Use HTML: <p>, <br>, <b>, <ul>, <li>.
- Provide comprehensive product details, use cases, and brand story.
- Include secondary and long-tail keywords naturally.
- Address the Walmart customer: value-conscious, family-oriented, practical.

ATTRIBUTES:
- Fill in as many category-specific attributes as possible.
- Attributes directly impact Walmart Listing Quality Score and search visibility.
- Include: brand, color, material, size, weight, age group, gender, pattern, etc.

GENERAL:
- NEVER reference Amazon, Prime, or any competing marketplace.
- No emojis, no banned terms (#1, best seller, guarantee, 100%, limited time, free shipping).
- Write at an accessible reading level.
- Walmart's Pro Seller badge and Listing Quality Score reward complete, well-formatted content.`,

  listingShape: [
    "title",
    "feature_1",
    "feature_2",
    "feature_3",
    "feature_4",
    "feature_5",
    "shelf_description",
    "description",
    "attributes",
  ],
};
