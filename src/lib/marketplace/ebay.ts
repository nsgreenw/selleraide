import type { MarketplaceProfile } from "./types";

export const ebayProfile: MarketplaceProfile = {
  id: "ebay",
  name: "ebay",
  displayName: "eBay",
  icon: "Gavel",

  fields: [
    {
      name: "title",
      maxLength: 80,
      required: true,
      htmlAllowed: false,
      description:
        "Listing title. Maximum 80 characters. Include key identifiers: Brand + Model + Key Specs + Condition. eBay's Cassini algorithm heavily weights title keywords.",
    },
    {
      name: "subtitle",
      maxLength: 55,
      required: false,
      htmlAllowed: false,
      description:
        "Optional subtitle (paid feature). Adds a secondary line below the title in search results. Use for a compelling hook or additional keywords not in the title.",
    },
    {
      name: "description",
      maxLength: null,
      required: true,
      htmlAllowed: true,
      description:
        "Full HTML description with no character limit. Supports rich formatting, tables, and embedded images. Must be mobile-responsive. eBay is moving away from active content (JavaScript, iframes).",
    },
    {
      name: "item_specifics",
      maxLength: null,
      required: true,
      htmlAllowed: false,
      description:
        "Structured item specifics (JSONB). Fill in all category-required and recommended specifics. Critical for Cassini search ranking and Best Match placement.",
    },
  ],

  bannedTerms: [
    {
      pattern: /\bfake\b/gi,
      term: "fake",
      reason:
        "Implies inauthenticity. eBay's VeRO program strictly prohibits counterfeit-related terminology.",
      severity: "error",
    },
    {
      pattern: /\breplica\b/gi,
      term: "replica",
      reason:
        "Replica listings violate eBay's counterfeit goods policy and may result in account suspension.",
      severity: "error",
    },
    {
      pattern: /\bcounterfeit\b/gi,
      term: "counterfeit",
      reason:
        "Counterfeit references violate eBay's VeRO intellectual property policy.",
      severity: "error",
    },
    {
      pattern: /\bknockoff\b/gi,
      term: "knockoff",
      reason:
        "Implies the product is an unauthorized copy, which violates eBay listing policies.",
      severity: "error",
    },
    {
      pattern: /\bunauthorized\b/gi,
      term: "unauthorized",
      reason:
        "Suggests the item is not legitimately sourced, creating trust and policy issues.",
      severity: "error",
    },
    {
      pattern: /\b#\s*1\b/gi,
      term: "#1",
      reason:
        "Unsubstantiated ranking claims are not permitted on eBay listings.",
      severity: "error",
    },
    {
      pattern: /\bguarantee\b/gi,
      term: "guarantee",
      reason:
        "Guarantee claims must be substantiated. Use eBay's Money Back Guarantee reference instead.",
      severity: "error",
    },
    {
      pattern: /100\s*%/g,
      term: "100%",
      reason:
        "Absolute percentage claims are considered unsubstantiated.",
      severity: "error",
    },
    {
      pattern: /\bfree\s+shipping\b/gi,
      term: "free shipping",
      reason:
        "Shipping terms should be configured in listing settings, not mentioned in the description text.",
      severity: "warning",
    },
    {
      pattern: /\bact\s+now\b/gi,
      term: "act now",
      reason:
        "High-pressure urgency language is discouraged in eBay listing descriptions.",
      severity: "warning",
    },
    {
      pattern: /\blimited\s+time\b/gi,
      term: "limited time",
      reason:
        "Time-pressure language is discouraged. eBay auctions already have natural urgency.",
      severity: "warning",
    },
    {
      pattern:
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      term: "emoji",
      reason:
        "Emojis may render inconsistently across eBay platforms and are best avoided.",
      severity: "warning",
    },
  ],

  scoringWeights: [
    {
      criterion: "title_keyword_richness",
      weight: 0.20,
      description: "Title relevance + 80-char compliance",
    },
    {
      criterion: "item_specifics_completeness",
      weight: 0.30,
      description: "Item specifics completeness",
    },
    {
      criterion: "description_completeness",
      weight: 0.15,
      description: "Description clarity/accuracy",
    },
    {
      criterion: "condition_disclosure",
      weight: 0.15,
      description: "Condition transparency/flaw disclosure",
    },
    {
      criterion: "listing_completeness",
      weight: 0.10,
      description: "Shipping/returns/category present",
    },
    {
      criterion: "compliance_safety",
      weight: 0.10,
      description: "Policy/compliance safety",
    },
  ],

  keywordStrategy: {
    primaryPlacement: "title",
    secondaryPlacement: "item_specifics",
    maxKeywordsTitle: 4,
    backendField: null,
    tips: [
      "eBay's Cassini search heavily weights the title — use all 80 characters wisely.",
      "Item specifics function like structured keywords; fill in every available field.",
      "Cassini prioritizes exact keyword matches — use the exact phrases buyers search for.",
      "The subtitle is indexed for search but is a paid feature; use it strategically for high-value items.",
      "eBay does not have a backend keywords field — all SEO must be in visible content and item specifics.",
      "Include model numbers, part numbers, and UPCs in item specifics for long-tail search visibility.",
      "Avoid keyword stuffing in the title; Cassini penalizes unnatural repetition.",
    ],
  },

  photoSlots: [
    {
      slot: 1,
      name: "Main Image",
      type: "main",
      description:
        "Clear product photo on white or neutral background. Must accurately represent the item being sold.",
      tips: [
        "Minimum 500x500px (1600x1600px recommended for eBay zoom feature).",
        "No watermarks, text overlays, or borders.",
        "Product must fill at least 60% of the frame.",
        "White or light gray background preferred for Best Match boost.",
      ],
    },
    {
      slot: 2,
      name: "Alternate Angle",
      type: "detail",
      description:
        "Product from a different angle showing features not visible in the main image.",
      tips: [
        "Show the back, side, or bottom of the product.",
        "Critical for items where condition matters (e.g., used, refurbished).",
        "Helps build buyer confidence and reduce 'not as described' returns.",
      ],
    },
    {
      slot: 3,
      name: "Detail / Close-Up",
      type: "detail",
      description:
        "Close-up shot highlighting specific details: labels, serial numbers, material quality, or unique features.",
      tips: [
        "Show brand labels, authenticity marks, or serial numbers for branded items.",
        "Highlight any imperfections honestly for used/refurbished items.",
        "Detail shots build trust and support premium pricing.",
      ],
    },
    {
      slot: 4,
      name: "Lifestyle / In-Use",
      type: "lifestyle",
      description:
        "Product being used or displayed in a real-world context.",
      tips: [
        "Show the product in its intended environment.",
        "Helps buyers visualize ownership.",
        "Particularly effective for clothing, home goods, and electronics.",
      ],
    },
    {
      slot: 5,
      name: "Scale Reference",
      type: "scale",
      description:
        "Product shown next to a reference object or with measurements visible.",
      tips: [
        "Include a ruler, hand, or common object for size reference.",
        "Reduces size-related returns significantly.",
        "Add dimension callouts as text overlays if helpful.",
      ],
    },
    {
      slot: 6,
      name: "Package Contents",
      type: "packaging",
      description:
        "Everything included in the listing laid out clearly.",
      tips: [
        "Show every item the buyer will receive.",
        "Label components if there are multiple pieces.",
        "Clearly differentiate what is and is not included.",
        "Essential for lots, bundles, and multi-piece items.",
      ],
    },
    {
      slot: 7,
      name: "Infographic / Specs",
      type: "infographic",
      description:
        "Image with key specifications, compatibility info, or comparison data overlaid.",
      tips: [
        "Useful for electronics, auto parts, and technical products.",
        "Include compatibility charts or 'fits' information.",
        "Keep text legible on mobile devices.",
        "Use clean, professional design consistent with your brand.",
      ],
    },
  ],

  promptModifier: `You are generating a product listing for eBay. Follow these rules strictly:

TITLE RULES:
- Maximum 80 characters. Every character is valuable for Cassini search ranking.
- Structure: Brand + Model + Key Specs + Condition (if relevant) + Product Type.
- Do NOT use filler words like "wow", "look", "L@@K", "amazing", or excessive punctuation.
- Include model numbers, sizes, and colors if they are common search terms.
- No ALL CAPS for marketing emphasis (brand names and established acronyms are acceptable).

SUBTITLE RULES:
- Maximum 55 characters. This is a paid feature so make it count.
- Use for a compelling value proposition or keywords that did not fit in the title.
- Example: "Ships Free — 30 Day Returns — Authentic with Receipt"

DESCRIPTION RULES:
- No character limit, but be comprehensive without being verbose.
- Use clean, mobile-responsive HTML. Supported: <h2>, <h3>, <p>, <br>, <b>, <strong>, <em>, <ul>, <ol>, <li>, <table>, <tr>, <td>.
- NO active content: no JavaScript, no iframes, no external CSS, no forms.
- Structure with clear sections: Product Overview, Features & Specifications, What's Included, Condition Details, Shipping & Returns.
- eBay buyers are detail-oriented — include specifications, dimensions, materials, compatibility, and condition notes.

ITEM SPECIFICS RULES:
- Fill in ALL required and recommended category-specific item specifics.
- Common specifics: Brand, MPN (Manufacturer Part Number), UPC/EAN/ISBN, Color, Size, Material, Condition, Model, Type.
- Item specifics are critical for Cassini ranking and filtering — more specifics = better visibility.
- Use standardized values from eBay's dropdown menus where possible.

CONDITION NOTES (condition_notes):
- Provide an array of strings describing the item's condition, any flaws, wear, or imperfections.
- Be transparent and specific: e.g. ["Minor scratch on bottom", "All original accessories included"].
- For new items, confirm "New, unused, in original packaging".

SHIPPING NOTES (shipping_notes):
- Provide a brief placeholder describing shipping intent, e.g. "Ships within 1 business day via USPS First Class".
- This will be used as a reference; actual shipping is configured in eBay listing settings.

RETURNS NOTES (returns_notes):
- Provide a brief returns policy placeholder, e.g. "30-day returns accepted. Buyer pays return shipping".

CATEGORY HINT (category_hint):
- Suggest the most appropriate eBay category path, e.g. "Electronics > Cameras & Photo > Digital Cameras".

COMPLIANCE NOTES (compliance_notes):
- Array of any regulatory or policy compliance notes relevant to the listing, e.g. ["Authentic item — not a replica", "CE certified"].

ASSUMPTIONS (assumptions):
- Array of any assumptions made during listing generation, e.g. ["Assumed item is in used condition based on description"].

GENERAL:
- NEVER use terms associated with counterfeit goods: fake, replica, counterfeit, knockoff, unauthorized.
- eBay's VeRO program aggressively enforces intellectual property — never reference brands unless selling authentic branded items.
- Be transparent about condition: "Like New", "Good — Minor Wear", "For Parts or Repair".
- Address buyer concerns proactively: authenticity, condition, return policy, shipping speed.
- eBay buyers compare across multiple listings — differentiate with detail, honesty, and professionalism.`,

  listingShape: [
    "title",
    "subtitle",
    "description",
    "item_specifics",
    "condition_notes",
    "shipping_notes",
    "returns_notes",
    "category_hint",
    "compliance_notes",
    "assumptions",
  ],
};
