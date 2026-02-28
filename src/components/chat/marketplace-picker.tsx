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

const EBAY_CONDITIONS = [
  "New",
  "Open Box",
  "Like New",
  "Very Good",
  "Good",
  "Acceptable",
  "For Parts or Not Working",
];

interface MarketplacePickerProps {
  value: Marketplace;
  onChange: (m: Marketplace) => void;
  disabled?: boolean;
  condition: string;
  onConditionChange: (c: string) => void;
  conditionNotes: string;
  onConditionNotesChange: (n: string) => void;
}

export default function MarketplacePicker({
  value,
  onChange,
  disabled,
  condition,
  onConditionChange,
  conditionNotes,
  onConditionNotesChange,
}: MarketplacePickerProps) {
  const showCondition = value === "ebay";
  const showNotes = showCondition && condition !== "New";

  return (
    <div>
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

      {/* eBay condition selector */}
      <div
        style={{
          maxHeight: showCondition ? "300px" : "0",
          opacity: showCondition ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease, opacity 200ms ease",
        }}
      >
        <div className="mt-4">
          <label className="label-kicker text-zinc-500 mb-2 block">
            CONDITION
          </label>
          <select
            value={condition}
            onChange={(e) => onConditionChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-sa-200/70 transition duration-200"
          >
            {EBAY_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Condition notes (hidden when "New") */}
        <div
          style={{
            maxHeight: showNotes ? "200px" : "0",
            opacity: showNotes ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 200ms ease, opacity 200ms ease",
          }}
        >
          <div className="mt-3">
            <label className="label-kicker text-zinc-500 mb-2 block">
              CONDITION NOTES
            </label>
            <textarea
              value={conditionNotes}
              onChange={(e) => onConditionNotesChange(e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="Describe any flaws, wear, or missing parts..."
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sa-200/70 outline-none resize-none transition duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
