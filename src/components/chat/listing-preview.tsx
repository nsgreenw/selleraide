"use client";

import { useCallback, useState } from "react";
import { FileText, Globe, Layers, ShoppingCart, Sparkles, Store, Tag } from "lucide-react";
import TitleVariants from "@/components/listing/title-variants";
import { EditableText, EditableList, EditableKeyValue } from "@/components/listing/editable-field";
import type { APlusModule, Listing, ListingContent, Marketplace } from "@/types";

function MarketplaceBadge({ marketplace }: { marketplace: Marketplace }) {
  const config: Record<
    Marketplace,
    { label: string; icon: React.ReactNode }
  > = {
    amazon: { label: "Amazon", icon: <ShoppingCart className="h-3 w-3" /> },
    walmart: { label: "Walmart", icon: <Store className="h-3 w-3" /> },
    ebay: { label: "eBay", icon: <Tag className="h-3 w-3" /> },
    etsy: { label: "Etsy", icon: <FileText className="h-3 w-3" /> },
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
  listingId?: string;
  onListingUpdated?: (listing: Listing) => void;
}

export default function ListingPreview({
  content,
  marketplace,
  listingId,
  onListingUpdated,
}: ListingPreviewProps) {
  const isAmazon = marketplace === "amazon";
  const [activeTab, setActiveTab] = useState<"listing" | "aplus">("listing");
  const [showVariants, setShowVariants] = useState(false);

  const saveField = useCallback(
    async (fieldKey: string, value: unknown) => {
      if (!listingId) throw new Error("No listing ID");
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { [fieldKey]: value } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const { data } = await res.json();
      onListingUpdated?.(data);
    },
    [listingId, onListingUpdated]
  );

  const onSave = listingId && onListingUpdated ? saveField : undefined;

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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <EditableText
                  label="Title"
                  value={content.title}
                  fieldKey="title"
                  onSave={onSave}
                />
              </div>
              {listingId && onListingUpdated && (
                <button
                  onClick={() => setShowVariants(!showVariants)}
                  className={`btn-secondary flex items-center gap-1.5 shrink-0 self-start mt-1 px-3 py-1.5 text-xs ${
                    showVariants ? "text-sa-200 border-sa-200/30" : ""
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Variants
                </button>
              )}
            </div>
            {showVariants && listingId && onListingUpdated && (
              <TitleVariants
                listingId={listingId}
                marketplace={marketplace}
                currentTitle={content.title}
                onTitleUpdated={(updated) => {
                  onListingUpdated(updated);
                  setShowVariants(false);
                }}
                onClose={() => setShowVariants(false)}
              />
            )}
          </div>

          {/* Subtitle */}
          {content.subtitle && (
            <EditableText
              label="Subtitle"
              value={content.subtitle}
              fieldKey="subtitle"
              onSave={onSave}
            />
          )}

          {/* Bullets */}
          {content.bullets && content.bullets.length > 0 && (
            <EditableList
              label="Bullet Points"
              items={content.bullets}
              fieldKey="bullets"
              onSave={onSave}
            />
          )}

          {/* Description */}
          {content.description && (
            <EditableText
              label="Description"
              value={content.description}
              fieldKey="description"
              onSave={onSave}
            />
          )}

          {/* Backend Keywords */}
          {content.backend_keywords && (
            <EditableText
              label="Backend Keywords"
              value={content.backend_keywords}
              fieldKey="backend_keywords"
              onSave={onSave}
            />
          )}

          {/* SEO Title (Shopify) */}
          {content.seo_title && (
            <EditableText
              label="SEO Title"
              value={content.seo_title}
              fieldKey="seo_title"
              onSave={onSave}
              maxLength={70}
            />
          )}

          {/* Meta Description (Shopify) */}
          {content.meta_description && (
            <EditableText
              label="Meta Description"
              value={content.meta_description}
              fieldKey="meta_description"
              onSave={onSave}
              maxLength={160}
            />
          )}

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <EditableList
              label="Tags"
              items={content.tags}
              fieldKey="tags"
              onSave={onSave}
              renderAsTags
            />
          )}

          {/* Materials (Etsy) */}
          {content.materials && content.materials.length > 0 && (
            <EditableList
              label="Materials"
              items={content.materials}
              fieldKey="materials"
              onSave={onSave}
              renderAsTags
            />
          )}

          {/* Variations (Etsy) */}
          {content.variations && Object.keys(content.variations).length > 0 && (
            <EditableKeyValue
              label="Variations"
              data={content.variations}
              fieldKey="variations"
              onSave={onSave}
            />
          )}

          {/* Personalization (Etsy) */}
          {content.personalization_instructions && (
            <EditableText
              label="Personalization"
              value={content.personalization_instructions}
              fieldKey="personalization_instructions"
              onSave={onSave}
            />
          )}

          {/* Shipping Notes (Etsy) */}
          {content.shipping_notes && (
            <EditableText
              label="Shipping & Processing"
              value={content.shipping_notes}
              fieldKey="shipping_notes"
              onSave={onSave}
            />
          )}

          {/* Category Hint (Etsy) */}
          {content.category_hint && (
            <EditableText
              label="Suggested Category"
              value={content.category_hint}
              fieldKey="category_hint"
              onSave={onSave}
            />
          )}

          {/* Returns Notes */}
          {content.returns_notes && (
            <EditableText
              label="Returns & Exchanges"
              value={content.returns_notes}
              fieldKey="returns_notes"
              onSave={onSave}
            />
          )}

          {/* Item Specifics (eBay) */}
          {content.item_specifics &&
            Object.keys(content.item_specifics).length > 0 && (
              <EditableKeyValue
                label="Item Specifics"
                data={content.item_specifics}
                fieldKey="item_specifics"
                onSave={onSave}
              />
            )}

          {/* Attributes (Walmart) */}
          {content.attributes && Object.keys(content.attributes).length > 0 && (
            <EditableKeyValue
              label="Attributes"
              data={content.attributes}
              fieldKey="attributes"
              onSave={onSave}
            />
          )}

          {/* Shelf Description (Walmart) */}
          {content.shelf_description && (
            <EditableText
              label="Shelf Description"
              value={content.shelf_description}
              fieldKey="shelf_description"
              onSave={onSave}
            />
          )}

          {/* Collections (Shopify) */}
          {content.collections && content.collections.length > 0 && (
            <EditableList
              label="Collections"
              items={content.collections}
              fieldKey="collections"
              onSave={onSave}
              renderAsTags
            />
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
