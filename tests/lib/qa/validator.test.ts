import { describe, it, expect } from "vitest";
import { validateListing } from "@/lib/qa/validator";
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
      "<h2>Sony WH-1000XM4 Headphones</h2><p>Excellent used condition. Minor wear on ear cushions. All original accessories included. Tested and fully functional.</p><ul><li>Industry-leading noise cancellation</li><li>30-hour battery life</li><li>Touch sensor controls</li></ul>",
    item_specifics: {
      Brand: "Sony",
      Model: "WH-1000XM4",
      Color: "Black",
      Connectivity: "Bluetooth",
      Type: "Over-Ear",
    },
    condition_notes: ["Minor wear on ear cushions", "All original accessories included"],
    shipping_notes: "Ships within 1 business day via USPS Priority Mail",
    returns_notes: "30-day returns accepted. Buyer pays return shipping",
    category_hint: "Consumer Electronics > TV, Video & Home Audio > Headphones",
    ...overrides,
  };
}

describe("validateListing — Amazon", () => {
  it("passes a valid Amazon listing with no errors", () => {
    const results = validateListing(makeAmazonListing(), "amazon");
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("flags title over 200 chars with field_limit error", () => {
    const longTitle = "A".repeat(201);
    const results = validateListing(makeAmazonListing({ title: longTitle }), "amazon");
    const titleErrors = results.filter(
      (r) => r.field === "title" && r.rule === "max_length"
    );
    expect(titleErrors.length).toBeGreaterThan(0);
  });

  it("flags banned term 'guarantee' as error on Amazon", () => {
    const results = validateListing(
      makeAmazonListing({
        description: "We guarantee the best product you will ever buy.",
      }),
      "amazon"
    );
    const bannedResults = results.filter(
      (r) => r.rule === "banned_term" && r.message.toLowerCase().includes("guarantee")
    );
    expect(bannedResults.length).toBeGreaterThan(0);
    expect(bannedResults[0].severity).toBe("error");
  });

  it("flags missing required title field", () => {
    const listing = makeAmazonListing({ title: "" });
    const results = validateListing(listing, "amazon");
    const titleErrors = results.filter(
      (r) => r.field === "title" && r.rule === "required_field"
    );
    expect(titleErrors.length).toBeGreaterThan(0);
  });

  it("enforces Amazon exact bullet count and bullet length/emptiness as errors", () => {
    const listing = makeAmazonListing({
      bullets: ["", "valid bullet", "x".repeat(501), "ok"],
    });
    const results = validateListing(listing, "amazon");

    expect(results.some((r) => r.rule === "amazon_bullet_count" && r.severity === "error")).toBe(true);
    expect(results.some((r) => r.rule === "amazon_bullet_empty" && r.severity === "error")).toBe(true);
    expect(results.some((r) => r.rule === "amazon_bullet_length" && r.severity === "error")).toBe(true);
  });
});

describe("validateListing — eBay", () => {
  it("passes a valid eBay listing with no errors", () => {
    const results = validateListing(makeEbayListing(), "ebay");
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("flags eBay title over 80 chars with max_length error", () => {
    const longTitle = "Sony WH-1000XM4 Wireless Noise Cancelling Headphones Black Very Long Title Here X";
    expect(longTitle.length).toBeGreaterThan(80);
    const results = validateListing(makeEbayListing({ title: longTitle }), "ebay");
    const titleErrors = results.filter(
      (r) => r.field === "title" && r.rule === "max_length"
    );
    expect(titleErrors.length).toBeGreaterThan(0);
  });

  it("flags missing required item_specifics field", () => {
    const listing = makeEbayListing({ item_specifics: undefined });
    const results = validateListing(listing, "ebay");
    const specificsErrors = results.filter(
      (r) => r.field === "item_specifics" && r.rule === "required_field"
    );
    expect(specificsErrors.length).toBeGreaterThan(0);
  });

  it("flags item_specifics with empty values as warnings", () => {
    const listing = makeEbayListing({
      item_specifics: { Brand: "Sony", Model: "", Color: "" },
    });
    const results = validateListing(listing, "ebay");
    const emptyWarnings = results.filter(
      (r) => r.field === "item_specifics" && r.rule === "empty_specific"
    );
    expect(emptyWarnings.length).toBe(2);
  });

  it("handles non-string metadata values without throwing", () => {
    const listing = makeEbayListing({
      item_specifics: { Brand: "Sony", Model: 123 as unknown as string },
      attributes: { color: null as unknown as string },
    });

    expect(() => validateListing(listing, "ebay")).not.toThrow();
  });
});
