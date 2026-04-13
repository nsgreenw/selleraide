import { describe, it, expect } from "vitest";
import { amazonProfile } from "@/lib/marketplace/amazon";
import { ebayProfile } from "@/lib/marketplace/ebay";
import { etsyProfile } from "@/lib/marketplace/etsy";
import { CRITERION_FUNCTIONS } from "@/lib/qa/scorer";
import { createConversationSchema, generateListingSchema } from "@/lib/api/contracts";

describe("Amazon marketplace profile schema", () => {
  it("listingShape contains exactly the v1 expected keys", () => {
    expect(amazonProfile.listingShape).toEqual([
      "title",
      "bullet_points",
      "description",
      "backend_search_terms",
      "attributes",
      "compliance_notes",
      "assumptions",
      "a_plus_modules",
    ]);
  });

  it("scoring weights sum to 1.0 ± 0.001", () => {
    const total = amazonProfile.scoringWeights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBeCloseTo(1.0, 3);
  });

  it("all scoringWeights criteria exist in CRITERION_FUNCTIONS", () => {
    for (const sw of amazonProfile.scoringWeights) {
      expect(CRITERION_FUNCTIONS).toHaveProperty(sw.criterion);
    }
  });
});

describe("eBay marketplace profile schema", () => {
  it("listingShape contains exactly the v1 expected keys", () => {
    expect(ebayProfile.listingShape).toEqual([
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
    ]);
  });

  it("scoring weights sum to 1.0 ± 0.001", () => {
    const total = ebayProfile.scoringWeights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBeCloseTo(1.0, 3);
  });

  it("all scoringWeights criteria exist in CRITERION_FUNCTIONS", () => {
    for (const sw of ebayProfile.scoringWeights) {
      expect(CRITERION_FUNCTIONS).toHaveProperty(sw.criterion);
    }
  });
});

describe("Etsy marketplace profile schema", () => {
  it("listingShape contains exactly the v1 expected keys", () => {
    expect(etsyProfile.listingShape).toEqual([
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
    ]);
  });

  it("scoring weights sum to 1.0 ± 0.001", () => {
    const total = etsyProfile.scoringWeights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBeCloseTo(1.0, 3);
  });

  it("all scoringWeights criteria exist in CRITERION_FUNCTIONS", () => {
    for (const sw of etsyProfile.scoringWeights) {
      expect(CRITERION_FUNCTIONS).toHaveProperty(sw.criterion);
    }
  });
});

describe("Marketplace contract enforcement", () => {
  it("rejects disabled marketplaces in createConversationSchema", () => {
    const parsed = createConversationSchema.safeParse({ marketplace: "walmart" });
    expect(parsed.success).toBe(false);
  });

  it("rejects disabled marketplaces in generateListingSchema", () => {
    const parsed = generateListingSchema.safeParse({
      marketplace: "shopify",
      product_description: "Valid product description text",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts Etsy marketplace details in generateListingSchema", () => {
    const parsed = generateListingSchema.safeParse({
      marketplace: "etsy",
      product_description: "Personalized ceramic mug with hand-painted florals",
      etsy_listing_type: "handmade",
      etsy_when_made: "made_to_order",
      etsy_materials: ["ceramic", "glaze"],
      etsy_dimensions: '11 oz mug, 3.75" tall',
      etsy_variations: {
        Color: ["Blue", "Sage"],
        Finish: ["Glossy"],
      },
      etsy_personalization_enabled: true,
      etsy_personalization_instructions: "Add the name for the front of the mug.",
      etsy_occasion: "birthday",
      etsy_recipient: "mom",
      etsy_is_digital: false,
    });

    expect(parsed.success).toBe(true);
  });
});
