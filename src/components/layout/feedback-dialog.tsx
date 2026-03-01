"use client";

import { useState } from "react";
import { X, CheckCircle, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  function handleClose() {
    if (status === "loading") return;
    setMessage("");
    setStatus("idle");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Please provide at least 10 characters.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), page_url: pathname }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to submit feedback");
      }

      setStatus("success");
      setTimeout(() => {
        setMessage("");
        setStatus("idle");
        setError("");
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="card-glass relative z-10 w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-sa-200" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Send Feedback
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <p className="text-sm text-zinc-300">
              Thanks for your feedback!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= 2000) setMessage(e.target.value);
              }}
              placeholder="What's on your mind? Bug reports, feature requests, or general feedback..."
              className="w-full h-32 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sa-200/40 focus:outline-none transition"
              disabled={status === "loading"}
              autoFocus
            />

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                {message.length}/2000
              </span>
              {error && (
                <span className="text-xs text-red-400">{error}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={status === "loading" || message.trim().length < 10}
              className="btn-primary w-full mt-4"
            >
              {status === "loading" ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-sa-200" />
              ) : (
                "Submit Feedback"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
