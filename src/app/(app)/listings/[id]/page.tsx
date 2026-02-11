"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import ListingDetail from "@/components/listing/listing-detail";
import ExportMenu from "@/components/listing/export-menu";
import type { Listing } from "@/types";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListing() {
      try {
        const response = await fetch(`/api/listings/${id}`);
        if (!response.ok) {
          throw new Error("Listing not found");
        }
        const data = await response.json();
        setListing(data);
      } catch {
        setError("Failed to load listing.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchListing();
    }
  }, [id]);

  return (
    <div className="space-y-6">
      <Header title="Listing Detail" />

      {/* Back link */}
      <Link
        href="/listings"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Listings
      </Link>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
        </div>
      )}

      {error && (
        <div className="card-subtle p-6 text-center">
          <p className="text-sm text-rose-400">{error}</p>
          <Link href="/listings" className="btn-secondary mt-4 inline-flex">
            Go Back
          </Link>
        </div>
      )}

      {!loading && listing && (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100 line-clamp-1">
              {listing.content.title || "Untitled Listing"}
            </h2>
            <ExportMenu
              listingId={listing.id}
              marketplace={listing.marketplace}
            />
          </div>

          {/* Full listing detail */}
          <ListingDetail listing={listing} />
        </>
      )}
    </div>
  );
}
