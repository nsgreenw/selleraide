"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  UploadCloud,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Check,
  X,
  Download,
  ShoppingCart,
  Tag,
  Ban,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { parseCSV } from "@/lib/csv/ebay-import";
import { getGrade } from "@/types";
import type { QAGrade, Marketplace, SubscriptionTier } from "@/types";
import { PLANS } from "@/lib/subscription/plans";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type BatchStep = "idle" | "preview" | "processing" | "results";

interface PreviewRow {
  product_description: string;
  condition?: string;
}

interface BatchListingSummary {
  id: string;
  conversation_id: string;
  title: string;
  score: number | null;
}

interface BatchData {
  id: string;
  status: string;
  total_rows: number;
  completed_rows: number;
  failed_rows: number;
  marketplace: string;
  error: string | null;
}

const MARKETPLACES: { id: Marketplace; label: string; icon: React.ReactNode }[] = [
  { id: "amazon", label: "Amazon", icon: <ShoppingCart className="h-4 w-4" /> },
  { id: "ebay", label: "eBay", icon: <Tag className="h-4 w-4" /> },
];

const GRADE_CLASSES: Record<QAGrade, string> = {
  A: "text-emerald-300 bg-emerald-400/10 border-emerald-300/25",
  B: "text-sa-200 bg-[rgba(246,203,99,0.1)] border-[rgba(246,203,99,0.25)]",
  C: "text-amber-300 bg-amber-400/10 border-amber-300/25",
  D: "text-rose-300 bg-rose-400/10 border-rose-300/25",
  F: "text-rose-400 bg-rose-400/10 border-rose-400/25",
};

// ---------------------------------------------------------------------------
// Template CSV generation
// ---------------------------------------------------------------------------

