"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Store,
  Tag,
  Globe,
  Camera,
  AlertTriangle,
  AlertCircle,
  Info,
  Layers,
} from "lucide-react";
import ScoreBadge from "./score-badge";
import type { Listing, Marketplace, QAResult, APlusModule } from "@/types";

interface ListingDetailProps {
  listing: Listing;
}

const marketplaceIcons: Record<Marketplace, React.ReactNode> = {
  amazon: <ShoppingCart className="h-4 w-4" />,
  walmart: <Store className="h-4 w-4" />,
  ebay: <Tag className="h-4 w-4" />,
  shopify: <Globe className="h-4 w-4" />,
};

function FieldSection({
  label,
  value,
  maxLength,
}: {
  label: string;
  value: string;
  maxLength?: number;
}) {
  if (!value) return null;
  const charCount = value.length;

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-kicker text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-500">
          {charCount} chars{maxLength ? ` / ${maxLength}` : ""}
        </span>
      </div>
      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function BulletsSection({ bullets }: { bullets: string[] }) {
  if (!bullets || bullets.length === 0) return null;

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-kicker text-zinc-400">Bullet Points</span>
        <span className="text-xs text-zinc-500">{bullets.length} items</span>
      </div>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-200">
            <span className="text-zinc-500 font-mono text-xs mt-0.5">{i + 1}.</span>
            <span className="flex-1">
              {bullet}
              <span className="ml-2 text-xs text-zinc-600">{bullet.length} chars</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TagsSection({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="card-subtle p-4">
      <span className="label-kicker text-zinc-400 block mb-2">Tags</span>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-300"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function KeyValueSection({
  label,
  data,
}: {
  label: string;
  data: Record<string, string>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="card-subtle p-4">
      <span className="label-kicker text-zinc-400 block mb-2">{label}</span>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-sm">
            <span className="text-zinc-500 min-w-[120px] shrink-0">{key}</span>
            <span className="text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoRecommendationsSection({
  photos,
}: {
  photos: Listing["content"]["photo_recommendations"];
}) {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="h-4 w-4 text-zinc-400" />
        <span className="label-kicker text-zinc-400">Photo Recommendations</span>
      </div>
      <div className="space-y-3">
        {photos.map((photo) => (
          <div key={photo.slot} className="rounded-lg border border-white/5 bg-black/20 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-sa-200">
                Slot {photo.slot}
              </span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                {photo.type}
              </span>
            </div>
            <p className="text-sm text-zinc-300 mb-2">{photo.description}</p>
            {photo.tips.length > 0 && (
              <ul className="space-y-1">
                {photo.tips.map((tip, j) => (
                  <li key={j} className="text-xs text-zinc-500 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const APLUS_MODULE_LABELS: Record<string, string> = {
  STANDARD_HEADER_IMAGE_TEXT: "Hero Banner",
  STANDARD_SINGLE_SIDE_IMAGE: "Feature Highlight",
  STANDARD_THREE_IMAGE_TEXT: "Three-Column Features",
  STANDARD_FOUR_IMAGE_TEXT: "Four-Column Features",
  STANDARD_SINGLE_IMAGE_HIGHLIGHTS: "Benefits & Highlights",
  STANDARD_SINGLE_IMAGE_SPECS_DETAIL: "Specs Detail",
  STANDARD_TECH_SPECS: "Technical Specifications",
  STANDARD_PRODUCT_DESCRIPTION: "Brand Story",
  STANDARD_FOUR_IMAGE_TEXT_QUADRANT: "Feature Quadrant",
  STANDARD_MULTIPLE_IMAGE_TEXT: "Image Carousel",
  STANDARD_COMPARISON_TABLE: "Comparison Table",
  STANDARD_TEXT: "Text Block",
  STANDARD_COMPANY_LOGO: "Brand Logo",
  STANDARD_IMAGE_TEXT_OVERLAY: "Full-Width Banner",
  STANDARD_IMAGE_SIDEBAR: "Image Sidebar",
};

function AltTextMeter({ altText }: { altText: string }) {
  const len = altText.length;
  const pct = Math.min(100, Math.round((len / 100) * 100));
  const isOver = len > 100;
  const barColor = isOver ? "bg-rose-500" : len >= 80 ? "bg-amber-400" : "bg-sa-200";

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-zinc-500">Alt text</span>
        <span className={`text-xs ${isOver ? "text-rose-400" : "text-zinc-500"}`}>
          {len}/100 chars
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-400 mt-1 italic">{altText}</p>
    </div>
  );
}

function APlusModuleCard({ mod }: { mod: APlusModule }) {
  const label = APLUS_MODULE_LABELS[mod.type] ?? mod.type;

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-4 space-y-3">
      {/* Module header */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-sa-200/30 bg-sa-200/10 px-2 py-0.5 text-[10px] font-medium text-sa-200">
          {mod.position}
        </span>
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        <span className="text-xs text-zinc-600 ml-auto">{mod.type}</span>
      </div>

      {/* Headline */}
      {mod.headline && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="label-kicker text-zinc-500">HEADLINE</span>
            <span className="text-xs text-zinc-600">{mod.headline.length} chars</span>
          </div>
          <p className="text-sm font-medium text-zinc-200">{mod.headline}</p>
        </div>
      )}

      {/* Body */}
      {mod.body && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="label-kicker text-zinc-500">BODY</span>
            <span className="text-xs text-zinc-600">{mod.body.length} chars</span>
          </div>
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">{mod.body}</p>
        </div>
      )}

      {/* Primary image slot */}
      {mod.image && (
        <div className="rounded-md border border-white/5 bg-black/15 p-3">
          <span className="label-kicker text-zinc-500 block mb-1">IMAGE SLOT</span>
          <AltTextMeter altText={mod.image.alt_text} />
          {mod.image.image_guidance && (
            <p className="text-xs text-zinc-600 mt-2 italic">
              Photo guidance: {mod.image.image_guidance}
            </p>
          )}
        </div>
      )}

      {/* Multi-image slots */}
      {mod.images && mod.images.length > 0 && (
        <div className="space-y-2">
          {mod.images.map((img, j) => (
            <div key={j} className="rounded-md border border-white/5 bg-black/15 p-3">
              <span className="label-kicker text-zinc-500 block mb-1">IMAGE {j + 1}</span>
              <AltTextMeter altText={img.alt_text} />
              {img.image_guidance && (
                <p className="text-xs text-zinc-600 mt-2 italic">
                  Photo guidance: {img.image_guidance}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Highlights */}
      {mod.highlights && mod.highlights.length > 0 && (
        <div>
          <span className="label-kicker text-zinc-500 block mb-1">HIGHLIGHTS</span>
          <ul className="space-y-1">
            {mod.highlights.map((h, j) => (
              <li key={j} className="flex items-start gap-2 text-sm">
                <span className="text-zinc-600 mt-0.5">•</span>
                <span className="flex-1 text-zinc-300">{h}</span>
                <span className="text-xs text-zinc-600 shrink-0">{h.length} chars</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Specs table */}
      {mod.specs && Object.keys(mod.specs).length > 0 && (
        <div>
          <span className="label-kicker text-zinc-500 block mb-1">SPECS</span>
          <div className="rounded-md border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(mod.specs).map(([k, v]) => (
                  <tr key={k} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 px-3 text-zinc-500 w-1/3">{k}</td>
                    <td className="py-1.5 px-3 text-zinc-200">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function APlusSection({
  modules,
}: {
  modules: Listing["content"]["a_plus_modules"];
}) {
  if (!modules || modules.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Educational banner */}
      <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3">
        <p className="text-xs text-sky-300 leading-relaxed">
          <span className="font-medium">A+ Content indexing note:</span>{" "}
          A+ body text is <em>not</em> indexed by Amazon&apos;s A9 algorithm &mdash; write for conversion.
          Image alt text (max 100 chars) is partially indexed &mdash; use keywords there.
          Your standard description handles keyword indexing regardless.
        </p>
      </div>
      {modules.map((mod, i) => (
        <APlusModuleCard key={i} mod={mod} />
      ))}
    </div>
  );
}

function QAResultsSection({ results }: { results: QAResult[] }) {
  if (!results || results.length === 0) return null;

  const severityIcon = {
    error: <AlertCircle className="h-4 w-4 text-rose-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    info: <Info className="h-4 w-4 text-sky-400" />,
  };

  const severityBg = {
    error: "border-rose-400/20 bg-rose-400/5",
    warning: "border-amber-400/20 bg-amber-400/5",
    info: "border-sky-400/20 bg-sky-400/5",
  };

  return (
    <div className="card-subtle p-4">
      <span className="label-kicker text-zinc-400 block mb-3">QA Results</span>
      <div className="space-y-2">
        {results.map((result, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg border p-3 ${severityBg[result.severity]}`}
          >
            <span className="mt-0.5 shrink-0">{severityIcon[result.severity]}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-zinc-300 capitalize">
                  {result.field}
                </span>
                <span className="text-xs text-zinc-600">{result.rule}</span>
              </div>
              <p className="text-sm text-zinc-400">{result.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ListingDetail({ listing }: ListingDetailProps) {
  const { content, marketplace } = listing;
  const isAmazon = marketplace === "amazon";
  const [activeTab, setActiveTab] = useState<"listing" | "aplus">("listing");

  return (
    <div className="space-y-4">
      {/* Header with marketplace and score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {marketplaceIcons[marketplace]}
            <span className="capitalize">{marketplace}</span>
          </span>
          <span className="text-xs text-zinc-500">
            v{listing.version} &middot;{" "}
            {new Date(listing.created_at).toLocaleDateString()}
          </span>
        </div>
        {listing.score !== null && <ScoreBadge score={listing.score} size="lg" />}
      </div>

      {/* Tab switcher (Amazon only) */}
      {isAmazon && (
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1 w-fit">
          <button
            onClick={() => setActiveTab("listing")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
              activeTab === "listing"
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Listing
          </button>
          <button
            onClick={() => setActiveTab("aplus")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
              activeTab === "aplus"
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            A+ Content
            {content.a_plus_modules && content.a_plus_modules.length > 0 && (
              <span className="rounded-full bg-sa-200/20 text-sa-200 text-[10px] px-1.5 py-0.5">
                {content.a_plus_modules.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Listing tab (or non-Amazon flat layout) */}
      {(!isAmazon || activeTab === "listing") && (
        <>
          {/* Title */}
          <FieldSection label="Title" value={content.title} />

          {/* Subtitle (eBay) */}
          {content.subtitle && (
            <FieldSection label="Subtitle" value={content.subtitle} />
          )}

          {/* Bullets */}
          {content.bullets && <BulletsSection bullets={content.bullets} />}

          {/* Shelf Description (Walmart) */}
          {content.shelf_description && (
            <FieldSection label="Shelf Description" value={content.shelf_description} />
          )}

          {/* Description */}
          <FieldSection label="Description" value={content.description} />

          {/* Backend Keywords (Amazon) */}
          {content.backend_keywords && (
            <FieldSection label="Backend Search Terms" value={content.backend_keywords} />
          )}

          {/* SEO Title (Shopify) */}
          {content.seo_title && (
            <FieldSection label="SEO Title" value={content.seo_title} maxLength={70} />
          )}

          {/* Meta Description (Shopify) */}
          {content.meta_description && (
            <FieldSection
              label="Meta Description"
              value={content.meta_description}
              maxLength={160}
            />
          )}

          {/* Tags */}
          {content.tags && <TagsSection tags={content.tags} />}

          {/* Collections (Shopify) */}
          {content.collections && content.collections.length > 0 && (
            <TagsSection tags={content.collections} />
          )}

          {/* Item Specifics (eBay) */}
          {content.item_specifics &&
            Object.keys(content.item_specifics).length > 0 && (
              <KeyValueSection label="Item Specifics" data={content.item_specifics} />
            )}

          {/* Attributes (Walmart) */}
          {content.attributes &&
            Object.keys(content.attributes).length > 0 && (
              <KeyValueSection label="Attributes" data={content.attributes} />
            )}
        </>
      )}

      {/* A+ tab (Amazon only) */}
      {isAmazon && activeTab === "aplus" && (
        <APlusSection modules={content.a_plus_modules} />
      )}

      {/* Photo Recommendations — always visible below tabs */}
      {content.photo_recommendations && (
        <PhotoRecommendationsSection photos={content.photo_recommendations} />
      )}

      {/* QA Results — always visible below tabs */}
      {listing.qa_results && <QAResultsSection results={listing.qa_results} />}
    </div>
  );
}
