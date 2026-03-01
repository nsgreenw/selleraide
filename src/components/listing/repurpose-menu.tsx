"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Loader2 } from "lucide-react";
import type { Marketplace } from "@/types";

const MARKETPLACES = [
  { id: "amazon" as Marketplace, label: "Amazon", color: "#ff9900" },
  { id: "ebay" as Marketplace, label: "eBay", color: "#e53238" },
  { id: "walmart" as Marketplace, label: "Walmart", color: "#0071ce" },
  { id: "shopify" as Marketplace, label: "Shopify", color: "#96bf48" },
];

const PROGRESS_STEPS = [
  { message: "Analyzing source listing…", pct: 10, delay: 0 },
  { message: "Researching marketplace keywords…", pct: 30, delay: 8000 },
  { message: "Generating optimized listing…", pct: 55, delay: 25000 },
  { message: "Running quality analysis…", pct: 80, delay: 60000 },
  { message: "Almost there — saving your listing…", pct: 92, delay: 90000 },
];

interface RepurposeMenuProps {
  listingId: string;
  currentMarketplace: Marketplace;
}

export default function RepurposeMenu({ listingId, currentMarketplace }: RepurposeMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetLabel, setTargetLabel] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Advance progress steps on timers
  useEffect(() => {
    if (!loading) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < PROGRESS_STEPS.length; i++) {
      timers.push(
        setTimeout(() => setStepIndex(i), PROGRESS_STEPS[i].delay)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  async function handleRepurpose(marketplace: Marketplace) {
    const label = MARKETPLACES.find((m) => m.id === marketplace)?.label ?? marketplace;
    setOpen(false);
    setLoading(true);
    setTargetLabel(label);
    setStepIndex(0);

    try {
      const response = await fetch(`/api/listings/${listingId}/repurpose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Repurpose failed");
      }

      const data = await response.json();
      router.push(`/listings/${data.listing.id}`);
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : "Failed to repurpose listing.");
    }
  }

  const currentStep = PROGRESS_STEPS[stepIndex];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          disabled={loading}
          className="btn-secondary gap-2 text-sm"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Repeat className="h-4 w-4" />
          )}
          {loading ? "Repurposing…" : "Repurpose"}
        </button>

        {open && (
          <div className="card-glass absolute right-0 top-full mt-2 w-48 p-2 z-10">
            {MARKETPLACES.map((mp) => {
              const isCurrent = mp.id === currentMarketplace;
              return (
                <button
                  key={mp.id}
                  onClick={() => !isCurrent && handleRepurpose(mp.id)}
                  disabled={isCurrent}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-full transition duration-200 ${
                    isCurrent
                      ? "text-zinc-600 cursor-not-allowed"
                      : "text-zinc-300 hover:bg-white/[0.07] cursor-pointer"
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isCurrent ? undefined : mp.color }}
                  />
                  {mp.label}
                  {isCurrent && <span className="ml-auto text-xs text-zinc-600">(current)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-screen progress overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="card-glass w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-sa-200 flex-shrink-0" />
              <h3 className="text-base font-semibold text-zinc-100">
                Repurposing to {targetLabel}
              </h3>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sa-200 transition-all duration-1000 ease-out"
                  style={{ width: `${currentStep.pct}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">{currentStep.message}</p>
            </div>

            <p className="text-xs text-zinc-500">
              This usually takes 1–2 minutes. Please don&apos;t close or refresh the page.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
