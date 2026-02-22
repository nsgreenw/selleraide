import type { ListingContent, Marketplace } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { stripHtml } from "@/lib/utils/sanitize";

const APLUS_MODULE_LABELS: Record<string, string> = {
  STANDARD_HEADER_IMAGE_TEXT: "Hero Banner",
  STANDARD_SINGLE_SIDE_IMAGE: "Feature Highlight",
  STANDARD_THREE_IMAGE_TEXT: "Three-Column Features",
  STANDARD_FOUR_IMAGE_TEXT: "Four-Column Features",
  STANDARD_SINGLE_IMAGE_HIGHLIGHTS: "Benefits & Highlights",
  STANDARD_SINGLE_IMAGE_SPECS_DETAIL: "Specs Detail",
  STANDARD_TECH_SPECS: "Technical Specifications",
  STANDARD_PRODUCT_DESCRIPTION: "Brand Story",
  STANDARD_FOUR_IMAGE_TEXT_QUADRANT: "Feature Quadrant",
  STANDARD_MULTIPLE_IMAGE_TEXT: "Image Carousel",
  STANDARD_COMPARISON_TABLE: "Comparison Table",
  STANDARD_TEXT: "Text Block",
  STANDARD_COMPANY_LOGO: "Brand Logo",
  STANDARD_IMAGE_TEXT_OVERLAY: "Full-Width Banner",
  STANDARD_IMAGE_SIDEBAR: "Image Sidebar",
};

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function generateListingCSV(content: ListingContent, marketplace: Marketplace): string {
  const profile = getMarketplaceProfile(marketplace);
  const rows: string[][] = [];

  // Header row
  rows.push(["Field", "Value", "Character Count", "Max Length"]);

  // Add each field from the marketplace profile
  profile.fields.forEach((field) => {
    const key = field.name as keyof ListingContent;
    let value = "";

    if (key === "bullets" && content.bullets) {
      // Handle bullets array - add each as separate row
      content.bullets.forEach((bullet, i) => {
        const clean = stripHtml(bullet);
        rows.push([
          `Bullet ${i + 1}`,
          escapeCSV(clean),
          String(clean.length),
          field.maxLength ? String(field.maxLength) : "Unlimited",
        ]);
      });
      return;
    }

    const rawValue = content[key];
    if (rawValue === undefined || rawValue === null) {
      value = "";
    } else if (typeof rawValue === "string") {
      value = stripHtml(rawValue);
    } else if (Array.isArray(rawValue)) {
      value = rawValue.map(v => typeof v === "string" ? v : JSON.stringify(v)).join("; ");
    } else if (typeof rawValue === "object") {
      value = Object.entries(rawValue).map(([k, v]) => `${k}: ${v}`).join("; ");
    } else {
      value = String(rawValue);
    }

    rows.push([
      field.description || field.name,
      escapeCSV(value),
      String(value.length),
      field.maxLength ? String(field.maxLength) : "Unlimited",
    ]);
  });

  // A+ Content modules
  if (content.a_plus_modules && content.a_plus_modules.length > 0) {
    content.a_plus_modules.forEach((mod) => {
      const n = mod.position;
      const label = APLUS_MODULE_LABELS[mod.type] ?? mod.type;
      rows.push([
        escapeCSV(`A+ Module ${n} - Type`),
        escapeCSV(`${label} (${mod.type})`),
        "",
        "",
      ]);
      if (mod.headline) {
        rows.push([
          escapeCSV(`A+ Module ${n} - Headline`),
          escapeCSV(mod.headline),
          String(mod.headline.length),
          "160",
        ]);
      }
      if (mod.body) {
        rows.push([
          escapeCSV(`A+ Module ${n} - Body`),
          escapeCSV(mod.body),
          String(mod.body.length),
          "6000",
        ]);
      }
      if (mod.image?.alt_text) {
        rows.push([
          escapeCSV(`A+ Module ${n} - Image Alt Text`),
          escapeCSV(mod.image.alt_text),
          String(mod.image.alt_text.length),
          "100",
        ]);
      }
    });
  }

  return rows.map((row) => row.join(",")).join("\n");
}
