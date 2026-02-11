"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Copy, FileText, Check } from "lucide-react";
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
        </div>
      </div>
    </div>
  );
}
