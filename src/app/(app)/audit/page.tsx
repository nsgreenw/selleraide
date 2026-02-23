"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Tag,
  AlertCircle,
  AlertTriangle,
  Info,
  Plus,
  Loader2,
  ClipboardCheck,
  Wand2,
  Copy,
  Check,
} from "lucide-react";
import type { QAGrade } from "@/types";
import type { ScoreBreakdown } from "@/lib/qa/scorer";
import type { QAResult } from "@/types";
import type { OptimizeMode, OptimizeResult } from "@/lib/gemini/optimize";

type Marketplace = "amazon" | "ebay";

interface AuditResults {
  score: number;
  grade: QAGrade;
  breakdown: ScoreBreakdown[];
  validation: QAResult[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-zinc-500 hover:text-sa-200 transition-colors rounded-lg hover:bg-white/5"
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="size-4 text-emerald-400" />
        : <Copy className="size-4" />
      }
    </button>
  );
}

const MODE_LABELS: Record<OptimizeMode, string> = {
  targeted: "Targeted Fix",
  moderate: "Moderate Rewrite",
  full: "Full Rewrite",
};

const MODE_COLORS: Record<OptimizeMode, string> = {
  targeted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  moderate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  full: "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

function AuditContent() {
  const searchParams = useSearchParams();
  const [marketplace, setMarketplace] = useState<Marketplace>("amazon");
  const [title, setTitle] = useState("");
  const [bullets, setBullets] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [backendKeywords, setBackendKeywords] = useState("");
  const [aPlusModules, setAPlusModules] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResults | null>(null);
  const [error, setError] = useState("");

  // Optimize state
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError] = useState("");

  // Read ?data= param from extension and auto-run audit
  useEffect(() => {
    const raw = searchParams.get("data");
    if (!raw) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
      const mp: Marketplace =
        decoded.marketplace === "amazon" || decoded.marketplace === "ebay"
          ? decoded.marketplace
          : "amazon";
      const decodedTitle: string = decoded.title || "";
      const decodedBullets: string[] =
        Array.isArray(decoded.bullets) && decoded.bullets.length > 0
          ? decoded.bullets
          : [""];
      const decodedDescription: string = decoded.description || "";
      const decodedKeywords: string = decoded.backend_keywords || "";
      const decodedAPlusModules: unknown[] = Array.isArray(decoded.a_plus_modules) ? decoded.a_plus_modules : [];

      setMarketplace(mp);
      setTitle(decodedTitle);
      setBullets(decodedBullets);
      setDescription(decodedDescription);
      setBackendKeywords(decodedKeywords);
      setAPlusModules(decodedAPlusModules);

      // Auto-run audit using decoded values directly (avoids stale state)
      if (!decodedTitle || !decodedDescription) return;
      setLoading(true);
      setResults(null);
      setError("");
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace: mp,
          title: decodedTitle,
          bullets: decodedBullets.filter((b) => b.trim().length > 0),
          description: decodedDescription,
          ...(mp === "amazon" && decodedKeywords ? { backend_keywords: decodedKeywords } : {}),
          ...(decodedAPlusModules.length > 0 ? { a_plus_modules: decodedAPlusModules } : {}),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setResults(data);
        })
        .catch(() => setError("Failed to connect to the server"))
        .finally(() => setLoading(false));
    } catch {
      // Invalid or malformed data param — ignore, show blank form
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setOptimized(null);
    setOptimizeError("");
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
          ...(aPlusModules.length > 0 ? { a_plus_modules: aPlusModules } : {}),
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

  const handleOptimize = async () => {
    if (!results) return;
    setOptimizeError("");
    setOptimized(null);
    setOptimizing(true);

    try {
      const res = await fetch("/api/audit/optimize", {
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
          score: results.score,
          validation: results.validation,
          breakdown: results.breakdown,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOptimizeError(data.error || "Optimization failed");
      } else {
        setOptimized(data);
      }
    } catch {
      setOptimizeError("Failed to connect to the server");
    } finally {
      setOptimizing(false);
    }
  };

  // Fill form with optimized content and re-run audit
  const handleReaudit = async () => {
    if (!optimized) return;
    const newTitle = optimized.title;
    const newBullets = optimized.bullets.length > 0 ? optimized.bullets : [""];
    const newDescription = optimized.description;
    const newKeywords = optimized.backend_keywords ?? "";

    setTitle(newTitle);
    setBullets(newBullets);
    setDescription(newDescription);
    setBackendKeywords(newKeywords);
    setOptimized(null);
    setResults(null);
    setOptimizeError("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace,
          title: newTitle,
          bullets: newBullets.filter((b) => b.trim().length > 0),
          description: newDescription,
          ...(marketplace === "amazon" && newKeywords ? { backend_keywords: newKeywords } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong");
      else setResults(data);
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
    <>
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

      {/* Audit Results */}
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
                  <div key={i} className="card-subtle p-4 flex items-start gap-3">
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

          {/* Optimize CTA */}
          {!optimized && (
            <div className="card-glass p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Want a better listing?</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    AI will{" "}
                    {results.score >= 70
                      ? "fix specific issues and tighten the copy"
                      : results.score >= 40
                      ? "restructure weak sections while keeping your product facts"
                      : "rewrite the listing using your content as a product brief"}
                    {" "}· uses 1 listing credit
                  </p>
                </div>
                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="btn-primary shrink-0 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="size-4" />
                      Optimize with AI
                    </>
                  )}
                </button>
              </div>
              {optimizeError && (
                <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  {optimizeError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Optimized Listing */}
      {optimized && (
        <div className="mt-6 space-y-4">
          {/* Header */}
          <div className="card-glass p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="label-kicker text-sa-200">OPTIMIZED LISTING</p>
              <span className={`px-3 py-1 rounded-lg border text-xs font-medium ${MODE_COLORS[optimized.mode]}`}>
                {MODE_LABELS[optimized.mode]}
              </span>
            </div>

            {/* Title */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</span>
                <CopyButton text={optimized.title} />
              </div>
              <div className="card-subtle p-4 text-sm text-zinc-200 leading-relaxed">
                {optimized.title}
              </div>
              <p className="text-xs text-zinc-600 mt-1 text-right">{optimized.title.length} chars</p>
            </div>

            {/* Bullets */}
            {optimized.bullets.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Bullet Points
                  </span>
                  <CopyButton text={optimized.bullets.join("\n")} />
                </div>
                <div className="card-subtle p-4 space-y-2">
                  {optimized.bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <span className="text-sa-200/60 text-xs mt-0.5 shrink-0 font-mono">{i + 1}</span>
                      <p className="text-sm text-zinc-200 leading-relaxed flex-1">{b}</p>
                      <CopyButton text={b} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</span>
                <CopyButton text={optimized.description} />
              </div>
              <div className="card-subtle p-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {optimized.description}
              </div>
              <p className="text-xs text-zinc-600 mt-1 text-right">{optimized.description.length} chars</p>
            </div>

            {/* Backend Keywords (Amazon only) */}
            {optimized.backend_keywords && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Backend Keywords</span>
                  <CopyButton text={optimized.backend_keywords} />
                </div>
                <div className="card-subtle p-4 text-sm text-zinc-200 font-mono leading-relaxed">
                  {optimized.backend_keywords}
                </div>
                <p className="text-xs text-zinc-600 mt-1 text-right">
                  {new TextEncoder().encode(optimized.backend_keywords).length} / 250 bytes
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReaudit}
                disabled={loading}
                className="btn-primary flex-1 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="size-4" />
                    Re-audit this version
                  </>
                )}
              </button>
              <button
                onClick={() => setOptimized(null)}
                className="btn-secondary px-4"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AuditPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
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

        <Suspense fallback={null}>
          <AuditContent />
        </Suspense>
      </div>
    </div>
  );
}
