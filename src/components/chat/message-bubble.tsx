"use client";

import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-zinc-500 py-2">{message.content}</p>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="card-subtle max-w-[80%] px-4 py-3">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="card-glass max-w-[80%] px-4 py-3">
        <p className="label-kicker text-sa-200 mb-2">SELLERAIDE</p>
        <div className="text-sm text-zinc-300 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}