function downloadTemplate() {
  const headers = "product_description,condition,condition_notes";
  const row1 = '"Vintage leather messenger bag, handcrafted from full-grain Italian leather. Features brass hardware, adjustable strap, fits 15-inch laptop. Interior has two compartments and a zippered pocket.",Good,"Minor scuff on bottom corner"';
  const row2 = '"Organic bamboo cutting board set - 3 sizes. Antimicrobial, BPA-free, and dishwasher safe. Includes juice groove and easy-grip handles.",New,""';
  const csv = [headers, row1, row2].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "selleraide-batch-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BatchPage() {
  const { profile } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<BatchStep>("idle");
  const [marketplace, setMarketplace] = useState<Marketplace>("amazon");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Processing state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [listings, setListings] = useState<BatchListingSummary[]>([]);
  const [cancelling, setCancelling] = useState(false);

  const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
  const plan = PLANS[tier];
  const rowLimit = plan.batchRowLimit;

  // -------------------------------------------------------------------------
  // Client-side CSV preview
  // -------------------------------------------------------------------------

  const handleFileSelect = useCallback(async (selected: File) => {
    setParseError(null);
    setSubmitError(null);

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please select a .csv file.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setParseError("File exceeds the 5 MB limit.");
      return;
    }

    try {
      const text = await selected.text();
      const { headers, rows } = parseCSV(text);

      if (rows.length === 0) {
        setParseError("The CSV file contains no data rows.");
        return;
      }

      const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
      if (!normalizedHeaders.includes("product_description")) {
        setParseError(
          'CSV must include a "product_description" column. Download the template for the correct format.'
        );
        return;
      }

      const descIdx = normalizedHeaders.indexOf("product_description");
      const condIdx = normalizedHeaders.indexOf("condition");

      const preview: PreviewRow[] = rows.slice(0, 5).map((row) => {
        const values = Object.values(row);
        return {
          product_description: (values[descIdx] ?? "").trim().substring(0, 120),
          condition: condIdx >= 0 ? (values[condIdx] ?? "").trim() || undefined : undefined,
        };
      });

      setFile(selected);
      setPreviewRows(preview);
      setTotalRows(rows.length);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CSV file.");
    }
  }, []);

  // -------------------------------------------------------------------------
  // Drag & drop
  // -------------------------------------------------------------------------

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
      e.target.value = "";
    },
    [handleFileSelect]
  );

  // -------------------------------------------------------------------------
  // Submit batch
  // -------------------------------------------------------------------------

  async function handleSubmit() {
    if (!file) return;
    setSubmitError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("marketplace", marketplace);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json?.error ?? "Failed to start batch. Please try again.");
        return;
      }

      setBatchId(json.batch.id);
      setBatchData({
        id: json.batch.id,
        status: "pending",
        total_rows: json.batch.total_rows,
        completed_rows: 0,
        failed_rows: 0,
        marketplace: json.batch.marketplace,
        error: null,
      });
      setListings([]);
      setStep("processing");
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    }
  }

  // -------------------------------------------------------------------------
  // Poll for progress
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (step !== "processing" || !batchId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/batch/${batchId}`);
        if (!res.ok) return;
        const json = await res.json();

        setBatchData(json.batch);
        setListings(json.listings ?? []);

        if (["completed", "failed", "cancelled"].includes(json.batch.status)) {
          clearInterval(interval);
          setStep("results");
        }
      } catch {
        // Retry on next interval
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, batchId]);

  // -------------------------------------------------------------------------
  // Cancel batch
  // -------------------------------------------------------------------------

  async function handleCancel() {
    if (!batchId || cancelling) return;
    setCancelling(true);
    try {
      await fetch(`/api/batch/${batchId}/cancel`, { method: "POST" });
    } finally {
      setCancelling(false);
    }
  }

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  function handleReset() {
    setStep("idle");
    setFile(null);
    setPreviewRows([]);
    setTotalRows(0);
    setParseError(null);
    setSubmitError(null);
    setBatchId(null);
    setBatchData(null);
    setListings([]);
    setCancelling(false);
  }

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------

  const cappedCount = rowLimit === 0 ? 0 : Math.min(totalRows, rowLimit);
  const willTruncate = rowLimit > 0 && totalRows > rowLimit;

  // =========================================================================
  // STEP: idle
  // =========================================================================
  if (step === "idle") {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="label-kicker mb-2">Bulk Generate</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Generate Listings from CSV
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Upload a CSV of product descriptions and generate optimized listings
            for all rows at once. Each row runs through the full AI pipeline —
            extract, research, generate, and score.
          </p>
        </div>

        {/* Marketplace selector */}
        <div className="mb-6">
          <p className="label-kicker text-zinc-500 mb-2">Marketplace</p>
          <div className="flex flex-wrap gap-2">
            {MARKETPLACES.map((mp) => {
              const isActive = marketplace === mp.id;
              return (
                <button
                  key={mp.id}
                  type="button"
                  onClick={() => setMarketplace(mp.id)}
                  className={
                    isActive
                      ? "rounded-xl border border-sa-200/50 bg-sa-200/10 px-4 py-2 text-sm font-medium text-sa-100 transition duration-200"
                      : "rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-zinc-400 transition duration-200 hover:border-white/20 hover:text-zinc-300"
                  }
                >
                  <span className="flex items-center gap-2">
                    {mp.icon}
                    {mp.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier badge */}
        {rowLimit === 0 && tier === "starter" ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Pro plan required
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Bulk generation is available on the Pro plan and above.
                Upgrade to process up to 50 products at once.{" "}
                <Link href="/settings" className="text-sa-200 hover:underline">
                  Upgrade your plan
                </Link>
              </p>
            </div>
          </div>
        ) : rowLimit === 0 ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-medium text-rose-300">
                Pro plan required
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Bulk generation is available on the Pro plan and above.{" "}
                <Link href="/settings" className="text-sa-200 hover:underline">
                  Upgrade your plan
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
            <span className="text-xs text-zinc-400">
              Your plan:{" "}
              <span className="font-medium capitalize text-zinc-200">
                {tier}
              </span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs text-zinc-400">
              Max rows per batch:{" "}
              <span className="font-medium text-zinc-200">
                {rowLimit.toLocaleString()}
              </span>
            </span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => rowLimit > 0 && fileInputRef.current?.click()}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
            rowLimit === 0
              ? "cursor-not-allowed border-white/10 opacity-40"
              : isDragging
                ? "border-sa-200/60 bg-sa-200/5"
                : "border-white/20 hover:border-white/30 hover:bg-white/5"
          }`}
        >
          <UploadCloud
            className={`h-10 w-10 ${isDragging ? "text-sa-200" : "text-zinc-500"}`}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">
              {isDragging
                ? "Drop your CSV here"
                : "Drag & drop your CSV, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              .csv files up to 5 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={onInputChange}
            disabled={rowLimit === 0}
          />
        </div>

        {parseError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-300">{parseError}</p>
          </div>
        )}

        {/* Template download + instructions */}
        <div className="card-subtle p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label-kicker text-[10px]">CSV Format</p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-sa-200 hover:text-sa-100 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template
            </button>
          </div>
          <div className="space-y-1.5 text-sm text-zinc-400">
            <p className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-zinc-600">1.</span>
              <span>
                Required column: <code className="text-zinc-300 font-mono text-xs">product_description</code> — your product description (min 10 characters)
              </span>
            </p>
            <p className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-zinc-600">2.</span>
              <span>
                Optional columns: <code className="text-zinc-300 font-mono text-xs">condition</code>, <code className="text-zinc-300 font-mono text-xs">condition_notes</code> (for eBay)
              </span>
            </p>
            <p className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-zinc-600">3.</span>
              <span>
                Each row produces one optimized listing through the full AI pipeline
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP: preview
  // =========================================================================
  if (step === "preview") {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="label-kicker mb-2">Bulk Generate</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Review Your Batch
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {file?.name} ·{" "}
            <span className="text-zinc-300">
              {totalRows.toLocaleString()} product
              {totalRows !== 1 ? "s" : ""} detected
            </span>
            {" · "}
            <span className="capitalize text-zinc-300">{marketplace}</span>
          </p>
        </div>

        {/* Row cap warning */}
        {willTruncate && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">
              Your{" "}
              <span className="font-semibold capitalize">{tier}</span> plan
              allows up to{" "}
              <span className="font-semibold">{rowLimit.toLocaleString()}</span>{" "}
              rows per batch. First{" "}
              <span className="font-semibold">{cappedCount.toLocaleString()}</span>{" "}
              will be generated;{" "}
              <span className="font-semibold">
                {(totalRows - cappedCount).toLocaleString()}
              </span>{" "}
              will be skipped.
            </p>
          </div>
        )}

        {submitError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-300">{submitError}</p>
          </div>
        )}

        {/* Preview table */}
        <div className="mb-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  #
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Product Description
                </th>
                {previewRows.some((r) => r.condition) && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Condition
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    {i + 1}
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-zinc-300">
                    <span className="block truncate">
                      {row.product_description || "(empty)"}
                    </span>
                  </td>
                  {previewRows.some((r) => r.condition) && (
                    <td className="px-4 py-2.5 text-zinc-400">
                      {row.condition ?? "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {totalRows > 5 && (
            <div className="border-t border-white/10 px-4 py-2 text-center text-xs text-zinc-600">
              Showing first 5 of {totalRows.toLocaleString()} rows
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary">
            Re-upload
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Generate {cappedCount.toLocaleString()} Listing
            {cappedCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP: processing
  // =========================================================================
  if (step === "processing" && batchData) {
    const progress = batchData.total_rows > 0
      ? ((batchData.completed_rows + batchData.failed_rows) / batchData.total_rows) * 100
      : 0;
    const processedCount = batchData.completed_rows + batchData.failed_rows;

    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="label-kicker mb-2">Bulk Generate</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Generating Listings…
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Processing {batchData.total_rows} product
            {batchData.total_rows !== 1 ? "s" : ""} for{" "}
            <span className="capitalize text-zinc-300">{batchData.marketplace}</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-300">
              {processedCount} / {batchData.total_rows}
            </span>
            <span className="text-sm text-zinc-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-sa-200 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {batchData.failed_rows > 0 && (
            <p className="mt-2 text-xs text-rose-400">
              {batchData.failed_rows} row{batchData.failed_rows !== 1 ? "s" : ""} failed
            </p>
          )}
        </div>

        {/* Per-row status list */}
        <div className="mb-6 max-h-80 overflow-y-auto rounded-xl border border-white/10">
          <div className="divide-y divide-white/5">
            {Array.from({ length: batchData.total_rows }, (_, i) => {
              const listing = listings[i];
              const isProcessed = i < processedCount;
              const isCurrent = i === processedCount;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    isCurrent ? "bg-sa-200/5" : ""
                  }`}
                >
                  <span className="font-mono text-xs text-zinc-600 w-6 text-right shrink-0">
                    {i + 1}
                  </span>

                  {isProcessed && listing ? (
                    <>
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-sm text-zinc-300 truncate flex-1">
                        {listing.title}
                      </span>
                      {listing.score !== null && (
                        <span className="text-xs text-zinc-500">
                          {listing.score}
                        </span>
                      )}
                    </>
                  ) : isProcessed && !listing ? (
                    <>
                      <X className="h-4 w-4 shrink-0 text-rose-400" />
                      <span className="text-sm text-zinc-500 truncate flex-1">
                        Failed
                      </span>
                    </>
                  ) : isCurrent ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 text-sa-200 animate-spin" />
                      <span className="text-sm text-sa-200 truncate flex-1">
                        Generating…
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="h-4 w-4 shrink-0 rounded-full border border-white/10" />
                      <span className="text-sm text-zinc-600 truncate flex-1">
                        Pending
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="btn-secondary gap-2"
        >
          {cancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
          Cancel Batch
        </button>
      </div>
    );
  }

  // =========================================================================
  // STEP: results
  // =========================================================================
  if (step === "results" && batchData) {
    const wasCancelled = batchData.status === "cancelled";

    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="label-kicker mb-2">Bulk Generate</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            {wasCancelled ? "Batch Cancelled" : "Batch Complete"}
          </h1>
        </div>

        {batchData.error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-300">{batchData.error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="card-subtle p-4 text-center">
            <p className="text-2xl font-bold text-emerald-300">
              {batchData.completed_rows}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Generated</p>
          </div>
          <div className="card-subtle p-4 text-center">
            <p className="text-2xl font-bold text-rose-400">
              {batchData.failed_rows}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Failed</p>
          </div>
          <div className="card-subtle p-4 text-center">
            <p className="text-2xl font-bold text-zinc-400">
              {batchData.total_rows - batchData.completed_rows - batchData.failed_rows}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {wasCancelled ? "Cancelled" : "Skipped"}
            </p>
          </div>
        </div>

        {/* Results table */}
        {listings.length > 0 && (
          <div className="mb-6 max-h-96 overflow-y-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-white/10 bg-zinc-900">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Score
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listings.map((listing, i) => {
                  const grade = listing.score !== null ? getGrade(listing.score) : null;
                  return (
                    <tr key={listing.id} className="hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                        {i + 1}
                      </td>
                      <td className="max-w-xs px-4 py-2.5 text-zinc-300">
                        <span className="block truncate">{listing.title}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {grade && listing.score !== null ? (
                          <span
                            className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${GRADE_CLASSES[grade]}`}
                          >
                            {listing.score} {grade}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={
                            listing.conversation_id
                              ? `/chat/${listing.conversation_id}`
                              : `/listings/${listing.id}`
                          }
                          className="text-xs text-sa-200 hover:text-sa-100 transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary">
            New Batch
          </button>
          <Link href="/listings" className="btn-primary">
            View All Listings
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
