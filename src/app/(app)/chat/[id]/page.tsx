"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Copy, FileText, Check, Send, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import ListingPreview from "@/components/chat/listing-preview";
import QAResultsCard from "@/components/chat/qa-results-card";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Listing, Marketplace } from "@/types";

export default function ListingResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListing() {
      const supabase = createClient();

      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (conv) {
        setConversation(conv);
      }

      const { data: listings } = await supabase
        .from("listings")
        .select("*")
        .eq("conversation_id", id)
        .order("version", { ascending: false })
        .limit(1);

      if (listings && listings.length > 0) {
        setListing(listings[0]);
      }

      setLoading(false);
    }

    fetchListing();
  }, [id]);

  async function handleCopyToClipboard() {
    if (!listing?.content) return;
    const content = listing.content;
    const parts: string[] = [];

    parts.push(`Title: ${content.title}`);
    if (content.bullets?.length) {
      parts.push("\nBullet Points:");
      content.bullets.forEach((b: string, i: number) => parts.push(`${i + 1}. ${b}`));
    }
    if (content.description) {
      parts.push(`\nDescription:\n${content.description}`);
    }
    if (content.backend_keywords) {
      parts.push(`\nBackend Keywords: ${content.backend_keywords}`);
    }

    await navigator.clipboard.writeText(parts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportPDF() {
    if (!listing) return;
    try {
      const response = await fetch(`/api/listings/${listing.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pdf" }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `listing-${listing.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // PDF export failed silently
    }
  }

  const handleRefine = useCallback(async () => {
    const trimmed = refineInput.trim();
    if (!trimmed || !listing || refining) return;
    setRefining(true);
    setRefineError(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to refine listing");
      }

      const data = await response.json();
      setListing(data.listing);
      setRefineInput("");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRefining(false);
    }
  }, [refineInput, listing, refining]);

  async function handleExportCSV() {
    if (!listing) return;
    try {
      const response = await fetch(`/api/listings/${listing.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv" }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `listing-${listing.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // CSV export failed silently
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Listing" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
        </div>
      </div>
    );
  }

  if (!conversation || !listing) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Listing" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-sm text-zinc-400">Listing not found.</p>
          <button
            onClick={() => router.push("/chat")}
            className="btn-secondary text-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Create New Listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={conversation.title ?? "Listing"} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Top actions bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/chat")}
              className="btn-secondary text-xs py-2 gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              New Listing
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="btn-secondary text-xs py-2 gap-2"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-xs py-2 gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="btn-secondary text-xs py-2 gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>
          </div>

          {/* Listing preview */}
          <ListingPreview
            content={listing.content}
            marketplace={conversation.marketplace as Marketplace}
          />

          {/* QA results */}
          {listing.qa_results && listing.score !== null && (
            <QAResultsCard
              results={listing.qa_results}
              score={listing.score}
              marketplace={conversation.marketplace as Marketplace}
            />
          )}

          {/* Version indicator */}
          {listing.version > 1 && (
            <p className="text-xs text-zinc-500 text-center">
              Version {listing.version}
            </p>
          )}
        </div>
      </div>

      {/* Refine input — fixed at bottom */}
      <div className="border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto">
          {refineError && (
            <div className="mb-3 rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-sm text-rose-200">
              {refineError}
            </div>
          )}
          <div className="flex items-end gap-3 rounded-xl border border-white/15 bg-black/35 p-3">
            <textarea
              className="flex-1 resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none max-h-24"
              rows={1}
              placeholder="Refine your listing... e.g. &quot;make the title shorter&quot; or &quot;add more keywords to bullet 3&quot;"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleRefine();
                }
              }}
              disabled={refining}
            />
            <button
              type="button"
              className="btn-primary px-3 py-2"
              disabled={refining || !refineInput.trim()}
              onClick={handleRefine}
            >
              {refining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
