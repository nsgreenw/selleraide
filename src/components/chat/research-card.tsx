"use client";

import type { ResearchData } from "@/types";

interface ResearchCardProps {
  data: ResearchData;
}

export default function ResearchCard({ data }: ResearchCardProps) {
  return (
    <div className="card-subtle p-4">
      <p className="label-kicker text-sa-200 mb-3">RESEARCH</p>

      {/* Keywords */}
      {data.keywords && data.keywords.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-500 mb-1.5">Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {data.keywords.map((kw, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-zinc-300"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {data.trends && data.trends.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-500 mb-1.5">Trends</p>
          <div className="flex flex-wrap gap-1.5">
            {data.trends.map((trend, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-zinc-300"
              >
                {trend}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Insights */}
      {data.competitor_insights && data.competitor_insights.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-500 mb-1.5">
            Competitor Insights
          </p>
          <ul className="space-y-1">
            {data.competitor_insights.map((insight, i) => (
              <li key={i} className="text-sm text-zinc-300">
                - {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Notes */}
      {data.category_notes && (
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1.5">
            Category Notes
          </p>
          <p className="text-sm text-zinc-300">{data.category_notes}</p>
        </div>
      )}
    </div>
  );
}
