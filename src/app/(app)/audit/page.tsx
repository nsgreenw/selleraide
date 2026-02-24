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
  Save,
  ExternalLink,
  Download,
  Puzzle,
  X,
} from "lucide-react";

const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || null;
import type { QAGrade, APlusModule } from "@/types";
import type { ScoreBreakdown } from "@/lib/qa/scorer";
import type { QAResult } from "@/types";
import type { OptimizeMode, OptimizeResult } from "@/lib/gemini/optimize";

const APLUS_MODULE_LABELS: Record<string, string> = {
  STANDARD_HEADER_IMAGE_TEXT: "Hero Banner",
  STANDARD_SINGLE_SIDE_IMAGE: "Feature Highlight",
  STANDARD_THREE_IMAGE_TEXT: "Three-Column Features",
  STANDARD_FOUR_IMAGE_TEXT: "Four-Column Features",
  STANDARD_SINGLE_IMAGE_HIGHLIGHTS: "Benefits & Highlights",
  STANDARD_SINGLE_IMAGE_SPECS_DETAIL: "Specs Detail",
  STANDARD_TECH_SPECS: "Technical Specifications",
  STANDARD_PRODUCT_DESCRIPTION: "Brand Story",
  STANDARD_FOUR_IMAGE_TEXT_QUADRANT: "Feature Quadrant",
  STANDARD_MULTIPLE_IMAGE_TEXT: "Image Carousel",
  STANDARD_COMPARISON_TABLE: "Comparison Table",
  STANDARD_TEXT: "Text Block",
  STANDARD_COMPANY_LOGO: "Brand Logo",
  STANDARD_IMAGE_TEXT_OVERLAY: "Full-Width Banner",
  STANDARD_IMAGE_SIDEBAR: "Image Sidebar",
};

type Marketplace = "amazon" | "ebay";

