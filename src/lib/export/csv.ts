import type { ListingContent, Marketplace } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { stripHtml } from "@/lib/utils/sanitize";

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

  return rows.map((row) => row.join(",")).join("\n");
}
