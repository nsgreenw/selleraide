import { describe, expect, it } from "vitest";
import {
  enforceAmazonAltText,
  enforceAmazonBackendKeywords,
  sanitizeListingContent,
} from "@/lib/utils/sanitize";
import type { ListingContent } from "@/types";

describe("Amazon hard-limit enforcement", () => {
  it("drops overflow backend keyword terms cleanly at 250 bytes", () => {
    const keywords = [
      "wireless",
      "bluetooth",
      "headphones",
      "noise",
      "cancelling",
      "overear",
      "travel",
      "foldable",
      "rechargeable",
      "lightweight",
      "microphone",
      "premium",
      "black",
      "comfort",
      "portable",
      "gym",
      "office",
      "commute",
      "longbattery",
      "aac",
      "multipoint",
      "voiceassistant",
      "extralongoverflowtermthatshouldbedroppedentirely",
      "anotheroverflowtermthatpushesitpastthelimit",
    ].join(" ");

    const enforced = enforceAmazonBackendKeywords(keywords);
    const bytes = new TextEncoder().encode(enforced).length;

    expect(bytes).toBeLessThanOrEqual(250);
    expect(enforced).toContain("extralongoverflowtermthatshouldbedroppedentirely");
    expect(enforced).not.toContain("anotheroverflowtermthatpushesitpastthelimit");
    expect(enforced.endsWith(" ")).toBe(false);
  });

  it("falls back to byte-safe truncation when a single backend term exceeds the limit", () => {
    const enforced = enforceAmazonBackendKeywords("x".repeat(300));
    expect(new TextEncoder().encode(enforced).length).toBeLessThanOrEqual(250);
    expect(enforced.length).toBe(250);
  });

  it("trims A+ alt text cleanly to 100 bytes", () => {
    const enforced = enforceAmazonAltText(
      "Premium wireless headphones for travel, gym, office use with clear microphone and soft ear cushions daily"
    );

    expect(new TextEncoder().encode(enforced).length).toBeLessThanOrEqual(100);
    expect(enforced.endsWith("daily")).toBe(false);
    expect(enforced).toMatch(/soft ear$/);
  });

  it("enforces Amazon limits during sanitizeListingContent", () => {
    const content: ListingContent = {
      title: "Title",
      description: "Description",
      backend_keywords: `${"keyword ".repeat(40)}overflowterm`,
      a_plus_modules: [
        {
          type: "STANDARD_SINGLE_SIDE_IMAGE",
          position: 1,
          image: {
            alt_text: "Premium wireless headphones for travel, gym, office use with clear microphone and soft ear cushions",
            image_guidance: "Hero image",
          },
        },
      ],
    };

    const sanitized = sanitizeListingContent(content, "amazon");

    expect(new TextEncoder().encode(sanitized.backend_keywords ?? "").length).toBeLessThanOrEqual(250);
    expect(new TextEncoder().encode(sanitized.a_plus_modules?.[0].image?.alt_text ?? "").length).toBeLessThanOrEqual(100);
  });
});
