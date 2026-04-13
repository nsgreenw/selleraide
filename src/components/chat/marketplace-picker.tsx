"use client";

import { FileText, ShoppingCart, Tag } from "lucide-react";
import type { Marketplace } from "@/types";

export interface EtsyDetailsDraft {
  listingType: "handmade" | "vintage" | "craft_supply";
  whenMade: string;
  materials: string;
  dimensions: string;
  personalizationEnabled: boolean;
  personalizationInstructions: string;
  variations: string;
  occasion: string;
  recipient: string;
  isDigital: boolean;
}

const marketplaces: {
  id: Marketplace;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "amazon", label: "Amazon", icon: <ShoppingCart className="h-4 w-4" /> },
  { id: "ebay", label: "eBay", icon: <Tag className="h-4 w-4" /> },
  { id: "etsy", label: "Etsy", icon: <FileText className="h-4 w-4" /> },
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
  etsyDetails: EtsyDetailsDraft;
  onEtsyDetailsChange: (next: EtsyDetailsDraft) => void;
}

export default function MarketplacePicker({
  value,
  onChange,
  disabled,
  condition,
  onConditionChange,
  conditionNotes,
  onConditionNotesChange,
  etsyDetails,
  onEtsyDetailsChange,
}: MarketplacePickerProps) {
  const showCondition = value === "ebay";
  const showNotes = showCondition && condition !== "New";
  const showEtsy = value === "etsy";

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

      {/* Etsy listing metadata */}
      <div
        style={{
          maxHeight: showEtsy ? "1000px" : "0",
          opacity: showEtsy ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease, opacity 200ms ease",
        }}
      >
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-kicker text-zinc-500 mb-2 block">
              LISTING TYPE
            </label>
            <select
              value={etsyDetails.listingType}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  listingType: e.target.value as EtsyDetailsDraft["listingType"],
                })
              }
              disabled={disabled}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-sa-200/70 transition duration-200"
            >
              <option value="handmade">Handmade</option>
              <option value="vintage">Vintage</option>
              <option value="craft_supply">Craft Supply</option>
            </select>
          </div>

          <div>
            <label className="label-kicker text-zinc-500 mb-2 block">
              WHEN MADE
            </label>
            <select
              value={etsyDetails.whenMade}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  whenMade: e.target.value,
                })
              }
              disabled={disabled}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-sa-200/70 transition duration-200"
            >
              <option value="made_to_order">Made to order</option>
              <option value="made_2020s">2020s</option>
              <option value="made_2010s">2010s</option>
              <option value="made_2000s">2000s</option>
              <option value="made_1990s">1990s</option>
              <option value="made_1980s">1980s</option>
              <option value="before_1980">Before 1980</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label-kicker text-zinc-500 mb-2 block">
              MATERIALS
            </label>
            <input
              type="text"
              value={etsyDetails.materials}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  materials: e.target.value,
                })
              }
              disabled={disabled}
              placeholder="Cotton, brass, soy wax, PDF, oak..."
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-sa-200/70 transition duration-200"
            />
          </div>

          <div>
            <label className="label-kicker text-zinc-500 mb-2 block">
              DIMENSIONS
            </label>
            <input
              type="text"
              value={etsyDetails.dimensions}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  dimensions: e.target.value,
                })
              }
              disabled={disabled}
              placeholder="8 x 10 in, 14 in chain, A4 printable..."
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-sa-200/70 transition duration-200"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <input
              id="etsy-digital"
              type="checkbox"
              checked={etsyDetails.isDigital}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  isDigital: e.target.checked,
                })
              }
              disabled={disabled}
              className="h-4 w-4 rounded border-white/20 bg-black/25"
            />
            <label htmlFor="etsy-digital" className="text-sm text-zinc-300">
              Digital product / instant download
            </label>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 sm:col-span-2">
            <input
              id="etsy-personalization"
              type="checkbox"
              checked={etsyDetails.personalizationEnabled}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  personalizationEnabled: e.target.checked,
                })
              }
              disabled={disabled}
              className="h-4 w-4 rounded border-white/20 bg-black/25"
            />
            <label htmlFor="etsy-personalization" className="text-sm text-zinc-300">
              This item offers personalization
            </label>
          </div>

          {etsyDetails.personalizationEnabled && (
            <div className="sm:col-span-2">
              <label className="label-kicker text-zinc-500 mb-2 block">
                PERSONALIZATION INSTRUCTIONS
              </label>
              <textarea
                value={etsyDetails.personalizationInstructions}
                onChange={(e) =>
                  onEtsyDetailsChange({
                    ...etsyDetails,
                    personalizationInstructions: e.target.value,
                  })
                }
                disabled={disabled}
                rows={3}
                placeholder="What should the buyer provide? Include limits, formatting, or character count."
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sa-200/70 outline-none resize-none transition duration-200"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="label-kicker text-zinc-500 mb-2 block">
              VARIATIONS
            </label>
            <textarea
              value={etsyDetails.variations}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  variations: e.target.value,
                })
              }
              disabled={disabled}
              rows={3}
              placeholder={`One per line\nSize: Small, Medium, Large\nColor: Sage, Terracotta, Cream`}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sa-200/70 outline-none resize-none transition duration-200"
            />
          </div>

          <div>
            <label className="label-kicker text-zinc-500 mb-2 block">
              OCCASION
            </label>
            <input
              type="text"
              value={etsyDetails.occasion}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  occasion: e.target.value,
                })
              }
              disabled={disabled}
              placeholder="Wedding, birthday, baby shower..."
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-sa-200/70 transition duration-200"
            />
          </div>

          <div>
            <label className="label-kicker text-zinc-500 mb-2 block">
              RECIPIENT
            </label>
            <input
              type="text"
              value={etsyDetails.recipient}
              onChange={(e) =>
                onEtsyDetailsChange({
                  ...etsyDetails,
                  recipient: e.target.value,
                })
              }
              disabled={disabled}
              placeholder="Bride, mom, teacher, pet owner..."
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-sa-200/70 transition duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
