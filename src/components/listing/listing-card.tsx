"use client";

import Link from "next/link";
import { ShoppingCart, Store, Tag, Globe } from "lucide-react";
import ScoreBadge from "./score-badge";
import type { Listing, Marketplace } from "@/types";

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

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="card-glass p-4 transition duration-200 hover:border-white/20 cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <MarketplaceBadge marketplace={listing.marketplace} />
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
