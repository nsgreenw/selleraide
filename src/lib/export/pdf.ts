import { jsPDF } from "jspdf";
import type { ListingContent, Marketplace } from "@/types";
import { getMarketplaceProfile } from "@/lib/marketplace/registry";
import { stripHtml } from "@/lib/utils/sanitize";

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

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
