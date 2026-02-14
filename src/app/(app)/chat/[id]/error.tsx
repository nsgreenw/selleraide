"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, RotateCw } from "lucide-react";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertCircle className="h-12 w-12 text-rose-400" />
      <div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-400 max-w-md">
          {error.message || "An unexpected error occurred while loading this conversation."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={reset} className="btn-primary gap-2 text-sm">
          <RotateCw className="h-4 w-4" />
          Try Again
        </button>
        <button
          onClick={() => router.push("/chat")}
          className="btn-secondary gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          New Conversation
        </button>
      </div>
    </div>
  );
}
