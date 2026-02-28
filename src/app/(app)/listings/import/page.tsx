"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  UploadCloud,
  Loader2,
  AlertTriangle,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { parseCSV, mapEbayRow } from "@/lib/csv/ebay-import";
import { getGrade } from "@/types";
import type { QAGrade, SubscriptionTier } from "@/types";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ImportStep = "idle" | "preview" | "uploading" | "results";

interface PreviewRow {
  title: string;
  condition: string;
  itemSpecificsCount: number;
}

interface ImportRowResult {
  row: number;
  title: string;
  score: number | null;
  grade: string | null;
  status: "imported" | "failed";
  error?: string;
}

interface ImportSummary {
  imported: number;
  failed: number;
  skipped: number;
  duplicates: number;
  results: ImportRowResult[];
}

const IMPORT_LIMITS: Record<SubscriptionTier, number | null | 0> = {
  free: 0,
  starter: 100,
  pro: 500,
  agency: null,
};

const GRADE_CLASSES: Record<QAGrade, string> = {
  A: "text-emerald-300 bg-emerald-400/10 border-emerald-300/25",
  B: "text-sa-200 bg-[rgba(246,203,99,0.1)] border-[rgba(246,203,99,0.25)]",
  C: "text-amber-300 bg-amber-400/10 border-amber-300/25",
  D: "text-rose-300 bg-rose-400/10 border-rose-300/25",
  F: "text-rose-400 bg-rose-400/10 border-rose-400/25",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const { profile } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [allTitles, setAllTitles] = useState<string[]>([]);
  const [dedupeEnabled, setDedupeEnabled] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
  const rowLimit = IMPORT_LIMITS[tier];

  // -------------------------------------------------------------------------
  // Client-side preview (first 5 rows)
  // -------------------------------------------------------------------------

  const handleFileSelect = useCallback(async (selected: File) => {
    setParseError(null);
    setUploadError(null);

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
      const { rows } = parseCSV(text);

      if (rows.length === 0) {
        setParseError("The CSV file contains no data rows.");
        return;
      }

      const mappedForPreview = rows.map((row) => {
        const { content, condition } = mapEbayRow(row);
        return { content, condition };
      });

      const preview: PreviewRow[] = mappedForPreview.slice(0, 5).map(({ content, condition }) => ({
        title: content.title || "(no title)",
        condition: condition ?? "—",
        itemSpecificsCount: content.item_specifics
          ? Object.keys(content.item_specifics).length
          : 0,
      }));

      const titles = mappedForPreview.map(({ content }) =>
        content.title.toLowerCase().trim()
      );

      setFile(selected);
      setPreviewRows(preview);
      setTotalRows(rows.length);
      setAllTitles(titles);
      setStep("preview");
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse CSV file."
      );
    }
  }, []);

  // -------------------------------------------------------------------------
  // Drag & drop handlers
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
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFileSelect]
  );

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (!file) return;
    setUploadError(null);
    setStep("uploading");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("dedupe", dedupeEnabled ? "true" : "false");

    try {
      const res = await fetch("/api/listings/import", {
        method: "POST",
        body: fd,
        // Do NOT set Content-Type — browser sets it with the multipart boundary
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json?.error ?? "Import failed. Please try again.");
        setStep("preview");
        return;
      }

      setSummary(json);
      setStep("results");
    } catch {
      setUploadError("Network error. Please check your connection and try again.");
      setStep("preview");
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
    setAllTitles([]);
    setDedupeEnabled(false);
    setParseError(null);
    setUploadError(null);
    setSummary(null);
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const uniqueTitleCount = new Set(allTitles.filter(Boolean)).size +
    allTitles.filter((t) => !t).length; // empty titles pass through undeduped
  const duplicateCount = totalRows - uniqueTitleCount;
  const effectiveTotal = dedupeEnabled ? uniqueTitleCount : totalRows;

  const cappedCount =
    rowLimit === null
      ? effectiveTotal
      : rowLimit === 0
        ? 0
        : Math.min(effectiveTotal, rowLimit);

  const willSkip =
    rowLimit !== null && rowLimit !== 0 && effectiveTotal > rowLimit;

  // =========================================================================
  // STEP: idle
  // =========================================================================
  if (step === "idle") {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="label-kicker mb-2">Bulk Import</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Import eBay Listings via CSV
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Upload your eBay Seller Hub CSV export to get QA scores on your
            entire inventory — no AI credits consumed.
          </p>
        </div>

        {/* Tier badge */}
        {rowLimit === 0 ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-medium text-rose-300">
                Paid plan required
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Bulk CSV import is available on Starter and higher plans.{" "}
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
              Row limit:{" "}
              <span className="font-medium text-zinc-200">
                {rowLimit === null ? "Unlimited" : rowLimit.toLocaleString()}
              </span>
            </span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => rowLimit !== 0 && fileInputRef.current?.click()}
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

        {/* How-to instructions */}
        <div className="card-subtle p-4">
          <p className="label-kicker mb-3 text-[10px]">
            How to export from eBay
          </p>
          <ol className="space-y-1.5 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-zinc-600">1.</span>
              Go to{" "}
              <span className="font-medium text-zinc-300">
                My eBay → Selling → Active Listings
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-zinc-600">2.</span>
              Click{" "}
              <span className="font-medium text-zinc-300">
                Bulk actions → Download listings (CSV)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-zinc-600">3.</span>
              Save the file and upload it above
            </li>
          </ol>
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
          <p className="label-kicker mb-2">Bulk Import</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Review Your Import
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {file?.name} ·{" "}
            <span className="text-zinc-300">
              {totalRows.toLocaleString()} listing
              {totalRows !== 1 ? "s" : ""} detected
            </span>
          </p>
        </div>

        {/* Row cap warning */}
        {willSkip && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">
              Your{" "}
              <span className="font-semibold capitalize">{tier}</span> plan
              allows up to{" "}
              <span className="font-semibold">{rowLimit?.toLocaleString()}</span>{" "}
              rows. First{" "}
              <span className="font-semibold">{cappedCount.toLocaleString()}</span>{" "}
              will be imported;{" "}
              <span className="font-semibold">
                {(totalRows - cappedCount).toLocaleString()}
              </span>{" "}
              will be skipped.
            </p>
          </div>
        )}

        {uploadError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-300">{uploadError}</p>
          </div>
        )}

        {/* Dedupe toggle */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-300">Remove duplicate titles</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {duplicateCount > 0
                ? `${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""} detected — ${uniqueTitleCount} unique listing${uniqueTitleCount !== 1 ? "s" : ""}`
                : "No duplicate titles detected"}
            </p>
          </div>
          <button
            onClick={() => setDedupeEnabled((v) => !v)}
            disabled={duplicateCount === 0}
            aria-pressed={dedupeEnabled}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              duplicateCount === 0
                ? "cursor-not-allowed bg-zinc-800"
                : dedupeEnabled
                  ? "bg-sa-200"
                  : "bg-zinc-700 hover:bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                dedupeEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Preview table — first 5 rows */}
        <div className="mb-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Title
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Condition
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Specifics
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="max-w-xs px-4 py-2.5 text-zinc-300">
                    <span className="block truncate">{row.title}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{row.condition}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-500">
                    {row.itemSpecificsCount}
                  </td>
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
          <button
            onClick={handleReset}
            className="btn-secondary"
          >
            Re-upload
          </button>
          <button
            onClick={handleImport}
            className="btn-primary"
          >
            Import {cappedCount.toLocaleString()} listing
            {cappedCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP: uploading
  // =========================================================================
  if (step === "uploading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-sa-200" />
        <div className="text-center">
          <p className="text-base font-medium text-zinc-200">
            Importing listings…
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Running QA scoring on each row
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP: results
  // =========================================================================
  if (step === "results" && summary) {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <p className="label-kicker mb-2">Bulk Import</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Import Complete
          </h1>
        </div>

        {/* Stats */}
        <div className={`mb-6 grid gap-3 ${summary.duplicates > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
          <div className="card-subtle p-4 text-center">
            <p className="text-2xl font-bold text-emerald-300">
              {summary.imported}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Imported</p>
          </div>
          <div className="card-subtle p-4 text-center">
            <p className="text-2xl font-bold text-rose-400">
              {summary.failed}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Failed</p>
          </div>
          <div className="card-subtle p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">
              {summary.skipped}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Skipped</p>
          </div>
          {summary.duplicates > 0 && (
            <div className="card-subtle p-4 text-center">
              <p className="text-2xl font-bold text-zinc-400">
                {summary.duplicates}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Dupes removed</p>
            </div>
          )}
        </div>

        {/* Results table */}
        <div className="mb-6 max-h-96 overflow-y-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-white/10 bg-zinc-900">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Row
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Title
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Score
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.results.map((result) => {
                const grade =
                  result.grade && result.score !== null
                    ? (result.grade as QAGrade)
                    : null;
                return (
                  <tr key={result.row} className="hover:bg-white/5">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                      {result.row}
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-zinc-300">
                      <span className="block truncate">{result.title}</span>
                      {result.error && (
                        <span className="block text-xs text-rose-400">
                          {result.error}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {grade && result.score !== null ? (
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${GRADE_CLASSES[grade]}`}
                        >
                          {result.score} {grade}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {result.status === "imported" ? (
                        <Check className="ml-auto h-4 w-4 text-emerald-400" />
                      ) : (
                        <X className="ml-auto h-4 w-4 text-rose-400" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary">
            Import Another File
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
