"use client";

import { useState, useEffect } from "react";
import { Search, FileText, ShieldCheck, CheckCircle } from "lucide-react";

const STAGES = [
  {
    label: "Analyzing your product",
    icon: Search,
    duration: 3000,
  },
  {
    label: "Researching keywords & trends",
    icon: Search,
    duration: 5000,
  },
  {
    label: "Generating optimized listing",
    icon: FileText,
    duration: 7000,
  },
  {
    label: "Running quality checks",
    icon: ShieldCheck,
    duration: Infinity,
  },
];

export default function GenerationProgress() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    for (let i = 0; i < STAGES.length - 1; i++) {
      elapsed += STAGES[i].duration;
      const target = i + 1;
      timers.push(setTimeout(() => setActiveStage(target), elapsed));
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="h-1 rounded-full bg-white/10">
          <div
            className="h-1 rounded-full bg-sa-200 transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min(((activeStage + 1) / STAGES.length) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isActive = i === activeStage;
          const isDone = i < activeStage;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-500 ${
                isActive
                  ? "bg-sa-200/10 border border-sa-200/25"
                  : isDone
                    ? "opacity-50"
                    : "opacity-25"
              }`}
            >
              {isDone ? (
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : isActive ? (
                <div className="relative shrink-0">
                  <Icon className="h-4 w-4 text-sa-200" />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sa-200 animate-ping" />
                </div>
              ) : (
                <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isActive
                    ? "text-sa-100 font-medium"
                    : isDone
                      ? "text-zinc-400"
                      : "text-zinc-600"
                }`}
              >
                {stage.label}
                {isActive && (
                  <span className="ml-1 inline-flex">
                    <span className="animate-pulse">...</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