const EBAY_CONDITIONS = [
  "New",
  "Open Box",
  "Certified Refurbished",
  "Seller Refurbished",
  "Like New",
  "Very Good",
  "Good",
  "Acceptable",
  "For Parts or Not Working",
  "Pre-Owned",
  "Vintage",
  "Antique",
] as const;

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
  const [condition, setCondition] = useState("New");
  const [conditionNotes, setConditionNotes] = useState("");
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
  const [optimizedContent, setOptimizedContent] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError] = useState("");

  // Rewrite state
  const [activeRewriteField, setActiveRewriteField] = useState<string | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  // Extension detection: null = checking, true = installed, false = not found
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [extPromptDismissed, setExtPromptDismissed] = useState(false);

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

      // Try to auto-select condition from item_specifics (eBay extension)
      if (mp === "ebay" && decoded.item_specifics && typeof decoded.item_specifics === "object") {
        const specifics = decoded.item_specifics as Record<string, string>;
        const rawCondition = specifics["Condition"] ?? specifics["condition"] ?? "";
        const matchedCondition = EBAY_CONDITIONS.find(
          (c) => c.toLowerCase() === rawCondition.toLowerCase()
        );
        if (matchedCondition) setCondition(matchedCondition);
      }

      setExtensionInstalled(true); // data came from the extension — it's definitely installed
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

  // Detect whether the Chrome extension is installed
  useEffect(() => {
    const check = () => {
      setExtensionInstalled(
        document.documentElement.getAttribute("data-selleraide-ext") === "1"
      );
    };
    // Listen for the custom event fired by content.js (covers late-loading cases)
    const handler = () => setExtensionInstalled(true);
    document.addEventListener("selleraide:installed", handler, { once: true });
    // Fall back to attribute check after a short delay
    const timer = setTimeout(check, 300);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selleraide:installed", handler);
    };
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
    setOptimizedContent(null);
    setOptimizeError("");
    setSavedId(null);
    setSaveError("");
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
          ...(marketplace === "ebay" ? { condition } : {}),
          ...(marketplace === "ebay" && conditionNotes.trim()
            ? { condition_notes: conditionNotes.trim() }
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
        setOptimizedContent(data);
        setSavedId(null);
        setSaveError("");
      }
    } catch {
      setOptimizeError("Failed to connect to the server");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!optimizedContent) return;
    setSaving(true);
    setSaveError("");
    setSavedId(null);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace,
          content: {
            title: optimizedContent.title,
            bullets: optimizedContent.bullets,
            description: optimizedContent.description,
            ...(optimizedContent.backend_keywords ? { backend_keywords: optimizedContent.backend_keywords } : {}),
            ...(optimizedContent.a_plus_modules ? { a_plus_modules: optimizedContent.a_plus_modules } : {}),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save listing");
      } else {
        setSavedId(data.listing.id as string);
      }
    } catch {
      setSaveError("Failed to connect to the server");
    } finally {
      setSaving(false);
    }
  };

  // Fill form with optimized content and re-run audit
  const handleReaudit = async () => {
    if (!optimized) return;
    const newTitle = optimized.title;
    const newBullets = optimized.bullets.length > 0 ? optimized.bullets : [""];
    const newDescription = optimized.description;
    const newKeywords = optimized.backend_keywords ?? "";
    const newAPlusModules = (optimized.a_plus_modules ?? []) as APlusModule[];

    setTitle(newTitle);
    setBullets(newBullets);
    setDescription(newDescription);
    setBackendKeywords(newKeywords);
    setAPlusModules(newAPlusModules);
    setOptimized(null);
    // optimizedContent intentionally kept — needed for Save and A+ display
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
          ...(newAPlusModules.length > 0 ? { a_plus_modules: newAPlusModules } : {}),
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

  const handleRewrite = async (fieldKey: string) => {
    if (!optimized) return;
    setRewriting(true);
    setRewriteError(null);

    const isBullet = fieldKey.startsWith("bullet_");
    const bulletIndex = isBullet ? parseInt(fieldKey.split("_")[1], 10) : undefined;
    const field = isBullet
      ? ("bullet" as const)
      : (fieldKey as "title" | "description" | "backend_keywords");

    const currentValue = isBullet
      ? (optimized.bullets[bulletIndex!] ?? "")
      : field === "title"
      ? optimized.title
      : field === "description"
      ? optimized.description
      : (optimized.backend_keywords ?? "");

    try {
      const res = await fetch("/api/audit/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace,
          field,
          ...(bulletIndex !== undefined ? { bullet_index: bulletIndex } : {}),
          current_value: currentValue,
          listing: {
            title: optimized.title,
            bullets: optimized.bullets,
            description: optimized.description,
            ...(optimized.backend_keywords ? { backend_keywords: optimized.backend_keywords } : {}),
          },
          ...(rewriteInstruction.trim() ? { instructions: rewriteInstruction.trim() } : {}),
        }),
      });

      const data = await res.json() as { value?: string; error?: string };
      if (!res.ok) {
        setRewriteError(data.error || "Rewrite failed");
        return;
      }

      const newValue = data.value ?? currentValue;

      if (isBullet && bulletIndex !== undefined) {
        const newBullets = [...optimized.bullets];
        newBullets[bulletIndex] = newValue;
        const updated = { ...optimized, bullets: newBullets };
        setOptimized(updated);
        setOptimizedContent(updated);
      } else if (field === "title") {
        const updated = { ...optimized, title: newValue };
        setOptimized(updated);
        setOptimizedContent(updated);
      } else if (field === "description") {
        const updated = { ...optimized, description: newValue };
        setOptimized(updated);
        setOptimizedContent(updated);
      } else if (field === "backend_keywords") {
        const updated = { ...optimized, backend_keywords: newValue };
        setOptimized(updated);
        setOptimizedContent(updated);
      }

      setActiveRewriteField(null);
      setRewriteInstruction("");
    } catch {
      setRewriteError("Failed to connect to the server");
    } finally {
      setRewriting(false);
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
      {/* Extension install prompt — shown only when extension is not detected */}
      {extensionInstalled === false && !extPromptDismissed && (
        <div className="mb-6 rounded-2xl border border-sa-200/20 bg-sa-200/5 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sa-200/10 flex items-center justify-center shrink-0">
            <Puzzle className="size-5 text-sa-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-200 mb-1">
              Skip the copy-paste — use the Chrome extension
            </p>
            <p className="text-xs text-zinc-400 mb-3">
              The SellerAide extension lets you audit any Amazon or eBay listing in one click directly from the product page.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {EXTENSION_URL ? (
                <a
                  href={EXTENSION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs gap-1.5 py-2 px-4"
                >
                  <Download className="size-3.5" />
                  Add to Chrome — Free
                </a>
              ) : (
                <span className="text-xs text-zinc-500 italic">Extension coming soon</span>
              )}
              <button
                onClick={() => setExtPromptDismissed(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                I'll audit manually
              </button>
            </div>
          </div>
          <button
            onClick={() => setExtPromptDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="card-glass p-6 sm:p-8 mb-8">
        {/* Marketplace Toggle */}
        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-300 block mb-3">Marketplace</label>
          <div className="flex gap-3">
            <button
              onClick={() => { setMarketplace("amazon"); setCondition("New"); setConditionNotes(""); }}
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

        {/* Condition (eBay only) */}
        {marketplace === "ebay" && (
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-300 block mb-2">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-200 focus:border-sa-200/50 focus:outline-none"
            >
              {EBAY_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {condition !== "New" && (
              <div className="mt-3">
                <label className="text-sm font-medium text-zinc-300 block mb-2">
                  Condition Notes
                  <span className="ml-2 text-xs font-normal text-zinc-500">Describe any wear, flaws, or missing parts</span>
                </label>
                <textarea
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="e.g. Minor scratch on bottom left corner, all original accessories included, box has shelf wear"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-sa-200/50 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>
        )}

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

          {/* A+ Modules from optimization — persist through re-audit */}
          {!optimized && optimizedContent?.a_plus_modules && optimizedContent.a_plus_modules.length > 0 && (
            <div className="card-glass p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="label-kicker text-sa-200">A+ CONTENT MODULES</p>
                  <p className="text-xs text-zinc-500 mt-1">From your optimization · Requires Amazon Brand Registry</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !!savedId}
                    className="btn-primary gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <><Loader2 className="size-4 animate-spin" />Saving...</>
                    ) : savedId ? (
                      <><Check className="size-4 text-emerald-400" />Saved</>
                    ) : (
                      <><Save className="size-4" />Save to Listings</>
                    )}
                  </button>
                </div>
              </div>
              {savedId && (
                <a
                  href={`/listings/${savedId}`}
                  className="mb-4 flex items-center gap-1.5 text-sm text-sa-200 hover:text-sa-100 transition-colors"
                >
                  <ExternalLink className="size-4" />
                  View saved listing
                </a>
              )}
              {saveError && (
                <div className="mb-4 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  {saveError}
                </div>
              )}
              <div className="space-y-3">
                {optimizedContent.a_plus_modules.map((mod, i) => (
                  <div key={i} className="card-subtle p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-sa-200 bg-sa-200/10 px-2 py-0.5 rounded-lg">
                        {APLUS_MODULE_LABELS[mod.type] ?? mod.type}
                      </span>
                      <span className="text-xs text-zinc-600">Module {mod.position}</span>
                    </div>
                    {mod.headline && (
                      <p className="text-sm font-medium text-zinc-200 mb-1">{mod.headline}</p>
                    )}
                    {mod.body && (
                      <p className="text-sm text-zinc-400 leading-relaxed mb-2">{mod.body}</p>
                    )}
                    {mod.highlights && mod.highlights.length > 0 && (
                      <ul className="mb-2 space-y-1">
                        {mod.highlights.map((h, j) => (
                          <li key={j} className="text-xs text-zinc-400 flex items-start gap-1.5">
                            <span className="text-sa-200/50 shrink-0 mt-0.5">•</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                    {mod.image && (
                      <div className="mt-2 pt-2 border-t border-white/5 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600">Alt text:</span>
                          <span className="text-zinc-300">{mod.image.alt_text}</span>
                          <span className={`ml-auto font-mono ${mod.image.alt_text.length > 90 ? "text-amber-400" : "text-zinc-600"}`}>
                            {mod.image.alt_text.length}/100
                          </span>
                        </div>
                        {mod.image.image_guidance && (
                          <p className="text-zinc-500 italic">{mod.image.image_guidance}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimize CTA — hide if we already have optimized content */}
          {!optimized && !optimizedContent && (
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
                    {marketplace === "amazon" ? ", generate A+ Content modules," : ""}
                    {" "}and target 90+ · uses 1 listing credit
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setActiveRewriteField(activeRewriteField === "title" ? null : "title"); setRewriteInstruction(""); setRewriteError(null); }}
                    className="p-1 text-zinc-500 hover:text-sa-200 transition-colors"
                    title="Rewrite with AI"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                  <CopyButton text={optimized.title} />
                </div>
              </div>
              <div className="card-subtle p-4 text-sm text-zinc-200 leading-relaxed">
                {optimized.title}
              </div>
              <p className="text-xs text-zinc-600 mt-1 text-right">{optimized.title.length} chars</p>
              {activeRewriteField === "title" && (
                <div className="mt-2 rounded-lg border border-sa-200/20 bg-sa-200/5 p-3 space-y-2">
                  <textarea
                    value={rewriteInstruction}
                    onChange={(e) => setRewriteInstruction(e.target.value)}
                    placeholder="Optional — e.g. 'make it more concise', or leave blank"
                    rows={2}
                    className="w-full resize-none rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sa-200/40"
                  />
                  {rewriteError && <p className="text-xs text-rose-400">{rewriteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setActiveRewriteField(null); setRewriteInstruction(""); setRewriteError(null); }}
                      className="btn-secondary py-1 px-3 text-xs"
                    >Cancel</button>
                    <button
                      onClick={() => handleRewrite("title")}
                      disabled={rewriting}
                      className="btn-primary py-1 px-3 text-xs gap-1.5"
                    >
                      {rewriting
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Rewriting…</>
                        : <><Wand2 className="h-3 w-3" /> Rewrite</>}
                    </button>
                  </div>
                </div>
              )}
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
                  {optimized.bullets.map((b, i) => {
                    const fieldKey = `bullet_${i}`;
                    return (
                      <div key={i} className="space-y-0">
                        <div className="flex items-start gap-3 group">
                          <span className="text-sa-200/60 text-xs mt-0.5 shrink-0 font-mono">{i + 1}</span>
                          <p className="text-sm text-zinc-200 leading-relaxed flex-1">{b}</p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => { setActiveRewriteField(activeRewriteField === fieldKey ? null : fieldKey); setRewriteInstruction(""); setRewriteError(null); }}
                              className="p-1 text-zinc-500 hover:text-sa-200 transition-colors"
                              title="Rewrite with AI"
                            >
                              <Wand2 className="h-3.5 w-3.5" />
                            </button>
                            <CopyButton text={b} />
                          </div>
                        </div>
                        {activeRewriteField === fieldKey && (
                          <div className="mt-2 ml-6 rounded-lg border border-sa-200/20 bg-sa-200/5 p-3 space-y-2">
                            <textarea
                              value={rewriteInstruction}
                              onChange={(e) => setRewriteInstruction(e.target.value)}
                              placeholder="Optional — e.g. 'add a numeric spec', or leave blank"
                              rows={2}
                              className="w-full resize-none rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sa-200/40"
                            />
                            {rewriteError && <p className="text-xs text-rose-400">{rewriteError}</p>}
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setActiveRewriteField(null); setRewriteInstruction(""); setRewriteError(null); }}
                                className="btn-secondary py-1 px-3 text-xs"
                              >Cancel</button>
                              <button
                                onClick={() => handleRewrite(fieldKey)}
                                disabled={rewriting}
                                className="btn-primary py-1 px-3 text-xs gap-1.5"
                              >
                                {rewriting
                                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Rewriting…</>
                                  : <><Wand2 className="h-3 w-3" /> Rewrite</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setActiveRewriteField(activeRewriteField === "description" ? null : "description"); setRewriteInstruction(""); setRewriteError(null); }}
                    className="p-1 text-zinc-500 hover:text-sa-200 transition-colors"
                    title="Rewrite with AI"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                  <CopyButton text={optimized.description} />
                </div>
              </div>
              <div className="card-subtle p-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {optimized.description}
              </div>
              <p className="text-xs text-zinc-600 mt-1 text-right">{optimized.description.length} chars</p>
              {activeRewriteField === "description" && (
                <div className="mt-2 rounded-lg border border-sa-200/20 bg-sa-200/5 p-3 space-y-2">
                  <textarea
                    value={rewriteInstruction}
                    onChange={(e) => setRewriteInstruction(e.target.value)}
                    placeholder="Optional — e.g. 'make it shorter', or leave blank"
                    rows={2}
                    className="w-full resize-none rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sa-200/40"
                  />
                  {rewriteError && <p className="text-xs text-rose-400">{rewriteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setActiveRewriteField(null); setRewriteInstruction(""); setRewriteError(null); }}
                      className="btn-secondary py-1 px-3 text-xs"
                    >Cancel</button>
                    <button
                      onClick={() => handleRewrite("description")}
                      disabled={rewriting}
                      className="btn-primary py-1 px-3 text-xs gap-1.5"
                    >
                      {rewriting
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Rewriting…</>
                        : <><Wand2 className="h-3 w-3" /> Rewrite</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Backend Keywords (Amazon only) */}
            {optimized.backend_keywords && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Backend Keywords</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setActiveRewriteField(activeRewriteField === "backend_keywords" ? null : "backend_keywords"); setRewriteInstruction(""); setRewriteError(null); }}
                      className="p-1 text-zinc-500 hover:text-sa-200 transition-colors"
                      title="Rewrite with AI"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                    </button>
                    <CopyButton text={optimized.backend_keywords} />
                  </div>
                </div>
                <div className="card-subtle p-4 text-sm text-zinc-200 font-mono leading-relaxed">
                  {optimized.backend_keywords}
                </div>
                <p className="text-xs text-zinc-600 mt-1 text-right">
                  {new TextEncoder().encode(optimized.backend_keywords).length} / 250 bytes
                </p>
                {activeRewriteField === "backend_keywords" && (
                  <div className="mt-2 rounded-lg border border-sa-200/20 bg-sa-200/5 p-3 space-y-2">
                    <textarea
                      value={rewriteInstruction}
                      onChange={(e) => setRewriteInstruction(e.target.value)}
                      placeholder="Optional — e.g. 'add more long-tail keywords', or leave blank"
                      rows={2}
                      className="w-full resize-none rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sa-200/40"
                    />
                    {rewriteError && <p className="text-xs text-rose-400">{rewriteError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActiveRewriteField(null); setRewriteInstruction(""); setRewriteError(null); }}
                        className="btn-secondary py-1 px-3 text-xs"
                      >Cancel</button>
                      <button
                        onClick={() => handleRewrite("backend_keywords")}
                        disabled={rewriting}
                        className="btn-primary py-1 px-3 text-xs gap-1.5"
                      >
                        {rewriting
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Rewriting…</>
                          : <><Wand2 className="h-3 w-3" /> Rewrite</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* A+ Content Modules (Amazon only) */}
            {optimized.a_plus_modules && optimized.a_plus_modules.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    A+ Content Modules
                  </span>
                  <span className="text-xs text-zinc-600">Requires Amazon Brand Registry</span>
                </div>
                <div className="space-y-3">
                  {optimized.a_plus_modules.map((mod, i) => (
                    <div key={i} className="card-subtle p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-sa-200 bg-sa-200/10 px-2 py-0.5 rounded-lg">
                          {APLUS_MODULE_LABELS[mod.type] ?? mod.type}
                        </span>
                        <span className="text-xs text-zinc-600">Module {mod.position}</span>
                      </div>
                      {mod.headline && (
                        <p className="text-sm font-medium text-zinc-200 mb-1">{mod.headline}</p>
                      )}
                      {mod.body && (
                        <p className="text-sm text-zinc-400 leading-relaxed mb-2">{mod.body}</p>
                      )}
                      {mod.highlights && mod.highlights.length > 0 && (
                        <ul className="mb-2 space-y-1">
                          {mod.highlights.map((h, j) => (
                            <li key={j} className="text-xs text-zinc-400 flex items-start gap-1.5">
                              <span className="text-sa-200/50 shrink-0 mt-0.5">•</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}
                      {mod.image && (
                        <div className="mt-2 pt-2 border-t border-white/5 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600">Alt text:</span>
                            <span className="text-zinc-300">{mod.image.alt_text}</span>
                            <span className={`ml-auto font-mono ${mod.image.alt_text.length > 90 ? "text-amber-400" : "text-zinc-600"}`}>
                              {mod.image.alt_text.length}/100
                            </span>
                          </div>
                          {mod.image.image_guidance && (
                            <p className="text-zinc-500 italic">{mod.image.image_guidance}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 flex-wrap">
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
                onClick={handleSave}
                disabled={saving || !!savedId}
                className="btn-secondary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : savedId ? (
                  <>
                    <Check className="size-4 text-emerald-400" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save to Listings
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
            {savedId && (
              <a
                href={`/listings/${savedId}`}
                className="mt-3 flex items-center gap-1.5 text-sm text-sa-200 hover:text-sa-100 transition-colors"
              >
                <ExternalLink className="size-4" />
                View saved listing
              </a>
            )}
            {saveError && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="size-4 shrink-0" />
                {saveError}
              </div>
            )}
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
