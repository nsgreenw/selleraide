import type { MarketplaceProfile } from "./types";

export const etsyProfile: MarketplaceProfile = {
  id: "etsy",
  name: "etsy",
  displayName: "Etsy",
  icon: "FileText",

  fields: [
    {
      name: "title",
      maxLength: 140,
      required: true,
      htmlAllowed: false,
      description:
        "Readable Etsy title. Lead with the item type and strongest differentiators. Front-load search intent, but keep it natural and human.",
    },
    {
      name: "description",
      maxLength: 10000,
      required: true,
      htmlAllowed: false,
      description:
        "Buyer-first description. Open with what the item is, who it is for, and the key benefit. Then cover dimensions, materials, personalization, care, processing, and delivery expectations.",
    },
    {
      name: "tags",
      maxLength: null,
      required: true,
      htmlAllowed: false,
      description:
        "Exactly 13 Etsy tags. Use unique multi-word phrases where possible. Each tag should be 20 characters or fewer.",
    },
    {
      name: "attributes",
      maxLength: null,
      required: true,
      htmlAllowed: false,
      description:
        "Structured Etsy attributes. Include category, recipient, occasion, color, style, holiday, room, or other relevant filter fields.",
    },
    {
      name: "materials",
      maxLength: null,
      required: false,
      htmlAllowed: false,
      description:
        "Materials list. Include specific materials customers search and filter on, such as sterling silver, cotton, oak, soy wax, or PDF template.",
    },
    {
      name: "variations",
      maxLength: null,
      required: false,
      htmlAllowed: false,
      description:
        "Variation options as a JSON object. Keys are variation names like Size or Color. Values are short comma-separated option summaries.",
    },
    {
      name: "personalization_instructions",
      maxLength: 1024,
      required: false,
      htmlAllowed: false,
      description:
        "Concise personalization instructions when applicable. Tell the buyer exactly what to provide and any limits.",
    },
    {
      name: "shipping_notes",
      maxLength: 500,
      required: false,
      htmlAllowed: false,
      description:
        "Shipping and processing summary. Only mention made-to-order timing if the Etsy When Made field is 'made_to_order'. For pre-made items, mention dispatch expectations instead. For digital items, mention instant download delivery.",
    },
    {
      name: "category_hint",
      maxLength: 200,
      required: true,
      htmlAllowed: false,
      description:
        "Suggested Etsy category path or item type hint. Be specific enough that a seller can choose the correct Etsy category and attributes.",
    },
    {
      name: "returns_notes",
      maxLength: 500,
      required: false,
      htmlAllowed: false,
      description:
        "Returns and exchange summary. Mention accepted return windows, exchange policy, or note that digital items are non-refundable.",
    },
  ],

  bannedTerms: [
    {
      pattern: /\bcure\b/gi,
      term: "cure",
      reason:
        "Medical cure claims are risky and can violate consumer protection and platform policy expectations.",
      severity: "error",
    },
    {
      pattern: /\bclinically\s+proven\b/gi,
      term: "clinically proven",
      reason:
        "Clinical efficacy claims require substantiation and are not appropriate without evidence.",
      severity: "error",
    },
    {
      pattern: /\bFDA\s+approved\b/gi,
      term: "FDA approved",
      reason:
        "FDA approval claims require official authorization and should not be used casually in marketplace copy.",
      severity: "error",
    },
    {
      pattern: /\bmiracle\b/gi,
      term: "miracle",
      reason:
        "Unsubstantiated superlative claims reduce trust and can create compliance issues.",
      severity: "error",
    },
    {
      pattern: /\b100\s*%\s+guarantee\b/gi,
      term: "100% guarantee",
      reason:
        "Absolute guarantee language should be avoided unless the terms are explicit and defensible.",
      severity: "warning",
    },
    {
      pattern: /\bbest\s+seller\b/gi,
      term: "best seller",
      reason:
        "Unverified ranking claims add little value and can read as spammy marketplace copy.",
      severity: "warning",
    },
    {
      pattern: /\bfree\s+shipping\b/gi,
      term: "free shipping",
      reason:
        "Etsy handles shipping pricing separately. Do not mention shipping terms in listing copy.",
      severity: "warning",
    },
    {
      pattern: /\bcheap\b/gi,
      term: "cheap",
      reason:
        "Undermines perceived value on a handmade and artisan marketplace.",
      severity: "warning",
    },
    {
      pattern: /\bact\s+now\b/gi,
      term: "act now",
      reason:
        "Pressure tactics are inappropriate for Etsy's marketplace tone.",
      severity: "warning",
    },
    {
      pattern: /\bbuy\s+now\b/gi,
      term: "buy now",
      reason:
        "Transactional pressure language is inappropriate for Etsy listings.",
      severity: "warning",
    },
    {
      pattern:
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      term: "emoji",
      reason:
        "Emojis in listing fields can look unprofessional and may not render correctly in all Etsy contexts.",
      severity: "warning",
    },
  ],

  scoringWeights: [
    {
      criterion: "title_quality_readability",
      weight: 0.18,
      description: "Readable title with strong front-loaded relevance",
    },
    {
      criterion: "title_keyword_richness",
      weight: 0.14,
      description: "Relevant search phrase coverage in the title",
    },
    {
      criterion: "description_completeness",
      weight: 0.16,
      description: "Description depth, clarity, and buyer utility",
    },
    {
      criterion: "attribute_completeness",
      weight: 0.14,
      description: "Filter-driving attributes and listing metadata completeness",
    },
    {
      criterion: "listing_completeness",
      weight: 0.14,
      description: "Materials, shipping notes, category, and variations completeness",
    },
    {
      criterion: "benefit_driven_language",
      weight: 0.08,
      description: "Customer benefit framing and gift/use-case clarity",
    },
    {
      criterion: "readability",
      weight: 0.08,
      description: "Scannable, natural marketplace copy",
    },
    {
      criterion: "compliance_safety",
      weight: 0.08,
      description: "Absence of risky or unsubstantiated claims",
    },
  ],

  keywordStrategy: {
    primaryPlacement: "title",
    secondaryPlacement: "tags and attributes",
    maxKeywordsTitle: 4,
    backendField: null,
    tips: [
      "Use all 13 Etsy tags and keep each tag unique.",
      "Prefer multi-word tags over single words when they match search intent.",
      "Do not waste tags repeating the exact same phrase in multiple forms.",
      "Use attributes and category selection to capture filter-driven traffic instead of repeating those terms in every tag.",
      "Front-load the title with the core item phrase, then add the strongest secondary descriptors.",
      "Write titles for humans first; Etsy rewards relevance, but unreadable keyword strings hurt click-through and conversion.",
      "Personalization, recipient, occasion, material, and style often matter more on Etsy than pure SKU-style specs.",
    ],
  },

  photoSlots: [
    {
      slot: 1,
      name: "Primary Thumbnail",
      type: "main",
      description:
        "A strong first image that clearly shows the item and would earn the click in Etsy search results.",
      tips: [
        "The first image matters most for click-through on Etsy search.",
        "Keep the product large and obvious in the frame.",
        "Avoid clutter, collage-style layouts, or hard-to-read text overlays.",
        "Use styling that matches the target Etsy buyer and category.",
      ],
    },
    {
      slot: 2,
      name: "Scale / Sizing",
      type: "scale",
      description:
        "Show scale, sizing, or dimensions in a way that removes buyer uncertainty.",
      tips: [
        "Include a model, hand, ruler, or room context when relevant.",
        "Size clarity reduces returns and improves buyer confidence.",
      ],
    },
    {
      slot: 3,
      name: "Materials / Detail",
      type: "detail",
      description:
        "Close-up image showing craftsmanship, texture, finish, or material quality.",
      tips: [
        "Etsy buyers respond to visible craftsmanship and texture.",
        "Use this slot to prove quality and uniqueness.",
      ],
    },
    {
      slot: 4,
      name: "Lifestyle / Use Case",
      type: "lifestyle",
      description:
        "Show the item in context or being used, worn, gifted, or displayed.",
      tips: [
        "Lifestyle imagery helps Etsy buyers imagine ownership or gifting.",
        "Match the scene to the intended buyer and occasion.",
      ],
    },
    {
      slot: 5,
      name: "Personalization / Options",
      type: "infographic",
      description:
        "Explain personalization, color, size, or style options clearly if the item is customizable.",
      tips: [
        "Use clean visuals to show available options.",
        "Make the customization process obvious and low-friction.",
      ],
    },
    {
      slot: 6,
      name: "Back / Alternate Angle",
      type: "detail",
      description:
        "Show the reverse or a different perspective of the item.",
      tips: [
        "Reveal details not visible in the primary image.",
        "Helps buyers feel confident about the full product appearance.",
      ],
    },
    {
      slot: 7,
      name: "Gift Packaging",
      type: "packaging",
      description:
        "Show gift wrapping or packaging if applicable.",
      tips: [
        "Gift-ready packaging can be a strong selling point on Etsy.",
        "Show the unboxing experience or branded packaging details.",
      ],
    },
    {
      slot: 8,
      name: "Process / Making Of",
      type: "lifestyle",
      description:
        "Show the creation process for handmade items.",
      tips: [
        "Behind-the-scenes imagery builds trust and authenticity.",
        "Etsy buyers value the handmade story and craftsmanship.",
      ],
    },
  ],

  promptModifier: `ETSY LISTING RULES:
- Write for Etsy search and conversion, not Amazon-style keyword stuffing.
- Titles should be clear, readable, and front-load the core item type plus strongest descriptors.
- The first 40-50 characters of the title are what show in Etsy search results. Place the core product keyword phrase within the first 40 characters.
- The first 160 characters of the description serve as the meta description in Etsy search and Google. Open the description with a compelling, keyword-rich summary of the item.
- Generate exactly 13 tags. Each tag must be 20 characters or fewer.
- Use attributes and category_hint to reflect Etsy-style filters such as recipient, occasion, material, style, holiday, room, or color when relevant.
- If the product is personalized, include concise personalization instructions and mention what the buyer should provide.
- If the product is digital, make that explicit in the title, tags, category hint, attributes, and shipping notes. Do not imply a physical shipment.
- If the product is handmade, emphasize craftsmanship, materials, and use case. If vintage, emphasize age/era honestly. If craft supply, emphasize quantity, material, and intended use.
- Pay close attention to the "Etsy When Made" field. Only describe the item as "made to order" if that field is "made_to_order". If it specifies a decade (e.g. "2020s"), the item is pre-made and shipping notes should reflect dispatch timing, not production timing.
- Etsy buyers respond to specificity, aesthetics, and gift/use-case clarity.
- Avoid keyword repetition across tags. Use distinct long-tail phrases.
- Keep tone natural, warm, and buyer-friendly.`,

  listingShape: [
    "title",
    "description",
    "tags",
    "attributes",
    "materials",
    "variations",
    "personalization_instructions",
    "shipping_notes",
    "category_hint",
    "returns_notes",
    "assumptions",
  ],
};
