"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Trash2,
  Plus,
  ShoppingCart,
  Store,
  Tag,
  Globe,
  FileText,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { getGrade } from "@/types";
import type { Marketplace, Listing, QAGrade } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const MARKETPLACE_COLORS: Record<Marketplace, string> = {
  amazon: "#ff9900",
  walmart: "#0071ce",
  ebay: "#e53238",
  shopify: "#96bf48",
};

const MARKETPLACE_ICONS: Record<Marketplace, React.ReactNode> = {
  amazon: <ShoppingCart className="h-3.5 w-3.5" />,
  walmart: <Store className="h-3.5 w-3.5" />,
  ebay: <Tag className="h-3.5 w-3.5" />,
  shopify: <Globe className="h-3.5 w-3.5" />,
};

const ALL_MARKETPLACES: Marketplace[] = ["amazon", "walmart", "ebay", "shopify"];

const GRADE_CLASSES: Record<QAGrade, string> = {
  A: "text-emerald-300 bg-emerald-400/10 border-emerald-300/25",
  B: "text-sa-200 bg-[rgba(246,203,99,0.1)] border-[rgba(246,203,99,0.25)]",
  C: "text-amber-300 bg-amber-400/10 border-amber-300/25",
  D: "text-rose-300 bg-rose-400/10 border-rose-300/25",
  F: "text-rose-400 bg-rose-400/10 border-rose-400/25",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

interface ListingWithConversation extends Listing {
  conversations: {
    title: string;
    marketplace: Marketplace;
  } | null;
}

function relativeDate(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffWeek === 1) return "1 week ago";
  if (diffWeek < 5) return `${diffWeek} weeks ago`;
  if (diffMonth === 1) return "1 month ago";
  if (diffMonth < 12) return `${diffMonth} months ago`;
  return new Date(dateString).toLocaleDateString();
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingWithConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<
    Marketplace | "all"
  >("all");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ----- Fetch listings --------------------------------------------------- */

  const fetchListings = useCallback(async () => {
    setFetchError(null);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("listings")
        .select(
          "*, conversations:conversation_id ( title, marketplace )"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setFetchError("Failed to load listings. Please try again.");
        setListings([]);
        return;
      }

      setListings((data as ListingWithConversation[]) ?? []);
    } catch {
      setFetchError("Unable to connect. Please check your connection and try again.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  /* ----- Delete listing --------------------------------------------------- */

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/listings/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  /* ----- Filtering -------------------------------------------------------- */

  const filtered = listings.filter((listing) => {
    // Marketplace filter
    if (marketplaceFilter !== "all") {
      if (listing.marketplace !== marketplaceFilter) return false;
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      const title =
        listing.conversations?.title?.toLowerCase() ??
        listing.content.title?.toLowerCase() ??
        "";
      if (!title.includes(query)) return false;
    }

    return true;
  });

  /* ----- Render ----------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <Header title="Listings" />

      {/* Toolbar: search + marketplace filter */}
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/35 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-sa-200/70 transition"
          />
        </div>

        {/* Marketplace pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMarketplaceFilter("all")}
            className={
              marketplaceFilter === "all"
                ? "rounded-xl border border-sa-200/50 bg-sa-200/10 px-4 py-2 text-sm font-medium text-sa-100 transition duration-200"
                : "rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-zinc-400 transition duration-200 hover:border-white/20 hover:text-zinc-300"
            }
          >
            All
          </button>
          {ALL_MARKETPLACES.map((mp) => {
            const isActive = marketplaceFilter === mp;
            return (
              <button
                key={mp}
                type="button"
                onClick={() => setMarketplaceFilter(mp)}
                className={
                  isActive
                    ? "rounded-xl border border-sa-200/50 bg-sa-200/10 px-4 py-2 text-sm font-medium text-sa-100 transition duration-200"
                    : "rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-zinc-400 transition duration-200 hover:border-white/20 hover:text-zinc-300"
                }
              >
                <span className="flex items-center gap-2">
                  {MARKETPLACE_ICONS[mp]}
                  <span className="capitalize">{mp}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchListings(); }}
            className="ml-4 rounded-lg border border-rose-300/25 px-3 py-1 text-xs font-medium text-rose-200 hover:bg-rose-400/10 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing) => {
            const title =
              listing.conversations?.title ??
              listing.content.title ??
              "Untitled Listing";
            const mp = listing.marketplace;
            const grade = listing.score !== null ? getGrade(listing.score) : null;
            const isConfirming = confirmDeleteId === listing.id;
            const isDeleting = deletingId === listing.id;

            return (
              <div
                key={listing.id}
                className="card-glass p-4 transition duration-200 hover:border-white/20 group relative"
              >
                {/* Clickable overlay (navigates to chat) */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/chat/${listing.conversation_id}`)
                  }
                  className="absolute inset-0 z-0 cursor-pointer rounded-2xl"
                  aria-label={`Open ${title}`}
                />

                {/* Top row: marketplace badge + score */}
                <div className="flex items-center justify-between mb-3 relative z-10 pointer-events-none">
                  {/* Marketplace badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-zinc-300">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: MARKETPLACE_COLORS[mp] }}
                    />
                    <span className="capitalize">{mp}</span>
                  </span>

                  {/* QA score badge */}
                  {grade && listing.score !== null && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${GRADE_CLASSES[grade]}`}
                      title={`Score: ${listing.score} (${grade})`}
                    >
                      {listing.score} {grade}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 mb-2 relative z-10 pointer-events-none">
                  {title}
                </h3>

                {/* Bottom row: date + version + delete */}
                <div className="flex items-center justify-between relative z-10">
                  <p className="text-xs text-zinc-500 pointer-events-none">
                    {relativeDate(listing.created_at)} &middot; v
                    {listing.version}
                  </p>

                  {/* Delete button */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(listing.id);
                        }}
                        disabled={isDeleting}
                        className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/20 transition disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(listing.id);
                      }}
                      className="pointer-events-auto rounded-lg p-1.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-400/10 transition"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state: no listings at all */}
      {!loading && listings.length === 0 && (
        <div className="text-center py-20">
          <FileText className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">
            No listings yet
          </h2>
          <p className="text-zinc-500 mb-6">
            No listings yet. Create your first listing to get started.
          </p>
          <Link href="/chat" className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Listing
          </Link>
        </div>
      )}

      {/* Empty state: listings exist but filter yields nothing */}
      {!loading && listings.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <Search className="mx-auto h-10 w-10 text-zinc-600 mb-4" />
          <h2 className="text-lg font-medium text-zinc-300 mb-2">
            No matching listings
          </h2>
          <p className="text-zinc-500 text-sm">
            Try adjusting your search or marketplace filter.
          </p>
        </div>
      )}
    </div>
  );
}
