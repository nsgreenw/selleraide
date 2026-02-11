"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Marketplace, QAGrade, QAResult } from "@/types";
import { getGrade } from "@/types";

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
}

export default function QAResultsCard({
  results,
  score,
}: QAResultsCardProps) {
  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="label-kicker text-sa-200">QA RESULTS</p>
        <ScoreBadge score={score} />
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl font-semibold text-sa-100">{score}</span>
        <span className="text-lg text-zinc-400">/100</span>
        <GradeBadge grade={getGrade(score)} />
      </div>

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
