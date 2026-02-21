"use client";

import { ShoppingCart, Tag } from "lucide-react";
import type { Marketplace } from "@/types";

const marketplaces: {
  id: Marketplace;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "amazon", label: "Amazon", icon: <ShoppingCart className="h-4 w-4" /> },
  { id: "ebay", label: "eBay", icon: <Tag className="h-4 w-4" /> },
];

interface MarketplacePickerProps {
  value: Marketplace;
  onChange: (m: Marketplace) => void;
  disabled?: boolean;
}

export default function MarketplacePicker({
  value,
  onChange,
  disabled,
}: MarketplacePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {marketplaces.map((mp) => {
        const isActive = value === mp.id;
        return (
          <button
            key={mp.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mp.id)}
            className={
              isActive
                ? "rounded-xl border border-sa-200/50 bg-sa-200/10 px-4 py-2 text-sm font-medium text-sa-100 transition duration-200"
                : "rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-zinc-400 transition duration-200 hover:border-white/20 hover:text-zinc-300"
            }
          >
            <span className="flex items-center gap-2">
              {mp.icon}
              {mp.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
