import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import type { ListingContent, Listing } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const exportSchema = z.object({
  format: z.enum(["pdf", "csv", "clipboard"]),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return jsonError(auth.error, 401);
    }
    const user = auth.user!;

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid export format. Must be pdf, csv, or clipboard.", 400);
    }

    const { id } = await params;
    const { format } = parsed.data;
    const supabase = await createClient();

    // Fetch listing and verify ownership
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return jsonError("Listing not found", 404);
    }

    const typedListing = listing as Listing;
    const content = typedListing.content;

    let exportContent: unknown;

    switch (format) {
      case "clipboard":
        exportContent = formatForClipboard(content);
        break;
      case "csv":
        exportContent = formatForCSV(content);
        break;
      case "pdf":
        // PDF generation will be implemented in a future phase.
        // For now, return the structured content that the frontend
        // can use with jsPDF.
        exportContent = formatForPDF(content);
        break;
    }

    return jsonSuccess({
      content: exportContent,
      format,
      listing_id: id,
      marketplace: typedListing.marketplace,
    });
  } catch {
    return jsonError("Internal server error", 500);
  }
}

/**
 * Formats listing content as plain text for clipboard copy.
 */
function formatForClipboard(content: ListingContent): string {
  const lines: string[] = [];

  lines.push(`TITLE: ${content.title}`);
  lines.push("");

  if (content.bullets && content.bullets.length > 0) {
    lines.push("BULLET POINTS:");
    for (let i = 0; i < content.bullets.length; i++) {
      lines.push(`${i + 1}. ${content.bullets[i]}`);
    }
    lines.push("");
  }

  lines.push("DESCRIPTION:");
  // Strip HTML tags for clipboard
  const plainDescription = content.description.replace(/<[^>]*>/g, "");
  lines.push(plainDescription);
  lines.push("");

  if (content.backend_keywords) {
    lines.push(`BACKEND KEYWORDS: ${content.backend_keywords}`);
    lines.push("");
  }

  if (content.seo_title) {
    lines.push(`SEO TITLE: ${content.seo_title}`);
  }

  if (content.meta_description) {
    lines.push(`META DESCRIPTION: ${content.meta_description}`);
  }

  if (content.tags && content.tags.length > 0) {
    lines.push(`TAGS: ${content.tags.join(", ")}`);
  }

  if (content.subtitle) {
    lines.push(`SUBTITLE: ${content.subtitle}`);
  }

  if (content.shelf_description) {
    lines.push(`SHELF DESCRIPTION: ${content.shelf_description}`);
  }

  return lines.join("\n");
}

/**
 * Formats listing content as CSV rows (field, value).
 */
function formatForCSV(content: ListingContent): string {
  const rows: string[][] = [];

  rows.push(["Field", "Value"]);
  rows.push(["Title", content.title]);

  if (content.bullets) {
    for (let i = 0; i < content.bullets.length; i++) {
      rows.push([`Bullet ${i + 1}`, content.bullets[i]]);
    }
  }

  const plainDescription = content.description.replace(/<[^>]*>/g, "");
  rows.push(["Description", plainDescription]);

  if (content.backend_keywords) {
    rows.push(["Backend Keywords", content.backend_keywords]);
  }

  if (content.seo_title) {
    rows.push(["SEO Title", content.seo_title]);
  }

  if (content.meta_description) {
    rows.push(["Meta Description", content.meta_description]);
  }

  if (content.tags && content.tags.length > 0) {
    rows.push(["Tags", content.tags.join(", ")]);
  }

  if (content.subtitle) {
    rows.push(["Subtitle", content.subtitle]);
  }

  if (content.shelf_description) {
    rows.push(["Shelf Description", content.shelf_description]);
  }

  // Escape CSV values
  return rows
    .map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

/**
 * Formats listing content as a structured object for PDF generation.
 * The frontend will use this with jsPDF to render the final PDF.
 */
function formatForPDF(content: ListingContent): Record<string, unknown> {
  return {
    title: content.title,
    bullets: content.bullets ?? [],
    description: content.description,
    backend_keywords: content.backend_keywords ?? null,
    seo_title: content.seo_title ?? null,
    meta_description: content.meta_description ?? null,
    tags: content.tags ?? [],
    subtitle: content.subtitle ?? null,
    shelf_description: content.shelf_description ?? null,
    photo_recommendations: content.photo_recommendations ?? [],
  };
}
