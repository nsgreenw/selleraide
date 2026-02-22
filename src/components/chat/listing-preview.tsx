"use client";

import { useState } from "react";
import { Globe, Layers, ShoppingCart, Store, Tag } from "lucide-react";
import type { APlusModule, ListingContent, Marketplace } from "@/types";

function MarketplaceBadge({ marketplace }: { marketplace: Marketplace }) {
  const config: Record<
    Marketplace,
    { label: string; icon: React.ReactNode }
  > = {
    amazon: { label: "Amazon", icon: <ShoppingCart className="h-3 w-3" /> },
    walmart: { label: "Walmart", icon: <Store className="h-3 w-3" /> },
    ebay: { label: "eBay", icon: <Tag className="h-3 w-3" /> },
    shopify: { label: "Shopify", icon: <Globe className="h-3 w-3" /> },
  };

  const { label, icon } = config[marketplace];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-400">
      {icon}
      {label}
    </span>
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

function APlusModulePreview({ mod }: { mod: APlusModule }) {
  const label = APLUS_MODULE_LABELS[mod.type] ?? mod.type;
  return (
    <div className="rounded-lg border border-white/5 bg-black/15 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-sa-200/30 bg-sa-200/10 px-1.5 py-0.5 text-[10px] font-medium text-sa-200">
          {mod.position}
        </span>
        <span className="text-xs font-medium text-zinc-300">{label}</span>
      </div>
      {mod.headline && (
        <div>
          <span className="label-kicker text-zinc-600 block mb-0.5">HEADLINE</span>
          <p className="text-sm font-medium text-zinc-200">{mod.headline}</p>
        </div>
      )}
      {mod.body && (
        <div>
          <span className="label-kicker text-zinc-600 block mb-0.5">BODY</span>
          <p className="text-sm text-zinc-300">{mod.body}</p>
        </div>
      )}
      {mod.image?.alt_text && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600">Alt: {mod.image.alt_text}</span>
          <span className={`text-xs ${mod.image.alt_text.length > 100 ? "text-rose-400" : "text-zinc-600"}`}>
            {mod.image.alt_text.length}/100
          </span>
        </div>
      )}
    </div>
  );
}

interface ListingPreviewProps {
  content: ListingContent;
  marketplace: Marketplace;
}

