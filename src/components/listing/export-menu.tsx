"use client";

import { useState, useRef, useEffect } from "react";
import { Share, Copy, Download, FileText, Check } from "lucide-react";
import type { Marketplace } from "@/types";

interface ExportMenuProps {
  listingId: string;
  marketplace: Marketplace;
}

export default function ExportMenu({ listingId, marketplace }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function handleExport(format: "clipboard" | "pdf" | "csv") {
    setOpen(false);

    try {
      const response = await fetch(`/api/listings/${listingId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, marketplace }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      if (format === "clipboard") {
        const data = await response.json();
        await navigator.clipboard.writeText(data.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // PDF or CSV -- download as a file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        format === "pdf"
          ? `listing-${listingId}.pdf`
          : `listing-${listingId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail; in a production app we would show an error toast
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="btn-secondary gap-2 text-sm"
      >
        <Share className="h-4 w-4" />
        Export
      </button>

      {open && (
        <div className="card-glass absolute right-0 top-full mt-2 w-48 p-2 z-10">
          <button
            onClick={() => handleExport("clipboard")}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.07] transition duration-200 cursor-pointer w-full"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.07] transition duration-200 cursor-pointer w-full"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.07] transition duration-200 cursor-pointer w-full"
          >
            <FileText className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}
