"use client";

import Link from "next/link";
import { ShoppingCart, Store, Tag, Globe } from "lucide-react";
import ScoreBadge from "./score-badge";
import type { Listing, Marketplace, EbayPublishStatus } from "@/types";

interface ListingCardProps {
  listing: Listing;
}

const marketplaceIcons: Record<Marketplace, React.ReactNode> = {
  amazon: <ShoppingCart className="h-3.5 w-3.5" />,
  walmart: <Store className="h-3.5 w-3.5" />,
  ebay: <Tag className="h-3.5 w-3.5" />,
  shopify: <Globe className="h-3.5 w-3.5" />,
};

function MarketplaceBadge({ marketplace }: { marketplace: Marketplace }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-zinc-300">
      {marketplaceIcons[marketplace]}
      <span className="capitalize">{marketplace}</span>
    </span>
  );
}

const ebayStatusConfig: Record<
  string,
  { color: string; dotColor: string; label: string } | null
> = {
  live: {
    color: "text-emerald-300 border-emerald-400/20 bg-emerald-400/10",
    dotColor: "bg-emerald-400",
    label: "Live",
  },
  publishing: {
    color: "text-amber-300 border-amber-400/20 bg-amber-400/10",
    dotColor: "bg-amber-400",
    label: "Publishing",
  },
  error: {
    color: "text-rose-300 border-rose-400/20 bg-rose-400/10",
    dotColor: "bg-rose-400",
    label: "Error",
  },
  none: null,
  draft: null,
};

function EbayStatusBadge({ status }: { status?: EbayPublishStatus }) {
  if (!status) return null;
  const config = ebayStatusConfig[status];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="card-glass p-4 transition duration-200 hover:border-white/20 cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MarketplaceBadge marketplace={listing.marketplace} />
            {listing.marketplace === "ebay" && (
              <EbayStatusBadge status={listing.ebay_status} />
            )}
          </div>
          {listing.score !== null && <ScoreBadge score={listing.score} size="sm" />}
        </div>
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 mb-2">
          {listing.content.title || "Untitled Listing"}
        </h3>
        <p className="text-xs text-zinc-500">
          {new Date(listing.created_at).toLocaleDateString()} &middot; v{listing.version}
        </p>
      </div>
    </Link>
  );
}