export default function ListingPreview({
  content,
  marketplace,
}: ListingPreviewProps) {
  const isAmazon = marketplace === "amazon";
  const [activeTab, setActiveTab] = useState<"listing" | "aplus">("listing");

  return (
    <div className="card-glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="label-kicker text-sa-200">LISTING PREVIEW</p>
        <MarketplaceBadge marketplace={marketplace} />
      </div>

      {/* Tab switcher (Amazon only) */}
      {isAmazon && (
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1 w-fit">
          <button
            onClick={() => setActiveTab("listing")}
            className={`rounded-md px-3 py-1 text-xs transition ${
              activeTab === "listing"
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Listing
          </button>
          <button
            onClick={() => setActiveTab("aplus")}
            className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs transition ${
              activeTab === "aplus"
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Layers className="h-3 w-3" />
            A+
            {content.a_plus_modules && content.a_plus_modules.length > 0 && (
              <span className="rounded-full bg-sa-200/20 text-sa-200 text-[10px] px-1">
                {content.a_plus_modules.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Listing tab content */}
      {(!isAmazon || activeTab === "listing") && (
        <>
          {/* Title */}
          <div className="card-subtle p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="label-kicker text-zinc-500">TITLE</span>
              <span className="text-xs text-zinc-500">
                {content.title.length} chars
              </span>
            </div>
            <p className="text-sm text-zinc-100">{content.title}</p>
          </div>

          {/* Subtitle */}
          {content.subtitle && (
            <div className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">SUBTITLE</span>
                <span className="text-xs text-zinc-500">
                  {content.subtitle.length} chars
                </span>
              </div>
              <p className="text-sm text-zinc-200">{content.subtitle}</p>
            </div>
          )}

          {/* Bullets */}
          {content.bullets?.map((bullet, i) => (
            <div key={i} className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">BULLET {i + 1}</span>
                <span className="text-xs text-zinc-500">
                  {bullet.length} chars
                </span>
              </div>
              <p className="text-sm text-zinc-200">{bullet}</p>
            </div>
          ))}

          {/* Description */}
          {content.description && (
            <div className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">DESCRIPTION</span>
                <span className="text-xs text-zinc-500">
                  {content.description.length} chars
                </span>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                {content.description}
              </p>
            </div>
          )}

          {/* Backend Keywords */}
          {content.backend_keywords && (
            <div className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">
                  BACKEND KEYWORDS
                </span>
                <span className="text-xs text-zinc-500">
                  {new TextEncoder().encode(content.backend_keywords).length} bytes
                </span>
              </div>
              <p className="text-sm text-zinc-200">{content.backend_keywords}</p>
            </div>
          )}

          {/* SEO Title (Shopify) */}
          {content.seo_title && (
            <div className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">SEO TITLE</span>
                <span className="text-xs text-zinc-500">
                  {content.seo_title.length} chars
                </span>
              </div>
              <p className="text-sm text-zinc-200">{content.seo_title}</p>
            </div>
          )}

          {/* Meta Description (Shopify) */}
          {content.meta_description && (
            <div className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">
                  META DESCRIPTION
                </span>
                <span className="text-xs text-zinc-500">
                  {content.meta_description.length} chars
                </span>
              </div>
              <p className="text-sm text-zinc-200">{content.meta_description}</p>
            </div>
          )}

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <div className="card-subtle p-3">
              <span className="label-kicker text-zinc-500 mb-2 block">TAGS</span>
              <div className="flex flex-wrap gap-1.5">
                {content.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Item Specifics (eBay) */}
          {content.item_specifics &&
            Object.keys(content.item_specifics).length > 0 && (
              <div className="card-subtle p-3">
                <span className="label-kicker text-zinc-500 mb-2 block">
                  ITEM SPECIFICS
                </span>
                <div className="space-y-1">
                  {Object.entries(content.item_specifics).map(([key, val]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="text-zinc-500">{key}:</span>
                      <span className="text-zinc-200">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Attributes (Walmart) */}
          {content.attributes && Object.keys(content.attributes).length > 0 && (
            <div className="card-subtle p-3">
              <span className="label-kicker text-zinc-500 mb-2 block">
                ATTRIBUTES
              </span>
              <div className="space-y-1">
                {Object.entries(content.attributes).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="text-zinc-500">{key}:</span>
                    <span className="text-zinc-200">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shelf Description (Walmart) */}
          {content.shelf_description && (
            <div className="card-subtle p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="label-kicker text-zinc-500">
                  SHELF DESCRIPTION
                </span>
                <span className="text-xs text-zinc-500">
                  {content.shelf_description.length} chars
                </span>
              </div>
              <p className="text-sm text-zinc-200">{content.shelf_description}</p>
            </div>
          )}

          {/* Collections (Shopify) */}
          {content.collections && content.collections.length > 0 && (
            <div className="card-subtle p-3">
              <span className="label-kicker text-zinc-500 mb-2 block">
                COLLECTIONS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {content.collections.map((col, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Photo Recommendations */}
          {content.photo_recommendations &&
            content.photo_recommendations.length > 0 && (
              <div className="card-subtle p-3">
                <span className="label-kicker text-zinc-500 mb-2 block">
                  PHOTO RECOMMENDATIONS
                </span>
                <div className="space-y-2">
                  {content.photo_recommendations.map((photo, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/5 bg-black/15 p-2.5"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-zinc-400">
                          Slot {photo.slot}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {photo.type}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200">{photo.description}</p>
                      {photo.tips.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {photo.tips.map((tip, j) => (
                            <li key={j} className="text-xs text-zinc-400">
                              - {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}

      {/* A+ tab (Amazon only) */}
      {isAmazon && activeTab === "aplus" && (
        <div className="space-y-3">
          {content.a_plus_modules && content.a_plus_modules.length > 0 ? (
            content.a_plus_modules.map((mod, i) => (
              <APlusModulePreview key={i} mod={mod} />
            ))
          ) : (
            <p className="text-sm text-zinc-500 text-center py-4">
              No A+ Content modules generated
            </p>
          )}
        </div>
      )}
    </div>
  );
}
