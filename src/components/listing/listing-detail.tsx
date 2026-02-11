"use client";

import {
  ShoppingCart,
  Store,
  Tag,
  Globe,
  Camera,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import ScoreBadge from "./score-badge";
import type { Listing, Marketplace, QAResult } from "@/types";

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

function APlusSection({
  modules,
}: {
  modules: Listing["content"]["a_plus_modules"];
}) {
  if (!modules || modules.length === 0) return null;

  return (
    <div className="card-subtle p-4">
      <span className="label-kicker text-zinc-400 block mb-2">A+ Content Modules</span>
      <div className="space-y-3">
        {modules.map((mod, i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-3">
            <span className="text-xs font-medium text-sa-200 capitalize">{mod.type}</span>
            {mod.headline && (
              <p className="text-sm font-medium text-zinc-200 mt-1">{mod.headline}</p>
            )}
            {mod.body && (
              <p className="text-sm text-zinc-400 mt-1">{mod.body}</p>
            )}
            {mod.image_alt && (
              <p className="text-xs text-zinc-600 mt-1">Alt: {mod.image_alt}</p>
            )}
          </div>
        ))}
      </div>
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

      {/* A+ Modules */}
      {content.a_plus_modules && (
        <APlusSection modules={content.a_plus_modules} />
      )}

      {/* Photo Recommendations */}
      {content.photo_recommendations && (
        <PhotoRecommendationsSection photos={content.photo_recommendations} />
      )}

      {/* QA Results */}
      {listing.qa_results && <QAResultsSection results={listing.qa_results} />}
    </div>
  );
}
