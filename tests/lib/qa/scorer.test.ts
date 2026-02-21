import { describe, it, expect } from "vitest";
import { scoreListing } from "@/lib/qa/scorer";
import { validateListing } from "@/lib/qa/validator";
import { getListingStatus } from "@/types";
import type { ListingContent } from "@/types";

function makeAmazonListing(overrides: Partial<ListingContent> = {}): ListingContent {
  return {
    title: "Premium Wireless Bluetooth Headphones with Active Noise Cancellation",
    bullets: [
      "Premium Sound Quality — Experience rich, immersive audio with 40mm drivers so you can enjoy every detail.",
      "Active Noise Cancellation — Block out distractions and focus on your music with industry-leading ANC technology.",
      "Long Battery Life — Up to 30 hours of continuous playback on a single charge keeps you going all day.",
      "Comfortable Fit — Memory foam ear cushions and adjustable headband provide all-day wearing comfort.",
      "Universal Compatibility — Works seamlessly with iOS, Android, and all Bluetooth-enabled devices.",
    ],
    description:
      "Transform your listening experience with our premium wireless headphones. Designed for audiophiles and everyday listeners alike, these headphones deliver exceptional sound quality in a comfortable, portable package. Whether you are commuting, working, or relaxing, you will appreciate the superior noise cancellation and impressive battery life. Made from durable materials to last for years.",
    backend_keywords: "bluetooth headphones wireless noise cancelling over ear foldable travel",
    attributes: { brand: "AudioPro", condition: "New", color: "Black" },
    ...overrides,
  };
}

function makeEbayListing(overrides: Partial<ListingContent> = {}): ListingContent {
  return {
    title: "Sony WH-1000XM4 Wireless Noise Cancelling Headphones Black",
    subtitle: "Industry-leading noise cancellation with 30hr battery",
    description:
      "<h2>Sony WH-1000XM4</h2><p>Excellent condition. Minor wear on cushions. Fully functional with all accessories included. Ships fast.</p>",
    item_specifics: {
      Brand: "Sony",
      Model: "WH-1000XM4",
      Color: "Black",
      Connectivity: "Bluetooth",
      Type: "Over-Ear",
      Condition: "Used - Excellent",
    },
    condition_notes: ["Minor wear on ear cushions", "All accessories included"],
    shipping_notes: "Ships within 1 business day via USPS Priority Mail",
    returns_notes: "30-day returns accepted",
    category_hint: "Consumer Electronics > Headphones",
    ...overrides,
  };
}

describe("scoreListing — Amazon", () => {
  it("scores a well-formed Amazon listing >= 70", () => {
    const listing = makeAmazonListing();
    const validationResults = validateListing(listing, "amazon");
    const { score } = scoreListing(listing, "amazon", validationResults);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores low on bullet_quality when bullets are empty", () => {
    const listing = makeAmazonListing({ bullets: [] });
    const validationResults = validateListing(listing, "amazon");
    const { breakdown } = scoreListing(listing, "amazon", validationResults);
    const bulletEntry = breakdown.find((b) => b.criterion === "bullet_quality");
    expect(bulletEntry).toBeDefined();
    expect(bulletEntry!.score).toBeLessThan(30);
  });
});

describe("scoreListing — eBay", () => {
  it("scores a well-formed eBay listing >= 70", () => {
    const listing = makeEbayListing();
    const validationResults = validateListing(listing, "ebay");
    const { score } = scoreListing(listing, "ebay", validationResults);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores low on item_specifics_completeness when item_specifics is empty", () => {
    const listing = makeEbayListing({ item_specifics: {} });
    const validationResults = validateListing(listing, "ebay");
    const { breakdown } = scoreListing(listing, "ebay", validationResults);
    const specificsEntry = breakdown.find((b) => b.criterion === "item_specifics_completeness");
    expect(specificsEntry).toBeDefined();
    expect(specificsEntry!.score).toBeLessThan(30);
  });

  it("handles non-string metadata values without throwing", () => {
    const listing = makeEbayListing({
      item_specifics: { Brand: "Sony", Model: 123 as unknown as string },
      attributes: { color: null as unknown as string },
    });
    const validationResults = validateListing(listing, "ebay");

    expect(() => scoreListing(listing, "ebay", validationResults)).not.toThrow();
  });
});

describe("getListingStatus", () => {
  it("returns 'ready' for score >= 85", () => {
    expect(getListingStatus(85)).toBe("ready");
    expect(getListingStatus(100)).toBe("ready");
  });

  it("returns 'needs_revision' for score 70–84", () => {
    expect(getListingStatus(70)).toBe("needs_revision");
    expect(getListingStatus(72)).toBe("needs_revision");
    expect(getListingStatus(84)).toBe("needs_revision");
  });

  it("returns 'regenerate' for score < 70", () => {
    expect(getListingStatus(65)).toBe("regenerate");
    expect(getListingStatus(0)).toBe("regenerate");
  });
});
