"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  ChevronDown,
} from "lucide-react";
import { useApp } from "@/components/providers";
import type { Listing, ListingImage } from "@/types";
import { EBAY_CONDITIONS, toEbayCondition } from "@/lib/ebay/conditions";
import ImageManager from "./image-manager";

interface CategoryCondition {
  conditionEnum: string;
  label: string;
  conditionId: string;
}

interface EbayPublishPanelProps {
  listing: Listing;
  onStatusChange?: (listing: Listing) => void;
}

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
}

interface PolicyOption {
  id: string;
  name: string;
}

interface PolicyData {
  fulfillment: PolicyOption[];
  return: PolicyOption[];
  payment: PolicyOption[];
}

interface PolicySelection {
  fulfillmentPolicyId: string;
  returnPolicyId: string;
  paymentPolicyId: string;
}

export default function EbayPublishPanel({
  listing,
  onStatusChange,
}: EbayPublishPanelProps) {
  const { ebayConnection, profile, refreshEbayConnection } = useApp();

  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("New");
  const [images, setImages] = useState<ListingImage[]>(listing.images ?? []);
  const [categoryQuery, setCategoryQuery] = useState(
    listing.content.category_hint ?? ""
  );
  const [categories, setCategories] = useState<CategorySuggestion[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategorySuggestion | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingCategories, setSearchingCategories] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(
    listing.ebay_error ?? null
  );

  // Policy selection state
  const [policies, setPolicies] = useState<PolicyData | null>(null);
  const [selectedPolicies, setSelectedPolicies] = useState<PolicySelection>({
    fulfillmentPolicyId: "",
    returnPolicyId: "",
    paymentPolicyId: "",
  });
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Category-specific valid conditions (fetched when category selected)
  const [categoryConditions, setCategoryConditions] = useState<
    CategoryCondition[] | null
  >(null);

  const status = listing.ebay_status ?? "none";

  // Fetch policies when the panel is ready
  useEffect(() => {
    if (!ebayConnection?.ready) return;
    setLoadingPolicies(true);
    fetch("/api/ebay/policies")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.policies) {
          setPolicies(data.policies);
          if (data.selected) {
            setSelectedPolicies(data.selected);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPolicies(false));
  }, [ebayConnection?.ready]);

  // Fetch valid conditions for the selected category so the dropdown only
  // shows conditions eBay will accept for that category. While category
  // conditions are loaded, `condition` state holds the eBay enum directly
  // (e.g. "LIKE_NEW") — otherwise it holds a friendly label from our
  // fallback list (e.g. "Open Box"). toEbayCondition handles both.
  useEffect(() => {
    if (!selectedCategory) {
      setCategoryConditions(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/ebay/conditions?categoryId=${encodeURIComponent(selectedCategory.categoryId)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CategoryCondition[] | null) => {
        if (cancelled || !data) return;
        setCategoryConditions(data);
        if (data.length > 0) {
          setCondition((current) => {
            const currentEnum = toEbayCondition(current);
            const match = data.find((c) => c.conditionEnum === currentEnum);
            return match ? match.conditionEnum : data[0].conditionEnum;
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  // Debounced category search
  useEffect(() => {
    if (!categoryQuery.trim() || categoryQuery.length < 2) {
      setCategories([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCategories(true);
      try {
        const res = await fetch(
          `/api/ebay/categories?q=${encodeURIComponent(categoryQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          setShowDropdown(true);
        }
      } catch {
        // Silently fail — user can retry
      } finally {
        setSearchingCategories(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [categoryQuery]);

  const handlePublish = useCallback(async () => {
    if (!selectedCategory || !price) return;

    setPublishing(true);
    setError(null);

    try {
      const res = await fetch("/api/ebay/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          price,
          quantity,
          categoryId: selectedCategory.categoryId,
          condition,
          ...(selectedPolicies.fulfillmentPolicyId && {
            fulfillmentPolicyId: selectedPolicies.fulfillmentPolicyId,
          }),
          ...(selectedPolicies.returnPolicyId && {
            returnPolicyId: selectedPolicies.returnPolicyId,
          }),
          ...(selectedPolicies.paymentPolicyId && {
            paymentPolicyId: selectedPolicies.paymentPolicyId,
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Publish failed");
        if (onStatusChange) {
          onStatusChange({
            ...listing,
            ebay_status: "error",
            ebay_error: data.error,
          });
        }
        return;
      }

      if (onStatusChange) {
        onStatusChange({
          ...listing,
          ebay_status: "live",
          ebay_listing_id: data.ebayListingId,
          ebay_offer_id: data.offerId,
          ebay_sku: data.sku,
          ebay_published_at: new Date().toISOString(),
          ebay_error: null,
        });
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setPublishing(false);
    }
  }, [listing, selectedCategory, price, quantity, condition, onStatusChange]);

  // Not connected state
  if (!ebayConnection?.connected) {
    return (
      <div className="card-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-zinc-400" />
          <span className="label-kicker text-zinc-400">Publish to eBay</span>
        </div>
        <p className="text-sm text-zinc-400 mb-3">
          Connect your eBay account to publish listings directly.
        </p>
        <a
          href="/settings"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          Connect eBay Account
        </a>
      </div>
    );
  }

  // Setup incomplete
  if (!ebayConnection.ready) {
    return (
      <div className="card-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-zinc-400" />
          <span className="label-kicker text-zinc-400">Publish to eBay</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-300">eBay account connected</span>
          </div>
          {!ebayConnection.policiesVerified && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-400">
                Business policies needed —{" "}
                <a
                  href="/settings"
                  className="text-sa-200 hover:underline"
                >
                  Complete setup
                </a>
              </span>
            </div>
          )}
          {!ebayConnection.locationConfigured && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-400">
                Inventory location needed —{" "}
                <a
                  href="/settings"
                  className="text-sa-200 hover:underline"
                >
                  Complete setup
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Subscription gate
  const paidTiers = ["starter", "pro", "agency"];
  if (!profile || !paidTiers.includes(profile.subscription_tier)) {
    return (
      <div className="card-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-zinc-400" />
          <span className="label-kicker text-zinc-400">Publish to eBay</span>
        </div>
        <p className="text-sm text-zinc-400 mb-3">
          eBay publishing requires a paid subscription.
        </p>
        <a
          href="/settings/billing"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          Upgrade Plan
        </a>
      </div>
    );
  }

  // Live state
  if (status === "live" && listing.ebay_listing_id) {
    return (
      <div className="card-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-emerald-400" />
          <span className="label-kicker text-emerald-400">Live on eBay</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
          <a
            href={`https://www.ebay.com/itm/${listing.ebay_listing_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sa-200 hover:underline inline-flex items-center gap-1"
          >
            View on eBay <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {listing.ebay_published_at && (
          <p className="text-xs text-zinc-500 mt-2">
            Published{" "}
            {new Date(listing.ebay_published_at).toLocaleDateString()}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={async () => {
              if (!confirm("End this eBay listing? It will be taken down from eBay.")) return;
              setError(null);
              try {
                const res = await fetch(
                  `/api/ebay/publish?listingId=${listing.id}`,
                  { method: "DELETE" }
                );
                const data = await res.json();
                if (!res.ok) {
                  setError(data.error ?? "Failed to end listing");
                  return;
                }
                if (onStatusChange) {
                  onStatusChange({
                    ...listing,
                    ebay_status: "ended",
                    ebay_error: null,
                  });
                }
              } catch {
                setError("Network error — please try again");
              }
            }}
            className="btn-secondary px-3 py-1.5 text-xs text-rose-300 border-rose-400/20 hover:bg-rose-400/10"
          >
            End Listing
          </button>
        </div>
        {error && (
          <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-2 mt-2">
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Ended state — can re-publish
  if (status === "ended") {
    return (
      <div className="card-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-zinc-500" />
          <span className="label-kicker text-zinc-500">Ended on eBay</span>
        </div>
        <p className="text-sm text-zinc-400 mb-3">
          This listing has been taken down from eBay. You can publish it again.
        </p>
      </div>
    );
  }

  // Publishing state
  if (status === "publishing" || publishing) {
    return (
      <div className="card-glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-amber-400" />
          <span className="label-kicker text-amber-400">Publishing</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Publishing to eBay...
        </div>
      </div>
    );
  }

  // Ready / Error state — show publish form
  return (
    <div className="card-glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-4 w-4 text-zinc-400" />
        <span className="label-kicker text-zinc-400">Publish to eBay</span>
      </div>

      {/* Error banner */}
      {(error || status === "error") && (
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-300">
              {error || listing.ebay_error || "Publishing failed"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Price */}
        <div>
          <label className="label-kicker text-zinc-500 block mb-1">
            Price (USD)
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="29.99"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sa-200/50 focus:outline-none"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="label-kicker text-zinc-500 block mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
            min={1}
            max={99999}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 focus:border-sa-200/50 focus:outline-none"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="label-kicker text-zinc-500 block mb-1">
            Condition
          </label>
          <div className="relative">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              disabled={!selectedCategory}
              className="w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-8 text-sm text-zinc-200 focus:border-sa-200/50 focus:outline-none disabled:opacity-50"
            >
              {categoryConditions && categoryConditions.length > 0
                ? categoryConditions.map((c) => (
                    <option key={c.conditionId} value={c.conditionEnum}>
                      {c.label}
                    </option>
                  ))
                : EBAY_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          </div>
          {!selectedCategory && (
            <p className="text-xs text-zinc-500 mt-1">
              Select a category first
            </p>
          )}
        </div>

        {/* Business Policies */}
        {loadingPolicies && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading policies...
          </div>
        )}
        {policies && (
          <>
            {policies.fulfillment.length > 1 && (
              <div>
                <label className="label-kicker text-zinc-500 block mb-1">
                  Shipping Policy
                </label>
                <div className="relative">
                  <select
                    value={selectedPolicies.fulfillmentPolicyId}
                    onChange={(e) =>
                      setSelectedPolicies((p) => ({
                        ...p,
                        fulfillmentPolicyId: e.target.value,
                      }))
                    }
                    className="w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-8 text-sm text-zinc-200 focus:border-sa-200/50 focus:outline-none"
                  >
                    {policies.fulfillment.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            )}
            {policies.return.length > 1 && (
              <div>
                <label className="label-kicker text-zinc-500 block mb-1">
                  Return Policy
                </label>
                <div className="relative">
                  <select
                    value={selectedPolicies.returnPolicyId}
                    onChange={(e) =>
                      setSelectedPolicies((p) => ({
                        ...p,
                        returnPolicyId: e.target.value,
                      }))
                    }
                    className="w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-8 text-sm text-zinc-200 focus:border-sa-200/50 focus:outline-none"
                  >
                    {policies.return.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            )}
            {policies.payment.length > 1 && (
              <div>
                <label className="label-kicker text-zinc-500 block mb-1">
                  Payment Policy
                </label>
                <div className="relative">
                  <select
                    value={selectedPolicies.paymentPolicyId}
                    onChange={(e) =>
                      setSelectedPolicies((p) => ({
                        ...p,
                        paymentPolicyId: e.target.value,
                      }))
                    }
                    className="w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-8 text-sm text-zinc-200 focus:border-sa-200/50 focus:outline-none"
                  >
                    {policies.payment.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Category search */}
        <div className="relative">
          <label className="label-kicker text-zinc-500 block mb-1">
            eBay Category
          </label>
          {selectedCategory ? (
            <div className="flex items-center gap-2 rounded-lg border border-sa-200/30 bg-sa-200/5 px-3 py-2">
              <span className="text-sm text-zinc-200 flex-1">
                {selectedCategory.categoryName}
              </span>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setCategoryQuery("");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  onFocus={() => categories.length > 0 && setShowDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowDropdown(false), 200)
                  }
                  placeholder="Search eBay categories..."
                  className="w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sa-200/50 focus:outline-none"
                />
                {searchingCategories && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />
                )}
              </div>
              {showDropdown && categories.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 shadow-lg">
                  {categories.map((cat) => (
                    <button
                      key={cat.categoryId}
                      onMouseDown={() => {
                        setSelectedCategory(cat);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 transition"
                    >
                      {cat.categoryName}
                      <span className="text-xs text-zinc-600 ml-2">
                        #{cat.categoryId}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Images */}
        <ImageManager
          listingId={listing.id}
          images={images}
          onChange={(next) => {
            setImages(next);
            if (onStatusChange) {
              onStatusChange({ ...listing, images: next });
            }
          }}
        />

        {/* Publish button */}
        <button
          onClick={handlePublish}
          disabled={
            !price || !selectedCategory || images.length === 0 || publishing
          }
          className="btn-primary w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : status === "error" ? (
            "Retry Publish"
          ) : (
            "Publish to eBay"
          )}
        </button>
      </div>
    </div>
  );
}
