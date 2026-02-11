"use client";

import { getGrade } from "@/types";
import type { QAGrade } from "@/types";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const colorMap: Record<QAGrade, { text: string; bg: string; border: string }> = {
  A: { text: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-300/25" },
  B: { text: "text-sa-200", bg: "bg-[rgba(246,203,99,0.1)]", border: "border-[rgba(246,203,99,0.25)]" },
  C: { text: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-300/25" },
  D: { text: "text-rose-300", bg: "bg-rose-400/10", border: "border-rose-300/25" },
  F: { text: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/25" },
};

const sizeMap = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-20 h-20 text-2xl",
};

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const grade = getGrade(score);
  const colors = colorMap[grade];
  const dimensions = sizeMap[size];

  return (
    <div
      className={`rounded-full border flex items-center justify-center font-semibold ${dimensions} ${colors.text} ${colors.bg} ${colors.border}`}
      title={`Score: ${score} (${grade})`}
    >
      {score}
    </div>
  );
}
