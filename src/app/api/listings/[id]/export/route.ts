import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { generateListingPDF } from "@/lib/export/pdf";
import { generateListingCSV } from "@/lib/export/csv";
import { formatListingForClipboard } from "@/lib/export/clipboard";
import type { ListingContent, Listing, Marketplace } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const exportSchema = z.object({
  format: z.enum(["pdf", "csv", "clipboard"]),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) {
      return jsonError(auth.error ?? "Unauthorized", 401);
    }
    const user = auth.user;

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
    const marketplace = typedListing.marketplace as Marketplace;

    switch (format) {
      case "clipboard": {
        const text = formatListingForClipboard(content, marketplace);
        return jsonSuccess({ content: text, format, listing_id: id, marketplace });
      }

      case "csv": {
        const csvContent = generateListingCSV(content, marketplace);
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="listing-${id}.csv"`,
          },
        });
      }

      case "pdf": {
        const pdfBuffer = generateListingPDF(content, marketplace);
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="listing-${id}.pdf"`,
          },
        });
      }
    }
  } catch (err) {
    console.error("Export error:", err instanceof Error ? err.message : err);
    return jsonError("Internal server error", 500);
  }
}
