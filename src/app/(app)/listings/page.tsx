"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Header } from "@/components/layout/header";
import ListingCard from "@/components/listing/listing-card";
import type { Listing } from "@/types";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch("/api/listings");
        if (!response.ok) {
          throw new Error("Failed to fetch listings");
        }
        const data = await response.json();
        setListings(Array.isArray(data) ? data : data.listings ?? []);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  return (
    <div className="space-y-6">
      <Header title="Listings" />

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="text-center py-20">
          <FileText className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">
            No listings yet
          </h2>
          <p className="text-zinc-500 mb-6">
            Create your first listing to get started.
          </p>
          <Link href="/chat" className="btn-primary">
            Start Creating
          </Link>
        </div>
      )}
    </div>
  );
}
