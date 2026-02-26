"use client";

import Link from "next/link";
import { useApp } from "@/components/providers";
import { getTrialStatus } from "@/lib/subscription/trial";

export function TrialBanner() {
  const { profile, loading } = useApp();

  if (loading || !profile) return null;

  const trial = getTrialStatus(profile);

  if (!trial.isTrialing) return null;

  if (trial.isExpired) {
    return (
      <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base">⏰</span>
          <p className="text-sm text-amber-200">
            Your free trial has ended. Upgrade to keep generating listings.
          </p>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          See Plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-sa-200/20 bg-sa-200/5 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-base">🎉</span>
        <p className="text-sm text-zinc-300">
          Free Trial:{" "}
          <span className="font-semibold text-sa-200">
            {trial.runsRemaining} of 3 generation{trial.runsRemaining !== 1 ? "s" : ""} left
          </span>
          {" · "}
          <span className="text-zinc-400">{trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""} remaining</span>
        </p>
      </div>
      <Link
        href="/settings/billing"
        className="shrink-0 rounded-lg border border-sa-200/30 bg-sa-200/10 px-3 py-1.5 text-xs font-semibold text-sa-200 transition hover:bg-sa-200/20"
      >
        Upgrade →
      </Link>
    </div>
  );
}
