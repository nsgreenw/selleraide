"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  ShoppingCart,
  Tag,
  AlertCircle,
  AlertTriangle,
  Info,
  Plus,
  Loader2,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";
import type { QAGrade } from "@/types";
import type { ScoreBreakdown } from "@/lib/qa/scorer";
import type { QAResult } from "@/types";

type Marketplace = "amazon" | "ebay";

interface AuditResults {
  score: number;
  grade: QAGrade;
  breakdown: ScoreBreakdown[];
  validation: QAResult[];
}

export default function AuditPage() {
  const [marketplace, setMarketplace] = useState<Marketplace>("amazon");
  const [title, setTitle] = useState("");
  const [bullets, setBullets] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [backendKeywords, setBackendKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResults | null>(null);
  const [error, setError] = useState("");

  const addBullet = () => {
    if (bullets.length < 10) setBullets([...bullets, ""]);
  };

  const updateBullet = (index: number, value: string) => {
    const updated = [...bullets];
    updated[index] = value;
    setBullets(updated);
  };

  const removeBullet = (index: number) => {
    if (bullets.length > 1) {
      setBullets(bullets.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    setError("");
    setResults(null);
    setLoading(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace,
          title: title.trim(),
          bullets: bullets.filter((b) => b.trim().length > 0),
          description: description.trim(),
          ...(marketplace === "amazon" && backendKeywords.trim()
            ? { backend_keywords: backendKeywords.trim() }
            : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResults(data);
      }
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-400";
    if (score >= 50) return "bg-yellow-400";
    return "bg-red-400";
  };

  const gradeColor = (grade: QAGrade) => {
    if (grade === "A") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (grade === "B") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (grade === "C") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (grade === "D") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const severityOrder = { error: 0, warning: 1, info: 2 };
  const sortedValidation = results?.validation
    ? [...results.validation].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    : [];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          <Logo variant="full" size="sm" />
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
              <ArrowLeft className="size-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="label-kicker text-sa-200 mb-4">FREE LISTING AUDIT</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100 mb-3">
            Audit Your Listing
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Paste your listing content below and get an instant quality score with actionable feedback.
          </p>
        </div>

        {/* Form */}
        <div className="card-glass p-6 sm:p-8 mb-8">
          {/* Marketplace Toggle */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 block mb-3">Marketplace</label>
            <div className="flex gap-3">
              <button
                onClick={() => setMarketplace("amazon")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all ${
                  marketplace === "amazon"
                    ? "rounded-xl border border-sa-200/50 bg-sa-200/10 text-sa-200"
                    : "rounded-xl border border-white/10 bg-black/25 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ShoppingCart className="size-4" />
                Amazon
              </button>
              <button
                onClick={() => setMarketplace("ebay")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all ${
                  marketplace === "ebay"
                    ? "rounded-xl border border-sa-200/50 bg-sa-200/10 text-sa-200"
                    : "rounded-xl border border-white/10 bg-black/25 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Tag className="size-4" />
                eBay
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 block mb-2">Title</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your product title..."
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-sa-200/50 focus:outline-none resize-none"
            />
          </div>

          {/* Bullets */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 block mb-2">Bullet Points</label>
            <div className="space-y-2">
              {bullets.map((bullet, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={bullet}
                    onChange={(e) => updateBullet(i, e.target.value)}
                    placeholder={`Bullet point ${i + 1}`}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-sa-200/50 focus:outline-none"
                  />
                  {bullets.length > 1 && (
                    <button
                      onClick={() => removeBullet(i)}
                      className="px-3 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {bullets.length < 10 && (
              <button
                onClick={addBullet}
                className="mt-2 flex items-center gap-1 text-sm text-sa-200 hover:text-sa-100 transition-colors"
              >
                <Plus className="size-4" />
                Add Bullet
              </button>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 block mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter your product description..."
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-sa-200/50 focus:outline-none resize-none"
            />
          </div>

          {/* Backend Keywords (Amazon only) */}
          {marketplace === "amazon" && (
            <div className="mb-6">
              <label className="text-sm font-medium text-zinc-300 block mb-2">Backend Keywords</label>
              <input
                value={backendKeywords}
                onChange={(e) => setBackendKeywords(e.target.value)}
                placeholder="keyword1 keyword2 keyword3..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-sa-200/50 focus:outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">Space-separated, max 250 bytes</p>
            </div>
          )}

          {/* Submit */}
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !description.trim()}
            className="btn-primary w-full py-3 text-base gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ClipboardCheck className="size-5" />
                Audit Listing
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Score Overview */}
            <div className="card-glass p-6 sm:p-8">
              <p className="label-kicker text-sa-200 mb-4">AUDIT RESULTS</p>
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${scoreColor(results.score)}`}>
                    {results.score}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">out of 100</div>
                </div>
                <div
                  className={`px-4 py-2 rounded-xl border text-lg font-bold ${gradeColor(results.grade)}`}
                >
                  Grade: {results.grade}
                </div>
              </div>

              {/* Score bar */}
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(results.score)}`}
                  style={{ width: `${results.score}%` }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="card-glass p-6 sm:p-8">
              <p className="label-kicker text-sa-200 mb-4">SCORE BREAKDOWN</p>
              <div className="space-y-4">
                {results.breakdown.map((item) => (
                  <div key={item.criterion}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300 capitalize">
                        {item.criterion.replace(/_/g, " ")}
                      </span>
                      <span className={`text-sm font-medium ${scoreColor(item.score)}`}>
                        {item.score}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(item.score)}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Issues */}
            {sortedValidation.length > 0 && (
              <div className="card-glass p-6 sm:p-8">
                <p className="label-kicker text-sa-200 mb-4">
                  ISSUES ({sortedValidation.length})
                </p>
                <div className="space-y-3">
                  {sortedValidation.map((issue, i) => (
                    <div
                      key={i}
                      className="card-subtle p-4 flex items-start gap-3"
                    >
                      {issue.severity === "error" && (
                        <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
                      )}
                      {issue.severity === "warning" && (
                        <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      {issue.severity === "info" && (
                        <Info className="size-5 text-blue-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-sm text-zinc-200">{issue.message}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {issue.field} · {issue.rule}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedValidation.length === 0 && (
              <div className="card-glass p-6 text-center">
                <p className="text-emerald-400 text-sm">✓ No validation issues found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
