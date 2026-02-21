"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Info, Loader2, Wrench } from "lucide-react";
import type { Listing, Marketplace, QAGrade, QAResult } from "@/types";
import { getGrade, getListingStatus } from "@/types";

function ScoreBadge({ score }: { score: number }) {
  const grade = getGrade(score);
  const gradeColors: Record<QAGrade, string> = {
    A: "text-emerald-300 bg-emerald-400/10 border-emerald-300/25",
    B: "",
    C: "text-amber-300 bg-amber-400/10 border-amber-300/25",
    D: "text-rose-300 bg-rose-400/10 border-rose-300/25",
    F: "text-rose-300 bg-rose-400/10 border-rose-300/25",
  };

  const isBGrade = grade === "B";
  const baseClass = "rounded-full px-3 py-1 text-sm font-semibold border";

  return (
    <span
      className={`${baseClass} ${isBGrade ? "" : gradeColors[grade]}`}
      style={
        isBGrade
          ? {
              color: "var(--sa-200)",
              backgroundColor:
                "color-mix(in srgb, var(--sa-200) 10%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--sa-200) 25%, transparent)",
            }
          : undefined
      }
    >
      {grade}
    </span>
  );
}

function GradeBadge({ grade }: { grade: QAGrade }) {
  const labels: Record<QAGrade, string> = {
    A: "Excellent",
    B: "Good",
    C: "Fair",
    D: "Poor",
    F: "Failing",
  };

  const colors: Record<QAGrade, string> = {
    A: "text-emerald-300",
    B: "",
    C: "text-amber-300",
    D: "text-rose-300",
    F: "text-rose-300",
  };

  const isBGrade = grade === "B";

  return (
    <span
      className={`text-sm font-medium ${isBGrade ? "" : colors[grade]}`}
      style={isBGrade ? { color: "var(--sa-200)" } : undefined}
    >
      {labels[grade]}
    </span>
  );
}

function StatusBadge({ score }: { score: number }) {
  const status = getListingStatus(score);
  const config = {
    ready: { label: "Ready", className: "text-emerald-300" },
    needs_revision: { label: "Needs Revision", className: "text-amber-300" },
    regenerate: { label: "Regenerate", className: "text-rose-300" },
  }[status];

  return (
    <span className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: QAResult["severity"] }) {
  switch (severity) {
    case "error":
      return <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />;
    case "info":
      return <Info className="h-4 w-4 shrink-0 text-blue-400" />;
  }
}

interface QAResultsCardProps {
  results: QAResult[];
  score: number;
  marketplace: Marketplace;
  listingId?: string;
  onRefined?: (listing: Listing) => void;
}

export default function QAResultsCard({
  results,
  score,
  marketplace,
  listingId,
  onRefined,
}: QAResultsCardProps) {
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const status = getListingStatus(score);
  const showFixButton = status !== "ready" && !!listingId && !!onRefined;

  async function handleAutoFix() {
    if (!listingId || !onRefined || fixing) return;
    setFixing(true);
    setFixError(null);

    const issues = results
      .filter((r) => r.severity === "error" || r.severity === "warning")
      .map((r) => `- ${r.field}: ${r.message}`)
      .join("\n");

    const marketplaceName = marketplace.charAt(0).toUpperCase() + marketplace.slice(1);
    const instruction = `Auto-fix this ${marketplaceName} listing. Issues to resolve:\n${issues || "General quality improvements needed."}\nAim for a score of 85 or higher.`;

    try {
      const response = await fetch(`/api/listings/${listingId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to auto-fix listing");
      }

      const data = await response.json();
      onRefined(data.listing);
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFixing(false);
    }
  }

  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="label-kicker text-sa-200">QA RESULTS</p>
        <ScoreBadge score={score} />
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4 mb-1">
        <span className="text-4xl font-semibold text-sa-100">{score}</span>
        <span className="text-lg text-zinc-400">/100</span>
        <GradeBadge grade={getGrade(score)} />
      </div>
      <div className="mb-4">
        <StatusBadge score={score} />
      </div>

      {/* Auto-fix button */}
      {showFixButton && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleAutoFix}
            disabled={fixing}
            className="btn-secondary text-sm gap-2 py-2"
          >
            {fixing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            {fixing
              ? "Fixing..."
              : `Fix for ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}`}
          </button>
          {fixError && (
            <p className="mt-2 text-xs text-rose-300">{fixError}</p>
          )}
        </div>
      )}

      {/* Issues list */}
      {results.length === 0 ? (
        <p className="text-sm text-emerald-300">No issues found!</p>
      ) : (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="card-subtle px-3 py-2 flex items-start gap-2">
              <SeverityIcon severity={r.severity} />
              <div className="text-sm text-zinc-300">
                <span className="label-kicker text-zinc-500">{r.field}</span>
                <p>{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
