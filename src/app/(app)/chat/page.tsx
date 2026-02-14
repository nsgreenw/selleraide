"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import MarketplacePicker from "@/components/chat/marketplace-picker";
import GenerationProgress from "@/components/chat/generation-progress";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import type { Marketplace } from "@/types";

export default function NewListingPage() {
  const router = useRouter();
  const [marketplace, setMarketplace] = useState<Marketplace>("amazon");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    async function checkFirstTime() {
      const supabase = createClient();
      const { count } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true });
      if (count === 0) setIsFirstTime(true);
    }
    checkFirstTime();
  }, []);

  async function handleGenerate() {
    const trimmed = description.trim();
    if (!trimmed || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace,
          product_description: trimmed,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate listing");
      }

      const data = await response.json();
      router.push(`/chat/${data.conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="New Listing" />

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* First-time welcome */}
          {isFirstTime && !generating && (
            <div className="card-glass p-5 mb-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-3">
                Welcome to SellerAide
              </h2>
              <div className="space-y-2 text-sm text-zinc-400">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sa-200/15 text-xs font-semibold text-sa-200">1</span>
                  <span><span className="text-zinc-200">Describe your product</span> — the more detail, the better your listing</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sa-200/15 text-xs font-semibold text-sa-200">2</span>
                  <span><span className="text-zinc-200">We research &amp; generate</span> — keywords, competitors, and optimized copy</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sa-200/15 text-xs font-semibold text-sa-200">3</span>
                  <span><span className="text-zinc-200">Refine &amp; export</span> — tweak via chat, then download as PDF or CSV</span>
                </div>
              </div>
            </div>
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 mb-2">
            Create a new listing
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            Describe your product and we'll generate an optimized,
            marketplace-compliant listing.
          </p>

          {/* Marketplace picker */}
          <div className="mb-5">
            <label className="label-kicker text-zinc-500 mb-2 block">
              MARKETPLACE
            </label>
            <MarketplacePicker
              value={marketplace}
              onChange={setMarketplace}
              disabled={generating}
            />
          </div>

          {/* Product description input */}
          <div className="mb-5">
            <label className="label-kicker text-zinc-500 mb-2 block">
              PRODUCT DETAILS
            </label>
            <textarea
              className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sa-200/70 outline-none resize-none"
              rows={8}
              placeholder={`Tell us everything about your product:\n\n• Brand name\n• What the product is\n• Key features & specifications\n• Colors, sizes, materials\n• Who it's for (target audience)\n• What makes it different from competitors\n• Price point (optional)`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={generating}
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              The more detail you provide, the better your listing will be.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {/* Generate button */}
          {!generating && (
            <button
              onClick={handleGenerate}
              className="btn-primary w-full"
              disabled={description.trim().length < 10}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Listing
            </button>
          )}

          {/* Progress indicator during generation */}
          {generating && (
            <div className="mt-2">
              <GenerationProgress />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
