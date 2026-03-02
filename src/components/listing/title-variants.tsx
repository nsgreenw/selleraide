"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import ScoreBadge from "./score-badge";
import type { Listing, Marketplace, QAResult } from "@/types";

interface TitleVariant {
  title: string;
  strategy: string;
  notes: string;
  score: number;
  violations: QAResult[];
}

interface TitleVariantsProps {
  listingId: string;
  marketplace: Marketplace;
  currentTitle: string;
  onTitleUpdated: (listing: Listing) => void;
  onClose: () => void;
}

type PanelState = "loading" | "loaded" | "applying";

const STRATEGY_LABELS: Record<string, string> = {
  "keyword-front-loaded": "Keyword-First",
  "benefit-led": "Benefit-Led",
  "long-tail": "Long-Tail",
  "brand-forward": "Brand-Forward",
  "compact-punchy": "Compact",
};

export default function TitleVariants({
  listingId,
  currentTitle,
  onTitleUpdated,
  onClose,
}: TitleVariantsProps) {
  const [state, setState] = useState<PanelState>("loading");
  const [variants, setVariants] = useState<TitleVariant[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVariants() {
      try {
        const res = await fetch(`/api/listings/${listingId}/title-variants`, {
          method: "POST",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to generate variants");
        }

        const data = await res.json();
        if (!cancelled) {
          setVariants(data.variants);
          setCurrentScore(data.current.score);
          setState("loaded");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setState("loaded");
        }
      }
    }

    fetchVariants();
    return () => { cancelled = true; };
  }, [listingId]);

  async function applyVariant(index: number) {
    const variant = variants[index];
    if (!variant) return;

    setState("applying");
    setApplyingIndex(index);

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { title: variant.title } }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to apply title");
      }

      const updatedListing = await res.json();
      onTitleUpdated(updatedListing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply title");
      setState("loaded");
      setApplyingIndex(null);
    }
  }

  return (
    <div className="card-glass p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="label-kicker text-zinc-400">Title Variants</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Loading state */}
      {state === "loading" && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-sa-200" />
          <span className="text-sm text-zinc-400">Generating title variants...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {/* Loaded state */}
      {state !== "loading" && !error && (
        <>
          {/* Current title for comparison */}
          {currentScore !== null && (
            <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 p-3">
              <ScoreBadge score={currentScore} size="sm" />
              <div className="min-w-0 flex-1">
                <span className="label-kicker text-zinc-500 text-[10px]">CURRENT</span>
                <p className="text-sm text-zinc-300 truncate">{currentTitle}</p>
              </div>
            </div>
          )}

          {/* Variants list */}
          <div className="space-y-2">
            {variants.map((variant, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3 hover:border-white/10 transition"
              >
                <ScoreBadge score={variant.score} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full border border-sa-200/30 bg-sa-200/10 px-2 py-0.5 text-[10px] font-medium text-sa-200">
                      {STRATEGY_LABELS[variant.strategy] ?? variant.strategy}
                    </span>
                    {variant.score > (currentScore ?? 0) && (
                      <span className="text-[10px] text-emerald-400">
                        +{variant.score - (currentScore ?? 0)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-200">{variant.title}</p>
                  {variant.notes && (
                    <p className="text-xs text-zinc-500 mt-1">{variant.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => applyVariant(i)}
                  disabled={state === "applying"}
                  className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {state === "applying" && applyingIndex === i ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Use This"
                  )}
                </button>
              </div>
            ))}
          </div>

          {variants.length === 0 && !error && (
            <p className="text-sm text-zinc-500 text-center py-4">
              No valid variants generated. Try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
