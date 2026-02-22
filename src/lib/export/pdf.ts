import { jsPDF } from "jspdf";
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

export function generateListingPDF(content: ListingContent, marketplace: Marketplace): Buffer {
  const profile = getMarketplaceProfile(marketplace);
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Helper to add text with wrapping
  function addText(text: string, fontSize: number, isBold: boolean = false) {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    const lines = doc.splitTextToSize(text, contentWidth);
    // Check if we need a new page
    if (y + lines.length * fontSize * 0.5 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * fontSize * 0.5 + 4;
  }

  function addSection(label: string, value: string | undefined) {
    if (!value) return;
    addText(label.toUpperCase(), 8, true);
    y -= 2;
    addText(stripHtml(value), 10);
    y += 4;
  }

  // Header
  addText("SellerAide Listing Export", 16, true);
  addText(`Marketplace: ${profile.name}`, 10);
  addText(`Generated: ${new Date().toLocaleDateString()}`, 9);
  y += 6;

  // Draw a separator line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Title
  addSection("Title", content.title);

  // Bullets / Features
  const bulletKeys = ["bullet_1", "bullet_2", "bullet_3", "bullet_4", "bullet_5"] as const;
  const featureKeys = ["feature_1", "feature_2", "feature_3", "feature_4", "feature_5"] as const;

  if (content.bullets && content.bullets.length > 0) {
    addText("BULLET POINTS", 8, true);
    y -= 2;
    content.bullets.forEach((bullet, i) => {
      addText(`${i + 1}. ${stripHtml(bullet)}`, 10);
    });
    y += 4;
  }

  // Subtitle (eBay)
  addSection("Subtitle", content.subtitle);

  // Shelf Description (Walmart)
  addSection("Shelf Description", content.shelf_description);

  // Description
  addSection("Description", content.description);

  // Backend Keywords (Amazon)
  addSection("Backend Search Terms", content.backend_keywords);

  // SEO (Shopify)
  addSection("SEO Title", content.seo_title);
  addSection("Meta Description", content.meta_description);

  // Tags
  if (content.tags && content.tags.length > 0) {
    addSection("Tags", content.tags.join(", "));
  }

  // Item Specifics (eBay)
  if (content.item_specifics && Object.keys(content.item_specifics).length > 0) {
    addText("ITEM SPECIFICS", 8, true);
    y -= 2;
    Object.entries(content.item_specifics).forEach(([key, value]) => {
      addText(`${key}: ${value}`, 10);
    });
    y += 4;
  }

  // Attributes (Walmart)
  if (content.attributes && Object.keys(content.attributes).length > 0) {
    addText("ATTRIBUTES", 8, true);
    y -= 2;
    Object.entries(content.attributes).forEach(([key, value]) => {
      addText(`${key}: ${value}`, 10);
    });
    y += 4;
  }

  // Photo Recommendations
  if (content.photo_recommendations && content.photo_recommendations.length > 0) {
    addText("PHOTO RECOMMENDATIONS", 8, true);
    y -= 2;
    content.photo_recommendations.forEach((photo) => {
      addText(`Slot ${photo.slot} (${photo.type}): ${photo.description}`, 10);
      photo.tips.forEach((tip) => {
        addText(`  • ${tip}`, 9);
      });
    });
  }

  // A+ Content Modules (Amazon)
  if (content.a_plus_modules && content.a_plus_modules.length > 0) {
    y += 4;
    addText("A+ CONTENT MODULES", 8, true);
    y -= 2;
    content.a_plus_modules.forEach((mod) => {
      const label = APLUS_MODULE_LABELS[mod.type] ?? mod.type;
      addText(`Module ${mod.position}: ${label} (${mod.type})`, 10, true);
      if (mod.headline) addText(`  Headline: ${mod.headline}`, 10);
      if (mod.body) addText(`  Body: ${mod.body}`, 9);
      if (mod.image?.alt_text) {
        addText(`  Image Alt Text (${mod.image.alt_text.length}/100 chars): ${mod.image.alt_text}`, 9);
      }
      if (mod.images && mod.images.length > 0) {
        mod.images.forEach((img, j) => {
          if (img.alt_text) addText(`  Image ${j + 1} Alt Text (${img.alt_text.length}/100 chars): ${img.alt_text}`, 9);
        });
      }
      y += 2;
    });
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
