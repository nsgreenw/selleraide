import type { MarketplaceProfile } from "./types";

export const shopifyProfile: MarketplaceProfile = {
  id: "shopify",
  name: "shopify",
  displayName: "Shopify / DTC",
  icon: "Globe",

  fields: [
    {
      name: "title",
      maxLength: 255,
      required: true,
      htmlAllowed: false,
      description:
        "Product title. Displayed as <h1> on the product page. Include primary keyword naturally. Avoid keyword stuffing — this is your brand's storefront.",
    },
    {
      name: "description",
      maxLength: 50000,
      required: true,
      htmlAllowed: true,
      description:
        "Rich product description supporting full HTML. Use headings, paragraphs, lists, tables, and embedded media. This is your owned channel — tell your full brand story.",
    },
    {
      name: "seo_title",
      maxLength: 60,
      required: true,
      htmlAllowed: false,
      description:
        "Page title for search engines (meta title / <title> tag). Max 60 chars to avoid truncation in Google SERPs. Should include primary keyword and brand name.",
    },
    {
      name: "meta_description",
      maxLength: 160,
      required: true,
      htmlAllowed: false,
      description:
        "Meta description for search engines. Max 160 chars. Write a compelling snippet that drives click-through from SERPs. Include primary keyword and a call-to-action.",
    },
    {
      name: "tags",
      maxLength: null,
      required: false,
      htmlAllowed: false,
      description:
        "Product tags (array). Used for collections, filtering, and internal organization. Include product type, material, occasion, style, and use case tags.",
    },
    {
      name: "collections",
      maxLength: null,
      required: false,
      htmlAllowed: false,
      description:
        "Suggested collection names this product belongs to. Used for site navigation and automated collections.",
    },
  ],

  bannedTerms: [
    {
      pattern: /\bcure\b/gi,
      term: "cure",
      reason:
        "Medical cure claims are prohibited for non-pharmaceutical products and violate FTC guidelines.",
      severity: "error",
    },
    {
      pattern: /\bclinically\s+proven\b/gi,
      term: "clinically proven",
      reason:
        "Clinical efficacy claims require substantiation with published peer-reviewed studies.",
      severity: "error",
    },
    {
      pattern: /\bFDA\s+approved\b/gi,
      term: "FDA approved",
      reason:
        "FDA approval claims require official regulatory authorization. Misuse carries legal liability.",
      severity: "error",
    },
    {
      pattern: /\bbuy\s+now\s+or\s+miss\s+out\b/gi,
      term: "buy now or miss out",
      reason:
        "Aggressive scarcity-based CTAs erode trust on DTC stores. Use value-driven CTAs instead.",
      severity: "error",
    },
    {
      pattern: /\bact\s+now\s+before\b/gi,
      term: "act now before",
      reason:
        "Manipulative urgency language undermines brand credibility on owned channels.",
      severity: "error",
    },
    {
      pattern: /\bmiracle\b/gi,
      term: "miracle",
      reason:
        "Superlative claims without evidence are flagged by advertising standards and erode trust.",
      severity: "error",
    },
    {
      pattern: /\b100\s*%\s+guarantee\b/gi,
      term: "100% guarantee",
      reason:
        "Absolute guarantee claims require clear terms. Use specific guarantee language with conditions.",
      severity: "error",
    },
    {
      pattern: /\bguaranteed\s+results\b/gi,
      term: "guaranteed results",
      reason:
        "Outcome guarantees are risky for FTC compliance and consumer protection laws.",
      severity: "error",
    },
    {
      pattern: /\bcheap\b/gi,
      term: "cheap",
      reason:
        "On DTC stores, 'cheap' undermines brand perception. Use 'affordable' or 'great value'.",
      severity: "warning",
    },
    {
      pattern: /\bhurry\b/gi,
      term: "hurry",
      reason:
        "Generic urgency language feels spammy on branded storefronts.",
      severity: "warning",
    },
    {
      pattern: /\blimited\s+stock\b/gi,
      term: "limited stock",
      reason:
        "False scarcity claims violate FTC truth-in-advertising guidelines unless factually accurate.",
      severity: "warning",
    },
  ],

  scoringWeights: [
    {
      criterion: "seo_title_optimization",
      weight: 0.15,
      description:
        "SEO title is under 60 chars, includes primary keyword, and is compelling for click-through.",
    },
    {
      criterion: "meta_description_quality",
      weight: 0.1,
      description:
        "Meta description is under 160 chars, includes a keyword, and has a clear CTA for SERP clicks.",
    },
    {
      criterion: "description_content_quality",
      weight: 0.2,
      description:
        "Description is rich, well-structured with HTML headings and lists, and tells the brand story.",
    },
    {
      criterion: "keyword_integration",
      weight: 0.15,
      description:
        "Primary and secondary keywords appear naturally in title, description, and meta fields.",
    },
    {
      criterion: "banned_terms_absence",
      weight: 0.1,
      description:
        "Listing is free of prohibited claims and aggressive marketing language.",
    },
    {
      criterion: "tag_and_collection_strategy",
      weight: 0.1,
      description:
        "Tags are comprehensive for filtering and collections are well-organized.",
    },
    {
      criterion: "readability",
      weight: 0.05,
      description:
        "Content is well-written, scannable, and matches the brand voice.",
    },
    {
      criterion: "formatting_richness",
      weight: 0.05,
      description:
        "Description uses HTML effectively: headings, lists, bold/italic, tables where appropriate.",
    },
    {
      criterion: "benefit_driven_language",
      weight: 0.05,
      description:
        "Features are framed as customer benefits with emotional and practical appeal.",
    },
    {
      criterion: "brand_voice_consistency",
      weight: 0.05,
      description:
        "Tone and style are consistent with a premium DTC brand voice.",
    },
  ],

  keywordStrategy: {
    primaryPlacement: "seo_title",
    secondaryPlacement: "description",
    maxKeywordsTitle: 3,
    backendField: null,
    tips: [
      "The SEO title (meta title) is the single most important field for Google ranking — include your primary keyword here.",
      "The product title (<h1>) should be customer-friendly first, SEO-optimized second.",
      "Use the meta description as your SERP ad copy — write for click-through rate, not just keywords.",
      "Include keywords naturally in the first 100 words of the description for on-page SEO.",
      "Tags do not directly impact Google SEO but power Shopify collections and on-site search.",
      "Use long-tail keywords in the description body where they read naturally.",
      "Internal linking from the description to related products improves site architecture and SEO.",
      "Alt text for product images (set in Shopify admin) is an additional keyword opportunity.",
    ],
  },

  photoSlots: [
    {
      slot: 1,
      name: "Hero Image",
      type: "main",
      description:
        "Primary product image. Can be on white, branded, or lifestyle background depending on brand aesthetic. This is your storefront — match your brand.",
      tips: [
        "Shopify displays this as the default image in collection pages and social shares.",
        "Minimum 2048x2048px for best quality across all devices.",
        "Consistent aspect ratio across all products (square or 4:5 recommended).",
        "Consider your brand aesthetic — white background is not required on DTC stores.",
      ],
    },
    {
      slot: 2,
      name: "Lifestyle — Primary",
      type: "lifestyle",
      description:
        "Product in an aspirational lifestyle context that reflects your brand identity and target customer.",
      tips: [
        "This image often appears in social media shares and ads — make it scroll-stopping.",
        "Match the aesthetic of your brand's Instagram and marketing materials.",
        "Use professional photography that evokes the desired lifestyle association.",
        "Consider seasonal or trend-relevant styling.",
      ],
    },
    {
      slot: 3,
      name: "Feature Detail",
      type: "detail",
      description:
        "Close-up highlighting the craftsmanship, material, or defining detail that justifies the price point.",
      tips: [
        "Show what makes this product worth buying from your DTC store versus a marketplace.",
        "Highlight premium materials, handcrafted elements, or unique design features.",
        "Macro photography works well here to show texture and quality.",
      ],
    },
    {
      slot: 4,
      name: "Infographic / Benefits",
      type: "infographic",
      description:
        "Designed image with benefit callouts, specifications, or comparison information.",
      tips: [
        "Use your brand fonts and colors for consistency.",
        "Focus on 3-4 key benefits maximum.",
        "Consider a 'Why Choose Us' or comparison layout.",
        "Mobile-first design — ensure text is readable on phone screens.",
      ],
    },
    {
      slot: 5,
      name: "Scale / Sizing",
      type: "scale",
      description:
        "Image showing product dimensions, fit, or size in context to minimize returns.",
      tips: [
        "Include a size guide image for apparel and accessories.",
        "Show the product held, worn, or placed in a familiar context for scale.",
        "On DTC stores, reducing returns directly impacts profitability.",
      ],
    },
    {
      slot: 6,
      name: "Social Proof / UGC",
      type: "lifestyle",
      description:
        "User-generated content or styled shot that looks like it could be from a customer or influencer.",
      tips: [
        "UGC-style imagery builds trust and relatability.",
        "Consider including a photo that pairs well with customer reviews below.",
        "Authentic-feeling content often outperforms polished studio shots on DTC.",
        "Get permission before using actual customer content.",
      ],
    },
    {
      slot: 7,
      name: "Packaging / Unboxing",
      type: "packaging",
      description:
        "Unboxing experience or gift-ready packaging shot that communicates premium presentation.",
      tips: [
        "DTC brands compete on experience — show that the unboxing is special.",
        "If packaging is eco-friendly, highlight that prominently.",
        "Include any inserts, thank-you cards, or branded tissue paper.",
        "This image drives gift purchases and perceived value.",
      ],
    },
  ],

  promptModifier: `You are generating a product listing for a Shopify / direct-to-consumer (DTC) store. Follow these rules strictly:

PRODUCT TITLE RULES:
- Maximum 255 characters, but keep it concise and brand-appropriate (typically 40-80 chars).
- This appears as the <h1> on the product page. Prioritize readability and brand voice over keyword stuffing.
- Include the product name, key variant (size/color if applicable), and one natural keyword.
- Match the brand's naming convention (e.g., "The Everyday Tote — Canvas / Sage" or "Ultra-Light Running Sock 3-Pack").

SEO TITLE RULES:
- Maximum 60 characters. This is the <title> tag and appears in Google search results.
- Structure: Primary Keyword + Product Type + Brand Name (or "| Brand Name" at the end).
- Must be compelling enough to drive click-through from search results.
- Example: "Organic Cotton Bath Towels | Set of 4 | BrandName"

META DESCRIPTION RULES:
- Maximum 160 characters. This is your Google SERP snippet.
- Include primary keyword naturally, a key benefit, and a soft CTA.
- Write it as ad copy: "Shop our [product] — [key benefit]. [CTA]. Free shipping over $50."
- Example: "Discover our ultra-soft organic cotton bath towels. Quick-dry, luxuriously thick, and sustainably made. Shop the set — free shipping."

PRODUCT DESCRIPTION RULES:
- Up to 50000 characters. Use rich HTML for structure and storytelling.
- Use semantic HTML: <h2> for sections, <h3> for subsections, <p> for paragraphs, <ul>/<ol> for lists, <strong> and <em> for emphasis.
- Structure: (1) Opening hook, (2) Key Benefits, (3) Features & Specs, (4) Materials & Craftsmanship, (5) Size/Fit Guide if applicable, (6) Care Instructions, (7) Sustainability/Brand story.
- Write in the brand's voice. DTC brands have distinct personalities — match it.
- Include secondary keywords in subheadings and body copy for on-page SEO.
- Cross-link to related products or collections where natural.

TAGS RULES:
- Include tags for: product type, material, occasion, style, season, target audience, color family, and use case.
- Tags power automated collections and on-site search filtering.
- Use consistent tag naming conventions (e.g., "material:organic-cotton" or "occasion:gift").

COLLECTIONS:
- Suggest logical collection names this product should appear in.
- Consider: category collections, seasonal collections, "Best Sellers", "New Arrivals", "Gift Guide", material-based collections.

GENERAL:
- No banned terms: cure, clinically proven, FDA approved, buy now or miss out, miracle, 100% guarantee, guaranteed results.
- Write in a voice appropriate for a premium DTC brand: confident but not pushy, informative but not clinical.
- DTC shoppers expect transparency — include materials, sourcing, care instructions, and sizing.
- Focus on the customer's identity and aspirations, not just product specifications.
- Consider that DTC customers are paying a premium for the brand experience, story, and quality.`,

  listingShape: [
    "title",
    "description",
    "seo_title",
    "meta_description",
    "tags",
    "collections",
  ],
};
